import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/store-config - Get store configuration
router.get('/', async (req, res) => {
  try {
    const storeConfig = await prisma.storeConfig.findFirst();

    if (!storeConfig) {
      return res.status(404).json({ error: 'Store configuration not found' });
    }

    res.json(storeConfig);
  } catch (error) {
    console.error('Error fetching store config:', error);
    res.status(500).json({ error: 'Failed to fetch store configuration' });
  }
});

// GET /api/store-config/:id - Get store configuration by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const storeConfig = await prisma.storeConfig.findUnique({
      where: { id },
    });

    if (!storeConfig) {
      return res.status(404).json({ error: 'Store configuration not found' });
    }

    res.json(storeConfig);
  } catch (error) {
    console.error('Error fetching store config:', error);
    res.status(500).json({ error: 'Failed to fetch store configuration' });
  }
});

// POST /api/store-config - Create store configuration
router.post('/', async (req, res) => {
  try {
    const {
      organizationName,
      organizationCode,
      defaultCurrency,
      returnPolicy,
      allowReturns,
      allowRefunds,
      allowExchanges,
      returnWindowDays,
      requireOriginalReceipt,
      allowExchangeSameAmount,
      allowExchangeGreaterAmount,
      allowExchangeLowerAmount,
      restockFeePercentage,
      taxId,
      registrationNumber,
      contactEmail,
      contactPhone,
      address,
      logo,
      website,
    } = req.body;

    // Check if config already exists
    const existing = await prisma.storeConfig.findFirst();
    if (existing) {
      return res.status(400).json({ error: 'Store configuration already exists. Use PUT to update.' });
    }

    const storeConfig = await prisma.storeConfig.create({
      data: {
        organizationName,
        organizationCode,
        defaultCurrency: defaultCurrency || 'USD',
        returnPolicy: returnPolicy || 'RefundAndExchange',
        allowReturns: allowReturns !== undefined ? allowReturns : true,
        allowRefunds: allowRefunds !== undefined ? allowRefunds : true,
        allowExchanges: allowExchanges !== undefined ? allowExchanges : true,
        returnWindowDays: returnWindowDays || 30,
        requireOriginalReceipt: requireOriginalReceipt !== undefined ? requireOriginalReceipt : true,
        allowExchangeSameAmount: allowExchangeSameAmount !== undefined ? allowExchangeSameAmount : true,
        allowExchangeGreaterAmount: allowExchangeGreaterAmount !== undefined ? allowExchangeGreaterAmount : true,
        allowExchangeLowerAmount: allowExchangeLowerAmount !== undefined ? allowExchangeLowerAmount : false,
        restockFeePercentage: restockFeePercentage || 0,
        taxId,
        registrationNumber,
        contactEmail,
        contactPhone,
        address,
        logo,
        website,
      },
    });

    res.status(201).json(storeConfig);
  } catch (error) {
    console.error('Error creating store config:', error);
    res.status(500).json({ error: 'Failed to create store configuration' });
  }
});

// PUT /api/store-config/:id - Update store configuration
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      organizationName,
      organizationCode,
      defaultCurrency,
      returnPolicy,
      allowReturns,
      allowRefunds,
      allowExchanges,
      returnWindowDays,
      requireOriginalReceipt,
      allowExchangeSameAmount,
      allowExchangeGreaterAmount,
      allowExchangeLowerAmount,
      restockFeePercentage,
      taxId,
      registrationNumber,
      contactEmail,
      contactPhone,
      address,
      logo,
      website,
    } = req.body;

    const storeConfig = await prisma.storeConfig.findUnique({
      where: { id },
    });

    if (!storeConfig) {
      return res.status(404).json({ error: 'Store configuration not found' });
    }

    const updated = await prisma.storeConfig.update({
      where: { id },
      data: {
        organizationName,
        organizationCode,
        defaultCurrency,
        returnPolicy,
        allowReturns,
        allowRefunds,
        allowExchanges,
        returnWindowDays,
        requireOriginalReceipt,
        allowExchangeSameAmount,
        allowExchangeGreaterAmount,
        allowExchangeLowerAmount,
        restockFeePercentage,
        taxId,
        registrationNumber,
        contactEmail,
        contactPhone,
        address,
        logo,
        website,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating store config:', error);
    res.status(500).json({ error: 'Failed to update store configuration' });
  }
});

// PATCH /api/store-config/:id - Partially update store configuration
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const storeConfig = await prisma.storeConfig.findUnique({
      where: { id },
    });

    if (!storeConfig) {
      return res.status(404).json({ error: 'Store configuration not found' });
    }

    const updated = await prisma.storeConfig.update({
      where: { id },
      data: updateData,
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating store config:', error);
    res.status(500).json({ error: 'Failed to update store configuration' });
  }
});

export default router;

