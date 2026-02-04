import { Test, TestingModule } from '@nestjs/testing';
import { GetAllProductsUseCase } from './get-all-products.use-case';
import { ProductRepository } from '../domain/product.repository';
import { LoggerService } from '../../shared/logger/logger.service';
import { Product } from '../domain/product.entity';
import { PRODUCT_REPOSITORY_TOKEN } from '../products.tokens';

describe('GetAllProductsUseCase', () => {
  let useCase: GetAllProductsUseCase;
  let repository: jest.Mocked<ProductRepository>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const mockRepository = {
      findAll: jest.fn(),
    };

    const mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAllProductsUseCase,
        {
          provide: PRODUCT_REPOSITORY_TOKEN,
          useValue: mockRepository,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    useCase = module.get<GetAllProductsUseCase>(GetAllProductsUseCase);
    repository = module.get(PRODUCT_REPOSITORY_TOKEN);
    logger = module.get(LoggerService);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should return all products', async () => {
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
        new Date(),
        new Date(),
      ),
      new Product(
        'prod-002',
        'Product 2',
        'Description 2',
        200000,
        'https://example.com/image2.jpg',
        'Computadores',
        { modelo: 'Test Model' },
        4.8,
        new Date(),
        new Date(),
      ),
    ];

    repository.findAll.mockResolvedValue(products);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    expect(result.data).toEqual(products);
    expect(repository.findAll).toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      'Getting all products',
      'GetAllProductsUseCase',
    );
  });

  it('should return empty array when no products found', async () => {
    repository.findAll.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('should handle errors gracefully', async () => {
    repository.findAll.mockRejectedValue(new Error('Database error'));

    const result = await useCase.execute();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to get products');
    expect(logger.error).toHaveBeenCalled();
  });
});
