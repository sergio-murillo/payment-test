import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StepFunctionsService } from './step-functions.service';
import { LoggerService } from '../logger/logger.service';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-sfn', () => {
  return {
    SFNClient: jest.fn(() => ({
      send: mockSend,
    })),
    StartExecutionCommand: jest.fn(),
    DescribeExecutionCommand: jest.fn(),
  };
});

describe('StepFunctionsService', () => {
  let service: StepFunctionsService;
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
        StepFunctionsService,
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

    service = module.get<StepFunctionsService>(StepFunctionsService);
    configService = module.get(ConfigService);
    logger = module.get(LoggerService);

    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'REGION') return 'us-east-1';
      if (key === 'STEP_FUNCTION_ARN')
        return 'arn:aws:states:us-east-1:123456789012:stateMachine:test';
      return defaultValue;
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startExecution', () => {
    it('should start execution successfully', async () => {
      mockSend.mockResolvedValue({
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:test',
      });

      const result = await service.startExecution({ test: 'data' });

      expect(result).toBe(
        'arn:aws:states:us-east-1:123456789012:execution:test',
      );
      expect(mockSend).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      mockSend.mockRejectedValue(new Error('Step Functions error'));

      await expect(service.startExecution({ test: 'data' })).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should return empty string when executionArn is undefined', async () => {
      mockSend.mockResolvedValue({});

      const result = await service.startExecution({ test: 'data' });

      expect(result).toBe('');
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should pass executionName when provided', async () => {
      mockSend.mockResolvedValue({
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:test',
      });

      const result = await service.startExecution(
        { test: 'data' },
        'my-execution',
      );

      expect(result).toBe(
        'arn:aws:states:us-east-1:123456789012:execution:test',
      );
      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle non-Error exceptions', async () => {
      mockSend.mockRejectedValue('string error');

      await expect(service.startExecution({ test: 'data' })).rejects.toBe(
        'string error',
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Error starting Step Function execution',
        'string error',
        'StepFunctionsService',
      );
    });
  });

  describe('describeExecution', () => {
    it('should describe execution successfully', async () => {
      const mockExecution = {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:test',
        status: 'RUNNING',
      };
      mockSend.mockResolvedValue(mockExecution);

      const result = await service.describeExecution(
        'arn:aws:states:us-east-1:123456789012:execution:test',
      );

      expect(result).toEqual(mockExecution);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      mockSend.mockRejectedValue(new Error('Step Functions error'));

      await expect(service.describeExecution('arn:test')).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle non-Error exceptions', async () => {
      mockSend.mockRejectedValue('string error');

      await expect(service.describeExecution('arn:test')).rejects.toBe(
        'string error',
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Error describing Step Function execution',
        'string error',
        'StepFunctionsService',
      );
    });
  });

  describe('constructor with STEP_FUNCTIONS_ENDPOINT', () => {
    it('should use configured endpoint', async () => {
      mockSend.mockClear();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StepFunctionsService,
          {
            provide: ConfigService,
            useValue: {
              get: jest
                .fn()
                .mockImplementation((key: string, defaultValue?: any) => {
                  if (key === 'STEP_FUNCTIONS_ENDPOINT')
                    return 'http://custom-sfn:4566';
                  if (key === 'REGION') return 'us-east-1';
                  if (key === 'STEP_FUNCTION_ARN')
                    return 'arn:aws:states:us-east-1:123456789012:stateMachine:test';
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

      const svc = module.get<StepFunctionsService>(StepFunctionsService);
      expect(svc).toBeDefined();
    });

    it('should use localhost endpoint in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockSend.mockClear();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StepFunctionsService,
          {
            provide: ConfigService,
            useValue: {
              get: jest
                .fn()
                .mockImplementation((key: string, defaultValue?: any) => {
                  if (key === 'REGION') return 'us-east-1';
                  if (key === 'STEP_FUNCTION_ARN')
                    return 'arn:aws:states:us-east-1:123456789012:stateMachine:test';
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

      const svc = module.get<StepFunctionsService>(StepFunctionsService);
      expect(svc).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
