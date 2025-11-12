/**
 * Sync Worker
 * 
 * Background worker that consumes sync jobs from RabbitMQ
 * Processes jobs asynchronously using IntegrationOrchestrator
 */

import type { ConsumeMessage, Channel } from 'amqplib';
import { PrismaClient } from '@prisma/client';
import { connectRabbitMQ } from '../config/rabbitmq';
import { IntegrationOrchestrator } from '../core/services/IntegrationOrchestrator';
import { TradeUnleashedIntegration } from '../integrations/tradeunleashed/TradeUnleashedIntegration';
import { SyncJobMessage, SyncJobResult, QueueNames } from '../types/queue.types';
import { IIntegrationService } from '../core/interfaces/IIntegrationService';
import { config } from '../config';

export class SyncWorker {
  private prisma: PrismaClient;
  private queueName = QueueNames.SYNC_JOBS;
  private resultQueueName = QueueNames.SYNC_RESULTS;
  private isRunning = false;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[SyncWorker] Already running');
      return;
    }

    try {
      const channel = await connectRabbitMQ();

      // Assert queues exist with same config as SyncQueueService
      await channel.assertQueue(this.queueName, {
        durable: true,
        arguments: {
          'x-message-ttl': 24 * 60 * 60 * 1000, // 24 hours TTL
        },
      });
      await channel.assertQueue(this.resultQueueName, {
        durable: true,
        arguments: {
          'x-message-ttl': 24 * 60 * 60 * 1000, // 24 hours TTL
        },
      });

      // Set prefetch to 1 (process one job at a time)
      channel.prefetch(1);

      console.log('[SyncWorker] 🚀 Started and waiting for sync jobs...');
      console.log(`[SyncWorker] Queue: ${this.queueName}`);
      this.isRunning = true;

      // Consume messages
      channel.consume(this.queueName, async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        try {
          await this.processMessage(msg, channel);
        } catch (error) {
          console.error('[SyncWorker] Error processing message:', error);
          // Reject and don't requeue (move to DLQ if configured)
          channel.nack(msg, false, false);
        }
      });
    } catch (error) {
      console.error('[SyncWorker] Failed to start:', error);
      this.isRunning = false;
    }
  }

  /**
   * Process a sync job message
   */
  private async processMessage(msg: ConsumeMessage, channel: Channel): Promise<void> {
    const startTime = Date.now();
    const content = msg.content.toString();
    
    console.log(`\n[SyncWorker] 📬 Received job: ${content.substring(0, 100)}...`);

    try {
      // Parse message
      const message = JSON.parse(content) as SyncJobMessage;
      const { type, integration, options, jobId } = message;

      console.log(`[SyncWorker] Processing ${type} for ${integration} (Job: ${jobId})`);
      console.log(`[SyncWorker] Options:`, JSON.stringify(options, null, 2));

      // Create integration service
      const integrationService = this.createIntegrationService(integration);

      // Create orchestrator
      const orchestrator = new IntegrationOrchestrator(integrationService, this.prisma);
      await orchestrator.initialize();

      // Execute sync based on type
      let result;
      switch (type) {
        case 'sync.products':
          result = await orchestrator.syncProducts(options);
          break;
        case 'sync.orders':
          result = await orchestrator.syncOrders(options);
          break;
        case 'sync.customers':
          result = await orchestrator.syncCustomers(options);
          break;
        default:
          throw new Error(`Unknown sync type: ${type}`);
      }

      const duration = Date.now() - startTime;

      console.log(`[SyncWorker] ✅ Job completed successfully`);
      console.log(`[SyncWorker]   Created: ${result.created}`);
      console.log(`[SyncWorker]   Updated: ${result.updated}`);
      console.log(`[SyncWorker]   Errors: ${result.errors.length}`);
      console.log(`[SyncWorker]   Duration: ${duration}ms`);

      // Publish result to results queue
      await this.publishResult({
        jobId,
        success: result.success,
        integration,
        resourceType: result.resourceType,
        created: result.created,
        updated: result.updated,
        errors: result.errors,
        duration,
        timestamp: new Date(),
      });

      // Acknowledge message (remove from queue)
      channel.ack(msg);

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[SyncWorker] ✗ Job failed after ${duration}ms:`, error);

      // Publish error result
      const message = JSON.parse(content) as SyncJobMessage;
      await this.publishResult({
        jobId: message.jobId,
        success: false,
        integration: message.integration,
        resourceType: message.type.replace('sync.', ''),
        created: 0,
        updated: 0,
        errors: [{
          message: error instanceof Error ? error.message : String(error),
        }],
        duration,
        timestamp: new Date(),
      });

      // Reject message (will be requeued or sent to DLQ)
      channel.nack(msg, false, false);
    }
  }

  /**
   * Create integration service based on name
   */
  private createIntegrationService(integration: string): IIntegrationService {
    switch (integration.toLowerCase()) {
      case 'tradeunleashed':
        return new TradeUnleashedIntegration(config.tradeUnleashed);
      
      // Add more integrations here
      // case 'shopify':
      //   return new ShopifyIntegration(config.shopify);
      
      default:
        throw new Error(`Unknown integration: ${integration}`);
    }
  }

  /**
   * Publish result to results queue
   */
  private async publishResult(result: SyncJobResult): Promise<void> {
    try {
      const channel = await connectRabbitMQ();
      
      channel.sendToQueue(
        this.resultQueueName,
        Buffer.from(JSON.stringify(result)),
        { persistent: true }
      );

      console.log(`[SyncWorker] Published result for job ${result.jobId}`);
    } catch (error) {
      console.error('[SyncWorker] Failed to publish result:', error);
    }
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    console.log('[SyncWorker] Stopping...');
    this.isRunning = false;
    await this.prisma.$disconnect();
    console.log('[SyncWorker] Stopped');
  }

  /**
   * Check if worker is running
   */
  isWorkerRunning(): boolean {
    return this.isRunning;
  }
}

