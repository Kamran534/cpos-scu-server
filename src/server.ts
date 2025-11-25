import http from 'http';
import dotenv from 'dotenv';
import { app } from './app.js';
import { initSocket } from './config/socket.js';
import { syncScheduler } from './services/syncScheduler.js';
import { connectRabbitMQ } from './config/rabbitmq.js';
import { config } from './config/index.js';
import { SyncWorker } from './workers/SyncWorker.js';
import { ensureDatabaseSchema } from './utils/ensureDatabaseSchema.js';
import { prisma, testDatabaseConnection, disconnectPrisma } from './lib/prisma.js';

// Load environment variables
dotenv.config();

// Verify DATABASE_URL is loaded
if (!config.databaseUrl) {
  console.error('\nError: DATABASE_URL is not set in environment variables.');
  console.error('   Please check your .env file and ensure DATABASE_URL is configured.\n');
  process.exit(1);
}

const PORT = config.port;

// Create SyncWorker
const syncWorker = new SyncWorker();

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

// Check database connection with retry logic
async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Test connection with retry logic
    const connected = await testDatabaseConnection(3, 2000);
    if (!connected) {
      return false;
    }
    
    await ensureDatabaseSchema(prisma);
    return true;
  } catch (error) {
    console.error('\nDatabase connection failed:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    return false;
  }
}

async function checkRabbitMQConnection(): Promise<boolean> {
  try {
    await connectRabbitMQ();
    return true;
  } catch (error) {
    console.error('\nRabbitMQ connection failed:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    return false;
  }
}

async function startSyncWorker(): Promise<boolean> {
  try {
    await syncWorker.start();
    return true;
  } catch (error) {
    console.error('\nSync Worker failed to start:');
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
  const rabbitConnected = await checkRabbitMQConnection();
  
  // Start Sync Worker (if RabbitMQ is connected)
  let workerRunning = false;
  if (rabbitConnected) {
    workerRunning = await startSyncWorker();
  }

  const base = `http://localhost:${PORT}`;
  const rabbitUi = 'http://localhost:15672';
  
  // ANSI color codes
  const cyan = '\x1b[36m';
  const green = '\x1b[32m';
  const yellow = '\x1b[33m';
  const reset = '\x1b[0m';
  
  // Helper to strip ANSI codes for width calculation
  const stripAnsi = (str: string): string => {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1b\[[0-9;]*m/g, '');
  };

  const lines = [
    ' POS Server is running ',
    ` Base URL   : ${cyan}${base}${reset} `,
    ` Swagger    : ${cyan}${base}/api-docs${reset} `,
    ` Database   : ${dbConnected ? `${green}✓ Connected${reset}` : `${yellow}✗ Not Connected${reset}`} `,
    ` RabbitMQ   : ${rabbitConnected ? `${green}✓ Connected${reset}` : `${yellow}✗ Not Connected${reset}`} `,
    ` RabbitMQ UI: ${cyan}${rabbitUi}${reset} `,
    ` Sync Worker: ${workerRunning ? `${green}✓ Running${reset}` : `${yellow}✗ Not Running${reset}`} `
  ];
  // Calculate width without ANSI codes (strip color codes for width calculation)
  const width = Math.max(...lines.map(l => stripAnsi(l).length)) + 2;
  const top = '┌' + '─'.repeat(width) + '┐';
  const bottom = '└' + '─'.repeat(width) + '┘';
  const body = lines.map(l => {
    const stripped = stripAnsi(l);
    const padding = width - 1 - stripped.length;
    return '│ ' + l + ' '.repeat(padding) + '│';
  }).join('\n');
  console.log(`\n${top}\n${body}\n${bottom}\n`);

  if (!dbConnected) {
    console.error('⚠️  Warning: Database is not connected. Some features may not work.');
    console.error('   Please check your DATABASE_URL in .env file and ensure PostgreSQL is running.\n');
  } else {
    // Start automatic sync scheduler
    syncScheduler.startAutomaticSync();
  }

  if (!rabbitConnected) {
    console.error('⚠️  Warning: RabbitMQ is not connected. Messaging features will be unavailable.');
    console.error('   Please verify your RabbitMQ server and environment variables.\n');
  }

  if (!workerRunning && rabbitConnected) {
    console.error('⚠️  Warning: Sync Worker failed to start. Background sync will be unavailable.');
    console.error('   Check the logs above for error details.\n');
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  
  // Stop sync worker
  if (syncWorker.isWorkerRunning()) {
    console.log('   Stopping Sync Worker...');
    await syncWorker.stop();
  }
  
  // Close database connection
  console.log('   Closing database connection...');
  await disconnectPrisma();
  
  // Close server
  server.close(() => {
    console.log('   Server closed\n');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  
  // Stop sync worker
  if (syncWorker.isWorkerRunning()) {
    console.log('   Stopping Sync Worker...');
    await syncWorker.stop();
  }
  
  // Close database connection
  console.log('   Closing database connection...');
  await disconnectPrisma();
  
  // Close server
  server.close(() => {
    console.log('   Server closed\n');
    process.exit(0);
  });
});
