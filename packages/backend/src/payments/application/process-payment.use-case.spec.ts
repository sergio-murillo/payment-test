import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ProcessPaymentUseCase } from './process-payment.use-case';
import { WompiPaymentAdapter } from '../domain/wompi-payment-adapter';
import { TransactionRepository } from '../../transactions/domain/transaction.repository';
import { EventStoreService } from '../../event-store/application/event-store.service';
import { SnsService } from '../../shared/messaging/sns.service';
import { StepFunctionsService } from '../../shared/orchestration/step-functions.service';
import { UpdateInventoryUseCase } from '../../inventory/application/update-inventory.use-case';
import { CompensateTransactionUseCase } from './compensate-transaction.use-case';
import { LoggerService } from '../../shared/logger/logger.service';
import { Transaction } from '../../transactions/domain/transaction.entity';
import { TransactionStatus } from '../../transactions/domain/transaction-status.enum';
import { WOMPI_PAYMENT_ADAPTER_TOKEN } from '../payments.tokens';
import { TRANSACTION_REPOSITORY_TOKEN } from '../../transactions/transactions.tokens';

describe('ProcessPaymentUseCase', () => {
  let useCase: ProcessPaymentUseCase;
  let wompiAdapter: jest.Mocked<WompiPaymentAdapter>;
  let transactionRepository: jest.Mocked<TransactionRepository>;
  let eventStore: jest.Mocked<EventStoreService>;
  let snsService: jest.Mocked<SnsService>;
  let stepFunctionsService: jest.Mocked<StepFunctionsService>;
  let updateInventoryUseCase: jest.Mocked<UpdateInventoryUseCase>;
  let compensateTransactionUseCase: jest.Mocked<CompensateTransactionUseCase>;
  let configService: jest.Mocked<ConfigService>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const mockWompiAdapter = {
      tokenizeCard: jest.fn(),
      createPayment: jest.fn(),
    };

    const mockTransactionRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    const mockEventStore = {
      storeEvent: jest.fn(),
    };

    const mockSnsService = {
      publish: jest.fn(),
    };

    const mockStepFunctionsService = {
      startExecution: jest.fn(),
    };

    const mockUpdateInventoryUseCase = {
      execute: jest.fn(),
    };

    const mockCompensateTransactionUseCase = {
      execute: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessPaymentUseCase,
        {
          provide: WOMPI_PAYMENT_ADAPTER_TOKEN,
          useValue: mockWompiAdapter,
        },
        {
          provide: TRANSACTION_REPOSITORY_TOKEN,
          useValue: mockTransactionRepository,
        },
        {
          provide: EventStoreService,
          useValue: mockEventStore,
        },
        {
          provide: SnsService,
          useValue: mockSnsService,
        },
        {
          provide: StepFunctionsService,
          useValue: mockStepFunctionsService,
        },
        {
          provide: UpdateInventoryUseCase,
          useValue: mockUpdateInventoryUseCase,
        },
        {
          provide: CompensateTransactionUseCase,
          useValue: mockCompensateTransactionUseCase,
        },
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

    useCase = module.get<ProcessPaymentUseCase>(ProcessPaymentUseCase);
    wompiAdapter = module.get(WOMPI_PAYMENT_ADAPTER_TOKEN);
    transactionRepository = module.get(TRANSACTION_REPOSITORY_TOKEN);
    eventStore = module.get(EventStoreService);
    snsService = module.get(SnsService);
    stepFunctionsService = module.get(StepFunctionsService);
    updateInventoryUseCase = module.get(UpdateInventoryUseCase);
    compensateTransactionUseCase = module.get(CompensateTransactionUseCase);
    configService = module.get(ConfigService);
    logger = module.get(LoggerService);

    // Clear all mocks after setup
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should start Step Function execution for pending transaction', async () => {
      const transaction = new Transaction(
        'trans-001',
        'prod-001',
        100000,
        3000,
        15000,
        118000,
        TransactionStatus.PENDING,
        'test@example.com',
        'Test User',
        'Test Address',
        'Bogotá',
        '+57 300 123 4567',
        'idempotency-key-123',
        new Date(),
        new Date(),
      );

      transactionRepository.findById.mockResolvedValue(transaction);
      wompiAdapter.tokenizeCard.mockResolvedValue({
        status: 'CREATED',
        data: {
          id: 'tok_test_1234567890',
          created_at: '2020-01-02T18:52:35.850+00:00',
          brand: 'VISA',
          name: 'VISA-4242',
          last_four: '4242',
          bin: '424242',
          exp_year: '28',
          exp_month: '08',
          card_holder: 'José Pérez',
          expires_at: '2020-06-30T18:52:35.000Z',
        },
      });
      stepFunctionsService.startExecution.mockResolvedValue(
        'arn:aws:states:us-east-1:123456789012:execution:test',
      );

      const result = await useCase.execute({
        transactionId: 'trans-001',
        cardNumber: '4242424242424242',
        cvc: '123',
        expMonth: '08',
        expYear: '28',
        cardHolder: 'José Pérez',
        installments: 1,
      });

      expect(result.success).toBe(true);
      expect(result.data?.executionArn).toBeDefined();
      expect(wompiAdapter.tokenizeCard).toHaveBeenCalledWith({
        number: '4242424242424242',
        cvc: '123',
        expMonth: '08',
        expYear: '28',
        cardHolder: 'José Pérez',
      });
      expect(stepFunctionsService.startExecution).toHaveBeenCalledWith({
        transactionId: 'trans-001',
        paymentToken: 'tok_test_1234567890',
        installments: 1,
      });
    });

    it('should return error when transaction not found', async () => {
      transactionRepository.findById.mockResolvedValue(null);

      const result = await useCase.execute({
        transactionId: 'trans-999',
        cardNumber: '4242424242424242',
        cvc: '123',
        expMonth: '08',
        expYear: '28',
        cardHolder: 'José Pérez',
        installments: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction not found');
    });

    it('should return error when transaction is not pending', async () => {
      const transaction = new Transaction(
        'trans-001',
        'prod-001',
        100000,
        3000,
        15000,
        118000,
        TransactionStatus.APPROVED,
        'test@example.com',
        'Test User',
        'Test Address',
        'Bogotá',
        '+57 300 123 4567',
        'idempotency-key-123',
        new Date(),
        new Date(),
      );

      transactionRepository.findById.mockResolvedValue(transaction);

      const result = await useCase.execute({
        transactionId: 'trans-001',
        cardNumber: '4242424242424242',
        cvc: '123',
        expMonth: '08',
        expYear: '28',
        cardHolder: 'José Pérez',
        installments: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not in PENDING status');
    });

    it('should return error when card tokenization fails', async () => {
      const transaction = new Transaction(
        'trans-001',
        'prod-001',
        100000,
        3000,
        15000,
        118000,
        TransactionStatus.PENDING,
        'test@example.com',
        'Test User',
        'Test Address',
        'Bogotá',
        '+57 300 123 4567',
        'idempotency-key-123',
        new Date(),
        new Date(),
      );

      transactionRepository.findById.mockResolvedValue(transaction);
      wompiAdapter.tokenizeCard.mockResolvedValue({
        status: 'FAILED',
        data: null as any,
      });

      const result = await useCase.execute({
        transactionId: 'trans-001',
        cardNumber: '4242424242424242',
        cvc: '123',
        expMonth: '08',
        expYear: '28',
        cardHolder: 'José Pérez',
        installments: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to tokenize card');
    });

    it('should handle errors gracefully', async () => {
      transactionRepository.findById.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await useCase.execute({
        transactionId: 'trans-001',
        cardNumber: '4242424242424242',
        cvc: '123',
        expMonth: '08',
        expYear: '28',
        cardHolder: 'José Pérez',
        installments: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to process payment');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('executePaymentStep', () => {
    it('should process payment successfully when approved', async () => {
      const transaction = new Transaction(
        'trans-001',
        'prod-001',
        100000,
        3000,
        15000,
        118000,
        TransactionStatus.PENDING,
        'test@example.com',
        'Test User',
        'Test Address',
        'Bogotá',
        '+57 300 123 4567',
        'idempotency-key-123',
        new Date(),
        new Date(),
      );

      transactionRepository.findById.mockResolvedValue(transaction);
      configService.get.mockReturnValue('pub_test_key');
      wompiAdapter.createPayment.mockResolvedValue({
        data: {
          id: 'wompi-trans-123',
          status: 'APPROVED',
          amount_in_cents: 11800000,
          currency: 'COP',
          customer_email: 'test@example.com',
          payment_method_type: 'CARD',
          reference: 'trans-001',
          created_at: new Date().toISOString(),
        },
      });
      transactionRepository.update.mockResolvedValue(undefined);
      eventStore.storeEvent.mockResolvedValue(undefined);
      snsService.publish.mockResolvedValue(undefined);

      const result = await useCase.executePaymentStep(
        'trans-001',
        'token-123',
        1,
      );

      expect(result.success).toBe(true);
      expect(wompiAdapter.createPayment).toHaveBeenCalled();
      const createPaymentCall = wompiAdapter.createPayment.mock.calls[0][0];
      expect(createPaymentCall.amountInCents).toBe(11800000);
      expect(createPaymentCall.currency).toBe('COP');
      expect(createPaymentCall.customerEmail).toBe('test@example.com');

      expect(transactionRepository.update).toHaveBeenCalled();
      const updateCall = transactionRepository.update.mock.calls[0][0];
      expect(updateCall.id).toBe('trans-001');
      expect(updateCall.status).toBe(TransactionStatus.APPROVED);
      expect(updateCall.wompiTransactionId).toBe('wompi-trans-123');

      expect(eventStore.storeEvent).toHaveBeenCalled();
      const storeEventCall = eventStore.storeEvent.mock.calls[0][0];
      expect(storeEventCall.aggregateId).toBe('trans-001');
      expect(storeEventCall.eventType).toBe('PaymentProcessed');
      expect(storeEventCall.eventData.transactionId).toBe('trans-001');
      expect(storeEventCall.eventData.wompiTransactionId).toBe(
        'wompi-trans-123',
      );
      expect(storeEventCall.eventData.status).toBe('APPROVED');

      expect(snsService.publish).toHaveBeenCalled();
      const publishCall = snsService.publish.mock.calls[0][0];
      expect(publishCall.eventType).toBe('PaymentProcessed');
      expect(publishCall.transactionId).toBe('trans-001');
      expect(publishCall.status).toBe('APPROVED');
      expect(publishCall.wompiTransactionId).toBe('wompi-trans-123');
    });

    it('should handle declined payment', async () => {
      const transaction = new Transaction(
        'trans-001',
        'prod-001',
        100000,
        3000,
        15000,
        118000,
        TransactionStatus.PENDING,
        'test@example.com',
        'Test User',
        'Test Address',
        'Bogotá',
        '+57 300 123 4567',
        'idempotency-key-123',
        new Date(),
        new Date(),
      );

      transactionRepository.findById.mockResolvedValue(transaction);
      configService.get.mockReturnValue('pub_test_key');
      wompiAdapter.createPayment.mockResolvedValue({
        data: {
          id: 'wompi-trans-123',
          status: 'DECLINED',
          amount_in_cents: 11800000,
          currency: 'COP',
          customer_email: 'test@example.com',
          payment_method_type: 'CARD',
          reference: 'trans-001',
          created_at: new Date().toISOString(),
        },
      });
      transactionRepository.update.mockResolvedValue(undefined);
      eventStore.storeEvent.mockResolvedValue(undefined);
      snsService.publish.mockResolvedValue(undefined);

      const result = await useCase.executePaymentStep(
        'trans-001',
        'token-123',
        1,
      );

      expect(result.success).toBe(true);
      expect(transactionRepository.update).toHaveBeenCalled();
      const updateCall = transactionRepository.update.mock.calls[0][0];
      expect(updateCall.id).toBe('trans-001');
      expect(updateCall.status).toBe(TransactionStatus.DECLINED);
      expect(updateCall.errorMessage).toContain('Payment declined');

      expect(eventStore.storeEvent).toHaveBeenCalled();
      const storeEventCall = eventStore.storeEvent.mock.calls[0][0];
      expect(storeEventCall.aggregateId).toBe('trans-001');
      expect(storeEventCall.eventType).toBe('PaymentProcessed');
      expect(storeEventCall.eventData.status).toBe('DECLINED');

      expect(snsService.publish).toHaveBeenCalled();
      const publishCall = snsService.publish.mock.calls[0][0];
      expect(publishCall.eventType).toBe('PaymentProcessed');
      expect(publishCall.transactionId).toBe('trans-001');
      expect(publishCall.status).toBe('DECLINED');
    });

    it('should return error when transaction not found in executePaymentStep', async () => {
      transactionRepository.findById.mockResolvedValue(null);

      const result = await useCase.executePaymentStep(
        'trans-999',
        'token-123',
        1,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction not found');
    });

    it('should handle errors in executePaymentStep', async () => {
      const transaction = new Transaction(
        'trans-001',
        'prod-001',
        100000,
        3000,
        15000,
        118000,
        TransactionStatus.PENDING,
        'test@example.com',
        'Test User',
        'Test Address',
        'Bogotá',
        '+57 300 123 4567',
        'idempotency-key-123',
        new Date(),
        new Date(),
      );

      transactionRepository.findById.mockResolvedValue(transaction);
      configService.get.mockReturnValue('pub_test_key');
      wompiAdapter.createPayment.mockRejectedValue(new Error('Wompi error'));

      const result = await useCase.executePaymentStep(
        'trans-001',
        'token-123',
        1,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to execute payment step');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
