import { Inventory } from './inventory.entity';

describe('Inventory Entity', () => {
  describe('fromPersistence', () => {
    it('should create Inventory from persistence data', () => {
      const data = {
        productId: 'prod-001',
        quantity: 100,
        reservedQuantity: 10,
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const inventory = Inventory.fromPersistence(data);

      expect(inventory).toBeInstanceOf(Inventory);
      expect(inventory.productId).toBe('prod-001');
      expect(inventory.quantity).toBe(100);
      expect(inventory.reservedQuantity).toBe(10);
    });

    it('should default reservedQuantity to 0 when not provided', () => {
      const data = {
        productId: 'prod-001',
        quantity: 100,
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const inventory = Inventory.fromPersistence(data);

      expect(inventory.reservedQuantity).toBe(0);
    });
  });

  describe('toPersistence', () => {
    it('should convert Inventory to persistence format', () => {
      const inventory = new Inventory('prod-001', 100, 10, new Date());

      const data = inventory.toPersistence();

      expect(data.productId).toBe('prod-001');
      expect(data.quantity).toBe(100);
      expect(data.reservedQuantity).toBe(10);
      expect(data.updatedAt).toBe(inventory.updatedAt.toISOString());
    });
  });

  describe('getAvailableQuantity', () => {
    it('should calculate available quantity correctly', () => {
      const inventory = new Inventory('prod-001', 100, 10, new Date());

      expect(inventory.getAvailableQuantity()).toBe(90);
    });

    it('should return 0 when all quantity is reserved', () => {
      const inventory = new Inventory('prod-001', 100, 100, new Date());

      expect(inventory.getAvailableQuantity()).toBe(0);
    });
  });

  describe('reserve', () => {
    it('should reserve quantity successfully', () => {
      const inventory = new Inventory('prod-001', 100, 10, new Date());

      const reserved = inventory.reserve(20);

      expect(reserved.reservedQuantity).toBe(30);
      expect(reserved.quantity).toBe(100);
      expect(reserved.productId).toBe('prod-001');
    });

    it('should throw error when insufficient inventory', () => {
      const inventory = new Inventory('prod-001', 100, 95, new Date());

      expect(() => inventory.reserve(10)).toThrow('Insufficient inventory');
    });

    it('should throw error when trying to reserve more than available', () => {
      const inventory = new Inventory('prod-001', 50, 40, new Date());

      expect(() => inventory.reserve(20)).toThrow('Insufficient inventory');
    });
  });

  describe('release', () => {
    it('should release quantity successfully', () => {
      const inventory = new Inventory('prod-001', 100, 30, new Date());

      const released = inventory.release(10);

      expect(released.reservedQuantity).toBe(20);
      expect(released.quantity).toBe(100);
    });

    it('should throw error when trying to release more than reserved', () => {
      const inventory = new Inventory('prod-001', 100, 5, new Date());

      expect(() => inventory.release(10)).toThrow(
        'Cannot release more than reserved',
      );
    });

    it('should throw error when trying to release from zero reserved', () => {
      const inventory = new Inventory('prod-001', 100, 0, new Date());

      expect(() => inventory.release(10)).toThrow(
        'Cannot release more than reserved',
      );
    });
  });

  describe('decrement', () => {
    it('should decrement quantity successfully', () => {
      const inventory = new Inventory('prod-001', 100, 10, new Date());

      const decremented = inventory.decrement(20);

      expect(decremented.quantity).toBe(80);
      expect(decremented.reservedQuantity).toBe(10);
    });

    it('should throw error when insufficient quantity', () => {
      const inventory = new Inventory('prod-001', 50, 10, new Date());

      expect(() => inventory.decrement(60)).toThrow('Insufficient inventory');
    });

    it('should throw error when trying to decrement more than available', () => {
      const inventory = new Inventory('prod-001', 10, 5, new Date());

      expect(() => inventory.decrement(20)).toThrow('Insufficient inventory');
    });
  });
});
