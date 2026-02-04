import { Injectable } from '@nestjs/common';
import { InventoryRepository } from '../domain/inventory.repository';
import { Inventory } from '../domain/inventory.entity';
import { INVENTORY_REPOSITORY_TOKEN } from '../inventory.tokens';
import { Inject } from '@nestjs/common';
import { DynamoDbService } from '../../shared/database/dynamodb.service';
import { LoggerService } from '../../shared/logger/logger.service';

export type Result<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

@Injectable()
export class GetAllInventoryUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY_TOKEN)
    private readonly inventoryRepository: InventoryRepository,
    private readonly dynamoDb: DynamoDbService,
    private readonly logger: LoggerService,
  ) {}

  async execute(): Promise<Result<Inventory[]>> {
    try {
      this.logger.debug('Getting all inventory', 'GetAllInventoryUseCase');

      const results = await this.dynamoDb.scan('inventory');

      const inventory = results.map((item) => Inventory.fromPersistence(item));

      this.logger.debug(
        `Retrieved ${inventory.length} inventory items`,
        'GetAllInventoryUseCase',
      );

      return {
        success: true,
        data: inventory,
      };
    } catch (error) {
      this.logger.error(
        'Error getting all inventory',
        error instanceof Error ? error.stack : String(error),
        'GetAllInventoryUseCase',
      );

      return {
        success: false,
        error: 'Failed to get all inventory',
      };
    }
  }
}
