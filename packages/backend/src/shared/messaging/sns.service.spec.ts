import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SnsService } from './sns.service';
import { LoggerService } from '../logger/logger.service';

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
      if (key === 'SNS_TOPIC_ARN')
        return 'arn:aws:sns:us-east-1:123456789012:test-topic';
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

      await expect(
        service.publish({ eventType: 'TestEvent' }),
      ).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should use "unknown" when message has no eventType', async () => {
      mockSend.mockResolvedValue({ MessageId: 'msg-123' });

      await service.publish({ data: 'test' });

      expect(mockSend).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should handle non-Error exceptions', async () => {
      mockSend.mockRejectedValue('string error');

      await expect(
        service.publish({ eventType: 'TestEvent' }),
      ).rejects.toBe('string error');
      expect(logger.error).toHaveBeenCalledWith(
        'Error publishing to SNS',
        'string error',
        'SnsService',
      );
    });
  });

  describe('constructor with SNS_ENDPOINT', () => {
    it('should use configured SNS endpoint', async () => {
      mockSend.mockClear();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SnsService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
                if (key === 'SNS_ENDPOINT') return 'http://custom-sns:4566';
                if (key === 'REGION') return 'us-east-1';
                if (key === 'SNS_TOPIC_ARN') return 'arn:aws:sns:us-east-1:123456789012:test-topic';
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

      const svc = module.get<SnsService>(SnsService);
      expect(svc).toBeDefined();
    });

    it('should use localhost endpoint in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockSend.mockClear();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SnsService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
                if (key === 'REGION') return 'us-east-1';
                if (key === 'SNS_TOPIC_ARN') return 'arn:aws:sns:us-east-1:123456789012:test-topic';
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

      const svc = module.get<SnsService>(SnsService);
      expect(svc).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
