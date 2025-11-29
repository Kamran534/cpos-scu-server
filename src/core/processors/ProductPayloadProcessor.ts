/**
 * Product Payload Processor
 * 
 * Receives ProductPayload from integration layer
 * Validates, processes business logic, saves to DB
 * NO integration-specific code here
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { 
  ProductPayload, 
  ProductVariantPayload,
  InventoryItemPayload,
  ProductBatchPayload 
} from '../../payloads/index.js';
import { ProcessResult, ValidationError } from '../types/base.types.js';
import {
  ProductRepository,
  CategoryRepository,
  BrandRepository,
  LocationRepository,
  InventoryItemRepository,
} from '../repositories/index.js';

interface ProductError {
  sku: string;
  error: string | undefined;
  validationErrors?: ValidationError[];
}

interface VariantError {
  sku: string;
  error: string | undefined;
  validationErrors?: ValidationError[];
}

interface InventoryError {
  sku: string;
  location?: string;
  error: string | undefined;
  validationErrors?: ValidationError[];
}

export class ProductPayloadProcessor {
  private prisma: PrismaClient;
  private productRepo: ProductRepository;
  private categoryRepo: CategoryRepository;
  private brandRepo: BrandRepository;
  private locationRepo: LocationRepository;
  private inventoryRepo: InventoryItemRepository;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.productRepo = new ProductRepository(prisma);
    this.categoryRepo = new CategoryRepository(prisma);
    this.brandRepo = new BrandRepository(prisma);
    this.locationRepo = new LocationRepository(prisma);
    this.inventoryRepo = new InventoryItemRepository(prisma);
  }

  /**
   * Process single product payload
   */
  async processProduct(payload: ProductPayload): Promise<ProcessResult> {
    // Validate
    const validationErrors = this.validateProductPayload(payload);
    if (validationErrors.length > 0) {
      return {
        success: false,
        validationErrors,
      };
    }

    try {
      // Resolve references (category, brand)
      let categoryId: string | undefined;
      if (payload.categoryName) {
        const category = await this.categoryRepo.findOrCreateByName(payload.categoryName);
        categoryId = category.id;
      }

      let brandId: string | undefined;
      if (payload.brandName) {
        const brand = await this.brandRepo.findOrCreateByName(payload.brandName);
        brandId = brand.id;
      }

      // Check if product exists
      const existingProduct = await this.productRepo.findBySku(payload.sku);

      // Extract externalId from customFields for direct field storage
      const externalId = payload.customFields?.externalId as string | undefined;
      const externalSystem = payload.customFields?.externalSystem as string | undefined;

      // Build product data
      // Note: Product uses 'productCode', not 'sku'. SKU is on ProductVariant.
      const productData = {
        productCode: payload.sku,  // Map SKU to productCode
        name: payload.name,
        description: payload.description,
        categoryId,
        brandId,
        isActive: payload.isActive,
        tags: payload.tags || [],
        externalId, // TradeUnleashed productId - CRITICAL for sales order mapping
        externalSystem, // 'tradeunleashed'
        metadata: payload.customFields || {}, // Store integration-specific data (e.g., TradeUnleashed productId)
      };

      // Debug: Log metadata for first few products
      // if (Math.random() < 0.01) { // Log ~1% of products to avoid spam
      //   console.log(`[ProductPayloadProcessor] Product metadata sample - SKU: ${payload.sku}, metadata:`, JSON.stringify(productData.metadata));
      // }

      let product;
      if (existingProduct) {
        // Update existing
        product = await this.productRepo.update(existingProduct.id, productData);
      } else {
        // Create new
        product = await this.productRepo.create(productData);
      }

      return {
        success: true,
        data: product,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process product variant payload
   */
  async processVariant(payload: ProductVariantPayload): Promise<ProcessResult> {
    // Validate
    const validationErrors = this.validateVariantPayload(payload);
    if (validationErrors.length > 0) {
      return {
        success: false,
        validationErrors,
      };
    }

    try {
      // Find parent product
      const product = await this.productRepo.findBySku(payload.productSku);
      if (!product) {
        return {
          success: false,
          error: `Product with SKU ${payload.productSku} not found`,
        };
      }

      // Check if variant exists
      const existingVariant = await this.prisma.productVariant.findUnique({
        where: { sku: payload.variantSku },
      });

      // Extract externalId from customFields for direct field storage
      const variantExternalId = payload.customFields?.externalId as string | undefined;
      const variantExternalSystem = payload.customFields?.externalSystem as string | undefined;

      // Build variant data
      const variantData = {
        productId: product.id,
        sku: payload.variantSku,
        variantName: payload.variantName,
        retailPrice: payload.price,
        compareAtPrice: payload.compareAtPrice,
        cost: payload.costPrice,
        weight: payload.weight,
        barcode: payload.barcode,
        isActive: payload.isActive,
        externalId: variantExternalId, // TradeUnleashed item ID (730467712) - CRITICAL for sales order mapping!
        externalSystem: variantExternalSystem, // 'tradeunleashed'
        metadata: (payload.customFields || {}) as Prisma.InputJsonValue, // Store integration-specific data (e.g., TradeUnleashed item ID)
      };

      let variant;
      if (existingVariant) {
        // Update existing
        variant = await this.prisma.productVariant.update({
          where: { id: existingVariant.id },
          data: variantData,
        });
      } else {
        // Create new
        variant = await this.prisma.productVariant.create({
          data: variantData,
        });
      }

      return {
        success: true,
        data: variant,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process inventory item payload
   */
  async processInventory(payload: InventoryItemPayload): Promise<ProcessResult> {
    // Validate
    const validationErrors = this.validateInventoryPayload(payload);
    if (validationErrors.length > 0) {
      return {
        success: false,
        validationErrors,
      };
    }

    try {
      // Find variant
      const variant = await this.prisma.productVariant.findUnique({
        where: { sku: payload.variantSku },
      });
      if (!variant) {
        return {
          success: false,
          error: `Variant with SKU ${payload.variantSku} not found`,
        };
      }

      // Find or create location
      const location = await this.locationRepo.findOrCreateByCode(
        payload.locationCode,
        payload.locationName
      );

      // Upsert inventory
      const inventoryData = {
        quantityOnHand: payload.quantityOnHand,
        quantityCommitted: payload.quantityReserved || 0, // Schema uses 'quantityCommitted' not 'quantityReserved'
        quantityAvailable: payload.quantityAvailable,
        reorderPoint: payload.reorderPoint,
        reorderQuantity: payload.reorderQuantity,
        lastCountedAt: payload.lastCountDate, // Schema uses 'lastCountedAt' not 'lastCountDate'
      };

      const inventory = await this.inventoryRepo.upsertInventory(
        variant.id,
        location.id,
        inventoryData
      );

      return {
        success: true,
        data: inventory,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process batch of products
   */
  async processBatch(batch: ProductBatchPayload): Promise<ProcessResult> {
    const results = {
      products: { success: 0, failed: 0, errors: [] as ProductError[] },
      variants: { success: 0, failed: 0, errors: [] as VariantError[] },
      inventory: { success: 0, failed: 0, errors: [] as InventoryError[] },
    };

    // console.log(`[ProductPayloadProcessor] Processing batch: ${batch.products.length} products, ${batch.variants?.length || 0} variants, ${batch.inventory?.length || 0} inventory items`);

    // Process products
    for (const productPayload of batch.products) {
      const result = await this.processProduct(productPayload);
      if (result.success) {
        results.products.success++;
      } else {
        results.products.failed++;
        results.products.errors.push({
          sku: productPayload.sku,
          error: result.error,
          validationErrors: result.validationErrors,
        });
        console.error(`[ProductPayloadProcessor] Product failed - SKU: ${productPayload.sku}, Error: ${result.error}`);
      }
    }

    // console.log(`[ProductPayloadProcessor] Products: ${results.products.success} succeeded, ${results.products.failed} failed`);


    // Process variants
    if (batch.variants) {
      for (const variantPayload of batch.variants) {
        const result = await this.processVariant(variantPayload);
        if (result.success) {
          results.variants.success++;
        } else {
          results.variants.failed++;
          results.variants.errors.push({
            sku: variantPayload.variantSku,
            error: result.error,
            validationErrors: result.validationErrors,
          });
          console.error(`[ProductPayloadProcessor] Variant failed - SKU: ${variantPayload.variantSku}, Error: ${result.error}`);
        }
      }
      // console.log(`[ProductPayloadProcessor] Variants: ${results.variants.success} succeeded, ${results.variants.failed} failed`);
    }

    // Process inventory
    if (batch.inventory) {
      for (const inventoryPayload of batch.inventory) {
        const result = await this.processInventory(inventoryPayload);
        if (result.success) {
          results.inventory.success++;
        } else {
          results.inventory.failed++;
          results.inventory.errors.push({
            sku: inventoryPayload.variantSku,
            location: inventoryPayload.locationCode,
            error: result.error,
            validationErrors: result.validationErrors,
          });
        }
      }
    }

    return {
      success: 
        results.products.failed === 0 && 
        results.variants.failed === 0 && 
        results.inventory.failed === 0,
      data: results,
    };
  }

  /**
   * Validate product payload
   */
  private validateProductPayload(payload: ProductPayload): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!payload.sku || payload.sku.trim() === '') {
      errors.push({ field: 'sku', message: 'SKU is required' });
    }

    if (!payload.name || payload.name.trim() === '') {
      errors.push({ field: 'name', message: 'Name is required' });
    }

    if (!payload.sourceSystem) {
      errors.push({ field: 'sourceSystem', message: 'Source system is required' });
    }

    if (!payload.sourceId) {
      errors.push({ field: 'sourceId', message: 'Source ID is required' });
    }

    return errors;
  }

  /**
   * Validate variant payload
   */
  private validateVariantPayload(payload: ProductVariantPayload): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!payload.productSku) {
      errors.push({ field: 'productSku', message: 'Product SKU is required' });
    }

    if (!payload.variantSku) {
      errors.push({ field: 'variantSku', message: 'Variant SKU is required' });
    }

    if (!payload.variantName) {
      errors.push({ field: 'variantName', message: 'Variant name is required' });
    }

    if (payload.price < 0) {
      errors.push({ field: 'price', message: 'Price cannot be negative' });
    }

    return errors;
  }

  /**
   * Validate inventory payload
   */
  private validateInventoryPayload(payload: InventoryItemPayload): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!payload.variantSku) {
      errors.push({ field: 'variantSku', message: 'Variant SKU is required' });
    }

    if (!payload.locationCode) {
      errors.push({ field: 'locationCode', message: 'Location code is required' });
    }

    if (payload.quantityOnHand < 0) {
      errors.push({ field: 'quantityOnHand', message: 'Quantity on hand cannot be negative' });
    }

    if (payload.quantityAvailable < 0) {
      errors.push({ field: 'quantityAvailable', message: 'Quantity available cannot be negative' });
    }

    return errors;
  }
}

