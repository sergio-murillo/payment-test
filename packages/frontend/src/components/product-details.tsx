'use client';

import { Card, Typography, Button, Space } from 'antd';
import Image from 'next/image';
import { Product } from '@/store/slices/products-slice';
import { useOptimizedImage } from '@/hooks/use-optimized-image';

const { Title, Text, Paragraph } = Typography;

interface ProductDetailsProps {
  product: Product;
  onPayClick: () => void;
}

export function ProductDetails({ product, onPayClick }: ProductDetailsProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Optimizar imagen para detalles (large size, altura 400px)
  // Usamos dimensiones personalizadas para mantener la proporción
  const optimizedImageUrl = useOptimizedImage(
    product.imageUrl,
    'large',
    { width: 800, height: 400 }, // Ancho más grande para mantener calidad en detalles
  );

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ position: 'relative', width: '100%', height: '400px' }}>
            <Image
              src={optimizedImageUrl}
              alt={product.name}
              fill
              style={{ objectFit: 'contain', borderRadius: '8px' }}
            />
          </div>
          <Title level={2}>{product.name}</Title>
          <Paragraph>{product.description}</Paragraph>
          <div>
            <Text strong style={{ fontSize: '24px', color: '#722ed1' }}>
              {formatPrice(product.price)}
            </Text>
          </div>
          <Button type="primary" size="large" block onClick={onPayClick}>
            Pagar con tarjeta de crédito
          </Button>
        </Space>
      </Card>
    </div>
  );
}
