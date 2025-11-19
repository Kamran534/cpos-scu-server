/**
 * Sync Service
 * 
 * Handles synchronization between client SQLite and server PostgreSQL
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Type for Prisma delegate with common operations
// Using a more flexible type to accommodate Prisma's complex generic types
type PrismaDelegate = {
  findUnique: (args: { where: { id: string } }) => Promise<unknown | null>;
  create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
  findMany: (args?: { where?: Record<string, unknown>; take?: number; skip?: number; orderBy?: Record<string, unknown>; include?: Record<string, unknown> }) => Promise<unknown[]>;
  count: (args?: { where?: Record<string, unknown> }) => Promise<number>;
};

export interface SyncRecord {
  id: string;
  [key: string]: unknown;
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
    // Type assertion needed because Prisma delegates have complex generic types
    const modelMap = {
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
      SalesPerson: prisma.salesPerson,
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
    } as unknown as Record<string, PrismaDelegate>;

    const model = modelMap[tableName];
    if (!model) {
      throw new Error(`Unknown table: ${tableName}`);
    }

    for (const record of records) {
      try {
        // Remove sync-specific fields
        const { is_deleted, ...rest } = record;
        // Work with a mutable copy so we can safely remove sync metadata
        const data: Record<string, unknown> = { ...rest };
        // Remove sync metadata fields that aren't needed for Prisma
        delete data.sync_status;
        delete data.last_synced_at;

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

        if (tableName === 'OrderLineItem') {
          const variantCheck = await this.ensureOrderLineItemVariantExists(
            sanitizedData,
            record.id
          );
          if (!variantCheck.success) {
            result.errors.push(variantCheck.message);
            console.warn(`[SyncService] ${variantCheck.message}`);
            continue;
          }
        }
          const updateData = this.removeImmutableFields(sanitizedData, tableName);

          await model.update({
            where: { id: record.id },
            data: updateData,
          });
          result.updated++;
        } else {
          // Create new record
          const sanitizedData = this.sanitizeData(data, tableName);
          if (tableName === 'OrderLineItem') {
            const variantCheck = await this.ensureOrderLineItemVariantExists(
              sanitizedData,
              record.id
            );
            if (!variantCheck.success) {
              result.errors.push(variantCheck.message);
              console.warn(`[SyncService] ${variantCheck.message}`);
              continue;
            }
          }
          const createData = await this.prepareCreateData(sanitizedData, tableName);
          await model.create({
            data: createData,
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
    // Type assertion needed because Prisma delegates have complex generic types
    const modelMap = {
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
      SalesPerson: prisma.salesPerson,
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
    } as unknown as Record<string, PrismaDelegate>;

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
    const where: Record<string, unknown> = {};
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
    const orderBy: Record<string, 'asc' | 'desc'> = { [timestampField]: 'asc' };

    // Build include/select for related data based on table
    const include = this.getIncludeForTable(tableName);

    // Get records
    let records: Array<Record<string, unknown>>;
    try {
      records = (await model.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy,
        ...(include && { include }),
      })) as Array<Record<string, unknown>>;
    } catch (error) {
      if (this.isMissingColumnError(error)) {
        console.warn(
          `[SyncService] Missing column detected for table ${tableName}. Falling back to raw query.`,
          error.meta
        );
        records = await this.fetchRecordsFallback(
          tableName,
          timestampField,
          limit,
          offset,
          lastSyncedAt,
          useIdForOrdering
        );
      } else {
        throw error;
      }
    }

    // Convert Prisma records to sync records
    const syncRecords: SyncRecord[] = records.map((record) => {
      // Flatten related data for sync
      const flattened = this.flattenRecord(record, tableName);
      
      const syncRecord: SyncRecord = {
        ...(flattened as SyncRecord),
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
  private getIncludeForTable(tableName: string): Record<string, unknown> | undefined {
    const includeMap: Record<string, Record<string, unknown>> = {
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

    return includeMap[tableName];
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
  private convertKeysToCamelCase<T>(obj: T): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.convertKeysToCamelCase(item)) as unknown as T;
    }

    if (typeof obj === 'object') {
      const converted: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const camelKey = this.snakeToCamel(key);
        converted[camelKey] = this.convertKeysToCamelCase(value);
      }
      return converted as unknown as T;
    }

    return obj;
  }

  private isMissingColumnError(
    error: unknown
  ): error is Prisma.PrismaClientKnownRequestError & { meta?: Record<string, unknown> } {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2022'
    );
  }

  private async fetchRecordsFallback(
    tableName: string,
    timestampField: string,
    limit: number,
    offset: number,
    lastSyncedAt?: string,
    useIdForOrdering = false
  ): Promise<Array<Record<string, unknown>>> {
    const tableIdentifier = Prisma.raw(`"${tableName}"`);
    const orderField = useIdForOrdering ? 'id' : timestampField;
    const orderIdentifier = Prisma.raw(`"${orderField}"`);

    const whereClause =
      lastSyncedAt && !useIdForOrdering
        ? Prisma.sql`WHERE ${orderIdentifier} >= ${new Date(lastSyncedAt)}`
        : Prisma.sql``;

    const query = Prisma.sql`
      SELECT * FROM ${tableIdentifier}
      ${whereClause}
      ORDER BY ${orderIdentifier} ASC
      LIMIT ${Prisma.raw(limit.toString())}
      OFFSET ${Prisma.raw(offset.toString())}
    `;

    return prisma.$queryRaw<Array<Record<string, unknown>>>(query);
  }

  /**
   * Remove immutable fields that cannot be updated
   * These are typically relation ID fields that are part of unique constraints
   */
  private removeImmutableFields(
    data: Record<string, unknown>,
    tableName: string
  ): Record<string, unknown> {
    const result: Record<string, unknown> = { ...data };

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
    Object.keys(result).forEach((key: string) => {
      const value = result[key];
      if (value === null || value === undefined) {
        delete result[key];
      }
    });

    return result;
  }

  /**
   * Sanitize data for Prisma (convert types, handle relationships)
   */
  private sanitizeData(
    data: Record<string, unknown>,
    tableName: string
  ): Record<string, unknown> {
    // First convert snake_case keys to camelCase (SQLite uses snake_case, Prisma uses camelCase)
    const camelCaseData = this.convertKeysToCamelCase(data);
    const sanitized: Record<string, unknown> = { ...camelCaseData };

    // FIRST: Convert integer boolean values (0/1) to actual booleans
    // This must happen BEFORE decimal conversion to avoid conflicts
    // SQLite stores booleans as integers (0 or 1), but Prisma expects true booleans
    for (const key in sanitized) {
      const value = sanitized[key];
      if (typeof value === 'number' && (value === 0 || value === 1)) {
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
          sanitized[key] = value === 1;
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
      const value = sanitized[key];
      if (
        decimalFields.some(field => key.toLowerCase().includes(field.toLowerCase())) &&
        value !== null &&
        value !== undefined
      ) {
        if (typeof value === 'string') {
          const num = parseFloat(value);
          sanitized[key] = Number.isNaN(num) ? null : num;
        } else if (typeof value === 'number') {
          // Already numeric (and not converted to boolean earlier), keep as-is
          sanitized[key] = value;
        } else if (value && typeof value === 'object' && 'toNumber' in value) {
          const numericValue = (value as { toNumber: () => number }).toNumber();
          sanitized[key] = numericValue;
        } else if (typeof value === 'boolean') {
          continue;
        } else {
          sanitized[key] = null;
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
            sanitized[key] = JSON.parse(sanitized[key] as string);
          } catch {
            const value = sanitized[key] as string;
            if (value.startsWith('[') && value.endsWith(']')) {
              try {
                sanitized[key] = JSON.parse(value);
              } catch {
                // If still fails, set to empty array
                sanitized[key] = [];
              }
            } else {
              // Not JSON array, keep as is (might be a single string)
              sanitized[key] = [value];
            }
          }
        }
        // ProductVariant.options and ProductVariant.dimensions are JSON fields
        else if (tableName === 'ProductVariant' && (key === 'options' || key === 'dimensions')) {
          try {
            sanitized[key] = JSON.parse(sanitized[key] as string);
          } catch {
            sanitized[key] = null;
          }
        }
        // Product.images and Product.tags are arrays
        else if (tableName === 'Product' && (key === 'images' || key === 'tags')) {
          try {
            sanitized[key] = JSON.parse(sanitized[key] as string);
          } catch {
            const value = sanitized[key];
            if (Array.isArray(value)) {
              // Already an array
            } else if (typeof value === 'string' && value.startsWith('[')) {
              try {
                sanitized[key] = JSON.parse(value);
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
            sanitized[key] = JSON.parse(sanitized[key] as string);
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
            sanitized[key] = JSON.parse(sanitized[key] as string);
          } catch {
            // Not JSON, keep as is
          }
        }
      }
    }

    // Normalize Product-specific fields and relations
    if (tableName === 'Product') {
      // Ensure tags is an array if provided, otherwise remove
      const tags = sanitized.tags;
      if (tags === null || tags === undefined) {
        delete sanitized.tags;
      } else if (!Array.isArray(tags)) {
        const normalized =
          typeof tags === 'string' && tags.length > 0 ? [tags] : [];
        if (normalized.length === 0) {
          delete sanitized.tags;
        } else {
          sanitized.tags = normalized;
        }
      }

      // Convert categoryId to category relation
      if (sanitized.categoryId !== undefined && sanitized.categoryId !== null) {
        sanitized.category = { connect: { id: sanitized.categoryId } };
        delete sanitized.categoryId;
      } else {
        // Remove null/undefined categoryId
        delete sanitized.categoryId;
      }
      // Convert brandId to brand relation
      if (sanitized.brandId !== undefined && sanitized.brandId !== null) {
        sanitized.brand = { connect: { id: sanitized.brandId } };
        delete sanitized.brandId;
      } else {
        // Remove null/undefined brandId
        delete sanitized.brandId;
      }
      // Convert supplierId to supplier relation
      if (sanitized.supplierId !== undefined && sanitized.supplierId !== null) {
        sanitized.supplier = { connect: { id: sanitized.supplierId } };
        delete sanitized.supplierId;
      } else {
        // Remove null/undefined supplierId
        delete sanitized.supplierId;
      }
      // Convert taxCategoryId to taxCategory relation
      if (sanitized.taxCategoryId !== undefined && sanitized.taxCategoryId !== null) {
        sanitized.taxCategory = { connect: { id: sanitized.taxCategoryId } };
        delete sanitized.taxCategoryId;
      } else {
        // Remove null/undefined taxCategoryId
        delete sanitized.taxCategoryId;
      }
    }

    // Normalize SaleOrder fields (server schema lacks couponCode/giftCardNumber columns)
    if (tableName === 'SaleOrder') {
      delete sanitized.couponCode;
      delete sanitized.giftCardNumber;
    }

    // Normalize OrderLineItem fields (server schema does not store custom percents)
    if (tableName === 'OrderLineItem') {
      delete sanitized.lineDiscountPercent;
      delete sanitized.customDiscountAmount;
      delete sanitized.customDiscountPercent;
    }

    // Remove undefined values
    Object.keys(sanitized).forEach(
      (key) => sanitized[key] === undefined && delete sanitized[key]
    );

    return sanitized;
  }

  private paymentMethodIdCache = new Map<string, string>();

  /**
   * Prepare data for Prisma create operations (handle relations/mappings)
   */
  private async prepareCreateData(
    data: Record<string, unknown>,
    tableName: string
  ): Promise<Record<string, unknown>> {
    const prepared: Record<string, unknown> = { ...data };

    const connectRelation = (
      field: string,
      relationName: string
    ) => {
      const value = prepared[field];
      if (typeof value === 'string' && value.length > 0) {
        prepared[relationName] = { connect: { id: value } };
        delete prepared[field];
      } else {
        delete prepared[field];
      }
    };

    if (tableName === 'OrderLineItem') {
      connectRelation('orderId', 'order');
      connectRelation('variantId', 'variant');
      connectRelation('salesPersonId', 'salesPerson');

      if (prepared.serialNumbers === null) {
        delete prepared.serialNumbers;
      } else if (Array.isArray(prepared.serialNumbers)) {
        prepared.serialNumbers = { set: prepared.serialNumbers };
      } else if (typeof prepared.serialNumbers === 'string') {
        prepared.serialNumbers = { set: prepared.serialNumbers ? [prepared.serialNumbers] : [] };
      }
    } else if (tableName === 'SaleOrder') {
      connectRelation('locationId', 'location');
      connectRelation('customerId', 'customer');
      connectRelation('cashierId', 'cashier');
      connectRelation('salesPersonId', 'salesPerson');
      connectRelation('shiftId', 'shift');
    } else if (tableName === 'OrderPayment') {
      connectRelation('orderId', 'order');
      const rawPaymentMethodId = prepared.paymentMethodId;
      if (typeof rawPaymentMethodId === 'string' && rawPaymentMethodId.length > 0) {
        const resolvedId = await this.resolvePaymentMethodId(rawPaymentMethodId);
        prepared.paymentMethod = { connect: { id: resolvedId } };
      }
      delete prepared.paymentMethodId;
    } else if (tableName === 'OrderDiscount') {
      connectRelation('orderId', 'order');
      connectRelation('discountId', 'discount');
      connectRelation('appliedBy', 'appliedByUser');
    }

    return prepared;
  }

  private async ensureOrderLineItemVariantExists(
    data: Record<string, unknown>,
    recordId: string
  ): Promise<{ success: boolean; message: string }> {
    const getString = (value: unknown): string | undefined =>
      typeof value === 'string' && value.length > 0 ? value : undefined;

    const variantId = getString(data.variantId);
    const sku = getString(data.sku) ?? getString(data.variantSku);

    if (variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        select: { id: true },
      });
      if (variant) {
        return { success: true, message: '' };
      }
    }

    if (sku) {
      const variantBySku = await prisma.productVariant.findUnique({
        where: { sku },
        select: { id: true },
      });
      if (variantBySku) {
        data.variantId = variantBySku.id;
        return { success: true, message: '' };
      }
    }

    const identifier = variantId || (sku ? `sku ${sku}` : 'unknown variant');
    return {
      success: false,
      message: `Skipping OrderLineItem ${recordId}: ProductVariant ${identifier} not found on server.`,
    };
  }

  /**
   * Resolve paymentMethodId values coming from offline DB (may be numeric codes)
   */
  private async resolvePaymentMethodId(rawId: string): Promise<string> {
    if (this.paymentMethodIdCache.has(rawId)) {
      return this.paymentMethodIdCache.get(rawId)!;
    }

    const uuidRegex = /^[0-9a-fA-F-]{36}$/;
    if (uuidRegex.test(rawId)) {
      this.paymentMethodIdCache.set(rawId, rawId);
      return rawId;
    }

    const numericCodeMap: Record<string, string> = {
      '1': 'CASH',
      '2': 'CARD',
      '3': 'BANK_TRANSFER',
      '4': 'CHECK',
      '5': 'GIFT_CARD',
      '6': 'STORE_CREDIT',
      '7': 'ON_ACCOUNT',
    };

    const code = numericCodeMap[rawId] || rawId;

    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        OR: [
          { id: rawId },
          { code },
        ],
      },
    });

    if (!paymentMethod) {
      throw new Error(`Payment method not found for identifier: ${rawId}`);
    }

    this.paymentMethodIdCache.set(rawId, paymentMethod.id);
    if (code !== rawId) {
      this.paymentMethodIdCache.set(code, paymentMethod.id);
    }

    return paymentMethod.id;
  }

  /**
   * Flatten record with related data for sync
   */
  private flattenRecord(
    record: Record<string, unknown>,
    tableName: string
  ): Record<string, unknown> {
    const flattened: Record<string, unknown> = { ...record };

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
      const value = flattened[key];
      if (
        value &&
        typeof value === 'object' &&
        value.constructor?.name === 'Decimal' &&
        'toNumber' in value &&
        typeof (value as { toNumber: unknown }).toNumber === 'function'
      ) {
        flattened[key] = (value as { toNumber: () => number }).toNumber();
      }
    }

    return flattened;
  }
}

export const syncService = new SyncService();

