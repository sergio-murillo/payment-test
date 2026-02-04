'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchTransaction, processPayment } from '@/store/slices/transaction-slice';
import { Layout, Card, Typography, Button, Spin, Result, Space } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, HomeOutlined } from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentTransaction, loading } = useAppSelector((state) => state.transaction);
  const [processing, setProcessing] = useState(false);

  const transactionId = params.id as string;

  useEffect(() => {
    if (transactionId) {
      dispatch(fetchTransaction(transactionId));
    }
  }, [transactionId, dispatch]);

  useEffect(() => {
    if (currentTransaction && currentTransaction.status === 'PENDING' && !processing) {
      const handlePayment = async () => {
        setProcessing(true);
        try {
          await dispatch(
            processPayment({
              transactionId: currentTransaction.id,
              paymentToken: 'tok_test_1234567890',
              installments: 1,
            }),
          );
          let pollCount = 0;
          const maxPolls = 15;

          const interval = setInterval(async () => {
            pollCount++;
            await dispatch(fetchTransaction(transactionId));

            if (pollCount >= maxPolls) {
              clearInterval(interval);
              setProcessing(false);
            }
          }, 2000);

          return () => clearInterval(interval);
        } catch (error) {
          setProcessing(false);
        }
      };

      handlePayment();
    }
  }, [currentTransaction?.status, dispatch, transactionId, processing]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading || !currentTransaction) {
    return (
      <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="processing-container">
            <div className="processing-icon">
              <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#722ed1' }} spin />} />
            </div>
            <Text style={{ marginTop: 24, fontSize: 16, color: '#6b7280' }}>Cargando transacción...</Text>
          </div>
        </Content>
      </Layout>
    );
  }

  if (processing || currentTransaction.status === 'PENDING') {
    return (
      <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
        <Content style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px' }}>
          <Card className="checkout-card">
            <div className="processing-container">
              <div className="processing-icon" style={{ marginBottom: 24 }}>
                <Spin indicator={<LoadingOutlined style={{ fontSize: 56, color: '#722ed1' }} spin />} />
              </div>
              <Title level={3} style={{ marginBottom: 8 }}>Procesando Pago</Title>
              <Text style={{ fontSize: 15, color: '#6b7280' }}>
                Por favor espere mientras procesamos su pago...
              </Text>
              <div style={{ marginTop: 32, display: 'flex', gap: 8, justifyContent: 'center' }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#722ed1',
                      animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </Card>
        </Content>
      </Layout>
    );
  }

  const isSuccess = currentTransaction.status === 'APPROVED';

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Content style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px' }}>
        <Card className="checkout-card">
          <Result
            icon={
              isSuccess ? (
                <CheckCircleOutlined style={{ color: '#10b981', fontSize: 64 }} />
              ) : (
                <CloseCircleOutlined style={{ color: '#ef4444', fontSize: 64 }} />
              )
            }
            title={
              <span style={{ fontSize: 24, fontWeight: 700 }}>
                {isSuccess ? 'Pago Aprobado' : 'Pago Declinado'}
              </span>
            }
            subTitle={
              <span style={{ fontSize: 15, color: '#6b7280' }}>
                {isSuccess
                  ? 'Su pago ha sido procesado exitosamente'
                  : currentTransaction.errorMessage || 'El pago no pudo ser procesado'}
              </span>
            }
            extra={[
              <Button
                type="primary"
                key="home"
                icon={<HomeOutlined />}
                onClick={() => router.push('/')}
                style={{
                  background: 'linear-gradient(135deg, #722ed1 0%, #9333ea 100%)',
                  border: 'none',
                  fontWeight: 600,
                  height: 44,
                  paddingInline: 28,
                }}
              >
                Volver a Productos
              </Button>,
            ]}
          >
            <div style={{
              marginTop: 16,
              textAlign: 'left',
              background: '#f9fafb',
              borderRadius: 12,
              padding: 20,
              border: '1px solid #e5e7eb',
            }}>
              <Title level={5} style={{ marginBottom: 16 }}>Detalles de la Transacción</Title>
              <Space direction="vertical" style={{ width: '100%' }} size={10}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#6b7280' }}>ID de Transacción:</Text>
                  <Text strong style={{ fontFamily: 'monospace', fontSize: 13 }}>{currentTransaction.id}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#6b7280' }}>Estado:</Text>
                  <Text
                    strong
                    style={{
                      color: isSuccess ? '#10b981' : '#ef4444',
                      background: isSuccess ? '#ecfdf5' : '#fef2f2',
                      padding: '2px 10px',
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                  >
                    {currentTransaction.status}
                  </Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: 10, marginTop: 4 }}>
                  <Text style={{ color: '#6b7280' }}>Total:</Text>
                  <Text strong style={{ fontSize: 18, color: '#722ed1' }}>
                    {formatPrice(currentTransaction.totalAmount)}
                  </Text>
                </div>
              </Space>
            </div>
          </Result>
        </Card>
      </Content>
    </Layout>
  );
}
