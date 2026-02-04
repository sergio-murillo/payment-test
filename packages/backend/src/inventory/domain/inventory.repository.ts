import { Inventory } from './inventory.entity';

export interface InventoryRepository {
  findByProductId(productId: string): Promise<Inventory | null>;
  reserve(productId: string, quantity: number): Promise<Inventory>;
  release(productId: string, quantity: number): Promise<Inventory>;
  decrement(productId: string, quantity: number): Promise<Inventory>;
  increment(productId: string, quantity: number): Promise<Inventory>;
}
