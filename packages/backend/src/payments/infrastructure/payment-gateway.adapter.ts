import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import {
  GatewayPaymentAdapter,
  GatewayPaymentRequest,
  GatewayPaymentResponse,
  GatewayPaymentStatus,
  GatewayCardTokenizationRequest,
  GatewayCardTokenizationResponse,
} from '../domain/payment-gateway.port';
import { LoggerService } from '../../shared/logger/logger.service';

@Injectable()
export class PaymentGatewayAdapter implements GatewayPaymentAdapter {
  private readonly axiosInstance: AxiosInstance;
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly integritySecret: string;
  private readonly apiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.apiUrl = this.configService.get<string>(
      'GATEWAY_API_URL',
      'https://api-sandbox.co.uat.gateway.dev/v1',
    );
    this.publicKey = this.configService.get<string>('GATEWAY_PUBLIC_KEY', '');
    this.privateKey = this.configService.get<string>('GATEWAY_PRIVATE_KEY', '');
    this.integritySecret = this.configService.get<string>(
      'GATEWAY_INTEGRITY_SECRET',
      '',
    );

    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Obtiene el acceptance_token del endpoint de merchants
   */
  async getAcceptanceToken(): Promise<string> {
    try {
      this.logger.debug(
        `Getting acceptance token for merchant: ${this.publicKey}`,
        'PaymentGatewayAdapter',
      );

      const response = await this.axiosInstance.get(
        `/merchants/${this.publicKey}`,
      );

      // Obtener el acceptance_token de presigned_acceptance
      const acceptanceToken =
        response.data.data?.presigned_acceptance?.acceptance_token;

      if (!acceptanceToken) {
        throw new Error('Acceptance token not found in merchant response');
      }

      this.logger.debug(
        `Acceptance token obtained successfully`,
        'PaymentGatewayAdapter',
      );

      return acceptanceToken;
    } catch (error: any) {
      this.logger.error(
        'Error getting acceptance token',
        error instanceof Error ? error.stack : String(error),
        'PaymentGatewayAdapter',
      );

      if (error.response) {
        throw new Error(
          `Payment gateway error getting acceptance token: ${JSON.stringify(error.response.data)}`,
        );
      }

      throw error;
    }
  }

  /**
   * Tokeniza una tarjeta usando el endpoint de Gateway
   * Autenticación con llave pública
   */
  async tokenizeCard(
    cardData: GatewayCardTokenizationRequest,
  ): Promise<GatewayCardTokenizationResponse> {
    try {
      this.logger.debug(
        `Tokenizing card ending in ${cardData.number.slice(-4)}`,
        'PaymentGatewayAdapter',
      );
      const response = await this.axiosInstance.post(
        '/tokens/cards',
        {
          number: cardData.number,
          cvc: cardData.cvc,
          exp_month: cardData.expMonth,
          exp_year: cardData.expYear,
          card_holder: cardData.cardHolder,
        },
        {
          headers: {
            Authorization: `Bearer ${this.publicKey}`,
          },
        },
      );

      this.logger.debug(
        `Card tokenized successfully: ${response.data.data.id}`,
        'PaymentGatewayAdapter',
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        'Error tokenizing card',
        error instanceof Error ? error.stack : String(error),
        'PaymentGatewayAdapter',
      );

      if (error.response) {
        throw new Error(
          `Payment gateway error tokenizing card: ${JSON.stringify(error.response.data)}`,
        );
      }

      throw error;
    }
  }

  /**
   * Calcula la signature para la transacción
   * Fórmula: SHA256(reference + amount_in_cents + currency + integrity_secret)
   */
  private calculateSignature(
    reference: string,
    amountInCents: number,
    currency: string,
  ): string {
    const dataToSign = `${reference}${amountInCents}${currency}${this.integritySecret}`;
    return crypto.createHash('sha256').update(dataToSign).digest('hex');
  }

  async createPayment(
    paymentData: GatewayPaymentRequest,
  ): Promise<GatewayPaymentResponse> {
    try {
      this.logger.debug(
        `Creating Gateway payment for reference: ${paymentData.reference}`,
        'PaymentGatewayAdapter',
      );

      // Obtener acceptance_token
      const acceptanceToken = await this.getAcceptanceToken();

      // Calcular signature
      const signature = this.calculateSignature(
        paymentData.reference,
        paymentData.amountInCents,
        paymentData.currency,
      );

      // Construir el payload según la documentación de Gateway
      const payload: any = {
        amount_in_cents: paymentData.amountInCents,
        currency: paymentData.currency,
        customer_email: paymentData.customerEmail,
        payment_method: {
          type: paymentData.paymentMethod.type,
          token: paymentData.paymentMethod.token,
          installments: paymentData.paymentMethod.installments,
        },
        signature,
        payment_method_type: paymentData.paymentMethod.type,
        reference: paymentData.reference,
        acceptance_token: acceptanceToken,
      };

      // Agregar redirect_url solo si está presente
      if (paymentData.redirectUrl) {
        payload.redirect_url = paymentData.redirectUrl;
      }

      const response = await this.axiosInstance.post('/transactions', payload, {
        headers: {
          Authorization: `Bearer ${this.privateKey}`,
        },
      });

      this.logger.debug(
        `Gateway payment created: ${response.data.data.id}`,
        'PaymentGatewayAdapter',
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        'Error creating Gateway payment',
        error instanceof Error ? error.stack : String(error),
        'PaymentGatewayAdapter',
      );

      if (error.response) {
        throw new Error(
          `Payment gateway error: ${JSON.stringify(error.response.data)}`,
        );
      }

      throw error;
    }
  }

  async getPaymentStatus(transactionId: string): Promise<GatewayPaymentStatus> {
    try {
      this.logger.debug(
        `Getting Gateway payment status: ${transactionId}`,
        'PaymentGatewayAdapter',
      );

      const response = await this.axiosInstance.get(
        `/transactions/${transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${this.publicKey}`,
          },
        },
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Error getting Gateway payment status: ${transactionId}`,
        error instanceof Error ? error.stack : String(error),
        'PaymentGatewayAdapter',
      );

      if (error.response) {
        throw new Error(
          `Payment gateway error: ${JSON.stringify(error.response.data)}`,
        );
      }

      throw error;
    }
  }
}
