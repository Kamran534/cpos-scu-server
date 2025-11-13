/**
 * Sync Queue Service
 * 
 * Producer service that queues sync jobs to RabbitMQ
 * Provides non-blocking sync operations
 */

import { connectRabbitMQ } from '../config/rabbitmq.js';
import { ISyncOptions } from '../core/interfaces/IIntegrationService.js';
import { SyncJobMessage, QueuedJobResponse, QueueNames } from '../types/queue.types.js';

export class SyncQueueService {
  private queueName = QueueNames.SYNC_JOBS;

  /**
   * Queue a product sync job
   */
  async queueProductSync(
    integration: string,
    options?: ISyncOptions,
    userId?: string
  ): Promise<QueuedJobResponse> {
    return this.queueJob('sync.products', integration, options, userId);
  }

  /**
   * Queue an order sync job
   */
  async queueOrderSync(
    integration: string,
    options?: ISyncOptions,
    userId?: string
  ): Promise<QueuedJobResponse> {
    return this.queueJob('sync.orders', integration, options, userId);
  }

  /**
   * Queue a customer sync job
   */
  async queueCustomerSync(
    integration: string,
    options?: ISyncOptions,
    userId?: string
  ): Promise<QueuedJobResponse> {
    return this.queueJob('sync.customers', integration, options, userId);
  }

  /**
   * Queue a sync job (generic)
   */
  private async queueJob(
    type: SyncJobMessage['type'],
    integration: string,
    options?: ISyncOptions,
    userId?: string
  ): Promise<QueuedJobResponse> {
    try {
      const jobId = `${integration}-${type}-${Date.now()}`;

      const message: SyncJobMessage = {
        type,
        integration,
        options,
        jobId,
        timestamp: new Date(),
        userId,
        priority: options?.fullSync ? 1 : 5, // Full sync has higher priority
      };

      // Connect and send to queue
      const channel = await connectRabbitMQ();
      
      // Ensure queue exists with options
      await channel.assertQueue(this.queueName, {
        durable: true, // Survives broker restarts
        arguments: {
          'x-message-ttl': 24 * 60 * 60 * 1000, // 24 hours TTL
        },
      });

      // Send message
      channel.sendToQueue(
        this.queueName,
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true, // Survives broker restarts
          priority: message.priority,
        }
      );

      console.log(`[SyncQueue] ✓ Queued ${type} job for ${integration} (ID: ${jobId})`);

      return {
        success: true,
        message: `Sync job queued successfully`,
        jobId,
        queueName: this.queueName,
        estimatedTime: this.estimateTime(options),
      };
    } catch (error) {
      console.error('[SyncQueue] ✗ Failed to queue job:', error);
      
      return {
        success: false,
        message: `Failed to queue job: ${error instanceof Error ? error.message : String(error)}`,
        jobId: '',
        queueName: this.queueName,
      };
    }
  }

  /**
   * Estimate processing time
   */
  private estimateTime(options?: ISyncOptions): string {
    if (options?.fullSync) {
      return '5-10 minutes';
    }
    return '1-2 minutes';
  }

  /**
   * Get queue stats (optional - for monitoring)
   */
  async getQueueStats(): Promise<{
    queueName: string;
    messageCount: number;
    consumerCount: number;
  }> {
    try {
      const channel = await connectRabbitMQ();
      const queueInfo = await channel.checkQueue(this.queueName);

      return {
        queueName: this.queueName,
        messageCount: queueInfo.messageCount,
        consumerCount: queueInfo.consumerCount,
      };
    } catch (error) {
      console.error('[SyncQueue] Failed to get queue stats:', error);
      return {
        queueName: this.queueName,
        messageCount: 0,
        consumerCount: 0,
      };
    }
  }
}

