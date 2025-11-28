import { Prisma, UserRles as PrismaUserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import {
  TradeUnleashedUserRole as IntegrationUserRole,
  TradeUnleashedConfig,
} from '../integrations/tradeunleashed/index.js';
import { TradeUnleashedClient } from '../integrations/tradeunleashed/api/TradeUnleashedClient.js';

export interface UserRoleSyncResult {
  success: boolean;
  count: number;
  data: PrismaUserRole[];
  source: 'tradeunleashed';
  syncedAt: Date;
  skipped?: boolean;
}

export class TradeUnleashedUserRoleService {
  private client: TradeUnleashedClient;

  constructor() {
    const cfg: TradeUnleashedConfig = config.tradeUnleashed;
    this.client = new TradeUnleashedClient(cfg);
  }

  private async fetchUserRoles(params?: { max?: number; limit?: number }) {
    return this.client.fetchUserRoles(params);
  }

  private mapToPrisma(role: IntegrationUserRole): Prisma.UserRlesUncheckedCreateInput {
    return {
      id: BigInt(role.id),
      remoteUserId: BigInt(role.user.id),
      remoteRoleId: BigInt(role.role.id),
      authority: role.role.authority,
    };
  }

  private async persistRoles(roles: IntegrationUserRole[]): Promise<UserRoleSyncResult> {
    if (!roles || roles.length === 0) {
      return {
        success: true,
        count: 0,
        data: [],
        source: 'tradeunleashed',
        syncedAt: new Date(),
      };
    }

    const upserts: PrismaUserRole[] = [];
    for (const role of roles) {
      const mapped = this.mapToPrisma(role);
      const record = await prisma.userRles.upsert({
        where: { id: mapped.id },
        update: mapped,
        create: mapped,
      });
      upserts.push(record);
    }

    return {
      success: true,
      count: upserts.length,
      data: upserts,
      source: 'tradeunleashed',
      syncedAt: new Date(),
    };
  }

  async syncFromTradeUnleashed(params?: { max?: number; limit?: number }) {
    const roles = await this.fetchUserRoles(params);
    return this.persistRoles(roles);
  }

  async syncIfNewIds(params?: { max?: number; limit?: number }) {
    const roles = await this.fetchUserRoles(params);
    const existing = new Set((await prisma.userRles.findMany({ select: { id: true } })).map((r) => r.id.toString()));

    const shouldSync =
      existing.size === 0 || roles.some((role) => !existing.has(role.id.toString()));

    if (!shouldSync) {
      return {
        success: true,
        count: 0,
        data: [],
        source: 'tradeunleashed' as const,
        syncedAt: new Date(),
        skipped: true as const,
      };
    }

    return this.persistRoles(roles);
  }

  async list() {
    return prisma.userRles.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }
}

export const tradeUnleashedUserRoleService = new TradeUnleashedUserRoleService();


