import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { CreateTransactionUseCase } from './application/create-transaction.use-case';
import { GetTransactionUseCase } from './application/get-transaction.use-case';
import { Transaction } from './domain/transaction.entity';
import { TransactionStatus } from './domain/transaction-status.enum';
import { HttpException } from '@nestjs/common';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let createTransactionUseCase: jest.Mocked<CreateTransactionUseCase>;
  let getTransactionUseCase: jest.Mocked<GetTransactionUseCase>;

  beforeEach(async () => {
    const mockCreateTransactionUseCase = {
      execute: jest.fn(),
    };

    const mockGetTransactionUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: CreateTransactionUseCase,
          useValue: mockCreateTransactionUseCase,
        },
        {
          provide: GetTransactionUseCase,
          useValue: mockGetTransactionUseCase,
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
    createTransactionUseCase = module.get(CreateTransactionUseCase);
    getTransactionUseCase = module.get(GetTransactionUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createTransaction', () => {
    it('should create a transaction', async () => {
      const dto = {
        productId: 'prod-001',
        amount: 100000,
        commission: 3000,
        shippingCost: 15000,
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        deliveryAddress: 'Test Address',
        deliveryCity: 'Bogotá',
        deliveryPhone: '+57 300 123 4567',
        idempotencyKey: 'unique-key-123',
      };

      const transaction = new Transaction(
        'trans-001',
        dto.productId,
        dto.amount,
        dto.commission,
        dto.shippingCost,
        dto.amount + dto.commission + dto.shippingCost,
        TransactionStatus.PENDING,
        dto.customerEmail,
        dto.customerName,
        dto.deliveryAddress,
        dto.deliveryCity,
        dto.deliveryPhone,
        dto.idempotencyKey,
        new Date(),
        new Date(),
      );

      createTransactionUseCase.execute.mockResolvedValue({
        success: true,
        data: transaction,
      });

      const result = await controller.createTransaction(dto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(transaction);
    });

    it('should throw HttpException when use case fails', async () => {
      const dto = {
        productId: 'prod-001',
        amount: 100000,
        commission: 3000,
        shippingCost: 15000,
        customerEmail: 'test@example.com',
        customerName: 'Test User',
        deliveryAddress: 'Test Address',
        deliveryCity: 'Bogotá',
        deliveryPhone: '+57 300 123 4567',
        idempotencyKey: 'unique-key-123',
      };

      createTransactionUseCase.execute.mockResolvedValue({
        success: false,
        error: 'Failed to create transaction',
      });

      await expect(controller.createTransaction(dto)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('getTransaction', () => {
    it('should return transaction by id', async () => {
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

      getTransactionUseCase.execute.mockResolvedValue({
        success: true,
        data: transaction,
      });

      const result = await controller.getTransaction('trans-001');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(transaction);
    });

    it('should throw 404 when transaction not found', async () => {
      getTransactionUseCase.execute.mockResolvedValue({
        success: false,
        error: 'Transaction not found',
      });

      await expect(controller.getTransaction('trans-999')).rejects.toThrow(
        HttpException,
      );
    });

    it('should throw 500 when internal error occurs', async () => {
      getTransactionUseCase.execute.mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      await expect(controller.getTransaction('trans-001')).rejects.toThrow(
        HttpException,
      );
    });
  });
});
