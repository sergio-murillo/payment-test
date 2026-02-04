import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  WompiPaymentAdapter,
  WompiPaymentRequest,
  WompiPaymentResponse,
  WompiPaymentStatus,
} from '../domain/wompi-payment-adapter';
import { LoggerService } from '../../shared/logger/logger.service';

@Injectable()
export class WompiApiAdapter implements WompiPaymentAdapter {
  private readonly axiosInstance: AxiosInstance;
  private readonly publicKey: string;
  private readonly privateKey: string;
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

    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async createPayment(
    paymentData: WompiPaymentRequest,
  ): Promise<WompiPaymentResponse> {
    try {
      this.logger.debug(
        `Creating Wompi payment for reference: ${paymentData.reference}`,
        'WompiApiAdapter',
      );

      const response = await this.axiosInstance.post(
        '/transactions',
        {
          amount_in_cents: paymentData.amountInCents,
          currency: paymentData.currency,
          customer_email: paymentData.customerEmail,
          payment_method: {
            type: paymentData.paymentMethod.type,
            installments: paymentData.paymentMethod.installments,
            token: paymentData.paymentMethod.token,
          },
          reference: paymentData.reference,
          public_key: paymentData.publicKey,
          redirect_url: paymentData.redirectUrl,
        },
        {
          headers: {
            Authorization: `Bearer ${this.privateKey}`,
          },
        },
      );

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
