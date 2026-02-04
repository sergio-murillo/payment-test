import { Module } from '@nestjs/common';
import { UpdateInventoryUseCase } from './application/update-inventory.use-case';
import { GetAllInventoryUseCase } from './application/get-all-inventory.use-case';
import { InventoryController } from './inventory.controller';
import { DynamoDbInventoryRepository } from './infrastructure/dynamodb-inventory.repository';
import { EventStoreModule } from '../event-store/event-store.module';
import { SharedModule } from '../shared/shared.module';
import { INVENTORY_REPOSITORY_TOKEN } from './inventory.tokens';

@Module({
  imports: [SharedModule, EventStoreModule],
  controllers: [InventoryController],
  providers: [
    UpdateInventoryUseCase,
    GetAllInventoryUseCase,
    DynamoDbInventoryRepository,
    {
      provide: INVENTORY_REPOSITORY_TOKEN,
      useClass: DynamoDbInventoryRepository,
    },
  ],
  exports: [INVENTORY_REPOSITORY_TOKEN, UpdateInventoryUseCase],
})
export class InventoryModule {}
