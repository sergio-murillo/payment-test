export class Inventory {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
    public readonly reservedQuantity: number,
    public readonly updatedAt: Date,
  ) {}

  static fromPersistence(data: any): Inventory {
    return new Inventory(
      data.productId,
      data.quantity,
      data.reservedQuantity || 0,
      new Date(data.updatedAt),
    );
  }

  toPersistence(): any {
    return {
      productId: this.productId,
      quantity: this.quantity,
      reservedQuantity: this.reservedQuantity,
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  getAvailableQuantity(): number {
    return this.quantity - this.reservedQuantity;
  }

  reserve(amount: number): Inventory {
    if (this.getAvailableQuantity() < amount) {
      throw new Error('Insufficient inventory');
    }

    return new Inventory(
      this.productId,
      this.quantity,
      this.reservedQuantity + amount,
      new Date(),
    );
  }

  release(amount: number): Inventory {
    if (this.reservedQuantity < amount) {
      throw new Error('Cannot release more than reserved');
    }

    return new Inventory(
      this.productId,
      this.quantity,
      this.reservedQuantity - amount,
      new Date(),
    );
  }

  decrement(amount: number): Inventory {
    if (this.quantity < amount) {
      throw new Error('Insufficient inventory');
    }

    return new Inventory(
      this.productId,
      this.quantity - amount,
      this.reservedQuantity,
      new Date(),
    );
  }
}
