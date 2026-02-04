import { render, screen } from '@testing-library/react';
import { CardBrandIcon } from './card-brand-icon';

describe('CardBrandIcon', () => {
  it('should render Visa icon', () => {
    const { container } = render(<CardBrandIcon brand="visa" />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-label', 'Visa');
  });

  it('should render Mastercard icon', () => {
    const { container } = render(<CardBrandIcon brand="mastercard" />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-label', 'Mastercard');
  });

  it('should return null for empty brand', () => {
    const { container } = render(<CardBrandIcon brand="" />);

    expect(container.firstChild).toBeNull();
  });

  it('should use custom size', () => {
    const { container } = render(<CardBrandIcon brand="visa" size={60} />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '60');
    expect(svg).toHaveAttribute('height', '39'); // 60 * 0.65
  });

  it('should use default size when not provided', () => {
    const { container } = render(<CardBrandIcon brand="visa" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '40');
    expect(svg).toHaveAttribute('height', '26'); // 40 * 0.65
  });
});
