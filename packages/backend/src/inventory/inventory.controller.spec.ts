import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { GetAllInventoryUseCase } from './application/get-all-inventory.use-case';
import { Inventory } from './domain/inventory.entity';
import { HttpException } from '@nestjs/common';

describe('InventoryController', () => {
  let controller: InventoryController;
  let getAllInventoryUseCase: jest.Mocked<GetAllInventoryUseCase>;

  beforeEach(async () => {
    const mockGetAllInventoryUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: GetAllInventoryUseCase,
          useValue: mockGetAllInventoryUseCase,
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
    getAllInventoryUseCase = module.get(GetAllInventoryUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllInventory', () => {
    it('should return all inventory items', async () => {
      const now = new Date();
      const inventoryItems = [
        new Inventory('prod-001', 100, 10, now),
        new Inventory('prod-002', 50, 5, now),
        new Inventory('prod-003', 200, 0, now),
      ];

      getAllInventoryUseCase.execute.mockResolvedValue({
        success: true,
        data: inventoryItems,
      });

      const result = await controller.getAllInventory();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(inventoryItems);
      expect(getAllInventoryUseCase.execute).toHaveBeenCalled();
    });

    it('should throw HttpException when use case fails', async () => {
      getAllInventoryUseCase.execute.mockResolvedValue({
        success: false,
        error: 'Failed to get all inventory',
      });

      await expect(controller.getAllInventory()).rejects.toThrow(HttpException);
    });

    it('should return empty array when no inventory found', async () => {
      getAllInventoryUseCase.execute.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await controller.getAllInventory();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle internal server error', async () => {
      getAllInventoryUseCase.execute.mockResolvedValue({
        success: false,
        error: 'Database connection error',
      });

      await expect(controller.getAllInventory()).rejects.toThrow(HttpException);
    });

    it('should use default error message when error is undefined', async () => {
      getAllInventoryUseCase.execute.mockResolvedValue({
        success: false,
        error: undefined,
      });

      let caughtError: any;
      try {
        await controller.getAllInventory();
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeDefined();
      expect(caughtError).toBeInstanceOf(HttpException);
      expect(caughtError.getResponse()).toBe('Failed to get all inventory');
      expect(caughtError.getStatus()).toBe(500);
    });

    it('should verify result structure when successful', async () => {
      const now = new Date();
      const inventoryItems = [
        new Inventory('prod-001', 100, 10, now),
        new Inventory('prod-002', 50, 5, now),
      ];

      getAllInventoryUseCase.execute.mockResolvedValue({
        success: true,
        data: inventoryItems,
      });

      const result = await controller.getAllInventory();

      expect(result).toEqual({
        success: true,
        data: inventoryItems,
      });
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should handle single inventory item', async () => {
      const now = new Date();
      const inventoryItem = new Inventory('prod-001', 100, 10, now);

      getAllInventoryUseCase.execute.mockResolvedValue({
        success: true,
        data: [inventoryItem],
      });

      const result = await controller.getAllInventory();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].productId).toBe('prod-001');
      expect(result.data![0].quantity).toBe(100);
      expect(result.data![0].reservedQuantity).toBe(10);
    });
  });
});
