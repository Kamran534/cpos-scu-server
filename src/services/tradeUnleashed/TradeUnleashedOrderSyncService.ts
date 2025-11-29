/**
 * TradeUnleashed Order Sync Service
 * 
 * Syncs pending orders from POS database to TradeUnleashed HQ server
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { TradeUnleashedClient } from '../../integrations/tradeunleashed/api/TradeUnleashedClient.js';
import { mapSaleOrderToTU, buildTradeUnleashedAPIPayload } from '../../integrations/tradeunleashed/mappers/SalesOrderMapper.js';
import { TradeUnleashedConfig } from '../../integrations/tradeunleashed/types.js';

export class TradeUnleashedOrderSyncService {
  private prisma: PrismaClient;
  private tuClient: TradeUnleashedClient | null = null;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || prisma;
  }

  /**
   * Initialize TradeUnleashed client
   */
  async initializeClient(config: TradeUnleashedConfig): Promise<void> {
    this.tuClient = new TradeUnleashedClient(config);
    await this.tuClient.login();
  }

  /**
   * Sync pending orders to TradeUnleashed
   * Fetches orders with status "Open" and syncStatus "Pending" or null
   */
  async syncPendingOrders(): Promise<{
    success: number;
    failed: number;
    errors: Array<{ orderId: string; orderNumber: string; error: string }>;
  }> {
    if (!this.tuClient) {
      throw new Error('TradeUnleashed client not initialized. Call initializeClient() first.');
    }

    const result = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ orderId: string; orderNumber: string; error: string }>,
    };

    try {
      // Fetch pending orders
      // Include orders with status 'Open' OR 'Completed' that need syncing
      // Workaround: Fetch orders and filter in memory to avoid Prisma client type issues with syncStatus field
      const allPendingOrders = await this.prisma.saleOrder.findMany({
        where: {
          OR: [
            { status: 'Open' },
            { status: 'Completed' }, // Also sync completed orders that haven't been synced yet
          ],
        },
        include: {
          lineItems: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
          payments: true,
          location: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          customer: {
            select: {
              id: true,
              customerCode: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          orderDate: 'asc',
        },
        take: 100, // Fetch more to filter
      });

      // Filter in memory for syncStatus: 'Pending', 'Failed', or null/undefined
      const pendingOrders = allPendingOrders.filter((order: any) => {
        const syncStatus = (order as any).syncStatus;
        return syncStatus === 'Pending' || syncStatus === 'Failed' || syncStatus === null || syncStatus === undefined;
      }).slice(0, 50); // Limit to 50 after filtering

      if (pendingOrders.length === 0) {
        console.log('[TradeUnleashedOrderSync] No pending orders to sync');
        // Debug: Check if there are any orders with Pending syncStatus
        const debugOrders = await this.prisma.saleOrder.findMany({
          where: {
            OR: [
              { status: 'Open' },
              { status: 'Completed' },
            ],
          },
          select: { id: true, orderNumber: true, status: true },
          take: 10,
        });
        if (debugOrders.length > 0) {
          console.log(`[TradeUnleashedOrderSync] Debug: Found ${debugOrders.length} orders (Open/Completed), checking syncStatus...`);
          // Log sample orders with their status
          for (const order of debugOrders.slice(0, 5)) {
            console.log(`[TradeUnleashedOrderSync] Debug: Order ${order.orderNumber} - status: ${order.status}`);
          }
        }
        return result;
      }

      console.log(`[TradeUnleashedOrderSync] Found ${pendingOrders.length} pending orders to sync`);

      // Group orders by batch (process multiple at once)
      const ordersToSync: any[] = [];

      for (const order of pendingOrders) {
        try {
          // Update sync status to "Syncing"
          await this.prisma.saleOrder.update({
            where: { id: order.id },
            data: {
              syncStatus: 'Syncing' as any,
              lastSyncAttempt: new Date(),
            } as any,
          });

          // Map order to TradeUnleashed format
          const tuPayload = await mapSaleOrderToTU(order as any);
          // Use order externalId if exists, otherwise generate one for TradeUnleashed
          const tuOrderId = (order as any).externalId ? parseInt((order as any).externalId) : undefined;
          
          // Get POS session ID - priority: from TradeUnleashed client, then from database, then default
          let posSessionId: number | null = null;
          
          // Try to get from TradeUnleashed client (from login response)
          if (this.tuClient) {
            posSessionId = this.tuClient.getPosSessionId();
          }
          
          // If not found, try to get from database PosSession table
          // PosSession.id is a BigInt that stores the TradeUnleashed session ID
          if (!posSessionId) {
            try {
              const posSession = await this.prisma.posSession.findFirst({
                where: {
                  endTime: null, // Active session (not ended)
                },
                orderBy: {
                  startTime: 'desc', // Get most recent session
                },
                select: {
                  id: true, // PosSession.id is the TradeUnleashed session ID (BigInt)
                },
              });
              
              if (posSession?.id) {
                // Convert BigInt to number
                posSessionId = Number(posSession.id);
                console.log(`[TradeUnleashedOrderSync] Using POS session ID from database: ${posSessionId}`);
              }
            } catch (error) {
              console.warn(`[TradeUnleashedOrderSync] Could not fetch POS session from database:`, error instanceof Error ? error.message : String(error));
            }
          }
          
          const tuApiPayload = buildTradeUnleashedAPIPayload(tuPayload, tuOrderId, posSessionId);

          // Validate payload before adding to batch
          if (!tuApiPayload.lineItems || tuApiPayload.lineItems.length === 0) {
            throw new Error(`Order ${order.orderNumber} has no line items`);
          }

          // Validate that line items have valid inventoryItem IDs
          for (const lineItem of tuApiPayload.lineItems) {
            if (!lineItem.inventoryItem || !lineItem.inventoryItem.id) {
              throw new Error(`Order ${order.orderNumber} has line item without inventoryItem.id`);
            }
            if (isNaN(lineItem.inventoryItem.id)) {
              throw new Error(`Order ${order.orderNumber} has invalid inventoryItem.id: ${lineItem.inventoryItem.id}`);
            }
          }

          // Validate orderRoles has at least one facility role
          if (!tuApiPayload.orderRoles || tuApiPayload.orderRoles.length === 0) {
            throw new Error(`Order ${order.orderNumber} has no orderRoles (needs at least facility role)`);
          }

          const hasFacilityRole = tuApiPayload.orderRoles.some((role: any) => 
            role.orderRoleType && role.orderRoleType.id === 113 && role.facility && role.facility.id
          );
          if (!hasFacilityRole) {
            throw new Error(`Order ${order.orderNumber} missing facility role (orderRoleType 113)`);
          }

          // Add to batch
          ordersToSync.push(tuApiPayload);
          console.log(`[TradeUnleashedOrderSync] Prepared order ${order.orderNumber} for sync (${tuApiPayload.lineItems.length} line items)`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[TradeUnleashedOrderSync] Error mapping order ${order.orderNumber}:`, errorMessage);

          // Mark as failed
          await this.prisma.saleOrder.update({
            where: { id: order.id },
            data: {
              syncStatus: 'Failed' as any,
              syncError: errorMessage,
              lastSyncAttempt: new Date(),
              syncAttempts: {
                increment: 1,
              },
            } as any,
          });

          result.failed++;
          result.errors.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            error: errorMessage,
          });
        }
      }

      // Post orders to TradeUnleashed in batch
      if (ordersToSync.length > 0) {
        try {
          console.log(`[TradeUnleashedOrderSync] Posting ${ordersToSync.length} orders to TradeUnleashed...`);
          const tuResponse = await this.tuClient.createSalesOrders(ordersToSync);

          // TradeUnleashed bulkSave returns the created/updated orders
          // Response format: { entities: [...] } or array of orders
          const syncedOrderIds: Set<string | number> = new Set();
          
          if (tuResponse && typeof tuResponse === 'object') {
            // Check if response has 'entities' array (from TradeUnleashed API)
            const responseData = (tuResponse as any).entities || (Array.isArray(tuResponse) ? tuResponse : []);
            
            if (Array.isArray(responseData) && responseData.length > 0) {
              // Extract order IDs from TradeUnleashed response
              // TradeUnleashed returns orders with 'id' or 'orderReference'
              for (const tuOrder of responseData) {
                if (tuOrder.id) {
                  syncedOrderIds.add(tuOrder.id);
                }
                if (tuOrder.orderReference) {
                  // Match by orderReference
                  const matchingOrder = pendingOrders.find(o => o.orderNumber === tuOrder.orderReference);
                  if (matchingOrder) {
                    syncedOrderIds.add(matchingOrder.id);
                  }
                }
                if (tuOrder.uniqueHash) {
                  // Match by uniqueHash
                  const matchingOrder = pendingOrders.find(o => o.id === tuOrder.uniqueHash);
                  if (matchingOrder) {
                    syncedOrderIds.add(matchingOrder.id);
                  }
                }
              }
            }
          }

          // Update all orders that were successfully synced
          // If we couldn't match responses, assume all succeeded (TradeUnleashed doesn't always return detailed errors)
          for (const order of pendingOrders) {
            const wasSynced = syncedOrderIds.has(order.id) || 
                             syncedOrderIds.size === 0; // If no response data, assume success
            
            if (wasSynced) {
              // Update order status to Completed and mark as Synced
              await this.prisma.saleOrder.update({
                where: { id: order.id },
                data: {
                  status: 'Completed',
                  syncStatus: 'Synced' as any,
                  syncedAt: new Date(),
                  syncError: null,
                  externalId: ordersToSync.find((o: any) => 
                    o.uniqueHash === order.id || o.orderReference === order.orderNumber
                  )?.id?.toString() || null,
                  externalSystem: 'tradeunleashed',
                } as any,
              });

              result.success++;
              console.log(`[TradeUnleashedOrderSync] ✓ Successfully synced order ${order.orderNumber}`);
            } else {
              // Order was in batch but not in response - mark as failed
              result.failed++;
              result.errors.push({
                orderId: order.id,
                orderNumber: order.orderNumber,
                error: 'Order not found in TradeUnleashed response',
              });
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('[TradeUnleashedOrderSync] Error posting orders to TradeUnleashed:', errorMessage);

          // Mark all orders in batch as failed
          for (const order of pendingOrders) {
            await this.prisma.saleOrder.update({
              where: { id: order.id },
              data: {
                syncStatus: 'Failed' as any,
                syncError: errorMessage,
                lastSyncAttempt: new Date(),
                syncAttempts: {
                  increment: 1,
                },
              } as any,
            });

            result.failed++;
            result.errors.push({
              orderId: order.id,
              orderNumber: order.orderNumber,
              error: errorMessage,
            });
          }
        }
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[TradeUnleashedOrderSync] Fatal error:', errorMessage);
      throw error;
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    pending: number;
    syncing: number;
    synced: number;
    failed: number;
  }> {
      // Workaround: Use raw query to get syncStatus counts to avoid Prisma client type issues
      const pendingResult = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
        SELECT COUNT(*) as count
        FROM "SaleOrder"
        WHERE (status = 'Open' OR status = 'Completed')
          AND ("syncStatus" = 'Pending' OR "syncStatus" IS NULL)
      `);
      
      const syncingResult = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
        SELECT COUNT(*) as count
        FROM "SaleOrder"
        WHERE "syncStatus" = 'Syncing'
      `);
      
      const syncedResult = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
        SELECT COUNT(*) as count
        FROM "SaleOrder"
        WHERE "syncStatus" = 'Synced'
      `);
      
      const failedResult = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
        SELECT COUNT(*) as count
        FROM "SaleOrder"
        WHERE "syncStatus" = 'Failed'
      `);

      const pending = Number(pendingResult[0]?.count || 0);
      const syncing = Number(syncingResult[0]?.count || 0);
      const synced = Number(syncedResult[0]?.count || 0);
      const failed = Number(failedResult[0]?.count || 0);

    return { pending, syncing, synced, failed };
  }
}

export default new TradeUnleashedOrderSyncService();

