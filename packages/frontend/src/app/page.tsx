'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchProducts } from '@/store/slices/products-slice';
import { ProductCard } from '@/components/product-card';
import { ProductCardSkeletonGrid } from '@/components/product-card-skeleton';
import { Layout, Alert } from 'antd';
import { ShopOutlined } from '@ant-design/icons';

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

  if (error) {
    return (
      <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
        <Content style={{ padding: '20px' }}>
          <Alert message="Error" description={error} type="error" showIcon />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Content style={{ padding: '0 20px 40px' }}>
        <div className="page-header">
          <h1>
            <ShopOutlined style={{ marginRight: 12 }} />
            Productos Disponibles
          </h1>
          <p>Encuentra los mejores productos con los mejores precios</p>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '24px',
            maxWidth: '1200px',
            margin: '0 auto',
          }}
        >
          {loading ? (
            <ProductCardSkeletonGrid count={6} />
          ) : (
            products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => handleProductClick(product.id)}
              />
            ))
          )}
        </div>
      </Content>
    </Layout>
  );
}
