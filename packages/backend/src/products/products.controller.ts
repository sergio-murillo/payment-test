import {
  Controller,
  Get,
  Param,
  HttpStatus,
  HttpException,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  getSchemaPath,
} from '@nestjs/swagger';
import { GetProductUseCase } from './application/get-product.use-case';
import { GetAllProductsUseCase } from './application/get-all-products.use-case';
import { ProductResponseDto } from './application/product-response.dto';
import {
  ApiResponseDto,
  ApiErrorResponseDto,
} from '../shared/dto/api-response.dto';
import { Product } from './domain/product.entity';
import { InventoryRepository } from '../inventory/domain/inventory.repository';
import { INVENTORY_REPOSITORY_TOKEN } from '../inventory/inventory.tokens';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly getProductUseCase: GetProductUseCase,
    private readonly getAllProductsUseCase: GetAllProductsUseCase,
    @Inject(INVENTORY_REPOSITORY_TOKEN)
    private readonly inventoryRepository: InventoryRepository,
  ) {}

  private async toResponseDto(product: Product): Promise<ProductResponseDto> {
    let stock = 0;
    try {
      const inventory = await this.inventoryRepository.findByProductId(product.id);
      if (inventory) {
        stock = inventory.getAvailableQuantity();
      }
    } catch {
      // If inventory lookup fails, default to 0
    }

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      imageUrl: product.imageUrl,
      categoria: product.categoria,
      metadata: product.metadata,
      rating: product.rating,
      stock,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(ProductResponseDto) },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ApiErrorResponseDto,
  })
  async getAllProducts() {
    const result = await this.getAllProductsUseCase.execute();

    if (!result.success) {
      throw new HttpException(
        result.error || 'Failed to get products',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const data = await Promise.all(
      (result.data || []).map((product) => this.toResponseDto(product)),
    );

    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiParam({
    name: 'id',
    description: 'ID del producto',
    example: 'prod-001',
  })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully',
    type: ApiResponseDto<ProductResponseDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ApiErrorResponseDto,
  })
  async getProduct(@Param('id') id: string) {
    const result = await this.getProductUseCase.execute(id);

    if (!result.success) {
      throw new HttpException(
        result.error || 'Product not found',
        result.error === 'Product not found'
          ? HttpStatus.NOT_FOUND
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      success: true,
      data: result.data ? await this.toResponseDto(result.data) : undefined,
    };
  }
}
