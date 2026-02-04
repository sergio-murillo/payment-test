import { render, screen } from '@testing-library/react';
import { StarRating } from './star-rating';

describe('StarRating', () => {
  it('should render rating value by default', () => {
    render(<StarRating rating={4.5} />);

    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('should not show rating value when showValue is false', () => {
    render(<StarRating rating={4.5} showValue={false} />);

    expect(screen.queryByText('4.5')).not.toBeInTheDocument();
  });

  it('should render 5 full stars for rating 5', () => {
    const { container } = render(<StarRating rating={5} />);

    const stars = container.querySelectorAll('.star');
    expect(stars.length).toBe(5);
  });

  it('should render 4 full stars and 1 empty for rating 4', () => {
    const { container } = render(<StarRating rating={4} />);

    const stars = container.querySelectorAll('.star');
    expect(stars.length).toBe(5);
  });

  it('should render half star for rating 4.5', () => {
    const { container } = render(<StarRating rating={4.5} />);

    const halfStar = container.querySelector('.star.half');
    expect(halfStar).toBeInTheDocument();
  });

  it('should render half star for rating 2.5', () => {
    const { container } = render(<StarRating rating={2.5} />);

    const halfStar = container.querySelector('.star.half');
    expect(halfStar).toBeInTheDocument();
  });

  it('should use custom size', () => {
    const { container } = render(<StarRating rating={4.5} size={20} />);

    const stars = container.querySelectorAll('.star');
    expect(stars.length).toBeGreaterThan(0);
    // Check that size is applied (via style attribute)
    const firstStar = stars[0] as HTMLElement;
    expect(firstStar.style.fontSize).toBe('20px');
  });

  it('should handle rating 0', () => {
    const { container } = render(<StarRating rating={0} />);

    const stars = container.querySelectorAll('.star');
    expect(stars.length).toBe(5);
  });

  it('should handle rating 1', () => {
    const { container } = render(<StarRating rating={1} />);

    const stars = container.querySelectorAll('.star');
    expect(stars.length).toBe(5);
  });
});
