import reducer, { createTransaction, fetchTransaction, processPayment, clearTransaction } from './transaction-slice';
import { Transaction } from './transaction-slice';
import { configureStore } from '@reduxjs/toolkit';

jest.mock('@/services/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import { apiClient } from '@/services/api-client';
const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;

describe('transactionSlice', () => {
  const initialState = {
    currentTransaction: null,
    loading: false,
    error: null,
  };

  it('should return the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('clearTransaction', () => {
    it('should clear transaction and error', () => {
      const stateWithTransaction = {
        currentTransaction: {
          id: 'trans-001',
          productId: 'prod-001',
          amount: 100000,
          commission: 3000,
          shippingCost: 15000,
          totalAmount: 118000,
          status: 'PENDING' as const,
          customerEmail: 'test@example.com',
          customerName: 'Test User',
          deliveryAddress: 'Test Address',
          deliveryCity: 'Bogotá',
          deliveryPhone: '+57 300 123 4567',
          idempotencyKey: 'key-123',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        loading: false,
        error: 'Some error',
      };

      const action = { type: clearTransaction.type };
      const state = reducer(stateWithTransaction, action);
      expect(state.currentTransaction).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe('createTransaction', () => {
    it('should handle pending state', () => {
      const action = { type: createTransaction.pending.type };
      const state = reducer(initialState, action);
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle fulfilled state', () => {
      const transaction: Transaction = {
        id: 'trans-001',
        productId: 'prod-001',
        amount: 100000,
        commission: 3000,
        shippingCost: 15000,
        totalAmount: 118000,
        status: 'PENDING',
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        deliveryAddress: 'Test Address',
        deliveryCity: 'Bogotá',
        deliveryPhone: '+57 300 123 4567',
        idempotencyKey: 'key-123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const action = {
        type: createTransaction.fulfilled.type,
        payload: transaction,
      };
      const state = reducer(initialState, action);
      expect(state.loading).toBe(false);
      expect(state.currentTransaction).toEqual(transaction);
    });

    it('should handle rejected state', () => {
      const action = {
        type: createTransaction.rejected.type,
        error: { message: 'Network error' },
      };
      const state = reducer(initialState, action);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });

    it('should handle rejected state with no error message', () => {
      const action = {
        type: createTransaction.rejected.type,
        error: {},
      };
      const state = reducer(initialState, action);
      expect(state.error).toBe('Failed to create transaction');
    });
  });

  describe('fetchTransaction', () => {
    it('should handle fulfilled state', () => {
      const transaction: Transaction = {
        id: 'trans-001',
        productId: 'prod-001',
        amount: 100000,
        commission: 3000,
        shippingCost: 15000,
        totalAmount: 118000,
        status: 'APPROVED',
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        deliveryAddress: 'Test Address',
        deliveryCity: 'Bogotá',
        deliveryPhone: '+57 300 123 4567',
        idempotencyKey: 'key-123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const action = {
        type: fetchTransaction.fulfilled.type,
        payload: transaction,
      };
      const state = reducer(initialState, action);
      expect(state.currentTransaction).toEqual(transaction);
    });
  });

  describe('processPayment', () => {
    it('should handle pending state', () => {
      const action = { type: processPayment.pending.type };
      const state = reducer(initialState, action);
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle fulfilled state', () => {
      const action = { type: processPayment.fulfilled.type };
      const state = reducer(initialState, action);
      expect(state.loading).toBe(false);
    });

    it('should handle rejected state', () => {
      const action = {
        type: processPayment.rejected.type,
        error: { message: 'Payment failed' },
      };
      const state = reducer(initialState, action);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Payment failed');
    });

    it('should handle rejected state with no error message', () => {
      const action = {
        type: processPayment.rejected.type,
        error: {},
      };
      const state = reducer(initialState, action);
      expect(state.error).toBe('Failed to process payment');
    });
  });

  describe('async thunk bodies', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('createTransaction should call apiClient.post and return data', async () => {
      const txData = { productId: 'prod-001', amount: 100000 };
      const txResult = { id: 'trans-001', ...txData, status: 'PENDING' };
      mockPost.mockResolvedValue({ data: { data: txResult } });

      const store = configureStore({ reducer: { transaction: reducer } });
      await store.dispatch(createTransaction(txData));

      expect(mockPost).toHaveBeenCalledWith('/transactions', txData);
      expect(store.getState().transaction.currentTransaction).toEqual(txResult);
    });

    it('fetchTransaction should call apiClient.get and return data', async () => {
      const txResult = { id: 'trans-001', status: 'APPROVED' };
      mockGet.mockResolvedValue({ data: { data: txResult } });

      const store = configureStore({ reducer: { transaction: reducer } });
      await store.dispatch(fetchTransaction('trans-001'));

      expect(mockGet).toHaveBeenCalledWith('/transactions/trans-001');
      expect(store.getState().transaction.currentTransaction).toEqual(txResult);
    });

    it('processPayment should call apiClient.post and return data', async () => {
      const paymentData = { transactionId: 'trans-001', cardNumber: '4242424242424242' };
      const paymentResult = { success: true };
      mockPost.mockResolvedValue({ data: { data: paymentResult } });

      const store = configureStore({ reducer: { transaction: reducer } });
      await store.dispatch(processPayment(paymentData));

      expect(mockPost).toHaveBeenCalledWith('/payments/process', paymentData);
      expect(store.getState().transaction.loading).toBe(false);
    });
  });
});
