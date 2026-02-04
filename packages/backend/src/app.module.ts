import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from './shared/shared.module';
import { ProductsModule } from './products/products.module';
import { TransactionsModule } from './transactions/transactions.module';
import { PaymentsModule } from './payments/payments.module';
import { InventoryModule } from './inventory/inventory.module';
import { EventStoreModule } from './event-store/event-store.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    SharedModule, // Must be imported first to make services available globally
    EventStoreModule,
    ProductsModule,
    TransactionsModule,
    InventoryModule,
    PaymentsModule, // Depends on TransactionsModule and InventoryModule
  ],
})
export class AppModule {}
