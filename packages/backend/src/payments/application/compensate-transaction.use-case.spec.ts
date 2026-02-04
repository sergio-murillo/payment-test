import { Test, TestingModule } from '@nestjs/testing';
import { CompensateTransactionUseCase } from './compensate-transaction.use-case';
import { TransactionRepository } from '../../transactions/domain/transaction.repository';
import { InventoryRepository } from '../../inventory/domain/inventory.repository';
import { EventStoreService } from '../../event-store/application/event-store.service';
import { SnsService } from '../../shared/messaging/sns.service';
import { LoggerService } from '../../shared/logger/logger.service';
import { Transaction } from '../../transactions/domain/transaction.entity';
import { TransactionStatus } from '../../transactions/domain/transaction-status.enum';
import { Inventory } from '../../inventory/domain/inventory.entity';
import { TRANSACTION_REPOSITORY_TOKEN } from '../../transactions/transactions.tokens';
import { INVENTORY_REPOSITORY_TOKEN } from '../../inventory/inventory.tokens';

describe('CompensateTransactionUseCase', () => {
  let useCase: CompensateTransactionUseCase;
  let transactionRepository: jest.Mocked<TransactionRepository>;
  let inventoryRepository: jest.Mocked<InventoryRepository>;
  let eventStore: jest.Mocked<EventStoreService>;
  let snsService: jest.Mocked<SnsService>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const mockTransactionRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    const mockInventoryRepository = {
      release: jest.fn(),
    };

    const mockEventStore = {
      storeEvent: jest.fn(),
    };

    const mockSnsService = {
      publish: jest.fn(),
    };

    const mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompensateTransactionUseCase,
        {
          provide: TRANSACTION_REPOSITORY_TOKEN,
          useValue: mockTransactionRepository,
        },
        {
          provide: INVENTORY_REPOSITORY_TOKEN,
          useValue: mockInventoryRepository,
        },
        {
          provide: EventStoreService,
          useValue: mockEventStore,
        },
        {
          provide: SnsService,
          useValue: mockSnsService,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    useCase = module.get<CompensateTransactionUseCase>(
      CompensateTransactionUseCase,
    );
    transactionRepository = module.get(TRANSACTION_REPOSITORY_TOKEN);
    inventoryRepository = module.get(INVENTORY_REPOSITORY_TOKEN);
    eventStore = module.get(EventStoreService);
    snsService = module.get(SnsService);
    logger = module.get(LoggerService);

    // Clear all mocks after setup
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should compensate transaction successfully', async () => {
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

    transactionRepository.findById.mockResolvedValue(transaction);
    transactionRepository.update.mockResolvedValue(undefined);
    const releasedInventory = new Inventory('prod-001', 10, 0, new Date());
    inventoryRepository.release.mockResolvedValue(releasedInventory);
    eventStore.storeEvent.mockResolvedValue(undefined);
    snsService.publish.mockResolvedValue(undefined);

    const result = await useCase.execute('trans-001');

    expect(result.success).toBe(true);
    expect(transactionRepository.update).toHaveBeenCalled();
    const updateCall = transactionRepository.update.mock.calls[0][0];
    expect(updateCall.id).toBe('trans-001');
    expect(updateCall.status).toBe(TransactionStatus.CANCELLED);
    expect(inventoryRepository.release).toHaveBeenCalledWith('prod-001', 1);
    expect(eventStore.storeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateId: 'trans-001',
        eventType: 'TransactionCompensated',
      }),
    );
    expect(snsService.publish).toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalled();
  });

  it('should handle inventory release failure gracefully', async () => {
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

    transactionRepository.findById.mockResolvedValue(transaction);
    transactionRepository.update.mockResolvedValue(undefined);
    inventoryRepository.release.mockRejectedValue(new Error('Inventory error'));
    eventStore.storeEvent.mockResolvedValue(undefined);
    snsService.publish.mockResolvedValue(undefined);

    const result = await useCase.execute('trans-001');

    expect(result.success).toBe(true);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('should return error when transaction not found', async () => {
    transactionRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute('trans-999');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Transaction not found');
  });

  it('should handle errors gracefully', async () => {
    transactionRepository.findById.mockRejectedValue(
      new Error('Database error'),
    );

    const result = await useCase.execute('trans-001');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to compensate transaction');
    expect(logger.error).toHaveBeenCalled();
  });
});
