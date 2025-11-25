import { Router } from 'express';
import { getPrismaClient } from '../lib/prisma.js';

export const paymentMethodRoutes = Router();

paymentMethodRoutes.get('/', async (req, res, next) => {
  try {
    const prisma = await getPrismaClient();
    const isActiveParam = req.query.isActive as string | undefined;
    const isActive =
      typeof isActiveParam === 'string'
        ? isActiveParam.toLowerCase() === 'true'
        : undefined;

    const paymentMethods = await prisma.paymentMethod.findMany({
      where: isActive === undefined ? undefined : { isActive },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return res.json({
      success: true,
      paymentMethods,
    });
  } catch (error) {
    return next(error);
  }
});

paymentMethodRoutes.get('/:id', async (req, res, next) => {
  try {
    const prisma = await getPrismaClient();
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: req.params.id },
    });

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found',
      });
    }

    return res.json({
      success: true,
      paymentMethod,
    });
  } catch (error) {
    return next(error);
  }
});

