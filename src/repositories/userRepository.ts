import { type Prisma, type Role, type User } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

type BaseUserWritableFields = Pick<
  User,
  | 'username'
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'passwordHash'
  | 'pin'
  | 'roleId'
  | 'isActive'
  | 'hireDate'
  | 'terminationDate'
  | 'phone'
  | 'employeeCode'
>;

export type UpsertUserInput = BaseUserWritableFields & { id?: string };

export interface UpsertUserResult extends User {
  role: Role;
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function upsertUser(data: UpsertUserInput): Promise<UpsertUserResult> {
  const { id, ...rest } = data;

  if (id) {
    const existing = await findUserById(id);
    if (existing) {
      return prisma.user.update({
        where: { id: existing.id },
        data: rest,
        include: { role: true },
      });
    }
  }

  const existingByEmail = await findUserByEmail(data.email);
  if (existingByEmail) {
    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: rest,
      include: { role: true },
    });
  }

  return prisma.user.create({
    data,
    include: { role: true },
  });
}

export async function findRoleById(roleId: string): Promise<Role | null> {
  return prisma.role.findUnique({ where: { id: roleId } });
}

export async function findRoleByName(name: string): Promise<Role | null> {
  return prisma.role.findUnique({ where: { name } });
}

export async function createRole(data: Prisma.RoleCreateInput): Promise<Role> {
  return prisma.role.create({ data });
}

