export interface GatewayPaymentAdapter {
  tokenizeCard(
    cardData: GatewayCardTokenizationRequest,
  ): Promise<GatewayCardTokenizationResponse>;
  createPayment(
    paymentData: GatewayPaymentRequest,
  ): Promise<GatewayPaymentResponse>;
  getPaymentStatus(transactionId: string): Promise<GatewayPaymentStatus>;
}

export interface GatewayCardTokenizationRequest {
  number: string;
  cvc: string;
  expMonth: string;
  expYear: string;
  cardHolder: string;
}

export interface GatewayCardTokenizationResponse {
  status: string;
  data: {
    id: string;
    created_at: string;
    brand: string;
    name: string;
    last_four: string;
    bin: string;
    exp_year: string;
    exp_month: string;
    card_holder: string;
    expires_at: string;
  };
}

export interface GatewayPaymentRequest {
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

export interface GatewayPaymentResponse {
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
    status_message?: string;
  };
}

export interface GatewayPaymentStatus {
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
    status_message?: string;
  };
}
