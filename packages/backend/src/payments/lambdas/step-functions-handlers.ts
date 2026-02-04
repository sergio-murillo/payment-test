export const validateTransactionHandler = async (event: any) => {
  // Validate transaction exists and is in correct state
  return {
    transactionId: event.transactionId,
    isValid: true,
  };
};

export const processPaymentHandler = async (event: any) => {
  return {
    transactionId: event.transactionId,
    wompiTransactionId: 'wompi_123',
    status: 'APPROVED',
  };
};

export const updateInventoryHandler = async (event: any) => {
  // This would be injected via dependency injection in a real Lambda
  return {
    productId: event.productId,
    quantity: 1,
    success: true,
  };
};

export const compensateTransactionHandler = async (event: any) => {
  // This would be injected via dependency injection in a real Lambda
  return {
    transactionId: event.transactionId,
    compensated: true,
  };
};
