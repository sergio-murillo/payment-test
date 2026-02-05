import { render, screen } from '@testing-library/react';
import ProductPage from './page';

const mockPush = jest.fn();
const mockDispatch = jest.fn().mockReturnValue({ unwrap: () => Promise.resolve() });

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: 'prod-001' }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: jest.fn(),
}));

jest.mock('@/store/slices/products-slice', () => ({
  fetchProduct: jest.fn((id: string) => ({
    type: 'products/fetchProduct',
    payload: id,
  })),
}));

jest.mock('@/store/slices/transaction-slice', () => ({
  createTransaction: jest.fn(),
}));

jest.mock('@/components/product-details', () => ({
  ProductDetails: ({ product, onPayClick }: any) => (
    <div data-testid="product-details">
      <span>{product.name}</span>
      <button onClick={onPayClick}>Pay</button>
    </div>
  ),
}));

jest.mock('@/components/product-detail-skeleton', () => ({
  ProductDetailSkeleton: () => <div data-testid="skeleton">Loading...</div>,
}));

import { useAppSelector } from '@/store/hooks';
const mockUseAppSelector = useAppSelector as jest.Mock;

const mockProduct = {
  id: 'prod-001',
  name: 'Test Product',
  price: 100000,
  description: 'Desc',
  imageUrl: 'https://example.com/img.jpg',
  categoria: 'Test',
  metadata: {},
  rating: 4.5,
  stock: 10,
  createdAt: '',
  updatedAt: '',
};

describe('ProductPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render product details when product is found', () => {
    mockUseAppSelector.mockReturnValue({
      products: [mockProduct],
      loading: false,
    });

    render(<ProductPage />);

    expect(screen.getByTestId('product-details')).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('should show skeleton when loading', () => {
    mockUseAppSelector.mockReturnValue({
      products: [],
      loading: true,
    });

    render(<ProductPage />);

    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('should show error when product not found and not loading', () => {
    mockUseAppSelector.mockReturnValue({
      products: [],
      loading: false,
    });

    render(<ProductPage />);

    expect(screen.getByText('Producto no encontrado')).toBeInTheDocument();
  });

  it('should dispatch fetchProduct when product not in store', () => {
    mockUseAppSelector.mockReturnValue({
      products: [],
      loading: false,
    });

    render(<ProductPage />);

    expect(mockDispatch).toHaveBeenCalled();
  });

  it('should not dispatch fetchProduct when product exists', () => {
    mockUseAppSelector.mockReturnValue({
      products: [mockProduct],
      loading: false,
    });

    render(<ProductPage />);

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('should navigate to checkout on pay click', () => {
    mockUseAppSelector.mockReturnValue({
      products: [mockProduct],
      loading: false,
    });

    render(<ProductPage />);

    screen.getByText('Pay').click();
    expect(mockPush).toHaveBeenCalledWith('/checkout/prod-001');
  });

  it('should show back button and navigate to home', () => {
    mockUseAppSelector.mockReturnValue({
      products: [mockProduct],
      loading: false,
    });

    render(<ProductPage />);

    const backButton = screen.getByText('Volver a productos');
    backButton.click();
    expect(mockPush).toHaveBeenCalledWith('/');
  });
});
