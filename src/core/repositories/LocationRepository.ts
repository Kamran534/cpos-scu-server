/**
 * Location Repository
 * 
 * DB operations for locations/facilities
 */

import { PrismaClient, Location } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export class LocationRepository extends BaseRepository<Location> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'location');
  }

  async findByCode(code: string): Promise<Location | null> {
    return await this.getModel().findFirst({
      where: { 
        OR: [
          { code },
          { name: code },
        ]
      },
    });
  }

  async findOrCreateByCode(code: string, name?: string): Promise<Location> {
    const existing = await this.findByCode(code);
    if (existing) return existing;

    return await this.create({
      code,
      name: name || code,
      type: 'Warehouse', // Changed from 'locationType' to 'type'
      isActive: true,
    });
  }
}

