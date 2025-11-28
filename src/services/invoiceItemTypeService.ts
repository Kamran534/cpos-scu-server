import { Prisma, InvoiceItemType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { TradeUnleashedClient } from '../integrations/tradeunleashed/api/TradeUnleashedClient.js';
import type { TradeUnleashedConfig, TradeUnleashedInvoiceItemType } from '../integrations/tradeunleashed/index.js';

export interface InvoiceItemTypeSyncResult {
  success: boolean;
  count: number;
  data: InvoiceItemType[];
  source: 'tradeunleashed';
  syncedAt: Date;
  skipped?: boolean;
}

export class InvoiceItemTypeService {
  private client: TradeUnleashedClient;

  constructor() {
    const cfg: TradeUnleashedConfig = config.tradeUnleashed;
    this.client = new TradeUnleashedClient(cfg);
  }

  async syncFromTradeUnleashed(params?: { max?: number; limit?: number }): Promise<InvoiceItemTypeSyncResult> {
    const types = await this.fetchTypes(params);
    return this.persistTypes(types);
  }

  async syncIfNewIds(params?: { max?: number; limit?: number }): Promise<InvoiceItemTypeSyncResult> {
    const types = await this.fetchTypes(params);
    const existing = new Set(
      (await prisma.invoiceItemType.findMany({ select: { id: true } })).map((t) => t.id.toString()),
    );

    const shouldSync =
      existing.size === 0 ||
      types.some((type) => (type.id !== undefined && type.id !== null ? !existing.has(type.id.toString()) : false));

    if (!shouldSync) {
      return {
        success: true,
        count: 0,
        data: [],
        source: 'tradeunleashed',
        syncedAt: new Date(),
        skipped: true,
      };
    }

    return this.persistTypes(types);
  }

  async list() {
    return prisma.invoiceItemType.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async fetchTypes(params?: { max?: number; limit?: number }): Promise<TradeUnleashedInvoiceItemType[]> {
    return this.client.fetchInvoiceItemTypes(params);
  }

  private async persistTypes(types: TradeUnleashedInvoiceItemType[]): Promise<InvoiceItemTypeSyncResult> {
    if (!types || types.length === 0) {
      return {
        success: true,
        count: 0,
        data: [],
        source: 'tradeunleashed',
        syncedAt: new Date(),
      };
    }

    const saved: InvoiceItemType[] = [];
    for (const type of types) {
      const mapped = this.mapType(type);
      const record = await prisma.invoiceItemType.upsert({
        where: { id: mapped.id },
        update: mapped,
        create: mapped,
      });
      saved.push(record);
    }

    return {
      success: true,
      count: saved.length,
      data: saved,
      source: 'tradeunleashed',
      syncedAt: new Date(),
    };
  }

  private mapType(type: TradeUnleashedInvoiceItemType): Prisma.InvoiceItemTypeUncheckedCreateInput {
    if (type.id === undefined || type.id === null) {
      throw new Error('Invoice item type missing id');
    }

    return {
      id: BigInt(type.id),
      name: type.name,
      description: type.description ?? type.properties?.description ?? null,
      properties: type.properties as Prisma.InputJsonValue | undefined,
      raw: type as Prisma.InputJsonValue,
    };
  }
}

export const invoiceItemTypeService = new InvoiceItemTypeService();


