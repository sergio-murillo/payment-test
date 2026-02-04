import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { CreateTransactionUseCase } from './application/create-transaction.use-case';
import { GetTransactionUseCase } from './application/get-transaction.use-case';
import { GetAllTransactionsUseCase } from './application/get-all-transactions.use-case';
import { DynamoDbTransactionRepository } from './infrastructure/dynamodb-transaction.repository';
import { EventStoreModule } from '../event-store/event-store.module';
import { SharedModule } from '../shared/shared.module';
import { TRANSACTION_REPOSITORY_TOKEN } from './transactions.tokens';

@Module({
  imports: [SharedModule, EventStoreModule],
  controllers: [TransactionsController],
  providers: [
    CreateTransactionUseCase,
    GetTransactionUseCase,
    GetAllTransactionsUseCase,
    DynamoDbTransactionRepository,
    {
      provide: TRANSACTION_REPOSITORY_TOKEN,
      useClass: DynamoDbTransactionRepository,
    },
  ],
  exports: [TRANSACTION_REPOSITORY_TOKEN],
})
export class TransactionsModule {}
