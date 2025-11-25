/**
 * SalesPerson Service
 *
 * Handles business logic for sales person operations
 */

import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../lib/prisma.js';

export interface CreateSalesPersonInput {
  code: string;
  name: string;
  email?: string;
  phone?: string;
  commission?: number;
  notes?: string;
  hireDate?: Date;
}

export interface UpdateSalesPersonInput {
  code?: string;
  name?: string;
  email?: string;
  phone?: string;
  commission?: number;
  isActive?: boolean;
  notes?: string;
  hireDate?: Date;
  terminationDate?: Date;
}

export interface SalesPersonSearchOptions {
  search?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export class SalesPersonService {
  /**
   * Create a new sales person
   */
  async createSalesPerson(input: CreateSalesPersonInput) {
    const prisma = await getPrismaClient();
    const salesPerson = await prisma.salesPerson.create({
      data: {
        code: input.code,
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
        commission: input.commission || 0,
        notes: input.notes || null,
        hireDate: input.hireDate || null,
        isActive: true,
      },
    });

    return salesPerson;
  }

  /**
   * Get all sales persons with optional filtering
   */
  async getAllSalesPersons(options: SalesPersonSearchOptions = {}) {
    const prisma = await getPrismaClient();
    const { search, isActive, limit = 100, offset = 0 } = options;

    const where: Prisma.SalesPersonWhereInput = {};

    // Filter by active status
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Search by name or code
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [salesPersons, total] = await Promise.all([
      prisma.salesPerson.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { name: 'asc' },
      }),
      prisma.salesPerson.count({ where }),
    ]);

    return {
      salesPersons,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get a sales person by ID
   */
  async getSalesPersonById(id: string) {
    const prisma = await getPrismaClient();
    const salesPerson = await prisma.salesPerson.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
            lineItems: true,
          },
        },
      },
    });

    return salesPerson;
  }

  /**
   * Get a sales person by code
   */
  async getSalesPersonByCode(code: string) {
    const prisma = await getPrismaClient();
    const salesPerson = await prisma.salesPerson.findUnique({
      where: { code },
    });

    return salesPerson;
  }

  /**
   * Update a sales person
   */
  async updateSalesPerson(id: string, input: UpdateSalesPersonInput) {
    const prisma = await getPrismaClient();
    const salesPerson = await prisma.salesPerson.update({
      where: { id },
      data: {
        ...(input.code !== undefined && { code: input.code }),
        ...(input.name !== undefined && { name: input.name }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.commission !== undefined && { commission: input.commission }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.hireDate !== undefined && { hireDate: input.hireDate }),
        ...(input.terminationDate !== undefined && { terminationDate: input.terminationDate }),
      },
    });

    return salesPerson;
  }

  /**
   * Delete a sales person (soft delete by setting isActive to false)
   */
  async deleteSalesPerson(id: string) {
    const prisma = await getPrismaClient();
    // Check if sales person has any orders or line items
    const salesPerson = await prisma.salesPerson.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
            lineItems: true,
          },
        },
      },
    });

    if (!salesPerson) {
      throw new Error('Sales person not found');
    }

    // If has orders/line items, soft delete
    if (salesPerson._count.orders > 0 || salesPerson._count.lineItems > 0) {
      return await prisma.salesPerson.update({
        where: { id },
        data: {
          isActive: false,
          terminationDate: new Date(),
        },
      });
    }

    // Otherwise, hard delete
    return await prisma.salesPerson.delete({
      where: { id },
    });
  }

  /**
   * Generate a unique sales person code
   */
  async generateCode(): Promise<string> {
    const prisma = await getPrismaClient();
    const lastSalesPerson = await prisma.salesPerson.findFirst({
      orderBy: { code: 'desc' },
      where: {
        code: {
          startsWith: 'SP',
        },
      },
    });

    if (!lastSalesPerson) {
      return 'SP000001';
    }

    const lastNumber = parseInt(lastSalesPerson.code.replace('SP', ''), 10);
    const newNumber = lastNumber + 1;
    return `SP${newNumber.toString().padStart(6, '0')}`;
  }
}

export const salesPersonService = new SalesPersonService();
