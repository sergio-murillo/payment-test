import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { ProcessPaymentUseCase } from './application/process-payment.use-case';
import { CompensateTransactionUseCase } from './application/compensate-transaction.use-case';
import { WompiApiAdapter } from './infrastructure/wompi-api.adapter';
import { TransactionsModule } from '../transactions/transactions.module';
import { InventoryModule } from '../inventory/inventory.module';
import { EventStoreModule } from '../event-store/event-store.module';
import { SharedModule } from '../shared/shared.module';
import { WOMPI_PAYMENT_ADAPTER_TOKEN } from './payments.tokens';

@Module({
  imports: [
    SharedModule,
    TransactionsModule,
    InventoryModule,
    EventStoreModule,
  ],
  controllers: [PaymentsController],
  providers: [
    ProcessPaymentUseCase,
    CompensateTransactionUseCase,
    WompiApiAdapter,
    {
      provide: WOMPI_PAYMENT_ADAPTER_TOKEN,
      useClass: WompiApiAdapter,
    },
  ],
  exports: [WOMPI_PAYMENT_ADAPTER_TOKEN, CompensateTransactionUseCase],
})
export class PaymentsModule {}
