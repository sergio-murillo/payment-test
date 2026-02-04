'use client';

import { useState, useCallback } from 'react';
import { Form, Input, Button, InputNumber, Typography, Divider } from 'antd';
import {
  ArrowLeftOutlined,
  CreditCardOutlined,
  UserOutlined,
  EnvironmentOutlined,
  SafetyCertificateOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import Image from 'next/image';
import Cards from 'react-credit-cards-2';
import 'react-credit-cards-2/dist/es/styles-compiled.css';
import { Product } from '@/store/slices/products-slice';
import { useOptimizedImage } from '@/hooks/use-optimized-image';
import { CardBrandIcon } from './card-brand-icon';

const { Title, Text } = Typography;

type Focused = 'number' | 'name' | 'expiry' | 'cvc' | '';

interface PaymentFormProps {
  product: Product;
  onSubmit: (data: any) => void;
  onBack: () => void;
}

export function PaymentForm({ product, onSubmit, onBack }: PaymentFormProps) {
  const [form] = Form.useForm();

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
            onFinish={onSubmit}
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
