/**
 * Category Repository
 * 
 * DB operations for categories
 */

import { PrismaClient, Category } from '@prisma/client';
import { BaseRepository } from './BaseRepository.js';

export class CategoryRepository extends BaseRepository<Category> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'category');
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return await this.getModel().findUnique({
      where: { slug },
    });
  }

  async findByName(name: string): Promise<Category | null> {
    return await this.getModel().findFirst({
      where: { name },
    });
  }

  async findOrCreateByName(name: string): Promise<Category> {
    const existing = await this.findByName(name);
    if (existing) return existing;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return await this.create({
      name,
      slug,
      sortOrder: 0,
      isActive: true,
    });
  }
}

