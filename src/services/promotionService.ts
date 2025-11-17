/**
 * Promotion/Coupon Service
 *
 * Handles promotion and coupon management:
 * - Create, update, delete promotions/coupons
 * - Validate coupon codes
 * - Track usage
 * - Apply promotions to orders
 */

import { PrismaClient, Prisma, PromotionType, PromotionApplicability } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// Types and Interfaces
// ============================================

export interface CreatePromotionDTO {
  code: string;
  name: string;
  type: PromotionType;
  value: number;
  applicableTo: PromotionApplicability;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  startDate: Date;
  endDate: Date;
  usageLimit?: number;
  usageLimitPerCustomer?: number;
  isSingleUse?: boolean;
  requiresCouponCode?: boolean;
  description?: string;
  customerGroupIds?: string[];
  categoryIds?: string[];
  productIds?: string[];
}

export interface UpdatePromotionDTO extends Partial<CreatePromotionDTO> {
  isActive?: boolean;
}

// ============================================
// Promotion Service
// ============================================

export class PromotionService {
  /**
   * Create a new promotion/coupon
   */
  static async createPromotion(data: CreatePromotionDTO) {
    try {
      // Check if code already exists
      const existing = await prisma.promotion.findUnique({
        where: { code: data.code },
      });

      if (existing) {
        throw new Error(`Promotion code '${data.code}' already exists`);
      }

      const promotion = await prisma.promotion.create({
        data: {
          code: data.code,
          name: data.name,
          type: data.type,
          value: new Prisma.Decimal(data.value),
          applicableTo: data.applicableTo,
          minPurchaseAmount: data.minPurchaseAmount
            ? new Prisma.Decimal(data.minPurchaseAmount)
            : null,
          maxDiscountAmount: data.maxDiscountAmount
            ? new Prisma.Decimal(data.maxDiscountAmount)
            : null,
          startDate: data.startDate,
          endDate: data.endDate,
          usageLimit: data.usageLimit,
          usageLimitPerCustomer: data.usageLimitPerCustomer,
          isSingleUse: data.isSingleUse || false,
          requiresCouponCode: data.requiresCouponCode || false,
          description: data.description,
          customerGroupIds: data.customerGroupIds || [],
          categoryIds: data.categoryIds || [],
          productIds: data.productIds || [],
        },
      });

      return promotion;
    } catch (error) {
      console.error('Error creating promotion:', error);
      throw error;
    }
  }

  /**
   * Get promotion by ID
   */
  static async getPromotionById(id: string) {
    return await prisma.promotion.findUnique({
      where: { id },
      include: {
        categories: true,
        orderDiscounts: {
          include: {
            order: {
              select: {
                orderNumber: true,
                orderDate: true,
                totalAmount: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get promotion by code
   */
  static async getPromotionByCode(code: string) {
    return await prisma.promotion.findUnique({
      where: { code },
    });
  }

  /**
   * Get all promotions with filters
   */
  static async getPromotions(params: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    type?: PromotionType;
    includeExpired?: boolean;
  }) {
    const { page = 1, limit = 50, isActive, type, includeExpired = false } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.PromotionWhereInput = {};

    if (isActive !== undefined) where.isActive = isActive;
    if (type) where.type = type;
    if (!includeExpired) {
      where.endDate = { gte: new Date() };
    }

    const [promotions, total] = await Promise.all([
      prisma.promotion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.promotion.count({ where }),
    ]);

    return {
      promotions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get active promotions (currently valid)
   */
  static async getActivePromotions() {
    const now = new Date();

    return await prisma.promotion.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update promotion
   */
  static async updatePromotion(id: string, data: UpdatePromotionDTO) {
    try {
      const updateData: any = {};

      if (data.code !== undefined) updateData.code = data.code;
      if (data.name !== undefined) updateData.name = data.name;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.value !== undefined) updateData.value = new Prisma.Decimal(data.value);
      if (data.applicableTo !== undefined) updateData.applicableTo = data.applicableTo;
      if (data.minPurchaseAmount !== undefined)
        updateData.minPurchaseAmount = new Prisma.Decimal(data.minPurchaseAmount);
      if (data.maxDiscountAmount !== undefined)
        updateData.maxDiscountAmount = new Prisma.Decimal(data.maxDiscountAmount);
      if (data.startDate !== undefined) updateData.startDate = data.startDate;
      if (data.endDate !== undefined) updateData.endDate = data.endDate;
      if (data.usageLimit !== undefined) updateData.usageLimit = data.usageLimit;
      if (data.usageLimitPerCustomer !== undefined)
        updateData.usageLimitPerCustomer = data.usageLimitPerCustomer;
      if (data.isSingleUse !== undefined) updateData.isSingleUse = data.isSingleUse;
      if (data.requiresCouponCode !== undefined)
        updateData.requiresCouponCode = data.requiresCouponCode;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.customerGroupIds !== undefined)
        updateData.customerGroupIds = data.customerGroupIds;
      if (data.categoryIds !== undefined) updateData.categoryIds = data.categoryIds;
      if (data.productIds !== undefined) updateData.productIds = data.productIds;

      return await prisma.promotion.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      console.error('Error updating promotion:', error);
      throw error;
    }
  }

  /**
   * Delete promotion
   */
  static async deletePromotion(id: string) {
    try {
      // Check if promotion has been used
      const usageCount = await prisma.orderDiscount.count({
        where: { discountId: id },
      });

      if (usageCount > 0) {
        // Soft delete - just deactivate instead of deleting
        return await prisma.promotion.update({
          where: { id },
          data: { isActive: false },
        });
      } else {
        // Hard delete if never used
        return await prisma.promotion.delete({
          where: { id },
        });
      }
    } catch (error) {
      console.error('Error deleting promotion:', error);
      throw error;
    }
  }

  /**
   * Get promotion usage statistics
   */
  static async getPromotionStats(id: string) {
    const promotion = await prisma.promotion.findUnique({
      where: { id },
      include: {
        orderDiscounts: {
          include: {
            order: true,
          },
        },
      },
    });

    if (!promotion) {
      throw new Error('Promotion not found');
    }

    const totalRevenue = promotion.orderDiscounts.reduce(
      (sum, discount) => sum + Number(discount.order.totalAmount),
      0
    );

    const totalDiscount = promotion.orderDiscounts.reduce(
      (sum, discount) => sum + Number(discount.discountAmount),
      0
    );

    const uniqueCustomers = new Set(
      promotion.orderDiscounts
        .map((d) => d.order.customerId)
        .filter((id) => id !== null)
    ).size;

    return {
      promotionId: id,
      code: promotion.code,
      name: promotion.name,
      usageCount: promotion.usageCount,
      usageLimit: promotion.usageLimit,
      remainingUses: promotion.usageLimit
        ? promotion.usageLimit - promotion.usageCount
        : null,
      totalRevenue,
      totalDiscount,
      uniqueCustomers,
      averageOrderValue:
        promotion.usageCount > 0 ? totalRevenue / promotion.usageCount : 0,
      averageDiscount:
        promotion.usageCount > 0 ? totalDiscount / promotion.usageCount : 0,
    };
  }

  /**
   * Get customer promotion usage
   */
  static async getCustomerPromotionUsage(customerId: string, promotionId: string) {
    const usageCount = await prisma.orderDiscount.count({
      where: {
        discountId: promotionId,
        order: {
          customerId,
        },
      },
    });

    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId },
    });

    return {
      usageCount,
      usageLimit: promotion?.usageLimitPerCustomer,
      canUse: promotion?.usageLimitPerCustomer
        ? usageCount < promotion.usageLimitPerCustomer
        : true,
    };
  }

  /**
   * Validate if promotion can be applied to specific products/categories
   */
  static async validatePromotionApplicability(
    promotionId: string,
    productIds: string[],
    categoryIds: string[]
  ): Promise<{ isApplicable: boolean; reason?: string }> {
    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId },
    });

    if (!promotion) {
      return { isApplicable: false, reason: 'Promotion not found' };
    }

    // If promotion applies to entire order, it's always applicable
    if (promotion.applicableTo === 'EntireOrder') {
      return { isApplicable: true };
    }

    // Check product applicability
    if (promotion.applicableTo === 'Product') {
      const hasMatchingProduct = productIds.some((id) =>
        promotion.productIds.includes(id)
      );
      if (!hasMatchingProduct) {
        return {
          isApplicable: false,
          reason: 'Promotion does not apply to these products',
        };
      }
    }

    // Check category applicability
    if (promotion.applicableTo === 'Category') {
      const hasMatchingCategory = categoryIds.some((id) =>
        promotion.categoryIds.includes(id)
      );
      if (!hasMatchingCategory) {
        return {
          isApplicable: false,
          reason: 'Promotion does not apply to these categories',
        };
      }
    }

    return { isApplicable: true };
  }

  /**
   * Generate a unique coupon code
   */
  static async generateUniqueCouponCode(prefix: string = 'COUPON'): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    let exists = true;

    while (exists) {
      let randomPart = '';
      for (let i = 0; i < 6; i++) {
        randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      code = `${prefix}-${randomPart}`;

      const existing = await prisma.promotion.findUnique({
        where: { code },
      });
      exists = !!existing;
    }

    return code!;
  }

  /**
   * Bulk create coupons (for campaigns)
   */
  static async bulkCreateCoupons(params: {
    baseName: string;
    type: PromotionType;
    value: number;
    count: number;
    startDate: Date;
    endDate: Date;
    isSingleUse: boolean;
  }) {
    const coupons = [];

    for (let i = 0; i < params.count; i++) {
      const code = await this.generateUniqueCouponCode();

      const coupon = await prisma.promotion.create({
        data: {
          code,
          name: `${params.baseName} - ${i + 1}`,
          type: params.type,
          value: new Prisma.Decimal(params.value),
          applicableTo: 'EntireOrder',
          startDate: params.startDate,
          endDate: params.endDate,
          isSingleUse: params.isSingleUse,
          requiresCouponCode: true,
          usageLimit: params.isSingleUse ? 1 : undefined,
        },
      });

      coupons.push(coupon);
    }

    return coupons;
  }
}

export default PromotionService;
