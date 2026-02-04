import { Test, TestingModule } from '@nestjs/testing';
import { GetTransactionUseCase } from './get-transaction.use-case';
import { TransactionRepository } from '../domain/transaction.repository';
import { LoggerService } from '../../shared/logger/logger.service';
import { Transaction } from '../domain/transaction.entity';
import { TransactionStatus } from '../domain/transaction-status.enum';
import { TRANSACTION_REPOSITORY_TOKEN } from '../transactions.tokens';

describe('GetTransactionUseCase', () => {
  let useCase: GetTransactionUseCase;
  let repository: jest.Mocked<TransactionRepository>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const mockRepository = {
      findById: jest.fn(),
    };

    const mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTransactionUseCase,
        {
          provide: TRANSACTION_REPOSITORY_TOKEN,
          useValue: mockRepository,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    useCase = module.get<GetTransactionUseCase>(GetTransactionUseCase);
    repository = module.get(TRANSACTION_REPOSITORY_TOKEN);
    logger = module.get(LoggerService);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should return transaction when found', async () => {
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
      'idempotency-key-123',
      new Date(),
      new Date(),
    );

    repository.findById.mockResolvedValue(transaction);

    const result = await useCase.execute('trans-001');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(transaction);
    expect(repository.findById).toHaveBeenCalledWith('trans-001');
    expect(logger.debug).toHaveBeenCalledWith(
      'Getting transaction: trans-001',
      'GetTransactionUseCase',
    );
  });

  it('should return error when transaction not found', async () => {
    repository.findById.mockResolvedValue(null);

    const result = await useCase.execute('trans-999');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Transaction not found');
  });

  it('should handle errors gracefully', async () => {
    repository.findById.mockRejectedValue(new Error('Database error'));

    const result = await useCase.execute('trans-001');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to get transaction');
    expect(logger.error).toHaveBeenCalled();
  });
});
