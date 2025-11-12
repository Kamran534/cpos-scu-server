/**
 * Product Payload
 * 
 * Common language for product data between integration layer and generic layer
 * Integration services build this payload from their API responses
 * Generic layer processes this payload and saves to DB
 */

import { BasePayload, PayloadMetadata } from './base.payload';

export interface ProductPayload extends BasePayload {
  // Basic product info
  sku: string;
  name: string;
  description?: string;
  
  // Classification
  categoryName?: string;
  categoryCode?: string;
  brandName?: string;
  supplierName?: string;
  
  // Status
  isActive: boolean;
  isFeatured?: boolean;
  
  // Metadata
  tags?: string[];
  customFields?: Record<string, any>;
  
  // Optional metadata
  metadata?: PayloadMetadata;
}

export interface ProductVariantPayload extends BasePayload {
  // Link to product
  productSku: string;
  
  // Variant info
  variantSku: string;
  variantName: string;
  
  // Pricing
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  
  // Physical properties
  weight?: number;
  weightUnit?: string;
  barcode?: string;
  
  // Inventory
  trackInventory: boolean;
  requiresShipping: boolean;
  
  // Status
  isActive: boolean;
  
  // Optional metadata
  metadata?: PayloadMetadata;
}

export interface InventoryItemPayload extends BasePayload {
  // Link to variant
  variantSku: string;
  
  // Location
  locationCode: string;
  locationName?: string;
  
  // Stock levels
  quantityOnHand: number;
  quantityReserved?: number;
  quantityAvailable: number;
  
  // Reorder info
  reorderPoint?: number;
  reorderQuantity?: number;
  
  // Last counted
  lastCountDate?: Date;
  
  // Optional metadata
  metadata?: PayloadMetadata;
}

export interface ProductBatchPayload {
  products: ProductPayload[];
  variants?: ProductVariantPayload[];
  inventory?: InventoryItemPayload[];
  metadata?: PayloadMetadata;
}

