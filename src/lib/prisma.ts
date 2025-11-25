/**
 * Shared Prisma Client Instance
 * 
 * Provides a singleton PrismaClient with connection pooling and retry logic
 * for Neon PostgreSQL databases
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { config } from '../config/index.js';

// Connection pool configuration for Neon PostgreSQL
const prismaClientOptions: Prisma.PrismaClientOptions = {
  datasources: {
    db: {
      url: config.databaseUrl,
    },
  },
  log: config.nodeEnv === 'development' ? ['error', 'warn'] : ['error'],
};

// Create and export the singleton PrismaClient instance
const prismaInstance = new PrismaClient(prismaClientOptions);

// Handle connection errors gracefully
prismaInstance.$on('error' as never, (e: unknown) => {
  console.error('[Prisma] Database error:', e);
});

// Log connection events in development
if (config.nodeEnv === 'development') {
  prismaInstance.$on('query' as never, () => {
    // Optional: log queries in development
    // console.log('[Prisma Query]', e);
  });
}

/**
 * Disconnect PrismaClient (useful for cleanup)
 */
export async function disconnectPrisma(): Promise<void> {
  await prismaInstance.$disconnect();
}

/**
 * Test database connection with retry logic
 */
export async function testDatabaseConnection(retries = 3, delay = 1000): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await prismaInstance.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      if (i < retries - 1) {
        console.warn(`[Prisma] Connection attempt ${i + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('[Prisma] All connection attempts failed:', error);
        return false;
      }
    }
  }
  
  return false;
}

// Export the singleton instance
export const prisma = prismaInstance;

/**
 * Get the shared PrismaClient instance
 * This function ensures the client is connected and ready to use
 * @returns The singleton PrismaClient instance
 */
export async function getPrismaClient(): Promise<PrismaClient> {
  // Ensure connection is established
  try {
    await prismaInstance.$connect();
  } catch (error) {
    // If connection fails, try to reconnect
    console.warn('[Prisma] Connection check failed, attempting reconnect...');
    try {
      await prismaInstance.$disconnect();
      await prismaInstance.$connect();
    } catch (reconnectError) {
      console.error('[Prisma] Reconnection failed:', reconnectError);
      throw reconnectError;
    }
  }
  return prismaInstance;
}

