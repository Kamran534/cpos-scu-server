/**
 * Base Payload Types
 * 
 * Common structures used across all payloads
 * These are DTOs (Data Transfer Objects) - pure data, no logic
 */

export interface BasePayload {
  sourceSystem: string;           // e.g., 'tradeunleashed', 'shopify'
  sourceId: string;               // ID from source system
  timestamp: Date;                // When the data was fetched
}

export interface PayloadMetadata {
  batchId?: string;               // For batch operations
  correlationId?: string;         // For tracing
  userId?: string;                // User who triggered the sync
  syncType?: 'full' | 'incremental' | 'manual';
  fromDate?: string;              // ISO date string for incremental syncs
  toDate?: string;                // ISO date string for incremental syncs
}

export interface PayloadResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  validationErrors?: Array<{
    field: string;
    message: string;
  }>;
}

