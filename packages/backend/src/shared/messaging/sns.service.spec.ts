import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SnsService } from './sns.service';
import { LoggerService } from '../logger/logger.service';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-sns', () => {
  return {
    SNSClient: jest.fn(() => ({
      send: mockSend,
    })),
    PublishCommand: jest.fn(),
  };
});

describe('SnsService', () => {
  let service: SnsService;
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
        SnsService,
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

    service = module.get<SnsService>(SnsService);
    configService = module.get(ConfigService);
    logger = module.get(LoggerService);

    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'REGION') return 'us-east-1';
      if (key === 'SNS_TOPIC_ARN') return 'arn:aws:sns:us-east-1:123456789012:test-topic';
      return defaultValue;
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('publish', () => {
    it('should publish message successfully', async () => {
      mockSend.mockResolvedValue({ MessageId: 'msg-123' });

      await service.publish({ eventType: 'TestEvent', data: 'test' });

      expect(mockSend).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should publish with subject', async () => {
      mockSend.mockResolvedValue({ MessageId: 'msg-123' });

      await service.publish({ eventType: 'TestEvent' }, 'Test Subject');

      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      mockSend.mockRejectedValue(new Error('SNS error'));

      await expect(service.publish({ eventType: 'TestEvent' })).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
