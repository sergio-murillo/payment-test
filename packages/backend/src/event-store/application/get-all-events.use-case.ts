import { Injectable } from '@nestjs/common';
import { Event } from '../domain/event.entity';
import { DynamoDbService } from '../../shared/database/dynamodb.service';
import { LoggerService } from '../../shared/logger/logger.service';

export type Result<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

@Injectable()
export class GetAllEventsUseCase {
  constructor(
    private readonly dynamoDb: DynamoDbService,
    private readonly logger: LoggerService,
  ) {}

  async execute(): Promise<Result<Event[]>> {
    try {
      this.logger.debug(
        'Getting all events from event-store',
        'GetAllEventsUseCase',
      );

      const results = await this.dynamoDb.scan('event-store');

      const events = results
        .map((item) => Event.fromPersistence(item))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      this.logger.debug(
        `Retrieved ${events.length} events from event-store`,
        'GetAllEventsUseCase',
      );

      return {
        success: true,
        data: events,
      };
    } catch (error) {
      this.logger.error(
        'Error getting all events',
        error instanceof Error ? error.stack : String(error),
        'GetAllEventsUseCase',
      );

      return {
        success: false,
        error: 'Failed to get all events',
      };
    }
  }
}
