#!/usr/bin/env python3
"""
Servicio que hace polling automático de colas SQS e invoca lambdas.
Este servicio se ejecuta de forma continua en Docker y simula el comportamiento
de AWS Lambda con event sources SQS.
"""

import boto3
import json
import sys
import time
import subprocess
import os
import signal
from botocore.exceptions import ClientError

# Configuración
LOCALSTACK_ENDPOINT = os.getenv("SQS_ENDPOINT", "http://localstack:4566")
REGION = os.getenv("AWS_REGION", "us-east-1")
POLL_INTERVAL = 2  # segundos entre polling
MAX_MESSAGES = 1  # batch size
BACKEND_DIR = "/app/packages/backend"
RUNNING = True

# Mapeo de servicios a colas y handlers
QUEUE_HANDLERS = {
    "dev-payments-queue": {
        "handler": "dist/main.handler"
    }
}

def signal_handler(sig, frame):
    """Maneja señales para cerrar limpiamente."""
    global RUNNING
    print("\nReceived shutdown signal, stopping pollers...")
    RUNNING = False
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def create_sqs_event(records):
    """Crea un evento SQS compatible con AWS Lambda."""
    sqs_records = []
    for record in records:
        sqs_record = {
            "messageId": record["MessageId"],
            "receiptHandle": record["ReceiptHandle"],
            "body": record["Body"],
            "attributes": record.get("Attributes", {}),
            "messageAttributes": record.get("MessageAttributes", {}),
            "md5OfBody": record.get("MD5OfBody", ""),
            "eventSource": "aws:sqs",
            "eventSourceARN": record.get("Attributes", {}).get("ApproximateReceiveCount", ""),
            "awsRegion": REGION
        }
        sqs_records.append(sqs_record)
    
    return {"Records": sqs_records}

def invoke_lambda_handler(backend_dir, handler_path, event):
    """Ejecuta el handler de Lambda usando Node.js directamente."""
    try:
        handler_file, handler_function = handler_path.rsplit(".", 1)
        handler_file_path = os.path.join(backend_dir, handler_file + ".js")
        
        print(f"    Handler file path: {handler_file_path}")
        print(f"    Handler function: {handler_function}")
        
        if not os.path.exists(handler_file_path):
            print(f"✗ Error: Handler file not found: {handler_file_path}")
            # Listar archivos en el directorio para debugging
            handler_dir = os.path.dirname(handler_file_path)
            if os.path.exists(handler_dir):
                print(f"    Directory exists: {handler_dir}")
                try:
                    files = os.listdir(handler_dir)
                    print(f"    Files in directory: {files[:10]}")  # Primeros 10
                except:
                    pass
            return False
        
        # Usar la ruta absoluta del handler directamente
        handler_path_without_ext = handler_file_path.replace(".js", "")
        handler_path_normalized = handler_path_without_ext.replace("\\", "/")  # Normalizar para Windows/Linux
        
        # Crear script temporal en /tmp (escribible)
        import uuid
        script_id = uuid.uuid4().hex[:8]
        script_path = os.path.join("/tmp", f"sqs_invoke_{script_id}.js")
        
        # Serializar el evento para el script
        event_json = json.dumps(event)
        
        # El código compilado ya importa reflect-metadata, solo necesitamos requerir el handler
        # Usar ruta absoluta directamente para evitar problemas con process.chdir()
        script_content = f"""
// Cambiar al directorio del backend para que las rutas relativas funcionen
process.chdir('{backend_dir}');
// Requerir el handler usando la ruta absoluta
const handler = require('{handler_path_normalized}');
const event = {event_json};
(async () => {{
  try {{
    await handler.{handler_function}(event);
    console.log("✓ Handler executed successfully");
    process.exit(0);
  }} catch (error) {{
    console.error("✗ Handler error:", error);
    if (error.stack) {{
      console.error(error.stack);
    }}
    process.exit(1);
  }}
}})();
"""
        
        # Escribir script temporal en /tmp
        with open(script_path, "w") as f:
            f.write(script_content)
        
        # Ejecutar usando Node.js con el entorno correcto
        # Pasar TODAS las variables de entorno del contenedor al proceso Node.js
        env = os.environ.copy()
        env["NODE_ENV"] = "development"
        # NODE_PATH debe incluir TODAS las ubicaciones posibles de node_modules
        env["NODE_PATH"] = f"/app/node_modules:/app/packages/backend/node_modules:{backend_dir}/node_modules:{backend_dir}:/app/packages/backend/dist"
        
        # Construir comando Node.js con -r flag para pre-cargar reflect-metadata
        reflect_metadata_candidates = [
            "/app/node_modules/reflect-metadata",
            f"{backend_dir}/node_modules/reflect-metadata",
            "/app/packages/backend/node_modules/reflect-metadata",
        ]
        
        # Usar -r flag para pre-cargar reflect-metadata desde node_modules de la raíz
        cmd = ["node", "-r", "/app/node_modules/reflect-metadata", script_path]
        
        result = subprocess.run(
            cmd,
            cwd=backend_dir,  # Working directory del backend
            capture_output=True,
            text=True,
            timeout=30,
            env=env
        )
        
        # Limpiar script temporal
        try:
            os.remove(script_path)
        except:
            pass
        
        if result.returncode != 0:
            print(f"✗ Handler execution failed:")
            if result.stderr:
                print(f"  {result.stderr}")
            if result.stdout:
                print(f"  {result.stdout}")
            return False
        
        if result.stdout:
            output_lines = result.stdout.strip().split('\n')
            for line in output_lines:
                if line.strip():
                    print(f"  {line}")
        return True
        
    except subprocess.TimeoutExpired:
        print("✗ Handler execution timed out (>30s)")
        return False
    except Exception as e:
        print(f"✗ Error invoking handler: {e}")
        import traceback
        traceback.print_exc()
        return False

def poll_queue(sqs_client, queue_url, queue_name, config):
    """Hace polling de una cola SQS y ejecuta el handler cuando hay mensajes."""
    handler = config["handler"]
    
    if not os.path.exists(BACKEND_DIR):
        print(f"⚠ Warning: Backend directory not found: {BACKEND_DIR}")
        return
    
    print(f"📡 Polling {queue_name} -> {handler}")
    print(f"   Queue URL: {queue_url}")
    print(f"   Backend dir: {BACKEND_DIR}")
    
    poll_count = 0
    while RUNNING:
        try:
            poll_count += 1
            # Log cada 50 polls para no saturar (cada ~100 segundos)
            if poll_count % 50 == 0:
                print(f"  [{queue_name}] Still polling... (poll #{poll_count})")
            
            # Recibir mensajes (usar long polling para ser más eficiente)
            response = sqs_client.receive_message(
                QueueUrl=queue_url,
                MaxNumberOfMessages=MAX_MESSAGES,
                WaitTimeSeconds=20,  # Long polling (más eficiente y rápido)
                MessageAttributeNames=["All"],
                AttributeNames=["All"]
            )
            
            messages = response.get("Messages", [])
            
            if messages:
                print(f"\n📨 [{queue_name}] Received {len(messages)} message(s)", flush=True)
                
                # Log del primer mensaje para debugging
                if messages:
                    first_msg_body = messages[0].get("Body", "")
                    print(f"  First message body (first 500 chars): {first_msg_body[:500]}", flush=True)
                    print(f"  Message ID: {messages[0].get('MessageId', 'N/A')}", flush=True)
                
                # Crear evento SQS
                sqs_event = create_sqs_event(messages)
                
                # Ejecutar handler
                print(f"  Invoking handler: {handler}")
                print(f"  Backend dir: {BACKEND_DIR}")
                success = invoke_lambda_handler(BACKEND_DIR, handler, sqs_event)
                
                if success:
                    # Eliminar mensajes de la cola (ack)
                    for message in messages:
                        try:
                            sqs_client.delete_message(
                                QueueUrl=queue_url,
                                ReceiptHandle=message["ReceiptHandle"]
                            )
                            print(f"✓ Message {message['MessageId'][:8]}... deleted")
                        except ClientError as e:
                            print(f"✗ Error deleting message: {e}")
                else:
                    # Si el handler falla, el mensaje quedará visible después del timeout
                    print(f"⚠ Handler failed, message will be retried after visibility timeout")
            else:
                # No hay mensajes, esperar un poco
                time.sleep(POLL_INTERVAL)
                
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"✗ Error polling {queue_name}: {e}")
            time.sleep(POLL_INTERVAL)

def main():
    """Función principal."""
    print("=" * 60, flush=True)
    print("SQS Lambda Poller Service", flush=True)
    print("=" * 60, flush=True)
    print(f"SQS Endpoint: {LOCALSTACK_ENDPOINT}", flush=True)
    print(f"Region: {REGION}", flush=True)
    print(f"Poll interval: {POLL_INTERVAL}s", flush=True)
    print(f"Backend dir: {BACKEND_DIR}", flush=True)
    print("=" * 60, flush=True)
    print(flush=True)
    
    # Crear cliente SQS
    sqs_client = boto3.client(
        "sqs",
        endpoint_url=LOCALSTACK_ENDPOINT,
        region_name=REGION,
        aws_access_key_id="local",
        aws_secret_access_key="local"
    )
    
    # Esperar a que LocalStack esté disponible
    print("Waiting for LocalStack to be available...", flush=True)
    for i in range(30):
        try:
            sqs_client.list_queues()
            print("✓ LocalStack is available", flush=True)
            break
        except Exception as e:
            if i < 29:
                print(f"  Attempt {i+1}/30: Waiting...", flush=True)
                time.sleep(2)
            else:
                print(f"✗ Error: LocalStack not available: {e}", flush=True)
                sys.exit(1)
    
    print()
    
    # Obtener URLs de todas las colas
    print("\nLooking for queues...", flush=True)
    queue_urls = {}
    for queue_name, config in QUEUE_HANDLERS.items():
        try:
            response = sqs_client.get_queue_url(QueueName=queue_name)
            queue_urls[queue_name] = response["QueueUrl"]
            print(f"✓ Found queue: {queue_name} -> {response['QueueUrl']}", flush=True)
        except ClientError as e:
            if e.response["Error"]["Code"] == "AWS.SimpleQueueService.NonExistentQueue":
                print(f"⚠ Queue not found: {queue_name}", flush=True)
            else:
                print(f"✗ Error getting queue URL for {queue_name}: {e}", flush=True)
    
    if not queue_urls:
        print("\n⚠ No queues found. Waiting for queues to be created...", flush=True)
        time.sleep(5)
        # Reintentar una vez más
        for queue_name in QUEUE_HANDLERS.keys():
            if queue_name not in queue_urls:
                try:
                    response = sqs_client.get_queue_url(QueueName=queue_name)
                    queue_urls[queue_name] = response["QueueUrl"]
                    print(f"✓ Found queue (retry): {queue_name}", flush=True)
                except:
                    pass
    
    print(flush=True)
    print("Starting pollers...", flush=True)
    print(flush=True)
    
    # Iniciar polling para cada cola en procesos separados o threads
    import threading
    
    threads = []
    for queue_name, queue_url in queue_urls.items():
        if queue_name in QUEUE_HANDLERS:
            config = QUEUE_HANDLERS[queue_name]
            thread = threading.Thread(
                target=poll_queue,
                args=(sqs_client, queue_url, queue_name, config),
                daemon=True
            )
            thread.start()
            threads.append(thread)
    
    if not threads:
        print("⚠ No pollers started. Make sure queues exist and backend is built.", flush=True)
        print("Waiting... (press Ctrl+C to stop)", flush=True)
        while RUNNING:
            time.sleep(1)
    else:
        print(f"✓ {len(threads)} poller(s) started", flush=True)
        print("Press Ctrl+C to stop\n", flush=True)
        
        # Esperar a que todos los threads terminen
        for thread in threads:
            thread.join()

if __name__ == "__main__":
    main()
