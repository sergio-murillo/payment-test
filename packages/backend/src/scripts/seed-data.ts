import { DynamoDbService } from '../shared/database/dynamodb.service';
import { LoggerService } from '../shared/logger/logger.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';

async function seedData() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dynamoDb = app.get(DynamoDbService);
  const logger = app.get(LoggerService);

  try {
    // Seed products
    const products = [
      {
        id: 'prod-001',
        name: 'iPhone 15 Pro',
        description: 'Latest iPhone with advanced features',
        price: 4500000,
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
        categoria: 'Electrónica',
        metadata: {
          marca: 'Apple',
          modelo: 'iPhone 15 Pro',
          color: 'Natural Titanium',
          almacenamiento: '256GB',
        },
        rating: 4.8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'prod-002',
        name: 'Samsung Galaxy S24',
        description: 'Premium Android smartphone',
        price: 3800000,
        imageUrl:
          'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9',
        categoria: 'Electrónica',
        metadata: {
          marca: 'Samsung',
          modelo: 'Galaxy S24',
          color: 'Phantom Black',
          almacenamiento: '128GB',
        },
        rating: 4.6,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'prod-003',
        name: 'MacBook Pro 14"',
        description: 'Powerful laptop for professionals',
        price: 8500000,
        imageUrl:
          'https://images.unsplash.com/photo-1496181133206-80ce9b88a853',
        categoria: 'Computadores',
        metadata: {
          marca: 'Apple',
          modelo: 'MacBook Pro 14"',
          procesador: 'M3 Pro',
          memoria: '18GB',
          almacenamiento: '512GB SSD',
        },
        rating: 4.9,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'prod-004',
        name: 'Apple Watch Series 9',
        description: 'Watch with advanced features',
        price: 4500000,
        imageUrl:
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
        categoria: 'Wearables',
        metadata: {
          marca: 'Apple',
          modelo: 'Watch Series 9',
          tamaño: '45mm',
          color: 'Midnight',
        },
        rating: 4.7,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'prod-005',
        name: 'Comesticos para mujer',
        description: 'Comesticos para mujer',
        price: 150000,
        imageUrl:
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
        categoria: 'Belleza',
        metadata: {
          marca: 'Variada',
          tipo: 'Cosméticos',
          presentacion: 'Set completo',
        },
        rating: 4.2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const product of products) {
      await dynamoDb.put('products', product);
      logger.log(`Seeded product: ${product.id}`);
    }

    // Seed inventory
    const inventory = [
      {
        productId: 'prod-001',
        quantity: 50,
        reservedQuantity: 0,
        updatedAt: new Date().toISOString(),
      },
      {
        productId: 'prod-002',
        quantity: 30,
        reservedQuantity: 0,
        updatedAt: new Date().toISOString(),
      },
      {
        productId: 'prod-003',
        quantity: 20,
        reservedQuantity: 0,
        updatedAt: new Date().toISOString(),
      },
      {
        productId: 'prod-004',
        quantity: 10,
        reservedQuantity: 0,
        updatedAt: new Date().toISOString(),
      },
      {
        productId: 'prod-005',
        quantity: 100,
        reservedQuantity: 0,
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const inv of inventory) {
      await dynamoDb.put('inventory', inv);
      logger.log(`Seeded inventory for product: ${inv.productId}`);
    }

    logger.log('Data seeding completed successfully');
  } catch (error) {
    logger.error(
      'Error seeding data',
      error instanceof Error ? error.stack : String(error),
      'SeedData',
    );
    process.exit(1);
  } finally {
    await app.close();
  }
}

seedData();
