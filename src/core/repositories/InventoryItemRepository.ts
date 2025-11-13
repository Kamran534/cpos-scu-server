/**
 * Inventory Item Repository
 * 
 * DB operations for inventory items
 */

import { PrismaClient, InventoryItem } from '@prisma/client';
import { BaseRepository } from './BaseRepository.js';

export class InventoryItemRepository extends BaseRepository<InventoryItem> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'inventoryItem');
  }

  async findByVariantAndLocation(
    variantId: string,
    locationId: string
  ): Promise<InventoryItem | null> {
    return await this.getModel().findFirst({
      where: {
        variantId,
        locationId,
      },
    });
  }

  async upsertInventory(
    variantId: string,
    locationId: string,
    data: any
  ): Promise<InventoryItem> {
    return await this.upsert(
      { variantId_locationId: { variantId, locationId } },
      { variantId, locationId, ...data },
      data
    );
  }
}

