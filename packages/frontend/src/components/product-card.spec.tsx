import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from './product-card';
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
  description: 'Test Description',
  price: 100000,
  imageUrl: 'https://example.com/image.jpg',
  categoria: 'Electrónica',
  metadata: { marca: 'Test' },
  rating: 4.5,
  stock: 50,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('ProductCard', () => {
  it('should render product information', () => {
    const mockOnClick = jest.fn();
    render(<ProductCard product={createProduct()} onClick={mockOnClick} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('should call onClick when button is clicked', () => {
    const mockOnClick = jest.fn();
    render(<ProductCard product={createProduct()} onClick={mockOnClick} />);

    const button = screen.getByText('Ver Detalles');
    button.click();

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should show stock > 5 as available', () => {
    render(
      <ProductCard product={createProduct({ stock: 50 })} onClick={jest.fn()} />,
    );
    expect(screen.getByText('50 disponibles')).toBeInTheDocument();
  });

  it('should show low stock (1-5) with warning color', () => {
    render(
      <ProductCard product={createProduct({ stock: 3 })} onClick={jest.fn()} />,
    );
    expect(screen.getByText('3 disponibles')).toBeInTheDocument();
  });

  it('should show out of stock', () => {
    render(
      <ProductCard product={createProduct({ stock: 0 })} onClick={jest.fn()} />,
    );
    expect(screen.getByText('Agotado')).toBeInTheDocument();
  });

  it('should not render category badge when categoria is empty', () => {
    const { container } = render(
      <ProductCard product={createProduct({ categoria: '' })} onClick={jest.fn()} />,
    );
    expect(container.querySelector('.category-badge')).not.toBeInTheDocument();
  });

  it('should handle image load', () => {
    render(
      <ProductCard product={createProduct()} onClick={jest.fn()} />,
    );
    const img = screen.getByAltText('Test Product');
    fireEvent.load(img);
    expect(img).toHaveStyle({ opacity: 1 });
  });

  it('should use default rating when rating is 0', () => {
    render(
      <ProductCard product={createProduct({ rating: 0 })} onClick={jest.fn()} />,
    );
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('should format price correctly', () => {
    render(
      <ProductCard product={createProduct({ price: 250000 })} onClick={jest.fn()} />,
    );
    expect(screen.getByText(/250\.000/)).toBeInTheDocument();
  });
});
