import { Prisma, TradePaymentMethod } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { TradeUnleashedClient } from '../integrations/tradeunleashed/api/TradeUnleashedClient.js';
import type { TradeUnleashedConfig, TradeUnleashedPaymentMethod } from '../integrations/tradeunleashed/index.js';

export interface TradePaymentMethodSyncResult {
  success: boolean;
  count: number;
  data: TradePaymentMethod[];
  source: 'tradeunleashed';
  syncedAt: Date;
  skipped?: boolean;
}

export class TradePaymentMethodService {
  private client: TradeUnleashedClient;

  constructor() {
    const cfg: TradeUnleashedConfig = config.tradeUnleashed;
    this.client = new TradeUnleashedClient(cfg);
  }

  async syncFromTradeUnleashed(params?: { max?: number; limit?: number }): Promise<TradePaymentMethodSyncResult> {
    const methods = await this.fetchMethods(params);
    return this.persistMethods(methods);
  }

  async syncIfNewIds(params?: { max?: number; limit?: number }): Promise<TradePaymentMethodSyncResult> {
    const methods = await this.fetchMethods(params);
    const existing = new Set(
      (await prisma.tradePaymentMethod.findMany({ select: { id: true } })).map((m) => m.id.toString()),
    );

    const shouldSync =
      existing.size === 0 ||
      methods.some((method) => (method.id !== undefined && method.id !== null ? !existing.has(method.id.toString()) : false));

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

    return this.persistMethods(methods);
  }

  async list() {
    return prisma.tradePaymentMethod.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async fetchMethods(params?: { max?: number; limit?: number }): Promise<TradeUnleashedPaymentMethod[]> {
    return this.client.fetchPaymentMethods(params);
  }

  private async persistMethods(methods: TradeUnleashedPaymentMethod[]): Promise<TradePaymentMethodSyncResult> {
    if (!methods || methods.length === 0) {
      return {
        success: true,
        count: 0,
        data: [],
        source: 'tradeunleashed',
        syncedAt: new Date(),
      };
    }

    const saved: TradePaymentMethod[] = [];
    for (const method of methods) {
      const mapped = this.mapMethod(method);
      const record = await prisma.tradePaymentMethod.upsert({
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

  private mapMethod(method: TradeUnleashedPaymentMethod): Prisma.TradePaymentMethodUncheckedCreateInput {
    if (method.id === undefined || method.id === null) {
      throw new Error('Payment method missing id');
    }

    return {
      id: BigInt(method.id),
      name: method.name,
      paymentMethodType: method.paymentMethodType ?? null,
      accountRef: method.accountRef as Prisma.InputJsonValue,
      raw: method as Prisma.InputJsonValue,
    };
  }
}

export const tradePaymentMethodService = new TradePaymentMethodService();


