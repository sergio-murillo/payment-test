'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchProduct } from '@/store/slices/products-slice';
import { PaymentForm } from '@/components/payment-form';
import { Layout, Spin, Alert } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const { Content } = Layout;

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { products, loading: productsLoading } = useAppSelector((state) => state.products);

  const productId = params.id as string;

  useEffect(() => {
    if (productId) {
      const product = products.find((p) => p.id === productId);
      if (!product) {
        dispatch(fetchProduct(productId));
      }
            }
  }, [productId, products, dispatch]);

  const loading = productsLoading;
  const product = products.find((p) => p.id === productId);

  if (loading || !product) {
    return (
      <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <div className="processing-container">
            <div className="processing-icon">
              <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#722ed1' }} spin />} />
            </div>
            <div style={{ marginTop: 24, fontSize: 16, color: '#6b7280' }}>Cargando información de pago...</div>
          </div>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Content>
        <PaymentForm
          product={product}
          onBack={() => router.push(`/product/${product.id}`)}
        />
      </Content>
    </Layout>
  );
}
