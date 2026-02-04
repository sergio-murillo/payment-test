import { Test, TestingModule } from '@nestjs/testing';
import { CreateTransactionUseCase } from './create-transaction.use-case';
import { TransactionRepository } from '../domain/transaction.repository';
import { EventStoreService } from '../../event-store/application/event-store.service';
import { LoggerService } from '../../shared/logger/logger.service';
import { Transaction } from '../domain/transaction.entity';
import { TransactionStatus } from '../domain/transaction-status.enum';
import { TRANSACTION_REPOSITORY_TOKEN } from '../transactions.tokens';

describe('CreateTransactionUseCase', () => {
  let useCase: CreateTransactionUseCase;
  let repository: jest.Mocked<TransactionRepository>;
  let eventStore: jest.Mocked<EventStoreService>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const mockRepository = {
      findByIdempotencyKey: jest.fn(),
      save: jest.fn(),
    };

    const mockEventStore = {
      storeEvent: jest.fn(),
    };

    const mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTransactionUseCase,
        {
          provide: TRANSACTION_REPOSITORY_TOKEN,
          useValue: mockRepository,
        },
        {
          provide: EventStoreService,
          useValue: mockEventStore,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    useCase = module.get<CreateTransactionUseCase>(CreateTransactionUseCase);
    repository = module.get(TRANSACTION_REPOSITORY_TOKEN);
    eventStore = module.get(EventStoreService);
    logger = module.get(LoggerService);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should create a new transaction', async () => {
    const dto = {
      productId: 'prod-001',
      amount: 100000,
      commission: 3000,
      shippingCost: 15000,
      customerEmail: 'test@example.com',
      customerName: 'Test User',
      deliveryAddress: 'Test Address',
      deliveryCity: 'Bogotá',
      deliveryPhone: '+57 300 123 4567',
      idempotencyKey: 'unique-key-123',
    };

    repository.findByIdempotencyKey.mockResolvedValue(null);
    repository.save.mockResolvedValue(undefined);
    eventStore.storeEvent.mockResolvedValue(undefined);

    const result = await useCase.execute(dto);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.status).toBe(TransactionStatus.PENDING);
    expect(repository.save).toHaveBeenCalled();
    expect(eventStore.storeEvent).toHaveBeenCalled();
  });

  it('should return existing transaction if idempotency key exists', async () => {
    const dto = {
      productId: 'prod-001',
      amount: 100000,
      commission: 3000,
      shippingCost: 15000,
      customerEmail: 'test@example.com',
      customerName: 'Test User',
      deliveryAddress: 'Test Address',
      deliveryCity: 'Bogotá',
      deliveryPhone: '+57 300 123 4567',
      idempotencyKey: 'existing-key',
    };

    const existingTransaction = new Transaction(
      'trans-001',
      dto.productId,
      dto.amount,
      dto.commission,
      dto.shippingCost,
      dto.amount + dto.commission + dto.shippingCost,
      TransactionStatus.PENDING,
      dto.customerEmail,
      dto.customerName,
      dto.deliveryAddress,
      dto.deliveryCity,
      dto.deliveryPhone,
      dto.idempotencyKey,
      new Date(),
      new Date(),
    );

    repository.findByIdempotencyKey.mockResolvedValue(existingTransaction);

    const result = await useCase.execute(dto);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(existingTransaction);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
