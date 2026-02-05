import { render, screen } from '@testing-library/react';
import CheckoutPage from './checkout-page-client';

const mockPush = jest.fn();
const mockDispatch = jest.fn().mockReturnValue({ unwrap: () => Promise.resolve() });

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/checkout/prod-001',
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

jest.mock('@/components/payment-form', () => ({
  PaymentForm: ({ product, onBack }: any) => (
    <div data-testid="payment-form">
      <span>{product.name}</span>
      <button onClick={onBack}>Back</button>
    </div>
  ),
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

describe('CheckoutPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render payment form when product is loaded', () => {
    mockUseAppSelector.mockReturnValue({
      products: [mockProduct],
      loading: false,
    });

    render(<CheckoutPage />);

    expect(screen.getByTestId('payment-form')).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('should show loading spinner when loading', () => {
    mockUseAppSelector.mockReturnValue({
      products: [],
      loading: true,
    });

    render(<CheckoutPage />);

    expect(
      screen.getByText('Cargando información de pago...'),
    ).toBeInTheDocument();
  });

  it('should show loading when product not found', () => {
    mockUseAppSelector.mockReturnValue({
      products: [],
      loading: false,
    });

    render(<CheckoutPage />);

    expect(
      screen.getByText('Cargando información de pago...'),
    ).toBeInTheDocument();
  });

  it('should dispatch fetchProduct when product not in store', () => {
    mockUseAppSelector.mockReturnValue({
      products: [],
      loading: false,
    });

    render(<CheckoutPage />);

    expect(mockDispatch).toHaveBeenCalled();
  });

  it('should not dispatch fetchProduct when product exists', () => {
    mockUseAppSelector.mockReturnValue({
      products: [mockProduct],
      loading: false,
    });

    render(<CheckoutPage />);

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('should navigate back to product page on back click', () => {
    mockUseAppSelector.mockReturnValue({
      products: [mockProduct],
      loading: false,
    });

    render(<CheckoutPage />);

    screen.getByText('Back').click();
    expect(mockPush).toHaveBeenCalledWith('/product/prod-001');
  });
});
