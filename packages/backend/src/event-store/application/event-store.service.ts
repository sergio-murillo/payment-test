import { Injectable } from '@nestjs/common';
import { DynamoDbService } from '../../shared/database/dynamodb.service';
import { LoggerService } from '../../shared/logger/logger.service';
import { Event } from '../domain/event.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EventStoreService {
  constructor(
    private readonly dynamoDb: DynamoDbService,
    private readonly logger: LoggerService,
  ) {}

  async storeEvent(eventData: {
    aggregateId: string;
    eventType: string;
    eventData: any;
    timestamp: Date;
  }): Promise<void> {
    try {
      const event = new Event(
        eventData.aggregateId,
        eventData.eventType,
        eventData.eventData,
        eventData.timestamp,
        uuidv4(),
      );

      await this.dynamoDb.put('event-store', event.toPersistence());

      this.logger.debug(
        `Event stored: ${event.eventType} for aggregate ${event.aggregateId}`,
        'EventStoreService',
      );
    } catch (error) {
      this.logger.error(
        'Error storing event',
        error instanceof Error ? error.stack : String(error),
        'EventStoreService',
      );
      throw error;
    }
  }

  async getEventsByAggregateId(aggregateId: string): Promise<Event[]> {
    try {
      const results = await this.dynamoDb.query(
        'event-store',
        'aggregateId = :aggregateId',
        { ':aggregateId': aggregateId },
      );

      return results
        .map((item) => Event.fromPersistence(item))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (error) {
      this.logger.error(
        `Error getting events for aggregate: ${aggregateId}`,
        error instanceof Error ? error.stack : String(error),
        'EventStoreService',
      );
      throw error;
    }
  }
}
