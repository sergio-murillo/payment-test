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
export class GetProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY_TOKEN)
    private readonly productRepository: ProductRepository,
    private readonly logger: LoggerService,
  ) {}

  async execute(productId: string): Promise<Result<Product>> {
    try {
      this.logger.debug(`Getting product: ${productId}`, 'GetProductUseCase');

      const product = await this.productRepository.findById(productId);

      if (!product) {
        return {
          success: false,
          error: 'Product not found',
        };
      }

      return {
        success: true,
        data: product,
      };
    } catch (error) {
      this.logger.error(
        `Error getting product: ${productId}`,
        error instanceof Error ? error.stack : String(error),
        'GetProductUseCase',
      );

      return {
        success: false,
        error: 'Failed to get product',
      };
    }
  }
}
