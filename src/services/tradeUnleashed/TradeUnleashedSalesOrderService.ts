import { PrismaClient, Prisma, SaleOrder, OrderStatus, SyncStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { SalesOrderPayload } from '../../types/tradeUnleashed/salesOrder.js';
import {
  mapTradeUnleashedSalesOrderToModel,
  bulkMapTradeUnleashedSalesOrders,
  validateSalesOrderPayload,
  mapTradeUnleashedSalesOrderLineToModel
} from '../../mappers/tradeUnleashed/salesOrderMapper.js';

export interface BulkSaveResult {
  success: number;
  failed: number;
  errors: { orderNumber: string; error: string }[];
  createdOrders: SaleOrder[];
  updatedOrders: SaleOrder[];
}

export class TradeUnleashedSalesOrderService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || prisma;
  }

  /**
   * Saves or updates a single sales order from TradeUnleashed
   * Note: locationId, cashierId, and customerId need to be mapped from TradeUnleashed IDs
   */
  async saveSalesOrder(
    payload: SalesOrderPayload,
    options?: {
      locationId?: string;
      cashierId?: string;
      customerId?: string;
    }
  ): Promise<{ order: SaleOrder; created: boolean }> {
    // Validate payload
    const validation = validateSalesOrderPayload(payload);
    if (!validation.valid) {
      throw new Error(`Invalid sales order payload: ${validation.errors.join(', ')}`);
    }

    return await this.prisma.$transaction(async (tx) => {
      // Map the sales order
      const orderData = await mapTradeUnleashedSalesOrderToModel(payload);

      // Get or use default location (required field)
      let locationId = options?.locationId;
      if (!locationId) {
        // Get first active location as default
        const defaultLocation = await tx.location.findFirst({
          where: { isActive: true }
        });
        if (!defaultLocation) {
          throw new Error('No active location found. Please provide locationId in options or ensure at least one location exists.');
        }
        locationId = defaultLocation.id;
      } else {
        // Check if locationId is a UUID or a code
        // UUIDs are 36 characters with dashes, codes are typically shorter
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(locationId);
        if (!isUUID) {
          // It's a code, look up the location by code
          const locationByCode = await tx.location.findUnique({
            where: { code: locationId }
          });
          if (locationByCode) {
            locationId = locationByCode.id;
          } else {
            throw new Error(`Location not found with code: ${locationId}`);
          }
        }
      }
      orderData.location = { connect: { id: locationId } };

      // Get or use default cashier (required field)
      let cashierId = options?.cashierId;
      if (!cashierId) {
        // Get first active user as default cashier
        const defaultCashier = await tx.user.findFirst({
          where: { isActive: true }
        });
        if (!defaultCashier) {
          throw new Error('No active user found. Please provide cashierId in options or ensure at least one user exists.');
        }
        cashierId = defaultCashier.id;
      }
      orderData.cashier = { connect: { id: cashierId } };

      // Add customer if provided
      if (options?.customerId) {
        orderData.customer = { connect: { id: options.customerId } };
      }

      // Check if order already exists by externalId
      const existingOrder = await tx.saleOrder.findFirst({
        where: {
          externalId: String(payload.id),
          externalSystem: 'tradeunleashed'
        }
      });

      let order: SaleOrder;
      let created = false;

      if (existingOrder) {
        // Update existing order
        order = await tx.saleOrder.update({
          where: { id: existingOrder.id },
          data: {
            orderNumber: orderData.orderNumber,
            orderDate: orderData.orderDate,
            status: orderData.status,
            subtotal: orderData.subtotal,
            taxAmount: orderData.taxAmount,
            totalAmount: orderData.totalAmount,
            amountDue: orderData.amountDue,
            syncStatus: orderData.syncStatus || 'Synced',
            syncedAt: orderData.syncedAt || new Date(),
          }
        });
      } else {
        // Create new order
        order = await tx.saleOrder.create({
          data: orderData
        });
        created = true;
      }

      // Handle order lines
      if (payload.lines && payload.lines.length > 0) {
        // Delete existing lines for this order
        await tx.orderLineItem.deleteMany({
          where: { orderId: order.id }
        });

        // Create new lines with product mapping
        for (const linePayload of payload.lines) {
          const lineData = await mapTradeUnleashedSalesOrderLineToModel(
            linePayload,
            order.id,
            tx
          );

          await tx.orderLineItem.create({
            data: lineData
          });
        }
      }

      // Return order with line items
      const orderWithLines = await tx.saleOrder.findUnique({
        where: { id: order.id },
        include: {
          lineItems: {
            include: {
              variant: {
                include: {
                  product: true
                }
              }
            }
          }
        }
      });

      return { order: orderWithLines!, created };
    });
  }

  /**
   * Bulk saves or updates multiple sales orders from TradeUnleashed
   * Uses optimized bulk operations and product pre-fetching
   */
  async bulkSaveSalesOrders(
    payloads: SalesOrderPayload[],
    options?: {
      locationId?: string;
      cashierId?: string;
      customerIdMap?: Map<number, string>; // Map TradeUnleashed customer ID to internal customer ID
    }
  ): Promise<BulkSaveResult> {
    const result: BulkSaveResult = {
      success: 0,
      failed: 0,
      errors: [],
      createdOrders: [],
      updatedOrders: []
    };

    // Validate all payloads first
    const validationErrors: { orderNumber: string; error: string }[] = [];
    const validPayloads: SalesOrderPayload[] = [];

    for (const payload of payloads) {
      const validation = validateSalesOrderPayload(payload);
      if (!validation.valid) {
        validationErrors.push({
          orderNumber: payload.orderNumber || `Order ID ${payload.id}`,
          error: validation.errors.join(', ')
        });
        result.failed++;
      } else {
        validPayloads.push(payload);
      }
    }

    result.errors.push(...validationErrors);

    if (validPayloads.length === 0) {
      return result;
    }

    // Bulk map all valid sales orders with product mapping
    const { orders, linesByOrderNumber, errors: mappingErrors } =
      await bulkMapTradeUnleashedSalesOrders(validPayloads, this.prisma);

    result.errors.push(...mappingErrors);
    result.failed += mappingErrors.length;

    // Process each order in a transaction
    for (let i = 0; i < orders.length; i++) {
      const orderData = orders[i];
      const payload = validPayloads[i];

      try {
        await this.prisma.$transaction(async (tx) => {
          // Get or use default location (required field)
          let locationId = options?.locationId;
          if (!locationId) {
            // Get first active location as default
            const defaultLocation = await tx.location.findFirst({
              where: { isActive: true }
            });
            if (!defaultLocation) {
              throw new Error('No active location found. Please provide locationId in options or ensure at least one location exists.');
            }
            locationId = defaultLocation.id;
          } else {
            // Check if locationId is a UUID or a code
            // UUIDs are 36 characters with dashes, codes are typically shorter
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(locationId);
            if (!isUUID) {
              // It's a code, look up the location by code
              const locationByCode = await tx.location.findUnique({
                where: { code: locationId }
              });
              if (locationByCode) {
                locationId = locationByCode.id;
              } else {
                throw new Error(`Location not found with code: ${locationId}`);
              }
            }
          }
          orderData.location = { connect: { id: locationId } };

          // Get or use default cashier (required field)
          let cashierId = options?.cashierId;
          if (!cashierId) {
            // Get first active user as default cashier
            const defaultCashier = await tx.user.findFirst({
              where: { isActive: true }
            });
            if (!defaultCashier) {
              throw new Error('No active user found. Please provide cashierId in options or ensure at least one user exists.');
            }
            cashierId = defaultCashier.id;
          }
          orderData.cashier = { connect: { id: cashierId } };

          // Add customer if provided
          if (options?.customerIdMap && payload.customerId) {
            const customerId = options.customerIdMap.get(payload.customerId);
            if (customerId) {
              orderData.customer = { connect: { id: customerId } };
            }
          }

          // Check if order already exists by externalId
          const existingOrder = await tx.saleOrder.findFirst({
            where: {
              externalId: String(payload.id),
              externalSystem: 'tradeunleashed'
            }
          });

          let order: SaleOrder;

          if (existingOrder) {
            // Update existing order
            order = await tx.saleOrder.update({
              where: { id: existingOrder.id },
              data: {
                orderNumber: orderData.orderNumber,
                orderDate: orderData.orderDate,
                status: orderData.status,
                subtotal: orderData.subtotal,
                taxAmount: orderData.taxAmount,
                totalAmount: orderData.totalAmount,
                amountDue: orderData.amountDue,
                syncStatus: orderData.syncStatus || 'Synced',
                syncedAt: orderData.syncedAt || new Date(),
              }
            });
            result.updatedOrders.push(order);
          } else {
            // Create new order
            order = await tx.saleOrder.create({
              data: orderData
            });
            result.createdOrders.push(order);
          }

          // Handle order lines
          const lines = linesByOrderNumber.get(payload.orderNumber || '');

          if (lines && lines.length > 0) {
            // Delete existing lines for this order
            await tx.orderLineItem.deleteMany({
              where: { orderId: order.id }
            });

            // Create new lines (already mapped with correct variant IDs)
            for (const { line: linePayload, variantId } of lines) {
              const lineSubtotal = (linePayload.unitPrice || 0) * (linePayload.quantity || 0);
              const lineDiscount = linePayload.discount || 0;
              const lineTotal = lineSubtotal - lineDiscount + (linePayload.taxAmount || 0);

              await tx.orderLineItem.create({
                data: {
                  order: { connect: { id: order.id } },
                  variant: { connect: { id: variantId } },
                  quantity: linePayload.quantity || 0,
                  unitPrice: new Prisma.Decimal(linePayload.unitPrice || 0),
                  lineDiscount: new Prisma.Decimal(lineDiscount),
                  lineTax: new Prisma.Decimal(linePayload.taxAmount || 0),
                  lineTotal: new Prisma.Decimal(lineTotal),
                }
              });
            }
          }

          result.success++;
        });
      } catch (error) {
        result.failed++;
        result.errors.push({
          orderNumber: payload.orderNumber || `Order ID ${payload.id}`,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return result;
  }

  /**
   * Gets a sales order by TradeUnleashed order ID
   */
  async getSalesOrderByTuId(
    tuSalesOrderId: number
  ): Promise<SaleOrder | null> {
    return await this.prisma.saleOrder.findFirst({
      where: {
        externalId: String(tuSalesOrderId),
        externalSystem: 'tradeunleashed'
      },
      include: {
        lineItems: {
          include: {
            variant: {
              include: {
                product: true
              }
            }
          }
        },
        customer: true,
        location: true,
        cashier: true
      }
    });
  }

  /**
   * Gets all sales orders with optional filters
   */
  async getSalesOrders(
    options?: {
      status?: OrderStatus;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
      locationId?: string;
    }
  ): Promise<{ orders: SaleOrder[]; total: number }> {
    const where: Prisma.SaleOrderWhereInput = {
      externalSystem: 'tradeunleashed'
    };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.locationId) {
      where.locationId = options.locationId;
    }

    if (options?.fromDate || options?.toDate) {
      where.orderDate = {};
      if (options.fromDate) {
        where.orderDate.gte = options.fromDate;
      }
      if (options.toDate) {
        where.orderDate.lte = options.toDate;
      }
    }

    const [orders, total] = await Promise.all([
      this.prisma.saleOrder.findMany({
        where,
        include: {
          lineItems: {
            include: {
              variant: {
                include: {
                  product: true
                }
              }
            }
          },
          customer: true,
          location: true,
          cashier: true
        },
        take: options?.limit || 100,
        skip: options?.offset || 0,
        orderBy: { orderDate: 'desc' }
      }),
      this.prisma.saleOrder.count({ where })
    ]);

    return { orders, total };
  }

  /**
   * Gets orders that need re-sync (when syncStatus is 'Pending' or 'Failed')
   */
  async getOrdersNeedingSync(locationId?: string): Promise<SaleOrder[]> {
    const where: Prisma.SaleOrderWhereInput = {
      externalSystem: 'tradeunleashed',
      syncStatus: {
        in: ['Pending', 'Failed']
      }
    };

    if (locationId) {
      where.locationId = locationId;
    }

    return await this.prisma.saleOrder.findMany({
      where,
      include: {
        lineItems: {
          include: {
            variant: {
              include: {
                product: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Updates sync status for a sales order
   */
  async updateSyncStatus(
    orderId: string,
    status: SyncStatus,
    errorMessage?: string
  ): Promise<void> {
    await this.prisma.saleOrder.update({
      where: { id: orderId },
      data: {
        syncStatus: status,
        syncedAt: status === 'Synced' ? new Date() : undefined,
        syncError: errorMessage || null,
        syncAttempts: {
          increment: 1
        }
      }
    });
  }
}

export default new TradeUnleashedSalesOrderService();
