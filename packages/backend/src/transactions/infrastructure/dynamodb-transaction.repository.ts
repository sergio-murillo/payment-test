import { Injectable } from '@nestjs/common';
import { TransactionRepository } from '../domain/transaction.repository';
import { Transaction } from '../domain/transaction.entity';
import { DynamoDbService } from '../../shared/database/dynamodb.service';
import { LoggerService } from '../../shared/logger/logger.service';

@Injectable()
export class DynamoDbTransactionRepository implements TransactionRepository {
  constructor(
    private readonly dynamoDb: DynamoDbService,
    private readonly logger: LoggerService,
  ) {}

  async findById(id: string): Promise<Transaction | null> {
    try {
      const data = await this.dynamoDb.get('transactions', { id });
      return data ? Transaction.fromPersistence(data) : null;
    } catch (error) {
      this.logger.error(
        `Error finding transaction by id: ${id}`,
        error instanceof Error ? error.stack : String(error),
        'DynamoDbTransactionRepository',
      );
      throw error;
    }
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<Transaction | null> {
    try {
      const results = await this.dynamoDb.query(
        'transactions',
        'idempotencyKey = :idempotencyKey',
        { ':idempotencyKey': idempotencyKey },
        'idempotencyKey-index',
      );

      return results.length > 0
        ? Transaction.fromPersistence(results[0])
        : null;
    } catch (error) {
      this.logger.error(
        `Error finding transaction by idempotency key: ${idempotencyKey}`,
        error instanceof Error ? error.stack : String(error),
        'DynamoDbTransactionRepository',
      );
      throw error;
    }
  }

  async save(transaction: Transaction): Promise<void> {
    try {
      await this.dynamoDb.put('transactions', transaction.toPersistence());
    } catch (error) {
      this.logger.error(
        `Error saving transaction: ${transaction.id}`,
        error instanceof Error ? error.stack : String(error),
        'DynamoDbTransactionRepository',
      );
      throw error;
    }
  }

  async update(transaction: Transaction): Promise<void> {
    try {
      await this.dynamoDb.put('transactions', transaction.toPersistence());
    } catch (error) {
      this.logger.error(
        `Error updating transaction: ${transaction.id}`,
        error instanceof Error ? error.stack : String(error),
        'DynamoDbTransactionRepository',
      );
      throw error;
    }
  }
}
