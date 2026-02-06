import { Transaction } from './transaction.entity';
import { TransactionStatus } from './transaction-status.enum';

describe('Transaction Entity', () => {
  const baseTransactionData = {
    id: 'trans-001',
    productId: 'prod-001',
    amount: 100000,
    commission: 3000,
    shippingCost: 15000,
    totalAmount: 118000,
    status: TransactionStatus.PENDING,
    customerEmail: 'test@example.com',
    customerName: 'Test User',
    deliveryAddress: 'Test Address',
    deliveryCity: 'Bogotá',
    deliveryPhone: '+57 300 123 4567',
    idempotencyKey: 'key-001',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  describe('fromPersistence', () => {
    it('should create Transaction from persistence data', () => {
      const data = {
        ...baseTransactionData,
        createdAt: baseTransactionData.createdAt.toISOString(),
        updatedAt: baseTransactionData.updatedAt.toISOString(),
      };

      const transaction = Transaction.fromPersistence(data);

      expect(transaction).toBeInstanceOf(Transaction);
      expect(transaction.id).toBe('trans-001');
      expect(transaction.status).toBe(TransactionStatus.PENDING);
    });

    it('should handle optional fields', () => {
      const data = {
        ...baseTransactionData,
        gatewayTransactionId: 'gateway-123',
        errorMessage: 'Test error',
        createdAt: baseTransactionData.createdAt.toISOString(),
        updatedAt: baseTransactionData.updatedAt.toISOString(),
      };

      const transaction = Transaction.fromPersistence(data);

      expect(transaction.gatewayTransactionId).toBe('gateway-123');
      expect(transaction.errorMessage).toBe('Test error');
    });
  });

  describe('toPersistence', () => {
    it('should convert Transaction to persistence format', () => {
      const transaction = new Transaction(
        baseTransactionData.id,
        baseTransactionData.productId,
        baseTransactionData.amount,
        baseTransactionData.commission,
        baseTransactionData.shippingCost,
        baseTransactionData.totalAmount,
        baseTransactionData.status,
        baseTransactionData.customerEmail,
        baseTransactionData.customerName,
        baseTransactionData.deliveryAddress,
        baseTransactionData.deliveryCity,
        baseTransactionData.deliveryPhone,
        baseTransactionData.idempotencyKey,
        baseTransactionData.createdAt,
        baseTransactionData.updatedAt,
      );

      const data = transaction.toPersistence();

      expect(data.id).toBe('trans-001');
      expect(data.status).toBe(TransactionStatus.PENDING);
      expect(data.createdAt).toBe(baseTransactionData.createdAt.toISOString());
      expect(data.updatedAt).toBe(baseTransactionData.updatedAt.toISOString());
    });

    it('should exclude undefined optional fields', () => {
      const transaction = new Transaction(
        baseTransactionData.id,
        baseTransactionData.productId,
        baseTransactionData.amount,
        baseTransactionData.commission,
        baseTransactionData.shippingCost,
        baseTransactionData.totalAmount,
        baseTransactionData.status,
        baseTransactionData.customerEmail,
        baseTransactionData.customerName,
        baseTransactionData.deliveryAddress,
        baseTransactionData.deliveryCity,
        baseTransactionData.deliveryPhone,
        baseTransactionData.idempotencyKey,
        baseTransactionData.createdAt,
        baseTransactionData.updatedAt,
      );

      const data = transaction.toPersistence();

      expect(data).not.toHaveProperty('gatewayTransactionId');
      expect(data).not.toHaveProperty('errorMessage');
    });

    it('should include optional fields when defined', () => {
      const transaction = new Transaction(
        baseTransactionData.id,
        baseTransactionData.productId,
        baseTransactionData.amount,
        baseTransactionData.commission,
        baseTransactionData.shippingCost,
        baseTransactionData.totalAmount,
        baseTransactionData.status,
        baseTransactionData.customerEmail,
        baseTransactionData.customerName,
        baseTransactionData.deliveryAddress,
        baseTransactionData.deliveryCity,
        baseTransactionData.deliveryPhone,
        baseTransactionData.idempotencyKey,
        baseTransactionData.createdAt,
        baseTransactionData.updatedAt,
        'gateway-123',
        'Test error',
      );

      const data = transaction.toPersistence();

      expect(data.gatewayTransactionId).toBe('gateway-123');
      expect(data.errorMessage).toBe('Test error');
    });
  });

  describe('approve', () => {
    it('should create approved transaction with gatewayTransactionId', () => {
      const transaction = new Transaction(
        baseTransactionData.id,
        baseTransactionData.productId,
        baseTransactionData.amount,
        baseTransactionData.commission,
        baseTransactionData.shippingCost,
        baseTransactionData.totalAmount,
        baseTransactionData.status,
        baseTransactionData.customerEmail,
        baseTransactionData.customerName,
        baseTransactionData.deliveryAddress,
        baseTransactionData.deliveryCity,
        baseTransactionData.deliveryPhone,
        baseTransactionData.idempotencyKey,
        baseTransactionData.createdAt,
        baseTransactionData.updatedAt,
      );

      const approved = transaction.approve('gateway-123');

      expect(approved.status).toBe(TransactionStatus.APPROVED);
      expect(approved.gatewayTransactionId).toBe('gateway-123');
      expect(approved.id).toBe(transaction.id);
      expect(approved.updatedAt.getTime()).toBeGreaterThan(
        transaction.updatedAt.getTime(),
      );
    });
  });

  describe('decline', () => {
    it('should create declined transaction with error message', () => {
      const transaction = new Transaction(
        baseTransactionData.id,
        baseTransactionData.productId,
        baseTransactionData.amount,
        baseTransactionData.commission,
        baseTransactionData.shippingCost,
        baseTransactionData.totalAmount,
        baseTransactionData.status,
        baseTransactionData.customerEmail,
        baseTransactionData.customerName,
        baseTransactionData.deliveryAddress,
        baseTransactionData.deliveryCity,
        baseTransactionData.deliveryPhone,
        baseTransactionData.idempotencyKey,
        baseTransactionData.createdAt,
        baseTransactionData.updatedAt,
        'gateway-123',
      );

      const declined = transaction.decline('Payment declined');

      expect(declined.status).toBe(TransactionStatus.DECLINED);
      expect(declined.errorMessage).toBe('Payment declined');
      expect(declined.gatewayTransactionId).toBe('gateway-123');
      expect(declined.id).toBe(transaction.id);
      expect(declined.updatedAt.getTime()).toBeGreaterThan(
        transaction.updatedAt.getTime(),
      );
    });
  });

  describe('cancel', () => {
    it('should create cancelled transaction', () => {
      const transaction = new Transaction(
        baseTransactionData.id,
        baseTransactionData.productId,
        baseTransactionData.amount,
        baseTransactionData.commission,
        baseTransactionData.shippingCost,
        baseTransactionData.totalAmount,
        baseTransactionData.status,
        baseTransactionData.customerEmail,
        baseTransactionData.customerName,
        baseTransactionData.deliveryAddress,
        baseTransactionData.deliveryCity,
        baseTransactionData.deliveryPhone,
        baseTransactionData.idempotencyKey,
        baseTransactionData.createdAt,
        baseTransactionData.updatedAt,
        'gateway-123',
      );

      const cancelled = transaction.cancel();

      expect(cancelled.status).toBe(TransactionStatus.CANCELLED);
      expect(cancelled.gatewayTransactionId).toBe('gateway-123');
      expect(cancelled.id).toBe(transaction.id);
      expect(cancelled.updatedAt.getTime()).toBeGreaterThan(
        transaction.updatedAt.getTime(),
      );
    });
  });

  describe('setGatewayTransactionId', () => {
    it('should set gatewayTransactionId without changing status', () => {
      const transaction = new Transaction(
        baseTransactionData.id,
        baseTransactionData.productId,
        baseTransactionData.amount,
        baseTransactionData.commission,
        baseTransactionData.shippingCost,
        baseTransactionData.totalAmount,
        baseTransactionData.status,
        baseTransactionData.customerEmail,
        baseTransactionData.customerName,
        baseTransactionData.deliveryAddress,
        baseTransactionData.deliveryCity,
        baseTransactionData.deliveryPhone,
        baseTransactionData.idempotencyKey,
        baseTransactionData.createdAt,
        baseTransactionData.updatedAt,
      );

      const updated = transaction.setGatewayTransactionId('gateway-456');

      expect(updated.gatewayTransactionId).toBe('gateway-456');
      expect(updated.status).toBe(TransactionStatus.PENDING);
      expect(updated.id).toBe(transaction.id);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(
        transaction.updatedAt.getTime(),
      );
    });

    it('should preserve errorMessage when setting gatewayTransactionId', () => {
      const transaction = new Transaction(
        baseTransactionData.id,
        baseTransactionData.productId,
        baseTransactionData.amount,
        baseTransactionData.commission,
        baseTransactionData.shippingCost,
        baseTransactionData.totalAmount,
        baseTransactionData.status,
        baseTransactionData.customerEmail,
        baseTransactionData.customerName,
        baseTransactionData.deliveryAddress,
        baseTransactionData.deliveryCity,
        baseTransactionData.deliveryPhone,
        baseTransactionData.idempotencyKey,
        baseTransactionData.createdAt,
        baseTransactionData.updatedAt,
        undefined,
        'Previous error',
      );

      const updated = transaction.setGatewayTransactionId('gateway-789');

      expect(updated.errorMessage).toBe('Previous error');
      expect(updated.gatewayTransactionId).toBe('gateway-789');
    });
  });
});
