/**
 * Base Repository
 * 
 * Generic repository for DB operations
 * NO business logic here - just data access
 */

import { PrismaClient } from '@prisma/client';
import { QueryOptions, PaginatedResponse } from '../types/base.types';

export abstract class BaseRepository<T> {
  protected prisma: PrismaClient;
  protected modelName: string;

  constructor(prisma: PrismaClient, modelName: string) {
    this.prisma = prisma;
    this.modelName = modelName;
  }

  protected getModel(): any {
    return (this.prisma as any)[this.modelName];
  }

  async findById(id: string, options?: QueryOptions): Promise<T | null> {
    return await this.getModel().findUnique({
      where: { id },
      ...this.buildQueryOptions(options),
    });
  }

  async findMany(options?: QueryOptions): Promise<T[]> {
    return await this.getModel().findMany(this.buildQueryOptions(options));
  }

  async findPaginated(
    page: number = 1,
    limit: number = 10,
    options?: QueryOptions
  ): Promise<PaginatedResponse<T>> {
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      this.getModel().findMany({
        ...this.buildQueryOptions(options),
        skip,
        take: limit,
      }),
      this.count(options),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: any): Promise<T> {
    return await this.getModel().create({ data });
  }

  async update(id: string, data: any): Promise<T> {
    return await this.getModel().update({
      where: { id },
      data,
    });
  }

  async upsert(where: any, create: any, update: any): Promise<T> {
    return await this.getModel().upsert({
      where,
      create,
      update,
    });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.getModel().delete({ where: { id } });
      return true;
    } catch (error) {
      return false;
    }
  }

  async count(options?: QueryOptions): Promise<number> {
    return await this.getModel().count({
      where: options?.where,
    });
  }

  protected buildQueryOptions(options?: QueryOptions): any {
    if (!options) return {};

    return {
      include: options.include,
      orderBy: options.orderBy,
      where: options.where,
    };
  }
}

