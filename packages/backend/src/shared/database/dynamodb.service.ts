import { Injectable } from '@nestjs/common';
import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class DynamoDbService {
  private readonly docClient: DynamoDBDocumentClient;
  private readonly tablePrefix: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const clientConfig: DynamoDBClientConfig = {
      region: this.configService.get<string>('REGION', 'us-east-1'),
    };

    // Use environment variable for endpoint, fallback to localhost for local development
    const dynamoEndpoint = this.configService.get<string>('DYNAMODB_ENDPOINT');
    if (dynamoEndpoint) {
      clientConfig.endpoint = dynamoEndpoint;
    } else if (
      process.env.NODE_ENV === 'development' ||
      process.env.IS_OFFLINE
    ) {
      clientConfig.endpoint = 'http://localhost:8000';
    }

    const client = new DynamoDBClient(clientConfig);
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tablePrefix = this.configService.get<string>(
      'DYNAMODB_TABLE_PREFIX',
      'dev',
    );
  }

  private getTableName(tableName: string): string {
    return `${this.tablePrefix}-${tableName}`;
  }

  async get<T>(tableName: string, key: Record<string, any>): Promise<T | null> {
    try {
      const command = new GetCommand({
        TableName: this.getTableName(tableName),
        Key: key,
      });

      const result = await this.docClient.send(command);
      return (result.Item as T) || null;
    } catch (error) {
      this.logger.error(
        `Error getting item from ${tableName}`,
        error instanceof Error ? error.stack : String(error),
        'DynamoDbService',
      );
      throw error;
    }
  }

  async put<T extends Record<string, any>>(
    tableName: string,
    item: T,
  ): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: this.getTableName(tableName),
        Item: item,
      });

      await this.docClient.send(command);
    } catch (error) {
      this.logger.error(
        `Error putting item to ${tableName}`,
        error instanceof Error ? error.stack : String(error),
        'DynamoDbService',
      );
      throw error;
    }
  }

  async update(
    tableName: string,
    key: Record<string, any>,
    updateExpression: string,
    expressionAttributeValues: Record<string, any>,
    expressionAttributeNames?: Record<string, string>,
    conditionExpression?: string,
  ): Promise<void> {
    try {
      const command = new UpdateCommand({
        TableName: this.getTableName(tableName),
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        ConditionExpression: conditionExpression,
      });

      await this.docClient.send(command);
    } catch (error) {
      this.logger.error(
        `Error updating item in ${tableName}`,
        error instanceof Error ? error.stack : String(error),
        'DynamoDbService',
      );
      throw error;
    }
  }

  async query<T>(
    tableName: string,
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
    indexName?: string,
  ): Promise<T[]> {
    try {
      const command = new QueryCommand({
        TableName: this.getTableName(tableName),
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        IndexName: indexName,
      });

      const result = await this.docClient.send(command);
      return (result.Items as T[]) || [];
    } catch (error) {
      this.logger.error(
        `Error querying ${tableName}`,
        error instanceof Error ? error.stack : String(error),
        'DynamoDbService',
      );
      throw error;
    }
  }

  async scan<T>(tableName: string): Promise<T[]> {
    try {
      const command = new ScanCommand({
        TableName: this.getTableName(tableName),
      });

      const result = await this.docClient.send(command);
      return (result.Items as T[]) || [];
    } catch (error) {
      this.logger.error(
        `Error scanning ${tableName}`,
        error instanceof Error ? error.stack : String(error),
        'DynamoDbService',
      );
      throw error;
    }
  }

  async transactWrite(transactItems: any[]): Promise<void> {
    try {
      const command = new TransactWriteCommand({
        TransactItems: transactItems.map((item) => ({
          ...item,
          ...(item.Put && {
            Put: {
              ...item.Put,
              TableName: this.getTableName(
                item.Put.TableName.replace(`${this.tablePrefix}-`, ''),
              ),
            },
          }),
          ...(item.Update && {
            Update: {
              ...item.Update,
              TableName: this.getTableName(
                item.Update.TableName.replace(`${this.tablePrefix}-`, ''),
              ),
            },
          }),
        })),
      });

      await this.docClient.send(command);
    } catch (error) {
      this.logger.error(
        'Error in transaction write',
        error instanceof Error ? error.stack : String(error),
        'DynamoDbService',
      );
      throw error;
    }
  }
}
