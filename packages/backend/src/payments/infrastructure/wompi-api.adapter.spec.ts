import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WompiApiAdapter } from './wompi-api.adapter';
import { LoggerService } from '../../shared/logger/logger.service';
import axios from 'axios';

// Mock axios before importing the adapter
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WompiApiAdapter', () => {
  let adapter: WompiApiAdapter;
  let logger: jest.Mocked<LoggerService>;
  let axiosInstance: any;

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          WOMPI_API_URL: 'https://api-sandbox.co.uat.wompi.dev/v1',
          WOMPI_PUBLIC_KEY: 'pub_test_key',
          WOMPI_PRIVATE_KEY: 'prv_test_key',
          WOMPI_INTEGRITY_SECRET: 'test_integrity_secret',
        };
        return config[key] || defaultValue;
      }),
    };

    const mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
    };

    // Create mock axios instance
    axiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
    };

    // Mock axios.create to return our mock instance
    (mockedAxios.create as jest.Mock) = jest.fn(() => axiosInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WompiApiAdapter,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    adapter = module.get<WompiApiAdapter>(WompiApiAdapter);
    logger = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('getAcceptanceToken', () => {
    it('should get acceptance token successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            presigned_acceptance: {
              acceptance_token: 'test_acceptance_token_123',
            },
          },
        },
      };

      axiosInstance.get.mockResolvedValue(mockResponse);

      const result = await adapter.getAcceptanceToken();

      expect(result).toBe('test_acceptance_token_123');
      expect(axiosInstance.get).toHaveBeenCalledWith('/merchants/pub_test_key');
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should throw error when acceptance token not found', async () => {
      const mockResponse = {
        data: {
          data: {},
        },
      };

      axiosInstance.get.mockResolvedValue(mockResponse);

      await expect(adapter.getAcceptanceToken()).rejects.toThrow(
        'Acceptance token not found in merchant response',
      );
    });

    it('should handle API errors', async () => {
      const error = {
        response: {
          data: { error: 'Invalid merchant key' },
        },
      };

      axiosInstance.get.mockRejectedValue(error);

      await expect(adapter.getAcceptanceToken()).rejects.toThrow(
        'Wompi API error getting acceptance token',
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      axiosInstance.get.mockRejectedValue(error);

      await expect(adapter.getAcceptanceToken()).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('tokenizeCard', () => {
    it('should tokenize card successfully', async () => {
      const cardData = {
        number: '4242424242424242',
        cvc: '123',
        expMonth: '08',
        expYear: '28',
        cardHolder: 'JOSE PEREZ',
      };

      const mockResponse = {
        data: {
          status: 'CREATED',
          data: {
            id: 'tok_test_123',
            created_at: '2024-01-01T00:00:00.000Z',
            brand: 'VISA',
            name: 'VISA',
            last_four: '4242',
            bin: '424242',
            exp_year: '28',
            exp_month: '08',
            card_holder: 'JOSE PEREZ',
            expires_at: '2028-08-31T23:59:59.000Z',
          },
        },
      };

      axiosInstance.post.mockResolvedValue(mockResponse);

      const result = await adapter.tokenizeCard(cardData);

      expect(result.status).toBe('CREATED');
      expect(result.data.id).toBe('tok_test_123');
      expect(axiosInstance.post).toHaveBeenCalledWith(
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
            Authorization: 'Bearer pub_test_key',
          },
        },
      );
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const cardData = {
        number: '4242424242424242',
        cvc: '123',
        expMonth: '08',
        expYear: '28',
        cardHolder: 'JOSE PEREZ',
      };

      const error = {
        response: {
          data: { error: 'Invalid card data' },
        },
      };

      axiosInstance.post.mockRejectedValue(error);

      await expect(adapter.tokenizeCard(cardData)).rejects.toThrow(
        'Wompi API error tokenizing card',
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('createPayment', () => {
    it('should create payment successfully', async () => {
      const paymentData = {
        amountInCents: 50000,
        currency: 'COP',
        customerEmail: 'test@example.com',
        paymentMethod: {
          type: 'CARD',
          token: 'tok_test_123',
          installments: 1,
        },
        reference: 'trans-001',
        publicKey: 'pub_test_key',
      };

      const mockAcceptanceResponse = {
        data: {
          data: {
            presigned_acceptance: {
              acceptance_token: 'test_acceptance_token',
            },
          },
        },
      };

      const mockPaymentResponse = {
        data: {
          data: {
            id: 'wompi_trans_123',
            status: 'PENDING',
            amount_in_cents: 50000,
            currency: 'COP',
            customer_email: 'test@example.com',
            payment_method_type: 'CARD',
            reference: 'trans-001',
            created_at: '2024-01-01T00:00:00.000Z',
          },
        },
      };

      axiosInstance.get.mockResolvedValue(mockAcceptanceResponse);
      axiosInstance.post.mockResolvedValue(mockPaymentResponse);

      const result = await adapter.createPayment(paymentData);

      expect(result.data.id).toBe('wompi_trans_123');
      expect(result.data.status).toBe('PENDING');
      expect(axiosInstance.get).toHaveBeenCalledWith('/merchants/pub_test_key');
      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/transactions',
        expect.objectContaining({
          amount_in_cents: 50000,
          currency: 'COP',
          customer_email: 'test@example.com',
          reference: 'trans-001',
          acceptance_token: 'test_acceptance_token',
          signature: expect.any(String),
          payment_method_type: 'CARD',
          payment_method: expect.objectContaining({
            type: 'CARD',
            token: 'tok_test_123',
            installments: 1,
          }),
        }),
        {
          headers: {
            Authorization: 'Bearer prv_test_key',
          },
        },
      );
    });

    it('should include redirect_url when provided', async () => {
      const paymentData = {
        amountInCents: 50000,
        currency: 'COP',
        customerEmail: 'test@example.com',
        paymentMethod: {
          type: 'CARD',
          token: 'tok_test_123',
          installments: 1,
        },
        reference: 'trans-001',
        publicKey: 'pub_test_key',
        redirectUrl: 'https://example.com/callback',
      };

      const mockAcceptanceResponse = {
        data: {
          data: {
            presigned_acceptance: {
              acceptance_token: 'test_acceptance_token',
            },
          },
        },
      };

      const mockPaymentResponse = {
        data: {
          data: {
            id: 'wompi_trans_123',
            status: 'PENDING',
          },
        },
      };

      axiosInstance.get.mockResolvedValue(mockAcceptanceResponse);
      axiosInstance.post.mockResolvedValue(mockPaymentResponse);

      await adapter.createPayment(paymentData);

      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/transactions',
        expect.objectContaining({
          redirect_url: 'https://example.com/callback',
        }),
        expect.any(Object),
      );
    });

    it('should handle API errors', async () => {
      const paymentData = {
        amountInCents: 50000,
        currency: 'COP',
        customerEmail: 'test@example.com',
        paymentMethod: {
          type: 'CARD',
          token: 'tok_test_123',
          installments: 1,
        },
        reference: 'trans-001',
        publicKey: 'pub_test_key',
      };

      const mockAcceptanceResponse = {
        data: {
          data: {
            presigned_acceptance: {
              acceptance_token: 'test_acceptance_token',
            },
          },
        },
      };

      const error = {
        response: {
          data: { error: 'Invalid payment data' },
        },
      };

      axiosInstance.get.mockResolvedValue(mockAcceptanceResponse);
      axiosInstance.post.mockRejectedValue(error);

      await expect(adapter.createPayment(paymentData)).rejects.toThrow(
        'Wompi API error',
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getPaymentStatus', () => {
    it('should get payment status successfully', async () => {
      const transactionId = 'wompi_trans_123';
      const mockResponse = {
        data: {
          data: {
            id: transactionId,
            status: 'APPROVED',
            amount_in_cents: 50000,
            currency: 'COP',
            customer_email: 'test@example.com',
            payment_method_type: 'CARD',
            reference: 'trans-001',
            created_at: '2024-01-01T00:00:00.000Z',
            finalized_at: '2024-01-01T00:01:00.000Z',
            status_message: 'Transacción aprobada',
          },
        },
      };

      axiosInstance.get.mockResolvedValue(mockResponse);

      const result = await adapter.getPaymentStatus(transactionId);

      expect(result.data.id).toBe(transactionId);
      expect(result.data.status).toBe('APPROVED');
      expect(axiosInstance.get).toHaveBeenCalledWith(
        `/transactions/${transactionId}`,
        {
          headers: {
            Authorization: 'Bearer pub_test_key',
          },
        },
      );
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const transactionId = 'wompi_trans_123';
      const error = {
        response: {
          data: { error: 'Transaction not found' },
        },
      };

      axiosInstance.get.mockRejectedValue(error);

      await expect(adapter.getPaymentStatus(transactionId)).rejects.toThrow(
        'Wompi API error',
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const transactionId = 'wompi_trans_123';
      const error = new Error('Network error');
      axiosInstance.get.mockRejectedValue(error);

      await expect(adapter.getPaymentStatus(transactionId)).rejects.toThrow(
        error,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
