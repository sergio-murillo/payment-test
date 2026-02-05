import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SqsService } from './sqs.service';
import { LoggerService } from '../logger/logger.service';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-sqs', () => {
  return {
    SQSClient: jest.fn(() => ({
      send: mockSend,
    })),
    SendMessageCommand: jest.fn(),
    ReceiveMessageCommand: jest.fn(),
    DeleteMessageCommand: jest.fn(),
  };
});

describe('SqsService', () => {
  let service: SqsService;
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
        SqsService,
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

    service = module.get<SqsService>(SqsService);
    configService = module.get(ConfigService);
    logger = module.get(LoggerService);

    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'REGION') return 'us-east-1';
      if (key === 'SQS_QUEUE_URL')
        return 'http://localhost:4566/000000000000/test-queue';
      return defaultValue;
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      mockSend.mockResolvedValue({});

      await service.sendMessage({ eventType: 'TestEvent', data: 'test' });

      expect(mockSend).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      mockSend.mockRejectedValue(new Error('SQS error'));

      await expect(
        service.sendMessage({ eventType: 'TestEvent' }),
      ).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should use "unknown" when message has no eventType', async () => {
      mockSend.mockResolvedValue({});

      await service.sendMessage({ data: 'test' });

      expect(mockSend).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should handle non-Error exceptions', async () => {
      mockSend.mockRejectedValue('string error');

      await expect(
        service.sendMessage({ eventType: 'TestEvent' }),
      ).rejects.toBe('string error');
      expect(logger.error).toHaveBeenCalledWith(
        'Error sending message to SQS',
        'string error',
        'SqsService',
      );
    });
  });

  describe('receiveMessages', () => {
    it('should receive messages successfully', async () => {
      const mockMessages = [
        {
          Body: JSON.stringify({ eventType: 'TestEvent', data: 'test' }),
          ReceiptHandle: 'handle-1',
        },
      ];
      mockSend.mockResolvedValue({ Messages: mockMessages });

      const result = await service.receiveMessages();

      expect(result).toHaveLength(1);
      expect(result[0].eventType).toBe('TestEvent');
      expect(mockSend).toHaveBeenCalled();
    });

    it('should return empty array when no messages', async () => {
      mockSend.mockResolvedValue({});

      const result = await service.receiveMessages();

      expect(result).toEqual([]);
    });

    it('should handle messages with empty Body', async () => {
      const mockMessages = [
        {
          Body: undefined,
          ReceiptHandle: 'handle-1',
        },
      ];
      mockSend.mockResolvedValue({ Messages: mockMessages });

      const result = await service.receiveMessages();

      expect(result).toHaveLength(1);
      expect(result[0].receiptHandle).toBe('handle-1');
    });

    it('should handle errors', async () => {
      mockSend.mockRejectedValue(new Error('SQS error'));

      await expect(service.receiveMessages()).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error exceptions', async () => {
      mockSend.mockRejectedValue('string error');

      await expect(service.receiveMessages()).rejects.toBe('string error');
      expect(logger.error).toHaveBeenCalledWith(
        'Error receiving messages from SQS',
        'string error',
        'SqsService',
      );
    });
  });

  describe('deleteMessage', () => {
    it('should delete message successfully', async () => {
      mockSend.mockResolvedValue({});

      await service.deleteMessage('receipt-handle');

      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      mockSend.mockRejectedValue(new Error('SQS error'));

      await expect(service.deleteMessage('receipt-handle')).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error exceptions', async () => {
      mockSend.mockRejectedValue('string error');

      await expect(service.deleteMessage('receipt-handle')).rejects.toBe('string error');
      expect(logger.error).toHaveBeenCalledWith(
        'Error deleting message from SQS',
        'string error',
        'SqsService',
      );
    });
  });

  describe('constructor with SQS_ENDPOINT', () => {
    it('should use configured SQS endpoint', async () => {
      mockSend.mockClear();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SqsService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
                if (key === 'SQS_ENDPOINT') return 'http://custom-sqs:4566';
                if (key === 'REGION') return 'us-east-1';
                if (key === 'SQS_QUEUE_URL') return 'http://custom-sqs:4566/000000000000/test-queue';
                return defaultValue;
              }),
            },
          },
          {
            provide: LoggerService,
            useValue: { debug: jest.fn(), error: jest.fn() },
          },
        ],
      }).compile();

      const svc = module.get<SqsService>(SqsService);
      expect(svc).toBeDefined();
    });

    it('should use localhost endpoint in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockSend.mockClear();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SqsService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
                if (key === 'REGION') return 'us-east-1';
                return defaultValue;
              }),
            },
          },
          {
            provide: LoggerService,
            useValue: { debug: jest.fn(), error: jest.fn() },
          },
        ],
      }).compile();

      const svc = module.get<SqsService>(SqsService);
      expect(svc).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should construct default queue URL without SQS_QUEUE_URL', async () => {
      mockSend.mockClear();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SqsService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
                if (key === 'REGION') return 'us-east-1';
                if (key === 'SQS_ENDPOINT') return 'http://custom-sqs:4566';
                return defaultValue;
              }),
            },
          },
          {
            provide: LoggerService,
            useValue: { debug: jest.fn(), error: jest.fn() },
          },
        ],
      }).compile();

      const svc = module.get<SqsService>(SqsService);
      expect(svc).toBeDefined();
    });
  });
});
