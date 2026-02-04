import { Injectable, Inject } from '@nestjs/common';
import { InventoryRepository } from '../domain/inventory.repository';
import { LoggerService } from '../../shared/logger/logger.service';
import { EventStoreService } from '../../event-store/application/event-store.service';
import { INVENTORY_REPOSITORY_TOKEN } from '../inventory.tokens';

export type Result<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

@Injectable()
export class UpdateInventoryUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY_TOKEN)
    private readonly inventoryRepository: InventoryRepository,
    private readonly eventStoreService: EventStoreService,
    private readonly logger: LoggerService,
  ) {}

  async execute(productId: string, quantity: number): Promise<Result<any>> {
    try {
      this.logger.debug(
        `Updating inventory for product: ${productId}, quantity: ${quantity}`,
        'UpdateInventoryUseCase',
      );

      const updatedInventory = await this.inventoryRepository.decrement(
        productId,
        quantity,
      );

      // Store event
      await this.eventStoreService.storeEvent({
        aggregateId: productId,
        eventType: 'InventoryUpdated',
        eventData: {
          productId,
          quantity,
          newQuantity: updatedInventory.quantity,
        },
        timestamp: new Date(),
      });

      return {
        success: true,
        data: updatedInventory,
      };
    } catch (error) {
      this.logger.error(
        `Error updating inventory for product: ${productId}`,
        error instanceof Error ? error.stack : String(error),
        'UpdateInventoryUseCase',
      );

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update inventory',
      };
    }
  }
}
