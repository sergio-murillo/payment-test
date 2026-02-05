# Product Payments - Fullstack Application

Aplicación fullstack para procesamiento de pagos, desarrollada con NestJS, Next.js, y arquitectura serverless en AWS.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Stack Tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Diagramas de Secuencia](#diagramas-de-secuencia)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Instalación](#instalación)
- [Uso](#uso)
- [Pruebas](#pruebas)
- [Despliegue](#despliegue)
- [API Documentation](#api-documentation)
- [Modelo de Datos](#modelo-de-datos)

## ✨ Características

- ✅ Procesamiento de pagos
- ✅ Tokenización segura de tarjetas de crédito
- ✅ Polling automático del estado de pagos
- ✅ Arquitectura Hexagonal (Ports & Adapters)
- ✅ Railway Oriented Programming (ROP)
- ✅ Idempotencia para prevenir pagos duplicados
- ✅ Manejo de condiciones de carrera en inventario
- ✅ Event Store para auditoría
- ✅ Operaciones de compensación (Saga Pattern)
- ✅ Step Functions para orquestación (con fallback para desarrollo local)
- ✅ SQS + SNS + DLQ para mensajería
- ✅ Logs estructurados con Pino
- ✅ Monorepo con NPM Workspaces
- ✅ Docker + Docker Compose
- ✅ Pruebas unitarias (>90% cobertura)
- ✅ Endpoints administrativos para monitoreo
- ✅ Gestión de estado mejorada en frontend

## 🛠 Stack Tecnológico

### Backend
- **Node.js** 18+
- **NestJS** (última versión estable)
- **TypeScript**
- **Serverless Framework**
- **DynamoDB**
- **AWS Lambda**
- **AWS Step Functions**
- **AWS SQS + SNS + DLQ**
- **Pino** (logs estructurados)

### Frontend
- **React** 18
- **Next.js** 14
- **Ant Design** 5
- **Redux Toolkit**
- **TypeScript**

### Infraestructura
- **Docker** + **Docker Compose**
- **AWS** (Lambda, DynamoDB, Step Functions, SQS, SNS)

## 🏗 Arquitectura

La aplicación sigue una **Arquitectura Hexagonal** (Ports & Adapters) con los siguientes principios:

## 📊 Diagramas de Secuencia

El proyecto incluye diagramas de secuencia en PlantUML que documentan las interacciones principales del sistema:

- **Flujo Completo de Pago**: Desde la visualización del producto hasta la finalización del pago
- **Manejo de Condiciones de Carrera**: Actualizaciones concurrentes de inventario
- **Flujo de Compensación**: Operaciones de rollback (Saga Pattern)
- **Garantía de Idempotencia**: Prevención de pagos duplicados
- **Interacción Frontend-Backend**: Flujo con Redux y API
- **Event Store y Auditoría**: Almacenamiento y consulta de eventos
- **Orquestación con Step Functions**: Flujos exitosos y con error

El diagrama esta ubicado en `docs/diagrams/sequence-diagrams.puml`.

## 🏗 Arquitectura Detallada

La aplicación sigue una **Arquitectura Hexagonal** (Ports & Adapters) con los siguientes principios:

### Capas

1. **Domain Layer**: Entidades y lógica de negocio pura
2. **Application Layer**: Casos de uso y DTOs
3. **Infrastructure Layer**: Adaptadores (DynamoDB, API, AWS Services)
4. **Presentation Layer**: Controladores y endpoints REST

### Flujo de Pago

```
1. Cliente selecciona producto
2. Cliente ingresa información de pago (datos de tarjeta)
3. Se crea transacción en estado PENDING
4. Se tokeniza la tarjeta (obtención de acceptance_token)
5. Se calcula la firma de integridad (SHA256)
6. Se procesa el pago usando el token y la firma
7. Se inicia polling para verificar el estado del pago
8. Se inicia Step Function para procesar pago (o ejecución directa en desarrollo)
9. Step Function ejecuta:
   - Validar transacción
   - Procesar pago
   - Actualizar inventario (con manejo de condiciones de carrera)
   - Completar transacción
10. En caso de error: Compensación automática
11. Eventos publicados a SNS para auditoría
12. Frontend actualiza automáticamente el estado del pago
```

### Idempotencia

Cada transacción incluye una `idempotencyKey` única. Si se intenta crear una transacción con la misma clave, se retorna la transacción existente.

### Tokenización de Tarjetas

El sistema utiliza la API para tokenizar tarjetas de crédito de forma segura:

1. **Tokenización**: Los datos de la tarjeta se envían a la API para obtener un token seguro
2. **Acceptance Token**: Se obtiene el token de aceptación
3. **Firma de Integridad**: Se calcula una firma SHA256 para validar la transacción
4. **Procesamiento**: El pago se procesa usando el token y la firma, sin almacenar datos sensibles

### Polling de Estado de Pagos

Después de iniciar un pago, el sistema realiza polling automático para verificar el estado:

- **Intervalo**: Configurable vía `PAYMENT_POLLING_INTERVAL_MS` (default: 2000ms)
- **Duración máxima**: Configurable vía `PAYMENT_POLLING_MAX_DURATION_MS` (default: 30000ms)
- **Estados finales**: El polling se detiene cuando el pago alcanza un estado final (APPROVED, DECLINED, ERROR, VOIDED)

### Gestión de Estado en Frontend

El frontend incluye mejoras en la gestión de estado:

- **Limpieza automática**: Cuando el usuario navega a un producto diferente, el estado de la transacción anterior se limpia automáticamente
- **Prevención de estados obsoletos**: El formulario de pago solo muestra resultados de transacciones del producto actual
- **Reset completo**: Al volver a productos o iniciar un nuevo pago, se resetean formularios y estados de tarjeta

## 📁 Estructura del Proyecto

```
payment-test/
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── products/         # Módulo de productos
│   │   │   ├── transactions/     # Módulo de transacciones
│   │   │   ├── payments/         # Módulo de pagos
│   │   │   ├── inventory/        # Módulo de inventario
│   │   │   ├── event-store/      # Event Store para auditoría
│   │   │   └── shared/           # Servicios compartidos
│   │   ├── serverless.yml        # Configuración Serverless
│   │   └── package.json
│   └── frontend/
│       ├── src/
│       │   ├── app/              # Next.js App Router
│       │   ├── components/       # Componentes React
│       │   ├── store/            # Redux store
│       │   └── services/         # Servicios API
│       └── package.json
├── docker-compose.yml
└── package.json                  # Monorepo root
```

## 🚀 Instalación

### Prerrequisitos

- Node.js 18+
- npm 9+
- Docker & Docker Compose
- AWS CLI (para despliegue)

### Pasos

1. **Clonar el repositorio**

```bash
git clone <repository-url>
cd payment-test
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Configurar variables de entorno**

```bash
# Configuración manual
# Backend
cp packages/backend/env.example packages/backend/.env

# Frontend
cp packages/frontend/env.example packages/frontend/.env
cp packages/frontend/env.example packages/frontend/.env.local
```

4. **Iniciar servicios con Docker Compose**

```bash
docker-compose up -d
```

Esto iniciará:
- DynamoDB Local (puerto 8000)
- LocalStack (puerto 4566) para SQS, SNS, Step Functions
- Backend (puerto 3001)
- Frontend (puerto 3000)

5. **Inicializar datos de prueba**

```bash
cd packages/backend
npm run seed
```

## 💻 Uso

### Desarrollo Local

1. **Backend**

```bash
cd packages/backend
npm run dev
```

2. **Frontend**

```bash
cd packages/frontend
npm run dev
```

### Flujo de Usuario

1. Acceder a `http://localhost:3000`
2. Ver lista de productos disponibles (con categorías, ratings y stock)
3. Seleccionar un producto
4. Hacer clic en "Pagar con tarjeta de crédito"
5. Completar formulario de pago (con vista previa de tarjeta en tiempo real)
6. Ver resumen y confirmar
7. El sistema procesa el pago automáticamente:
   - Tokeniza la tarjeta
   - Procesa el pago
   - Actualiza el inventario
   - Muestra el resultado en tiempo real
8. Ver resultado del pago (aprobado/declinado)
9. Navegar a otro producto para realizar un nuevo pago (el estado se limpia automáticamente)

## 🧪 Pruebas

### Backend

```bash
cd packages/backend
npm run test          # Ejecutar pruebas
npm run test:cov      # Con cobertura
```

### Frontend

```bash
cd packages/frontend
npm run test          # Ejecutar pruebas
npm run test:cov      # Con cobertura
```

### Cobertura

- **Backend**: >90% cobertura (branches, statements, functions, lines)
- **Frontend**: >80% cobertura

## 🚢 Despliegue

### AWS con Serverless Framework

1. **Configurar AWS credentials**

```bash
aws configure
```

2. **Desplegar backend**

```bash
cd packages/backend
npm run sls:deploy -- --stage prod
```

3. **Desplegar frontend**

AWS S3 + CloudFront**

### Docker

```bash
# Build
docker-compose build

# Run
docker-compose up -d
```

## 📚 API Documentation

Una vez iniciado el backend, la documentación Swagger está disponible en:

```
http://localhost:3001/api
```

### Colección Postman

La colección completa de Postman está disponible en `docs/postman/`:

- **Colección**: `docs/postman/Wompi-Payments-API.postman_collection.json`
- **Entorno Local**: `docs/postman/Wompi-Payments-API.postman_environment.json`

La colección incluye:
- ✅ Todos los endpoints documentados
- ✅ Ejemplos de requests y responses
- ✅ Variables de entorno configurables
- ✅ Generación automática de `idempotencyKey`
- ✅ Ejemplos de errores y validaciones

## 🗄 Modelo de Datos

### DynamoDB Tables

#### Products Table
```
PK: id (String)
GSI: categoria-index
  - categoria (String)
Attributes:
  - name
  - description
  - price
  - imageUrl
  - categoria
  - metadata (Map)
  - rating (Number, 1-5)
  - createdAt
  - updatedAt
```

#### Transactions Table
```
PK: id (String)
GSI: idempotencyKey-index
  - idempotencyKey (String)
Attributes:
  - productId
  - amount
  - commission
  - shippingCost
  - totalAmount
  - status (PENDING | APPROVED | DECLINED | ERROR | CANCELLED)
  - customerEmail
  - customerName
  - deliveryAddress
  - deliveryCity
  - deliveryPhone
  - wompiTransactionId
  - createdAt
  - updatedAt
  - errorMessage
```

#### Inventory Table
```
PK: productId (String)
Attributes:
  - quantity
  - reservedQuantity
  - updatedAt
```

#### Event Store Table
```
PK: aggregateId (String)
SK: eventTimestamp (Number)
GSI: eventType-index
Attributes:
  - eventType
  - eventData
  - timestamp
```

## 🔒 Seguridad

- ✅ Validación de datos con class-validator
- ✅ HTTPS en producción
- ✅ Headers de seguridad (CORS configurado)
- ✅ Variables de entorno para credenciales
- ✅ Idempotencia para prevenir duplicados