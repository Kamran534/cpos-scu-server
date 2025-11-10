import http from 'http';
import dotenv from 'dotenv';
import { app } from './app.js';
import { initSocket } from './lib/socket.js';
import { PrismaClient } from '@prisma/client';
import { syncScheduler } from './services/syncScheduler.js';

// Load environment variables
dotenv.config();

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('\nError: DATABASE_URL is not set in environment variables.');
  console.error('   Please check your .env file and ensure DATABASE_URL is configured.\n');
  process.exit(1);
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// Create PrismaClient
const prisma = new PrismaClient();

const server = http.createServer(app);
initSocket(server);

let bannerPrinted = false;

// Handle port errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is already in use.`);
    console.error(`   Please stop the process using port ${PORT} or change the PORT environment variable.\n`);
    process.exit(1);
  } else {
    console.error('\nServer error:', error.message);
    process.exit(1);
  }
});

// Check database connection
async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('\nDatabase connection failed:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    return false;
  }
}

// Start server
server.listen(PORT, async () => {
  // Prevent duplicate banner printing
  if (bannerPrinted) return;
  bannerPrinted = true;

  // Check database connection
  const dbConnected = await checkDatabaseConnection();

  const base = `http://localhost:${PORT}`;

  const lines = [
    ' POS Server is running ',
    ` Base URL   : ${base} `,
    ` Swagger    : ${base}/api-docs `,
    ` Database   : ${dbConnected ? 'Connected' : 'Not Connected'} `,
  ];
  const width = Math.max(...lines.map(l => l.length)) + 2;
  const top = '┌' + '─'.repeat(width) + '┐';
  const bottom = '└' + '─'.repeat(width) + '┘';
  const body = lines.map(l => '│ ' + l.padEnd(width - 1, ' ') + '│').join('\n');
  console.log(`\n${top}\n${body}\n${bottom}\n`);

  if (!dbConnected) {
    console.error('⚠️  Warning: Database is not connected. Some features may not work.');
    console.error('   Please check your DATABASE_URL in .env file and ensure PostgreSQL is running.\n');
  } else {
    // Start automatic sync scheduler (runs every hour)
    syncScheduler.startAutomaticSync();
    console.log('✅ Automatic sync scheduler started (runs every hour)');
  }
});
