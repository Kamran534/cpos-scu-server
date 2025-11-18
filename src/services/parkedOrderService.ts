/**
 * Parked Order Service
 *
 * Handles all parked order operations including:
 * - Parking orders for later completion
 * - Searching parked orders
 * - Loading parked orders with full details
 * - Completing parked orders
 * - Deleting/canceling parked orders
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// Types and Interfaces
// ============================================

export interface ParkOrderDTO {
  orderId: string;
  parkedBy: string;
  customerId?: string;
  notes?: string;
  expiryDate?: Date;
}

export interface SearchParkedOrdersDTO {
  searchTerm?: string;
  customerId?: string;
  parkedBy?: string;
  page?: number;
  limit?: number;
}

export interface ParkedOrderListItem {
  id: string;
  parkNumber: string;
  orderId: string;
  customerId?: string | null;
  customerName?: string | null;
  parkedAt: Date;
  parkedBy: string;
  parkedByName: string;
  expiryDate?: Date | null;
  notes?: string | null;
  totalAmount: number;
  itemCount: number;
}

export interface ParkedOrderDetails extends ParkedOrderListItem {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    lineItems: Array<{
      id: string;
      variantId: string;
      productName: string;
      variantName?: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      lineDiscount: number;
    }>;
    payments: Array<{
      id: string;
      amount: number;
      paymentMethodId: string;
      paymentMethodName: string;
    }>;
  };
}

// ============================================
// Parked Order Service
// ============================================

export class ParkedOrderService {
  /**
   * Park an existing order for later completion
   */
  static async parkOrder(data: ParkOrderDTO) {
    try {
      // 1. Validate order exists and is not already parked
      const order = await prisma.saleOrder.findUnique({
        where: { id: data.orderId },
      });

      if (!order) {
        throw new Error(`Order not found: ${data.orderId}`);
      }

      if (order.status === 'Parked') {
        throw new Error('Order is already parked');
      }

      if (order.status === 'Completed') {
        throw new Error('Cannot park a completed order');
      }

      if (order.status === 'Voided') {
        throw new Error('Cannot park a voided order');
      }

      // 2. Validate user who is parking the order
      const user = await prisma.user.findUnique({
        where: { id: data.parkedBy },
      });

      if (!user) {
        throw new Error(`User not found: ${data.parkedBy}`);
      }

      // 3. Generate unique park number
      const parkNumber = await this.generateParkNumber();

      // 4. Create parked order and update order status in transaction
      const parkedOrder = await prisma.$transaction(async (tx) => {
        // Create parked order record
        const newParkedOrder = await tx.parkedOrder.create({
          data: {
            parkNumber,
            orderId: data.orderId,
            customerId: data.customerId,
            parkedBy: data.parkedBy,
            parkedAt: new Date(),
            expiryDate: data.expiryDate,
            notes: data.notes,
          },
        });

        // Update order status to Parked
        await tx.saleOrder.update({
          where: { id: data.orderId },
          data: { status: 'Parked' },
        });

        return newParkedOrder;
      });

      // 5. Return the parked order with details
      return await this.getParkedOrderById(parkedOrder.id);
    } catch (error) {
      console.error('Error parking order:', error);
      throw error;
    }
  }

  /**
   * Search parked orders with filters
   */
  static async searchParkedOrders(params: SearchParkedOrdersDTO = {}) {
    try {
      const { searchTerm, customerId, parkedBy, page = 1, limit = 50 } = params;
      const skip = (page - 1) * limit;

      const where: Prisma.ParkedOrderWhereInput = {};

      // Filter by customer
      if (customerId) {
        where.customerId = customerId;
      }

      // Filter by user who parked
      if (parkedBy) {
        where.parkedBy = parkedBy;
      }

      // Search by park number, customer name, or order number
      if (searchTerm) {
        where.OR = [
          { parkNumber: { contains: searchTerm } },
          {
            customer: {
              OR: [
                { firstName: { contains: searchTerm } },
                { lastName: { contains: searchTerm } },
                { email: { contains: searchTerm } },
                { phone: { contains: searchTerm } },
              ],
            },
          },
          {
            order: {
              orderNumber: { contains: searchTerm },
            },
          },
        ];
      }

      // Fetch parked orders with relations
      const [parkedOrders, total] = await Promise.all([
        prisma.parkedOrder.findMany({
          where,
          skip,
          take: limit,
          orderBy: { parkedAt: 'desc' },
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            parkedByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
              },
            },
            order: {
              include: {
                lineItems: {
                  select: {
                    id: true,
                    quantity: true,
                  },
                },
              },
            },
          },
        }),
        prisma.parkedOrder.count({ where }),
      ]);

      // Format the results
      const formattedOrders: ParkedOrderListItem[] = parkedOrders.map((po) => ({
        id: po.id,
        parkNumber: po.parkNumber,
        orderId: po.orderId,
        customerId: po.customerId,
        customerName: po.customer
          ? `${po.customer.firstName} ${po.customer.lastName}`.trim()
          : null,
        parkedAt: po.parkedAt,
        parkedBy: po.parkedBy,
        parkedByName: `${po.parkedByUser.firstName} ${po.parkedByUser.lastName}`.trim(),
        expiryDate: po.expiryDate,
        notes: po.notes,
        totalAmount: Number(po.order.totalAmount),
        itemCount: po.order.lineItems.reduce(
          (sum, item) => sum + item.quantity,
          0
        ),
      }));

      return {
        parkedOrders: formattedOrders,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Error searching parked orders:', error);
      throw error;
    }
  }

  /**
   * Load a parked order with full details
   */
  static async loadParkedOrder(parkedOrderId: string): Promise<ParkedOrderDetails> {
    try {
      const parkedOrder = await this.getParkedOrderById(parkedOrderId);

      if (!parkedOrder) {
        throw new Error(`Parked order not found: ${parkedOrderId}`);
      }

      return parkedOrder;
    } catch (error) {
      console.error('Error loading parked order:', error);
      throw error;
    }
  }

  /**
   * Complete a parked order (remove from parked and set order status back to Open)
   */
  static async completeParkedOrder(parkedOrderId: string) {
    try {
      // 1. Validate parked order exists
      const parkedOrder = await prisma.parkedOrder.findUnique({
        where: { id: parkedOrderId },
        include: { order: true },
      });

      if (!parkedOrder) {
        throw new Error(`Parked order not found: ${parkedOrderId}`);
      }

      // 2. Delete parked order and update order status in transaction
      await prisma.$transaction(async (tx) => {
        // Delete parked order record
        await tx.parkedOrder.delete({
          where: { id: parkedOrderId },
        });

        // Update order status back to Open
        await tx.saleOrder.update({
          where: { id: parkedOrder.orderId },
          data: { status: 'Open' },
        });
      });

      return {
        success: true,
        message: 'Parked order completed successfully',
        orderId: parkedOrder.orderId,
      };
    } catch (error) {
      console.error('Error completing parked order:', error);
      throw error;
    }
  }

  /**
   * Delete/cancel a parked order
   */
  static async deleteParkedOrder(parkedOrderId: string) {
    try {
      // 1. Validate parked order exists
      const parkedOrder = await prisma.parkedOrder.findUnique({
        where: { id: parkedOrderId },
        include: { order: true },
      });

      if (!parkedOrder) {
        throw new Error(`Parked order not found: ${parkedOrderId}`);
      }

      // 2. Delete parked order and void the sale order in transaction
      await prisma.$transaction(async (tx) => {
        // Delete parked order record
        await tx.parkedOrder.delete({
          where: { id: parkedOrderId },
        });

        // Void the sale order
        await tx.saleOrder.update({
          where: { id: parkedOrder.orderId },
          data: {
            status: 'Voided',
            completedAt: new Date(),
          },
        });
      });

      return {
        success: true,
        message: 'Parked order deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting parked order:', error);
      throw error;
    }
  }

  /**
   * Get parked order by ID with full details
   */
  private static async getParkedOrderById(
    parkedOrderId: string
  ): Promise<ParkedOrderDetails> {
    const parkedOrder = await prisma.parkedOrder.findUnique({
      where: { id: parkedOrderId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        parkedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        order: {
          include: {
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
          },
        },
      },
    });

    if (!parkedOrder) {
      throw new Error(`Parked order not found: ${parkedOrderId}`);
    }

    // Format the result
    const result: ParkedOrderDetails = {
      id: parkedOrder.id,
      parkNumber: parkedOrder.parkNumber,
      orderId: parkedOrder.orderId,
      customerId: parkedOrder.customerId,
      customerName: parkedOrder.customer
        ? `${parkedOrder.customer.firstName} ${parkedOrder.customer.lastName}`.trim()
        : null,
      parkedAt: parkedOrder.parkedAt,
      parkedBy: parkedOrder.parkedBy,
      parkedByName: `${parkedOrder.parkedByUser.firstName} ${parkedOrder.parkedByUser.lastName}`.trim(),
      expiryDate: parkedOrder.expiryDate,
      notes: parkedOrder.notes,
      totalAmount: Number(parkedOrder.order.totalAmount),
      itemCount: parkedOrder.order.lineItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      ),
      order: {
        id: parkedOrder.order.id,
        orderNumber: parkedOrder.order.orderNumber,
        status: parkedOrder.order.status,
        subtotal: Number(parkedOrder.order.subtotal),
        taxAmount: Number(parkedOrder.order.taxAmount),
        discountAmount: Number(parkedOrder.order.discountAmount),
        totalAmount: Number(parkedOrder.order.totalAmount),
        lineItems: parkedOrder.order.lineItems.map((item) => ({
          id: item.id,
          variantId: item.variantId,
          productName: item.variant.product.name,
          variantName: item.variant.variantName || undefined,
          sku: item.variant.sku,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
          lineDiscount: Number(item.lineDiscount),
        })),
        payments: parkedOrder.order.payments.map((payment) => ({
          id: payment.id,
          amount: Number(payment.amount),
          paymentMethodId: payment.paymentMethodId,
          paymentMethodName: payment.paymentMethod.name,
        })),
      },
    };

    return result;
  }

  /**
   * Generate unique park number
   */
  private static async generateParkNumber(): Promise<string> {
    const today = new Date();
    const prefix = `PARK-${today.getFullYear()}${String(
      today.getMonth() + 1
    ).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    // Get count of parked orders today
    const count = await prisma.parkedOrder.count({
      where: {
        parkNumber: {
          startsWith: prefix,
        },
      },
    });

    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Get expired parked orders (for cleanup/notification)
   */
  static async getExpiredParkedOrders() {
    try {
      const now = new Date();

      const expiredOrders = await prisma.parkedOrder.findMany({
        where: {
          expiryDate: {
            lte: now,
          },
        },
        include: {
          customer: true,
          parkedByUser: true,
          order: true,
        },
      });

      return expiredOrders;
    } catch (error) {
      console.error('Error fetching expired parked orders:', error);
      throw error;
    }
  }
}

export default ParkedOrderService;
