import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Matches,
  Length,
} from 'class-validator';
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
    description: 'Número de la tarjeta',
    example: '4242424242424242',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{13,19}$/, {
    message: 'Card number must be between 13 and 19 digits',
  })
  cardNumber: string;

  @ApiProperty({
    description: 'Código de seguridad de la tarjeta (CVC)',
    example: '123',
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 4, { message: 'CVC must be 3 or 4 digits' })
  @Matches(/^\d+$/, { message: 'CVC must contain only digits' })
  cvc: string;

  @ApiProperty({
    description: 'Mes de expiración (2 dígitos)',
    example: '08',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 2, { message: 'Expiration month must be 2 digits' })
  @Matches(/^(0[1-9]|1[0-2])$/, {
    message: 'Expiration month must be between 01 and 12',
  })
  expMonth: string;

  @ApiProperty({
    description: 'Año de expiración (2 dígitos)',
    example: '28',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 2, { message: 'Expiration year must be 2 digits' })
  @Matches(/^\d{2}$/, { message: 'Expiration year must be 2 digits' })
  expYear: string;

  @ApiProperty({
    description: 'Nombre del tarjetahabiente',
    example: 'José Pérez',
  })
  @IsString()
  @IsNotEmpty()
  cardHolder: string;

  @ApiProperty({
    description: 'Número de cuotas para el pago',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  installments: number;
}
