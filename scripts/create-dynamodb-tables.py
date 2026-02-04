#!/usr/bin/env python3
"""
Script para crear las tablas de DynamoDB automáticamente cuando se levanta DynamoDB Local.
Este script espera a que DynamoDB esté disponible y luego crea todas las tablas necesarias.
"""

import boto3
import time
import sys
from botocore.exceptions import ClientError, EndpointConnectionError

# Configuración
DYNAMODB_ENDPOINT = "http://dynamodb:8000"
REGION = "us-east-1"
MAX_RETRIES = 30
RETRY_DELAY = 2

def wait_for_dynamodb(dynamodb_client, max_retries=MAX_RETRIES, delay=RETRY_DELAY):
    """Espera a que DynamoDB esté disponible."""
    print("Esperando a que DynamoDB esté disponible...")
    for i in range(max_retries):
        try:
            dynamodb_client.list_tables()
            print("✓ DynamoDB está disponible")
            return True
        except (EndpointConnectionError, ClientError) as e:
            if i < max_retries - 1:
                print(f"Intento {i + 1}/{max_retries}: DynamoDB no disponible aún, esperando {delay} segundos...")
                time.sleep(delay)
            else:
                print(f"✗ Error: No se pudo conectar a DynamoDB después de {max_retries} intentos")
                print(f"Error: {e}")
                return False
    return False

def create_table_if_not_exists(dynamodb_client, table_config):
    """Crea una tabla si no existe."""
    table_name = table_config["TableName"]
    
    try:
        # Verificar si la tabla ya existe
        existing_tables = dynamodb_client.list_tables()["TableNames"]
        if table_name in existing_tables:
            print(f"✓ Tabla '{table_name}' ya existe")
            # Verificar que la tabla esté activa
            try:
                response = dynamodb_client.describe_table(TableName=table_name)
                status = response["Table"]["TableStatus"]
                if status != "ACTIVE":
                    print(f"  Esperando que la tabla '{table_name}' esté activa (estado actual: {status})...")
                    time.sleep(2)
                else:
                    print(f"  Estado: {status}")
            except ClientError as e:
                print(f"  Advertencia: No se pudo verificar el estado de la tabla: {e}")
            return True
        
        # Crear la tabla
        print(f"Creando tabla '{table_name}'...")
        response = dynamodb_client.create_table(**table_config)
        
        # Esperar a que la tabla esté activa (polling manual para DynamoDB Local)
        max_wait = 30  # segundos
        wait_interval = 1  # segundo
        elapsed = 0
        
        while elapsed < max_wait:
            try:
                table_response = dynamodb_client.describe_table(TableName=table_name)
                status = table_response["Table"]["TableStatus"]
                if status == "ACTIVE":
                    print(f"✓ Tabla '{table_name}' creada exitosamente (estado: {status})")
                    return True
                elif status == "CREATING":
                    print(f"  Creando... (estado: {status})")
                    time.sleep(wait_interval)
                    elapsed += wait_interval
                else:
                    print(f"  Estado inesperado: {status}")
                    time.sleep(wait_interval)
                    elapsed += wait_interval
            except ClientError as e:
                error_code = e.response.get("Error", {}).get("Code", "")
                if error_code == "ResourceNotFoundException":
                    # La tabla aún no existe, esperar un poco más
                    time.sleep(wait_interval)
                    elapsed += wait_interval
                else:
                    print(f"✗ Error al verificar el estado de la tabla '{table_name}': {e}")
                    return False
        
        print(f"⚠ Tabla '{table_name}' creada pero no está activa después de {max_wait} segundos")
        return True  # Asumimos éxito si la creación no falló
        
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "")
        if error_code == "ResourceInUseException":
            print(f"✓ Tabla '{table_name}' ya existe")
            return True
        else:
            print(f"✗ Error al crear la tabla '{table_name}': {e}")
            print(f"  Código de error: {error_code}")
            return False

def main():
    """Función principal que crea todas las tablas."""
    print("=" * 60)
    print("Script de creación de tablas DynamoDB")
    print("=" * 60)
    
    # Crear cliente de DynamoDB
    dynamodb_client = boto3.client(
        "dynamodb",
        endpoint_url=DYNAMODB_ENDPOINT,
        region_name=REGION,
        aws_access_key_id="local",
        aws_secret_access_key="local"
    )
    
    # Esperar a que DynamoDB esté disponible
    if not wait_for_dynamodb(dynamodb_client):
        sys.exit(1)
    
    # Definir todas las tablas
    tables_config = [
        {
            "TableName": "dev-products",
            "BillingMode": "PAY_PER_REQUEST",
            "AttributeDefinitions": [
                {"AttributeName": "id", "AttributeType": "S"}
            ],
            "KeySchema": [
                {"AttributeName": "id", "KeyType": "HASH"}
            ]
        },
        {
            "TableName": "dev-transactions",
            "BillingMode": "PAY_PER_REQUEST",
            "AttributeDefinitions": [
                {"AttributeName": "id", "AttributeType": "S"},
                {"AttributeName": "idempotencyKey", "AttributeType": "S"}
            ],
            "KeySchema": [
                {"AttributeName": "id", "KeyType": "HASH"}
            ],
            "GlobalSecondaryIndexes": [
                {
                    "IndexName": "idempotencyKey-index",
                    "KeySchema": [
                        {"AttributeName": "idempotencyKey", "KeyType": "HASH"}
                    ],
                    "Projection": {"ProjectionType": "ALL"}
                }
            ]
        },
        {
            "TableName": "dev-inventory",
            "BillingMode": "PAY_PER_REQUEST",
            "AttributeDefinitions": [
                {"AttributeName": "productId", "AttributeType": "S"}
            ],
            "KeySchema": [
                {"AttributeName": "productId", "KeyType": "HASH"}
            ]
        },
        {
            "TableName": "dev-event-store",
            "BillingMode": "PAY_PER_REQUEST",
            "AttributeDefinitions": [
                {"AttributeName": "aggregateId", "AttributeType": "S"},
                {"AttributeName": "eventTimestamp", "AttributeType": "N"}
            ],
            "KeySchema": [
                {"AttributeName": "aggregateId", "KeyType": "HASH"},
                {"AttributeName": "eventTimestamp", "KeyType": "RANGE"}
            ],
            "GlobalSecondaryIndexes": [
                {
                    "IndexName": "eventType-index",
                    "KeySchema": [
                        {"AttributeName": "eventTimestamp", "KeyType": "HASH"}
                    ],
                    "Projection": {"ProjectionType": "ALL"}
                }
            ]
        }
    ]
    
    # Crear todas las tablas
    print("\nIniciando creación de tablas...\n")
    success_count = 0
    failed_count = 0
    
    for table_config in tables_config:
        if create_table_if_not_exists(dynamodb_client, table_config):
            success_count += 1
        else:
            failed_count += 1
        print()  # Línea en blanco entre tablas
    
    # Resumen
    print("=" * 60)
    print(f"Resumen: {success_count} tablas creadas/existentes, {failed_count} errores")
    print("=" * 60)
    
    if failed_count > 0:
        sys.exit(1)
    
    print("✓ Todas las tablas están listas")
    sys.exit(0)

if __name__ == "__main__":
    main()
