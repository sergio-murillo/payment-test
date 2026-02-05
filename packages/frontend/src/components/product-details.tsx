'use client';

import { Card, Typography, Button, Space, Divider } from 'antd';
import { CreditCardOutlined, TagOutlined } from '@ant-design/icons';
import Image from 'next/image';
import { useState } from 'react';
import { Product } from '@/store/slices/products-slice';
import { useOptimizedImage } from '@/hooks/use-optimized-image';
import { StarRating } from './star-rating';

const { Title, Text, Paragraph } = Typography;

interface ProductDetailsProps {
  product: Product;
  onPayClick: () => void;
}

export function ProductDetails({ product, onPayClick }: ProductDetailsProps) {
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
    'large',
    { width: 800, height: 400 },
  );

  const metadataEntries = product.metadata ? Object.entries(product.metadata) : [];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Card className="detail-card" bodyStyle={{ padding: 0 }}>
        {/* Image section */}
        <div className="image-container" style={{ position: 'relative', width: '100%', height: '400px', background: '#f9fafb' }}>
          {!imageLoaded && <div className="skeleton-image" style={{ position: 'absolute', inset: 0, height: 400, zIndex: 1 }} />}
          <Image
            src={optimizedImageUrl}
            alt={product.name}
            fill
            style={{ objectFit: 'cover', opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.5s ease' }}
            onLoad={() => setImageLoaded(true)}
          />
          {product.categoria && (
            <span
              className="category-badge"
              style={{ position: 'absolute', top: 16, left: 16, zIndex: 2, fontSize: 13, padding: '6px 14px' }}
            >
              <TagOutlined style={{ fontSize: 12 }} />
              {product.categoria}
            </span>
          )}
        </div>

        {/* Content section */}
        <div style={{ padding: '28px 32px 32px' }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Title level={2} style={{ marginBottom: 0 }}>{product.name}</Title>

            {/* Rating & Stock */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <StarRating rating={product.rating || 1} size={18} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: product.stock > 5 ? '#10b981' : product.stock > 0 ? '#f59e0b' : '#ef4444',
                  background: product.stock > 5 ? '#ecfdf5' : product.stock > 0 ? '#fffbeb' : '#fef2f2',
                  padding: '4px 12px',
                  borderRadius: 8,
                  border: `1px solid ${product.stock > 5 ? '#d1fae5' : product.stock > 0 ? '#fef3c7' : '#fecaca'}`,
                }}
              >
                {product.stock > 0 ? `${product.stock} unidades disponibles` : 'Producto agotado'}
              </span>
            </div>

            <Paragraph style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.7 }}>
              {product.description}
            </Paragraph>

            {/* Metadata tags */}
            {metadataEntries.length > 0 && (
              <>
                <Divider style={{ margin: '4px 0' }} />
                <div>
                  <Text strong style={{ fontSize: 13, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 10 }}>
                    Especificaciones
                  </Text>
                  <div className="metadata-grid">
                    {metadataEntries.map(([key, value]) => (
                      <span key={key} className="metadata-tag">
                        <span className="tag-label">{key}:</span>
                        <span className="tag-value">{String(value)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Divider style={{ margin: '4px 0' }} />

            {/* Price */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="price-tag" style={{ fontSize: 22, padding: '8px 20px' }}>
                {formatPrice(product.price)}
              </div>
            </div>

            <Button
              type="primary"
              size="large"
              block
              onClick={() => { setNavigating(true); onPayClick(); }}
              disabled={product.stock <= 0 || navigating}
              loading={navigating}
              icon={<CreditCardOutlined />}
              style={{
                height: 52,
                fontSize: 16,
                ...( product.stock > 0 && !navigating ? {
                  background: 'linear-gradient(135deg, #722ed1 0%, #9333ea 100%)',
                  border: 'none',
                  boxShadow: '0 6px 20px rgba(114, 46, 209, 0.3)',
                } : {}),
                fontWeight: 700,
              }}
            >
              {product.stock > 0 ? 'Pagar con tarjeta de crédito' : 'Producto agotado'}
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
}
