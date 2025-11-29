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

import { PrismaClient, Prisma, OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// Types and Interfaces
// ============================================

export interface OrderPaymentDTO {
  paymentMethodId: string;
  amount: number;
  transactionId?: string;
  authorizationCode?: string;
  cardLast4?: string;
  cardBrand?: string;
}

export interface CreateSalesOrderDTO {
  locationId: string;
  cashierId: string;
  customerId?: string;
  lineItems: CreateOrderLineItemDTO[];
  payments?: OrderPaymentDTO[];
  orderLevelDiscount?: OrderLevelDiscountDTO;
  adjustment?: OrderAdjustmentDTO;
  giftCardNumber?: string;
  couponCode?: string; // Deprecated: Use giftCardNumber instead
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
  promotion?: Prisma.GiftCardGetPayload<Record<string, never>>;
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
  saleDiscountType?: 'amount' | 'percent';
  saleDiscountPercent?: number;
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
      // 1. Validate location
      const location = await prisma.location.findUnique({
        where: { id: data.locationId },
      });
      if (!location) {
        throw new Error(`Location not found: ${data.locationId}`);
      }

      // 2. Validate cashier
      const cashier = await prisma.user.findUnique({
        where: { id: data.cashierId },
      });
      if (!cashier) {
        throw new Error(`Cashier not found: ${data.cashierId}`);
      }

      // 3. Validate customer if provided
      if (data.customerId) {
        const customer = await prisma.customer.findUnique({
          where: { id: data.customerId },
        });
        if (!customer) {
          throw new Error(`Customer not found: ${data.customerId}`);
        }
      }

      // 4. Validate gift card if provided
      let giftCardValidation: CouponValidationResult | null = null;
      const giftCardNumber = data.giftCardNumber || data.couponCode;
      if (giftCardNumber) {
        giftCardValidation = await this.validateGiftCard(
          giftCardNumber,
          data.customerId
        );
        if (!giftCardValidation.isValid) {
          throw new Error(giftCardValidation.error || 'Invalid gift card');
        }
      }

      // 5. Calculate order totals
      const calculation = await this.calculateOrderTotals(data, giftCardValidation);

      // 6. Generate unique order number
      const orderNumber = await this.generateOrderNumber();

      // 7. Resolve variant IDs BEFORE transaction (prevent timeout)
      const resolvedLineItems = await Promise.all(
        data.lineItems.map(async (item, index) => {
          let actualVariantId = item.variantId;

          // Check if this is a variant ID or product ID
          const variant = await prisma.productVariant.findUnique({
            where: { id: item.variantId },
          });

          if (!variant) {
            // Might be a product ID, find the first variant for this product
            const firstVariant = await prisma.productVariant.findFirst({
              where: { productId: item.variantId },
            });

            if (firstVariant) {
              actualVariantId = firstVariant.id;
              console.log(`[SalesOrder] Mapped product ${item.variantId} to variant ${actualVariantId}`);
            } else {
              throw new Error(`Product/Variant not found: ${item.variantId}`);
            }
          }

          return {
            ...item,
            actualVariantId,
            calculation: calculation.lineItems[index],
          };
        })
      );

      // 8. Create the order with all line items in a transaction
      const order = await prisma.$transaction(async (tx) => {
        // Create the order
        const newOrder = await tx.saleOrder.create({
          data: {
            orderNumber,
            location: { connect: { id: data.locationId } },
            cashier: { connect: { id: data.cashierId } },
            customer: data.customerId ? { connect: { id: data.customerId } } : undefined,
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
            // Note: couponCode column removed from database - gift card tracked separately
            totalAmount: new Prisma.Decimal(calculation.totalAmount),
            amountDue: new Prisma.Decimal(calculation.totalAmount),
            notes: data.notes,
            customerNotes: data.customerNotes,
            status: 'Open',
            // syncStatus defaults to 'Pending' - will be synced to TradeUnleashed later
          },
        });

        // Create line items (using pre-resolved variant IDs)
        for (const item of resolvedLineItems) {
          await tx.orderLineItem.create({
            data: {
              orderId: newOrder.id,
              variantId: item.actualVariantId,
              quantity: item.quantity,
              unitPrice: new Prisma.Decimal(item.unitPrice),
              lineDiscount: new Prisma.Decimal(item.calculation.totalDiscount),
              lineDiscountType: item.calculation.saleDiscountType,
              lineDiscountPercent: item.calculation.saleDiscountPercent
                ? new Prisma.Decimal(item.calculation.saleDiscountPercent)
                : null,
              lineTax: new Prisma.Decimal(0), // TODO: Implement tax calculation
              lineTotal: new Prisma.Decimal(item.calculation.lineTotal),
              notes: item.notes,
            },
          });
        }

        // Update gift card balance if applicable
        if (giftCardValidation?.promotion && giftCardValidation.discountAmount) {
          const giftCard = giftCardValidation.promotion;
          await tx.giftCard.update({
            where: { id: giftCard.id },
            data: {
              currentBalance: {
                decrement: Math.min(
                  giftCardValidation.discountAmount,
                  Number(giftCard.currentBalance)
                ),
              },
            },
          });
        }

        // Process payments if provided
        let totalAmountPaid = 0;
        if (data.payments && data.payments.length > 0) {
          for (const payment of data.payments) {
            // Try to find payment method by ID first (UUID from PaymentMethod table)
            let paymentMethod = await tx.paymentMethod.findUnique({
              where: { id: payment.paymentMethodId },
            });

            // If not found, try TradePaymentMethod table (BigInt ID)
            if (!paymentMethod) {
              try {
                const tradePaymentMethod = await tx.tradePaymentMethod.findUnique({
                  where: { id: BigInt(payment.paymentMethodId) },
                });

                if (tradePaymentMethod) {
                  // Get the payment method type/name from TradePaymentMethod
                  const methodName = tradePaymentMethod.name || tradePaymentMethod.paymentMethodType || 'CASH';
                  
                  // Try to find PaymentMethod by name (case-insensitive)
                  const allPaymentMethods = await tx.paymentMethod.findMany({
                    where: { isActive: true },
                  });
                  
                  paymentMethod = allPaymentMethods.find(
                    pm => pm.name.toUpperCase() === methodName.toUpperCase() ||
                          pm.code.toUpperCase() === methodName.toUpperCase()
                  ) ?? null;

                  // If still not found, try to find by code using the paymentMethodType
                  if (!paymentMethod && tradePaymentMethod.paymentMethodType) {
                    const methodType = tradePaymentMethod.paymentMethodType;
                    paymentMethod = allPaymentMethods.find(
                      pm => pm.code.toUpperCase() === methodType.toUpperCase()
                    ) ?? null;
                  }

                  // If still not found, create a PaymentMethod from TradePaymentMethod data
                  if (!paymentMethod) {
                    // Map TradePaymentMethod paymentMethodType to PaymentMethodType enum
                    const mapTradePaymentTypeToEnum = (type: string | null): 'Cash' | 'Card' | 'BankTransfer' | 'Check' | 'GiftCard' | 'StoreCredit' | 'OnAccount' => {
                      if (!type) return 'Cash';
                      const upperType = type.toUpperCase();
                      if (upperType.includes('CASH')) return 'Cash';
                      if (upperType.includes('CARD') || upperType.includes('CREDIT') || upperType.includes('DEBIT')) return 'Card';
                      if (upperType.includes('BANK') || upperType.includes('TRANSFER')) return 'BankTransfer';
                      if (upperType.includes('CHECK') || upperType.includes('CHEQUE')) return 'Check';
                      if (upperType.includes('GIFT')) return 'GiftCard';
                      if (upperType.includes('STORE') || upperType.includes('CREDIT')) return 'StoreCredit';
                      if (upperType.includes('ACCOUNT')) return 'OnAccount';
                      return 'Cash'; // Default
                    };

                    // Use paymentMethodType as code, or name if type is not available
                    const code = tradePaymentMethod.paymentMethodType || 
                                tradePaymentMethod.name.toUpperCase().replace(/\s+/g, '_') || 
                                'CASH';
                    
                    paymentMethod = await tx.paymentMethod.create({
                      data: {
                        code: code,
                        name: tradePaymentMethod.name,
                        type: mapTradePaymentTypeToEnum(tradePaymentMethod.paymentMethodType),
                        isActive: true,
                      },
                    });
                  }
                }
              } catch (e) {
                // If BigInt conversion fails, it's not a TradePaymentMethod ID
                console.log(`[SalesOrder] Payment method ID ${payment.paymentMethodId} is not a valid UUID or BigInt`);
              }
            }

            // If still not found, try to find by code (direct lookup)
            if (!paymentMethod) {
              paymentMethod = await tx.paymentMethod.findUnique({
                where: { code: payment.paymentMethodId.toUpperCase() },
              });
            }

            if (!paymentMethod) {
              // Get available payment methods for error message
              const availableMethods = await tx.paymentMethod.findMany({
                where: { isActive: true },
                select: { code: true, name: true },
              });
              const availableCodes = availableMethods.map(pm => pm.code).join(', ');
              
              throw new Error(
                `Payment method not found: ${payment.paymentMethodId}. ` +
                `Available codes: ${availableCodes}. ` +
                `Please use a valid PaymentMethod UUID or TradePaymentMethod ID.`
              );
            }

            // Create payment record using the actual payment method ID from database
            await tx.orderPayment.create({
              data: {
                orderId: newOrder.id,
                paymentMethodId: paymentMethod.id,
                amount: new Prisma.Decimal(payment.amount),
                status: 'Completed',
                transactionId: payment.transactionId,
                authorizationCode: payment.authorizationCode,
                cardLast4: payment.cardLast4,
                cardBrand: payment.cardBrand,
              },
            });

            totalAmountPaid += payment.amount;
          }
        }

        // Calculate final amounts
        const amountDue = calculation.totalAmount - totalAmountPaid;
        const changeAmount = amountDue < 0 ? Math.abs(amountDue) : 0;
        const finalStatus = amountDue <= 0.01 ? 'Completed' : 'Open';

        // Update order with payment information
        const updatedOrder = await tx.saleOrder.update({
          where: { id: newOrder.id },
          data: {
            amountPaid: new Prisma.Decimal(totalAmountPaid),
            amountDue: new Prisma.Decimal(Math.max(0, amountDue)),
            changeAmount: new Prisma.Decimal(changeAmount),
            status: finalStatus,
            completedAt: finalStatus === 'Completed' ? new Date() : null,
          },
        });

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

        return updatedOrder;
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
      let saleDiscountType: 'amount' | 'percent' | undefined;
      let saleDiscountPercent: number | undefined;

      if (item.saleDiscount) {
        if (item.saleDiscount.amount) {
          saleDiscount = item.saleDiscount.amount;
          saleDiscountType = 'amount';
        } else if (item.saleDiscount.percent) {
          saleDiscount = (lineSubtotal * item.saleDiscount.percent) / 100;
          saleDiscountType = 'percent';
          saleDiscountPercent = item.saleDiscount.percent;
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
        saleDiscountType,
        saleDiscountPercent,
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
   * Validate a gift card
   */
  static async validateGiftCard(
    cardNumber: string,
    customerId?: string
  ): Promise<CouponValidationResult> {
    try {
      const giftCard = await prisma.giftCard.findUnique({
        where: { cardNumber },
      });

      if (!giftCard) {
        return {
          isValid: false,
          error: 'Gift card not found',
        };
      }

      // Check if gift card belongs to customer (if customerId is provided)
      if (customerId && giftCard.customerId && giftCard.customerId !== customerId) {
        return {
          isValid: false,
          error: 'Gift card does not belong to this customer',
        };
      }

      // Check if active
      if (!giftCard.isActive) {
        return {
          isValid: false,
          error: 'Gift card is no longer active',
        };
      }

      // Check expiry date
      if (giftCard.expiryDate) {
        const now = new Date();
        if (now > giftCard.expiryDate) {
          return {
            isValid: false,
            error: 'Gift card has expired',
          };
        }
      }

      // Check balance
      const currentBalance = Number(giftCard.currentBalance);
      if (currentBalance <= 0) {
        return {
          isValid: false,
          error: 'Gift card has no remaining balance',
        };
      }

      // Return the gift card with its current balance as the discount amount
      return {
        isValid: true,
        promotion: giftCard,
        discountAmount: currentBalance,
      };
    } catch (error) {
      console.error('Error validating gift card:', error);
      return {
        isValid: false,
        error: 'Error validating gift card',
      };
    }
  }

  /**
   * Validate a coupon code (deprecated - kept for backward compatibility)
   */
  static async validateCoupon(
    couponCode: string,
    customerId?: string
  ): Promise<CouponValidationResult> {
    // Redirect to gift card validation
    return this.validateGiftCard(couponCode, customerId);
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
    if (filters.status) where.status = filters.status as OrderStatus;
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
      const orderDateFilter: Prisma.DateTimeFilter = {};
      if (startDate) orderDateFilter.gte = startDate;
      if (endDate) orderDateFilter.lte = endDate;
      where.order = {
        orderDate: orderDateFilter,
      };
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

