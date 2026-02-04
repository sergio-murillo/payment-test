import { Test, TestingModule } from '@nestjs/testing';
import { DynamoDbProductRepository } from './dynamodb-product.repository';
import { DynamoDbService } from '../../shared/database/dynamodb.service';
import { LoggerService } from '../../shared/logger/logger.service';
import { Product } from '../domain/product.entity';

describe('DynamoDbProductRepository', () => {
  let repository: DynamoDbProductRepository;
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
        DynamoDbProductRepository,
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

    repository = module.get<DynamoDbProductRepository>(
      DynamoDbProductRepository,
    );
    dynamoDb = module.get(DynamoDbService);
    logger = module.get(LoggerService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findById', () => {
    it('should return a product when found', async () => {
      const mockProductData = {
        id: 'prod-001',
        name: 'Test Product',
        description: 'Test Description',
        price: 100000,
        imageUrl: 'https://example.com/image.jpg',
        categoria: 'Electrónica',
        metadata: { marca: 'Test' },
        rating: 4.5,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      dynamoDb.get.mockResolvedValue(mockProductData);

      const result = await repository.findById('prod-001');

      expect(result).toBeInstanceOf(Product);
      expect(result?.id).toBe('prod-001');
      expect(result?.name).toBe('Test Product');
      expect(dynamoDb.get).toHaveBeenCalledWith('products', { id: 'prod-001' });
    });

    it('should return null when product not found', async () => {
      dynamoDb.get.mockResolvedValue(null);

      const result = await repository.findById('prod-999');

      expect(result).toBeNull();
      expect(dynamoDb.get).toHaveBeenCalledWith('products', { id: 'prod-999' });
    });

    it('should handle errors and log them', async () => {
      const error = new Error('Database error');
      dynamoDb.get.mockRejectedValue(error);

      await expect(repository.findById('prod-001')).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith(
        'Error finding product by id: prod-001',
        error.stack,
        'DynamoDbProductRepository',
      );
    });
  });

  describe('findAll', () => {
    it('should return all products', async () => {
      const mockProductsData = [
        {
          id: 'prod-001',
          name: 'Product 1',
          description: 'Description 1',
          price: 100000,
          imageUrl: 'https://example.com/image1.jpg',
          categoria: 'Electrónica',
          metadata: { marca: 'Test' },
          rating: 4.5,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'prod-002',
          name: 'Product 2',
          description: 'Description 2',
          price: 200000,
          imageUrl: 'https://example.com/image2.jpg',
          categoria: 'Computadores',
          metadata: { modelo: 'Test Model' },
          rating: 4.8,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      dynamoDb.scan.mockResolvedValue(mockProductsData);

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Product);
      expect(result[0].id).toBe('prod-001');
      expect(result[1].id).toBe('prod-002');
      expect(dynamoDb.scan).toHaveBeenCalledWith('products');
    });

    it('should return empty array when no products found', async () => {
      dynamoDb.scan.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
      expect(dynamoDb.scan).toHaveBeenCalledWith('products');
    });

    it('should handle errors and log them', async () => {
      const error = new Error('Database error');
      dynamoDb.scan.mockRejectedValue(error);

      await expect(repository.findAll()).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith(
        'Error finding all products',
        error.stack,
        'DynamoDbProductRepository',
      );
    });
  });
});
