'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchTransaction, processPayment } from '@/store/slices/transaction-slice';
import { Layout, Card, Typography, Button, Spin, Result, Space, Form, Input, InputNumber } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, HomeOutlined, CreditCardOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import Cards from 'react-credit-cards-2';
import 'react-credit-cards-2/dist/es/styles-compiled.css';

const { Content } = Layout;
const { Title, Text } = Typography;

type Focused = 'number' | 'name' | 'expiry' | 'cvc' | '';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentTransaction, loading } = useAppSelector((state) => state.transaction);
  const [processing, setProcessing] = useState(false);
  const [form] = Form.useForm();
  const [cardState, setCardState] = useState({
    number: '',
    name: '',
    expiry: '',
    cvc: '',
    focused: '' as Focused,
  });

  const transactionId = params.id as string;

  useEffect(() => {
    if (transactionId) {
      dispatch(fetchTransaction(transactionId));
    }
  }, [transactionId, dispatch]);

  const handleCardNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw.length <= 16) {
      const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
      form.setFieldsValue({ cardNumber: formatted });
      setCardState((prev) => ({ ...prev, number: raw }));
    }
  }, [form]);

  const handleExpiryMonth = useCallback((val: number | null) => {
    const month = val ? String(val).padStart(2, '0') : '';
    const year = form.getFieldValue('expiryYear');
    const yearStr = year ? String(year).slice(-2) : '';
    setCardState((prev) => ({ ...prev, expiry: month + yearStr }));
  }, [form]);

  const handleExpiryYear = useCallback((val: number | null) => {
    const yearStr = val ? String(val).slice(-2) : '';
    const month = form.getFieldValue('expiryMonth');
    const monthStr = month ? String(month).padStart(2, '0') : '';
    setCardState((prev) => ({ ...prev, expiry: monthStr + yearStr }));
  }, [form]);

  const setFocused = useCallback((field: Focused) => {
    setCardState((prev) => ({ ...prev, focused: field }));
  }, []);

  const handlePaymentSubmit = async (values: any) => {
    setProcessing(true);
    try {
      // Extract card number without spaces
      const cardNumber = values.cardNumber.replace(/\s/g, '');
      const expMonth = String(values.expiryMonth).padStart(2, '0');
      const expYear = String(values.expiryYear).slice(-2);

      await dispatch(
        processPayment({
          transactionId: currentTransaction!.id,
          cardNumber,
          cvc: values.cvv,
          expMonth,
          expYear,
          cardHolder: values.cardHolderName,
          installments: values.installments || 1,
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

  if (processing) {
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

  if (currentTransaction.status === 'PENDING') {
    return (
      <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
        <Content style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
          <Card className="checkout-card">
            <Title level={2} style={{ marginBottom: 24, textAlign: 'center' }}>Completa tu Pago</Title>
            <Form
              form={form}
              layout="vertical"
              onFinish={handlePaymentSubmit}
              initialValues={{ installments: 1 }}
              requiredMark={false}
              size="large"
            >
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                  <Cards
                    number={cardState.number}
                    expiry={cardState.expiry}
                    cvc={cardState.cvc}
                    name={cardState.name}
                    focused={cardState.focused || undefined}
                    locale={{ valid: 'Válido hasta' }}
                    placeholders={{ name: 'TU NOMBRE' }}
                  />
                </div>

                <Form.Item
                  label="Número de Tarjeta"
                  name="cardNumber"
                  rules={[
                    { required: true, message: 'Por favor ingresa el número de tarjeta' },
                    { pattern: /^\d{4}\s\d{4}\s\d{4}\s\d{4}$/, message: 'Debe tener 16 dígitos' },
                  ]}
                >
                  <Input
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    onChange={handleCardNumberChange}
                    onFocus={() => setFocused('number')}
                    prefix={<CreditCardOutlined style={{ color: '#9ca3af' }} />}
                  />
                </Form.Item>

                <Form.Item
                  label="Nombre del Titular"
                  name="cardHolderName"
                  rules={[{ required: true, message: 'Ingresa el nombre como aparece en la tarjeta' }]}
                >
                  <Input
                    placeholder="JUAN PEREZ"
                    prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
                    style={{ textTransform: 'uppercase' }}
                    onChange={(e) => setCardState((prev) => ({ ...prev, name: e.target.value }))}
                    onFocus={() => setFocused('name')}
                  />
                </Form.Item>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <Form.Item
                    label="Mes"
                    name="expiryMonth"
                    rules={[{ required: true, message: 'Requerido' }]}
                  >
                    <InputNumber
                      min={1}
                      max={12}
                      placeholder="MM"
                      style={{ width: '100%' }}
                      controls={false}
                      onChange={handleExpiryMonth}
                      onFocus={() => setFocused('expiry')}
                    />
                  </Form.Item>

                  <Form.Item
                    label="Año"
                    name="expiryYear"
                    rules={[{ required: true, message: 'Requerido' }]}
                  >
                    <InputNumber
                      min={2024}
                      max={2099}
                      placeholder="AAAA"
                      style={{ width: '100%' }}
                      controls={false}
                      onChange={handleExpiryYear}
                      onFocus={() => setFocused('expiry')}
                    />
                  </Form.Item>

                  <Form.Item
                    label="CVV"
                    name="cvv"
                    rules={[{ required: true, message: 'Requerido' }]}
                  >
                    <Input
                      placeholder="•••"
                      maxLength={4}
                      prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                      onChange={(e) => setCardState((prev) => ({ ...prev, cvc: e.target.value }))}
                      onFocus={() => setFocused('cvc')}
                    />
                  </Form.Item>
                </div>

                <Form.Item
                  label="Número de Cuotas"
                  name="installments"
                  rules={[{ required: true, message: 'Selecciona cuotas' }]}
                >
                  <InputNumber
                    min={1}
                    max={24}
                    style={{ width: '100%' }}
                    controls
                    onFocus={() => setFocused('')}
                  />
                </Form.Item>
              </div>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  icon={<LockOutlined />}
                  style={{
                    background: 'linear-gradient(135deg, #722ed1 0%, #9333ea 100%)',
                    border: 'none',
                    fontWeight: 600,
                    height: 48,
                  }}
                >
                  Procesar Pago
                </Button>
              </Form.Item>
            </Form>
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
