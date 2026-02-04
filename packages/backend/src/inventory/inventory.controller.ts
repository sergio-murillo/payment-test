import { Controller, Get, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetAllInventoryUseCase } from './application/get-all-inventory.use-case';
import { InventoryResponseDto } from './application/inventory-response.dto';
import {
  ApiResponseDto,
  ApiErrorResponseDto,
} from '../shared/dto/api-response.dto';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly getAllInventoryUseCase: GetAllInventoryUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all inventory items' })
  @ApiResponse({
    status: 200,
    description: 'Inventory retrieved successfully',
    type: ApiResponseDto<InventoryResponseDto[]>,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ApiErrorResponseDto,
  })
  async getAllInventory() {
    const result = await this.getAllInventoryUseCase.execute();

    if (!result.success) {
      throw new HttpException(
        result.error || 'Failed to get all inventory',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      success: true,
      data: result.data,
    };
  }
}
