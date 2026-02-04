import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SqsService } from './sqs.service';
import { LoggerService } from '../logger/logger.service';
import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

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
      if (key === 'SQS_QUEUE_URL') return 'http://localhost:4566/000000000000/test-queue';
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

      await expect(service.sendMessage({ eventType: 'TestEvent' })).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('receiveMessages', () => {
    it('should receive messages successfully', async () => {
      const mockMessages = [
        { Body: JSON.stringify({ eventType: 'TestEvent', data: 'test' }), ReceiptHandle: 'handle-1' },
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

    it('should handle errors', async () => {
      mockSend.mockRejectedValue(new Error('SQS error'));

      await expect(service.receiveMessages()).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
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
  });
});
