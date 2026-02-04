import { ApiProperty } from '@nestjs/swagger';

export class EventResponseDto {
  @ApiProperty({
    description: 'ID del evento',
    example: 'evt-12345',
  })
  id: string;

  @ApiProperty({
    description: 'ID del agregado relacionado',
    example: 'agg-12345',
  })
  aggregateId: string;

  @ApiProperty({
    description: 'Tipo de evento',
    example: 'TransactionCreated',
  })
  eventType: string;

  @ApiProperty({
    description: 'Datos del evento',
    example: { id: 'trans-123', status: 'PENDING' },
  })
  eventData: any;

  @ApiProperty({
    description: 'Timestamp del evento en formato ISO',
    example: '2024-01-01T00:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Timestamp del evento en milisegundos',
    example: 1704067200000,
  })
  eventTimestamp: number;
}
