import reducer, { fetchProducts, fetchProduct } from './products-slice';
import { Product } from './products-slice';

describe('productsSlice', () => {
  const initialState = {
    products: [],
    loading: false,
    error: null,
  };

  it('should return the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('fetchProducts', () => {
    it('should handle pending state', () => {
      const action = { type: fetchProducts.pending.type };
      const state = reducer(initialState, action);
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle fulfilled state', () => {
      const products: Product[] = [
        {
          id: 'prod-001',
          name: 'Product 1',
          description: 'Description 1',
          price: 100000,
          imageUrl: 'https://example.com/image1.jpg',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];
      const action = {
        type: fetchProducts.fulfilled.type,
        payload: products,
      };
      const state = reducer(initialState, action);
      expect(state.loading).toBe(false);
      expect(state.products).toEqual(products);
    });

    it('should handle rejected state', () => {
      const action = {
        type: fetchProducts.rejected.type,
        error: { message: 'Network error' },
      };
      const state = reducer(initialState, action);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });

    it('should handle rejected state with no error message', () => {
      const action = {
        type: fetchProducts.rejected.type,
        error: {},
      };
      const state = reducer(initialState, action);
      expect(state.error).toBe('Failed to fetch products');
    });
  });

  describe('fetchProduct', () => {
    it('should update existing product', () => {
      const existingProduct: Product = {
        id: 'prod-001',
        name: 'Product 1',
        description: 'Description 1',
        price: 100000,
        imageUrl: 'https://example.com/image1.jpg',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const stateWithProduct = {
        ...initialState,
        products: [existingProduct],
      };

      const updatedProduct: Product = {
        ...existingProduct,
        name: 'Updated Product 1',
      };

      const action = {
        type: fetchProduct.fulfilled.type,
        payload: updatedProduct,
      };

      const state = reducer(stateWithProduct, action);
      expect(state.products[0].name).toBe('Updated Product 1');
    });

    it('should add new product if not exists', () => {
      const newProduct: Product = {
        id: 'prod-002',
        name: 'Product 2',
        description: 'Description 2',
        price: 200000,
        imageUrl: 'https://example.com/image2.jpg',
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      const action = {
        type: fetchProduct.fulfilled.type,
        payload: newProduct,
      };

      const state = reducer(initialState, action);
      expect(state.products).toHaveLength(1);
      expect(state.products[0]).toEqual(newProduct);
    });
  });
});
