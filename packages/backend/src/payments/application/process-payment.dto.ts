import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProcessPaymentDto {
  @ApiProperty({
    description: 'ID de la transacción a procesar',
    example: 'trans-12345',
  })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiProperty({
    description: 'Token de pago generado por Wompi',
    example: 'tok_test_1234567890',
  })
  @IsString()
  @IsNotEmpty()
  paymentToken: string;

  @ApiProperty({
    description: 'Número de cuotas para el pago',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  installments: number;
}
