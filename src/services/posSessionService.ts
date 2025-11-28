import { Prisma, PosSession } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { TradeUnleashedClient } from '../integrations/tradeunleashed/api/TradeUnleashedClient.js';
import type {
  TradeUnleashedConfig,
  TradeUnleashedPosSession,
} from '../integrations/tradeunleashed/index.js';

interface SyncResult {
  success: boolean;
  count: number;
  data: PosSession[];
  source: 'tradeunleashed';
  syncedAt: Date;
  skipped?: boolean;
}

export class PosSessionService {
  private client: TradeUnleashedClient;

  constructor() {
    const cfg: TradeUnleashedConfig = config.tradeUnleashed;
    this.client = new TradeUnleashedClient(cfg);
  }

  async syncFromTradeUnleashed(options?: {
    userId?: string | number;
    currentSession?: boolean;
  }): Promise<SyncResult> {
    const sessions = await this.fetchSessions(options);
    return this.persistSessions(sessions);
  }

  async syncIfNewIds(options?: {
    userId?: string | number;
    currentSession?: boolean;
  }): Promise<SyncResult> {
    const sessions = await this.fetchSessions(options);
    const existingIds = new Set(
      (await prisma.posSession.findMany({ select: { id: true } })).map((s) => s.id.toString())
    );

    const shouldSync =
      existingIds.size === 0 ||
      sessions.some((session) => {
        if (session.id === undefined || session.id === null) {
          return false;
        }
        return !existingIds.has(session.id.toString());
      });

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

    return this.persistSessions(sessions);
  }

  async list() {
    return prisma.posSession.findMany({
      orderBy: {
        startTime: 'desc',
      },
      take: 100,
    });
  }

  private async fetchSessions(options?: {
    userId?: string | number;
    currentSession?: boolean;
  }): Promise<TradeUnleashedPosSession[]> {
    return this.client.fetchPosSessions(options);
  }

  private async persistSessions(sessions: TradeUnleashedPosSession[]): Promise<SyncResult> {
    if (!sessions || sessions.length === 0) {
      return {
        success: true,
        count: 0,
        data: [],
        source: 'tradeunleashed',
        syncedAt: new Date(),
      };
    }

    const saved: PosSession[] = [];
    for (const session of sessions) {
      const mapped = this.mapSession(session);
      const record = await prisma.posSession.upsert({
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

  private mapSession(session: TradeUnleashedPosSession): Prisma.PosSessionUncheckedCreateInput {
    if (session.id === undefined || session.id === null) {
      throw new Error('POS session missing id');
    }

    const toDecimal = (value?: number | string | null): Prisma.Decimal | null => {
      if (value === null || value === undefined) return null;
      return new Prisma.Decimal(value.toString());
    };

    const toBigInt = (value: unknown): bigint | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'bigint') return value;
      if (typeof value === 'number') return BigInt(Math.trunc(value));
      if (typeof value === 'string' && value.trim().length > 0) {
        return BigInt(value.trim());
      }
      try {
        return BigInt(value as bigint);
      } catch {
        return null;
      }
    };

    return {
      id: BigInt(session.id),
      sessionReference: session.sessionReference,
      startTime: session.startTime ? new Date(session.startTime) : null,
      endTime: session.endTime ? new Date(session.endTime) : null,
      startingCash: toDecimal(session.startingCash ?? null),
      actualAmount: toDecimal(session.actualAmount ?? null),
      posId: toBigInt(session.pos?.id),
      posName: session.pos?.name ?? null,
      posShowOrderCreated: session.pos?.showOrderCreatedDate ?? null,
      posAllowCreditSales: session.pos?.allowCreditSales ?? null,
      posAllowEditingSalePrices: session.pos?.allowEditingSalePrices ?? null,
      posProductWriteAccess: session.pos?.productWriteAccess ?? null,
      posStockPurchaseAccess: session.pos?.stockPurchaseAccess ?? null,
      facilityId: toBigInt(session.pos?.facility?.id),
      priceListId: toBigInt(session.pos?.priceList?.id),
      salePriceListId: toBigInt(session.pos?.salePriceList?.id),
      fbrPosId: toBigInt(session.pos?.fbrPosId),
      userId: toBigInt(session.user?.id),
      raw: session as Prisma.InputJsonValue,
    };
  }
}

export const posSessionService = new PosSessionService();


