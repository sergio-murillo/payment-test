import { Injectable } from '@nestjs/common';
import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class SqsService {
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const clientConfig: any = {
      region: this.configService.get<string>('REGION', 'us-east-1'),
    };

    // Use environment variable for endpoint, fallback to localhost for local development
    const sqsEndpoint = this.configService.get<string>('SQS_ENDPOINT');
    if (sqsEndpoint) {
      clientConfig.endpoint = sqsEndpoint;
    } else if (
      process.env.NODE_ENV === 'development' ||
      process.env.IS_OFFLINE
    ) {
      clientConfig.endpoint = 'http://localhost:4566';
    }

    this.sqsClient = new SQSClient(clientConfig);

    // Use environment variable for queue URL, with fallback
    const queueUrl = this.configService.get<string>('SQS_QUEUE_URL');
    if (queueUrl) {
      this.queueUrl = queueUrl;
    } else {
      // Construct default queue URL based on endpoint
      const endpoint = sqsEndpoint || 'http://localhost:4566';
      this.queueUrl = `${endpoint}/000000000000/dev-payments-queue`;
    }
  }

  async sendMessage(message: any, delaySeconds?: number): Promise<void> {
    try {
      const command = new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(message),
        DelaySeconds: delaySeconds,
        MessageAttributes: {
          eventType: {
            DataType: 'String',
            StringValue: message.eventType || 'unknown',
          },
        },
      });

      await this.sqsClient.send(command);
      this.logger.debug(
        `Sent message to SQS: ${message.eventType}`,
        'SqsService',
      );
    } catch (error) {
      this.logger.error(
        'Error sending message to SQS',
        error instanceof Error ? error.stack : String(error),
        'SqsService',
      );
      throw error;
    }
  }

  async receiveMessages(maxNumberOfMessages = 10): Promise<any[]> {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: maxNumberOfMessages,
        WaitTimeSeconds: 20,
      });

      const result = await this.sqsClient.send(command);
      return (
        result.Messages?.map((msg) => ({
          ...JSON.parse(msg.Body || '{}'),
          receiptHandle: msg.ReceiptHandle,
        })) || []
      );
    } catch (error) {
      this.logger.error(
        'Error receiving messages from SQS',
        error instanceof Error ? error.stack : String(error),
        'SqsService',
      );
      throw error;
    }
  }

  async deleteMessage(receiptHandle: string): Promise<void> {
    try {
      const command = new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
      });

      await this.sqsClient.send(command);
    } catch (error) {
      this.logger.error(
        'Error deleting message from SQS',
        error instanceof Error ? error.stack : String(error),
        'SqsService',
      );
      throw error;
    }
  }
}
