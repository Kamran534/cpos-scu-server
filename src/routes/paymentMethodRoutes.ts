import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const paymentMethodRoutes = Router();

paymentMethodRoutes.get('/', async (req, res, next) => {
  try {
    const isActiveParam = req.query.isActive as string | undefined;
    const isActive =
      typeof isActiveParam === 'string'
        ? isActiveParam.toLowerCase() === 'true'
        : undefined;

    const paymentMethods = await prisma.paymentMethod.findMany({
      where: isActive === undefined ? undefined : { isActive },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    res.json({
      success: true,
      paymentMethods,
    });
  } catch (error) {
    next(error);
  }
});

paymentMethodRoutes.get('/:id', async (req, res, next) => {
  try {
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: req.params.id },
    });

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found',
      });
    }

    res.json({
      success: true,
      paymentMethod,
    });
  } catch (error) {
    next(error);
  }
});

