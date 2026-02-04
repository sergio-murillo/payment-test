export interface WompiPaymentAdapter {
  createPayment(
    paymentData: WompiPaymentRequest,
  ): Promise<WompiPaymentResponse>;
  getPaymentStatus(transactionId: string): Promise<WompiPaymentStatus>;
}

export interface WompiPaymentRequest {
  amountInCents: number;
  currency: string;
  customerEmail: string;
  paymentMethod: {
    type: string;
    installments: number;
    token: string;
  };
  reference: string;
  publicKey: string;
  redirectUrl?: string;
}

export interface WompiPaymentResponse {
  data: {
    id: string;
    status: string;
    amount_in_cents: number;
    currency: string;
    customer_email: string;
    payment_method_type: string;
    reference: string;
    created_at: string;
    finalized_at?: string;
  };
}

export interface WompiPaymentStatus {
  data: {
    id: string;
    status: string;
    amount_in_cents: number;
    currency: string;
    customer_email: string;
    payment_method_type: string;
    reference: string;
    created_at: string;
    finalized_at?: string;
  };
}
