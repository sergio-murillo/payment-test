import { render, screen } from '@testing-library/react';
import Home from './page';

const mockPush = jest.fn();
const mockDispatch = jest.fn().mockReturnValue({ unwrap: () => Promise.resolve() });

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: jest.fn(),
}));

jest.mock('@/store/slices/products-slice', () => ({
  fetchProducts: jest.fn(() => ({ type: 'products/fetchProducts' })),
}));

jest.mock('@/components/product-card', () => ({
  ProductCard: ({ product, onClick }: any) => (
    <div data-testid={`product-${product.id}`} onClick={onClick}>
      {product.name}
    </div>
  ),
}));

jest.mock('@/components/product-card-skeleton', () => ({
  ProductCardSkeletonGrid: ({ count }: any) => (
    <div data-testid="skeleton-grid">Loading {count}</div>
  ),
}));

import { useAppSelector } from '@/store/hooks';
const mockUseAppSelector = useAppSelector as jest.Mock;

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render products when loaded', () => {
    mockUseAppSelector.mockReturnValue({
      products: [
        {
          id: 'prod-001',
          name: 'Product 1',
          price: 100000,
          description: 'Desc',
          imageUrl: 'https://example.com/img.jpg',
          categoria: 'Test',
          metadata: {},
          rating: 4.5,
          stock: 10,
          createdAt: '',
          updatedAt: '',
        },
      ],
      loading: false,
      error: null,
    });

    render(<Home />);

    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Productos Disponibles')).toBeInTheDocument();
  });

  it('should show loading skeletons when loading', () => {
    mockUseAppSelector.mockReturnValue({
      products: [],
      loading: true,
      error: null,
    });

    render(<Home />);

    expect(screen.getByTestId('skeleton-grid')).toBeInTheDocument();
  });

  it('should show error alert when error occurs', () => {
    mockUseAppSelector.mockReturnValue({
      products: [],
      loading: false,
      error: 'Failed to load',
    });

    render(<Home />);

    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('should dispatch fetchProducts on mount', () => {
    mockUseAppSelector.mockReturnValue({
      products: [],
      loading: false,
      error: null,
    });

    render(<Home />);

    expect(mockDispatch).toHaveBeenCalled();
  });

  it('should navigate to product page on click', () => {
    mockUseAppSelector.mockReturnValue({
      products: [
        {
          id: 'prod-001',
          name: 'Product 1',
          price: 100000,
          description: 'Desc',
          imageUrl: 'https://example.com/img.jpg',
          categoria: 'Test',
          metadata: {},
          rating: 4.5,
          stock: 10,
          createdAt: '',
          updatedAt: '',
        },
      ],
      loading: false,
      error: null,
    });

    render(<Home />);

    screen.getByTestId('product-prod-001').click();
    expect(mockPush).toHaveBeenCalledWith('/product/prod-001');
  });
});
