import { store } from './store';

describe('store', () => {
  it('should be configured with products and transaction reducers', () => {
    const state = store.getState();
    expect(state).toHaveProperty('products');
    expect(state).toHaveProperty('transaction');
  });

  it('should have correct initial state for products', () => {
    const state = store.getState();
    expect(state.products).toEqual({
      products: [],
      loading: false,
      error: null,
    });
  });

  it('should have correct initial state for transaction', () => {
    const state = store.getState();
    expect(state.transaction).toEqual({
      currentTransaction: null,
      loading: false,
      error: null,
    });
  });
});
