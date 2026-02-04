import { Test, TestingModule } from '@nestjs/testing';
import { DynamoDbTransactionRepository } from './dynamodb-transaction.repository';
import { DynamoDbService } from '../../shared/database/dynamodb.service';
import { LoggerService } from '../../shared/logger/logger.service';
import { Transaction } from '../domain/transaction.entity';
import { TransactionStatus } from '../domain/transaction-status.enum';

describe('DynamoDbTransactionRepository', () => {
  let repository: DynamoDbTransactionRepository;
  let dynamoDb: jest.Mocked<DynamoDbService>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const mockDynamoDb = {
      get: jest.fn(),
      scan: jest.fn(),
      put: jest.fn(),
      update: jest.fn(),
      query: jest.fn(),
    };

    const mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DynamoDbTransactionRepository,
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

    repository = module.get<DynamoDbTransactionRepository>(
      DynamoDbTransactionRepository,
    );
    dynamoDb = module.get(DynamoDbService);
    logger = module.get(LoggerService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findById', () => {
    it('should return a transaction when found', async () => {
      const mockTransactionData = {
        id: 'trans-001',
        productId: 'prod-001',
        amount: 100000,
        commission: 3000,
        shippingCost: 15000,
        totalAmount: 118000,
        status: TransactionStatus.PENDING,
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        deliveryAddress: 'Test Address',
        deliveryCity: 'Bogotá',
        deliveryPhone: '+57 300 123 4567',
        idempotencyKey: 'key-001',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      dynamoDb.get.mockResolvedValue(mockTransactionData);

      const result = await repository.findById('trans-001');

      expect(result).toBeInstanceOf(Transaction);
      expect(result?.id).toBe('trans-001');
      expect(result?.productId).toBe('prod-001');
      expect(dynamoDb.get).toHaveBeenCalledWith('transactions', { id: 'trans-001' });
    });

    it('should return null when transaction not found', async () => {
      dynamoDb.get.mockResolvedValue(null);

      const result = await repository.findById('trans-999');

      expect(result).toBeNull();
      expect(dynamoDb.get).toHaveBeenCalledWith('transactions', { id: 'trans-999' });
    });

    it('should handle errors and log them', async () => {
      const error = new Error('Database error');
      dynamoDb.get.mockRejectedValue(error);

      await expect(repository.findById('trans-001')).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith(
        'Error finding transaction by id: trans-001',
        error.stack,
        'DynamoDbTransactionRepository',
      );
    });
  });

  describe('findByIdempotencyKey', () => {
    it('should return a transaction when found by idempotency key', async () => {
      const mockTransactionData = {
        id: 'trans-001',
        productId: 'prod-001',
        amount: 100000,
        commission: 3000,
        shippingCost: 15000,
        totalAmount: 118000,
        status: TransactionStatus.PENDING,
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        deliveryAddress: 'Test Address',
        deliveryCity: 'Bogotá',
        deliveryPhone: '+57 300 123 4567',
        idempotencyKey: 'key-001',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      dynamoDb.query.mockResolvedValue([mockTransactionData]);

      const result = await repository.findByIdempotencyKey('key-001');

      expect(result).toBeInstanceOf(Transaction);
      expect(result?.idempotencyKey).toBe('key-001');
      expect(dynamoDb.query).toHaveBeenCalledWith(
        'transactions',
        'idempotencyKey = :idempotencyKey',
        { ':idempotencyKey': 'key-001' },
        'idempotencyKey-index',
      );
    });

    it('should return null when transaction not found by idempotency key', async () => {
      dynamoDb.query.mockResolvedValue([]);

      const result = await repository.findByIdempotencyKey('key-999');

      expect(result).toBeNull();
    });

    it('should handle errors and log them', async () => {
      const error = new Error('Database error');
      dynamoDb.query.mockRejectedValue(error);

      await expect(
        repository.findByIdempotencyKey('key-001'),
      ).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith(
        'Error finding transaction by idempotency key: key-001',
        error.stack,
        'DynamoDbTransactionRepository',
      );
    });
  });

  describe('save', () => {
    it('should save a transaction', async () => {
      const transaction = new Transaction(
        'trans-001',
        'prod-001',
        100000,
        3000,
        15000,
        118000,
        TransactionStatus.PENDING,
        'test@example.com',
        'Test User',
        'Test Address',
        'Bogotá',
        '+57 300 123 4567',
        'key-001',
        new Date(),
        new Date(),
      );

      dynamoDb.put.mockResolvedValue(undefined);

      await repository.save(transaction);

      expect(dynamoDb.put).toHaveBeenCalledWith(
        'transactions',
        transaction.toPersistence(),
      );
    });

    it('should handle errors and log them', async () => {
      const transaction = new Transaction(
        'trans-001',
        'prod-001',
        100000,
        3000,
        15000,
        118000,
        TransactionStatus.PENDING,
        'test@example.com',
        'Test User',
        'Test Address',
        'Bogotá',
        '+57 300 123 4567',
        'key-001',
        new Date(),
        new Date(),
      );

      const error = new Error('Database error');
      dynamoDb.put.mockRejectedValue(error);

      await expect(repository.save(transaction)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith(
        'Error saving transaction: trans-001',
        error.stack,
        'DynamoDbTransactionRepository',
      );
    });
  });

  describe('update', () => {
    it('should update a transaction', async () => {
      const transaction = new Transaction(
        'trans-001',
        'prod-001',
        100000,
        3000,
        15000,
        118000,
        TransactionStatus.APPROVED,
        'test@example.com',
        'Test User',
        'Test Address',
        'Bogotá',
        '+57 300 123 4567',
        'key-001',
        new Date(),
        new Date(),
      );

      dynamoDb.put.mockResolvedValue(undefined);

      await repository.update(transaction);

      expect(dynamoDb.put).toHaveBeenCalledWith(
        'transactions',
        transaction.toPersistence(),
      );
    });

    it('should handle errors and log them', async () => {
      const transaction = new Transaction(
        'trans-001',
        'prod-001',
        100000,
        3000,
        15000,
        118000,
        TransactionStatus.PENDING,
        'test@example.com',
        'Test User',
        'Test Address',
        'Bogotá',
        '+57 300 123 4567',
        'key-001',
        new Date(),
        new Date(),
      );

      const error = new Error('Database error');
      dynamoDb.put.mockRejectedValue(error);

      await expect(repository.update(transaction)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith(
        'Error updating transaction: trans-001',
        error.stack,
        'DynamoDbTransactionRepository',
      );
    });
  });
});
