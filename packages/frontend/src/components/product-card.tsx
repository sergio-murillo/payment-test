'use client';

import { Card, Typography, Button } from 'antd';
import { ShoppingCartOutlined, TagOutlined } from '@ant-design/icons';
import Image from 'next/image';
import { useState } from 'react';
import { Product } from '@/store/slices/products-slice';
import { useOptimizedImage } from '@/hooks/use-optimized-image';
import { StarRating } from './star-rating';

const { Title, Text } = Typography;

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [navigating, setNavigating] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const optimizedImageUrl = useOptimizedImage(
    product.imageUrl,
    'small',
    { width: 400, height: 220 },
  );

  return (
    <Card
      hoverable
      className="product-card"
      cover={
        <div style={{ position: 'relative', width: '100%', height: '220px', background: '#f9fafb' }}>
          {!imageLoaded && <div className="skeleton-image" style={{ position: 'absolute', inset: 0, zIndex: 1 }} />}
          <Image
            src={optimizedImageUrl}
            alt={product.name}
            fill
            style={{ objectFit: 'cover', opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.4s ease' }}
            onLoad={() => setImageLoaded(true)}
          />
          {product.categoria && (
            <span
              className="category-badge"
              style={{ position: 'absolute', top: 12, left: 12, zIndex: 2 }}
            >
              <TagOutlined style={{ fontSize: 10 }} />
              {product.categoria}
            </span>
          )}
        </div>
      }
      actions={[
        <Button
          type="primary"
          block
          onClick={() => { setNavigating(true); onClick(); }}
          key="buy"
          icon={<ShoppingCartOutlined />}
          loading={navigating}
          disabled={navigating}
          style={{
            background: navigating ? undefined : 'linear-gradient(135deg, #722ed1 0%, #9333ea 100%)',
            border: 'none',
            fontWeight: 600,
          }}
        >
          Ver Detalles
        </Button>,
      ]}
    >
      <Title level={4} style={{ marginBottom: 4, fontSize: 16 }}>{product.name}</Title>
      <Text type="secondary" ellipsis style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
        {product.description}
      </Text>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <StarRating rating={product.rating || 1} size={13} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: product.stock > 5 ? '#10b981' : product.stock > 0 ? '#f59e0b' : '#ef4444',
            background: product.stock > 5 ? '#ecfdf5' : product.stock > 0 ? '#fffbeb' : '#fef2f2',
            padding: '2px 8px',
            borderRadius: 6,
          }}
        >
          {product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}
        </span>
      </div>
      <div className="price-tag">
        {formatPrice(product.price)}
      </div>
    </Card>
  );
}
