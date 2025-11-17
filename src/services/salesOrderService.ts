/**
 * Sales Order Service
 *
 * Handles all sales operations including:
 * - Order creation with customer assignment
 * - Line item management with sales person tracking
 * - Multi-level discount calculations (line and order level)
 * - Custom discounts
 * - Order adjustments
 * - Coupon code validation and application
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// Types and Interfaces
// ============================================

export interface CreateSalesOrderDTO {
  locationId: string;
  cashierId: string;
  customerId?: string;
  lineItems: CreateOrderLineItemDTO[];
  orderLevelDiscount?: OrderLevelDiscountDTO;
  adjustment?: OrderAdjustmentDTO;
  couponCode?: string;
  notes?: string;
  customerNotes?: string;
}

export interface CreateOrderLineItemDTO {
  variantId: string;
  salesPersonId?: string;
  quantity: number;
  unitPrice: number;
  saleDiscount?: DiscountDTO;
  customDiscount?: DiscountDTO;
  notes?: string;
}

export interface DiscountDTO {
  amount?: number;
  percent?: number;
}

export interface OrderLevelDiscountDTO {
  amount?: number;
  percent?: number;
}

export interface OrderAdjustmentDTO {
  amount: number;
  reason?: string;
}

export interface CouponValidationResult {
  isValid: boolean;
  error?: string;
  promotion?: any;
  discountAmount?: number;
}

export interface OrderCalculation {
  subtotal: number;
  totalLineDiscounts: number;
  subtotalAfterLineDiscounts: number;
  orderLevelDiscount: number;
  adjustment: number;
  taxAmount: number;
  totalAmount: number;
  lineItems: LineItemCalculation[];
}

export interface LineItemCalculation {
  variantId: string;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  saleDiscount: number;
  customDiscount: number;
  totalDiscount: number;
  lineTotal: number;
}

// ============================================
// Sales Order Service
// ============================================

export class SalesOrderService {
  /**
   * Create a new sales order with full discount calculations
   */
  static async createSalesOrder(data: CreateSalesOrderDTO) {
    try {
      // 1. Validate customer if provided
      if (data.customerId) {
        const customer = await prisma.customer.findUnique({
          where: { id: data.customerId },
        });
        if (!customer) {
          throw new Error(`Customer not found: ${data.customerId}`);
        }
      }

      // 2. Validate coupon code if provided
      let couponValidation: CouponValidationResult | null = null;
      if (data.couponCode) {
        couponValidation = await this.validateCoupon(
          data.couponCode,
          data.customerId
        );
        if (!couponValidation.isValid) {
          throw new Error(couponValidation.error || 'Invalid coupon code');
        }
      }

      // 3. Calculate order totals
      const calculation = await this.calculateOrderTotals(data, couponValidation);

      // 4. Generate unique order number
      const orderNumber = await this.generateOrderNumber();

      // 5. Create the order with all line items in a transaction
      const order = await prisma.$transaction(async (tx) => {
        // Create the order
        const newOrder = await tx.saleOrder.create({
          data: {
            orderNumber,
            locationId: data.locationId,
            cashierId: data.cashierId,
            customerId: data.customerId,
            subtotal: new Prisma.Decimal(calculation.subtotal),
            taxAmount: new Prisma.Decimal(calculation.taxAmount),
            discountAmount: new Prisma.Decimal(
              data.orderLevelDiscount?.amount || 0
            ),
            discountPercent: new Prisma.Decimal(
              data.orderLevelDiscount?.percent || 0
            ),
            adjustmentAmount: new Prisma.Decimal(data.adjustment?.amount || 0),
            adjustmentReason: data.adjustment?.reason,
            couponCode: data.couponCode,
            totalAmount: new Prisma.Decimal(calculation.totalAmount),
            amountDue: new Prisma.Decimal(calculation.totalAmount),
            notes: data.notes,
            customerNotes: data.customerNotes,
            status: 'Open',
          },
        });

        // Create line items
        for (let i = 0; i < data.lineItems.length; i++) {
          const item = data.lineItems[i];
          const itemCalc = calculation.lineItems[i];

          await tx.orderLineItem.create({
            data: {
              orderId: newOrder.id,
              variantId: item.variantId,
              salesPersonId: item.salesPersonId,
              quantity: item.quantity,
              unitPrice: new Prisma.Decimal(item.unitPrice),
              lineDiscount: new Prisma.Decimal(item.saleDiscount?.amount || 0),
              lineDiscountPercent: new Prisma.Decimal(
                item.saleDiscount?.percent || 0
              ),
              customDiscountAmount: new Prisma.Decimal(
                item.customDiscount?.amount || 0
              ),
              customDiscountPercent: new Prisma.Decimal(
                item.customDiscount?.percent || 0
              ),
              lineTax: new Prisma.Decimal(0), // TODO: Implement tax calculation
              lineTotal: new Prisma.Decimal(itemCalc.lineTotal),
              notes: item.notes,
            },
          });
        }

        // Update coupon usage if applicable
        if (couponValidation?.promotion) {
          await tx.promotion.update({
            where: { id: couponValidation.promotion.id },
            data: {
              usageCount: { increment: 1 },
            },
          });
        }

        // Update customer stats if applicable
        if (data.customerId) {
          await tx.customer.update({
            where: { id: data.customerId },
            data: {
              totalSpent: { increment: calculation.totalAmount },
              lastVisitDate: new Date(),
            },
          });
        }

        return newOrder;
      });

      // 6. Fetch and return the complete order with relations
      return await this.getOrderById(order.id);
    } catch (error) {
      console.error('Error creating sales order:', error);
      throw error;
    }
  }

  /**
   * Calculate order totals with all discounts applied
   */
  private static async calculateOrderTotals(
    data: CreateSalesOrderDTO,
    couponValidation: CouponValidationResult | null
  ): Promise<OrderCalculation> {
    const lineItems: LineItemCalculation[] = [];
    let subtotal = 0;
    let totalLineDiscounts = 0;

    // Calculate each line item
    for (const item of data.lineItems) {
      const lineSubtotal = item.unitPrice * item.quantity;

      // Calculate sale discount (line-level)
      let saleDiscount = 0;
      if (item.saleDiscount) {
        if (item.saleDiscount.amount) {
          saleDiscount = item.saleDiscount.amount;
        } else if (item.saleDiscount.percent) {
          saleDiscount = (lineSubtotal * item.saleDiscount.percent) / 100;
        }
      }

      // Calculate custom discount (line-level)
      let customDiscount = 0;
      if (item.customDiscount) {
        if (item.customDiscount.amount) {
          customDiscount = item.customDiscount.amount;
        } else if (item.customDiscount.percent) {
          customDiscount = (lineSubtotal * item.customDiscount.percent) / 100;
        }
      }

      const totalDiscount = saleDiscount + customDiscount;
      const lineTotal = lineSubtotal - totalDiscount;

      lineItems.push({
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineSubtotal,
        saleDiscount,
        customDiscount,
        totalDiscount,
        lineTotal,
      });

      subtotal += lineSubtotal;
      totalLineDiscounts += totalDiscount;
    }

    const subtotalAfterLineDiscounts = subtotal - totalLineDiscounts;

    // Calculate order-level discount
    let orderLevelDiscount = 0;
    if (data.orderLevelDiscount) {
      if (data.orderLevelDiscount.amount) {
        orderLevelDiscount = data.orderLevelDiscount.amount;
      } else if (data.orderLevelDiscount.percent) {
        orderLevelDiscount =
          (subtotalAfterLineDiscounts * data.orderLevelDiscount.percent) / 100;
      }
    }

    // Apply coupon discount (if applicable and not already included in order discount)
    if (couponValidation?.discountAmount) {
      orderLevelDiscount += couponValidation.discountAmount;
    }

    // Calculate adjustment
    const adjustment = data.adjustment?.amount || 0;

    // Calculate subtotal after all discounts
    const subtotalAfterAllDiscounts =
      subtotalAfterLineDiscounts - orderLevelDiscount + adjustment;

    // Calculate tax (simplified - would need proper tax calculation in production)
    const taxAmount = 0; // TODO: Implement tax calculation based on location and product taxability

    // Calculate final total
    const totalAmount = subtotalAfterAllDiscounts + taxAmount;

    return {
      subtotal,
      totalLineDiscounts,
      subtotalAfterLineDiscounts,
      orderLevelDiscount,
      adjustment,
      taxAmount,
      totalAmount,
      lineItems,
    };
  }

  /**
   * Validate a coupon code
   */
  static async validateCoupon(
    couponCode: string,
    customerId?: string
  ): Promise<CouponValidationResult> {
    try {
      const promotion = await prisma.promotion.findUnique({
        where: { code: couponCode },
      });

      if (!promotion) {
        return {
          isValid: false,
          error: 'Coupon code not found',
        };
      }

      // Check if active
      if (!promotion.isActive) {
        return {
          isValid: false,
          error: 'Coupon code is no longer active',
        };
      }

      // Check date range
      const now = new Date();
      if (now < promotion.startDate || now > promotion.endDate) {
        return {
          isValid: false,
          error: 'Coupon code has expired or is not yet valid',
        };
      }

      // Check usage limit
      if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
        return {
          isValid: false,
          error: 'Coupon code has reached its usage limit',
        };
      }

      // Check single-use restriction
      if (promotion.isSingleUse && promotion.usageCount > 0) {
        return {
          isValid: false,
          error: 'This coupon code has already been used',
        };
      }

      // Check per-customer usage limit
      if (customerId && promotion.usageLimitPerCustomer) {
        const customerUsage = await prisma.orderDiscount.count({
          where: {
            discountId: promotion.id,
            order: {
              customerId,
            },
          },
        });

        if (customerUsage >= promotion.usageLimitPerCustomer) {
          return {
            isValid: false,
            error: 'You have reached the usage limit for this coupon',
          };
        }
      }

      // Calculate discount amount based on promotion type
      let discountAmount = 0;
      if (promotion.type === 'Percentage') {
        // Percentage discount - will be calculated against order subtotal
        discountAmount = 0; // Will be calculated in calculateOrderTotals
      } else if (promotion.type === 'FixedAmount') {
        discountAmount = Number(promotion.value);
      }

      return {
        isValid: true,
        promotion,
        discountAmount,
      };
    } catch (error) {
      console.error('Error validating coupon:', error);
      return {
        isValid: false,
        error: 'Error validating coupon code',
      };
    }
  }

  /**
   * Get order by ID with all relations
   */
  static async getOrderById(orderId: string) {
    return await prisma.saleOrder.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        cashier: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        location: true,
        lineItems: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
            salesPerson: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
              },
            },
          },
        },
        payments: {
          include: {
            paymentMethod: true,
          },
        },
        discounts: {
          include: {
            discount: true,
          },
        },
      },
    });
  }

  /**
   * Get all orders with pagination and filters
   */
  static async getOrders(params: {
    page?: number;
    limit?: number;
    customerId?: string;
    locationId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { page = 1, limit = 50, ...filters } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.SaleOrderWhereInput = {};

    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.locationId) where.locationId = filters.locationId;
    if (filters.status) where.status = filters.status as any;
    if (filters.startDate || filters.endDate) {
      where.orderDate = {};
      if (filters.startDate) where.orderDate.gte = filters.startDate;
      if (filters.endDate) where.orderDate.lte = filters.endDate;
    }

    const [orders, total] = await Promise.all([
      prisma.saleOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { orderDate: 'desc' },
        include: {
          customer: true,
          cashier: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          lineItems: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      }),
      prisma.saleOrder.count({ where }),
    ]);

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(
    orderId: string,
    status: 'Open' | 'Completed' | 'Voided' | 'Parked' | 'OnHold'
  ) {
    return await prisma.saleOrder.update({
      where: { id: orderId },
      data: {
        status,
        completedAt: status === 'Completed' ? new Date() : null,
      },
    });
  }

  /**
   * Add payment to order
   */
  static async addPayment(
    orderId: string,
    paymentMethodId: string,
    amount: number
  ) {
    const order = await prisma.saleOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const payment = await prisma.orderPayment.create({
      data: {
        orderId,
        paymentMethodId,
        amount: new Prisma.Decimal(amount),
        status: 'Completed',
      },
    });

    // Update order amounts
    const newAmountPaid = Number(order.amountPaid) + amount;
    const newAmountDue = Number(order.totalAmount) - newAmountPaid;
    const changeAmount = newAmountDue < 0 ? Math.abs(newAmountDue) : 0;

    await prisma.saleOrder.update({
      where: { id: orderId },
      data: {
        amountPaid: new Prisma.Decimal(newAmountPaid),
        amountDue: new Prisma.Decimal(Math.max(0, newAmountDue)),
        changeAmount: new Prisma.Decimal(changeAmount),
        status: newAmountDue <= 0 ? 'Completed' : 'Open',
        completedAt: newAmountDue <= 0 ? new Date() : null,
      },
    });

    return payment;
  }

  /**
   * Generate unique order number
   */
  private static async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const prefix = `ORD-${today.getFullYear()}${String(
      today.getMonth() + 1
    ).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    // Get count of orders today
    const count = await prisma.saleOrder.count({
      where: {
        orderNumber: {
          startsWith: prefix,
        },
      },
    });

    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Get sales person statistics
   */
  static async getSalesPersonStats(salesPersonId: string, startDate?: Date, endDate?: Date) {
    const where: Prisma.OrderLineItemWhereInput = {
      salesPersonId,
    };

    if (startDate || endDate) {
      where.order = {
        orderDate: {},
      };
      if (startDate) where.order.orderDate.gte = startDate;
      if (endDate) where.order.orderDate.lte = endDate;
    }

    const lineItems = await prisma.orderLineItem.findMany({
      where,
      include: {
        order: true,
      },
    });

    const totalSales = lineItems.reduce(
      (sum, item) => sum + Number(item.lineTotal),
      0
    );
    const totalItems = lineItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalOrders = new Set(lineItems.map((item) => item.orderId)).size;

    return {
      totalSales,
      totalItems,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
    };
  }
}

export default SalesOrderService;
