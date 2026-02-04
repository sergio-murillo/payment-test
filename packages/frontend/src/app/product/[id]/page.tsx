'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchProduct } from '@/store/slices/products-slice';
import { createTransaction } from '@/store/slices/transaction-slice';
import { ProductDetails } from '@/components/product-details';
import { ProductDetailSkeleton } from '@/components/product-detail-skeleton';
import { PaymentForm } from '@/components/payment-form';
import { Layout, Alert, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';

const { Content } = Layout;

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { products, loading } = useAppSelector((state) => state.products);
  const { currentTransaction } = useAppSelector((state) => state.transaction);
  const [step, setStep] = useState<'detail' | 'payment'>('detail');

  const productId = params.id as string;
  const product = products.find((p) => p.id === productId);

  useEffect(() => {
    if (!product) {
      dispatch(fetchProduct(productId));
    }
  }, [productId, product, dispatch]);

  const handlePayClick = () => {
    setStep('payment');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToDetail = () => {
    setStep('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePaymentSubmit = async (paymentData: any) => {
    const idempotencyKey = uuidv4();
    const commission = product!.price * 0.03;
    const shippingCost = 15000;

    await dispatch(
      createTransaction({
        productId: product!.id,
        amount: product!.price,
        commission,
        shippingCost,
        customerEmail: paymentData.email,
        customerName: paymentData.name,
        deliveryAddress: paymentData.address,
        deliveryCity: paymentData.city,
        deliveryPhone: paymentData.phone,
        idempotencyKey,
      }),
    );

    router.push(`/checkout/${currentTransaction?.id}`);
  };

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
        <Content style={{ padding: '20px 20px 40px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', marginBottom: 20 }}>
            <div className="skeleton" style={{ width: 120, height: 36, borderRadius: 10 }} />
          </div>
          <ProductDetailSkeleton />
        </Content>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
        <Content style={{ padding: '20px' }}>
          <Alert message="Error" description="Producto no encontrado" type="error" showIcon />
        </Content>
      </Layout>
    );
  }

  if (step === 'payment') {
    return (
      <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
        <Content>
          <PaymentForm
            product={product}
            onSubmit={handlePaymentSubmit}
            onBack={handleBackToDetail}
          />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Content style={{ padding: '20px 20px 40px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto 20px' }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/')}
            style={{ fontWeight: 600, color: '#722ed1' }}
          >
            Volver a productos
          </Button>
        </div>
        <ProductDetails product={product} onPayClick={handlePayClick} />
      </Content>
    </Layout>
  );
}
