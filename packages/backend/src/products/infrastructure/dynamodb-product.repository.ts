import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../domain/product.repository';
import { Product } from '../domain/product.entity';
import { DynamoDbService } from '../../shared/database/dynamodb.service';
import { LoggerService } from '../../shared/logger/logger.service';

@Injectable()
export class DynamoDbProductRepository implements ProductRepository {
  constructor(
    private readonly dynamoDb: DynamoDbService,
    private readonly logger: LoggerService,
  ) {}

  async findById(id: string): Promise<Product | null> {
    try {
      const data = await this.dynamoDb.get('products', { id });
      return data ? Product.fromPersistence(data) : null;
    } catch (error) {
      this.logger.error(
        `Error finding product by id: ${id}`,
        error instanceof Error ? error.stack : String(error),
        'DynamoDbProductRepository',
      );
      throw error;
    }
  }

  async findAll(): Promise<Product[]> {
    try {
      const data = await this.dynamoDb.scan('products');
      return data.map((item) => Product.fromPersistence(item));
    } catch (error) {
      this.logger.error(
        'Error finding all products',
        error instanceof Error ? error.stack : String(error),
        'DynamoDbProductRepository',
      );
      throw error;
    }
  }
}
