import { TransactionStatus } from './transaction-status.enum';

export class Transaction {
  constructor(
    public readonly id: string,
    public readonly productId: string,
    public readonly amount: number,
    public readonly commission: number,
    public readonly shippingCost: number,
    public readonly totalAmount: number,
    public readonly status: TransactionStatus,
    public readonly customerEmail: string,
    public readonly customerName: string,
    public readonly deliveryAddress: string,
    public readonly deliveryCity: string,
    public readonly deliveryPhone: string,
    public readonly idempotencyKey: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly wompiTransactionId?: string,
    public readonly errorMessage?: string,
  ) {}

  static fromPersistence(data: any): Transaction {
    return new Transaction(
      data.id,
      data.productId,
      data.amount,
      data.commission,
      data.shippingCost,
      data.totalAmount,
      data.status as TransactionStatus,
      data.customerEmail,
      data.customerName,
      data.deliveryAddress,
      data.deliveryCity,
      data.deliveryPhone,
      data.idempotencyKey,
      new Date(data.createdAt),
      new Date(data.updatedAt),
      data.wompiTransactionId,
      data.errorMessage,
    );
  }

  toPersistence(): any {
    const data: any = {
      id: this.id,
      productId: this.productId,
      amount: this.amount,
      commission: this.commission,
      shippingCost: this.shippingCost,
      totalAmount: this.totalAmount,
      status: this.status,
      customerEmail: this.customerEmail,
      customerName: this.customerName,
      deliveryAddress: this.deliveryAddress,
      deliveryCity: this.deliveryCity,
      deliveryPhone: this.deliveryPhone,
      idempotencyKey: this.idempotencyKey,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };

    // Solo incluir campos opcionales si tienen valores definidos
    if (this.wompiTransactionId !== undefined) {
      data.wompiTransactionId = this.wompiTransactionId;
    }
    if (this.errorMessage !== undefined) {
      data.errorMessage = this.errorMessage;
    }

    return data;
  }

  approve(wompiTransactionId: string): Transaction {
    return new Transaction(
      this.id,
      this.productId,
      this.amount,
      this.commission,
      this.shippingCost,
      this.totalAmount,
      TransactionStatus.APPROVED,
      this.customerEmail,
      this.customerName,
      this.deliveryAddress,
      this.deliveryCity,
      this.deliveryPhone,
      this.idempotencyKey,
      this.createdAt,
      new Date(),
      wompiTransactionId,
    );
  }

  decline(errorMessage: string): Transaction {
    return new Transaction(
      this.id,
      this.productId,
      this.amount,
      this.commission,
      this.shippingCost,
      this.totalAmount,
      TransactionStatus.DECLINED,
      this.customerEmail,
      this.customerName,
      this.deliveryAddress,
      this.deliveryCity,
      this.deliveryPhone,
      this.idempotencyKey,
      this.createdAt,
      new Date(),
      this.wompiTransactionId,
      errorMessage,
    );
  }

  cancel(): Transaction {
    return new Transaction(
      this.id,
      this.productId,
      this.amount,
      this.commission,
      this.shippingCost,
      this.totalAmount,
      TransactionStatus.CANCELLED,
      this.customerEmail,
      this.customerName,
      this.deliveryAddress,
      this.deliveryCity,
      this.deliveryPhone,
      this.idempotencyKey,
      this.createdAt,
      new Date(),
      this.wompiTransactionId,
    );
  }
}
