/**
 * Sync Service
 * 
 * Handles synchronization between client SQLite and server PostgreSQL
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SyncRecord {
  id: string;
  [key: string]: any;
  sync_status?: string;
  last_synced_at?: string | Date;
  is_deleted?: boolean;
  updated_at?: string | Date;
  created_at?: string | Date;
}

export interface SyncUploadRequest {
  records: SyncRecord[];
}

export interface SyncDownloadRequest {
  lastSyncedAt?: string;
  limit?: number;
  offset?: number;
}

export class SyncService {
  /**
   * Upload records from client to server
   */
  async uploadRecords(
    tableName: string,
    records: SyncRecord[]
  ): Promise<{ created: number; updated: number; errors: string[] }> {
    const result = { created: 0, updated: 0, errors: [] as string[] };

    // Map table names to Prisma models
    const modelMap: Record<string, any> = {
      CustomerGroup: prisma.customerGroup,
      Location: prisma.location,
      Category: prisma.category,
      Brand: prisma.brand,
      Supplier: prisma.supplier,
      TaxCategory: prisma.taxCategory,
      PaymentMethod: prisma.paymentMethod,
      Role: prisma.role,
      TaxRate: prisma.taxRate,
      ExpenseAccount: prisma.expenseAccount,
      CashRegister: prisma.cashRegister,
      Customer: prisma.customer,
      CustomerAddress: prisma.customerAddress,
      Product: prisma.product,
      ProductVariant: prisma.productVariant,
      InventoryItem: prisma.inventoryItem,
      User: prisma.user,
      UserLocation: prisma.userLocation,
      StockAdjustment: prisma.stockAdjustment,
      StockAdjustmentLine: prisma.stockAdjustmentLine,
      StockTransfer: prisma.stockTransfer,
      StockTransferLine: prisma.stockTransferLine,
      Barcode: prisma.barcode,
      SerialNumber: prisma.serialNumber,
      SaleOrder: prisma.saleOrder,
      OrderLineItem: prisma.orderLineItem,
      OrderPayment: prisma.orderPayment,
      OrderDiscount: prisma.orderDiscount,
      ReturnOrder: prisma.returnOrder,
      ReturnLineItem: prisma.returnLineItem,
      ExchangeOrder: prisma.exchangeOrder,
      GiftCard: prisma.giftCard,
      StoreCredit: prisma.storeCredit,
      Shift: prisma.shift,
      ShiftTransaction: prisma.shiftTransaction,
      CashMovement: prisma.cashMovement,
      Expense: prisma.expense,
      BankAccount: prisma.bankAccount,
      BankDeposit: prisma.bankDeposit,
      CashAccount: prisma.cashAccount,
      Promotion: prisma.promotion,
      ParkedOrder: prisma.parkedOrder,
      AuditLog: prisma.auditLog,
      SystemSetting: prisma.systemSetting,
    };

    const model = modelMap[tableName];
    if (!model) {
      throw new Error(`Unknown table: ${tableName}`);
    }

    for (const record of records) {
      try {
        // Remove sync-specific fields
        const { sync_status, last_synced_at, is_deleted, ...data } = record;

        // Handle soft deletes
        if (is_deleted) {
          // For tables that support soft delete, mark as deleted
          // For now, we'll skip deleted records in upload
          continue;
        }

        // Check if record exists
        const existing = await model.findUnique({
          where: { id: record.id },
        });

        if (existing) {
          // Update existing record
          // Exclude immutable relation ID fields from update
          const sanitizedData = this.sanitizeData(data, tableName);
          const updateData = this.removeImmutableFields(sanitizedData, tableName);

          await model.update({
            where: { id: record.id },
            data: updateData,
          });
          result.updated++;
        } else {
          // Create new record
          await model.create({
            data: this.sanitizeData(data, tableName),
          });
          result.created++;
        }
      } catch (error) {
        const errorMsg = `Error processing record ${record.id}: ${error instanceof Error ? error.message : String(error)}`;
        result.errors.push(errorMsg);
        console.error(`[SyncService] ${errorMsg}`, error);
      }
    }

    return result;
  }

  /**
   * Download records from server to client
   */
  async downloadRecords(
    tableName: string,
    options: SyncDownloadRequest
  ): Promise<{
    records: SyncRecord[];
    hasMore: boolean;
    totalCount: number;
  }> {
    const { lastSyncedAt, limit = 100, offset = 0 } = options;

    // Map table names to Prisma models
    const modelMap: Record<string, any> = {
      CustomerGroup: prisma.customerGroup,
      Location: prisma.location,
      Category: prisma.category,
      Brand: prisma.brand,
      Supplier: prisma.supplier,
      TaxCategory: prisma.taxCategory,
      PaymentMethod: prisma.paymentMethod,
      Role: prisma.role,
      TaxRate: prisma.taxRate,
      ExpenseAccount: prisma.expenseAccount,
      CashRegister: prisma.cashRegister,
      Customer: prisma.customer,
      CustomerAddress: prisma.customerAddress,
      Product: prisma.product,
      ProductVariant: prisma.productVariant,
      InventoryItem: prisma.inventoryItem,
      User: prisma.user,
      UserLocation: prisma.userLocation,
      StockAdjustment: prisma.stockAdjustment,
      StockAdjustmentLine: prisma.stockAdjustmentLine,
      StockTransfer: prisma.stockTransfer,
      StockTransferLine: prisma.stockTransferLine,
      Barcode: prisma.barcode,
      SerialNumber: prisma.serialNumber,
      SaleOrder: prisma.saleOrder,
      OrderLineItem: prisma.orderLineItem,
      OrderPayment: prisma.orderPayment,
      OrderDiscount: prisma.orderDiscount,
      ReturnOrder: prisma.returnOrder,
      ReturnLineItem: prisma.returnLineItem,
      ExchangeOrder: prisma.exchangeOrder,
      GiftCard: prisma.giftCard,
      StoreCredit: prisma.storeCredit,
      Shift: prisma.shift,
      ShiftTransaction: prisma.shiftTransaction,
      CashMovement: prisma.cashMovement,
      Expense: prisma.expense,
      BankAccount: prisma.bankAccount,
      BankDeposit: prisma.bankDeposit,
      CashAccount: prisma.cashAccount,
      Promotion: prisma.promotion,
      ParkedOrder: prisma.parkedOrder,
      AuditLog: prisma.auditLog,
      SystemSetting: prisma.systemSetting,
    };

    const model = modelMap[tableName];
    if (!model) {
      throw new Error(`Unknown table: ${tableName}`);
    }

    // Determine which timestamp field to use for this table
    // Some tables don't have updatedAt, so we use createdAt, timestamp, or id
    
    // Tables that use 'timestamp' field instead of 'createdAt'
    const tablesWithTimestampField = [
      'ShiftTransaction',   // Uses 'timestamp' field
      'CashMovement',       // Uses 'timestamp' field
      'AuditLog',           // Uses 'timestamp' field
    ];

    // Tables that only have createdAt (no updatedAt)
    const tablesWithoutUpdatedAt = [
      'OrderPayment',
      'OrderDiscount',
      'ExchangeOrder',
      'ParkedOrder',
      'UserLocation',        // Only has createdAt
      'StockAdjustment',     // Only has createdAt and adjustedAt
      'Barcode',             // Only has createdAt
      'OrderLineItem',       // Only has createdAt
    ];

    // Tables that have NO timestamp fields (neither createdAt, updatedAt, nor timestamp)
    // These tables will use 'id' for ordering and filtering
    const tablesWithoutTimestamps = [
      'StockAdjustmentLine', // No timestamp fields
      'StockTransferLine',   // No timestamp fields
      'ReturnLineItem',      // No timestamp fields
    ];
    
    let timestampField: string;
    let useIdForOrdering = false;

    if (tablesWithoutTimestamps.includes(tableName)) {
      // Use 'id' for tables without any timestamp fields
      timestampField = 'id';
      useIdForOrdering = true;
    } else if (tablesWithTimestampField.includes(tableName)) {
      // Use 'timestamp' field for these tables
      timestampField = 'timestamp';
    } else {
      // Use 'updatedAt' or 'createdAt' based on what the table has
      const hasUpdatedAt = !tablesWithoutUpdatedAt.includes(tableName);
      timestampField = hasUpdatedAt ? 'updatedAt' : 'createdAt';
    }

    // Build where clause
    const where: any = {};
    if (lastSyncedAt && !useIdForOrdering) {
      // Only filter by timestamp if the table has timestamp fields
      where[timestampField] = {
        gte: new Date(lastSyncedAt),
      };
    }
    // For tables without timestamps, we can't filter by lastSyncedAt
    // So we'll return all records (or implement a different strategy)

    // Get total count
    const totalCount = await model.count({ where });

    // Build orderBy - use the appropriate field
    const orderBy: any = { [timestampField]: 'asc' };

    // Build include/select for related data based on table
    const include = this.getIncludeForTable(tableName);

    // Get records
    const records = await model.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy,
      ...(include && { include }),
    });

    // Convert Prisma records to sync records
    const syncRecords: SyncRecord[] = records.map((record: any) => {
      // Flatten related data for sync
      const flattened = this.flattenRecord(record, tableName);
      
      const syncRecord: SyncRecord = {
        ...flattened,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        is_deleted: false,
      };
      return syncRecord;
    });

    return {
      records: syncRecords,
      hasMore: offset + limit < totalCount,
      totalCount,
    };
  }

  /**
   * Get include/select configuration for related data
   */
  private getIncludeForTable(tableName: string): any {
    const includeMap: Record<string, any> = {
      Category: {
        parentCategory: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      Product: {
        category: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      ProductVariant: {
        product: {
          select: {
            id: true,
            productCode: true,
            name: true,
            categoryId: true,
          },
        },
      },
      InventoryItem: {
        variant: {
          select: {
            id: true,
            sku: true,
            variantName: true,
            productId: true,
          },
        },
        location: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    };

    return includeMap[tableName] || undefined;
  }

  /**
   * Convert snake_case to camelCase
   */
  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Convert all keys from snake_case to camelCase
   */
  private convertKeysToCamelCase(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.convertKeysToCamelCase(item));
    }

    if (typeof obj === 'object') {
      const converted: any = {};
      for (const key in obj) {
        const camelKey = this.snakeToCamel(key);
        converted[camelKey] = this.convertKeysToCamelCase(obj[key]);
      }
      return converted;
    }

    return obj;
  }

  /**
   * Remove immutable fields that cannot be updated
   * These are typically relation ID fields that are part of unique constraints
   */
  private removeImmutableFields(data: any, tableName: string): any {
    const result = { ...data };

    // Define fields that should be excluded from updates for specific tables
    const immutableFieldsByTable: Record<string, string[]> = {
      InventoryItem: ['variantId', 'locationId'], // Part of unique constraint
      UserLocation: ['userId', 'locationId'], // Part of unique constraint
      StockAdjustmentLine: ['adjustmentId'], // Foreign key
      StockTransferLine: ['transferId'], // Foreign key
      OrderLineItem: ['orderId'], // Foreign key
      OrderPayment: ['orderId'], // Foreign key
      OrderDiscount: ['orderId'], // Foreign key
      ReturnLineItem: ['returnId'], // Foreign key
      ShiftTransaction: ['shiftId'], // Foreign key
      // Add more tables as needed
    };

    const fieldsToRemove = immutableFieldsByTable[tableName] || [];

    // Also always remove id, createdAt from updates
    fieldsToRemove.push('id', 'createdAt');

    for (const field of fieldsToRemove) {
      delete result[field];
    }

    // Remove null values from update data to avoid conflicts with non-nullable fields
    // Prisma will keep existing values for fields not included in the update
    Object.keys(result).forEach(key => {
      if (result[key] === null || result[key] === undefined) {
        delete result[key];
      }
    });

    return result;
  }

  /**
   * Sanitize data for Prisma (convert types, handle relationships)
   */
  private sanitizeData(data: any, tableName: string): any {
    // First convert snake_case keys to camelCase (SQLite uses snake_case, Prisma uses camelCase)
    const camelCaseData = this.convertKeysToCamelCase(data);
    const sanitized: any = { ...camelCaseData };

    // FIRST: Convert integer boolean values (0/1) to actual booleans
    // This must happen BEFORE decimal conversion to avoid conflicts
    // SQLite stores booleans as integers (0 or 1), but Prisma expects true booleans
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'number' && (sanitized[key] === 0 || sanitized[key] === 1)) {
        // Check if this field is a boolean field by naming convention
        const keyLower = key.toLowerCase();
        const booleanFieldPrefixes = ['is', 'has', 'track', 'allow', 'enable', 'require', 'show'];
        const booleanFieldSuffixes = ['taxable', 'active', 'deleted', 'enabled', 'required', 'available', 'visible'];

        const isBooleanField = booleanFieldPrefixes.some(prefix =>
          keyLower.startsWith(prefix)
        ) || booleanFieldSuffixes.some(suffix =>
          keyLower.endsWith(suffix)
        );

        if (isBooleanField) {
          sanitized[key] = sanitized[key] === 1;
        }
      }
    }

    // Define fields that are Decimal types (price, cost, weight, etc.)
    const decimalFields = [
      'price', 'retailPrice', 'wholesalePrice', 'cost', 'compareAtPrice',
      'weight', 'amount', 'total', 'subtotal', 'tax', 'discount',
      'balance', 'quantity', 'rate', 'percentage', 'value',
      'openingBalance', 'closingBalance', 'depositAmount', 'withdrawalAmount'
    ];

    // Handle Decimal fields (convert strings to numbers)
    for (const key in sanitized) {
      if (decimalFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        if (sanitized[key] !== null && sanitized[key] !== undefined) {
          if (typeof sanitized[key] === 'string') {
            const num = parseFloat(sanitized[key]);
            sanitized[key] = isNaN(num) ? null : num;
          } else if (typeof sanitized[key] === 'number' && sanitized[key] !== 0 && sanitized[key] !== 1) {
            // Already a number (but not a boolean), keep as is
          } else if (typeof sanitized[key] === 'boolean') {
            // Skip booleans that were already converted
            continue;
          } else {
            // Invalid type for decimal, set to null
            sanitized[key] = null;
          }
        }
      }
    }

    // Convert date strings to Date objects (but skip fields that are Decimal or Boolean)
    for (const key in sanitized) {
      // Skip if boolean
      if (typeof sanitized[key] === 'boolean') {
        continue;
      }

      // Skip if already handled as decimal field
      if (decimalFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        continue;
      }

      if (
        sanitized[key] &&
        typeof sanitized[key] === 'string' &&
        (key.includes('Date') ||
          key.includes('At') ||
          key === 'createdAt' ||
          key === 'updatedAt')
      ) {
        try {
          sanitized[key] = new Date(sanitized[key]);
        } catch {
          // Invalid date, keep as is
        }
      }

      // Handle JSON fields - parse JSON strings to objects/arrays
      if (typeof sanitized[key] === 'string') {
        // Role.permissions is stored as JSON string in SQLite but needs to be array in Prisma
        if (tableName === 'Role' && key === 'permissions') {
          try {
            sanitized[key] = JSON.parse(sanitized[key]);
          } catch {
            // If parsing fails, try to treat as array if it looks like one
            if (sanitized[key].startsWith('[') && sanitized[key].endsWith(']')) {
              try {
                sanitized[key] = JSON.parse(sanitized[key]);
              } catch {
                // If still fails, set to empty array
                sanitized[key] = [];
              }
            } else {
              // Not JSON array, keep as is (might be a single string)
              sanitized[key] = [sanitized[key]];
            }
          }
        }
        // ProductVariant.options and ProductVariant.dimensions are JSON fields
        else if (tableName === 'ProductVariant' && (key === 'options' || key === 'dimensions')) {
          try {
            sanitized[key] = JSON.parse(sanitized[key]);
          } catch {
            // If parsing fails, set to null
            sanitized[key] = null;
          }
        }
        // Product.images and Product.tags are arrays
        else if (tableName === 'Product' && (key === 'images' || key === 'tags')) {
          try {
            sanitized[key] = JSON.parse(sanitized[key]);
          } catch {
            // If parsing fails, try to treat as array
            if (Array.isArray(sanitized[key])) {
              // Already an array, keep as is
            } else if (typeof sanitized[key] === 'string' && sanitized[key].startsWith('[')) {
              try {
                sanitized[key] = JSON.parse(sanitized[key]);
              } catch {
                sanitized[key] = [];
              }
            } else {
              sanitized[key] = [];
            }
          }
        }
        // Category.tags, Promotion.categoryIds, etc. are arrays
        else if (key === 'tags' || key === 'categoryIds' || key === 'productIds' || key === 'customerGroupIds' || key === 'taxRates' || key === 'applicableLocations' || key === 'shiftIds') {
          try {
            sanitized[key] = JSON.parse(sanitized[key]);
          } catch {
            if (Array.isArray(sanitized[key])) {
              // Already an array
            } else {
              sanitized[key] = [];
            }
          }
        }
        // Other JSON fields (Settings, etc.)
        else if (key.includes('Settings') || key.includes('settings') || key.includes('Hours') || key.includes('openingHours') || key.includes('taxSettings')) {
          try {
            sanitized[key] = JSON.parse(sanitized[key]);
          } catch {
            // Not JSON, keep as is
          }
        }
      }
    }

    // Remove undefined values
    Object.keys(sanitized).forEach(
      (key) => sanitized[key] === undefined && delete sanitized[key]
    );

    return sanitized;
  }

  /**
   * Flatten record with related data for sync
   */
  private flattenRecord(record: any, tableName: string): any {
    const flattened: any = { ...record };

    // Handle Category with parentCategory
    if (tableName === 'Category' && record.parentCategory) {
      flattened.parentCategoryId = record.parentCategoryId;
      // Remove nested object, keep only ID
      delete flattened.parentCategory;
    }

    // Handle Product with category, brand, supplier
    if (tableName === 'Product') {
      if (record.category) {
        flattened.categoryId = record.categoryId;
        delete flattened.category;
      }
      if (record.brand) {
        flattened.brandId = record.brandId;
        delete flattened.brand;
      }
      if (record.supplier) {
        flattened.supplierId = record.supplierId;
        delete flattened.supplier;
      }
    }

    // Handle ProductVariant with product
    if (tableName === 'ProductVariant' && record.product) {
      flattened.productId = record.productId;
      delete flattened.product;
    }

    // Handle InventoryItem with variant and location
    if (tableName === 'InventoryItem') {
      if (record.variant) {
        flattened.variantId = record.variantId;
        delete flattened.variant;
      }
      if (record.location) {
        flattened.locationId = record.locationId;
        delete flattened.location;
      }
    }

    // Convert Date objects to ISO strings for JSON serialization
    for (const key in flattened) {
      if (flattened[key] instanceof Date) {
        flattened[key] = flattened[key].toISOString();
      }
      // Handle Decimal types from Prisma
      if (flattened[key] && typeof flattened[key] === 'object' && flattened[key].constructor?.name === 'Decimal') {
        flattened[key] = flattened[key].toNumber();
      }
    }

    return flattened;
  }
}

export const syncService = new SyncService();

