import { Injectable } from '@nestjs/common';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class SnsService {
  private readonly snsClient: SNSClient;
  private readonly topicArn: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const clientConfig: any = {
      region: this.configService.get<string>('REGION', 'us-east-1'),
    };

    // Use environment variable for endpoint, fallback to localhost for local development
    const snsEndpoint = this.configService.get<string>('SNS_ENDPOINT');
    if (snsEndpoint) {
      clientConfig.endpoint = snsEndpoint;
    } else if (
      process.env.NODE_ENV === 'development' ||
      process.env.IS_OFFLINE
    ) {
      clientConfig.endpoint = 'http://localhost:4566';
    }

    this.snsClient = new SNSClient(clientConfig);
    this.topicArn = this.configService.get<string>(
      'SNS_TOPIC_ARN',
      'arn:aws:sns:us-east-1:123456789012:wompi-payments-events-dev',
    );
  }

  async publish(message: any, subject?: string): Promise<void> {
    try {
      const command = new PublishCommand({
        TopicArn: this.topicArn,
        Message: JSON.stringify(message),
        Subject: subject,
        MessageAttributes: {
          eventType: {
            DataType: 'String',
            StringValue: message.eventType || 'unknown',
          },
        },
      });

      await this.snsClient.send(command);
      this.logger.debug(
        `Published message to SNS: ${message.eventType}`,
        'SnsService',
      );
    } catch (error) {
      this.logger.error(
        'Error publishing to SNS',
        error instanceof Error ? error.stack : String(error),
        'SnsService',
      );
      throw error;
    }
  }
}
