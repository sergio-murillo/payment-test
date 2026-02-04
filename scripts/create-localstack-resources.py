#!/usr/bin/env python3
"""
Script para crear recursos de SNS y SQS en LocalStack automáticamente.
Este script espera a que LocalStack esté disponible y luego crea todos los tópicos SNS,
colas SQS, suscripciones y políticas necesarias.
"""

import boto3
import time
import sys
import json
from botocore.exceptions import ClientError, EndpointConnectionError

# Configuración
LOCALSTACK_ENDPOINT = "http://localstack:4566"
REGION = "us-east-1"
STAGE = "dev"
MAX_RETRIES = 30
RETRY_DELAY = 2
AWS_ACCOUNT_ID = "000000000000"  # LocalStack usa esta cuenta por defecto

def wait_for_localstack(sns_client, sqs_client, max_retries=MAX_RETRIES, delay=RETRY_DELAY):
    """Espera a que LocalStack esté disponible."""
    print("Esperando a que LocalStack esté disponible...")
    for i in range(max_retries):
        try:
            sns_client.list_topics()
            sqs_client.list_queues()
            print("✓ LocalStack está disponible")
            return True
        except (EndpointConnectionError, ClientError) as e:
            if i < max_retries - 1:
                print(f"Intento {i + 1}/{max_retries}: LocalStack no disponible aún, esperando {delay} segundos...")
                time.sleep(delay)
            else:
                print(f"✗ Error: No se pudo conectar a LocalStack después de {max_retries} intentos")
                print(f"Error: {e}")
                return False
    return False

def create_topic_if_not_exists(sns_client, topic_name):
    """Crea un tópico SNS si no existe."""
    try:
        # Listar todos los tópicos y verificar si existe
        response = sns_client.list_topics()
        topics = response.get("Topics", [])
        
        # Buscar el tópico por nombre
        for topic in topics:
            if topic_name in topic["TopicArn"]:
                print(f"✓ Tópico '{topic_name}' ya existe")
                return topic["TopicArn"]
        
        # Crear el tópico
        print(f"Creando tópico '{topic_name}'...")
        response = sns_client.create_topic(Name=topic_name)
        topic_arn = response["TopicArn"]
        print(f"✓ Tópico '{topic_name}' creado exitosamente")
        return topic_arn
        
    except ClientError as e:
        print(f"✗ Error al crear el tópico '{topic_name}': {e}")
        return None

def create_queue_if_not_exists(sqs_client, queue_name, attributes=None):
    """Crea una cola SQS si no existe."""
    try:
        # Intentar obtener la URL de la cola
        try:
            response = sqs_client.get_queue_url(QueueName=queue_name)
            queue_url = response["QueueUrl"]
            print(f"✓ Cola '{queue_name}' ya existe")
            return queue_url
        except ClientError as e:
            if e.response["Error"]["Code"] == "AWS.SimpleQueueService.NonExistentQueue":
                # La cola no existe, crearla
                pass
            else:
                raise
        
        # Crear la cola
        print(f"Creando cola '{queue_name}'...")
        create_params = {"QueueName": queue_name}
        if attributes:
            create_params["Attributes"] = attributes
        
        response = sqs_client.create_queue(**create_params)
        queue_url = response["QueueUrl"]
        print(f"✓ Cola '{queue_name}' creada exitosamente")
        return queue_url
        
    except ClientError as e:
        print(f"✗ Error al crear la cola '{queue_name}': {e}")
        return None

def get_queue_arn(sqs_client, queue_url):
    """Obtiene el ARN de una cola SQS."""
    try:
        # Extraer el nombre de la cola de la URL
        queue_name = queue_url.split("/")[-1]
        response = sqs_client.get_queue_attributes(
            QueueUrl=queue_url,
            AttributeNames=["QueueArn"]
        )
        return response["Attributes"]["QueueArn"]
    except ClientError as e:
        print(f"✗ Error al obtener ARN de la cola: {e}")
        return None

def create_subscription_if_not_exists(sns_client, topic_arn, queue_arn):
    """Crea una suscripción SNS a SQS si no existe."""
    try:
        # Listar suscripciones del tópico
        response = sns_client.list_subscriptions_by_topic(TopicArn=topic_arn)
        subscriptions = response.get("Subscriptions", [])
        
        # Verificar si ya existe la suscripción
        for sub in subscriptions:
            if sub["Protocol"] == "sqs" and sub["Endpoint"] == queue_arn:
                print(f"  ✓ Suscripción ya existe: {topic_arn.split(':')[-1]} -> {queue_arn.split(':')[-1]}")
                return sub["SubscriptionArn"]
        
        # Crear la suscripción
        print(f"  Creando suscripción: {topic_arn.split(':')[-1]} -> {queue_arn.split(':')[-1]}...")
        response = sns_client.subscribe(
            TopicArn=topic_arn,
            Protocol="sqs",
            Endpoint=queue_arn
        )
        subscription_arn = response["SubscriptionArn"]
        print(f"  ✓ Suscripción creada exitosamente")
        return subscription_arn
        
    except ClientError as e:
        print(f"  ✗ Error al crear suscripción: {e}")
        return None


def main():
    """Función principal que crea todos los recursos."""
    print("=" * 60)
    print("Script de creación de recursos SNS/SQS en LocalStack")
    print("=" * 60)
    
    # Crear clientes de SNS y SQS
    sns_client = boto3.client(
        "sns",
        endpoint_url=LOCALSTACK_ENDPOINT,
        region_name=REGION,
        aws_access_key_id="local",
        aws_secret_access_key="local"
    )
    
    sqs_client = boto3.client(
        "sqs",
        endpoint_url=LOCALSTACK_ENDPOINT,
        region_name=REGION,
        aws_access_key_id="local",
        aws_secret_access_key="local"
    )
    
    # Esperar a que LocalStack esté disponible
    if not wait_for_localstack(sns_client, sqs_client):
        sys.exit(1)
    
    # Definir tópicos SNS
    topics = [
        "dev-payments-events",
    ]
    
    # Definir colas SQS (cola principal y DLQ)
    queues = [
        {
            "name": "dev-payments-queue",
            "dlq_name": "dev-payments-dlq",
            "attributes": {
                "VisibilityTimeout": "300",
                "MessageRetentionPeriod": "1209600",  # 14 days
            }
        },
    ]
    
    # Definir suscripciones (topic -> queue)
    subscriptions = [
        {"topic": "dev-payments-events", "queue": "dev-payments-queue"},
    ]
    
    # Crear tópicos SNS
    print("\n" + "=" * 60)
    print("Creando tópicos SNS...")
    print("=" * 60)
    topic_arns = {}
    
    for topic_name in topics:
        topic_arn = create_topic_if_not_exists(sns_client, topic_name)
        if topic_arn:
            topic_arns[topic_name] = topic_arn
        print()
    
    # Crear colas DLQ primero (sin redrive policy)
    print("=" * 60)
    print("Creando colas DLQ (Dead Letter Queues)...")
    print("=" * 60)
    dlq_urls = {}
    dlq_arns = {}
    
    for queue_config in queues:
        dlq_name = queue_config["dlq_name"]
        dlq_attributes = {
            "MessageRetentionPeriod": "1209600",  # 14 days
        }
        dlq_url = create_queue_if_not_exists(sqs_client, dlq_name, dlq_attributes)
        if dlq_url:
            dlq_urls[dlq_name] = dlq_url
            dlq_arn = get_queue_arn(sqs_client, dlq_url)
            if dlq_arn:
                dlq_arns[dlq_name] = dlq_arn
        print()
    
    # Crear colas principales (con redrive policy)
    print("=" * 60)
    print("Creando colas SQS principales...")
    print("=" * 60)
    queue_urls = {}
    queue_arns = {}
    
    for queue_config in queues:
        queue_name = queue_config["name"]
        dlq_name = queue_config["dlq_name"]
        dlq_arn = dlq_arns.get(dlq_name)
        
        # Configurar redrive policy si existe el DLQ
        queue_attributes = queue_config["attributes"].copy()
        if dlq_arn:
            queue_attributes["RedrivePolicy"] = json.dumps({
                "deadLetterTargetArn": dlq_arn,
                "maxReceiveCount": 3
            })
        
        queue_url = create_queue_if_not_exists(sqs_client, queue_name, queue_attributes)
        if queue_url:
            queue_urls[queue_name] = queue_url
            queue_arn = get_queue_arn(sqs_client, queue_url)
            if queue_arn:
                queue_arns[queue_name] = queue_arn
        print()
    
    # Crear políticas de cola primero (necesario antes de suscripciones)
    print("=" * 60)
    print("Configurando políticas de colas SQS...")
    print("=" * 60)
    
    # Mapeo de colas a tópicos (para políticas)
    queue_topic_map = {}
    for sub_config in subscriptions:
        queue_name = sub_config["queue"]
        topic_name = sub_config["topic"]
        if queue_name not in queue_topic_map:
            queue_topic_map[queue_name] = []
        queue_topic_map[queue_name].append(topic_name)
    
    # Crear políticas para cada cola (permite todos los tópicos relacionados)
    for queue_name, topic_names in queue_topic_map.items():
        queue_url = queue_urls.get(queue_name)
        queue_arn = queue_arns.get(queue_name)
        
        if not queue_url or not queue_arn:
            continue
        
        # Crear política que permita todos los tópicos relacionados
        topic_arns_for_policy = [topic_arns[topic_name] for topic_name in topic_names if topic_name in topic_arns]
        
        if topic_arns_for_policy:
            # Para LocalStack, podemos crear una política más permisiva
            policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": "*",
                        "Action": "sqs:SendMessage",
                        "Resource": queue_arn,
                        "Condition": {
                            "ArnLike": {
                                "aws:SourceArn": f"arn:aws:sns:{REGION}:{AWS_ACCOUNT_ID}:*"
                            }
                        }
                    }
                ]
            }
            
            try:
                sqs_client.set_queue_attributes(
                    QueueUrl=queue_url,
                    Attributes={
                        "Policy": json.dumps(policy)
                    }
                )
                print(f"✓ Política configurada para '{queue_name}'")
            except ClientError as e:
                print(f"✗ Error al configurar política para '{queue_name}': {e}")
        print()
    
    # Crear suscripciones SNS -> SQS
    print("=" * 60)
    print("Creando suscripciones SNS -> SQS...")
    print("=" * 60)
    subscription_count = 0
    failed_count = 0
    
    for sub_config in subscriptions:
        topic_name = sub_config["topic"]
        queue_name = sub_config["queue"]
        
        topic_arn = topic_arns.get(topic_name)
        queue_arn = queue_arns.get(queue_name)
        
        if not topic_arn:
            print(f"✗ Tópico '{topic_name}' no encontrado")
            failed_count += 1
            continue
        
        if not queue_arn:
            print(f"✗ Cola '{queue_name}' no encontrada")
            failed_count += 1
            continue
        
        print(f"Suscribiendo '{queue_name}' a '{topic_name}'...")
        subscription_arn = create_subscription_if_not_exists(sns_client, topic_arn, queue_arn)
        
        if subscription_arn:
            subscription_count += 1
        else:
            failed_count += 1
        print()
    
    # Resumen
    print("=" * 60)
    print(f"Resumen:")
    print(f"  Tópicos SNS: {len(topic_arns)} creados/existentes")
    print(f"  Colas SQS: {len(queue_urls)} creadas/existentes")
    print(f"  Colas DLQ: {len(dlq_urls)} creadas/existentes")
    print(f"  Suscripciones: {subscription_count} creadas/existentes, {failed_count} errores")
    print("=" * 60)
    
    if failed_count > 0:
        print(f"⚠ Algunas suscripciones fallaron. Revisa los errores arriba.")
        sys.exit(1)
    
    print("✓ Todos los recursos están listos")
    sys.exit(0)

if __name__ == "__main__":
    main()
