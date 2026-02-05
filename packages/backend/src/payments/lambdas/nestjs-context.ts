import { NestFactory } from '@nestjs/core';
import { INestApplicationContext } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { ProcessPaymentUseCase } from '../application/process-payment.use-case';
import { UpdateInventoryUseCase } from '../../inventory/application/update-inventory.use-case';
import { CompensateTransactionUseCase } from '../application/compensate-transaction.use-case';
import { TransactionRepository } from '../../transactions/domain/transaction.repository';
import { TRANSACTION_REPOSITORY_TOKEN } from '../../transactions/transactions.tokens';

let cachedApp: INestApplicationContext | null = null;

interface UseCases {
  processPaymentUseCase: ProcessPaymentUseCase;
  updateInventoryUseCase: UpdateInventoryUseCase;
  compensateTransactionUseCase: CompensateTransactionUseCase;
  transactionRepository: TransactionRepository;
}

/**
 * Initializes NestJS application and returns use cases
 * Uses caching to avoid re-initializing on every Lambda invocation
 */
export async function getNestJsContext(): Promise<UseCases> {
  if (!cachedApp) {
    cachedApp = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
  }

  return {
    processPaymentUseCase: cachedApp.get<ProcessPaymentUseCase>(
      ProcessPaymentUseCase,
    ),
    updateInventoryUseCase: cachedApp.get<UpdateInventoryUseCase>(
      UpdateInventoryUseCase,
    ),
    compensateTransactionUseCase: cachedApp.get<CompensateTransactionUseCase>(
      CompensateTransactionUseCase,
    ),
    transactionRepository: cachedApp.get<TransactionRepository>(
      TRANSACTION_REPOSITORY_TOKEN,
    ),
  };
}
