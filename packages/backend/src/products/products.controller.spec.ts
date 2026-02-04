import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { GetProductUseCase } from './application/get-product.use-case';
import { GetAllProductsUseCase } from './application/get-all-products.use-case';
import { Product } from './domain/product.entity';
import { HttpException } from '@nestjs/common';
import { InventoryRepository } from '../inventory/domain/inventory.repository';
import { INVENTORY_REPOSITORY_TOKEN } from '../inventory/inventory.tokens';
import { Inventory } from '../inventory/domain/inventory.entity';

describe('ProductsController', () => {
  let controller: ProductsController;
  let getProductUseCase: jest.Mocked<GetProductUseCase>;
  let getAllProductsUseCase: jest.Mocked<GetAllProductsUseCase>;
  let inventoryRepository: jest.Mocked<InventoryRepository>;

  beforeEach(async () => {
    const mockGetProductUseCase = {
      execute: jest.fn(),
    };

    const mockGetAllProductsUseCase = {
      execute: jest.fn(),
    };

    const mockInventoryRepository = {
      findByProductId: jest.fn(),
      update: jest.fn(),
      reserve: jest.fn(),
      release: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: GetProductUseCase,
          useValue: mockGetProductUseCase,
        },
        {
          provide: GetAllProductsUseCase,
          useValue: mockGetAllProductsUseCase,
        },
        {
          provide: INVENTORY_REPOSITORY_TOKEN,
          useValue: mockInventoryRepository,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    getProductUseCase = module.get(GetProductUseCase);
    getAllProductsUseCase = module.get(GetAllProductsUseCase);
    inventoryRepository = module.get(INVENTORY_REPOSITORY_TOKEN);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllProducts', () => {
    it('should return all products', async () => {
      const createdAt = new Date('2024-01-01T00:00:00.000Z');
      const updatedAt = new Date('2024-01-01T00:00:00.000Z');
      const products = [
        new Product(
          'prod-001',
          'Product 1',
          'Description 1',
          100000,
          'https://example.com/image1.jpg',
          'Electrónica',
          { marca: 'Test' },
          4.5,
          createdAt,
          updatedAt,
        ),
      ];

      const inventory = new Inventory('prod-001', 100, 10, new Date());
      inventoryRepository.findByProductId.mockResolvedValue(inventory);

      getAllProductsUseCase.execute.mockResolvedValue({
        success: true,
        data: products,
      });

      const result = await controller.getAllProducts();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]).toEqual({
        id: 'prod-001',
        name: 'Product 1',
        description: 'Description 1',
        price: 100000,
        imageUrl: 'https://example.com/image1.jpg',
        categoria: 'Electrónica',
        metadata: { marca: 'Test' },
        rating: 4.5,
        stock: 90, // 100 - 10 (available quantity)
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      });
      expect(inventoryRepository.findByProductId).toHaveBeenCalledWith('prod-001');
    });

    it('should throw HttpException when use case fails', async () => {
      getAllProductsUseCase.execute.mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      await expect(controller.getAllProducts()).rejects.toThrow(HttpException);
    });

    it('should return products with stock 0 when inventory not found', async () => {
      const createdAt = new Date('2024-01-01T00:00:00.000Z');
      const updatedAt = new Date('2024-01-01T00:00:00.000Z');
      const products = [
        new Product(
          'prod-001',
          'Product 1',
          'Description 1',
          100000,
          'https://example.com/image1.jpg',
          'Electrónica',
          { marca: 'Test' },
          4.5,
          createdAt,
          updatedAt,
        ),
      ];

      inventoryRepository.findByProductId.mockResolvedValue(null);

      getAllProductsUseCase.execute.mockResolvedValue({
        success: true,
        data: products,
      });

      const result = await controller.getAllProducts();

      expect(result.success).toBe(true);
      expect(result.data?.[0].stock).toBe(0);
    });

    it('should handle inventory lookup error gracefully in getAllProducts', async () => {
      const createdAt = new Date('2024-01-01T00:00:00.000Z');
      const updatedAt = new Date('2024-01-01T00:00:00.000Z');
      const products = [
        new Product(
          'prod-001',
          'Product 1',
          'Description 1',
          100000,
          'https://example.com/image1.jpg',
          'Electrónica',
          { marca: 'Test' },
          4.5,
          createdAt,
          updatedAt,
        ),
      ];

      inventoryRepository.findByProductId.mockRejectedValue(
        new Error('Inventory lookup failed'),
      );

      getAllProductsUseCase.execute.mockResolvedValue({
        success: true,
        data: products,
      });

      const result = await controller.getAllProducts();

      expect(result.success).toBe(true);
      expect(result.data?.[0].stock).toBe(0); // Defaults to 0 on error
    });
  });

  describe('getProduct', () => {
    it('should return product by id', async () => {
      const createdAt = new Date('2024-01-01T00:00:00.000Z');
      const updatedAt = new Date('2024-01-01T00:00:00.000Z');
      const product = new Product(
        'prod-001',
        'Product 1',
        'Description 1',
        100000,
        'https://example.com/image1.jpg',
        'Electrónica',
        { marca: 'Test Brand' },
        4.5,
        createdAt,
        updatedAt,
      );

      const inventory = new Inventory('prod-001', 50, 5, new Date());
      inventoryRepository.findByProductId.mockResolvedValue(inventory);

      getProductUseCase.execute.mockResolvedValue({
        success: true,
        data: product,
      });

      const result = await controller.getProduct('prod-001');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 'prod-001',
        name: 'Product 1',
        description: 'Description 1',
        price: 100000,
        imageUrl: 'https://example.com/image1.jpg',
        categoria: 'Electrónica',
        metadata: { marca: 'Test Brand' },
        rating: 4.5,
        stock: 45, // 50 - 5 (available quantity)
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      });
      expect(getProductUseCase.execute).toHaveBeenCalledWith('prod-001');
      expect(inventoryRepository.findByProductId).toHaveBeenCalledWith('prod-001');
    });

    it('should throw 404 when product not found', async () => {
      getProductUseCase.execute.mockResolvedValue({
        success: false,
        error: 'Product not found',
      });

      await expect(controller.getProduct('prod-999')).rejects.toThrow(
        HttpException,
      );
    });

    it('should throw 500 when internal error occurs', async () => {
      getProductUseCase.execute.mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      await expect(controller.getProduct('prod-001')).rejects.toThrow(
        HttpException,
      );
    });

    it('should return product with stock 0 when inventory not found', async () => {
      const createdAt = new Date('2024-01-01T00:00:00.000Z');
      const updatedAt = new Date('2024-01-01T00:00:00.000Z');
      const product = new Product(
        'prod-001',
        'Product 1',
        'Description 1',
        100000,
        'https://example.com/image1.jpg',
        'Electrónica',
        { marca: 'Test Brand' },
        4.5,
        createdAt,
        updatedAt,
      );

      inventoryRepository.findByProductId.mockResolvedValue(null);

      getProductUseCase.execute.mockResolvedValue({
        success: true,
        data: product,
      });

      const result = await controller.getProduct('prod-001');

      expect(result.success).toBe(true);
      expect(result.data?.stock).toBe(0);
    });

    it('should handle inventory lookup error gracefully', async () => {
      const createdAt = new Date('2024-01-01T00:00:00.000Z');
      const updatedAt = new Date('2024-01-01T00:00:00.000Z');
      const product = new Product(
        'prod-001',
        'Product 1',
        'Description 1',
        100000,
        'https://example.com/image1.jpg',
        'Electrónica',
        { marca: 'Test Brand' },
        4.5,
        createdAt,
        updatedAt,
      );

      inventoryRepository.findByProductId.mockRejectedValue(
        new Error('Inventory lookup failed'),
      );

      getProductUseCase.execute.mockResolvedValue({
        success: true,
        data: product,
      });

      const result = await controller.getProduct('prod-001');

      expect(result.success).toBe(true);
      expect(result.data?.stock).toBe(0); // Defaults to 0 on error
    });
  });
});
