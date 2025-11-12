/**
 * RabbitMQ Queue Types
 * 
 * Message types for queue-based operations
 */

import { ISyncOptions } from '../core/interfaces/IIntegrationService';

export interface SyncJobMessage {
  type: 'sync.products' | 'sync.orders' | 'sync.customers';
  integration: string;
  options?: ISyncOptions;
  jobId: string;
  timestamp: Date;
  userId?: string;
  priority?: number;
}

export interface SyncJobResult {
  jobId: string;
  success: boolean;
  integration: string;
  resourceType: string;
  created: number;
  updated: number;
  errors: Array<{ message: string }>;
  duration: number;
  timestamp: Date;
}

export interface QueuedJobResponse {
  success: boolean;
  message: string;
  jobId: string;
  queueName: string;
  estimatedTime?: string;
}

export enum QueueNames {
  SYNC_JOBS = 'sync-jobs',
  SYNC_RESULTS = 'sync-results',
  NOTIFICATIONS = 'notifications',
}

