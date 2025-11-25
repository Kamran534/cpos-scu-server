import express from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/returns - List all return orders with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      locationId,
      customerId,
      startDate,
      endDate,
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};

    if (status) where.status = status;
    if (locationId) where.locationId = locationId;
    if (customerId) where.customerId = customerId;

    if (startDate || endDate) {
      where.returnDate = {};
      if (startDate) where.returnDate.gte = new Date(startDate as string);
      if (endDate) where.returnDate.lte = new Date(endDate as string);
    }

    const [returns, total] = await Promise.all([
      prisma.returnOrder.findMany({
        where,
        skip,
        take,
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
          originalOrder: {
            select: {
              orderNumber: true,
              totalAmount: true,
              orderDate: true,
            },
          },
          customer: {
            select: {
              id: true,
              customerCode: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          location: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          processedByUser: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          returnDate: 'desc',
        },
      }),
      prisma.returnOrder.count({ where }),
    ]);

    res.json({
      data: returns,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Error fetching returns:', error);
    res.status(500).json({ error: 'Failed to fetch returns' });
  }
});

// GET /api/returns/:id - Get a specific return order by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const returnOrder = await prisma.returnOrder.findUnique({
      where: { id },
      include: {
        lineItems: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
            originalLineItem: true,
          },
        },
        originalOrder: {
          include: {
            lineItems: true,
            payments: true,
          },
        },
        customer: true,
        location: true,
        processedByUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!returnOrder) {
      return res.status(404).json({ error: 'Return order not found' });
    }

    return res.json(returnOrder);
  } catch (error) {
    console.error('Error fetching return order:', error);
    return res.status(500).json({ error: 'Failed to fetch return order' });
  }
});

// POST /api/returns - Create a new return order
router.post('/', async (req, res) => {
  try {
    const {
      originalOrderId,
      locationId,
      customerId,
      processedBy,
      returnType,
      returnReason,
      notes,
      refundMethod,
      refundAmount,
      restockFee,
      lineItems,
    } = req.body;

    // Validate original order exists
    const originalOrder = await prisma.saleOrder.findUnique({
      where: { id: originalOrderId },
      include: { lineItems: true },
    });

    if (!originalOrder) {
      return res.status(404).json({ error: 'Original order not found' });
    }

    // Check store config for return policy
    const storeConfig = await prisma.storeConfig.findFirst();

    if (storeConfig && !storeConfig.allowReturns) {
      return res.status(403).json({ error: 'Returns are not allowed by store policy' });
    }

    if (storeConfig && !storeConfig.allowRefunds && refundAmount > 0) {
      return res.status(403).json({ error: 'Refunds are not allowed by store policy' });
    }

    // Check return window
    if (storeConfig && storeConfig.returnWindowDays) {
      const orderDate = new Date(originalOrder.orderDate);
      const daysSinceOrder = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceOrder > storeConfig.returnWindowDays) {
        return res.status(403).json({
          error: `Return window expired. Returns must be made within ${storeConfig.returnWindowDays} days`
        });
      }
    }

    // Generate return number
    const returnCount = await prisma.returnOrder.count();
    const returnNumber = `RET-${String(returnCount + 1).padStart(6, '0')}`;

    // Create return order with line items
    const returnOrder = await prisma.returnOrder.create({
      data: {
        id: uuidv4(),
        returnNumber,
        originalOrderId,
        locationId,
        customerId,
        processedBy,
        returnType,
        returnReason,
        notes,
        refundMethod,
        refundAmount,
        restockFee: restockFee || 0,
        status: 'Pending',
        lineItems: {
          create: lineItems.map((item: any) => ({
            id: uuidv4(),
            originalLineItemId: item.originalLineItemId,
            variantId: item.variantId,
            quantityReturned: item.quantityReturned,
            refundAmount: item.refundAmount,
            condition: item.condition,
            restockable: item.restockable !== false,
          })),
        },
      },
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
        originalOrder: true,
        customer: true,
        location: true,
      },
    });

    return res.status(201).json(returnOrder);
  } catch (error) {
    console.error('Error creating return order:', error);
    return res.status(500).json({ error: 'Failed to create return order' });
  }
});

// PATCH /api/returns/:id/status - Update return order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Pending', 'Completed', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const returnOrder = await prisma.returnOrder.update({
      where: { id },
      data: { status },
      include: {
        lineItems: {
          include: {
            variant: true,
          },
        },
      },
    });

    // If status is Completed, update inventory
    if (status === 'Completed') {
      for (const lineItem of returnOrder.lineItems) {
        if (lineItem.restockable) {
          await prisma.inventoryItem.updateMany({
            where: {
              variantId: lineItem.variantId,
              locationId: returnOrder.locationId,
            },
            data: {
              quantityOnHand: {
                increment: lineItem.quantityReturned,
              },
              quantityAvailable: {
                increment: lineItem.quantityReturned,
              },
            },
          });

          // Create stock adjustment record
          await prisma.stockAdjustment.create({
            data: {
              id: uuidv4(),
              locationId: returnOrder.locationId,
              adjustmentType: 'Increase',
              reason: 'SALES_RETURN',
              referenceNumber: returnOrder.returnNumber,
              adjustedBy: returnOrder.processedBy,
              notes: `Return from order ${returnOrder.returnNumber}`,
              lineItems: {
                create: {
                  id: uuidv4(),
                  variantId: lineItem.variantId,
                  quantityBefore: 0, // Should fetch actual value
                  quantityAfter: lineItem.quantityReturned,
                  quantityChange: lineItem.quantityReturned,
                },
              },
            },
          });
        }
      }
    }

    return res.json(returnOrder);
  } catch (error) {
    console.error('Error updating return order status:', error);
    return res.status(500).json({ error: 'Failed to update return order status' });
  }
});

// GET /api/returns/order/:orderId - Get returns for a specific order
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const returns = await prisma.returnOrder.findMany({
      where: { originalOrderId: orderId },
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
      },
      orderBy: {
        returnDate: 'desc',
      },
    });

    res.json(returns);
  } catch (error) {
    console.error('Error fetching order returns:', error);
    res.status(500).json({ error: 'Failed to fetch order returns' });
  }
});

export default router;
