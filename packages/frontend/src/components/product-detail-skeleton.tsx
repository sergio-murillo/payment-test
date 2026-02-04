'use client';

export function ProductDetailSkeleton() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
      <div className="skeleton-card" style={{ borderRadius: 20, overflow: 'hidden' }}>
        {/* Image */}
        <div className="skeleton-image" style={{ height: 400 }} />

        <div style={{ padding: 32 }}>
          {/* Category badge */}
          <div className="skeleton-badge" style={{ marginBottom: 16 }} />

          {/* Title */}
          <div className="skeleton-text skeleton-text-lg" style={{ width: '60%', marginBottom: 12, height: 32 }} />

          {/* Rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <div className="skeleton-stars">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="skeleton-star" style={{ width: 18, height: 18 }} />
              ))}
            </div>
            <div className="skeleton-text" style={{ width: 40, height: 14 }} />
          </div>

          {/* Description */}
          <div className="skeleton-text" style={{ width: '100%', marginBottom: 8 }} />
          <div className="skeleton-text" style={{ width: '90%', marginBottom: 8 }} />
          <div className="skeleton-text" style={{ width: '70%', marginBottom: 24 }} />

          {/* Metadata tags */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton-text" style={{ width: 100, height: 32, borderRadius: 8 }} />
            ))}
          </div>

          {/* Price */}
          <div className="skeleton-text" style={{ width: 160, height: 40, borderRadius: 10, marginBottom: 20 }} />

          {/* Button */}
          <div className="skeleton-text" style={{ width: '100%', height: 48, borderRadius: 10 }} />
        </div>
      </div>
    </div>
  );
}
