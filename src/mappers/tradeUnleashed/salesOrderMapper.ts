import { PrismaClient, Prisma } from '@prisma/client';
import { SalesOrderPayload, SalesOrderLinePayload } from '../../types/tradeUnleashed/salesOrder.js';

// Type for Prisma client (including transaction clients)
type PrismaClientLike = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/**
 * Maps TradeUnleashed sales order payload to Prisma SaleOrder create data
 */
/**
 * Map TradeUnleashed status to OrderStatus enum
 */
function mapTradeUnleashedStatus(tuStatus?: string): 'Open' | 'Completed' | 'Voided' | 'Parked' | 'OnHold' {
  if (!tuStatus) return 'Open';
  
  const statusLower = tuStatus.toLowerCase();
  
  // Map common TradeUnleashed statuses to OrderStatus
  if (statusLower === 'confirmed' || statusLower === 'completed' || statusLower === 'fulfilled') {
    return 'Completed';
  }
  if (statusLower === 'voided' || statusLower === 'cancelled' || statusLower === 'canceled') {
    return 'Voided';
  }
  if (statusLower === 'parked' || statusLower === 'saved') {
    return 'Parked';
  }
  if (statusLower === 'onhold' || statusLower === 'on_hold' || statusLower === 'hold') {
    return 'OnHold';
  }
  
  // Default to Open for pending, new, etc.
  return 'Open';
}

export async function mapTradeUnleashedSalesOrderToModel(
  payload: SalesOrderPayload
): Promise<Prisma.SaleOrderCreateInput> {
  // Note: externalId, externalSystem, syncStatus, syncedAt exist in schema
  // but Prisma client types may be out of sync. Regenerate with: npm run prisma:generate
  return {
    orderNumber: payload.orderNumber,
    orderDate: payload.orderDate ? new Date(payload.orderDate) : new Date(),
    status: mapTradeUnleashedStatus(payload.status),
    subtotal: new Prisma.Decimal(payload.totalAmount || 0),
    taxAmount: new Prisma.Decimal(0), // Will be calculated if needed
    totalAmount: new Prisma.Decimal(payload.totalAmount || 0),
    amountDue: new Prisma.Decimal(payload.totalAmount || 0),
    // TradeUnleashed integration fields
    externalId: String(payload.id),
    externalSystem: 'tradeunleashed',
    syncStatus: 'Synced',
    syncedAt: new Date(),
    // Note: locationId, cashierId, customerId need to be provided separately
    // as they require mapping from TradeUnleashed IDs
  } as unknown as Prisma.SaleOrderCreateInput;
}

/**
 * Maps TradeUnleashed sales order line with product mapping to Prisma OrderLineItem
 * Product array structure from TradeUnleashed:
 * [id, name, sku, barCode, productId, onhand, committed, incoming, continueSelling, imageUrl]
 * Example: [182783, "Pillow 1 Blue", "PLW-001B", null, 182780, 0.0, 0.0, 0.0, null, null]
 */
export async function mapTradeUnleashedSalesOrderLineToModel(
  line: SalesOrderLinePayload,
  orderId: string,
  prisma: PrismaClientLike
): Promise<Prisma.OrderLineItemCreateInput> {
  // Extract TradeUnleashed product/variant ID from the line
  const tuProductId = line.productId;

  // Find the corresponding ProductVariant by externalId (TradeUnleashed item ID)
  // Note: externalId exists in schema but Prisma client types may be out of sync
  const variant = await prisma.productVariant.findFirst({
    where: {
      externalId: String(tuProductId),
      externalSystem: 'tradeunleashed'
    } as Prisma.ProductVariantWhereInput,
    include: {
      product: true
    }
  });

  if (!variant) {
    throw new Error(
      `ProductVariant with TradeUnleashed ID ${tuProductId} not found. ` +
      `Please ensure products are synced from TradeUnleashed before creating sales orders.`
    );
  }

  const lineSubtotal = (line.unitPrice || 0) * (line.quantity || 0);
  const lineDiscount = line.discount || 0;
  const lineTotal = lineSubtotal - lineDiscount + (line.taxAmount || 0);

  return {
    order: {
      connect: { id: orderId }
    },
    variant: {
      connect: { id: variant.id }
    },
    quantity: line.quantity || 0,
    unitPrice: new Prisma.Decimal(line.unitPrice || 0),
    lineDiscount: new Prisma.Decimal(lineDiscount),
    lineTax: new Prisma.Decimal(line.taxAmount || 0),
    lineTotal: new Prisma.Decimal(lineTotal),
  };
}

/**
 * Bulk maps multiple sales orders with their lines
 * Handles product mapping from TradeUnleashed to HQ system
 */
export async function bulkMapTradeUnleashedSalesOrders(
  payloads: SalesOrderPayload[],
  prisma: PrismaClientLike
): Promise<{
  orders: Prisma.SaleOrderCreateInput[];
  linesByOrderNumber: Map<string, { line: SalesOrderLinePayload; variantId: string }[]>;
  errors: { orderNumber: string; error: string }[];
}> {
  const orders: Prisma.SaleOrderCreateInput[] = [];
  const linesByOrderNumber = new Map<string, { line: SalesOrderLinePayload; variantId: string }[]>();
  const errors: { orderNumber: string; error: string }[] = [];

  // Get all unique TradeUnleashed product IDs from all order lines
  const allTuProductIds = new Set<number>();
  payloads.forEach(payload => {
    payload.lines?.forEach(line => {
      if (line.productId) {
        allTuProductIds.add(line.productId);
      }
    });
  });

  // Pre-fetch all required variants in one query for efficiency
  // Note: externalId exists in schema but Prisma client types may be out of sync
  const variantMap = new Map<number, { id: string; sku: string }>();
  if (allTuProductIds.size > 0) {
    const variants = await prisma.productVariant.findMany({
      where: {
        externalId: {
          in: Array.from(allTuProductIds).map(String)
        },
        externalSystem: 'tradeunleashed'
      } as Prisma.ProductVariantWhereInput,
      select: {
        id: true,
        sku: true,
        externalId: true
      } as Prisma.ProductVariantSelect
    });

    variants.forEach((variant: { id: string; sku: string; externalId?: string | null }) => {
      if (variant.externalId) {
        variantMap.set(Number(variant.externalId), { id: variant.id, sku: variant.sku });
      }
    });
  }

  // Process each sales order
  for (const payload of payloads) {
    try {
      // Map the order header
      const orderData = await mapTradeUnleashedSalesOrderToModel(payload);
      orders.push(orderData);

      // Map the order lines with product mapping
      const lines: { line: SalesOrderLinePayload; variantId: string }[] = [];

      if (payload.lines && payload.lines.length > 0) {
        for (const linePayload of payload.lines) {
          const tuProductId = linePayload.productId;

          if (!tuProductId) {
            throw new Error(`Order line ${linePayload.id} missing productId`);
          }

          // Get the variant from the pre-fetched map
          const variant = variantMap.get(tuProductId);

          if (!variant) {
            throw new Error(
              `ProductVariant with TradeUnleashed ID ${tuProductId} not found. ` +
              `Please sync products from TradeUnleashed before creating sales orders.`
            );
          }

          lines.push({
            line: linePayload,
            variantId: variant.id
          });
        }
      }

      if (payload.orderNumber) {
        linesByOrderNumber.set(payload.orderNumber, lines);
      }

    } catch (error) {
      errors.push({
        orderNumber: payload.orderNumber || `Order ID ${payload.id}`,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return { orders, linesByOrderNumber, errors };
}

/**
 * Validates that a sales order payload has all required fields
 */
export function validateSalesOrderPayload(payload: SalesOrderPayload): {
  valid: boolean;
  errors: string[]
} {
  const errors: string[] = [];

  if (!payload.id) {
    errors.push('Sales order ID is required');
  }

  if (!payload.orderNumber) {
    errors.push('Order number is required');
  }

  // Customer ID is optional - orders can be created without a customer

  if (!payload.lines || payload.lines.length === 0) {
    errors.push('Sales order must have at least one line item');
  }

  // Validate each line
  payload.lines?.forEach((line, index) => {
    if (!line.id) {
      errors.push(`Line ${index + 1}: Line ID is required`);
    }
    if (!line.productId) {
      errors.push(`Line ${index + 1}: Product ID is required`);
    }
    if (line.quantity === undefined || line.quantity === null) {
      errors.push(`Line ${index + 1}: Quantity is required`);
    }
    if (line.quantity && line.quantity <= 0) {
      errors.push(`Line ${index + 1}: Quantity must be greater than 0`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}
