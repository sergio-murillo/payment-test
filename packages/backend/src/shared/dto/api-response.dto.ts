import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Indica si la operación fue exitosa' })
  success: boolean;

  @ApiProperty({ description: 'Datos de la respuesta' })
  data: T;
}

export class ApiErrorResponseDto {
  @ApiProperty({
    description: 'Indica si la operación fue exitosa',
    example: false,
  })
  success: boolean;

  @ApiProperty({ description: 'Mensaje de error', example: 'Error message' })
  message: string;

  @ApiProperty({ description: 'Código de estado HTTP', example: 400 })
  statusCode: number;
}
