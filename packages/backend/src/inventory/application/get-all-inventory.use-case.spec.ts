import { Test, TestingModule } from '@nestjs/testing';
import { GetAllInventoryUseCase } from './get-all-inventory.use-case';
import { InventoryRepository } from '../domain/inventory.repository';
import { DynamoDbService } from '../../shared/database/dynamodb.service';
import { LoggerService } from '../../shared/logger/logger.service';
import { Inventory } from '../domain/inventory.entity';
import { INVENTORY_REPOSITORY_TOKEN } from '../inventory.tokens';

describe('GetAllInventoryUseCase', () => {
  let useCase: GetAllInventoryUseCase;
  let dynamoDb: jest.Mocked<DynamoDbService>;
  let logger: jest.Mocked<LoggerService>;
  let inventoryRepository: jest.Mocked<InventoryRepository>;

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

    const mockInventoryRepository = {
      findByProductId: jest.fn(),
      update: jest.fn(),
      reserve: jest.fn(),
      release: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllInventoryUseCase,
        {
          provide: INVENTORY_REPOSITORY_TOKEN,
          useValue: mockInventoryRepository,
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

    useCase = module.get<GetAllInventoryUseCase>(GetAllInventoryUseCase);
    dynamoDb = module.get(DynamoDbService);
    logger = module.get(LoggerService);
    inventoryRepository = module.get(INVENTORY_REPOSITORY_TOKEN);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should return all inventory items', async () => {
    const now = new Date();
    const mockInventory = [
      {
        productId: 'prod-001',
        quantity: 100,
        reservedQuantity: 10,
        updatedAt: now.toISOString(),
      },
      {
        productId: 'prod-002',
        quantity: 50,
        reservedQuantity: 5,
        updatedAt: now.toISOString(),
      },
      {
        productId: 'prod-003',
        quantity: 200,
        reservedQuantity: 0,
        updatedAt: now.toISOString(),
      },
    ];

    dynamoDb.scan.mockResolvedValue(mockInventory);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.length).toBe(3);
    expect(result.data?.[0].productId).toBe('prod-001');
    expect(result.data?.[0].quantity).toBe(100);
    expect(result.data?.[0].reservedQuantity).toBe(10);
    expect(result.data?.[1].productId).toBe('prod-002');
    expect(result.data?.[2].productId).toBe('prod-003');
    expect(dynamoDb.scan).toHaveBeenCalledWith('inventory');
    expect(logger.debug).toHaveBeenCalledWith(
      'Getting all inventory',
      'GetAllInventoryUseCase',
    );
    expect(logger.debug).toHaveBeenCalledWith(
      'Retrieved 3 inventory items',
      'GetAllInventoryUseCase',
    );
  });

  it('should return empty array when no inventory found', async () => {
    dynamoDb.scan.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
    expect(logger.debug).toHaveBeenCalledWith(
      'Retrieved 0 inventory items',
      'GetAllInventoryUseCase',
    );
  });

  it('should handle inventory with undefined reservedQuantity', async () => {
    const now = new Date();
    const mockInventory = [
      {
        productId: 'prod-001',
        quantity: 100,
        updatedAt: now.toISOString(),
      },
    ];

    dynamoDb.scan.mockResolvedValue(mockInventory);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.length).toBe(1);
    expect(result.data?.[0].productId).toBe('prod-001');
    expect(result.data?.[0].reservedQuantity).toBe(0); // fromPersistence defaults to 0
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Database error');
    dynamoDb.scan.mockRejectedValue(error);

    const result = await useCase.execute();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to get all inventory');
    expect(logger.error).toHaveBeenCalledWith(
      'Error getting all inventory',
      error.stack,
      'GetAllInventoryUseCase',
    );
  });

  it('should handle non-Error exceptions', async () => {
    dynamoDb.scan.mockRejectedValue('String error');

    const result = await useCase.execute();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to get all inventory');
    expect(logger.error).toHaveBeenCalledWith(
      'Error getting all inventory',
      'String error',
      'GetAllInventoryUseCase',
    );
  });

  it('should map inventory items correctly using fromPersistence', async () => {
    const now = new Date();
    const mockInventory = [
      {
        productId: 'prod-001',
        quantity: 100,
        reservedQuantity: 20,
        updatedAt: now.toISOString(),
      },
    ];

    dynamoDb.scan.mockResolvedValue(mockInventory);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    expect(result.data?.[0]).toBeInstanceOf(Inventory);
    expect(result.data?.[0].productId).toBe('prod-001');
    expect(result.data?.[0].quantity).toBe(100);
    expect(result.data?.[0].reservedQuantity).toBe(20);
  });
});
