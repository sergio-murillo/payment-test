import { render } from '@testing-library/react';
import {
  ProductCardSkeleton,
  ProductCardSkeletonGrid,
} from './product-card-skeleton';

describe('ProductCardSkeleton', () => {
  it('should render skeleton card', () => {
    const { container } = render(<ProductCardSkeleton />);
    expect(container.querySelector('.skeleton-card')).toBeInTheDocument();
    expect(container.querySelector('.skeleton-image')).toBeInTheDocument();
  });

  it('should render 5 skeleton stars', () => {
    const { container } = render(<ProductCardSkeleton />);
    const stars = container.querySelectorAll('.skeleton-star');
    expect(stars).toHaveLength(5);
  });
});

describe('ProductCardSkeletonGrid', () => {
  it('should render default 6 skeletons', () => {
    const { container } = render(<ProductCardSkeletonGrid />);
    const cards = container.querySelectorAll('.skeleton-card');
    expect(cards).toHaveLength(6);
  });

  it('should render custom count of skeletons', () => {
    const { container } = render(<ProductCardSkeletonGrid count={3} />);
    const cards = container.querySelectorAll('.skeleton-card');
    expect(cards).toHaveLength(3);
  });
});
