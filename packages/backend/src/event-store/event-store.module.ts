import { Module } from '@nestjs/common';
import { EventStoreService } from './application/event-store.service';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [EventStoreService],
  exports: [EventStoreService],
})
export class EventStoreModule {}
