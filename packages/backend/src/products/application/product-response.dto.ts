import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({ description: 'ID del producto', example: 'prod-001' })
  id: string;

  @ApiProperty({
    description: 'Nombre del producto',
    example: 'Producto Ejemplo',
  })
  name: string;

  @ApiProperty({
    description: 'Descripción del producto',
    example: 'Descripción detallada del producto',
  })
  description: string;

  @ApiProperty({
    description: 'Precio del producto en centavos',
    example: 100000,
  })
  price: number;

  @ApiProperty({
    description: 'URL de la imagen del producto',
    example: 'https://via.placeholder.com/300',
  })
  imageUrl: string;

  @ApiProperty({
    description: 'Categoría del producto',
    example: 'Electrónica',
  })
  categoria: string;

  @ApiProperty({
    description: 'Metadatos adicionales del producto',
    example: { marca: 'Apple', modelo: 'iPhone 15 Pro' },
  })
  metadata: Record<string, any>;

  @ApiProperty({
    description: 'Valoración del producto (1 a 5)',
    example: 4.5,
    minimum: 1,
    maximum: 5,
  })
  rating: number;

  @ApiProperty({
    description: 'Cantidad disponible en inventario',
    example: 50,
  })
  stock: number;

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
}
