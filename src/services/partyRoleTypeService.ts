import { Prisma, PartyRoleType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { TradeUnleashedClient } from '../integrations/tradeunleashed/api/TradeUnleashedClient.js';
import type { TradeUnleashedConfig, TradeUnleashedPartyRoleType } from '../integrations/tradeunleashed/index.js';

export interface PartyRoleTypeSyncResult {
  success: boolean;
  count: number;
  data: PartyRoleType[];
  source: 'tradeunleashed';
  syncedAt: Date;
  skipped?: boolean;
}

export class PartyRoleTypeService {
  private client: TradeUnleashedClient;

  constructor() {
    const cfg: TradeUnleashedConfig = config.tradeUnleashed;
    this.client = new TradeUnleashedClient(cfg);
  }

  async syncFromTradeUnleashed(params?: { max?: number; limit?: number }): Promise<PartyRoleTypeSyncResult> {
    const types = await this.fetchTypes(params);
    return this.persistTypes(types);
  }

  async syncIfNewIds(params?: { max?: number; limit?: number }): Promise<PartyRoleTypeSyncResult> {
    const types = await this.fetchTypes(params);
    const existing = new Set(
      (await prisma.partyRoleType.findMany({ select: { id: true } })).map((t) => t.id.toString()),
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
    return prisma.partyRoleType.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async fetchTypes(params?: { max?: number; limit?: number }): Promise<TradeUnleashedPartyRoleType[]> {
    return this.client.fetchPartyRoleTypes(params);
  }

  private async persistTypes(types: TradeUnleashedPartyRoleType[]): Promise<PartyRoleTypeSyncResult> {
    if (!types || types.length === 0) {
      return {
        success: true,
        count: 0,
        data: [],
        source: 'tradeunleashed',
        syncedAt: new Date(),
      };
    }

    const saved: PartyRoleType[] = [];
    for (const type of types) {
      const mapped = this.mapType(type);
      const record = await prisma.partyRoleType.upsert({
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

  private mapType(type: TradeUnleashedPartyRoleType): Prisma.PartyRoleTypeUncheckedCreateInput {
    if (type.id === undefined || type.id === null) {
      throw new Error('Party role type missing id');
    }

    return {
      id: BigInt(type.id),
      name: type.name,
      raw: type as Prisma.InputJsonValue,
    };
  }
}

export const partyRoleTypeService = new PartyRoleTypeService();


