import { getNestJsContext } from './nestjs-context';
import { TransactionStatus } from '../../transactions/domain/transaction-status.enum';

/**
 * Validates that the transaction exists and is in PENDING status
 */
export const validateTransactionHandler = async (event: any) => {
  const { transactionRepository } = await getNestJsContext();

  // Step Functions passes the input directly when using Payload.$: "$"
  const input = event.transactionId ? event : event.Payload || event;
  const transactionId = input.transactionId;

  if (!transactionId) {
    throw new Error('transactionId is required');
  }

  const transaction = await transactionRepository.findById(transactionId);
  if (!transaction) {
    throw new Error(`Transaction ${transactionId} not found`);
  }

  if (transaction.status !== TransactionStatus.PENDING) {
    throw new Error(
      `Transaction ${transactionId} is not in PENDING status. Current status: ${transaction.status}`,
    );
  }

  // Return the input data plus transaction info for next steps
  const transactionData = transaction.toPersistence();
  return {
    ...input,
    transaction: transactionData,
    productId: transactionData.productId || input.productId, // Ensure productId is available
    isValid: true,
  };
};

/**
 * Processes the payment with Wompi
 */
export const processPaymentHandler = async (event: any) => {
  const { processPaymentUseCase } = await getNestJsContext();

  // Step Functions passes the result from previous step
  const input = event.transactionId ? event : event.Payload || event;

  const { transactionId, paymentToken, installments } = input;
  if (!transactionId || !paymentToken) {
    throw new Error('transactionId and paymentToken are required');
  }
  // Use the use case to process payment
  // waitForPolling = true because we're in Step Functions context and need to wait for completion
  const result = await processPaymentUseCase.executePaymentStep(
    transactionId,
    paymentToken,
    installments || 1,
    true, // waitForPolling = true for Step Functions
  );

  if (!result.success) {
    throw new Error(result.error || 'Failed to process payment');
  }

  // Extract status from result
  const transaction = result.data?.transaction;
  const wompiResponse = result.data?.wompiResponse;
  const status = wompiResponse?.status || transaction?.status || 'PENDING';
  const wompiTransactionId =
    wompiResponse?.id || transaction?.wompiTransactionId;

  // Get productId from transaction or input (it should be in input from validateTransactionHandler)
  const productId =
    transaction?.productId || input.transaction?.productId || input.productId;

  // Return data for next step
  return {
    ...input,
    transactionId,
    wompiTransactionId,
    status,
    productId,
  };
};

/**
 * Updates inventory for the product
 */
export const updateInventoryHandler = async (event: any) => {
  const { updateInventoryUseCase } = await getNestJsContext();

  // Step Functions passes the result from previous step
  const input = event.transactionId ? event : event.Payload || event;
  const { productId, status } = input;

  // Only update inventory if payment was approved
  if (status !== 'APPROVED') {
    return {
      ...input,
      inventoryUpdated: false,
      reason: `Payment status is ${status}, skipping inventory update`,
    };
  }

  if (!productId) {
    throw new Error('productId is required for inventory update');
  }

  // Use the use case to update inventory
  const result = await updateInventoryUseCase.execute(productId, 1);

  if (!result.success) {
    throw new Error(result.error || 'Failed to update inventory');
  }

  return {
    ...input,
    inventoryUpdated: true,
    productId,
    newQuantity: result.data?.quantity,
  };
};

/**
 * Compensates the transaction (rollback)
 */
export const compensateTransactionHandler = async (event: any) => {
  const { compensateTransactionUseCase } = await getNestJsContext();

  // Step Functions passes the result from previous step
  const input = event.transactionId ? event : event.Payload || event;
  const transactionId = input.transactionId;

  if (!transactionId) {
    throw new Error('transactionId is required for compensation');
  }

  // Use the use case to compensate transaction
  const result = await compensateTransactionUseCase.execute(transactionId);

  if (!result.success) {
    throw new Error(result.error || 'Failed to compensate transaction');
  }

  return {
    ...input,
    transactionId,
    compensated: true,
  };
};
