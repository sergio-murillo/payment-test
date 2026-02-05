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
      getPaymentStatus: jest.fn(),
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

    it('should return error when tokenization result has no data.id', async () => {
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
        data: {} as any, // No id field
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

    describe('Step Function fallback in development', () => {
      const originalEnv = process.env.NODE_ENV;
      const originalIsOffline = process.env.IS_OFFLINE;

      beforeEach(() => {
        process.env.NODE_ENV = 'development';
        process.env.IS_OFFLINE = 'true';
      });

      afterEach(() => {
        process.env.NODE_ENV = originalEnv;
        process.env.IS_OFFLINE = originalIsOffline;
      });

      it('should execute payment directly when Step Function does not exist in development', async () => {
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
            id: 'tok_test_123',
            created_at: '2024-01-01T00:00:00.000Z',
            brand: 'VISA',
            name: 'VISA',
            last_four: '4242',
            bin: '424242',
            exp_year: '28',
            exp_month: '08',
            card_holder: 'José Pérez',
            expires_at: '2028-08-31T23:59:59.000Z',
          },
        });

        const stepFunctionError = new Error('StateMachineDoesNotExist');
        stepFunctionsService.startExecution.mockRejectedValue(
          stepFunctionError,
        );

        configService.get.mockImplementation((key: string) => {
          if (key === 'WOMPI_PUBLIC_KEY') return 'pub_test_key';
          return undefined;
        });

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
        updateInventoryUseCase.execute.mockResolvedValue({
          success: true,
          data: {} as any,
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

        expect(result.success).toBe(true);
        expect(result.data?.executedDirectly).toBe(true);
        expect(logger.warn).toHaveBeenCalledWith(
          'Step Function not found in development, executing payment workflow directly',
          'ProcessPaymentUseCase',
        );
        expect(wompiAdapter.createPayment).toHaveBeenCalled();
        expect(updateInventoryUseCase.execute).toHaveBeenCalled();
      });

      it('should compensate transaction when payment fails in direct execution', async () => {
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
            id: 'tok_test_123',
            created_at: '2024-01-01T00:00:00.000Z',
            brand: 'VISA',
            name: 'VISA',
            last_four: '4242',
            bin: '424242',
            exp_year: '28',
            exp_month: '08',
            card_holder: 'José Pérez',
            expires_at: '2028-08-31T23:59:59.000Z',
          },
        });

        const stepFunctionError = new Error('StateMachineDoesNotExist');
        stepFunctionsService.startExecution.mockRejectedValue(
          stepFunctionError,
        );

        configService.get.mockImplementation((key: string) => {
          if (key === 'WOMPI_PUBLIC_KEY') return 'pub_test_key';
          return undefined;
        });

        wompiAdapter.createPayment.mockRejectedValue(
          new Error('Payment failed'),
        );

        compensateTransactionUseCase.execute.mockResolvedValue({
          success: true,
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
        expect(compensateTransactionUseCase.execute).toHaveBeenCalledWith(
          'trans-001',
        );
      });

      it('should compensate transaction when inventory update fails after payment approval', async () => {
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
            id: 'tok_test_123',
            created_at: '2024-01-01T00:00:00.000Z',
            brand: 'VISA',
            name: 'VISA',
            last_four: '4242',
            bin: '424242',
            exp_year: '28',
            exp_month: '08',
            card_holder: 'José Pérez',
            expires_at: '2028-08-31T23:59:59.000Z',
          },
        });

        const stepFunctionError = new Error('StateMachineDoesNotExist');
        stepFunctionsService.startExecution.mockRejectedValue(
          stepFunctionError,
        );

        configService.get.mockImplementation((key: string) => {
          if (key === 'WOMPI_PUBLIC_KEY') return 'pub_test_key';
          return undefined;
        });

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
        updateInventoryUseCase.execute.mockResolvedValue({
          success: false,
          error: 'Inventory update failed',
        });
        compensateTransactionUseCase.execute.mockResolvedValue({
          success: true,
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
        expect(result.error).toContain('Inventory update failed');
        expect(compensateTransactionUseCase.execute).toHaveBeenCalledWith(
          'trans-001',
        );
        expect(logger.error).toHaveBeenCalled();
      });

      it('should handle unexpected errors in direct execution and compensate', async () => {
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
            id: 'tok_test_123',
            created_at: '2024-01-01T00:00:00.000Z',
            brand: 'VISA',
            name: 'VISA',
            last_four: '4242',
            bin: '424242',
            exp_year: '28',
            exp_month: '08',
            card_holder: 'José Pérez',
            expires_at: '2028-08-31T23:59:59.000Z',
          },
        });

        const stepFunctionError = new Error('StateMachineDoesNotExist');
        stepFunctionsService.startExecution.mockRejectedValue(
          stepFunctionError,
        );

        configService.get.mockImplementation((key: string) => {
          if (key === 'WOMPI_PUBLIC_KEY') return 'pub_test_key';
          return undefined;
        });

        // Make createPayment throw an error to simulate unexpected error
        wompiAdapter.createPayment.mockRejectedValue(
          new Error('Unexpected error'),
        );

        compensateTransactionUseCase.execute.mockResolvedValue({
          success: true,
        });

        // The error in createPayment is caught in executePaymentStep and returns a Result
        // Then the outer try-catch catches any error thrown and returns a Result
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
        expect(compensateTransactionUseCase.execute).toHaveBeenCalledWith(
          'trans-001',
        );
        expect(logger.error).toHaveBeenCalled();
      });

      it('should not execute directly when error is not StateMachineDoesNotExist', async () => {
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
            id: 'tok_test_123',
            created_at: '2024-01-01T00:00:00.000Z',
            brand: 'VISA',
            name: 'VISA',
            last_four: '4242',
            bin: '424242',
            exp_year: '28',
            exp_month: '08',
            card_holder: 'José Pérez',
            expires_at: '2028-08-31T23:59:59.000Z',
          },
        });

        const otherError = new Error('Some other error');
        stepFunctionsService.startExecution.mockRejectedValue(otherError);

        // The error is caught by the outer try-catch and returns a Result
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
        expect(logger.warn).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalled();
      });
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

    it('should handle VOIDED payment status', async () => {
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
          status: 'VOIDED',
          amount_in_cents: 11800000,
          currency: 'COP',
          customer_email: 'test@example.com',
          payment_method_type: 'CARD',
          reference: 'trans-001',
          created_at: new Date().toISOString(),
          status_message: 'Payment voided',
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
      const updateCall = transactionRepository.update.mock.calls[0][0];
      expect(updateCall.status).toBe(TransactionStatus.DECLINED);
      expect(updateCall.errorMessage).toBe('Payment voided');
    });

    it('should handle ERROR payment status', async () => {
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
          status: 'ERROR',
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
      const updateCall = transactionRepository.update.mock.calls[0][0];
      expect(updateCall.status).toBe(TransactionStatus.DECLINED);
      expect(updateCall.errorMessage).toContain('Payment error');
    });

    it('should handle PENDING payment status and start polling', async () => {
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
          status: 'PENDING',
          amount_in_cents: 11800000,
          currency: 'COP',
          customer_email: 'test@example.com',
          payment_method_type: 'CARD',
          reference: 'trans-001',
          created_at: new Date().toISOString(),
        },
      });
      transactionRepository.update.mockResolvedValue(undefined);

      const result = await useCase.executePaymentStep(
        'trans-001',
        'token-123',
        1,
      );

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('PENDING');
      expect(transactionRepository.update).toHaveBeenCalled();
      const updateCall = transactionRepository.update.mock.calls[0][0];
      expect(updateCall.wompiTransactionId).toBe('wompi-trans-123');
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

    it('should handle unknown payment status that is not PENDING', async () => {
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
          status: 'UNKNOWN_STATUS',
          amount_in_cents: 11800000,
          currency: 'COP',
          customer_email: 'test@example.com',
          payment_method_type: 'CARD',
          reference: 'trans-001',
          created_at: new Date().toISOString(),
        },
      });
      transactionRepository.update.mockResolvedValue(undefined);

      const result = await useCase.executePaymentStep(
        'trans-001',
        'token-123',
        1,
      );

      // When status is not PENDING and not in the handled list (APPROVED, DECLINED, VOIDED, ERROR),
      // updatedTransaction will be undefined, so it will fall through to the PENDING flow
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('PENDING');
      // Should still save wompiTransactionId even for unknown status
      expect(transactionRepository.update).toHaveBeenCalled();
    });

    it('should handle Error in polling catch handler', async () => {
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
          status: 'PENDING',
          amount_in_cents: 11800000,
          currency: 'COP',
          customer_email: 'test@example.com',
          payment_method_type: 'CARD',
          reference: 'trans-001',
          created_at: new Date().toISOString(),
        },
      });
      transactionRepository.update.mockResolvedValue(undefined);

      jest
        .spyOn(useCase as any, 'pollPaymentStatus')
        .mockRejectedValue(new Error('poll failed'));

      const result = await useCase.executePaymentStep(
        'trans-001',
        'token-123',
        1,
      );

      // Wait for the .catch() handler to execute
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('PENDING');
      expect(logger.error).toHaveBeenCalledWith(
        'Error in payment polling for transaction trans-001',
        expect.stringContaining('poll failed'),
        'ProcessPaymentUseCase',
      );

      jest.restoreAllMocks();
    });

    it('should handle non-Error in polling catch handler', async () => {
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
          status: 'PENDING',
          amount_in_cents: 11800000,
          currency: 'COP',
          customer_email: 'test@example.com',
          payment_method_type: 'CARD',
          reference: 'trans-001',
          created_at: new Date().toISOString(),
        },
      });
      transactionRepository.update.mockResolvedValue(undefined);

      jest
        .spyOn(useCase as any, 'pollPaymentStatus')
        .mockRejectedValue('string poll error');

      const result = await useCase.executePaymentStep(
        'trans-001',
        'token-123',
        1,
      );

      // Wait for the .catch() handler to execute
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(result.success).toBe(true);
      expect(logger.error).toHaveBeenCalledWith(
        'Error in payment polling for transaction trans-001',
        'string poll error',
        'ProcessPaymentUseCase',
      );

      jest.restoreAllMocks();
    });

    it('should handle error when saving wompiTransactionId for pending payment', async () => {
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
          status: 'PENDING',
          amount_in_cents: 11800000,
          currency: 'COP',
          customer_email: 'test@example.com',
          payment_method_type: 'CARD',
          reference: 'trans-001',
          created_at: new Date().toISOString(),
        },
      });
      transactionRepository.update.mockRejectedValue(
        new Error('Update failed'),
      );

      const result = await useCase.executePaymentStep(
        'trans-001',
        'token-123',
        1,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to execute payment step');
    });
  });

  describe('pollPaymentStatus (indirect testing)', () => {
    it('should start polling when payment status is PENDING', async () => {
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

      configService.get.mockImplementation((key: string) => {
        if (key === 'WOMPI_PUBLIC_KEY') return 'pub_test_key';
        return undefined;
      });

      transactionRepository.findById.mockResolvedValue(transaction);

      wompiAdapter.createPayment.mockResolvedValue({
        data: {
          id: 'wompi-trans-123',
          status: 'PENDING',
          amount_in_cents: 11800000,
          currency: 'COP',
          customer_email: 'test@example.com',
          payment_method_type: 'CARD',
          reference: 'trans-001',
          created_at: new Date().toISOString(),
        },
      });

      transactionRepository.update.mockResolvedValue(undefined);

      const result = await useCase.executePaymentStep(
        'trans-001',
        'token-123',
        1,
      );

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('PENDING');
      // Verify that wompiTransactionId was saved
      expect(transactionRepository.update).toHaveBeenCalled();
      const updateCall = transactionRepository.update.mock.calls[0][0];
      expect(updateCall.wompiTransactionId).toBe('wompi-trans-123');
    });
  });

  describe('execute - additional branch coverage', () => {
    it('should handle non-Error exception in outer catch', async () => {
      transactionRepository.findById.mockRejectedValue('string error');

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
      expect(logger.error).toHaveBeenCalledWith(
        'Error processing payment',
        'string error',
        'ProcessPaymentUseCase',
      );
    });

    describe('Step Function fallback - additional branches', () => {
      const originalEnv = process.env.NODE_ENV;
      const originalIsOffline = process.env.IS_OFFLINE;

      beforeEach(() => {
        process.env.NODE_ENV = 'development';
        process.env.IS_OFFLINE = 'true';
      });

      afterEach(() => {
        process.env.NODE_ENV = originalEnv;
        process.env.IS_OFFLINE = originalIsOffline;
      });

      it('should use default error message when inventoryResult.error is undefined', async () => {
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
            id: 'tok_test_123',
            created_at: '2024-01-01T00:00:00.000Z',
            brand: 'VISA',
            name: 'VISA',
            last_four: '4242',
            bin: '424242',
            exp_year: '28',
            exp_month: '08',
            card_holder: 'José Pérez',
            expires_at: '2028-08-31T23:59:59.000Z',
          },
        });

        stepFunctionsService.startExecution.mockRejectedValue(
          new Error('StateMachineDoesNotExist'),
        );

        configService.get.mockImplementation((key: string) => {
          if (key === 'WOMPI_PUBLIC_KEY') return 'pub_test_key';
          return undefined;
        });

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
        updateInventoryUseCase.execute.mockResolvedValue({
          success: false,
        });
        compensateTransactionUseCase.execute.mockResolvedValue({
          success: true,
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
        expect(result.error).toBe('Failed to update inventory after payment');
        expect(compensateTransactionUseCase.execute).toHaveBeenCalledWith(
          'trans-001',
        );
      });

      it('should handle non-Error thrown in direct workflow inner catch', async () => {
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
            id: 'tok_test_123',
            created_at: '2024-01-01T00:00:00.000Z',
            brand: 'VISA',
            name: 'VISA',
            last_four: '4242',
            bin: '424242',
            exp_year: '28',
            exp_month: '08',
            card_holder: 'José Pérez',
            expires_at: '2028-08-31T23:59:59.000Z',
          },
        });

        stepFunctionsService.startExecution.mockRejectedValue(
          new Error('StateMachineDoesNotExist'),
        );

        configService.get.mockImplementation((key: string) => {
          if (key === 'WOMPI_PUBLIC_KEY') return 'pub_test_key';
          return undefined;
        });

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
        // Throw a non-Error from updateInventoryUseCase to reach inner catch
        updateInventoryUseCase.execute.mockRejectedValue('non-error string');
        compensateTransactionUseCase.execute.mockResolvedValue({
          success: true,
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
        expect(compensateTransactionUseCase.execute).toHaveBeenCalledWith(
          'trans-001',
        );
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('Error in direct payment workflow execution'),
          'non-error string',
          'ProcessPaymentUseCase',
        );
      });

      it('should handle Error thrown in direct workflow inner catch', async () => {
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
            id: 'tok_test_123',
            created_at: '2024-01-01T00:00:00.000Z',
            brand: 'VISA',
            name: 'VISA',
            last_four: '4242',
            bin: '424242',
            exp_year: '28',
            exp_month: '08',
            card_holder: 'José Pérez',
            expires_at: '2028-08-31T23:59:59.000Z',
          },
        });

        stepFunctionsService.startExecution.mockRejectedValue(
          new Error('StateMachineDoesNotExist'),
        );

        configService.get.mockImplementation((key: string) => {
          if (key === 'WOMPI_PUBLIC_KEY') return 'pub_test_key';
          return undefined;
        });

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
        updateInventoryUseCase.execute.mockRejectedValue(
          new Error('Inventory error'),
        );
        compensateTransactionUseCase.execute.mockResolvedValue({
          success: true,
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
        expect(compensateTransactionUseCase.execute).toHaveBeenCalledWith(
          'trans-001',
        );
      });
    });
  });

  describe('executePaymentStep - additional branch coverage', () => {
    it('should handle non-Error exception in executePaymentStep catch', async () => {
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
      wompiAdapter.createPayment.mockRejectedValue('non-error string');

      const result = await useCase.executePaymentStep(
        'trans-001',
        'token-123',
        1,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to execute payment step');
      expect(logger.error).toHaveBeenCalledWith(
        'Error executing payment step',
        'non-error string',
        'ProcessPaymentUseCase',
      );
    });
  });

  describe('pollPaymentStatus (direct testing)', () => {
    const createTransaction = () =>
      new Transaction(
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

    beforeEach(() => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'PAYMENT_POLLING_INTERVAL_MS') return 1;
          if (key === 'PAYMENT_POLLING_MAX_DURATION_MS') return 10000;
          return defaultValue;
        },
      );
    });

    it('should update transaction to APPROVED when polling detects approval', async () => {
      const transaction = createTransaction();
      transactionRepository.findById.mockResolvedValue(transaction);
      (wompiAdapter as any).getPaymentStatus.mockResolvedValue({
        data: {
          id: 'wompi-123',
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
      updateInventoryUseCase.execute.mockResolvedValue({
        success: true,
        data: {},
      });

      await (useCase as any).pollPaymentStatus('trans-001', 'wompi-123');

      expect(transactionRepository.update).toHaveBeenCalled();
      const updateCall = transactionRepository.update.mock.calls[0][0];
      expect(updateCall.status).toBe(TransactionStatus.APPROVED);
      expect(eventStore.storeEvent).toHaveBeenCalled();
      expect(snsService.publish).toHaveBeenCalled();
      expect(updateInventoryUseCase.execute).toHaveBeenCalledWith(
        'prod-001',
        1,
      );
    });

    it('should compensate when inventory update fails during polling after approval', async () => {
      const transaction = createTransaction();
      transactionRepository.findById.mockResolvedValue(transaction);
      (wompiAdapter as any).getPaymentStatus.mockResolvedValue({
        data: {
          id: 'wompi-123',
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
      updateInventoryUseCase.execute.mockResolvedValue({
        success: false,
        error: 'Out of stock',
      });
      compensateTransactionUseCase.execute.mockResolvedValue({
        success: true,
      });

      await (useCase as any).pollPaymentStatus('trans-001', 'wompi-123');

      expect(compensateTransactionUseCase.execute).toHaveBeenCalledWith(
        'trans-001',
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Inventory update failed for transaction trans-001',
        ),
        'ProcessPaymentUseCase',
      );
    });

    it('should update transaction to DECLINED when polling detects decline', async () => {
      const transaction = createTransaction();
      transactionRepository.findById.mockResolvedValue(transaction);
      (wompiAdapter as any).getPaymentStatus.mockResolvedValue({
        data: {
          id: 'wompi-123',
          status: 'DECLINED',
          amount_in_cents: 11800000,
          currency: 'COP',
          customer_email: 'test@example.com',
          payment_method_type: 'CARD',
          reference: 'trans-001',
          created_at: new Date().toISOString(),
          status_message: 'Insufficient funds',
        },
      });
      transactionRepository.update.mockResolvedValue(undefined);
      eventStore.storeEvent.mockResolvedValue(undefined);
      snsService.publish.mockResolvedValue(undefined);

      await (useCase as any).pollPaymentStatus('trans-001', 'wompi-123');

      expect(transactionRepository.update).toHaveBeenCalled();
      const updateCall = transactionRepository.update.mock.calls[0][0];
      expect(updateCall.status).toBe(TransactionStatus.DECLINED);
      expect(updateCall.errorMessage).toBe('Insufficient funds');
    });

    it('should use default decline message when status_message is undefined', async () => {
      const transaction = createTransaction();
      transactionRepository.findById.mockResolvedValue(transaction);
      (wompiAdapter as any).getPaymentStatus.mockResolvedValue({
        data: {
          id: 'wompi-123',
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

      await (useCase as any).pollPaymentStatus('trans-001', 'wompi-123');

      const updateCall = transactionRepository.update.mock.calls[0][0];
      expect(updateCall.errorMessage).toBe('Payment declined');
    });

    it('should handle transaction not found during polling', async () => {
      transactionRepository.findById.mockResolvedValue(null);
      (wompiAdapter as any).getPaymentStatus.mockResolvedValue({
        data: {
          id: 'wompi-123',
          status: 'APPROVED',
          amount_in_cents: 11800000,
          currency: 'COP',
          customer_email: 'test@example.com',
          payment_method_type: 'CARD',
          reference: 'trans-001',
          created_at: new Date().toISOString(),
        },
      });

      await (useCase as any).pollPaymentStatus('trans-001', 'wompi-123');

      expect(logger.error).toHaveBeenCalledWith(
        'Transaction trans-001 not found during polling',
        'ProcessPaymentUseCase',
      );
      expect(transactionRepository.update).not.toHaveBeenCalled();
    });

    it('should handle errors during polling and continue', async () => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'PAYMENT_POLLING_INTERVAL_MS') return 1;
          if (key === 'PAYMENT_POLLING_MAX_DURATION_MS') return 50;
          return defaultValue;
        },
      );

      (wompiAdapter as any).getPaymentStatus.mockRejectedValue(
        'non-error string',
      );

      await (useCase as any).pollPaymentStatus('trans-001', 'wompi-123');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error polling payment status'),
        'non-error string',
        'ProcessPaymentUseCase',
      );
    });

    it('should handle Error exceptions during polling', async () => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'PAYMENT_POLLING_INTERVAL_MS') return 1;
          if (key === 'PAYMENT_POLLING_MAX_DURATION_MS') return 50;
          return defaultValue;
        },
      );

      (wompiAdapter as any).getPaymentStatus.mockRejectedValue(
        new Error('Network error'),
      );

      await (useCase as any).pollPaymentStatus('trans-001', 'wompi-123');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error polling payment status'),
        expect.stringContaining('Network error'),
        'ProcessPaymentUseCase',
      );
    });

    it('should log warning on polling timeout', async () => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'PAYMENT_POLLING_INTERVAL_MS') return 1;
          if (key === 'PAYMENT_POLLING_MAX_DURATION_MS') return 10;
          return defaultValue;
        },
      );

      (wompiAdapter as any).getPaymentStatus.mockResolvedValue({
        data: { status: 'PENDING' },
      });

      await (useCase as any).pollPaymentStatus('trans-001', 'wompi-123');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Payment polling timeout reached'),
        'ProcessPaymentUseCase',
      );
    });
  });
});
