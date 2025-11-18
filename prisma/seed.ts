import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create default role
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: {
      name: 'Admin',
      permissions: ['*'],
      description: 'Full system access',
      isActive: true,
    },
  });

  console.log('✓ Created Admin role');

  // Create cashier role
  const cashierRole = await prisma.role.upsert({
    where: { name: 'Cashier' },
    update: {},
    create: {
      name: 'Cashier',
      permissions: ['sales.create', 'sales.view', 'products.view', 'customers.view'],
      description: 'POS cashier access',
      isActive: true,
    },
  });

  console.log('✓ Created Cashier role');

  // Create default location
  const defaultLocation = await prisma.location.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: {
      code: 'MAIN',
      name: 'Main Store',
      type: 'Store',
      address: '123 Main Street',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      postalCode: '10001',
      phone: '555-0100',
      email: 'main@store.com',
      timezone: 'America/New_York',
      taxRate: 8.5,
      isActive: true,
    },
  });

  console.log('✓ Created default location:', defaultLocation.name);

  // Create default admin user
  const passwordHash = await bcrypt.hash('admin123', 10);

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@store.com',
      firstName: 'Admin',
      lastName: 'User',
      passwordHash,
      roleId: adminRole.id,
      isActive: true,
      employeeCode: 'EMP001',
    },
  });

  console.log('✓ Created admin user:', adminUser.username);

  // Create default cashier user
  const cashierPasswordHash = await bcrypt.hash('cashier123', 10);

  const cashierUser = await prisma.user.upsert({
    where: { username: 'cashier' },
    update: {},
    create: {
      username: 'cashier',
      email: 'cashier@store.com',
      firstName: 'Cashier',
      lastName: 'User',
      passwordHash: cashierPasswordHash,
      pin: '1234',
      roleId: cashierRole.id,
      isActive: true,
      employeeCode: 'EMP002',
    },
  });

  console.log('✓ Created cashier user:', cashierUser.username);

  // Assign users to location
  await prisma.userLocation.upsert({
    where: {
      userId_locationId: {
        userId: adminUser.id,
        locationId: defaultLocation.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      locationId: defaultLocation.id,
    },
  });

  await prisma.userLocation.upsert({
    where: {
      userId_locationId: {
        userId: cashierUser.id,
        locationId: defaultLocation.id,
      },
    },
    update: {},
    create: {
      userId: cashierUser.id,
      locationId: defaultLocation.id,
    },
  });

  console.log('✓ Assigned users to location');

  // Create default payment methods
  const paymentMethods = [
    { code: 'CASH', name: 'Cash', type: 'Cash', sortOrder: 1 },
    { code: 'CARD', name: 'Credit/Debit Card', type: 'Card', sortOrder: 2 },
    { code: 'GIFT_CARD', name: 'Gift Card', type: 'GiftCard', sortOrder: 3 },
    { code: 'BANK', name: 'Bank Transfer', type: 'BankTransfer', sortOrder: 4 },
  ];

  for (const pm of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { code: pm.code },
      update: {},
      create: {
        code: pm.code,
        name: pm.name,
        type: pm.type as any,
        isActive: true,
        sortOrder: pm.sortOrder,
      },
    });
  }

  console.log('✓ Created payment methods');

  // Create a sample gift card for testing
  await prisma.giftCard.upsert({
    where: { cardNumber: 'GIFT-TEST-001' },
    update: {},
    create: {
      cardNumber: 'GIFT-TEST-001',
      initialValue: 100.00,
      currentBalance: 100.00,
      isActive: true,
      notes: 'Test gift card for development',
    },
  });

  console.log('✓ Created sample gift card: GIFT-TEST-001 ($100.00)');

  console.log('\n✅ Database seed completed successfully!');
  console.log('\nDefault credentials:');
  console.log('  Admin - username: admin, password: admin123');
  console.log('  Cashier - username: cashier, password: cashier123, PIN: 1234');
  console.log('\nDefault Location ID:', defaultLocation.id);
  console.log('Admin User ID:', adminUser.id);
  console.log('Cashier User ID:', cashierUser.id);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
