/**
 * Brand Repository
 * 
 * DB operations for brands
 */

import { PrismaClient, Brand } from '@prisma/client';
import { BaseRepository } from './BaseRepository.js';

export class BrandRepository extends BaseRepository<Brand> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'brand');
  }

  async findByName(name: string): Promise<Brand | null> {
    return await this.getModel().findFirst({
      where: { name },
    });
  }

  async findOrCreateByName(name: string): Promise<Brand> {
    const existing = await this.findByName(name);
    if (existing) return existing;

    return await this.create({
      name,
      isActive: true,
    });
  }
}

