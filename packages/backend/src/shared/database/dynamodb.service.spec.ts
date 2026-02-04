import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DynamoDbService } from './dynamodb.service';
import { LoggerService } from '../logger/logger.service';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

const mockSend = jest.fn();

jest.mock('@aws-sdk/lib-dynamodb', () => {
  return {
    DynamoDBDocumentClient: {
      from: jest.fn(() => ({
        send: mockSend,
      })),
    },
    GetCommand: jest.fn(),
    PutCommand: jest.fn(),
    UpdateCommand: jest.fn(),
    QueryCommand: jest.fn(),
    ScanCommand: jest.fn(),
    TransactWriteCommand: jest.fn(),
  };
});

describe('DynamoDbService', () => {
  let service: DynamoDbService;
  let configService: jest.Mocked<ConfigService>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    mockSend.mockClear();

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DynamoDbService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<DynamoDbService>(DynamoDbService);
    configService = module.get(ConfigService);
    logger = module.get(LoggerService);

    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'REGION') return 'us-east-1';
      if (key === 'DYNAMODB_TABLE_PREFIX') return 'dev';
      return defaultValue;
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should get item successfully', async () => {
      const mockItem = { id: 'test-id', name: 'Test' };
      mockSend.mockResolvedValue({ Item: mockItem });

      const result = await service.get('test-table', { id: 'test-id' });

      expect(result).toEqual(mockItem);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should return null when item not found', async () => {
      mockSend.mockResolvedValue({});

      const result = await service.get('test-table', { id: 'test-id' });

      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      mockSend.mockRejectedValue(new Error('Database error'));

      await expect(service.get('test-table', { id: 'test-id' })).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('put', () => {
    it('should put item successfully', async () => {
      mockSend.mockResolvedValue({});

      await service.put('test-table', { id: 'test-id', name: 'Test' });

      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      mockSend.mockRejectedValue(new Error('Database error'));

      await expect(service.put('test-table', { id: 'test-id' })).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update item successfully', async () => {
      mockSend.mockResolvedValue({});

      await service.update(
        'test-table',
        { id: 'test-id' },
        'SET #name = :name',
        { ':name': 'Updated' },
        { '#name': 'name' },
      );

      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      mockSend.mockRejectedValue(new Error('Database error'));

      await expect(
        service.update('test-table', { id: 'test-id' }, 'SET #name = :name', { ':name': 'Updated' }),
      ).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should query items successfully', async () => {
      const mockItems = [{ id: 'test-id', name: 'Test' }];
      mockSend.mockResolvedValue({ Items: mockItems });

      const result = await service.query('test-table', 'id = :id', { ':id': 'test-id' });

      expect(result).toEqual(mockItems);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should return empty array when no items found', async () => {
      mockSend.mockResolvedValue({});

      const result = await service.query('test-table', 'id = :id', { ':id': 'test-id' });

      expect(result).toEqual([]);
    });

    it('should handle errors', async () => {
      mockSend.mockRejectedValue(new Error('Database error'));

      await expect(service.query('test-table', 'id = :id', { ':id': 'test-id' })).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('scan', () => {
    it('should scan items successfully', async () => {
      const mockItems = [{ id: 'test-id', name: 'Test' }];
      mockSend.mockResolvedValue({ Items: mockItems });

      const result = await service.scan('test-table');

      expect(result).toEqual(mockItems);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should return empty array when no items found', async () => {
      mockSend.mockResolvedValue({});

      const result = await service.scan('test-table');

      expect(result).toEqual([]);
    });

    it('should handle errors', async () => {
      mockSend.mockRejectedValue(new Error('Database error'));

      await expect(service.scan('test-table')).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('transactWrite', () => {
    it('should execute transaction successfully', async () => {
      mockSend.mockResolvedValue({});

      await service.transactWrite([
        {
          Put: {
            TableName: 'test-table',
            Item: { id: 'test-id' },
          },
        },
      ]);

      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      mockSend.mockRejectedValue(new Error('Transaction error'));

      await expect(
        service.transactWrite([
          {
            Put: {
              TableName: 'test-table',
              Item: { id: 'test-id' },
            },
          },
        ]),
      ).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
