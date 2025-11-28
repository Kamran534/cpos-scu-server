import { Prisma, OrderStatusType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { TradeUnleashedClient } from '../integrations/tradeunleashed/api/TradeUnleashedClient.js';
import type { TradeUnleashedConfig, TradeUnleashedOrderStatusType } from '../integrations/tradeunleashed/index.js';

export interface OrderStatusTypeSyncResult {
  success: boolean;
  count: number;
  data: OrderStatusType[];
  source: 'tradeunleashed';
  syncedAt: Date;
  skipped?: boolean;
}

export class OrderStatusTypeService {
  private client: TradeUnleashedClient;

  constructor() {
    const cfg: TradeUnleashedConfig = config.tradeUnleashed;
    this.client = new TradeUnleashedClient(cfg);
  }

  async syncFromTradeUnleashed(params?: { max?: number; limit?: number }): Promise<OrderStatusTypeSyncResult> {
    const types = await this.fetchTypes(params);
    return this.persistTypes(types);
  }

  async syncIfNewIds(params?: { max?: number; limit?: number }): Promise<OrderStatusTypeSyncResult> {
    const types = await this.fetchTypes(params);
    const existing = new Set(
      (await prisma.orderStatusType.findMany({ select: { id: true } })).map((t) => t.id.toString()),
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
    return prisma.orderStatusType.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async fetchTypes(params?: { max?: number; limit?: number }): Promise<TradeUnleashedOrderStatusType[]> {
    return this.client.fetchOrderStatusTypes(params);
  }

  private async persistTypes(types: TradeUnleashedOrderStatusType[]): Promise<OrderStatusTypeSyncResult> {
    if (!types || types.length === 0) {
      return {
        success: true,
        count: 0,
        data: [],
        source: 'tradeunleashed',
        syncedAt: new Date(),
      };
    }

    const saved: OrderStatusType[] = [];
    for (const type of types) {
      const mapped = this.mapType(type);
      const record = await prisma.orderStatusType.upsert({
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

  private mapType(type: TradeUnleashedOrderStatusType): Prisma.OrderStatusTypeUncheckedCreateInput {
    if (type.id === undefined || type.id === null) {
      throw new Error('Order status type missing id');
    }

    return {
      id: BigInt(type.id),
      name: type.name,
      raw: type as Prisma.InputJsonValue,
    };
  }
}

export const orderStatusTypeService = new OrderStatusTypeService();


