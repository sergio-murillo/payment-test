import { Test, TestingModule } from '@nestjs/testing';
import { EventStoreService } from './event-store.service';
import { DynamoDbService } from '../../shared/database/dynamodb.service';
import { LoggerService } from '../../shared/logger/logger.service';

describe('EventStoreService', () => {
  let service: EventStoreService;
  let dynamoDb: jest.Mocked<DynamoDbService>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    const mockDynamoDb = {
      put: jest.fn(),
      query: jest.fn(),
    };

    const mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventStoreService,
        {
          provide: DynamoDbService,
          useValue: mockDynamoDb,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<EventStoreService>(EventStoreService);
    dynamoDb = module.get(DynamoDbService);
    logger = module.get(LoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('storeEvent', () => {
    it('should store event successfully', async () => {
      const eventData = {
        aggregateId: 'agg-001',
        eventType: 'TestEvent',
        eventData: { test: 'data' },
        timestamp: new Date(),
      };

      dynamoDb.put.mockResolvedValue(undefined);

      await service.storeEvent(eventData);

      expect(dynamoDb.put).toHaveBeenCalledWith(
        'event-store',
        expect.objectContaining({
          aggregateId: 'agg-001',
          eventType: 'TestEvent',
        }),
      );
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should handle errors when storing event', async () => {
      const eventData = {
        aggregateId: 'agg-001',
        eventType: 'TestEvent',
        eventData: { test: 'data' },
        timestamp: new Date(),
      };

      dynamoDb.put.mockRejectedValue(new Error('Database error'));

      await expect(service.storeEvent(eventData)).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getEventsByAggregateId', () => {
    it('should retrieve events by aggregate id', async () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-02');
      const mockEvents = [
        {
          id: 'event-001',
          aggregateId: 'agg-001',
          eventType: 'TestEvent1',
          eventData: { test: 'data1' },
          eventTimestamp: date1.getTime(),
        },
        {
          id: 'event-002',
          aggregateId: 'agg-001',
          eventType: 'TestEvent2',
          eventData: { test: 'data2' },
          eventTimestamp: date2.getTime(),
        },
      ];

      dynamoDb.query.mockResolvedValue(mockEvents);

      const result = await service.getEventsByAggregateId('agg-001');

      expect(result).toHaveLength(2);
      expect(result[0].eventType).toBe('TestEvent1');
      expect(result[1].eventType).toBe('TestEvent2');
      expect(dynamoDb.query).toHaveBeenCalledWith(
        'event-store',
        'aggregateId = :aggregateId',
        { ':aggregateId': 'agg-001' },
      );
    });

    it('should sort events by timestamp', async () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-02');
      const mockEvents = [
        {
          id: 'event-002',
          aggregateId: 'agg-001',
          eventType: 'TestEvent2',
          eventData: { test: 'data2' },
          eventTimestamp: date2.getTime(),
        },
        {
          id: 'event-001',
          aggregateId: 'agg-001',
          eventType: 'TestEvent1',
          eventData: { test: 'data1' },
          eventTimestamp: date1.getTime(),
        },
      ];

      dynamoDb.query.mockResolvedValue(mockEvents);

      const result = await service.getEventsByAggregateId('agg-001');

      expect(result[0].eventType).toBe('TestEvent1');
      expect(result[1].eventType).toBe('TestEvent2');
    });

    it('should handle errors when retrieving events', async () => {
      dynamoDb.query.mockRejectedValue(new Error('Database error'));

      await expect(service.getEventsByAggregateId('agg-001')).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error exceptions when retrieving events', async () => {
      const nonErrorException = 'String error';
      dynamoDb.query.mockRejectedValue(nonErrorException);

      await expect(service.getEventsByAggregateId('agg-001')).rejects.toBe(
        nonErrorException,
      );
      expect(logger.error).toHaveBeenCalledWith(
        `Error getting events for aggregate: agg-001`,
        String(nonErrorException),
        'EventStoreService',
      );
    });

    it('should return empty array when no events found', async () => {
      dynamoDb.query.mockResolvedValue([]);

      const result = await service.getEventsByAggregateId('agg-001');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
      expect(dynamoDb.query).toHaveBeenCalledWith(
        'event-store',
        'aggregateId = :aggregateId',
        { ':aggregateId': 'agg-001' },
      );
    });

    it('should handle non-Error exceptions when storing event', async () => {
      const eventData = {
        aggregateId: 'agg-001',
        eventType: 'TestEvent',
        eventData: { test: 'data' },
        timestamp: new Date(),
      };

      const nonErrorException = 'String error';
      dynamoDb.put.mockRejectedValue(nonErrorException);

      await expect(service.storeEvent(eventData)).rejects.toBe(
        nonErrorException,
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Error storing event',
        String(nonErrorException),
        'EventStoreService',
      );
    });

    it('should verify event creation and persistence format', async () => {
      const eventData = {
        aggregateId: 'agg-001',
        eventType: 'TestEvent',
        eventData: { test: 'data', nested: { value: 123 } },
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
      };

      dynamoDb.put.mockResolvedValue(undefined);

      await service.storeEvent(eventData);

      expect(dynamoDb.put).toHaveBeenCalledWith(
        'event-store',
        expect.objectContaining({
          aggregateId: 'agg-001',
          eventType: 'TestEvent',
          eventData: expect.objectContaining({
            test: 'data',
            nested: expect.objectContaining({ value: 123 }),
          }),
          eventTimestamp: expect.any(Number),
          id: expect.any(String),
          timestamp: expect.any(String),
        }),
      );
      expect(logger.debug).toHaveBeenCalledWith(
        'Event stored: TestEvent for aggregate agg-001',
        'EventStoreService',
      );
    });

    it('should handle multiple events with same timestamp', async () => {
      const sameTimestamp = new Date('2024-01-01T00:00:00.000Z');
      const mockEvents = [
        {
          id: 'event-001',
          aggregateId: 'agg-001',
          eventType: 'TestEvent1',
          eventData: { test: 'data1' },
          eventTimestamp: sameTimestamp.getTime(),
        },
        {
          id: 'event-002',
          aggregateId: 'agg-001',
          eventType: 'TestEvent2',
          eventData: { test: 'data2' },
          eventTimestamp: sameTimestamp.getTime(),
        },
      ];

      dynamoDb.query.mockResolvedValue(mockEvents);

      const result = await service.getEventsByAggregateId('agg-001');

      expect(result).toHaveLength(2);
      expect(result[0].timestamp.getTime()).toBe(sameTimestamp.getTime());
      expect(result[1].timestamp.getTime()).toBe(sameTimestamp.getTime());
    });
  });
});
