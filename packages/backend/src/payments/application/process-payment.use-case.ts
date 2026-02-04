import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WompiPaymentAdapter } from '../domain/wompi-payment-adapter';
import { TransactionRepository } from '../../transactions/domain/transaction.repository';
import { TransactionStatus } from '../../transactions/domain/transaction-status.enum';
import { ProcessPaymentDto } from './process-payment.dto';
import { LoggerService } from '../../shared/logger/logger.service';
import { EventStoreService } from '../../event-store/application/event-store.service';
import { SnsService } from '../../shared/messaging/sns.service';
import { StepFunctionsService } from '../../shared/orchestration/step-functions.service';
import { WOMPI_PAYMENT_ADAPTER_TOKEN } from '../payments.tokens';
import { TRANSACTION_REPOSITORY_TOKEN } from '../../transactions/transactions.tokens';

export type Result<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

@Injectable()
export class ProcessPaymentUseCase {
  constructor(
    @Inject(WOMPI_PAYMENT_ADAPTER_TOKEN)
    private readonly wompiAdapter: WompiPaymentAdapter,
    @Inject(TRANSACTION_REPOSITORY_TOKEN)
    private readonly transactionRepository: TransactionRepository,
    private readonly eventStoreService: EventStoreService,
    private readonly snsService: SnsService,
    private readonly stepFunctionsService: StepFunctionsService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async execute(dto: ProcessPaymentDto): Promise<Result<any>> {
    try {
      this.logger.debug(
        `Processing payment for transaction: ${dto.transactionId}`,
        'ProcessPaymentUseCase',
      );

      // Get transaction
      const transaction = await this.transactionRepository.findById(
        dto.transactionId,
      );

      if (!transaction) {
        return {
          success: false,
          error: 'Transaction not found',
        };
      }

      if (transaction.status !== TransactionStatus.PENDING) {
        return {
          success: false,
          error: `Transaction is not in PENDING status. Current status: ${transaction.status}`,
        };
      }

      // Start Step Function execution
      const executionArn = await this.stepFunctionsService.startExecution({
        transactionId: transaction.id,
        paymentToken: dto.paymentToken,
        installments: dto.installments,
      });

      this.logger.debug(
        `Step Function execution started: ${executionArn}`,
        'ProcessPaymentUseCase',
      );

      return {
        success: true,
        data: {
          executionArn,
          transactionId: transaction.id,
        },
      };
    } catch (error) {
      this.logger.error(
        'Error processing payment',
        error instanceof Error ? error.stack : String(error),
        'ProcessPaymentUseCase',
      );

      return {
        success: false,
        error: 'Failed to process payment',
      };
    }
  }

  async executePaymentStep(
    transactionId: string,
    paymentToken: string,
    installments: number,
  ): Promise<Result<any>> {
    try {
      const transaction =
        await this.transactionRepository.findById(transactionId);

      if (!transaction) {
        return {
          success: false,
          error: 'Transaction not found',
        };
      }

      const publicKey = this.configService.get<string>(
        'WOMPI_PUBLIC_KEY',
        'pub_stagtest_g2u0HQd3ZMh05hsSgTS2lUV8t3s4mOt7',
      );

      // Create payment in Wompi
      const wompiResponse = await this.wompiAdapter.createPayment({
        amountInCents: transaction.totalAmount * 100,
        currency: 'COP',
        customerEmail: transaction.customerEmail,
        paymentMethod: {
          type: 'CARD',
          installments,
          token: paymentToken,
        },
        reference: transaction.id,
        publicKey,
      });

      // Update transaction
      let updatedTransaction: any;
      if (wompiResponse.data.status === 'APPROVED') {
        updatedTransaction = transaction.approve(wompiResponse.data.id);
      } else {
        updatedTransaction = transaction.decline(
          `Payment declined: ${wompiResponse.data.status}`,
        );
      }

      await this.transactionRepository.update(updatedTransaction);

      // Store event
      await this.eventStoreService.storeEvent({
        aggregateId: transaction.id,
        eventType: 'PaymentProcessed',
        eventData: {
          transactionId: transaction.id,
          wompiTransactionId: wompiResponse.data.id,
          status: wompiResponse.data.status,
        },
        timestamp: new Date(),
      });

      // Publish to SNS
      await this.snsService.publish({
        eventType: 'PaymentProcessed',
        transactionId: transaction.id,
        status: wompiResponse.data.status,
        wompiTransactionId: wompiResponse.data.id,
      });

      return {
        success: true,
        data: {
          transaction: updatedTransaction,
          wompiResponse: wompiResponse.data,
        },
      };
    } catch (error) {
      this.logger.error(
        'Error executing payment step',
        error instanceof Error ? error.stack : String(error),
        'ProcessPaymentUseCase',
      );

      return {
        success: false,
        error: 'Failed to execute payment step',
      };
    }
  }
}
