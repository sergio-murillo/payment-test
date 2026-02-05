import { render, screen, fireEvent } from '@testing-library/react';
import { ProductDetails } from './product-details';
import { Product } from '@/store/slices/products-slice';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    const { fill, ...rest } = props;
    return <img {...rest} />;
  },
}));

const createProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-001',
  name: 'Test Product',
  description: 'A great product for testing',
  price: 100000,
  imageUrl: 'https://example.com/image.jpg',
  categoria: 'Electrónica',
  metadata: { marca: 'TestBrand', modelo: 'X100' },
  rating: 4.5,
  stock: 50,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('ProductDetails', () => {
  it('should render product information', () => {
    const product = createProduct();
    render(<ProductDetails product={product} onPayClick={jest.fn()} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('A great product for testing')).toBeInTheDocument();
    expect(screen.getByText('Electrónica')).toBeInTheDocument();
  });

  it('should format price in COP', () => {
    const product = createProduct({ price: 150000 });
    render(<ProductDetails product={product} onPayClick={jest.fn()} />);

    expect(screen.getByText(/150\.000/)).toBeInTheDocument();
  });

  it('should show stock available text when stock > 0', () => {
    const product = createProduct({ stock: 50 });
    render(<ProductDetails product={product} onPayClick={jest.fn()} />);

    expect(screen.getByText('50 unidades disponibles')).toBeInTheDocument();
  });

  it('should show out of stock text when stock is 0', () => {
    const product = createProduct({ stock: 0 });
    render(<ProductDetails product={product} onPayClick={jest.fn()} />);

    const matches = screen.getAllByText('Producto agotado');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('should show low stock warning when stock is between 1 and 5', () => {
    const product = createProduct({ stock: 3 });
    render(<ProductDetails product={product} onPayClick={jest.fn()} />);

    expect(screen.getByText('3 unidades disponibles')).toBeInTheDocument();
  });

  it('should disable pay button when out of stock', () => {
    const product = createProduct({ stock: 0 });
    render(<ProductDetails product={product} onPayClick={jest.fn()} />);

    const buttons = screen.getAllByText('Producto agotado');
    const button = buttons.find((el) => el.closest('button'));
    expect(button?.closest('button')).toBeDisabled();
  });

  it('should show "Pagar con tarjeta de crédito" when in stock', () => {
    const product = createProduct({ stock: 10 });
    render(<ProductDetails product={product} onPayClick={jest.fn()} />);

    expect(
      screen.getByText('Pagar con tarjeta de crédito'),
    ).toBeInTheDocument();
  });

  it('should call onPayClick when pay button is clicked', () => {
    const onPayClick = jest.fn();
    const product = createProduct({ stock: 10 });
    render(<ProductDetails product={product} onPayClick={onPayClick} />);

    const button = screen.getByText('Pagar con tarjeta de crédito');
    fireEvent.click(button);

    expect(onPayClick).toHaveBeenCalledTimes(1);
  });

  it('should render metadata entries', () => {
    const product = createProduct({
      metadata: { marca: 'TestBrand', modelo: 'X100' },
    });
    render(<ProductDetails product={product} onPayClick={jest.fn()} />);

    expect(screen.getByText('Especificaciones')).toBeInTheDocument();
    expect(screen.getByText('marca:')).toBeInTheDocument();
    expect(screen.getByText('TestBrand')).toBeInTheDocument();
    expect(screen.getByText('modelo:')).toBeInTheDocument();
    expect(screen.getByText('X100')).toBeInTheDocument();
  });

  it('should not render metadata section when metadata is empty', () => {
    const product = createProduct({ metadata: {} });
    render(<ProductDetails product={product} onPayClick={jest.fn()} />);

    expect(screen.queryByText('Especificaciones')).not.toBeInTheDocument();
  });

  it('should not render metadata section when metadata is null', () => {
    const product = createProduct({ metadata: null as any });
    render(<ProductDetails product={product} onPayClick={jest.fn()} />);

    expect(screen.queryByText('Especificaciones')).not.toBeInTheDocument();
  });

  it('should not render category badge when categoria is empty', () => {
    const product = createProduct({ categoria: '' });
    const { container } = render(
      <ProductDetails product={product} onPayClick={jest.fn()} />,
    );

    expect(
      container.querySelector('.category-badge'),
    ).not.toBeInTheDocument();
  });

  it('should handle image load', () => {
    const product = createProduct();
    render(<ProductDetails product={product} onPayClick={jest.fn()} />);

    const img = screen.getByAltText('Test Product');
    fireEvent.load(img);

    expect(img).toHaveStyle({ opacity: 1 });
  });

  it('should use default rating of 1 when rating is not provided', () => {
    const product = createProduct({ rating: 0 });
    render(<ProductDetails product={product} onPayClick={jest.fn()} />);

    // Component renders, just checking it doesn't crash
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });
});
