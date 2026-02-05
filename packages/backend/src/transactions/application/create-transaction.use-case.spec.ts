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
    expect(eventStore.storeEvent).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      `Transaction already exists with idempotency key: ${dto.idempotencyKey}`,
      'CreateTransactionUseCase',
    );
  });

  it('should handle error when findByIdempotencyKey fails', async () => {
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

    const error = new Error('Database connection failed');
    repository.findByIdempotencyKey.mockRejectedValue(error);

    const result = await useCase.execute(dto);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to create transaction');
    expect(logger.error).toHaveBeenCalledWith(
      'Error creating transaction',
      error.stack,
      'CreateTransactionUseCase',
    );
    expect(repository.save).not.toHaveBeenCalled();
    expect(eventStore.storeEvent).not.toHaveBeenCalled();
  });

  it('should handle error when save fails', async () => {
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
    const saveError = new Error('Save operation failed');
    repository.save.mockRejectedValue(saveError);

    const result = await useCase.execute(dto);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to create transaction');
    expect(logger.error).toHaveBeenCalledWith(
      'Error creating transaction',
      saveError.stack,
      'CreateTransactionUseCase',
    );
    expect(repository.save).toHaveBeenCalled();
    expect(eventStore.storeEvent).not.toHaveBeenCalled();
  });

  it('should handle error when storeEvent fails', async () => {
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
    const eventStoreError = new Error('Event store failed');
    eventStore.storeEvent.mockRejectedValue(eventStoreError);

    const result = await useCase.execute(dto);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to create transaction');
    expect(logger.error).toHaveBeenCalledWith(
      'Error creating transaction',
      eventStoreError.stack,
      'CreateTransactionUseCase',
    );
    expect(repository.save).toHaveBeenCalled();
    expect(eventStore.storeEvent).toHaveBeenCalled();
  });

  it('should handle non-Error exceptions', async () => {
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

    const nonErrorException = 'String error';
    repository.findByIdempotencyKey.mockRejectedValue(nonErrorException);

    const result = await useCase.execute(dto);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to create transaction');
    expect(logger.error).toHaveBeenCalledWith(
      'Error creating transaction',
      String(nonErrorException),
      'CreateTransactionUseCase',
    );
  });

  it('should verify transaction properties when creating new transaction', async () => {
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
    expect(result.data?.productId).toBe(dto.productId);
    expect(result.data?.amount).toBe(dto.amount);
    expect(result.data?.commission).toBe(dto.commission);
    expect(result.data?.shippingCost).toBe(dto.shippingCost);
    expect(result.data?.totalAmount).toBe(
      dto.amount + dto.commission + dto.shippingCost,
    );
    expect(result.data?.status).toBe(TransactionStatus.PENDING);
    expect(result.data?.customerEmail).toBe(dto.customerEmail);
    expect(result.data?.customerName).toBe(dto.customerName);
    expect(result.data?.deliveryAddress).toBe(dto.deliveryAddress);
    expect(result.data?.deliveryCity).toBe(dto.deliveryCity);
    expect(result.data?.deliveryPhone).toBe(dto.deliveryPhone);
    expect(result.data?.idempotencyKey).toBe(dto.idempotencyKey);
    expect(result.data?.id).toBeDefined();
    expect(typeof result.data?.id).toBe('string');

    // Verify save was called with correct transaction
    expect(repository.save).toHaveBeenCalled();
    const savedTransaction = repository.save.mock.calls[0][0];
    expect(savedTransaction).toBeInstanceOf(Transaction);
    expect(savedTransaction.productId).toBe(dto.productId);

    // Verify event was stored with correct data
    expect(eventStore.storeEvent).toHaveBeenCalled();
    const storedEvent = eventStore.storeEvent.mock.calls[0][0];
    expect(storedEvent.eventType).toBe('TransactionCreated');
    expect(storedEvent.aggregateId).toBe(result.data?.id);
    expect(storedEvent.eventData).toBeDefined();

    // Verify logger was called
    expect(logger.debug).toHaveBeenCalledWith(
      `Creating transaction with idempotency key: ${dto.idempotencyKey}`,
      'CreateTransactionUseCase',
    );
    expect(logger.debug).toHaveBeenCalledWith(
      `Transaction created: ${result.data?.id}`,
      'CreateTransactionUseCase',
    );
  });
});
