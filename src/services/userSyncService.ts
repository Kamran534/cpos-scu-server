import bcrypt from 'bcrypt';

import {
  createRole,
  findRoleById,
  findRoleByName,
  type UpsertUserResult,
  upsertUser,
} from '../repositories/userRepository.js';

export interface UserSyncPayload {
  id?: string;
  username: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  password?: string | null;
  passwordHash?: string | null;
  pin?: string | null;
  roleId?: string | null;
  roleName?: string | null;
  isActive?: boolean | null;
  phone?: string | null;
  employeeCode?: string | null;
  hireDate?: string | Date | null;
  terminationDate?: string | Date | null;
}

function ensureDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function resolveRoleId(roleId?: string | null, roleName?: string | null): Promise<string> {
  if (roleId) {
    const existingRole = await findRoleById(roleId);
    if (existingRole?.isActive) {
      return existingRole.id;
    }
  }

  if (roleName) {
    const existingRole = await findRoleByName(roleName);
    if (existingRole) {
      if (!existingRole.isActive) {
        throw new Error(`Role "${roleName}" is inactive`);
      }
      return existingRole.id;
    }

    const createdRole = await createRole({
      name: roleName,
      description: `${roleName} (auto-created)`,
      permissions: [],
      isActive: true,
    });
    return createdRole.id;
  }

  const defaultRoleName = 'employee';
  const defaultRole =
    (await findRoleByName(defaultRoleName)) ??
    (await createRole({
      name: defaultRoleName,
      description: 'Default employee role (auto-created)',
      permissions: ['view_products', 'create_orders', 'view_customers'],
      isActive: true,
    }));
  return defaultRole.id;
}

async function resolvePasswordHash(payload: UserSyncPayload): Promise<string> {
  if (payload.passwordHash) {
    return payload.passwordHash;
  }

  if (payload.password) {
    return bcrypt.hash(payload.password, 10);
  }

  throw new Error('UserSyncPayload must include either passwordHash or password');
}

async function resolvePinHash(pin?: string | null): Promise<string | null> {
  if (!pin) return null;
  return bcrypt.hash(pin, 10);
}

export class UserSyncService {
  async syncUser(payload: UserSyncPayload): Promise<UpsertUserResult> {
    if (!payload.username) {
      throw new Error('UserSyncPayload requires username');
    }
    if (!payload.email) {
      throw new Error('UserSyncPayload requires email');
    }

    const [roleId, passwordHash, pinHash] = await Promise.all([
      resolveRoleId(payload.roleId, payload.roleName),
      resolvePasswordHash(payload),
      resolvePinHash(payload.pin ?? null),
    ]);

    const base = {
      username: payload.username,
      email: payload.email,
      firstName: payload.firstName ?? '',
      lastName: payload.lastName ?? '',
      passwordHash,
      pin: pinHash,
      roleId,
      isActive: payload.isActive ?? true,
      phone: payload.phone ?? null,
      employeeCode: payload.employeeCode ?? null,
      hireDate: ensureDate(payload.hireDate),
      terminationDate: ensureDate(payload.terminationDate),
    };

    const withOptionalId = payload.id ? { id: payload.id, ...base } : base;

    return upsertUser(withOptionalId);
  }
}

export const userSyncService = new UserSyncService();

