import { render, screen } from '@testing-library/react';
import { ProductCard } from './product-card';
import { Product } from '@/store/slices/products-slice';

const mockProduct: Product = {
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
};

describe('ProductCard', () => {
  it('should render product information', () => {
    const mockOnClick = jest.fn();
    render(<ProductCard product={mockProduct} onClick={mockOnClick} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('should call onClick when button is clicked', () => {
    const mockOnClick = jest.fn();
    render(<ProductCard product={mockProduct} onClick={mockOnClick} />);

    const button = screen.getByText('Ver Detalles');
    button.click();

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
});
