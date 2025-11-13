/**
 * Core Layer Index
 * 
 * Generic SCU Model/DB Layer
 * - Receives payloads from integration layer
 * - Validates and processes business logic
 * - Saves to DB via repositories
 * - NO integration-specific code
 */

export * from './types/base.types.js';
export * from './repositories/index.js';
export * from './processors/index.js';

