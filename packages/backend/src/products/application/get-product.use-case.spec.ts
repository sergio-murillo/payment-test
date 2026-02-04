import { Test, TestingModule } from '@nestjs/testing';
import { GetProductUseCase } from './get-product.use-case';
import { ProductRepository } from '../domain/product.repository';
import { LoggerService } from '../../shared/logger/logger.service';
import { Product } from '../domain/product.entity';
import { PRODUCT_REPOSITORY_TOKEN } from '../products.tokens';

describe('GetProductUseCase', () => {
  let useCase: GetProductUseCase;
  let repository: jest.Mocked<ProductRepository>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const mockRepository = {
      findById: jest.fn(),
    };

    const mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetProductUseCase,
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

    useCase = module.get<GetProductUseCase>(GetProductUseCase);
    repository = module.get(PRODUCT_REPOSITORY_TOKEN);
    logger = module.get(LoggerService);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should return product when found', async () => {
    const product = new Product(
      'prod-001',
      'Test Product',
      'Test Description',
      100000,
      'https://example.com/image.jpg',
      'Electrónica',
      { marca: 'Test Brand' },
      4.5,
      new Date(),
      new Date(),
    );

    repository.findById.mockResolvedValue(product);

    const result = await useCase.execute('prod-001');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(product);
    expect(repository.findById).toHaveBeenCalledWith('prod-001');
  });

  it('should return error when product not found', async () => {
    repository.findById.mockResolvedValue(null);

    const result = await useCase.execute('prod-999');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Product not found');
  });

  it('should handle errors gracefully', async () => {
    repository.findById.mockRejectedValue(new Error('Database error'));

    const result = await useCase.execute('prod-001');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to get product');
    expect(logger.error).toHaveBeenCalled();
  });
});
