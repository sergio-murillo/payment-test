import { Injectable } from '@nestjs/common';
import { TransactionRepository } from '../domain/transaction.repository';
import { Transaction } from '../domain/transaction.entity';
import { TRANSACTION_REPOSITORY_TOKEN } from '../transactions.tokens';
import { Inject } from '@nestjs/common';
import { DynamoDbService } from '../../shared/database/dynamodb.service';
import { LoggerService } from '../../shared/logger/logger.service';

export type Result<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

@Injectable()
export class GetAllTransactionsUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY_TOKEN)
    private readonly transactionRepository: TransactionRepository,
    private readonly dynamoDb: DynamoDbService,
    private readonly logger: LoggerService,
  ) {}

  async execute(): Promise<Result<Transaction[]>> {
    try {
      this.logger.debug(
        'Getting all transactions',
        'GetAllTransactionsUseCase',
      );

      const results = await this.dynamoDb.scan('transactions');

      const transactions = results.map((item) =>
        Transaction.fromPersistence(item),
      );

      // Sort by createdAt descending (most recent first)
      transactions.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );

      this.logger.debug(
        `Retrieved ${transactions.length} transactions`,
        'GetAllTransactionsUseCase',
      );

      return {
        success: true,
        data: transactions,
      };
    } catch (error) {
      this.logger.error(
        'Error getting all transactions',
        error instanceof Error ? error.stack : String(error),
        'GetAllTransactionsUseCase',
      );

      return {
        success: false,
        error: 'Failed to get all transactions',
      };
    }
  }
}
