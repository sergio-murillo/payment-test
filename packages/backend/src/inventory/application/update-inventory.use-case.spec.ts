import { Test, TestingModule } from '@nestjs/testing';
import { UpdateInventoryUseCase } from './update-inventory.use-case';
import { InventoryRepository } from '../domain/inventory.repository';
import { EventStoreService } from '../../event-store/application/event-store.service';
import { LoggerService } from '../../shared/logger/logger.service';
import { Inventory } from '../domain/inventory.entity';
import { INVENTORY_REPOSITORY_TOKEN } from '../inventory.tokens';

describe('UpdateInventoryUseCase', () => {
  let useCase: UpdateInventoryUseCase;
  let repository: jest.Mocked<InventoryRepository>;
  let eventStore: jest.Mocked<EventStoreService>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const mockRepository = {
      decrement: jest.fn(),
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
        UpdateInventoryUseCase,
        {
          provide: INVENTORY_REPOSITORY_TOKEN,
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

    useCase = module.get<UpdateInventoryUseCase>(UpdateInventoryUseCase);
    repository = module.get(INVENTORY_REPOSITORY_TOKEN);
    eventStore = module.get(EventStoreService);
    logger = module.get(LoggerService);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should update inventory successfully', async () => {
    const updatedInventory = new Inventory('prod-001', 5, 0, new Date());

    repository.decrement.mockResolvedValue(updatedInventory);
    eventStore.storeEvent.mockResolvedValue(undefined);

    const result = await useCase.execute('prod-001', 1);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(updatedInventory);
    expect(repository.decrement).toHaveBeenCalledWith('prod-001', 1);
    expect(eventStore.storeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateId: 'prod-001',
        eventType: 'InventoryUpdated',
        eventData: expect.objectContaining({
          productId: 'prod-001',
          quantity: 1,
          newQuantity: 5,
        }),
      }),
    );
    expect(logger.debug).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    repository.decrement.mockRejectedValue(new Error('Insufficient inventory'));

    const result = await useCase.execute('prod-001', 1);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Insufficient inventory');
    expect(logger.error).toHaveBeenCalled();
  });

  it('should handle non-Error exceptions', async () => {
    repository.decrement.mockRejectedValue('String error');

    const result = await useCase.execute('prod-001', 1);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to update inventory');
  });
});
