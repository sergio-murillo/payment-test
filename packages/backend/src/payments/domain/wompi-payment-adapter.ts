export interface WompiPaymentAdapter {
  tokenizeCard(
    cardData: WompiCardTokenizationRequest,
  ): Promise<WompiCardTokenizationResponse>;
  createPayment(
    paymentData: WompiPaymentRequest,
  ): Promise<WompiPaymentResponse>;
  getPaymentStatus(transactionId: string): Promise<WompiPaymentStatus>;
}

export interface WompiCardTokenizationRequest {
  number: string;
  cvc: string;
  expMonth: string;
  expYear: string;
  cardHolder: string;
}

export interface WompiCardTokenizationResponse {
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
    status_message?: string;
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
    status_message?: string;
  };
}
