import { IsString, IsEmail, IsNumber, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({
    description: 'ID del producto a comprar',
    example: 'prod-001',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'Monto del producto en centavos',
    example: 100000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Comisión de la transacción en centavos',
    example: 5000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  commission: number;

  @ApiProperty({
    description: 'Costo de envío en centavos',
    example: 10000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  shippingCost: number;

  @ApiProperty({
    description: 'Email del cliente',
    example: 'cliente@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  customerEmail: string;

  @ApiProperty({
    description: 'Nombre completo del cliente',
    example: 'Juan Pérez',
  })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({
    description: 'Dirección de entrega',
    example: 'Calle 123 #45-67',
  })
  @IsString()
  @IsNotEmpty()
  deliveryAddress: string;

  @ApiProperty({
    description: 'Ciudad de entrega',
    example: 'Bogotá',
  })
  @IsString()
  @IsNotEmpty()
  deliveryCity: string;

  @ApiProperty({
    description: 'Teléfono de contacto para la entrega',
    example: '+573001234567',
  })
  @IsString()
  @IsNotEmpty()
  deliveryPhone: string;

  @ApiProperty({
    description: 'Clave de idempotencia para evitar transacciones duplicadas',
    example: 'unique-idempotency-key-12345',
  })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}
