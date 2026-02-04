'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchTransaction, processPayment } from '@/store/slices/transaction-slice';
import { Layout, Card, Typography, Button, Spin, Alert, Result, Space } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

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
      // In a real implementation, you would get the payment token from Wompi
      // For now, we'll simulate it
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
          // Poll for transaction status
          let pollCount = 0;
          const maxPolls = 15; // 30 seconds max (15 * 2 seconds)
          
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
      <Layout style={{ minHeight: '100vh', padding: '20px' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Spin size="large" />
        </Content>
      </Layout>
    );
  }

  if (processing || currentTransaction.status === 'PENDING') {
    return (
      <Layout style={{ minHeight: '100vh', padding: '20px' }}>
        <Content style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Card>
            <Result
              icon={<Spin size="large" />}
              title="Procesando Pago"
              subTitle="Por favor espere mientras procesamos su pago..."
            />
          </Card>
        </Content>
      </Layout>
    );
  }

  const isSuccess = currentTransaction.status === 'APPROVED';

  return (
    <Layout style={{ minHeight: '100vh', padding: '20px' }}>
      <Content style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Card>
          <Result
            icon={isSuccess ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            title={isSuccess ? 'Pago Aprobado' : 'Pago Declinado'}
            subTitle={
              isSuccess
                ? 'Su pago ha sido procesado exitosamente'
                : currentTransaction.errorMessage || 'El pago no pudo ser procesado'
            }
            extra={[
              <Button type="primary" key="home" onClick={() => router.push('/')}>
                Volver a Productos
              </Button>,
            ]}
          >
            <div style={{ marginTop: '24px', textAlign: 'left' }}>
              <Title level={4}>Detalles de la Transacción</Title>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>ID de Transacción:</Text>
                  <Text strong>{currentTransaction.id}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Estado:</Text>
                  <Text strong>{currentTransaction.status}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Total:</Text>
                  <Text strong>{formatPrice(currentTransaction.totalAmount)}</Text>
                </div>
              </Space>
            </div>
          </Result>
        </Card>
      </Content>
    </Layout>
  );
}
