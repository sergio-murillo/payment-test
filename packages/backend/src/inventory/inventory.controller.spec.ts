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

      await expect(controller.getAllInventory()).rejects.toThrow(
        HttpException,
      );
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
  });
});
