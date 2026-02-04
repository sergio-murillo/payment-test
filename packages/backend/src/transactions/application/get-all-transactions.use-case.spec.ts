import { Test, TestingModule } from '@nestjs/testing';
import { GetAllTransactionsUseCase } from './get-all-transactions.use-case';
import { TransactionRepository } from '../domain/transaction.repository';
import { DynamoDbService } from '../../shared/database/dynamodb.service';
import { LoggerService } from '../../shared/logger/logger.service';
import { Transaction } from '../domain/transaction.entity';
import { TransactionStatus } from '../domain/transaction-status.enum';
import { TRANSACTION_REPOSITORY_TOKEN } from '../transactions.tokens';

describe('GetAllTransactionsUseCase', () => {
  let useCase: GetAllTransactionsUseCase;
  let dynamoDb: jest.Mocked<DynamoDbService>;
  let logger: jest.Mocked<LoggerService>;
  let transactionRepository: jest.Mocked<TransactionRepository>;

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

    const mockTransactionRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findByIdempotencyKey: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllTransactionsUseCase,
        {
          provide: TRANSACTION_REPOSITORY_TOKEN,
          useValue: mockTransactionRepository,
        },
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

    useCase = module.get<GetAllTransactionsUseCase>(GetAllTransactionsUseCase);
    dynamoDb = module.get(DynamoDbService);
    logger = module.get(LoggerService);
    transactionRepository = module.get(TRANSACTION_REPOSITORY_TOKEN);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should return all transactions sorted by createdAt descending', async () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 1000);
    const later = new Date(now.getTime() + 1000);

    const mockTransactions = [
      {
        id: 'trans-001',
        productId: 'prod-001',
        amount: 100000,
        commission: 3000,
        shippingCost: 15000,
        totalAmount: 118000,
        status: TransactionStatus.PENDING,
        customerEmail: 'test1@example.com',
        customerName: 'Test User 1',
        deliveryAddress: 'Address 1',
        deliveryCity: 'Bogotá',
        deliveryPhone: '+57 300 123 4567',
        idempotencyKey: 'key-001',
        createdAt: earlier.toISOString(),
        updatedAt: earlier.toISOString(),
      },
      {
        id: 'trans-002',
        productId: 'prod-002',
        amount: 200000,
        commission: 6000,
        shippingCost: 15000,
        totalAmount: 221000,
        status: TransactionStatus.APPROVED,
        customerEmail: 'test2@example.com',
        customerName: 'Test User 2',
        deliveryAddress: 'Address 2',
        deliveryCity: 'Medellín',
        deliveryPhone: '+57 300 123 4568',
        idempotencyKey: 'key-002',
        createdAt: later.toISOString(),
        updatedAt: later.toISOString(),
      },
      {
        id: 'trans-003',
        productId: 'prod-003',
        amount: 150000,
        commission: 4500,
        shippingCost: 15000,
        totalAmount: 169500,
        status: TransactionStatus.DECLINED,
        customerEmail: 'test3@example.com',
        customerName: 'Test User 3',
        deliveryAddress: 'Address 3',
        deliveryCity: 'Cali',
        deliveryPhone: '+57 300 123 4569',
        idempotencyKey: 'key-003',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ];

    dynamoDb.scan.mockResolvedValue(mockTransactions);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.length).toBe(3);
    // Should be sorted by createdAt descending (most recent first)
    expect(result.data?.[0].id).toBe('trans-002'); // Latest
    expect(result.data?.[1].id).toBe('trans-003'); // Middle
    expect(result.data?.[2].id).toBe('trans-001'); // Oldest
    expect(dynamoDb.scan).toHaveBeenCalledWith('transactions');
    expect(logger.debug).toHaveBeenCalledWith(
      'Getting all transactions',
      'GetAllTransactionsUseCase',
    );
    expect(logger.debug).toHaveBeenCalledWith(
      'Retrieved 3 transactions',
      'GetAllTransactionsUseCase',
    );
  });

  it('should return empty array when no transactions found', async () => {
    dynamoDb.scan.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
    expect(logger.debug).toHaveBeenCalledWith(
      'Retrieved 0 transactions',
      'GetAllTransactionsUseCase',
    );
  });

  it('should handle transactions with optional fields', async () => {
    const now = new Date();
    const mockTransactions = [
      {
        id: 'trans-001',
        productId: 'prod-001',
        amount: 100000,
        commission: 3000,
        shippingCost: 15000,
        totalAmount: 118000,
        status: TransactionStatus.APPROVED,
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        deliveryAddress: 'Address',
        deliveryCity: 'Bogotá',
        deliveryPhone: '+57 300 123 4567',
        idempotencyKey: 'key-001',
        wompiTransactionId: 'wompi-123',
        errorMessage: undefined,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ];

    dynamoDb.scan.mockResolvedValue(mockTransactions);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    expect(result.data?.[0].wompiTransactionId).toBe('wompi-123');
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Database error');
    dynamoDb.scan.mockRejectedValue(error);

    const result = await useCase.execute();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to get all transactions');
    expect(logger.error).toHaveBeenCalledWith(
      'Error getting all transactions',
      error.stack,
      'GetAllTransactionsUseCase',
    );
  });

  it('should handle non-Error exceptions', async () => {
    dynamoDb.scan.mockRejectedValue('String error');

    const result = await useCase.execute();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to get all transactions');
    expect(logger.error).toHaveBeenCalledWith(
      'Error getting all transactions',
      'String error',
      'GetAllTransactionsUseCase',
    );
  });

  it('should map transactions correctly using fromPersistence', async () => {
    const now = new Date();
    const mockTransactions = [
      {
        id: 'trans-001',
        productId: 'prod-001',
        amount: 100000,
        commission: 3000,
        shippingCost: 15000,
        totalAmount: 118000,
        status: TransactionStatus.PENDING,
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        deliveryAddress: 'Address',
        deliveryCity: 'Bogotá',
        deliveryPhone: '+57 300 123 4567',
        idempotencyKey: 'key-001',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ];

    dynamoDb.scan.mockResolvedValue(mockTransactions);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    expect(result.data?.[0]).toBeInstanceOf(Transaction);
    expect(result.data?.[0].id).toBe('trans-001');
    expect(result.data?.[0].productId).toBe('prod-001');
    expect(result.data?.[0].status).toBe(TransactionStatus.PENDING);
  });

  it('should sort transactions correctly when dates are equal', async () => {
    const now = new Date();
    const mockTransactions = [
      {
        id: 'trans-001',
        productId: 'prod-001',
        amount: 100000,
        commission: 3000,
        shippingCost: 15000,
        totalAmount: 118000,
        status: TransactionStatus.PENDING,
        customerEmail: 'test1@example.com',
        customerName: 'Test User 1',
        deliveryAddress: 'Address 1',
        deliveryCity: 'Bogotá',
        deliveryPhone: '+57 300 123 4567',
        idempotencyKey: 'key-001',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'trans-002',
        productId: 'prod-002',
        amount: 200000,
        commission: 6000,
        shippingCost: 15000,
        totalAmount: 221000,
        status: TransactionStatus.APPROVED,
        customerEmail: 'test2@example.com',
        customerName: 'Test User 2',
        deliveryAddress: 'Address 2',
        deliveryCity: 'Medellín',
        deliveryPhone: '+57 300 123 4568',
        idempotencyKey: 'key-002',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ];

    dynamoDb.scan.mockResolvedValue(mockTransactions);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    expect(result.data?.length).toBe(2);
    // When dates are equal, order is preserved (stable sort)
  });
});
