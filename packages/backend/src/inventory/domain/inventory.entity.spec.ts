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

    it('should handle decrementing exact quantity', () => {
      const inventory = new Inventory('prod-001', 100, 10, new Date());

      const decremented = inventory.decrement(100);

      expect(decremented.quantity).toBe(0);
      expect(decremented.reservedQuantity).toBe(10);
    });

    it('should handle decrementing zero quantity', () => {
      const inventory = new Inventory('prod-001', 100, 10, new Date());

      const decremented = inventory.decrement(0);

      expect(decremented.quantity).toBe(100);
      expect(decremented.reservedQuantity).toBe(10);
    });
  });

  describe('fromPersistence edge cases', () => {
    it('should handle null reservedQuantity', () => {
      const data = {
        productId: 'prod-001',
        quantity: 100,
        reservedQuantity: null,
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const inventory = Inventory.fromPersistence(data);

      expect(inventory.reservedQuantity).toBe(0);
    });

    it('should handle undefined reservedQuantity', () => {
      const data = {
        productId: 'prod-001',
        quantity: 100,
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const inventory = Inventory.fromPersistence(data);

      expect(inventory.reservedQuantity).toBe(0);
    });

    it('should handle zero reservedQuantity', () => {
      const data = {
        productId: 'prod-001',
        quantity: 100,
        reservedQuantity: 0,
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const inventory = Inventory.fromPersistence(data);

      expect(inventory.reservedQuantity).toBe(0);
    });
  });

  describe('reserve edge cases', () => {
    it('should handle reserving zero quantity', () => {
      const inventory = new Inventory('prod-001', 100, 10, new Date());

      const reserved = inventory.reserve(0);

      expect(reserved.reservedQuantity).toBe(10);
      expect(reserved.quantity).toBe(100);
    });

    it('should handle reserving exact available quantity', () => {
      const inventory = new Inventory('prod-001', 100, 10, new Date());

      const reserved = inventory.reserve(90);

      expect(reserved.reservedQuantity).toBe(100);
      expect(reserved.quantity).toBe(100);
    });

    it('should throw error when reserving more than available by 1', () => {
      const inventory = new Inventory('prod-001', 100, 10, new Date());

      expect(() => inventory.reserve(91)).toThrow('Insufficient inventory');
    });
  });

  describe('release edge cases', () => {
    it('should handle releasing zero quantity', () => {
      const inventory = new Inventory('prod-001', 100, 30, new Date());

      const released = inventory.release(0);

      expect(released.reservedQuantity).toBe(30);
      expect(released.quantity).toBe(100);
    });

    it('should handle releasing exact reserved quantity', () => {
      const inventory = new Inventory('prod-001', 100, 30, new Date());

      const released = inventory.release(30);

      expect(released.reservedQuantity).toBe(0);
      expect(released.quantity).toBe(100);
    });

    it('should throw error when trying to release more than reserved by 1', () => {
      const inventory = new Inventory('prod-001', 100, 5, new Date());

      expect(() => inventory.release(6)).toThrow(
        'Cannot release more than reserved',
      );
    });
  });

  describe('getAvailableQuantity edge cases', () => {
    it('should return correct value when quantity equals reserved', () => {
      const inventory = new Inventory('prod-001', 100, 100, new Date());

      expect(inventory.getAvailableQuantity()).toBe(0);
    });

    it('should return correct value when reserved is zero', () => {
      const inventory = new Inventory('prod-001', 100, 0, new Date());

      expect(inventory.getAvailableQuantity()).toBe(100);
    });

    it('should return correct value when reserved exceeds quantity', () => {
      const inventory = new Inventory('prod-001', 50, 60, new Date());

      expect(inventory.getAvailableQuantity()).toBe(-10);
    });
  });

  describe('toPersistence edge cases', () => {
    it('should handle zero values correctly', () => {
      const inventory = new Inventory('prod-001', 0, 0, new Date('2024-01-01'));

      const data = inventory.toPersistence();

      expect(data.quantity).toBe(0);
      expect(data.reservedQuantity).toBe(0);
      expect(data.productId).toBe('prod-001');
    });

    it('should preserve date format in ISO string', () => {
      const date = new Date('2024-01-01T12:00:00.000Z');
      const inventory = new Inventory('prod-001', 100, 10, date);

      const data = inventory.toPersistence();

      expect(data.updatedAt).toBe(date.toISOString());
      expect(new Date(data.updatedAt).getTime()).toBe(date.getTime());
    });
  });
});
