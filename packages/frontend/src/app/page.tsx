'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchProducts } from '@/store/slices/products-slice';
import { ProductCard } from '@/components/product-card';
import { Layout, Spin, Alert } from 'antd';

const { Content } = Layout;

export default function Home() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { products, loading, error } = useAppSelector((state) => state.products);

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  const handleProductClick = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', padding: '20px' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Spin size="large" />
        </Content>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout style={{ minHeight: '100vh', padding: '20px' }}>
        <Content>
          <Alert message="Error" description={error} type="error" showIcon />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', padding: '20px' }}>
      <Content>
        <h1 style={{ marginBottom: '24px', textAlign: 'center' }}>
          Productos Disponibles
        </h1>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
            maxWidth: '1200px',
            margin: '0 auto',
          }}
        >
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => handleProductClick(product.id)}
            />
          ))}
        </div>
      </Content>
    </Layout>
  );
}
