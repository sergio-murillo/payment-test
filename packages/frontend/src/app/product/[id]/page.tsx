'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchProduct } from '@/store/slices/products-slice';
import { createTransaction } from '@/store/slices/transaction-slice';
import { ProductDetails } from '@/components/product-details';
import { PaymentModal } from '@/components/payment-modal';
import { Layout, Spin, Alert } from 'antd';
import { v4 as uuidv4 } from 'uuid';

const { Content } = Layout;

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { products, loading } = useAppSelector((state) => state.products);
  const { currentTransaction } = useAppSelector((state) => state.transaction);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const productId = params.id as string;
  const product = products.find((p) => p.id === productId);

  useEffect(() => {
    if (!product) {
      dispatch(fetchProduct(productId));
    }
  }, [productId, product, dispatch]);

  const handlePayClick = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (paymentData: any) => {
    const idempotencyKey = uuidv4();
    const commission = product!.price * 0.03; // 3% commission
    const shippingCost = 15000; // Fixed shipping cost

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

    setShowPaymentModal(false);
    router.push(`/checkout/${currentTransaction?.id}`);
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

  if (!product) {
    return (
      <Layout style={{ minHeight: '100vh', padding: '20px' }}>
        <Content>
          <Alert message="Error" description="Product not found" type="error" showIcon />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', padding: '20px' }}>
      <Content>
        <ProductDetails product={product} onPayClick={handlePayClick} />
        {showPaymentModal && (
          <PaymentModal
            visible={showPaymentModal}
            onCancel={() => setShowPaymentModal(false)}
            onSubmit={handlePaymentSubmit}
            product={product}
          />
        )}
      </Content>
    </Layout>
  );
}
