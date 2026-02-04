'use client';

import { useState } from 'react';
import { Modal, Form, Input, Button, InputNumber, Space, Typography } from 'antd';
import { Product } from '@/store/slices/products-slice';

const { Text } = Typography;

interface PaymentModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (data: any) => void;
  product: Product;
}

export function PaymentModal({ visible, onCancel, onSubmit, product }: PaymentModalProps) {
  const [form] = Form.useForm();
  const [cardNumber, setCardNumber] = useState('');

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\s/g, '');
    if (value.length <= 16) {
      value = value.match(/.{1,4}/g)?.join(' ') || value;
      setCardNumber(value);
      form.setFieldsValue({ cardNumber: value });
    }
  };

  const detectCardType = (number: string): string => {
    const cleanNumber = number.replace(/\s/g, '');
    if (cleanNumber.startsWith('4')) return 'VISA';
    if (cleanNumber.startsWith('5') || cleanNumber.startsWith('2')) return 'MASTERCARD';
    return '';
  };

  const commission = product.price * 0.03;
  const shippingCost = 15000;
  const total = product.price + commission + shippingCost;

  return (
    <Modal
      title="Información de Pago"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={400}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        initialValues={{ installments: 1 }}
      >
        <Form.Item
          label="Número de Tarjeta"
          name="cardNumber"
          rules={[
            { required: true, message: 'Por favor ingrese el número de tarjeta' },
            { pattern: /^\d{4}\s\d{4}\s\d{4}\s\d{4}$/, message: 'Formato inválido' },
          ]}
        >
          <Input
            placeholder="1234 5678 9012 3456"
            maxLength={19}
            onChange={handleCardNumberChange}
            value={cardNumber}
            suffix={
              cardNumber.length >= 4 ? (
                <Text type="secondary">{detectCardType(cardNumber)}</Text>
              ) : null
            }
          />
        </Form.Item>

        <Form.Item
          label="Nombre del Titular"
          name="cardHolderName"
          rules={[{ required: true, message: 'Por favor ingrese el nombre' }]}
        >
          <Input placeholder="Juan Pérez" />
        </Form.Item>

        <Space>
          <Form.Item
            label="Mes"
            name="expiryMonth"
            rules={[{ required: true, message: 'Mes requerido' }]}
          >
            <InputNumber min={1} max={12} placeholder="MM" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Año"
            name="expiryYear"
            rules={[{ required: true, message: 'Año requerido' }]}
          >
            <InputNumber min={2024} max={2099} placeholder="YYYY" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="CVV"
            name="cvv"
            rules={[{ required: true, message: 'CVV requerido' }]}
          >
            <Input placeholder="123" maxLength={4} />
          </Form.Item>
        </Space>

        <Form.Item
          label="Cuotas"
          name="installments"
          rules={[{ required: true, message: 'Seleccione el número de cuotas' }]}
        >
          <InputNumber min={1} max={24} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Email requerido' },
            { type: 'email', message: 'Email inválido' },
          ]}
        >
          <Input type="email" placeholder="usuario@ejemplo.com" />
        </Form.Item>

        <Form.Item
          label="Nombre Completo"
          name="name"
          rules={[{ required: true, message: 'Nombre requerido' }]}
        >
          <Input placeholder="Juan Pérez" />
        </Form.Item>

        <Form.Item
          label="Dirección de Entrega"
          name="address"
          rules={[{ required: true, message: 'Dirección requerida' }]}
        >
          <Input placeholder="Calle 123 #45-67" />
        </Form.Item>

        <Form.Item
          label="Ciudad"
          name="city"
          rules={[{ required: true, message: 'Ciudad requerida' }]}
        >
          <Input placeholder="Bogotá" />
        </Form.Item>

        <Form.Item
          label="Teléfono"
          name="phone"
          rules={[{ required: true, message: 'Teléfono requerido' }]}
        >
          <Input placeholder="+57 300 123 4567" />
        </Form.Item>

        <div style={{ marginTop: '24px', padding: '16px', background: '#f5f5f5', borderRadius: '4px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>Producto:</Text>
              <Text>{formatPrice(product.price)}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>Comisión (3%):</Text>
              <Text>{formatPrice(commission)}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>Envío:</Text>
              <Text>{formatPrice(shippingCost)}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #d9d9d9', paddingTop: '8px', marginTop: '8px' }}>
              <Text strong>Total:</Text>
              <Text strong style={{ fontSize: '18px', color: '#722ed1' }}>
                {formatPrice(total)}
              </Text>
            </div>
          </Space>
        </div>

        <Form.Item style={{ marginTop: '24px' }}>
          <Button type="primary" htmlType="submit" block size="large">
            Continuar al Pago
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
