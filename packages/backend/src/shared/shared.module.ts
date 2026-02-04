import { Module, Global } from '@nestjs/common';
import { LoggerService } from './logger/logger.service';
import { DynamoDbService } from './database/dynamodb.service';
import { SnsService } from './messaging/sns.service';
import { SqsService } from './messaging/sqs.service';
import { StepFunctionsService } from './orchestration/step-functions.service';

@Global()
@Module({
  providers: [
    LoggerService,
    DynamoDbService,
    SnsService,
    SqsService,
    StepFunctionsService,
  ],
  exports: [
    LoggerService,
    DynamoDbService,
    SnsService,
    SqsService,
    StepFunctionsService,
  ],
})
export class SharedModule {}
