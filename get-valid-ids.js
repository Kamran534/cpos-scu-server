import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getValidIds() {
  try {
    // Get location
    const location = await prisma.location.findFirst({
      where: { isActive: true },
      select: { id: true, name: true, code: true }
    });

    // Get user/cashier
    const user = await prisma.user.findFirst({
      where: { isActive: true },
      select: { id: true, username: true, firstName: true, lastName: true }
    });

    // Get product variant (with TradeUnleashed mapping)
    const variant = await prisma.productVariant.findFirst({
      where: { externalSystem: 'tradeunleashed' },
      include: {
        product: {
          select: { name: true }
        }
      }
    });

    // Get all payment methods from TradePaymentMethod table
    const paymentMethods = await prisma.tradePaymentMethod.findMany({
      select: { id: true, name: true, paymentMethodType: true },
      orderBy: { id: 'asc' }
    });

    // Convert BigInt to string for JSON serialization
    const paymentMethodsSerialized = paymentMethods.map(pm => ({
      id: pm.id.toString(),
      name: pm.name,
      paymentMethodType: pm.paymentMethodType
    }));

    // Get first payment method for the example JSON
    const paymentMethod = paymentMethods[0];
    const paymentMethodSerialized = paymentMethod ? {
      id: paymentMethod.id.toString(),
      name: paymentMethod.name,
      paymentMethodType: paymentMethod.paymentMethodType
    } : null;

    console.log('\n=== Valid IDs from Database ===\n');
    console.log('Location:');
    console.log(JSON.stringify(location, null, 2));
    console.log('\nUser/Cashier:');
    console.log(JSON.stringify(user, null, 2));
    console.log('\nProduct Variant:');
    console.log(JSON.stringify(variant, null, 2));
    console.log('\nPayment Methods (TradePaymentMethod) - All Available:');
    console.log(JSON.stringify(paymentMethodsSerialized, null, 2));
    
    if (paymentMethodSerialized) {
      console.log('\nUsing first payment method for example:');
      console.log(JSON.stringify(paymentMethodSerialized, null, 2));
    }

    // Generate ready-to-use JSON
    if (location && user && variant) {
      const orderJson = {
        locationId: location.id,
        cashierId: user.id,
        lineItems: [
          {
            variantId: variant.id,
            quantity: 1,
            unitPrice: 100.00
          }
        ]
      };

      // Add payment if available
      if (paymentMethod) {
        orderJson.payments = [
          {
            paymentMethodId: paymentMethod.id.toString(),
            amount: 100.00
          }
        ];
      }

      console.log('\n=== Ready-to-Use JSON (Payments are optional) ===\n');
      console.log(JSON.stringify(orderJson, null, 2));
      
      if (!paymentMethod) {
        console.log('\n⚠️  Note: No payment method found. Payments are optional.');
        console.log('   You can create an order without payments, or add a payment method to your database.');
      }
    } else {
      console.log('\n⚠️  Missing required data:');
      if (!location) console.log('  - No active location found');
      if (!user) console.log('  - No active user found');
      if (!variant) console.log('  - No product variant with TradeUnleashed mapping found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getValidIds();

