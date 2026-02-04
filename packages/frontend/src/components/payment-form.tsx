'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { Form, Input, Button, InputNumber, Typography, Divider, Card, Result, Space, Spin } from 'antd';
import {
  ArrowLeftOutlined,
  CreditCardOutlined,
  UserOutlined,
  EnvironmentOutlined,
  SafetyCertificateOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import Image from 'next/image';
import Cards from 'react-credit-cards-2';
import 'react-credit-cards-2/dist/es/styles-compiled.css';
import { Product } from '@/store/slices/products-slice';
import { useOptimizedImage } from '@/hooks/use-optimized-image';
import { CardBrandIcon } from './card-brand-icon';
import { createTransaction, processPayment, fetchTransaction } from '@/store/slices/transaction-slice';
import { v4 as uuidv4 } from 'uuid';

const { Title, Text } = Typography;

type Focused = 'number' | 'name' | 'expiry' | 'cvc' | '';

interface PaymentFormProps {
  product: Product;
  onBack: () => void;
}

export function PaymentForm({ product, onBack }: PaymentFormProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentTransaction, loading } = useAppSelector((state) => state.transaction);
  const [form] = Form.useForm();
  const [processing, setProcessing] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-fill form with transaction data if available
  useEffect(() => {
    if (currentTransaction && currentTransaction.status === 'PENDING') {
      form.setFieldsValue({
        name: currentTransaction.customerName,
        email: currentTransaction.customerEmail,
        phone: currentTransaction.deliveryPhone,
        address: currentTransaction.deliveryAddress,
        city: currentTransaction.deliveryCity,
      });
    }
  }, [currentTransaction, form]);

  // Card state for the 3D preview
  const [cardState, setCardState] = useState({
    number: '',
    name: '',
    expiry: '',
    cvc: '',
    focused: '' as Focused,
  });

  const optimizedImageUrl = useOptimizedImage(
    product.imageUrl,
    'small',
    { width: 120, height: 120 },
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Handle card number with formatting
  const handleCardNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw.length <= 16) {
      const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
      form.setFieldsValue({ cardNumber: formatted });
      setCardState((prev) => ({ ...prev, number: raw }));
    }
  }, [form]);

  // Handle expiry building from separate month/year fields
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

  const commission = product.price * 0.03;
  const shippingCost = 15000;
  const total = product.price + commission + shippingCost;

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Stop polling when transaction is in final state
  useEffect(() => {
    if (currentTransaction && currentTransaction.status !== 'PENDING' && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setProcessing(false);
    }
  }, [currentTransaction]);

  const handlePaymentSubmit = async (values: any) => {
    try {
      setProcessing(true);
      
      // Create transaction with all customer data
      const idempotencyKey = uuidv4();
      const transaction = await dispatch(
        createTransaction({
          productId: product.id,
          amount: product.price,
          commission,
          shippingCost,
          customerEmail: values.email,
          customerName: values.name,
          deliveryAddress: values.address,
          deliveryCity: values.city,
          deliveryPhone: values.phone,
          idempotencyKey,
        }),
      ).unwrap();

      // Ensure transaction exists
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Extract card number without spaces
      const cardNumber = values.cardNumber.replace(/\s/g, '');
      const expMonth = String(values.expiryMonth).padStart(2, '0');
      const expYear = String(values.expiryYear).slice(-2);

      // Process payment
      await dispatch(
        processPayment({
          transactionId: transaction.id,
          cardNumber,
          cvc: values.cvv,
          expMonth,
          expYear,
          cardHolder: values.cardHolderName,
          installments: values.installments || 1,
        }),
      );

      // Start polling for transaction status
      let pollCount = 0;
      const maxPolls = 15;
      const transactionIdForPolling = transaction.id;

      pollingIntervalRef.current = setInterval(async () => {
        pollCount++;
        const result = await dispatch(fetchTransaction(transactionIdForPolling));
        const updatedTransaction = fetchTransaction.fulfilled.match(result) ? result.payload : null;

        // Stop polling if transaction is in final state or max polls reached
        if (updatedTransaction && updatedTransaction.status !== 'PENDING') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setProcessing(false);
        } else if (pollCount >= maxPolls) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setProcessing(false);
        }
      }, 2000);
    } catch (error) {
      setProcessing(false);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  };

  // Show processing state
  if (processing) {
    return (
      <div className="payment-page">
        <div className="payment-back">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
            className="payment-back-btn"
            disabled
          >
            Volver al producto
          </Button>
        </div>
        <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px' }}>
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
        </div>
      </div>
    );
  }

  // Show result if transaction is in final state
  if (currentTransaction && currentTransaction.status !== 'PENDING') {
    const isSuccess = currentTransaction.status === 'APPROVED';

    return (
      <div className="payment-page">
        <div className="payment-back">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
            className="payment-back-btn"
          >
            Volver al producto
          </Button>
        </div>
        <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px' }}>
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
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page">
      {/* Back button */}
      <div className="payment-back">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          className="payment-back-btn"
        >
          Volver al producto
        </Button>
      </div>

      {/* Page title */}
      <div className="payment-page-header">
        <div className="payment-page-header-icon">
          <SafetyCertificateOutlined />
        </div>
        <Title level={2} style={{ marginBottom: 0 }}>Información de Pago</Title>
        <Text style={{ color: '#6b7280', fontSize: 15 }}>
          Completa los datos para realizar tu compra de forma segura
        </Text>
      </div>

      <div className="payment-layout">
        {/* Left column: Form */}
        <div className="payment-form-column">
          <Form
            form={form}
            layout="vertical"
            onFinish={handlePaymentSubmit}
            initialValues={{ installments: 1 }}
            requiredMark={false}
            size="large"
          >
            {/* Section 1: Card with live preview */}
            <div className="payment-section">
              <div className="payment-section-header">
                <CreditCardOutlined className="payment-section-icon" />
                <div>
                  <Title level={5} style={{ marginBottom: 0 }}>Datos de la Tarjeta</Title>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Ingresa la información de tu tarjeta de crédito
                  </Text>
                </div>
              </div>

              <div className="payment-section-body">
                {/* Interactive Card Preview */}
                <div className="payment-card-preview">
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
                    className="payment-card-input"
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

                <div className="payment-row-3">
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
            </div>

            {/* Section 2: Personal Info */}
            <div className="payment-section">
              <div className="payment-section-header">
                <UserOutlined className="payment-section-icon" />
                <div>
                  <Title level={5} style={{ marginBottom: 0 }}>Datos Personales</Title>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Información del comprador
                  </Text>
                </div>
              </div>

              <div className="payment-section-body">
                <Form.Item
                  label="Nombre Completo"
                  name="name"
                  rules={[{ required: true, message: 'Ingresa tu nombre completo' }]}
                >
                  <Input
                    placeholder="Juan Pérez"
                    prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
                    onFocus={() => setFocused('')}
                  />
                </Form.Item>

                <div className="payment-row-2">
                  <Form.Item
                    label="Correo Electrónico"
                    name="email"
                    rules={[
                      { required: true, message: 'Ingresa tu email' },
                      { type: 'email', message: 'Email inválido' },
                    ]}
                  >
                    <Input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      prefix={<MailOutlined style={{ color: '#9ca3af' }} />}
                      onFocus={() => setFocused('')}
                    />
                  </Form.Item>

                  <Form.Item
                    label="Teléfono"
                    name="phone"
                    rules={[{ required: true, message: 'Ingresa tu teléfono' }]}
                  >
                    <Input
                      placeholder="+57 300 123 4567"
                      prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />}
                      onFocus={() => setFocused('')}
                    />
                  </Form.Item>
                </div>
              </div>
            </div>

            {/* Section 3: Delivery */}
            <div className="payment-section">
              <div className="payment-section-header">
                <EnvironmentOutlined className="payment-section-icon" />
                <div>
                  <Title level={5} style={{ marginBottom: 0 }}>Dirección de Entrega</Title>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Lugar donde recibirás tu producto
                  </Text>
                </div>
              </div>

              <div className="payment-section-body">
                <Form.Item
                  label="Dirección"
                  name="address"
                  rules={[{ required: true, message: 'Ingresa la dirección' }]}
                >
                  <Input
                    placeholder="Calle 123 #45-67, Apto 101"
                    prefix={<EnvironmentOutlined style={{ color: '#9ca3af' }} />}
                    onFocus={() => setFocused('')}
                  />
                </Form.Item>

                <Form.Item
                  label="Ciudad"
                  name="city"
                  rules={[{ required: true, message: 'Ingresa la ciudad' }]}
                >
                  <Input
                    placeholder="Bogotá"
                    onFocus={() => setFocused('')}
                  />
                </Form.Item>
              </div>
            </div>

            {/* Submit (mobile only) */}
            <div className="payment-submit-mobile">
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                icon={<LockOutlined />}
                className="payment-submit-btn"
              >
                Pagar {formatPrice(total)}
              </Button>
              <div className="payment-secure-badge">
                <LockOutlined style={{ fontSize: 12 }} />
                <span>Pago seguro encriptado con SSL</span>
              </div>
            </div>
          </Form>
        </div>

        {/* Right column: Order Summary (sticky) */}
        <div className="payment-summary-column">
          <div className="payment-summary-card">
            <Title level={5} style={{ marginBottom: 16 }}>Resumen del Pedido</Title>

            {/* Product mini card */}
            <div className="payment-summary-product">
              <div className="payment-summary-product-img">
                <Image
                  src={optimizedImageUrl}
                  alt={product.name}
                  width={64}
                  height={64}
                  style={{ objectFit: 'cover', borderRadius: 10 }}
                />
              </div>
              <div className="payment-summary-product-info">
                <Text strong style={{ fontSize: 14, display: 'block', lineHeight: 1.3 }}>
                  {product.name}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {product.categoria}
                </Text>
              </div>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            {/* Price breakdown */}
            <div className="payment-summary-rows">
              <div className="payment-summary-row">
                <Text style={{ color: '#6b7280' }}>Subtotal</Text>
                <Text>{formatPrice(product.price)}</Text>
              </div>
              <div className="payment-summary-row">
                <Text style={{ color: '#6b7280' }}>Comisión (3%)</Text>
                <Text>{formatPrice(commission)}</Text>
              </div>
              <div className="payment-summary-row">
                <Text style={{ color: '#6b7280' }}>Envío</Text>
                <Text>{formatPrice(shippingCost)}</Text>
              </div>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            <div className="payment-summary-row payment-summary-total">
              <Text strong style={{ fontSize: 16 }}>Total</Text>
              <Text strong style={{ fontSize: 20, color: '#722ed1' }}>
                {formatPrice(total)}
              </Text>
            </div>

            {/* Submit (desktop) */}
            <div className="payment-submit-desktop">
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                icon={<LockOutlined />}
                className="payment-submit-btn"
                onClick={() => form.submit()}
              >
                Pagar {formatPrice(total)}
              </Button>
              <div className="payment-secure-badge">
                <LockOutlined style={{ fontSize: 12 }} />
                <span>Pago seguro encriptado con SSL</span>
              </div>
            </div>

            {/* Accepted cards */}
            <div className="payment-accepted-cards">
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                Métodos aceptados
              </Text>
              <div style={{ display: 'flex', gap: 8 }}>
                <CardBrandIcon brand="visa" size={44} />
                <CardBrandIcon brand="mastercard" size={44} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
