import express from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/exchanges - List all exchange orders with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      startDate,
      endDate,
      originalOrderId,
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: Prisma.ExchangeOrderWhereInput = {};

    if (status && typeof status === 'string') {
      where.status = {
        equals: status as 'Pending' | 'Completed' | 'Cancelled',
      };
    }
    if (originalOrderId && typeof originalOrderId === 'string') {
      where.originalOrderId = originalOrderId;
    }

    if (startDate || endDate) {
      where.exchangeDate = {};
      if (startDate) where.exchangeDate.gte = new Date(startDate as string);
      if (endDate) where.exchangeDate.lte = new Date(endDate as string);
    }

    const [exchanges, total] = await Promise.all([
      prisma.exchangeOrder.findMany({
        where,
        skip,
        take,
        include: {
          lineItems: {
            include: {
              returnedVariant: {
                include: {
                  product: true,
                },
              },
              exchangedVariant: {
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
          newOrder: {
            select: {
              orderNumber: true,
              totalAmount: true,
              orderDate: true,
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
          exchangeDate: 'desc',
        },
      }),
      prisma.exchangeOrder.count({ where }),
    ]);

    return res.json({
      data: exchanges,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Error fetching exchanges:', error);
    return res.status(500).json({ error: 'Failed to fetch exchanges' });
  }
});

// GET /api/exchanges/:id - Get a specific exchange order by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const exchangeOrder = await prisma.exchangeOrder.findUnique({
      where: { id },
      include: {
        lineItems: {
          include: {
            returnedVariant: {
              include: {
                product: true,
              },
            },
            exchangedVariant: {
              include: {
                product: true,
              },
            },
          },
        },
        originalOrder: {
          include: {
            lineItems: true,
            payments: true,
          },
        },
        newOrder: {
          include: {
            lineItems: true,
            payments: true,
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
    });

    if (!exchangeOrder) {
      return res.status(404).json({ error: 'Exchange order not found' });
    }

    return res.json(exchangeOrder);
  } catch (error) {
    console.error('Error fetching exchange order:', error);
    return res.status(500).json({ error: 'Failed to fetch exchange order' });
  }
});

// POST /api/exchanges - Create a new exchange order
router.post('/', async (req, res) => {
  try {
    const {
      originalOrderId,
      processedBy,
      notes,
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

    // Check store config for exchange policy
    const storeConfig = await prisma.storeConfig.findFirst();

    if (storeConfig && !storeConfig.allowExchanges) {
      return res.status(403).json({ error: 'Exchanges are not allowed by store policy' });
    }

    // Calculate price differences and totals
    let totalPriceDifference = 0;
    const exchangeLineItems = [];

    for (const item of lineItems) {
      const returnedVariant = await prisma.productVariant.findUnique({
        where: { id: item.returnedVariantId },
      });

      const exchangedVariant = await prisma.productVariant.findUnique({
        where: { id: item.exchangedVariantId },
      });

      if (!returnedVariant || !exchangedVariant) {
        return res.status(404).json({ error: 'Product variant not found' });
      }

      const returnedTotal = Number(returnedVariant.retailPrice) * item.returnedQuantity;
      const exchangedTotal = Number(exchangedVariant.retailPrice) * item.exchangedQuantity;
      const priceDifference = exchangedTotal - returnedTotal;

      totalPriceDifference += priceDifference;

      exchangeLineItems.push({
        returnedVariantId: item.returnedVariantId,
        returnedQuantity: item.returnedQuantity,
        returnedUnitPrice: returnedVariant.retailPrice,
        exchangedVariantId: item.exchangedVariantId,
        exchangedQuantity: item.exchangedQuantity,
        exchangedUnitPrice: exchangedVariant.retailPrice,
        priceDifference,
      });
    }

    // Check exchange policy based on price difference
    if (storeConfig) {
      if (totalPriceDifference === 0 && !storeConfig.allowExchangeSameAmount) {
        return res.status(403).json({ error: 'Same amount exchanges are not allowed' });
      }

      if (totalPriceDifference > 0 && !storeConfig.allowExchangeGreaterAmount) {
        return res.status(403).json({ error: 'Exchanges for greater amount are not allowed' });
      }

      if (totalPriceDifference < 0 && !storeConfig.allowExchangeLowerAmount) {
        return res.status(403).json({ error: 'Exchanges for lower amount are not allowed' });
      }
    }

    // Generate exchange number
    const exchangeCount = await prisma.exchangeOrder.count();
    const exchangeNumber = `EXC-${String(exchangeCount + 1).padStart(6, '0')}`;

    // Calculate subtotal from line items
    const subtotal = exchangeLineItems.reduce((sum, item) => {
      return sum + (Number(item.exchangedUnitPrice) * item.exchangedQuantity);
    }, 0);

    // Create new order for exchanged items
    const newOrder = await prisma.saleOrder.create({
      data: {
        orderNumber: `ORD-${String(Date.now()).padStart(10, '0')}`,
        customerId: originalOrder.customerId,
        locationId: originalOrder.locationId,
        cashierId: processedBy || originalOrder.cashierId,
        salesPersonId: originalOrder.salesPersonId,
        orderDate: new Date(),
        status: 'Completed',
        subtotal: new Prisma.Decimal(subtotal),
        taxAmount: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(totalPriceDifference > 0 ? totalPriceDifference : 0),
        amountDue: new Prisma.Decimal(totalPriceDifference > 0 ? totalPriceDifference : 0),
        lineItems: {
          create: exchangeLineItems.map(item => ({
            variantId: item.exchangedVariantId,
            quantity: item.exchangedQuantity,
            unitPrice: item.exchangedUnitPrice,
            lineTotal: new Prisma.Decimal(Number(item.exchangedUnitPrice) * item.exchangedQuantity),
            lineDiscount: new Prisma.Decimal(0),
            lineTax: new Prisma.Decimal(0),
          })),
        },
      },
    });

    // Create exchange order
    const exchangeOrder = await prisma.exchangeOrder.create({
      data: {
        exchangeNumber,
        originalOrderId,
        newOrderId: newOrder.id,
        priceDifference: totalPriceDifference,
        additionalPayment: totalPriceDifference > 0 ? totalPriceDifference : 0,
        refundAmount: totalPriceDifference < 0 ? Math.abs(totalPriceDifference) : 0,
        processedBy,
        status: 'Pending',
        notes,
        lineItems: {
          create: exchangeLineItems,
        },
      },
      include: {
        lineItems: {
          include: {
            returnedVariant: {
              include: { product: true },
            },
            exchangedVariant: {
              include: { product: true },
            },
          },
        },
        originalOrder: true,
        newOrder: true,
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

    return res.status(201).json(exchangeOrder);
  } catch (error) {
    console.error('Error creating exchange order:', error);
    return res.status(500).json({ error: 'Failed to create exchange order' });
  }
});

// PATCH /api/exchanges/:id - Update exchange order status
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const exchangeOrder = await prisma.exchangeOrder.findUnique({
      where: { id },
    });

    if (!exchangeOrder) {
      return res.status(404).json({ error: 'Exchange order not found' });
    }

    const updated = await prisma.exchangeOrder.update({
      where: { id },
      data: {
        status: status || exchangeOrder.status,
        notes: notes !== undefined ? notes : exchangeOrder.notes,
      },
      include: {
        lineItems: {
          include: {
            returnedVariant: {
              include: { product: true },
            },
            exchangedVariant: {
              include: { product: true },
            },
          },
        },
        originalOrder: true,
        newOrder: true,
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

    return res.json(updated);
  } catch (error) {
    console.error('Error updating exchange order:', error);
    return res.status(500).json({ error: 'Failed to update exchange order' });
  }
});

// GET /api/exchanges/order/:orderId - Get exchanges for a specific order
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const exchanges = await prisma.exchangeOrder.findMany({
      where: { originalOrderId: orderId },
      include: {
        lineItems: {
          include: {
            returnedVariant: {
              include: { product: true },
            },
            exchangedVariant: {
              include: { product: true },
            },
          },
        },
      },
      orderBy: {
        exchangeDate: 'desc',
      },
    });

    return res.json(exchanges);
  } catch (error) {
    console.error('Error fetching order exchanges:', error);
    return res.status(500).json({ error: 'Failed to fetch order exchanges' });
  }
});

export default router;

