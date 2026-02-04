#!/usr/bin/env python3
"""
Script para hacer polling de colas SQS y ejecutar lambdas manualmente en desarrollo local.
Este script simula el comportamiento de AWS Lambda cuando hay event sources SQS.

Uso: python scripts/sqs-lambda-poller.py <queue_name> <handler_path>

Ejemplo:
  python scripts/sqs-lambda-poller.py dev-payments-queue dist/main.handler
"""

import boto3
import json
import sys
import time
import subprocess
import os
from botocore.exceptions import ClientError

# Configuración
LOCALSTACK_ENDPOINT = os.getenv("SQS_ENDPOINT", "http://localstack:4566")
REGION = os.getenv("AWS_REGION", "us-east-1")
POLL_INTERVAL = 2  # segundos entre polling
MAX_MESSAGES = 1  # batch size (similar a serverless.yml)

def create_sqs_event(records):
    """Crea un evento SQS compatible con AWS Lambda a partir de los mensajes."""
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
    
    return {
        "Records": sqs_records
    }

def invoke_lambda_handler(backend_dir, handler_path, event):
    """Ejecuta el handler de Lambda con el evento."""
    try:
        # Construir el comando para ejecutar el handler
        # El handler path debe ser algo como: dist/main.handler
        handler_file, handler_function = handler_path.rsplit(".", 1)
        
        # Crear un script Node.js temporal que importe y ejecute el handler
        script_content = f"""
const handler = require('./{handler_file}');
const event = {json.dumps(event)};

handler.{handler_function}(event)
  .then(() => {{
    console.log("Handler executed successfully");
    process.exit(0);
  }})
  .catch((error) => {{
    console.error("Handler error:", error);
    process.exit(1);
  }});
"""
        
        script_path = os.path.join(backend_dir, "temp-invoke.js")
        with open(script_path, "w") as f:
            f.write(script_content)
        
        # Ejecutar el script
        result = subprocess.run(
            ["node", script_path],
            cwd=backend_dir,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        # Limpiar
        os.remove(script_path)
        
        if result.returncode != 0:
            print(f"Error executing handler: {result.stderr}")
            return False
        
        print(result.stdout)
        return True
        
    except Exception as e:
        print(f"Error invoking handler: {e}")
        return False

def poll_queue(sqs_client, queue_url, backend_dir, handler_path):
    """Hace polling de la cola SQS y ejecuta el handler cuando hay mensajes."""
    print(f"Starting to poll queue: {queue_url}")
    print(f"Handler: {handler_path}")
    print(f"Poll interval: {POLL_INTERVAL} seconds")
    print("Press Ctrl+C to stop\n")
    
    while True:
        try:
            # Recibir mensajes
            response = sqs_client.receive_message(
                QueueUrl=queue_url,
                MaxNumberOfMessages=MAX_MESSAGES,
                WaitTimeSeconds=1,  # Short polling
                MessageAttributeNames=["All"],
                AttributeNames=["All"]
            )
            
            messages = response.get("Messages", [])
            
            if messages:
                print(f"Received {len(messages)} message(s)")
                
                # Crear evento SQS
                sqs_event = create_sqs_event(messages)
                
                # Ejecutar handler
                success = invoke_lambda_handler(backend_dir, handler_path, sqs_event)
                
                if success:
                    # Eliminar mensajes de la cola (ack)
                    for message in messages:
                        try:
                            sqs_client.delete_message(
                                QueueUrl=queue_url,
                                ReceiptHandle=message["ReceiptHandle"]
                            )
                            print(f"Message {message['MessageId']} deleted from queue")
                        except ClientError as e:
                            print(f"Error deleting message: {e}")
                else:
                    # Si el handler falla, el mensaje quedará visible después del timeout
                    # (simulando el comportamiento de Lambda)
                    print("Handler failed, message will be retried after visibility timeout")
            else:
                # No hay mensajes, esperar un poco
                time.sleep(POLL_INTERVAL)
                
        except KeyboardInterrupt:
            print("\nStopping poller...")
            break
        except Exception as e:
            print(f"Error polling queue: {e}")
            time.sleep(POLL_INTERVAL)

def main():
    if len(sys.argv) < 3:
        print("Usage: python sqs-lambda-poller.py <queue_name> <handler_path>")
        print("\nExample:")
        print("  python sqs-lambda-poller.py dev-payments-queue dist/main.handler")
        sys.exit(1)
    
    queue_name = sys.argv[1]
    handler_path = sys.argv[2]
    
    # Construir paths
    backend_dir = os.path.join("packages", "backend")
    if not os.path.exists(backend_dir):
        print(f"Error: Backend directory not found: {backend_dir}")
        sys.exit(1)
    
    # Crear cliente SQS
    sqs_client = boto3.client(
        "sqs",
        endpoint_url=LOCALSTACK_ENDPOINT,
        region_name=REGION,
        aws_access_key_id="local",
        aws_secret_access_key="local"
    )
    
    # Obtener URL de la cola
    try:
        response = sqs_client.get_queue_url(QueueName=queue_name)
        queue_url = response["QueueUrl"]
    except ClientError as e:
        print(f"Error getting queue URL: {e}")
        sys.exit(1)
    
    # Iniciar polling
    poll_queue(sqs_client, queue_url, backend_dir, handler_path)

if __name__ == "__main__":
    main()
