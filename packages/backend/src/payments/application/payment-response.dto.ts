import { ApiProperty } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty({
    description: 'ID de la transacción procesada',
    example: 'trans-12345',
  })
  transactionId: string;

  @ApiProperty({
    description: 'Estado del procesamiento del pago',
    example: 'processing',
  })
  status: string;

  @ApiProperty({
    description: 'Mensaje descriptivo del estado',
    example: 'Payment processing started',
  })
  message: string;
}
