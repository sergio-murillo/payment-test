import { Test, TestingModule } from '@nestjs/testing';
import { GetAllEventsUseCase } from './get-all-events.use-case';
import { DynamoDbService } from '../../shared/database/dynamodb.service';
import { LoggerService } from '../../shared/logger/logger.service';
import { Event } from '../domain/event.entity';

describe('GetAllEventsUseCase', () => {
  let useCase: GetAllEventsUseCase;
  let dynamoDb: jest.Mocked<DynamoDbService>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const mockDynamoDb = {
      scan: jest.fn(),
    };

    const mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllEventsUseCase,
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

    useCase = module.get<GetAllEventsUseCase>(GetAllEventsUseCase);
    dynamoDb = module.get(DynamoDbService);
    logger = module.get(LoggerService);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should return all events sorted by timestamp', async () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 1000);
    const later = new Date(now.getTime() + 1000);

    const mockEvents = [
      {
        id: 'evt-001',
        aggregateId: 'agg-001',
        eventType: 'TransactionCreated',
        eventData: { id: 'trans-001' },
        eventTimestamp: earlier.getTime(),
        timestamp: earlier.toISOString(),
      },
      {
        id: 'evt-002',
        aggregateId: 'agg-002',
        eventType: 'PaymentProcessed',
        eventData: { id: 'trans-002' },
        eventTimestamp: now.getTime(),
        timestamp: now.toISOString(),
      },
      {
        id: 'evt-003',
        aggregateId: 'agg-001',
        eventType: 'InventoryUpdated',
        eventData: { productId: 'prod-001' },
        eventTimestamp: later.getTime(),
        timestamp: later.toISOString(),
      },
    ];

    dynamoDb.scan.mockResolvedValue(mockEvents);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.length).toBe(3);
    expect(result.data?.[0].id).toBe('evt-001');
    expect(result.data?.[1].id).toBe('evt-002');
    expect(result.data?.[2].id).toBe('evt-003');
    expect(dynamoDb.scan).toHaveBeenCalledWith('event-store');
    expect(logger.debug).toHaveBeenCalledWith(
      'Getting all events from event-store',
      'GetAllEventsUseCase',
    );
    expect(logger.debug).toHaveBeenCalledWith(
      'Retrieved 3 events from event-store',
      'GetAllEventsUseCase',
    );
  });

  it('should return empty array when no events found', async () => {
    dynamoDb.scan.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
    expect(logger.debug).toHaveBeenCalledWith(
      'Retrieved 0 events from event-store',
      'GetAllEventsUseCase',
    );
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Database error');
    dynamoDb.scan.mockRejectedValue(error);

    const result = await useCase.execute();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to get all events');
    expect(logger.error).toHaveBeenCalledWith(
      'Error getting all events',
      error.stack,
      'GetAllEventsUseCase',
    );
  });

  it('should handle non-Error exceptions', async () => {
    dynamoDb.scan.mockRejectedValue('String error');

    const result = await useCase.execute();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to get all events');
    expect(logger.error).toHaveBeenCalledWith(
      'Error getting all events',
      'String error',
      'GetAllEventsUseCase',
    );
  });

  it('should sort events by timestamp ascending', async () => {
    const now = new Date();
    const event1 = new Date(now.getTime() - 2000);
    const event2 = new Date(now.getTime() - 1000);
    const event3 = new Date(now.getTime());

    const mockEvents = [
      {
        id: 'evt-003',
        aggregateId: 'agg-003',
        eventType: 'Event3',
        eventData: {},
        eventTimestamp: event3.getTime(),
        timestamp: event3.toISOString(),
      },
      {
        id: 'evt-001',
        aggregateId: 'agg-001',
        eventType: 'Event1',
        eventData: {},
        eventTimestamp: event1.getTime(),
        timestamp: event1.toISOString(),
      },
      {
        id: 'evt-002',
        aggregateId: 'agg-002',
        eventType: 'Event2',
        eventData: {},
        eventTimestamp: event2.getTime(),
        timestamp: event2.toISOString(),
      },
    ];

    dynamoDb.scan.mockResolvedValue(mockEvents);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    expect(result.data?.length).toBe(3);
    expect(result.data?.[0].id).toBe('evt-001');
    expect(result.data?.[1].id).toBe('evt-002');
    expect(result.data?.[2].id).toBe('evt-003');
  });
});
