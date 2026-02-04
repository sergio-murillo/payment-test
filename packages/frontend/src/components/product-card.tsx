'use client';

import { Card, Typography, Button } from 'antd';
import Image from 'next/image';
import { Product } from '@/store/slices/products-slice';
import { useOptimizedImage } from '@/hooks/use-optimized-image';

const { Title, Text } = Typography;

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Optimizar imagen para card (small size, altura 200px)
  // Usamos dimensiones personalizadas para mantener la proporción del card
  const optimizedImageUrl = useOptimizedImage(
    product.imageUrl,
    'small',
    { width: 400, height: 200 }, // Ancho más grande para mantener calidad en cards
  );

  return (
    <Card
      hoverable
      cover={
        <div style={{ position: 'relative', width: '100%', height: '200px' }}>
          <Image
            src={optimizedImageUrl}
            alt={product.name}
            fill
            style={{ objectFit: 'contain' }}
          />
        </div>
      }
      actions={[
        <Button type="primary" block onClick={onClick} key="buy">
          Ver Detalles
        </Button>,
      ]}
    >
      <Title level={4}>{product.name}</Title>
      <Text type="secondary" ellipsis>
        {product.description}
      </Text>
      <div style={{ marginTop: '12px' }}>
        <Text strong style={{ fontSize: '18px', color: '#722ed1' }}>
          {formatPrice(product.price)}
        </Text>
      </div>
    </Card>
  );
}
