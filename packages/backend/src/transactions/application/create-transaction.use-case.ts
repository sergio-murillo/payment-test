import { Injectable, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TransactionRepository } from '../domain/transaction.repository';
import { Transaction } from '../domain/transaction.entity';
import { TransactionStatus } from '../domain/transaction-status.enum';
import { CreateTransactionDto } from './create-transaction.dto';
import { LoggerService } from '../../shared/logger/logger.service';
import { EventStoreService } from '../../event-store/application/event-store.service';
import { TRANSACTION_REPOSITORY_TOKEN } from '../transactions.tokens';

export type Result<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY_TOKEN)
    private readonly transactionRepository: TransactionRepository,
    private readonly eventStoreService: EventStoreService,
    private readonly logger: LoggerService,
  ) {}

  async execute(dto: CreateTransactionDto): Promise<Result<Transaction>> {
    try {
      this.logger.debug(
        `Creating transaction with idempotency key: ${dto.idempotencyKey}`,
        'CreateTransactionUseCase',
      );

      // Check idempotency
      const existingTransaction =
        await this.transactionRepository.findByIdempotencyKey(
          dto.idempotencyKey,
        );

      if (existingTransaction) {
        this.logger.debug(
          `Transaction already exists with idempotency key: ${dto.idempotencyKey}`,
          'CreateTransactionUseCase',
        );
        return {
          success: true,
          data: existingTransaction,
        };
      }

      const totalAmount = dto.amount + dto.commission + dto.shippingCost;

      const transaction = new Transaction(
        uuidv4(),
        dto.productId,
        dto.amount,
        dto.commission,
        dto.shippingCost,
        totalAmount,
        TransactionStatus.PENDING,
        dto.customerEmail,
        dto.customerName,
        dto.deliveryAddress,
        dto.deliveryCity,
        dto.deliveryPhone,
        dto.idempotencyKey,
        new Date(),
        new Date(),
      );

      await this.transactionRepository.save(transaction);

      // Store event
      await this.eventStoreService.storeEvent({
        aggregateId: transaction.id,
        eventType: 'TransactionCreated',
        eventData: transaction.toPersistence(),
        timestamp: new Date(),
      });

      this.logger.debug(
        `Transaction created: ${transaction.id}`,
        'CreateTransactionUseCase',
      );

      return {
        success: true,
        data: transaction,
      };
    } catch (error) {
      this.logger.error(
        'Error creating transaction',
        error instanceof Error ? error.stack : String(error),
        'CreateTransactionUseCase',
      );

      return {
        success: false,
        error: 'Failed to create transaction',
      };
    }
  }
}
