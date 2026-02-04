import { Injectable } from '@nestjs/common';
import { InventoryRepository } from '../domain/inventory.repository';
import { Inventory } from '../domain/inventory.entity';
import { DynamoDbService } from '../../shared/database/dynamodb.service';
import { LoggerService } from '../../shared/logger/logger.service';

@Injectable()
export class DynamoDbInventoryRepository implements InventoryRepository {
  constructor(
    private readonly dynamoDb: DynamoDbService,
    private readonly logger: LoggerService,
  ) {}

  async findByProductId(productId: string): Promise<Inventory | null> {
    try {
      const data = await this.dynamoDb.get('inventory', { productId });
      return data ? Inventory.fromPersistence(data) : null;
    } catch (error) {
      this.logger.error(
        `Error finding inventory for product: ${productId}`,
        error instanceof Error ? error.stack : String(error),
        'DynamoDbInventoryRepository',
      );
      throw error;
    }
  }

  async reserve(productId: string, quantity: number): Promise<Inventory> {
    try {
      // Use conditional update to handle race conditions
      const current = await this.findByProductId(productId);

      if (!current) {
        throw new Error(`Inventory not found for product: ${productId}`);
      }

      const available = current.getAvailableQuantity();
      if (available < quantity) {
        throw new Error(
          `Insufficient inventory. Available: ${available}, Requested: ${quantity}`,
        );
      }

      // Atomic update with condition
      await this.dynamoDb.update(
        'inventory',
        { productId },
        'SET reservedQuantity = reservedQuantity + :quantity, updatedAt = :updatedAt',
        {
          ':quantity': quantity,
          ':updatedAt': new Date().toISOString(),
        },
        {
          '#available': 'quantity',
          '#reserved': 'reservedQuantity',
        },
        '#available - #reserved >= :quantity',
      );

      // Fetch updated inventory
      const updated = await this.findByProductId(productId);
      if (!updated) {
        throw new Error('Failed to update inventory');
      }

      return updated;
    } catch (error) {
      this.logger.error(
        `Error reserving inventory for product: ${productId}`,
        error instanceof Error ? error.stack : String(error),
        'DynamoDbInventoryRepository',
      );
      throw error;
    }
  }

  async release(productId: string, quantity: number): Promise<Inventory> {
    try {
      await this.dynamoDb.update(
        'inventory',
        { productId },
        'SET reservedQuantity = reservedQuantity - :quantity, updatedAt = :updatedAt',
        {
          ':quantity': quantity,
          ':updatedAt': new Date().toISOString(),
        },
        undefined,
        'reservedQuantity >= :quantity',
      );

      const updated = await this.findByProductId(productId);
      if (!updated) {
        throw new Error('Failed to update inventory');
      }

      return updated;
    } catch (error) {
      this.logger.error(
        `Error releasing inventory for product: ${productId}`,
        error instanceof Error ? error.stack : String(error),
        'DynamoDbInventoryRepository',
      );
      throw error;
    }
  }

  async decrement(productId: string, quantity: number): Promise<Inventory> {
    try {
      // Check if inventory exists first
      const current = await this.findByProductId(productId);
      if (!current) {
        throw new Error(`Inventory not found for product: ${productId}`);
      }

      // Check if there's enough quantity
      if (current.quantity < quantity) {
        throw new Error(
          `Insufficient inventory. Available: ${current.quantity}, Requested: ${quantity}`,
        );
      }

      // Atomic decrement with condition
      // If reservedQuantity exists and is >= quantity, decrement both
      // Otherwise, only decrement quantity (for direct sales without reservation)
      const hasReservedQuantity =
        current.reservedQuantity !== undefined &&
        current.reservedQuantity >= quantity;

      if (hasReservedQuantity) {
        // Decrement both quantity and reservedQuantity
        await this.dynamoDb.update(
          'inventory',
          { productId },
          'SET quantity = quantity - :quantity, reservedQuantity = reservedQuantity - :quantity, updatedAt = :updatedAt',
          {
            ':quantity': quantity,
            ':updatedAt': new Date().toISOString(),
          },
          undefined,
          'quantity >= :quantity AND reservedQuantity >= :quantity',
        );
      } else {
        // Only decrement quantity (reservedQuantity is 0 or doesn't exist)
        await this.dynamoDb.update(
          'inventory',
          { productId },
          'SET quantity = quantity - :quantity, updatedAt = :updatedAt',
          {
            ':quantity': quantity,
            ':updatedAt': new Date().toISOString(),
          },
          undefined,
          'quantity >= :quantity',
        );
      }

      const updated = await this.findByProductId(productId);
      if (!updated) {
        throw new Error('Failed to update inventory');
      }

      return updated;
    } catch (error) {
      this.logger.error(
        `Error decrementing inventory for product: ${productId}`,
        error instanceof Error ? error.stack : String(error),
        'DynamoDbInventoryRepository',
      );
      throw error;
    }
  }

  async increment(productId: string, quantity: number): Promise<Inventory> {
    try {
      await this.dynamoDb.update(
        'inventory',
        { productId },
        'SET quantity = quantity + :quantity, updatedAt = :updatedAt',
        {
          ':quantity': quantity,
          ':updatedAt': new Date().toISOString(),
        },
      );

      const updated = await this.findByProductId(productId);
      if (!updated) {
        throw new Error('Failed to update inventory');
      }

      return updated;
    } catch (error) {
      this.logger.error(
        `Error incrementing inventory for product: ${productId}`,
        error instanceof Error ? error.stack : String(error),
        'DynamoDbInventoryRepository',
      );
      throw error;
    }
  }
}
