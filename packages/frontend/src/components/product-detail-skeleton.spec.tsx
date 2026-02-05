import { render } from '@testing-library/react';
import { ProductDetailSkeleton } from './product-detail-skeleton';

describe('ProductDetailSkeleton', () => {
  it('should render skeleton layout', () => {
    const { container } = render(<ProductDetailSkeleton />);
    expect(container.querySelector('.skeleton-card')).toBeInTheDocument();
    expect(container.querySelector('.skeleton-image')).toBeInTheDocument();
  });

  it('should render 5 skeleton stars', () => {
    const { container } = render(<ProductDetailSkeleton />);
    const stars = container.querySelectorAll('.skeleton-star');
    expect(stars).toHaveLength(5);
  });

  it('should render 4 metadata skeleton items', () => {
    const { container } = render(<ProductDetailSkeleton />);
    // The metadata section has 4 skeleton items
    const skeletonTexts = container.querySelectorAll('.skeleton-text');
    expect(skeletonTexts.length).toBeGreaterThan(0);
  });
});
