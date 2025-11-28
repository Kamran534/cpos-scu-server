import { Prisma, OrderRoleType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { TradeUnleashedClient } from '../integrations/tradeunleashed/api/TradeUnleashedClient.js';
import type { TradeUnleashedConfig, TradeUnleashedOrderRoleType } from '../integrations/tradeunleashed/index.js';

export interface OrderRoleTypeSyncResult {
  success: boolean;
  count: number;
  data: OrderRoleType[];
  source: 'tradeunleashed';
  syncedAt: Date;
  skipped?: boolean;
}

export class OrderRoleTypeService {
  private client: TradeUnleashedClient;

  constructor() {
    const cfg: TradeUnleashedConfig = config.tradeUnleashed;
    this.client = new TradeUnleashedClient(cfg);
  }

  async syncFromTradeUnleashed(params?: { max?: number; limit?: number }): Promise<OrderRoleTypeSyncResult> {
    const types = await this.fetchTypes(params);
    return this.persistTypes(types);
  }

  async syncIfNewIds(params?: { max?: number; limit?: number }): Promise<OrderRoleTypeSyncResult> {
    const types = await this.fetchTypes(params);
    const existing = new Set(
      (await prisma.orderRoleType.findMany({ select: { id: true } })).map((t) => t.id.toString()),
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
    return prisma.orderRoleType.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async fetchTypes(params?: { max?: number; limit?: number }): Promise<TradeUnleashedOrderRoleType[]> {
    return this.client.fetchOrderRoleTypes(params);
  }

  private async persistTypes(types: TradeUnleashedOrderRoleType[]): Promise<OrderRoleTypeSyncResult> {
    if (!types || types.length === 0) {
      return {
        success: true,
        count: 0,
        data: [],
        source: 'tradeunleashed',
        syncedAt: new Date(),
      };
    }

    const saved: OrderRoleType[] = [];
    for (const type of types) {
      const mapped = this.mapType(type);
      const record = await prisma.orderRoleType.upsert({
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

  private mapType(type: TradeUnleashedOrderRoleType): Prisma.OrderRoleTypeUncheckedCreateInput {
    if (type.id === undefined || type.id === null) {
      throw new Error('Order role type missing id');
    }

    return {
      id: BigInt(type.id),
      name: type.name,
      raw: type as Prisma.InputJsonValue,
    };
  }
}

export const orderRoleTypeService = new OrderRoleTypeService();


