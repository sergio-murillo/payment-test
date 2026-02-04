import { Injectable, Inject } from '@nestjs/common';
import { TransactionRepository } from '../domain/transaction.repository';
import { Transaction } from '../domain/transaction.entity';
import { LoggerService } from '../../shared/logger/logger.service';
import { TRANSACTION_REPOSITORY_TOKEN } from '../transactions.tokens';

export type Result<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

@Injectable()
export class GetTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY_TOKEN)
    private readonly transactionRepository: TransactionRepository,
    private readonly logger: LoggerService,
  ) {}

  async execute(transactionId: string): Promise<Result<Transaction>> {
    try {
      this.logger.debug(
        `Getting transaction: ${transactionId}`,
        'GetTransactionUseCase',
      );

      const transaction =
        await this.transactionRepository.findById(transactionId);

      if (!transaction) {
        return {
          success: false,
          error: 'Transaction not found',
        };
      }

      return {
        success: true,
        data: transaction,
      };
    } catch (error) {
      this.logger.error(
        `Error getting transaction: ${transactionId}`,
        error instanceof Error ? error.stack : String(error),
        'GetTransactionUseCase',
      );

      return {
        success: false,
        error: 'Failed to get transaction',
      };
    }
  }
}
