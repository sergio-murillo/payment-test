import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { ProcessPaymentUseCase } from './application/process-payment.use-case';
import { CompensateTransactionUseCase } from './application/compensate-transaction.use-case';
import { PaymentGatewayAdapter } from './infrastructure/payment-gateway.adapter';
import { TransactionsModule } from '../transactions/transactions.module';
import { InventoryModule } from '../inventory/inventory.module';
import { EventStoreModule } from '../event-store/event-store.module';
import { SharedModule } from '../shared/shared.module';
import { PAYMENT_GATEWAY_ADAPTER_TOKEN } from './payments.tokens';

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
    PaymentGatewayAdapter,
    {
      provide: PAYMENT_GATEWAY_ADAPTER_TOKEN,
      useClass: PaymentGatewayAdapter,
    },
  ],
  exports: [
    PAYMENT_GATEWAY_ADAPTER_TOKEN,
    ProcessPaymentUseCase,
    CompensateTransactionUseCase,
  ],
})
export class PaymentsModule {}
