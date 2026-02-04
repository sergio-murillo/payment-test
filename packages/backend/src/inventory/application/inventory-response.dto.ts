import { ApiProperty } from '@nestjs/swagger';

export class InventoryResponseDto {
  @ApiProperty({
    description: 'ID del producto',
    example: 'prod-001',
  })
  productId: string;

  @ApiProperty({
    description: 'Cantidad disponible',
    example: 100,
  })
  quantity: number;

  @ApiProperty({
    description: 'Cantidad reservada',
    example: 10,
  })
  reservedQuantity: number;

  @ApiProperty({
    description: 'Fecha de última actualización en formato ISO',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: string;
}
