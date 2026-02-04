'use client';

import { StarFilled } from '@ant-design/icons';

interface StarRatingProps {
  rating: number;
  showValue?: boolean;
  size?: number;
}

export function StarRating({ rating, showValue = true, size = 14 }: StarRatingProps) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <span className="star-rating">
      {Array.from({ length: fullStars }, (_, i) => (
        <StarFilled key={`full-${i}`} className="star" style={{ fontSize: size }} />
      ))}
      {hasHalf && (
        <span className="star half" style={{ fontSize: size, position: 'relative', display: 'inline-block', width: size, height: size }}>
          <StarFilled style={{ color: '#e5e7eb', fontSize: size, position: 'absolute', left: 0, top: 0 }} />
          <span style={{ position: 'absolute', left: 0, top: 0, width: '50%', overflow: 'hidden' }}>
            <StarFilled style={{ color: '#fbbf24', fontSize: size }} />
          </span>
        </span>
      )}
      {Array.from({ length: emptyStars }, (_, i) => (
        <StarFilled key={`empty-${i}`} className="star empty" style={{ fontSize: size }} />
      ))}
      {showValue && <span className="rating-value">{rating.toFixed(1)}</span>}
    </span>
  );
}
