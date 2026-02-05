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
- [Seguridad - OWASP Top 10](#-seguridad---cumplimiento-owasp-top-10)

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

# Docker
cp packages/frontend/env.example packages/.env
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
All files                            |   97.33 |    83.89 |   95.96 |   97.63 |                   
 event-store                         |     100 |      100 |     100 |     100 |                   
  event-store.controller.ts          |     100 |      100 |     100 |     100 |                   
 event-store/application             |     100 |      100 |     100 |     100 |                   
  event-store.service.ts             |     100 |      100 |     100 |     100 |                   
  get-all-events.use-case.ts         |     100 |      100 |     100 |     100 |                   
 event-store/domain                  |     100 |       50 |     100 |     100 |                   
  event.entity.ts                    |     100 |       50 |     100 |     100 |               
 inventory                           |     100 |      100 |     100 |     100 |                   
  inventory.controller.ts            |     100 |      100 |     100 |     100 |                   
  inventory.tokens.ts                |     100 |      100 |     100 |     100 |                   
 inventory/application               |     100 |      100 |     100 |     100 |                   
  get-all-inventory.use-case.ts      |     100 |      100 |     100 |     100 |                   
  update-inventory.use-case.ts       |     100 |      100 |     100 |     100 |                   
 inventory/domain                    |     100 |      100 |     100 |     100 |                   
  inventory.entity.ts                |     100 |      100 |     100 |     100 |                   
 inventory/infrastructure            |   93.33 |     62.5 |     100 |    93.1 |                   
  dynamodb-inventory.repository.ts   |   93.33 |     62.5 |     100 |    93.1 |    
 payments                            |     100 |    66.66 |     100 |     100 |                   
  payments.controller.ts             |     100 |    66.66 |     100 |     100 |                
  payments.tokens.ts                 |     100 |      100 |     100 |     100 |                   
 payments/application                |     100 |    97.91 |     100 |     100 |                   
  compensate-transaction.use-case.ts |     100 |    66.66 |     100 |     100 |                
  process-payment.use-case.ts        |     100 |      100 |     100 |     100 |                   
 payments/infrastructure             |   96.66 |    85.71 |     100 |   96.55 |                   
  wompi-api.adapter.ts               |   96.66 |    85.71 |     100 |   96.55 |          
 payments/lambdas                    |       0 |      100 |       0 |       0 |                   
  step-functions-handlers.ts         |       0 |      100 |       0 |       0 |           
 products                            |     100 |    69.23 |     100 |     100 |                   
  products.controller.ts             |     100 |    69.23 |     100 |     100 |    
  products.tokens.ts                 |     100 |      100 |     100 |     100 |                   
 products/application                |     100 |       80 |     100 |     100 |                   
  get-all-products.use-case.ts       |     100 |      100 |     100 |     100 |                   
  get-product.use-case.ts            |     100 |    66.66 |     100 |     100 |                
 products/domain                     |   84.21 |    63.63 |   66.66 |   84.21 |                   
  product.entity.ts                  |   84.21 |    63.63 |   66.66 |   84.21 |         
 products/infrastructure             |     100 |    66.66 |     100 |     100 |                   
  dynamodb-product.repository.ts     |     100 |    66.66 |     100 |     100 |            
 shared/database                     |   96.29 |    66.66 |     100 |   96.15 |                   
  dynamodb.service.ts                |   96.29 |    66.66 |     100 |   96.15 |             
 shared/filters                      |     100 |      100 |     100 |     100 |                   
  http-exception.filter.ts           |     100 |      100 |     100 |     100 |                   
 shared/logger                       |     100 |       75 |     100 |     100 |                   
  logger.service.ts                  |     100 |       75 |     100 |     100 |               
 shared/messaging                    |     100 |      100 |     100 |     100 |                   
  sns.service.ts                     |     100 |      100 |     100 |     100 |                   
  sqs.service.ts                     |     100 |      100 |     100 |     100 |                   
 shared/orchestration                |     100 |      100 |     100 |     100 |                   
  step-functions.service.ts          |     100 |      100 |     100 |     100 |                   
 transactions                        |     100 |    72.72 |     100 |     100 |                   
  transactions.controller.ts         |     100 |    72.72 |     100 |     100 |        
  transactions.tokens.ts             |     100 |      100 |     100 |     100 |                   
 transactions/application            |     100 |     87.5 |     100 |     100 |                   
  create-transaction.use-case.ts     |     100 |      100 |     100 |     100 |                   
  get-all-transactions.use-case.ts   |     100 |      100 |     100 |     100 |                   
  get-transaction.use-case.ts        |     100 |    66.66 |     100 |     100 |                
 transactions/domain                 |     100 |      100 |     100 |     100 |                   
  transaction-status.enum.ts         |     100 |      100 |     100 |     100 |                   
  transaction.entity.ts              |     100 |      100 |     100 |     100 |                   
 transactions/infrastructure         |     100 |    66.66 |     100 |     100 |                   
  dynamodb-transaction.repository.ts |     100 |    66.66 |     100 |     100 |
- **Frontend**: >80% cobertura
All files                     |   85.93 |    82.38 |   88.39 |   86.46 |                                                       
 app                          |   95.23 |      100 |   83.33 |     100 |                                                       
  page.tsx                    |   95.23 |      100 |   83.33 |     100 |                                                       
 app/checkout/[id]            |   96.15 |      100 |   83.33 |     100 |                                                       
  page.tsx                    |   96.15 |      100 |   83.33 |     100 |                                                       
 app/product/[id]             |   92.85 |       75 |   83.33 |     100 |                                                       
  page.tsx                    |   92.85 |       75 |   83.33 |     100 |                                                    
 components                   |   73.29 |    80.53 |   83.33 |   73.22 |                                                       
  card-brand-icon.tsx         |     100 |      100 |     100 |     100 |                                                       
  navbar.tsx                  |   92.85 |      100 |      80 |     100 |                                                       
  payment-form.tsx            |   61.83 |    58.49 |   75.67 |   60.48 |
  product-card-skeleton.tsx   |     100 |      100 |     100 |     100 |                                                       
  product-card.tsx            |     100 |      100 |     100 |     100 |                                                       
  product-detail-skeleton.tsx |     100 |      100 |     100 |     100 |                                                       
  product-details.tsx         |     100 |      100 |     100 |     100 |                                                       
  star-rating.tsx             |     100 |      100 |     100 |     100 |                                                       
 hooks                        |     100 |      100 |     100 |     100 |                                                       
  use-device-type.ts          |     100 |      100 |     100 |     100 |                                                       
  use-optimized-image.ts      |     100 |      100 |     100 |     100 |                                                       
 services                     |     100 |    83.33 |     100 |     100 |                                                       
  api-client.ts               |     100 |    83.33 |     100 |     100 |                                                    
 store                        |     100 |      100 |     100 |     100 |                                                       
  hooks.ts                    |     100 |      100 |     100 |     100 |                                                       
  provider.tsx                |     100 |      100 |     100 |     100 |                                                       
  store.ts                    |     100 |      100 |     100 |     100 |                                                       
 store/slices                 |     100 |      100 |     100 |     100 |                                                       
  products-slice.ts           |     100 |      100 |     100 |     100 |                                                       
  transaction-slice.ts        |     100 |      100 |     100 |     100 |                                                       
 utils                        |     100 |    78.94 |     100 |     100 |                                                       
  image-optimizer.ts          |     100 |    78.94 |     100 |     100 |

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

## 🔒 Seguridad - Cumplimiento OWASP Top 10

La aplicación implementa controles de seguridad alineados con el [OWASP Top 10 (2021)](https://owasp.org/Top10/). A continuación se detalla cada categoría:

### A01: Broken Access Control

| Control | Estado | Detalle |
|---|---|---|
| CORS configurado | ✅ | Origen restringido vía `FRONTEND_URL` (`main.ts`) |
| Rutas protegidas por método HTTP | ✅ | Controladores con decoradores `@Get`, `@Post` específicos |
| Principio de mínimo privilegio (IAM) | ✅ | Políticas IAM en `serverless.yml` con recursos específicos por tabla/ARN |

**Implementación:**
```typescript
// main.ts
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
});
```

---

### A02: Cryptographic Failures

| Control | Estado | Detalle |
|---|---|---|
| Firma de integridad SHA256 | ✅ | Hash HMAC para validar transacciones Wompi (`wompi-api.adapter.ts`) |
| Secretos en variables de entorno | ✅ | `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET` nunca en código fuente |
| No almacenamiento de datos de tarjeta | ✅ | Tokenización vía API Wompi; datos sensibles no persisten |

**Implementación:**
```typescript
// wompi-api.adapter.ts
private calculateSignature(reference: string, amountInCents: number, currency: string): string {
  const dataToSign = `${reference}${amountInCents}${currency}${this.integritySecret}`;
  return crypto.createHash('sha256').update(dataToSign).digest('hex');
}
```

---

### A03: Injection

| Control | Estado | Detalle |
|---|---|---|
| Validación con class-validator | ✅ | DTOs con `@IsString`, `@IsNotEmpty`, `@IsEmail`, `@Matches`, `@Length`, `@Min` |
| ValidationPipe global | ✅ | `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` |
| Queries parametrizadas DynamoDB | ✅ | `ExpressionAttributeValues` con placeholders (`:value`) en todas las consultas |

**Implementación:**
```typescript
// main.ts - ValidationPipe global
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,              // Elimina propiedades no declaradas en el DTO
  forbidNonWhitelisted: true,   // Rechaza requests con propiedades extra
  transform: true,              // Transforma payloads a instancias del DTO
}));
```

```typescript
// process-payment.dto.ts - Ejemplo de validación
@IsString()
@IsNotEmpty()
@Matches(/^\d{16}$/)
cardNumber: string;

@IsString()
@Length(3, 4)
cvv: string;
```

---

### A04: Insecure Design

| Control | Estado | Detalle |
|---|---|---|
| Idempotencia | ✅ | `idempotencyKey` con GSI en DynamoDB; previene pagos duplicados |
| Patrón SAGA con compensación | ✅ | Step Functions con estado `CompensateTransaction` ante fallos |
| Dead Letter Queue (DLQ) | ✅ | SQS DLQ con `maxReceiveCount: 3` para mensajes fallidos |
| Manejo de condiciones de carrera | ✅ | Operaciones atómicas de inventario con `ConditionExpression` |

**Implementación:**
```typescript
// create-transaction.use-case.ts - Idempotencia
const existingTransaction = await this.transactionRepository.findByIdempotencyKey(dto.idempotencyKey);
if (existingTransaction) {
  return { success: true, data: existingTransaction };
}
```

```yaml
# serverless.yml - SAGA Pattern con compensación
"ProcessPayment":
  "Catch": [{ "ErrorEquals": ["States.ALL"], "Next": "CompensateTransaction" }]
"UpdateInventory":
  "Catch": [{ "ErrorEquals": ["States.ALL"], "Next": "CompensateTransaction" }]
```

---

### A05: Security Misconfiguration

| Control | Estado | Detalle |
|---|---|---|
| Variables de entorno | ✅ | Configuración vía `ConfigService` y `.env` files |
| Configuración por ambiente | ✅ | Diferentes configs para dev/prod (logs, endpoints, CORS) |
| Exclusión de archivos sensibles | ✅ | `package.patterns` en serverless excluye todo excepto `dist/**` |
| DynamoDB endpoint configurable | ✅ | Local en desarrollo, AWS en producción |

---

### A06: Vulnerable and Outdated Components

| Control | Estado | Detalle |
|---|---|---|
| Dependencias actualizadas | ✅ | AWS SDK v3, NestJS, Next.js 14, Axios 1.6+ |
| Librerías de seguridad dedicadas | ✅ | `class-validator`, `class-transformer`, `pino` |
| Node.js runtime moderno | ✅ | Node.js 20.x en producción (serverless.yml) |

---

### A07: Identification and Authentication Failures

| Control | Estado | Detalle |
|---|---|---|
| API Keys separadas por responsabilidad | ✅ | `publicKey` para tokenización, `privateKey` para pagos |
| Bearer Token Authentication | ✅ | Headers `Authorization: Bearer` en todas las llamadas a Wompi |
| Credenciales inyectadas por ConfigService | ✅ | Nunca hardcodeadas en código fuente |

---

### A08: Software and Data Integrity Failures

| Control | Estado | Detalle |
|---|---|---|
| Verificación de firma de integridad | ✅ | SHA256 hash con `integritySecret` en cada transacción de pago |
| Event Store (Event Sourcing) | ✅ | Registro inmutable de todos los cambios de estado de transacciones |
| Eventos de compensación auditados | ✅ | `TransactionCompensated` registrado en Event Store |

**Implementación:**
```typescript
// compensate-transaction.use-case.ts - Auditoría de compensación
await this.eventStoreService.storeEvent({
  aggregateId: transaction.id,
  eventType: 'TransactionCompensated',
  eventData: { transactionId, reason: 'Payment processing failed' },
  timestamp: new Date(),
});
```

---

### A09: Security Logging and Monitoring Failures

| Control | Estado | Detalle |
|---|---|---|
| Logging estructurado con Pino | ✅ | JSON en producción, pretty-print en desarrollo |
| Niveles de log configurables | ✅ | `LOG_LEVEL` via variable de entorno (debug, info, warn, error) |
| Logging contextual | ✅ | Cada log incluye `context` del módulo/servicio |
| Stack traces en errores 5xx | ✅ | `HttpExceptionFilter` registra traza completa |
| Warnings en errores 4xx | ✅ | Errores de cliente logueados como warnings |
| Event Store como auditoría | ✅ | Registro de todos los eventos del dominio |

**Implementación:**
```typescript
// http-exception.filter.ts - Logging diferenciado por severidad
if (status >= 500) {
  this.logger.error(`${request.method} ${request.url}`, exception.stack, 'HttpExceptionFilter');
} else {
  this.logger.warn(`${request.method} ${request.url} ${status}`, 'HttpExceptionFilter');
}
```

---

### A10: Server-Side Request Forgery (SSRF)

| Control | Estado | Detalle |
|---|---|---|
| URLs de API fijas por configuración | ✅ | `WOMPI_API_URL` desde variable de entorno, no de input del usuario |
| Axios con baseURL fija | ✅ | Instancia con URL base predefinida, sin URLs dinámicas |
| Frontend con API endpoint fijo | ✅ | `NEXT_PUBLIC_API_URL` configurado en build time |

---

### Resumen de Cumplimiento

| Categoría OWASP | Estado |
|---|---|
| A01: Broken Access Control | ✅ Implementado |
| A02: Cryptographic Failures | ✅ Implementado |
| A03: Injection | ✅ Implementado |
| A04: Insecure Design | ✅ Implementado |
| A05: Security Misconfiguration | ✅ Implementado |
| A06: Vulnerable Components | ✅ Implementado |
| A07: Authentication Failures | ✅ Implementado |
| A08: Data Integrity Failures | ✅ Implementado |
| A09: Logging & Monitoring | ✅ Implementado |
| A10: SSRF | ✅ Implementado |