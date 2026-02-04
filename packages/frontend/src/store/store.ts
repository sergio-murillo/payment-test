import { configureStore } from '@reduxjs/toolkit';
import productsReducer from './slices/products-slice';
import transactionReducer from './slices/transaction-slice';

export const store = configureStore({
  reducer: {
    products: productsReducer,
    transaction: transactionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
