import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { GetProductUseCase } from './application/get-product.use-case';
import { GetAllProductsUseCase } from './application/get-all-products.use-case';
import { DynamoDbProductRepository } from './infrastructure/dynamodb-product.repository';
import { SharedModule } from '../shared/shared.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PRODUCT_REPOSITORY_TOKEN } from './products.tokens';

@Module({
  imports: [SharedModule, InventoryModule],
  controllers: [ProductsController],
  providers: [
    GetProductUseCase,
    GetAllProductsUseCase,
    DynamoDbProductRepository,
    {
      provide: PRODUCT_REPOSITORY_TOKEN,
      useClass: DynamoDbProductRepository,
    },
  ],
  exports: [PRODUCT_REPOSITORY_TOKEN],
})
export class ProductsModule {}
