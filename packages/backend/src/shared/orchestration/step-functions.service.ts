import { Injectable } from '@nestjs/common';
import {
  SFNClient,
  StartExecutionCommand,
  DescribeExecutionCommand,
} from '@aws-sdk/client-sfn';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class StepFunctionsService {
  private readonly sfnClient: SFNClient;
  private readonly stateMachineArn: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const clientConfig: any = {
      region: this.configService.get<string>('REGION', 'us-east-1'),
    };

    // Use environment variable for endpoint, fallback to localhost for local development
    const stepFunctionsEndpoint = this.configService.get<string>(
      'STEP_FUNCTIONS_ENDPOINT',
    );
    if (stepFunctionsEndpoint) {
      clientConfig.endpoint = stepFunctionsEndpoint;
    } else if (
      process.env.NODE_ENV === 'development' ||
      process.env.IS_OFFLINE
    ) {
      clientConfig.endpoint = 'http://localhost:4566';
    }

    this.sfnClient = new SFNClient(clientConfig);
    this.stateMachineArn = this.configService.get<string>(
      'STEP_FUNCTION_ARN',
      'arn:aws:states:us-east-1:123456789012:stateMachine:WompiPaymentProcessor-dev',
    );
  }

  async startExecution(input: any, executionName?: string): Promise<string> {
    try {
      const command = new StartExecutionCommand({
        stateMachineArn: this.stateMachineArn,
        input: JSON.stringify(input),
        name: executionName,
      });

      const result = await this.sfnClient.send(command);
      this.logger.debug(
        `Started Step Function execution: ${result.executionArn}`,
        'StepFunctionsService',
      );
      return result.executionArn || '';
    } catch (error) {
      this.logger.error(
        'Error starting Step Function execution',
        error instanceof Error ? error.stack : String(error),
        'StepFunctionsService',
      );
      throw error;
    }
  }

  async describeExecution(executionArn: string): Promise<any> {
    try {
      const command = new DescribeExecutionCommand({
        executionArn,
      });

      const result = await this.sfnClient.send(command);
      return result;
    } catch (error) {
      this.logger.error(
        'Error describing Step Function execution',
        error instanceof Error ? error.stack : String(error),
        'StepFunctionsService',
      );
      throw error;
    }
  }
}
