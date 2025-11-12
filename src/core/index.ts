/**
 * Core Layer Index
 * 
 * Generic SCU Model/DB Layer
 * - Receives payloads from integration layer
 * - Validates and processes business logic
 * - Saves to DB via repositories
 * - NO integration-specific code
 */

export * from './types/base.types';
export * from './repositories';
export * from './processors';

