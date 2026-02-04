import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { ProcessPaymentUseCase } from './application/process-payment.use-case';
import { HttpException } from '@nestjs/common';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let processPaymentUseCase: jest.Mocked<ProcessPaymentUseCase>;

  beforeEach(async () => {
    const mockProcessPaymentUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: ProcessPaymentUseCase,
          useValue: mockProcessPaymentUseCase,
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    processPaymentUseCase = module.get(ProcessPaymentUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      const dto = {
        transactionId: 'trans-001',
        cardNumber: '4242424242424242',
        cvc: '123',
        expMonth: '08',
        expYear: '28',
        cardHolder: 'José Pérez',
        installments: 1,
      };

      processPaymentUseCase.execute.mockResolvedValue({
        success: true,
        data: {
          executionArn: 'arn:aws:states:us-east-1:123456789012:execution:test',
          transactionId: 'trans-001',
        },
      });

      const result = await controller.processPayment(dto);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(processPaymentUseCase.execute).toHaveBeenCalledWith(dto);
    });

    it('should throw HttpException when use case fails', async () => {
      const dto = {
        transactionId: 'trans-001',
        cardNumber: '4242424242424242',
        cvc: '123',
        expMonth: '08',
        expYear: '28',
        cardHolder: 'José Pérez',
        installments: 1,
      };

      processPaymentUseCase.execute.mockResolvedValue({
        success: false,
        error: 'Failed to process payment',
      });

      await expect(controller.processPayment(dto)).rejects.toThrow(
        HttpException,
      );
    });
  });
});
