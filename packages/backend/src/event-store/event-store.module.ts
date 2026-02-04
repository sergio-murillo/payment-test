import { Module } from '@nestjs/common';
import { EventStoreService } from './application/event-store.service';
import { GetAllEventsUseCase } from './application/get-all-events.use-case';
import { EventStoreController } from './event-store.controller';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [EventStoreService, GetAllEventsUseCase],
  controllers: [EventStoreController],
  exports: [EventStoreService],
})
export class EventStoreModule {}
