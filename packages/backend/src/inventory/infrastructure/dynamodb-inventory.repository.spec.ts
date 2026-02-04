import { Test, TestingModule } from '@nestjs/testing';
import { DynamoDbInventoryRepository } from './dynamodb-inventory.repository';
import { DynamoDbService } from '../../shared/database/dynamodb.service';
import { LoggerService } from '../../shared/logger/logger.service';
import { Inventory } from '../domain/inventory.entity';

describe('DynamoDbInventoryRepository', () => {
  let repository: DynamoDbInventoryRepository;
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
        DynamoDbInventoryRepository,
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

    repository = module.get<DynamoDbInventoryRepository>(
      DynamoDbInventoryRepository,
    );
    dynamoDb = module.get(DynamoDbService);
    logger = module.get(LoggerService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByProductId', () => {
    it('should return inventory when found', async () => {
      const mockInventoryData = {
        productId: 'prod-001',
        quantity: 100,
        reservedQuantity: 10,
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      dynamoDb.get.mockResolvedValue(mockInventoryData);

      const result = await repository.findByProductId('prod-001');

      expect(result).toBeInstanceOf(Inventory);
      expect(result?.productId).toBe('prod-001');
      expect(result?.quantity).toBe(100);
      expect(result?.reservedQuantity).toBe(10);
      expect(dynamoDb.get).toHaveBeenCalledWith('inventory', {
        productId: 'prod-001',
      });
    });

    it('should return null when inventory not found', async () => {
      dynamoDb.get.mockResolvedValue(null);

      const result = await repository.findByProductId('prod-999');

      expect(result).toBeNull();
    });

    it('should handle errors and log them', async () => {
      const error = new Error('Database error');
      dynamoDb.get.mockRejectedValue(error);

      await expect(
        repository.findByProductId('prod-001'),
      ).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith(
        'Error finding inventory for product: prod-001',
        error.stack,
        'DynamoDbInventoryRepository',
      );
    });
  });

  describe('reserve', () => {
    it('should reserve inventory successfully', async () => {
      const currentInventory = new Inventory('prod-001', 100, 10, new Date());
      const updatedInventory = new Inventory('prod-001', 100, 20, new Date());

      dynamoDb.get
        .mockResolvedValueOnce(currentInventory.toPersistence())
        .mockResolvedValueOnce(updatedInventory.toPersistence());
      dynamoDb.update.mockResolvedValue(undefined);

      const result = await repository.reserve('prod-001', 10);

      expect(result).toBeInstanceOf(Inventory);
      expect(result.reservedQuantity).toBe(20);
      expect(dynamoDb.update).toHaveBeenCalled();
    });

    it('should throw error when inventory not found', async () => {
      dynamoDb.get.mockResolvedValue(null);

      await expect(repository.reserve('prod-999', 10)).rejects.toThrow(
        'Inventory not found for product: prod-999',
      );
    });

    it('should throw error when insufficient inventory', async () => {
      const currentInventory = new Inventory('prod-001', 100, 95, new Date());
      dynamoDb.get.mockResolvedValueOnce(currentInventory.toPersistence());

      await expect(repository.reserve('prod-001', 10)).rejects.toThrow(
        'Insufficient inventory',
      );
    });

    it('should handle errors and log them', async () => {
      const currentInventory = new Inventory('prod-001', 100, 10, new Date());
      dynamoDb.get.mockResolvedValueOnce(currentInventory.toPersistence());

      const error = new Error('Update error');
      dynamoDb.update.mockRejectedValue(error);

      await expect(repository.reserve('prod-001', 10)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('release', () => {
    it('should release inventory successfully', async () => {
      const updatedInventory = new Inventory('prod-001', 100, 5, new Date());

      dynamoDb.get.mockResolvedValue(updatedInventory.toPersistence());
      dynamoDb.update.mockResolvedValue(undefined);

      const result = await repository.release('prod-001', 5);

      expect(result).toBeInstanceOf(Inventory);
      expect(dynamoDb.update).toHaveBeenCalled();
    });

    it('should handle errors and log them', async () => {
      const error = new Error('Update error');
      dynamoDb.update.mockRejectedValue(error);

      await expect(repository.release('prod-001', 5)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('decrement', () => {
    it('should decrement inventory when reservedQuantity exists and is >= quantity', async () => {
      const currentInventory = new Inventory('prod-001', 100, 20, new Date());
      const updatedInventory = new Inventory('prod-001', 90, 10, new Date());

      dynamoDb.get
        .mockResolvedValueOnce(currentInventory.toPersistence())
        .mockResolvedValueOnce(updatedInventory.toPersistence());
      dynamoDb.update.mockResolvedValue(undefined);

      const result = await repository.decrement('prod-001', 10);

      expect(result).toBeInstanceOf(Inventory);
      expect(dynamoDb.update).toHaveBeenCalled();
    });

    it('should decrement only quantity when reservedQuantity is 0', async () => {
      const currentInventory = new Inventory('prod-001', 100, 0, new Date());
      const updatedInventory = new Inventory('prod-001', 90, 0, new Date());

      dynamoDb.get
        .mockResolvedValueOnce(currentInventory.toPersistence())
        .mockResolvedValueOnce(updatedInventory.toPersistence());
      dynamoDb.update.mockResolvedValue(undefined);

      const result = await repository.decrement('prod-001', 10);

      expect(result).toBeInstanceOf(Inventory);
      expect(dynamoDb.update).toHaveBeenCalled();
    });

    it('should throw error when inventory not found', async () => {
      dynamoDb.get.mockResolvedValue(null);

      await expect(repository.decrement('prod-999', 10)).rejects.toThrow(
        'Inventory not found for product: prod-999',
      );
    });

    it('should throw error when insufficient quantity', async () => {
      const currentInventory = new Inventory('prod-001', 5, 0, new Date());
      dynamoDb.get.mockResolvedValueOnce(currentInventory.toPersistence());

      await expect(repository.decrement('prod-001', 10)).rejects.toThrow(
        'Insufficient inventory',
      );
    });

    it('should handle errors and log them', async () => {
      const currentInventory = new Inventory('prod-001', 100, 0, new Date());
      dynamoDb.get.mockResolvedValueOnce(currentInventory.toPersistence());

      const error = new Error('Update error');
      dynamoDb.update.mockRejectedValue(error);

      await expect(repository.decrement('prod-001', 10)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('increment', () => {
    it('should increment inventory successfully', async () => {
      const updatedInventory = new Inventory('prod-001', 110, 10, new Date());

      dynamoDb.get.mockResolvedValue(updatedInventory.toPersistence());
      dynamoDb.update.mockResolvedValue(undefined);

      const result = await repository.increment('prod-001', 10);

      expect(result).toBeInstanceOf(Inventory);
      expect(dynamoDb.update).toHaveBeenCalled();
    });

    it('should handle errors and log them', async () => {
      const error = new Error('Update error');
      dynamoDb.update.mockRejectedValue(error);

      await expect(repository.increment('prod-001', 10)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
