import { Prisma, PartyRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { TradeUnleashedPartyRole, TradeUnleashedConfig } from '../integrations/tradeunleashed/index.js';
import { TradeUnleashedClient } from '../integrations/tradeunleashed/api/TradeUnleashedClient.js';

export interface PartyRoleSyncResult {
  success: boolean;
  count: number;
  data: PartyRole[];
  source: 'tradeunleashed';
  syncedAt: Date;
  skipped?: boolean;
}

export class TradeUnleashedPartyRoleService {
  private client: TradeUnleashedClient;

  constructor() {
    const cfg: TradeUnleashedConfig = config.tradeUnleashed;
    this.client = new TradeUnleashedClient(cfg);
  }

  async syncFromTradeUnleashed(partyId?: string | number): Promise<PartyRoleSyncResult> {
    const roles = await this.fetchRoles(partyId);
    return this.persistRoles(roles);
  }

  async syncIfNewIds(partyId?: string | number): Promise<PartyRoleSyncResult> {
    const roles = await this.fetchRoles(partyId);
    const existing = new Set(
      (await prisma.partyRole.findMany({ select: { id: true } })).map((r) => r.id.toString())
    );

    const shouldSync =
      existing.size === 0 ||
      roles.some((role) => (role.id !== undefined && role.id !== null ? !existing.has(role.id.toString()) : false));

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

    return this.persistRoles(roles);
  }

  async list() {
    return prisma.partyRole.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  private async fetchRoles(partyId?: string | number): Promise<TradeUnleashedPartyRole[]> {
    return this.client.fetchPartyRoles(partyId);
  }

  private async persistRoles(roles: TradeUnleashedPartyRole[]): Promise<PartyRoleSyncResult> {
    if (!roles || roles.length === 0) {
      return {
        success: true,
        count: 0,
        data: [],
        source: 'tradeunleashed',
        syncedAt: new Date(),
      };
    }

    const saved: PartyRole[] = [];
    for (const role of roles) {
      const mapped = this.mapRole(role);
      const record = await prisma.partyRole.upsert({
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

  private mapRole(role: TradeUnleashedPartyRole): Prisma.PartyRoleUncheckedCreateInput {
    if (role.id === undefined || role.id === null) {
      throw new Error('Party role is missing id');
    }

    return {
      id: BigInt(role.id),
      partyId: role.partyId ? BigInt(role.partyId) : BigInt(0),
      partyName: role.party?.name ?? null,
      partyTypeId: role.party?.partyType?.id ? BigInt(role.party.partyType.id) : null,
      partyTypeName: role.party?.partyType?.name ?? null,
      partyRoleTypeId: role.partyRoleType?.id ? BigInt(role.partyRoleType.id) : null,
      partyRoleTypeName: role.partyRoleType?.name ?? null,
      raw: role as Prisma.InputJsonValue,
    };
  }
}

export const tradeUnleashedPartyRoleService = new TradeUnleashedPartyRoleService();


