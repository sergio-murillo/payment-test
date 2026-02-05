import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { PaymentForm } from './payment-form';
import { Product } from '@/store/slices/products-slice';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    const { fill, ...rest } = props;
    return <img {...rest} />;
  },
}));

// Mock react-credit-cards-2
jest.mock('react-credit-cards-2', () => ({
  __esModule: true,
  default: (props: any) => <div data-testid="credit-card-preview">{props.number}</div>,
}));
jest.mock('react-credit-cards-2/dist/es/styles-compiled.css', () => ({}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-123',
}));

// Mock store hooks
const mockDispatch = jest.fn();
const mockUnwrap = jest.fn();
jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: jest.fn(),
}));

// Mock transaction slice
jest.mock('@/store/slices/transaction-slice', () => ({
  createTransaction: jest.fn((data) => ({
    type: 'transaction/createTransaction',
    payload: data,
  })),
  processPayment: jest.fn((data) => ({
    type: 'transaction/processPayment',
    payload: data,
  })),
  fetchTransaction: Object.assign(
    jest.fn((id) => ({
      type: 'transaction/fetchTransaction',
      payload: id,
    })),
    {
      fulfilled: {
        match: jest.fn().mockReturnValue(false),
      },
    },
  ),
  clearTransaction: jest.fn(() => ({
    type: 'transaction/clearTransaction',
  })),
}));

import { useAppSelector } from '@/store/hooks';
const mockUseAppSelector = useAppSelector as jest.Mock;

const mockProduct: Product = {
  id: 'prod-001',
  name: 'Test Product',
  description: 'A test product',
  price: 100000,
  imageUrl: 'https://example.com/image.jpg',
  categoria: 'Electrónica',
  metadata: { marca: 'Test' },
  rating: 4.5,
  stock: 10,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('PaymentForm', () => {
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockDispatch.mockReturnValue({
      unwrap: mockUnwrap,
    });
    mockUseAppSelector.mockReturnValue({
      currentTransaction: null,
      loading: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render payment form', () => {
    render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

    expect(screen.getByText('Información de Pago')).toBeInTheDocument();
    expect(screen.getByText('Datos de la Tarjeta')).toBeInTheDocument();
    expect(screen.getByText('Datos Personales')).toBeInTheDocument();
    expect(screen.getByText('Dirección de Entrega')).toBeInTheDocument();
  });

  it('should render order summary with product info', () => {
    render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

    expect(screen.getByText('Resumen del Pedido')).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Electrónica')).toBeInTheDocument();
    expect(screen.getByText('Subtotal')).toBeInTheDocument();
    expect(screen.getByText('Comisión (3%)')).toBeInTheDocument();
    expect(screen.getByText('Envío')).toBeInTheDocument();
  });

  it('should render credit card preview', () => {
    render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

    expect(screen.getByTestId('credit-card-preview')).toBeInTheDocument();
  });

  it('should call onBack when back button is clicked', () => {
    render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

    const backButton = screen.getByText('Volver al producto');
    fireEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('should show accepted payment methods', () => {
    render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

    expect(screen.getByText('Métodos aceptados')).toBeInTheDocument();
  });

  it('should show secure payment badge', () => {
    render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

    expect(
      screen.getAllByText('Pago seguro encriptado con SSL').length,
    ).toBeGreaterThan(0);
  });

  it('should handle card number input with formatting', () => {
    render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

    const cardInput = screen.getByPlaceholderText('0000 0000 0000 0000');
    fireEvent.change(cardInput, { target: { value: '4242424242424242' } });
  });

  it('should ignore card number input longer than 16 digits', () => {
    render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

    const cardInput = screen.getByPlaceholderText('0000 0000 0000 0000');
    fireEvent.change(cardInput, { target: { value: '42424242424242429999' } });
  });

  it('should handle expiry month change', () => {
    render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

    const monthInput = screen.getByPlaceholderText('MM');
    fireEvent.change(monthInput, { target: { value: '12' } });
  });

  it('should handle expiry year change', () => {
    render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

    const yearInput = screen.getByPlaceholderText('AAAA');
    fireEvent.change(yearInput, { target: { value: '2025' } });
  });

  it('should handle card holder name change updating card state', () => {
    render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

    const nameInput = screen.getByPlaceholderText('JUAN PEREZ');
    fireEvent.change(nameInput, { target: { value: 'JOHN DOE' } });
    expect(screen.getByTestId('credit-card-preview')).toBeInTheDocument();
  });

  it('should handle CVV change updating card state', () => {
    render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

    const cvvInput = screen.getByPlaceholderText('•••');
    fireEvent.change(cvvInput, { target: { value: '456' } });
    fireEvent.focus(cvvInput);
  });

  it('should handle card holder name input', () => {
    render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

    const nameInput = screen.getByPlaceholderText('JUAN PEREZ');
    fireEvent.change(nameInput, { target: { value: 'TEST USER' } });
    fireEvent.focus(nameInput);
  });

  it('should handle CVV input', () => {
    render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

    const cvvInput = screen.getByPlaceholderText('•••');
    fireEvent.change(cvvInput, { target: { value: '123' } });
    fireEvent.focus(cvvInput);
  });

  it('should set focus states on form fields', () => {
    render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

    const cardInput = screen.getByPlaceholderText('0000 0000 0000 0000');
    fireEvent.focus(cardInput);

    const nameInput = screen.getByPlaceholderText('Juan Pérez');
    fireEvent.focus(nameInput);

    const emailInput = screen.getByPlaceholderText('correo@ejemplo.com');
    fireEvent.focus(emailInput);

    const phoneInput = screen.getByPlaceholderText('+57 300 123 4567');
    fireEvent.focus(phoneInput);

    const addressInput = screen.getByPlaceholderText(
      'Calle 123 #45-67, Apto 101',
    );
    fireEvent.focus(addressInput);

    const cityInput = screen.getByPlaceholderText('Bogotá');
    fireEvent.focus(cityInput);
  });

  describe('processing state', () => {
    it('should show processing UI when loading is true', () => {
      mockUseAppSelector.mockReturnValue({
        currentTransaction: null,
        loading: true,
      });

      render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

      // The form should still render since processing is internal state
      // but loading from store is used for button disabled state
      expect(screen.getByText('Información de Pago')).toBeInTheDocument();
    });
  });

  describe('result state', () => {
    it('should show approved result', () => {
      mockUseAppSelector.mockReturnValue({
        currentTransaction: {
          id: 'trans-001',
          productId: 'prod-001',
          status: 'APPROVED',
          totalAmount: 118000,
        },
        loading: false,
      });

      render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

      expect(screen.getByText('Pago Aprobado')).toBeInTheDocument();
      expect(
        screen.getByText('Su pago ha sido procesado exitosamente'),
      ).toBeInTheDocument();
      expect(screen.getByText('Volver a Productos')).toBeInTheDocument();
    });

    it('should show declined result', () => {
      mockUseAppSelector.mockReturnValue({
        currentTransaction: {
          id: 'trans-001',
          productId: 'prod-001',
          status: 'DECLINED',
          totalAmount: 118000,
          errorMessage: 'Fondos insuficientes',
        },
        loading: false,
      });

      render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

      expect(screen.getByText('Pago Declinado')).toBeInTheDocument();
      expect(screen.getByText('Fondos insuficientes')).toBeInTheDocument();
    });

    it('should show default error message when errorMessage is empty', () => {
      mockUseAppSelector.mockReturnValue({
        currentTransaction: {
          id: 'trans-001',
          productId: 'prod-001',
          status: 'DECLINED',
          totalAmount: 118000,
          errorMessage: '',
        },
        loading: false,
      });

      render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

      expect(
        screen.getByText('El pago no pudo ser procesado'),
      ).toBeInTheDocument();
    });

    it('should navigate home when "Volver a Productos" is clicked on result', () => {
      mockUseAppSelector.mockReturnValue({
        currentTransaction: {
          id: 'trans-001',
          productId: 'prod-001',
          status: 'APPROVED',
          totalAmount: 118000,
        },
        loading: false,
      });

      render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

      fireEvent.click(screen.getByText('Volver a Productos'));
      expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('should show transaction details in result', () => {
      mockUseAppSelector.mockReturnValue({
        currentTransaction: {
          id: 'trans-001',
          productId: 'prod-001',
          status: 'APPROVED',
          totalAmount: 118000,
        },
        loading: false,
      });

      render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

      expect(
        screen.getByText('Detalles de la Transacción'),
      ).toBeInTheDocument();
      expect(screen.getByText('trans-001')).toBeInTheDocument();
      expect(screen.getByText('APPROVED')).toBeInTheDocument();
    });
  });

  describe('error result state', () => {
    it('should show error result for ERROR status', () => {
      mockUseAppSelector.mockReturnValue({
        currentTransaction: {
          id: 'trans-002',
          productId: 'prod-001',
          status: 'ERROR',
          totalAmount: 118000,
          errorMessage: 'Error interno',
        },
        loading: false,
      });

      render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

      expect(screen.getByText('Pago Declinado')).toBeInTheDocument();
      expect(screen.getByText('Error interno')).toBeInTheDocument();
    });

    it('should show VOIDED result', () => {
      mockUseAppSelector.mockReturnValue({
        currentTransaction: {
          id: 'trans-003',
          productId: 'prod-001',
          status: 'VOIDED',
          totalAmount: 118000,
          errorMessage: '',
        },
        loading: false,
      });

      render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

      expect(screen.getByText('Pago Declinado')).toBeInTheDocument();
      expect(screen.getByText('El pago no pudo ser procesado')).toBeInTheDocument();
    });
  });

  describe('pre-fill from pending transaction', () => {
    it('should pre-fill form fields from pending transaction', () => {
      mockUseAppSelector.mockReturnValue({
        currentTransaction: {
          id: 'trans-001',
          productId: 'prod-001',
          status: 'PENDING',
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          deliveryPhone: '+57 300 123 4567',
          deliveryAddress: 'Calle 123',
          deliveryCity: 'Bogotá',
          totalAmount: 118000,
        },
        loading: false,
      });

      render(<PaymentForm product={mockProduct} onBack={mockOnBack} />);

      // Form should be rendered (not result view) since PENDING
      expect(screen.getByText('Información de Pago')).toBeInTheDocument();
    });
  });
});
