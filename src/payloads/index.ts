/**
 * Payloads Index
 * 
 * Common language (DTOs) between integration layer and generic layer
 * 
 * Integration services build these payloads from API responses
 * Generic layer processes these payloads and saves to DB
 */

// Base
export * from './base.payload.js';

// Domain payloads
export * from './product.payload.js';
export * from './order.payload.js';
export * from './customer.payload.js';
export * from './auth.payload.js';

