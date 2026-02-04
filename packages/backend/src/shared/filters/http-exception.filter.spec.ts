import { Test, TestingModule } from '@nestjs/testing';
import { HttpExceptionFilter } from './http-exception.filter';
import { LoggerService } from '../logger/logger.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let logger: jest.Mocked<LoggerService>;
  let mockResponse: any;
  let mockRequest: any;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(async () => {
    const mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = {
      url: '/test/path',
      method: 'GET',
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn(() => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      })),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpExceptionFilter,
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    filter = module.get<HttpExceptionFilter>(HttpExceptionFilter);
    logger = module.get(LoggerService);
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch', () => {
    it('should handle HttpException with string message', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      const statusSpy = jest.spyOn(exception, 'getStatus').mockReturnValue(400);
      const getResponseSpy = jest
        .spyOn(exception, 'getResponse')
        .mockReturnValue('Test error');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 400,
        timestamp: expect.any(String),
        path: '/test/path',
        method: 'GET',
        message: 'Test error',
      });
      expect(logger.warn).toHaveBeenCalledWith(
        'GET /test/path - 400',
        'HttpExceptionFilter',
      );

      statusSpy.mockRestore();
      getResponseSpy.mockRestore();
    });

    it('should handle HttpException with object message', () => {
      const exception = new HttpException(
        { message: 'Validation failed', errors: ['field1', 'field2'] },
        HttpStatus.BAD_REQUEST,
      );
      const statusSpy = jest.spyOn(exception, 'getStatus').mockReturnValue(400);
      const getResponseSpy = jest.spyOn(exception, 'getResponse').mockReturnValue({
        message: 'Validation failed',
        errors: ['field1', 'field2'],
      });

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 400,
        timestamp: expect.any(String),
        path: '/test/path',
        method: 'GET',
        message: 'Validation failed',
      });
      expect(logger.warn).toHaveBeenCalled();

      statusSpy.mockRestore();
      getResponseSpy.mockRestore();
    });

    it('should handle HttpException with 500 status and log error', () => {
      const exception = new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      const statusSpy = jest
        .spyOn(exception, 'getStatus')
        .mockReturnValue(500);
      const getResponseSpy = jest
        .spyOn(exception, 'getResponse')
        .mockReturnValue('Internal server error');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(logger.error).toHaveBeenCalledWith(
        'GET /test/path',
        expect.any(String),
        'HttpExceptionFilter',
      );

      statusSpy.mockRestore();
      getResponseSpy.mockRestore();
    });

    it('should handle non-HttpException errors', () => {
      const error = new Error('Generic error');
      error.stack = 'Error stack trace';

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String),
        path: '/test/path',
        method: 'GET',
        message: 'Internal server error',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'GET /test/path',
        'Error stack trace',
        'HttpExceptionFilter',
      );
    });

    it('should handle non-Error exceptions', () => {
      const error = 'String error';

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String),
        path: '/test/path',
        method: 'GET',
        message: 'Internal server error',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'GET /test/path',
        'String error',
        'HttpExceptionFilter',
      );
    });

    it('should handle 404 status correctly', () => {
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);
      const statusSpy = jest.spyOn(exception, 'getStatus').mockReturnValue(404);
      const getResponseSpy = jest
        .spyOn(exception, 'getResponse')
        .mockReturnValue('Not found');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(logger.warn).toHaveBeenCalledWith(
        'GET /test/path - 404',
        'HttpExceptionFilter',
      );

      statusSpy.mockRestore();
      getResponseSpy.mockRestore();
    });
  });
});
