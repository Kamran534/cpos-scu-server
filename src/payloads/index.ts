/**
 * Payloads Index
 * 
 * Common language (DTOs) between integration layer and generic layer
 * 
 * Integration services build these payloads from API responses
 * Generic layer processes these payloads and saves to DB
 */

// Base
export * from './base.payload';

// Domain payloads
export * from './product.payload';
export * from './order.payload';
export * from './customer.payload';
export * from './auth.payload';

