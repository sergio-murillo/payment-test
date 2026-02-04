import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { GetProductUseCase } from './application/get-product.use-case';
import { GetAllProductsUseCase } from './application/get-all-products.use-case';
import { Product } from './domain/product.entity';
import { HttpException } from '@nestjs/common';

describe('ProductsController', () => {
  let controller: ProductsController;
  let getProductUseCase: jest.Mocked<GetProductUseCase>;
  let getAllProductsUseCase: jest.Mocked<GetAllProductsUseCase>;

  beforeEach(async () => {
    const mockGetProductUseCase = {
      execute: jest.fn(),
    };

    const mockGetAllProductsUseCase = {
      execute: jest.fn(),
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
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    getProductUseCase = module.get(GetProductUseCase);
    getAllProductsUseCase = module.get(GetAllProductsUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllProducts', () => {
    it('should return all products', async () => {
      const products = [
        new Product(
          'prod-001',
          'Product 1',
          'Description 1',
          100000,
          'https://example.com/image1.jpg',
          new Date(),
          new Date(),
        ),
      ];

      getAllProductsUseCase.execute.mockResolvedValue({
        success: true,
        data: products,
      });

      const result = await controller.getAllProducts();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(products);
    });

    it('should throw HttpException when use case fails', async () => {
      getAllProductsUseCase.execute.mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      await expect(controller.getAllProducts()).rejects.toThrow(HttpException);
    });
  });

  describe('getProduct', () => {
    it('should return product by id', async () => {
      const product = new Product(
        'prod-001',
        'Product 1',
        'Description 1',
        100000,
        'https://example.com/image1.jpg',
        new Date(),
        new Date(),
      );

      getProductUseCase.execute.mockResolvedValue({
        success: true,
        data: product,
      });

      const result = await controller.getProduct('prod-001');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(product);
      expect(getProductUseCase.execute).toHaveBeenCalledWith('prod-001');
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
  });
});
