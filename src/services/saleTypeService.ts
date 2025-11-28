import { Prisma, SaleType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { TradeUnleashedClient } from '../integrations/tradeunleashed/api/TradeUnleashedClient.js';
import type { TradeUnleashedConfig, TradeUnleashedSaleType } from '../integrations/tradeunleashed/index.js';

export interface SaleTypeSyncResult {
  success: boolean;
  count: number;
  data: SaleType[];
  source: 'tradeunleashed';
  syncedAt: Date;
  skipped?: boolean;
}

export class SaleTypeService {
  private client: TradeUnleashedClient;

  constructor() {
    const cfg: TradeUnleashedConfig = config.tradeUnleashed;
    this.client = new TradeUnleashedClient(cfg);
  }

  async syncFromTradeUnleashed(params?: { max?: number; limit?: number }): Promise<SaleTypeSyncResult> {
    const saleTypes = await this.fetchSaleTypes(params);
    return this.persistSaleTypes(saleTypes);
  }

  async syncIfNewIds(params?: { max?: number; limit?: number }): Promise<SaleTypeSyncResult> {
    const saleTypes = await this.fetchSaleTypes(params);
    const existingIds = new Set(
      (await prisma.saleType.findMany({ select: { id: true } })).map((item) => item.id.toString()),
    );

    const shouldSync =
      existingIds.size === 0 ||
      saleTypes.some((item) => (item.id !== undefined && item.id !== null ? !existingIds.has(item.id.toString()) : false));

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

    return this.persistSaleTypes(saleTypes);
  }

  async list() {
    return prisma.saleType.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async fetchSaleTypes(params?: { max?: number; limit?: number }): Promise<TradeUnleashedSaleType[]> {
    return this.client.fetchSaleTypes(params);
  }

  private async persistSaleTypes(saleTypes: TradeUnleashedSaleType[]): Promise<SaleTypeSyncResult> {
    if (!saleTypes || saleTypes.length === 0) {
      return {
        success: true,
        count: 0,
        data: [],
        source: 'tradeunleashed',
        syncedAt: new Date(),
      };
    }

    const saved: SaleType[] = [];
    for (const saleType of saleTypes) {
      const mapped = this.mapSaleType(saleType);
      const record = await prisma.saleType.upsert({
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

  private mapSaleType(saleType: TradeUnleashedSaleType): Prisma.SaleTypeUncheckedCreateInput {
    if (saleType.id === undefined || saleType.id === null) {
      throw new Error('Sale type missing id');
    }

    return {
      id: BigInt(saleType.id),
      name: saleType.name,
      code: saleType.code ?? null,
      priceListType: saleType.priceListType ?? null,
      description: saleType.description ?? null,
      isDefault: saleType.isDefault ?? null,
      raw: saleType as Prisma.InputJsonValue,
    };
  }
}

export const saleTypeService = new SaleTypeService();


