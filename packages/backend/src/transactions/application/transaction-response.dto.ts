import { ApiProperty } from '@nestjs/swagger';
import { TransactionStatus } from '../domain/transaction-status.enum';

export class TransactionResponseDto {
  @ApiProperty({ description: 'ID de la transacción', example: 'trans-12345' })
  id: string;

  @ApiProperty({ description: 'ID del producto', example: 'prod-001' })
  productId: string;

  @ApiProperty({
    description: 'Monto del producto en centavos',
    example: 100000,
  })
  amount: number;

  @ApiProperty({ description: 'Comisión en centavos', example: 5000 })
  commission: number;

  @ApiProperty({ description: 'Costo de envío en centavos', example: 10000 })
  shippingCost: number;

  @ApiProperty({ description: 'Monto total en centavos', example: 115000 })
  totalAmount: number;

  @ApiProperty({
    description: 'Estado de la transacción',
    enum: TransactionStatus,
    example: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @ApiProperty({
    description: 'Email del cliente',
    example: 'cliente@example.com',
  })
  customerEmail: string;

  @ApiProperty({ description: 'Nombre del cliente', example: 'Juan Pérez' })
  customerName: string;

  @ApiProperty({
    description: 'Dirección de entrega',
    example: 'Calle 123 #45-67',
  })
  deliveryAddress: string;

  @ApiProperty({ description: 'Ciudad de entrega', example: 'Bogotá' })
  deliveryCity: string;

  @ApiProperty({
    description: 'Teléfono de contacto',
    example: '+573001234567',
  })
  deliveryPhone: string;

  @ApiProperty({
    description: 'Clave de idempotencia',
    example: 'unique-key-12345',
  })
  idempotencyKey: string;

  @ApiProperty({
    description: 'Fecha de creación',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Fecha de actualización',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: string;

  @ApiProperty({
    description: 'ID de la transacción en Wompi',
    example: 'wompi-trans-12345',
    required: false,
  })
  wompiTransactionId?: string;

  @ApiProperty({
    description: 'Mensaje de error si la transacción fue declinada',
    example: 'Payment declined',
    required: false,
  })
  errorMessage?: string;
}
