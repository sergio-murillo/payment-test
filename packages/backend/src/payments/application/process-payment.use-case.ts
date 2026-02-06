import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GatewayPaymentAdapter } from '../domain/payment-gateway.port';
import { TransactionRepository } from '../../transactions/domain/transaction.repository';
import { TransactionStatus } from '../../transactions/domain/transaction-status.enum';
import { ProcessPaymentDto } from './process-payment.dto';
import { LoggerService } from '../../shared/logger/logger.service';
import { EventStoreService } from '../../event-store/application/event-store.service';
import { SnsService } from '../../shared/messaging/sns.service';
import { StepFunctionsService } from '../../shared/orchestration/step-functions.service';
import { UpdateInventoryUseCase } from '../../inventory/application/update-inventory.use-case';
import { CompensateTransactionUseCase } from './compensate-transaction.use-case';
import { PAYMENT_GATEWAY_ADAPTER_TOKEN } from '../payments.tokens';
import { TRANSACTION_REPOSITORY_TOKEN } from '../../transactions/transactions.tokens';

export type Result<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

@Injectable()
export class ProcessPaymentUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY_ADAPTER_TOKEN)
    private readonly gatewayAdapter: GatewayPaymentAdapter,
    @Inject(TRANSACTION_REPOSITORY_TOKEN)
    private readonly transactionRepository: TransactionRepository,
    private readonly eventStoreService: EventStoreService,
    private readonly snsService: SnsService,
    private readonly stepFunctionsService: StepFunctionsService,
    private readonly updateInventoryUseCase: UpdateInventoryUseCase,
    private readonly compensateTransactionUseCase: CompensateTransactionUseCase,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async execute(dto: ProcessPaymentDto): Promise<Result<any>> {
    this.logger.debug(
      `Processing payment for transaction: ${dto.transactionId}`,
      'ProcessPaymentUseCase',
    );

    // Get transaction
    const transaction = await this.transactionRepository.findById(
      dto.transactionId,
    );
    try {
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

      // Tokenize card first
      const tokenizationResult = await this.gatewayAdapter.tokenizeCard({
        number: dto.cardNumber,
        cvc: dto.cvc,
        expMonth: dto.expMonth,
        expYear: dto.expYear,
        cardHolder: dto.cardHolder,
      });

      if (
        tokenizationResult.status !== 'CREATED' ||
        !tokenizationResult.data?.id
      ) {
        return {
          success: false,
          error: 'Failed to tokenize card',
        };
      }

      const paymentToken = tokenizationResult.data.id;

      // Try to start Step Function execution, fallback to direct execution in development
      const isDevelopment =
        process.env.NODE_ENV === 'development' ||
        process.env.IS_OFFLINE === 'true';

      try {
        // Prepare all data needed for Step Function execution
        const stepFunctionInput = {
          transactionId: transaction.id,
          paymentToken: paymentToken,
          installments: dto.installments,
          productId: transaction.productId,
          totalAmount: transaction.totalAmount,
          currency: 'COP',
          customerEmail: transaction.customerEmail,
        };

        const executionArn =
          await this.stepFunctionsService.startExecution(stepFunctionInput);

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
        // In development, if Step Function doesn't exist, execute directly
        if (
          isDevelopment &&
          error instanceof Error &&
          (error.message.includes('StateMachineDoesNotExist') ||
            error.message.includes('State Machine Does Not Exist'))
        ) {
          this.logger.warn(
            'Step Function not found in development, executing payment workflow directly',
            'ProcessPaymentUseCase',
          );

          // Execute the complete workflow: ProcessPayment -> UpdateInventory -> CompleteTransaction
          // or CompensateTransaction if any step fails
          try {
            // Step 1: Process Payment
            const paymentResult = await this.executePaymentStep(
              transaction.id,
              paymentToken,
              dto.installments,
            );

            if (!paymentResult.success) {
              // Compensate transaction on payment failure
              await this.compensateTransactionUseCase.execute(transaction.id);
              return paymentResult;
            }

            // Step 2: Update Inventory (only if payment was approved)
            if (
              paymentResult.data?.transaction?.status ===
              TransactionStatus.APPROVED
            ) {
              const inventoryResult = await this.updateInventoryUseCase.execute(
                transaction.productId,
                1, // Assuming 1 unit per transaction
              );

              if (!inventoryResult.success) {
                // Compensate transaction if inventory update fails
                this.logger.error(
                  `Inventory update failed for transaction ${transaction.id}, compensating`,
                  'ProcessPaymentUseCase',
                );
                await this.compensateTransactionUseCase.execute(transaction.id);
                return {
                  success: false,
                  error:
                    inventoryResult.error ||
                    'Failed to update inventory after payment',
                };
              }
            }

            // Step 3: CompleteTransaction (implicit - transaction is already updated)

            return {
              success: true,
              data: {
                transactionId: transaction.id,
                executedDirectly: true,
                ...paymentResult.data,
              },
            };
          } catch (error) {
            // Compensate transaction on any unexpected error
            this.logger.error(
              `Error in direct payment workflow execution, compensating transaction ${transaction.id}`,
              error instanceof Error ? error.stack : String(error),
              'ProcessPaymentUseCase',
            );
            await this.compensateTransactionUseCase.execute(transaction.id);
            throw error;
          }
        }

        // Re-throw error if not in development or different error
        throw error;
      }
    } catch (error) {
      this.logger.error(
        'Error processing payment',
        error instanceof Error ? error.stack : String(error),
        'ProcessPaymentUseCase',
      );

      if (transaction) {
        const updatedTransaction = transaction.decline(
          `Pago fallido por error técnico, vuelve a intentarlo más tarde`,
        );
        await this.transactionRepository.update(updatedTransaction);
      }
      return {
        success: false,
        error: 'Failed to process payment',
      };
    }
  }

  /**
   * Executes the payment step (can be called from Step Functions handlers)
   * @public
   * @param waitForPolling - If true, waits for polling to complete (for Step Functions). If false, starts polling in background (for direct execution)
   */
  public async executePaymentStep(
    transactionId: string,
    paymentToken: string,
    installments: number,
    waitForPolling: boolean = false,
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
        'GATEWAY_PUBLIC_KEY',
        '',
      );
      // Create payment in gateway
      const gatewayResponse = await this.gatewayAdapter.createPayment({
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

      const gatewayTransactionId = gatewayResponse.data.id;

      // If payment is already in final state, update transaction immediately
      if (gatewayResponse.data.status !== 'PENDING') {
        let updatedTransaction: any;
        if (gatewayResponse.data.status === 'APPROVED') {
          updatedTransaction = transaction.approve(gatewayTransactionId);
        } else if (
          ['DECLINED', 'VOIDED', 'ERROR'].includes(gatewayResponse.data.status)
        ) {
          updatedTransaction = transaction.decline(
            gatewayResponse.data.status_message ||
              `Payment ${gatewayResponse.data.status.toLowerCase()}`,
          );
        }

        if (updatedTransaction) {
          await this.transactionRepository.update(updatedTransaction);

          // Store event
          await this.eventStoreService.storeEvent({
            aggregateId: transaction.id,
            eventType: 'PaymentProcessed',
            eventData: {
              transactionId: transaction.id,
              gatewayTransactionId,
              status: gatewayResponse.data.status,
            },
            timestamp: new Date(),
          });

          // Publish to SNS
          await this.snsService.publish({
            eventType: 'PaymentProcessed',
            transactionId: transaction.id,
            status: gatewayResponse.data.status,
            gatewayTransactionId,
          });

          return {
            success: true,
            data: {
              transaction: updatedTransaction,
              gatewayResponse: gatewayResponse.data,
            },
          };
        }
      }

      // If payment is PENDING, save gatewayTransactionId and start polling
      this.logger.debug(
        `Payment created with status PENDING, saving gatewayTransactionId and starting polling for transaction: ${gatewayTransactionId}`,
        'ProcessPaymentUseCase',
      );

      // Save gatewayTransactionId to transaction for polling
      const transactionWithgatewayId =
        transaction.setGatewayTransactionId(gatewayTransactionId);
      await this.transactionRepository.update(transactionWithgatewayId);

      // If waitForPolling is true (Step Functions context), wait for polling to complete
      // Otherwise, start polling in background (non-blocking) for direct execution
      if (waitForPolling) {
        this.logger.debug(
          `Waiting for payment polling to complete for transaction: ${gatewayTransactionId}`,
          'ProcessPaymentUseCase',
        );
        await this.pollPaymentStatus(transactionId, gatewayTransactionId);

        // After polling completes, get the updated transaction
        const updatedTransaction =
          await this.transactionRepository.findById(transactionId);

        if (!updatedTransaction) {
          return {
            success: false,
            error: 'Transaction not found after polling',
          };
        }

        return {
          success: true,
          data: {
            transaction: updatedTransaction,
            gatewayResponse: gatewayResponse.data,
            status: updatedTransaction.status,
          },
        };
      } else {
        // Start polling in background (non-blocking) for direct execution
        this.pollPaymentStatus(transactionId, gatewayTransactionId).catch(
          (error) => {
            this.logger.error(
              `Error in payment polling for transaction ${transactionId}`,
              error instanceof Error ? error.stack : String(error),
              'ProcessPaymentUseCase',
            );
          },
        );

        // Return immediately with PENDING status
        return {
          success: true,
          data: {
            transaction,
            gatewayResponse: gatewayResponse.data,
            status: 'PENDING',
          },
        };
      }
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

  /**
   * Hace polling del estado de la transacción en gateway hasta que cambie de PENDING
   * o se alcance el tiempo máximo configurado
   */
  private async pollPaymentStatus(
    transactionId: string,
    gatewayTransactionId: string,
  ): Promise<void> {
    const pollingInterval = this.configService.get<number>(
      'PAYMENT_POLLING_INTERVAL_MS',
      10000,
    ); // Default 10 seconds
    const maxDuration = this.configService.get<number>(
      'PAYMENT_POLLING_MAX_DURATION_MS',
      120000,
    ); // Default 2 minutes

    const startTime = Date.now();
    let pollCount = 0;

    this.logger.debug(
      `Starting payment status polling for gateway transaction: ${gatewayTransactionId}`,
      'ProcessPaymentUseCase',
    );

    while (Date.now() - startTime < maxDuration) {
      try {
        pollCount++;
        await new Promise((resolve) => setTimeout(resolve, pollingInterval));

        const statusResponse =
          await this.gatewayAdapter.getPaymentStatus(gatewayTransactionId);

        const status = statusResponse.data.status;

        this.logger.debug(
          `Poll ${pollCount}: Payment status for ${gatewayTransactionId} is ${status}`,
          'ProcessPaymentUseCase',
        );

        // If status is no longer PENDING, update transaction and continue workflow
        if (status !== 'PENDING') {
          this.logger.debug(
            `Payment status changed to ${status}, updating transaction and continuing workflow`,
            'ProcessPaymentUseCase',
          );

          const transaction =
            await this.transactionRepository.findById(transactionId);

          if (!transaction) {
            this.logger.error(
              `Transaction ${transactionId} not found during polling`,
              'ProcessPaymentUseCase',
            );
            return;
          }

          let updatedTransaction: any;
          if (status === 'APPROVED') {
            updatedTransaction = transaction.approve(gatewayTransactionId);
          } else if (['DECLINED', 'VOIDED', 'ERROR'].includes(status)) {
            updatedTransaction = transaction.decline(
              statusResponse.data.status_message ||
                `Payment ${status.toLowerCase()}`,
            );
          }

          if (updatedTransaction) {
            await this.transactionRepository.update(updatedTransaction);

            // Store event
            await this.eventStoreService.storeEvent({
              aggregateId: transaction.id,
              eventType: 'PaymentProcessed',
              eventData: {
                transactionId: transaction.id,
                gatewayTransactionId,
                status,
              },
              timestamp: new Date(),
            });

            // Publish to SNS
            await this.snsService.publish({
              eventType: 'PaymentProcessed',
              transactionId: transaction.id,
              status,
              gatewayTransactionId,
            });

            // Continue workflow: Update Inventory if approved
            if (status === 'APPROVED') {
              const inventoryResult = await this.updateInventoryUseCase.execute(
                transaction.productId,
                1, // Assuming 1 unit per transaction
              );

              if (!inventoryResult.success) {
                this.logger.error(
                  `Inventory update failed for transaction ${transaction.id} after payment approval, compensating`,
                  'ProcessPaymentUseCase',
                );
                await this.compensateTransactionUseCase.execute(transaction.id);
              }
            }

            this.logger.debug(
              `Payment polling completed. Final status: ${status}`,
              'ProcessPaymentUseCase',
            );
            return;
          }
        }
      } catch (error) {
        this.logger.error(
          `Error polling payment status (attempt ${pollCount})`,
          error instanceof Error ? error.stack : String(error),
          'ProcessPaymentUseCase',
        );
        // Continue polling despite errors
      }
    }

    // Timeout reached
    this.logger.warn(
      `Payment polling timeout reached for transaction ${transactionId} (gateway ID: ${gatewayTransactionId}) after ${maxDuration}ms`,
      'ProcessPaymentUseCase',
    );
  }
}
