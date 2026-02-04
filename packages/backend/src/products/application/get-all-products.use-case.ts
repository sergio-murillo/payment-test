import { Injectable, Inject } from '@nestjs/common';
import { ProductRepository } from '../domain/product.repository';
import { Product } from '../domain/product.entity';
import { LoggerService } from '../../shared/logger/logger.service';
import { PRODUCT_REPOSITORY_TOKEN } from '../products.tokens';

export type Result<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

@Injectable()
export class GetAllProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY_TOKEN)
    private readonly productRepository: ProductRepository,
    private readonly logger: LoggerService,
  ) {}

  async execute(): Promise<Result<Product[]>> {
    try {
      this.logger.debug('Getting all products', 'GetAllProductsUseCase');

      const products = await this.productRepository.findAll();

      return {
        success: true,
        data: products,
      };
    } catch (error) {
      this.logger.error(
        'Error getting all products',
        error instanceof Error ? error.stack : String(error),
        'GetAllProductsUseCase',
      );

      return {
        success: false,
        error: 'Failed to get products',
      };
    }
  }
}
