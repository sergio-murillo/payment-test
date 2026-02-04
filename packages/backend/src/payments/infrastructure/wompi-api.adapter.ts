import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import {
  WompiPaymentAdapter,
  WompiPaymentRequest,
  WompiPaymentResponse,
  WompiPaymentStatus,
  WompiCardTokenizationRequest,
  WompiCardTokenizationResponse,
} from '../domain/wompi-payment-adapter';
import { LoggerService } from '../../shared/logger/logger.service';

@Injectable()
export class WompiApiAdapter implements WompiPaymentAdapter {
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
      'WOMPI_API_URL',
      'https://api-sandbox.co.uat.wompi.dev/v1',
    );
    this.publicKey = this.configService.get<string>(
      'WOMPI_PUBLIC_KEY',
      'pub_stagtest_g2u0HQd3ZMh05hsSgTS2lUV8t3s4mOt7',
    );
    this.privateKey = this.configService.get<string>(
      'WOMPI_PRIVATE_KEY',
      'prv_stagtest_5i0ZGIGiFcDQifYsXxvsny7Y37tKqFWg',
    );
    this.integritySecret = this.configService.get<string>(
      'WOMPI_INTEGRITY_SECRET',
      'stagtest_integrity_nAIBuqayW70XpUqJS4qf4STYiISd89Fp',
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
        'WompiApiAdapter',
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
        'WompiApiAdapter',
      );

      return acceptanceToken;
    } catch (error: any) {
      this.logger.error(
        'Error getting acceptance token',
        error instanceof Error ? error.stack : String(error),
        'WompiApiAdapter',
      );

      if (error.response) {
        throw new Error(
          `Wompi API error getting acceptance token: ${JSON.stringify(error.response.data)}`,
        );
      }

      throw error;
    }
  }

  /**
   * Tokeniza una tarjeta usando el endpoint de Wompi
   * Autenticación con llave pública
   */
  async tokenizeCard(
    cardData: WompiCardTokenizationRequest,
  ): Promise<WompiCardTokenizationResponse> {
    try {
      this.logger.debug(
        `Tokenizing card ending in ${cardData.number.slice(-4)}`,
        'WompiApiAdapter',
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
        'WompiApiAdapter',
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        'Error tokenizing card',
        error instanceof Error ? error.stack : String(error),
        'WompiApiAdapter',
      );

      if (error.response) {
        throw new Error(
          `Wompi API error tokenizing card: ${JSON.stringify(error.response.data)}`,
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
    paymentData: WompiPaymentRequest,
  ): Promise<WompiPaymentResponse> {
    try {
      this.logger.debug(
        `Creating Wompi payment for reference: ${paymentData.reference}`,
        'WompiApiAdapter',
      );

      // Obtener acceptance_token
      const acceptanceToken = await this.getAcceptanceToken();

      // Calcular signature
      const signature = this.calculateSignature(
        paymentData.reference,
        paymentData.amountInCents,
        paymentData.currency,
      );

      // Construir el payload según la documentación de Wompi
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
        `Wompi payment created: ${response.data.data.id}`,
        'WompiApiAdapter',
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        'Error creating Wompi payment',
        error instanceof Error ? error.stack : String(error),
        'WompiApiAdapter',
      );

      if (error.response) {
        throw new Error(
          `Wompi API error: ${JSON.stringify(error.response.data)}`,
        );
      }

      throw error;
    }
  }

  async getPaymentStatus(transactionId: string): Promise<WompiPaymentStatus> {
    try {
      this.logger.debug(
        `Getting Wompi payment status: ${transactionId}`,
        'WompiApiAdapter',
      );

      const response = await this.axiosInstance.get(
        `/transactions/${transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${this.privateKey}`,
          },
        },
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Error getting Wompi payment status: ${transactionId}`,
        error instanceof Error ? error.stack : String(error),
        'WompiApiAdapter',
      );

      if (error.response) {
        throw new Error(
          `Wompi API error: ${JSON.stringify(error.response.data)}`,
        );
      }

      throw error;
    }
  }
}
