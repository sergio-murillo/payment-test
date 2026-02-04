import { Injectable, Inject } from '@nestjs/common';
import { TransactionRepository } from '../../transactions/domain/transaction.repository';
import { TransactionStatus } from '../../transactions/domain/transaction-status.enum';
import { InventoryRepository } from '../../inventory/domain/inventory.repository';
import { LoggerService } from '../../shared/logger/logger.service';
import { EventStoreService } from '../../event-store/application/event-store.service';
import { SnsService } from '../../shared/messaging/sns.service';
import { TRANSACTION_REPOSITORY_TOKEN } from '../../transactions/transactions.tokens';
import { INVENTORY_REPOSITORY_TOKEN } from '../../inventory/inventory.tokens';

export type Result<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

@Injectable()
export class CompensateTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY_TOKEN)
    private readonly transactionRepository: TransactionRepository,
    @Inject(INVENTORY_REPOSITORY_TOKEN)
    private readonly inventoryRepository: InventoryRepository,
    private readonly eventStoreService: EventStoreService,
    private readonly snsService: SnsService,
    private readonly logger: LoggerService,
  ) {}

  async execute(transactionId: string): Promise<Result<any>> {
    try {
      this.logger.debug(
        `Compensating transaction: ${transactionId}`,
        'CompensateTransactionUseCase',
      );

      const transaction =
        await this.transactionRepository.findById(transactionId);

      if (!transaction) {
        return {
          success: false,
          error: 'Transaction not found',
        };
      }

      // Cancel transaction
      const cancelledTransaction = transaction.cancel();
      await this.transactionRepository.update(cancelledTransaction);

      // Release inventory if it was reserved
      try {
        await this.inventoryRepository.release(
          transaction.productId,
          1, // Assuming 1 unit per transaction
        );
      } catch (error) {
        this.logger.warn(
          `Failed to release inventory for transaction: ${transactionId}`,
          'CompensateTransactionUseCase',
        );
      }

      // Store event
      await this.eventStoreService.storeEvent({
        aggregateId: transaction.id,
        eventType: 'TransactionCompensated',
        eventData: {
          transactionId: transaction.id,
          reason: 'Payment processing failed',
        },
        timestamp: new Date(),
      });

      // Publish to SNS
      await this.snsService.publish({
        eventType: 'TransactionCompensated',
        transactionId: transaction.id,
      });

      return {
        success: true,
        data: cancelledTransaction,
      };
    } catch (error) {
      this.logger.error(
        `Error compensating transaction: ${transactionId}`,
        error instanceof Error ? error.stack : String(error),
        'CompensateTransactionUseCase',
      );

      return {
        success: false,
        error: 'Failed to compensate transaction',
      };
    }
  }
}
