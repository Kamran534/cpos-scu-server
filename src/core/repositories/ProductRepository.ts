/**
 * Product Repository
 * 
 * DB operations for products
 * NO business logic - just data access
 */

import { PrismaClient, Product } from '@prisma/client';
import { BaseRepository } from './BaseRepository.js';

export class ProductRepository extends BaseRepository<Product> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'product');
  }

  async findBySku(sku: string): Promise<Product | null> {
    // Note: Products use 'productCode', not 'sku'
    // SKU is on ProductVariant. We use productCode as the product identifier.
    return await this.getModel().findUnique({
      where: { productCode: sku },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async findBySourceId(sourceSystem: string, _sourceId: string): Promise<Product | null> {
    // TODO: Implement sourceId filtering when metadata structure is confirmed
    // For now, we only filter by sourceSystem
    return await this.getModel().findFirst({
      where: {
        metadata: {
          path: ['sourceSystem'],
          equals: sourceSystem,
        },
      },
    });
  }

  async findByCategory(categoryId: string): Promise<Product[]> {
    return await this.getModel().findMany({
      where: { categoryId },
      orderBy: { name: 'asc' },
    });
  }

  async findActive(): Promise<Product[]> {
    return await this.getModel().findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async searchByName(searchTerm: string): Promise<Product[]> {
    return await this.getModel().findMany({
      where: {
        name: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async bulkCreate(products: any[]): Promise<number> {
    const result = await this.getModel().createMany({
      data: products,
      skipDuplicates: true,
    });
    return result.count;
  }
}

