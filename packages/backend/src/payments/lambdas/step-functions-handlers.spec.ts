import { Transaction } from '../../transactions/domain/transaction.entity';
import { TransactionStatus } from '../../transactions/domain/transaction-status.enum';

// Mock getNestJsContext before importing handlers
const mockTransactionRepository = {
  findById: jest.fn(),
};

const mockProcessPaymentUseCase = {
  executePaymentStep: jest.fn(),
};

const mockUpdateInventoryUseCase = {
  execute: jest.fn(),
};

const mockCompensateTransactionUseCase = {
  execute: jest.fn(),
};

jest.mock('./nestjs-context', () => ({
  getNestJsContext: jest.fn().mockResolvedValue({
    transactionRepository: mockTransactionRepository,
    processPaymentUseCase: mockProcessPaymentUseCase,
    updateInventoryUseCase: mockUpdateInventoryUseCase,
    compensateTransactionUseCase: mockCompensateTransactionUseCase,
  }),
}));

import {
  validateTransactionHandler,
  processPaymentHandler,
  updateInventoryHandler,
  compensateTransactionHandler,
} from './step-functions-handlers';

const createTransaction = (
  overrides: Partial<{
    id: string;
    productId: string;
    status: TransactionStatus;
  }> = {},
) =>
  new Transaction(
    overrides.id || 'trans-001',
    overrides.productId || 'prod-001',
    100000,
    3000,
    15000,
    118000,
    overrides.status || TransactionStatus.PENDING,
    'test@example.com',
    'Test User',
    'Test Address',
    'Bogotá',
    '+57 300 123 4567',
    'idempotency-key-123',
    new Date('2024-01-01'),
    new Date('2024-01-01'),
  );

describe('Step Functions Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateTransactionHandler', () => {
    it('should validate a pending transaction and return enriched input', async () => {
      const transaction = createTransaction();
      mockTransactionRepository.findById.mockResolvedValue(transaction);

      const result = await validateTransactionHandler({
        transactionId: 'trans-001',
        paymentToken: 'tok_123',
        installments: 1,
      });

      expect(result.isValid).toBe(true);
      expect(result.transactionId).toBe('trans-001');
      expect(result.paymentToken).toBe('tok_123');
      expect(result.productId).toBe('prod-001');
      expect(result.transaction).toBeDefined();
      expect(result.transaction.id).toBe('trans-001');
      expect(mockTransactionRepository.findById).toHaveBeenCalledWith(
        'trans-001',
      );
    });

    it('should extract input from event.Payload when transactionId is not at top level', async () => {
      const transaction = createTransaction();
      mockTransactionRepository.findById.mockResolvedValue(transaction);

      const result = await validateTransactionHandler({
        Payload: {
          transactionId: 'trans-001',
          paymentToken: 'tok_123',
        },
      });

      expect(result.isValid).toBe(true);
      expect(result.transactionId).toBe('trans-001');
    });

    it('should fall back to event itself when no Payload and no transactionId', async () => {
      await expect(
        validateTransactionHandler({ someOtherField: 'value' }),
      ).rejects.toThrow('transactionId is required');
    });

    it('should throw when transactionId is missing', async () => {
      await expect(validateTransactionHandler({})).rejects.toThrow(
        'transactionId is required',
      );
    });

    it('should throw when transaction is not found', async () => {
      mockTransactionRepository.findById.mockResolvedValue(null);

      await expect(
        validateTransactionHandler({ transactionId: 'trans-999' }),
      ).rejects.toThrow('Transaction trans-999 not found');
    });

    it('should throw when transaction is not in PENDING status', async () => {
      const transaction = createTransaction({
        status: TransactionStatus.APPROVED,
      });
      mockTransactionRepository.findById.mockResolvedValue(transaction);

      await expect(
        validateTransactionHandler({ transactionId: 'trans-001' }),
      ).rejects.toThrow(
        'Transaction trans-001 is not in PENDING status. Current status: APPROVED',
      );
    });

    it('should use productId from transaction when available', async () => {
      const transaction = createTransaction({ productId: 'prod-from-tx' });
      mockTransactionRepository.findById.mockResolvedValue(transaction);

      const result = await validateTransactionHandler({
        transactionId: 'trans-001',
        productId: 'prod-from-input',
      });

      expect(result.productId).toBe('prod-from-tx');
    });

    it('should use productId from input when transaction has none', async () => {
      const transaction = createTransaction();
      // Override toPersistence to return no productId
      const persistence = transaction.toPersistence();
      delete persistence.productId;
      jest.spyOn(transaction, 'toPersistence').mockReturnValue(persistence);
      mockTransactionRepository.findById.mockResolvedValue(transaction);

      const result = await validateTransactionHandler({
        transactionId: 'trans-001',
        productId: 'prod-from-input',
      });

      expect(result.productId).toBe('prod-from-input');
    });
  });

  describe('processPaymentHandler', () => {
    it('should process payment successfully and return enriched result', async () => {
      mockProcessPaymentUseCase.executePaymentStep.mockResolvedValue({
        success: true,
        data: {
          transaction: {
            productId: 'prod-001',
            status: TransactionStatus.APPROVED,
            gatewayTransactionId: 'gateway-123',
          },
          gatewayResponse: {
            id: 'gateway-123',
            status: 'APPROVED',
          },
        },
      });

      const result = await processPaymentHandler({
        transactionId: 'trans-001',
        paymentToken: 'tok_123',
        installments: 3,
      });

      expect(result.transactionId).toBe('trans-001');
      expect(result.gatewayTransactionId).toBe('gateway-123');
      expect(result.status).toBe('APPROVED');
      expect(result.productId).toBe('prod-001');
      expect(
        mockProcessPaymentUseCase.executePaymentStep,
      ).toHaveBeenCalledWith('trans-001', 'tok_123', 3, true);
    });

    it('should use default installments=1 when not provided', async () => {
      mockProcessPaymentUseCase.executePaymentStep.mockResolvedValue({
        success: true,
        data: {
          transaction: { productId: 'prod-001' },
          gatewayResponse: { id: 'gateway-123', status: 'APPROVED' },
        },
      });

      await processPaymentHandler({
        transactionId: 'trans-001',
        paymentToken: 'tok_123',
      });

      expect(
        mockProcessPaymentUseCase.executePaymentStep,
      ).toHaveBeenCalledWith('trans-001', 'tok_123', 1, true);
    });

    it('should extract input from event.Payload', async () => {
      mockProcessPaymentUseCase.executePaymentStep.mockResolvedValue({
        success: true,
        data: {
          transaction: { productId: 'prod-001' },
          gatewayResponse: { id: 'gateway-123', status: 'APPROVED' },
        },
      });

      const result = await processPaymentHandler({
        Payload: {
          transactionId: 'trans-001',
          paymentToken: 'tok_123',
          installments: 2,
        },
      });

      expect(result.transactionId).toBe('trans-001');
      expect(
        mockProcessPaymentUseCase.executePaymentStep,
      ).toHaveBeenCalledWith('trans-001', 'tok_123', 2, true);
    });

    it('should throw when transactionId is missing', async () => {
      await expect(
        processPaymentHandler({ paymentToken: 'tok_123' }),
      ).rejects.toThrow('transactionId and paymentToken are required');
    });

    it('should throw when paymentToken is missing', async () => {
      await expect(
        processPaymentHandler({ transactionId: 'trans-001' }),
      ).rejects.toThrow('transactionId and paymentToken are required');
    });

    it('should throw when both transactionId and paymentToken are missing', async () => {
      await expect(processPaymentHandler({})).rejects.toThrow(
        'transactionId and paymentToken are required',
      );
    });

    it('should throw when payment processing fails with error message', async () => {
      mockProcessPaymentUseCase.executePaymentStep.mockResolvedValue({
        success: false,
        error: 'Card declined',
      });

      await expect(
        processPaymentHandler({
          transactionId: 'trans-001',
          paymentToken: 'tok_123',
        }),
      ).rejects.toThrow('Card declined');
    });

    it('should throw default message when payment fails without error message', async () => {
      mockProcessPaymentUseCase.executePaymentStep.mockResolvedValue({
        success: false,
      });

      await expect(
        processPaymentHandler({
          transactionId: 'trans-001',
          paymentToken: 'tok_123',
        }),
      ).rejects.toThrow('Failed to process payment');
    });

    it('should get status from transaction when gatewayResponse has no status', async () => {
      mockProcessPaymentUseCase.executePaymentStep.mockResolvedValue({
        success: true,
        data: {
          transaction: {
            productId: 'prod-001',
            status: 'DECLINED',
            gatewayTransactionId: 'gateway-456',
          },
          gatewayResponse: { id: 'gateway-456' },
        },
      });

      const result = await processPaymentHandler({
        transactionId: 'trans-001',
        paymentToken: 'tok_123',
      });

      expect(result.status).toBe('DECLINED');
    });

    it('should default status to PENDING when neither gatewayResponse nor transaction has status', async () => {
      mockProcessPaymentUseCase.executePaymentStep.mockResolvedValue({
        success: true,
        data: {
          transaction: { productId: 'prod-001' },
          gatewayResponse: {},
        },
      });

      const result = await processPaymentHandler({
        transactionId: 'trans-001',
        paymentToken: 'tok_123',
      });

      expect(result.status).toBe('PENDING');
    });

    it('should get gatewayTransactionId from transaction when gatewayResponse has no id', async () => {
      mockProcessPaymentUseCase.executePaymentStep.mockResolvedValue({
        success: true,
        data: {
          transaction: {
            productId: 'prod-001',
            gatewayTransactionId: 'gateway-from-tx',
          },
          gatewayResponse: { status: 'APPROVED' },
        },
      });

      const result = await processPaymentHandler({
        transactionId: 'trans-001',
        paymentToken: 'tok_123',
      });

      expect(result.gatewayTransactionId).toBe('gateway-from-tx');
    });

    it('should get productId from input.transaction when transaction data has no productId', async () => {
      mockProcessPaymentUseCase.executePaymentStep.mockResolvedValue({
        success: true,
        data: {
          transaction: {},
          gatewayResponse: { id: 'gateway-123', status: 'APPROVED' },
        },
      });

      const result = await processPaymentHandler({
        transactionId: 'trans-001',
        paymentToken: 'tok_123',
        transaction: { productId: 'prod-from-prev-step' },
      });

      expect(result.productId).toBe('prod-from-prev-step');
    });

    it('should get productId from input.productId as last fallback', async () => {
      mockProcessPaymentUseCase.executePaymentStep.mockResolvedValue({
        success: true,
        data: {
          transaction: {},
          gatewayResponse: { id: 'gateway-123', status: 'APPROVED' },
        },
      });

      const result = await processPaymentHandler({
        transactionId: 'trans-001',
        paymentToken: 'tok_123',
        productId: 'prod-from-input',
      });

      expect(result.productId).toBe('prod-from-input');
    });

    it('should handle null data gracefully', async () => {
      mockProcessPaymentUseCase.executePaymentStep.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await processPaymentHandler({
        transactionId: 'trans-001',
        paymentToken: 'tok_123',
      });

      expect(result.transactionId).toBe('trans-001');
      expect(result.status).toBe('PENDING');
      expect(result.gatewayTransactionId).toBeUndefined();
    });
  });

  describe('updateInventoryHandler', () => {
    it('should update inventory when payment is APPROVED', async () => {
      mockUpdateInventoryUseCase.execute.mockResolvedValue({
        success: true,
        data: { quantity: 9 },
      });

      const result = await updateInventoryHandler({
        transactionId: 'trans-001',
        productId: 'prod-001',
        status: 'APPROVED',
      });

      expect(result.inventoryUpdated).toBe(true);
      expect(result.productId).toBe('prod-001');
      expect(result.newQuantity).toBe(9);
      expect(mockUpdateInventoryUseCase.execute).toHaveBeenCalledWith(
        'prod-001',
        1,
      );
    });

    it('should skip inventory update when status is not APPROVED', async () => {
      const result = await updateInventoryHandler({
        transactionId: 'trans-001',
        productId: 'prod-001',
        status: 'DECLINED',
      });

      expect(result.inventoryUpdated).toBe(false);
      expect(result.reason).toContain('DECLINED');
      expect(result.reason).toContain('skipping inventory update');
      expect(mockUpdateInventoryUseCase.execute).not.toHaveBeenCalled();
    });

    it('should skip inventory update when status is PENDING', async () => {
      const result = await updateInventoryHandler({
        transactionId: 'trans-001',
        status: 'PENDING',
      });

      expect(result.inventoryUpdated).toBe(false);
      expect(mockUpdateInventoryUseCase.execute).not.toHaveBeenCalled();
    });

    it('should extract input from event.Payload', async () => {
      mockUpdateInventoryUseCase.execute.mockResolvedValue({
        success: true,
        data: { quantity: 5 },
      });

      const result = await updateInventoryHandler({
        Payload: {
          transactionId: 'trans-001',
          productId: 'prod-001',
          status: 'APPROVED',
        },
      });

      expect(result.inventoryUpdated).toBe(true);
      expect(result.newQuantity).toBe(5);
    });

    it('should throw when productId is missing for APPROVED payment', async () => {
      await expect(
        updateInventoryHandler({
          transactionId: 'trans-001',
          status: 'APPROVED',
        }),
      ).rejects.toThrow('productId is required for inventory update');
    });

    it('should throw when inventory update fails with error message', async () => {
      mockUpdateInventoryUseCase.execute.mockResolvedValue({
        success: false,
        error: 'Out of stock',
      });

      await expect(
        updateInventoryHandler({
          transactionId: 'trans-001',
          productId: 'prod-001',
          status: 'APPROVED',
        }),
      ).rejects.toThrow('Out of stock');
    });

    it('should throw default message when inventory update fails without error', async () => {
      mockUpdateInventoryUseCase.execute.mockResolvedValue({
        success: false,
      });

      await expect(
        updateInventoryHandler({
          transactionId: 'trans-001',
          productId: 'prod-001',
          status: 'APPROVED',
        }),
      ).rejects.toThrow('Failed to update inventory');
    });

    it('should fall back to event itself when no Payload and no transactionId', async () => {
      const result = await updateInventoryHandler({
        status: 'DECLINED',
        productId: 'prod-001',
      });

      expect(result.inventoryUpdated).toBe(false);
      expect(result.reason).toContain('DECLINED');
    });

    it('should handle newQuantity being undefined', async () => {
      mockUpdateInventoryUseCase.execute.mockResolvedValue({
        success: true,
        data: {},
      });

      const result = await updateInventoryHandler({
        transactionId: 'trans-001',
        productId: 'prod-001',
        status: 'APPROVED',
      });

      expect(result.inventoryUpdated).toBe(true);
      expect(result.newQuantity).toBeUndefined();
    });
  });

  describe('compensateTransactionHandler', () => {
    it('should compensate transaction successfully', async () => {
      mockCompensateTransactionUseCase.execute.mockResolvedValue({
        success: true,
        data: {},
      });

      const result = await compensateTransactionHandler({
        transactionId: 'trans-001',
      });

      expect(result.transactionId).toBe('trans-001');
      expect(result.compensated).toBe(true);
      expect(
        mockCompensateTransactionUseCase.execute,
      ).toHaveBeenCalledWith('trans-001');
    });

    it('should extract input from event.Payload', async () => {
      mockCompensateTransactionUseCase.execute.mockResolvedValue({
        success: true,
        data: {},
      });

      const result = await compensateTransactionHandler({
        Payload: {
          transactionId: 'trans-001',
        },
      });

      expect(result.transactionId).toBe('trans-001');
      expect(result.compensated).toBe(true);
    });

    it('should throw when transactionId is missing', async () => {
      await expect(compensateTransactionHandler({})).rejects.toThrow(
        'transactionId is required for compensation',
      );
    });

    it('should throw when compensation fails with error message', async () => {
      mockCompensateTransactionUseCase.execute.mockResolvedValue({
        success: false,
        error: 'Transaction already cancelled',
      });

      await expect(
        compensateTransactionHandler({ transactionId: 'trans-001' }),
      ).rejects.toThrow('Transaction already cancelled');
    });

    it('should throw default message when compensation fails without error', async () => {
      mockCompensateTransactionUseCase.execute.mockResolvedValue({
        success: false,
      });

      await expect(
        compensateTransactionHandler({ transactionId: 'trans-001' }),
      ).rejects.toThrow('Failed to compensate transaction');
    });

    it('should preserve extra input fields in the returned result', async () => {
      mockCompensateTransactionUseCase.execute.mockResolvedValue({
        success: true,
        data: {},
      });

      const result = await compensateTransactionHandler({
        transactionId: 'trans-001',
        gatewayTransactionId: 'gateway-123',
        status: 'ERROR',
      });

      expect(result.transactionId).toBe('trans-001');
      expect(result.compensated).toBe(true);
      expect(result.gatewayTransactionId).toBe('gateway-123');
      expect(result.status).toBe('ERROR');
    });
  });
});
