import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '@/services/api-client';

export interface Transaction {
  id: string;
  productId: string;
  amount: number;
  commission: number;
  shippingCost: number;
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR' | 'CANCELLED';
  customerEmail: string;
  customerName: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryPhone: string;
  gatewayTransactionId?: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

interface TransactionState {
  currentTransaction: Transaction | null;
  loading: boolean;
  error: string | null;
}

const initialState: TransactionState = {
  currentTransaction: null,
  loading: false,
  error: null,
};

export const createTransaction = createAsyncThunk(
  'transaction/createTransaction',
  async (transactionData: any) => {
    const response = await apiClient.post('/transactions', transactionData);
    return response.data.data;
  },
);

export const fetchTransaction = createAsyncThunk(
  'transaction/fetchTransaction',
  async (transactionId: string) => {
    const response = await apiClient.get(`/transactions/${transactionId}`);
    return response.data.data;
  },
);

export const processPayment = createAsyncThunk(
  'transaction/processPayment',
  async (paymentData: any) => {
    const response = await apiClient.post('/payments/process', paymentData);
    return response.data.data;
  },
);

const transactionSlice = createSlice({
  name: 'transaction',
  initialState,
  reducers: {
    clearTransaction: (state) => {
      state.currentTransaction = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createTransaction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTransaction.fulfilled, (state, action: PayloadAction<Transaction>) => {
        state.loading = false;
        state.currentTransaction = action.payload;
      })
      .addCase(createTransaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create transaction';
      })
      .addCase(fetchTransaction.fulfilled, (state, action: PayloadAction<Transaction>) => {
        state.currentTransaction = action.payload;
      })
      .addCase(processPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(processPayment.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(processPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to process payment';
      });
  },
});

export const { clearTransaction } = transactionSlice.actions;
export default transactionSlice.reducer;
