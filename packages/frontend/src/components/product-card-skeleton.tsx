'use client';

export function ProductCardSkeleton() {
  return (
    <div className="skeleton-card" style={{ animation: 'fadeInUp 0.6s ease-out backwards' }}>
      <div className="skeleton-image" />
      <div style={{ padding: '20px' }}>
        <div className="skeleton-badge" style={{ marginBottom: 12 }} />
        <div className="skeleton-text skeleton-text-lg" style={{ width: '75%', marginBottom: 10 }} />
        <div className="skeleton-text" style={{ width: '100%', marginBottom: 6 }} />
        <div className="skeleton-text" style={{ width: '60%', marginBottom: 14 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="skeleton-stars">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="skeleton-star" />
            ))}
          </div>
          <div className="skeleton-text" style={{ width: 90, height: 32, borderRadius: 10 }} />
        </div>
        <div className="skeleton-text" style={{ width: '100%', height: 40, borderRadius: 10 }} />
      </div>
    </div>
  );
}

export function ProductCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ animationDelay: `${i * 0.08}s` }}>
          <ProductCardSkeleton />
        </div>
      ))}
    </>
  );
}
