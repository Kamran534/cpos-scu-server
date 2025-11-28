import { Prisma, PartyFacilityRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { TradeUnleashedFacilityRole, TradeUnleashedConfig } from '../integrations/tradeunleashed/index.js';
import { TradeUnleashedClient } from '../integrations/tradeunleashed/api/TradeUnleashedClient.js';

export interface FacilityRoleSyncResult {
  success: boolean;
  count: number;
  data: PartyFacilityRole[];
  source: 'tradeunleashed';
  syncedAt: Date;
  skipped?: boolean;
}

export class TradeUnleashedFacilityRoleService {
  private client: TradeUnleashedClient;

  constructor() {
    const cfg: TradeUnleashedConfig = config.tradeUnleashed;
    this.client = new TradeUnleashedClient(cfg);
  }

  async syncFromTradeUnleashed(partyId?: string | number): Promise<FacilityRoleSyncResult> {
    const roles = await this.fetchRoles(partyId);
    return this.persistRoles(roles);
  }

  async syncIfNewIds(partyId?: string | number): Promise<FacilityRoleSyncResult> {
    const roles = await this.fetchRoles(partyId);
    const existing = new Set(
      (await prisma.partyFacilityRole.findMany({ select: { id: true } })).map((r) => r.id.toString()),
    );

    const shouldSync = existing.size === 0 || roles.some((role) => {
      if (role.id === undefined || role.id === null) {
        return false;
      }
      return !existing.has(role.id.toString());
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

    return this.persistRoles(roles);
  }

  async list() {
    return prisma.partyFacilityRole.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  private async fetchRoles(partyId?: string | number): Promise<TradeUnleashedFacilityRole[]> {
    return this.client.fetchFacilityRoles(partyId);
  }

  private async persistRoles(roles: TradeUnleashedFacilityRole[]): Promise<FacilityRoleSyncResult> {
    if (!roles || roles.length === 0) {
      return {
        success: true,
        count: 0,
        data: [],
        source: 'tradeunleashed',
        syncedAt: new Date(),
      };
    }

    const results: PartyFacilityRole[] = [];
    for (const role of roles) {
      const mapped = this.mapRole(role);
      const saved = await prisma.partyFacilityRole.upsert({
        where: { id: mapped.id },
        update: mapped,
        create: mapped,
      });
      results.push(saved);
    }

    return {
      success: true,
      count: results.length,
      data: results,
      source: 'tradeunleashed',
      syncedAt: new Date(),
    };
  }

  private mapRole(role: TradeUnleashedFacilityRole): Prisma.PartyFacilityRoleUncheckedCreateInput {
    if (role.id === undefined || role.id === null) {
      throw new Error('Facility role is missing id');
    }

    return {
      id: BigInt(role.id),
      partyId: role.partyId ? BigInt(role.partyId) : BigInt(0),
      facilityId: role.facilityId ? BigInt(role.facilityId) : BigInt(0),
      facilityRoleTypeId: role.facilityRoleType?.id ? BigInt(role.facilityRoleType.id) : null,
      facilityRoleTypeName: role.facilityRoleType?.name ?? null,
      facilityName: role.facility?.name ?? null,
      facility: role.facility as Prisma.InputJsonValue,
      raw: role as Prisma.InputJsonValue,
    };
  }
}

export const tradeUnleashedFacilityRoleService = new TradeUnleashedFacilityRoleService();


