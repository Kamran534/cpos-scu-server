/**
 * TradeUnleashed User Sync Service
 * 
 * Syncs user data from TradeUnleashed login response to User and UserLocation tables
 */

import { prisma } from '../lib/prisma.js';
import { TradeUnleashedLoginResponse, TradeUnleashedFacilityRole } from '../integrations/tradeunleashed/types.js';
import bcrypt from 'bcrypt';

export class TradeUnleashedUserSyncService {
  /**
   * Sync user data from TradeUnleashed login response
   * Only saves user-related, login, and token data (not other data)
   */
  async syncUserFromLoginResponse(loginResponse: TradeUnleashedLoginResponse): Promise<{
    user: {
      id: string;
      username: string;
      email: string;
      firstName: string;
      lastName: string;
    };
    locations: Array<{ id: string; locationId: string }>;
  }> {
    // Extract user data from login response
    const userData = this.extractUserData(loginResponse);
    
    if (!userData.username || !userData.email) {
      throw new Error('Username and email are required from login response');
    }

    // Find or create default role
    const role = await this.findOrCreateDefaultRole();

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: userData.username },
          { email: userData.email },
          ...(userData.employeeCode ? [{ employeeCode: userData.employeeCode }] : []),
        ],
      },
    });

    let user;
    if (existingUser) {
      // Update existing user (preserve passwordHash)
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          username: userData.username,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone ?? existingUser.phone,
          employeeCode: userData.employeeCode ?? existingUser.employeeCode,
          roleId: role.id,
          isActive: true,
        },
        include: { role: true },
      });
      console.log(`[TradeUnleashedUserSyncService] Updated existing user: ${user.username}`);
    } else {
      // Create new user (generate placeholder passwordHash)
      const placeholderPassword = `tu_${userData.username}_${Date.now()}`;
      const passwordHash = await bcrypt.hash(placeholderPassword, 10);

      user = await prisma.user.create({
        data: {
          username: userData.username,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          passwordHash,
          roleId: role.id,
          phone: userData.phone,
          employeeCode: userData.employeeCode,
          isActive: true,
        },
        include: { role: true },
      });
      console.log(`[TradeUnleashedUserSyncService] Created new user: ${user.username}`);
    }

    // Sync user locations from facilityRoles
    const facilityRoles = this.extractFacilityRoles(loginResponse);
    const userLocations = await this.syncUserLocations(user.id, facilityRoles);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      locations: userLocations,
    };
  }

  /**
   * Extract user data from login response
   */
  private extractUserData(loginResponse: TradeUnleashedLoginResponse): {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    employeeCode?: string;
  } {
    // Extract username
    const username =
      loginResponse.user?.username ||
      loginResponse.userName ||
      loginResponse.user?.email ||
      loginResponse.person?.name ||
      loginResponse.user?.id?.toString() ||
      '';

    // Extract email
    const email =
      loginResponse.user?.email ||
      loginResponse.user?.username ||
      `${username}@tradeunleashed.local`;

    // Extract name
    const fullName =
      loginResponse.user?.name ||
      loginResponse.user?.firstName && loginResponse.user?.lastName
        ? `${loginResponse.user.firstName} ${loginResponse.user.lastName}`
        : loginResponse.person?.name ||
          loginResponse.user?.username ||
          username;

    // Split name into first and last
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = loginResponse.user?.firstName || nameParts[0] || 'User';
    const lastName =
      loginResponse.user?.lastName ||
      (nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Unknown');

    // Extract employee code (use user ID as fallback)
    const employeeCode =
      loginResponse.user?.id?.toString() ||
      loginResponse.person?.id?.toString() ||
      undefined;

    return {
      username,
      email,
      firstName,
      lastName,
      employeeCode,
    };
  }

  /**
   * Extract facility roles from login response
   */
  private extractFacilityRoles(loginResponse: TradeUnleashedLoginResponse): TradeUnleashedFacilityRole[] {
    const roles: TradeUnleashedFacilityRole[] = [];
    const sources = [
      loginResponse.user?.person?.facilityRoles,
      loginResponse.person?.facilityRoles,
    ];

    for (const source of sources) {
      if (Array.isArray(source)) {
        roles.push(...source);
      }
    }

    return roles;
  }

  /**
   * Sync user locations from facility roles
   */
  private async syncUserLocations(
    userId: string,
    facilityRoles: TradeUnleashedFacilityRole[]
  ): Promise<Array<{ id: string; locationId: string }>> {
    const userLocations: Array<{ id: string; locationId: string }> = [];

    for (const facilityRole of facilityRoles) {
      const facility = facilityRole.facility;
      if (!facility || !facility.id) {
        continue;
      }

      const facilityId = facility.id.toString();
      const facilityName = facility.name || `Facility ${facilityId}`;

      // Find or create location
      const location = await this.findOrCreateLocation(facilityId, facilityName, facility);

      // Check if UserLocation already exists
      let userLocation = await prisma.userLocation.findFirst({
        where: {
          userId,
          locationId: location.id,
        },
      });

      if (!userLocation) {
        // Create new UserLocation
        userLocation = await prisma.userLocation.create({
          data: {
            userId,
            locationId: location.id,
          },
        });
      }

      userLocations.push({
        id: userLocation.id,
        locationId: userLocation.locationId,
      });
    }

    console.log(
      `[TradeUnleashedUserSyncService] Synced ${userLocations.length} user locations for user ${userId}`
    );

    return userLocations;
  }

  /**
   * Find or create location from facility
   */
  private async findOrCreateLocation(
    facilityId: string,
    facilityName: string,
    facility: {
      name?: string;
      streetAddress?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
      zipCode?: string | null;
      isWarehouse?: boolean | null;
      [key: string]: unknown;
    }
  ) {
    // Try to find existing location by code (using facility ID as code)
    let location = await prisma.location.findUnique({
      where: { code: facilityId },
    });

    if (!location) {
      // Determine location type
      const locationType = facility.isWarehouse ? 'Warehouse' : 'Store' as 'Store' | 'Warehouse' | 'Mobile';

      // Create new location
      location = await prisma.location.create({
        data: {
          code: facilityId,
          name: facilityName,
          type: locationType,
          address: facility.streetAddress || null,
          city: facility.city || null,
          state: facility.state || null,
          country: facility.country || null,
          postalCode: facility.zipCode || null,
          isActive: true,
        },
      });
      console.log(`[TradeUnleashedUserSyncService] Created new location: ${location.name} (${location.code})`);
    } else {
      // Update existing location with latest data
      location = await prisma.location.update({
        where: { id: location.id },
        data: {
          name: facilityName,
          address: facility.streetAddress || location.address,
          city: facility.city || location.city,
          state: facility.state || location.state,
          country: facility.country || location.country,
          postalCode: facility.zipCode || location.postalCode,
        },
      });
    }

    return location;
  }

  /**
   * Find or create default role
   */
  private async findOrCreateDefaultRole() {
    // Try to find default "employee" role
    let role = await prisma.role.findUnique({
      where: { name: 'employee' },
    });

    if (!role) {
      // Create default employee role
      role = await prisma.role.create({
        data: {
          name: 'employee',
          description: 'Default employee role from TradeUnleashed',
          permissions: ['view_products', 'create_orders', 'view_customers'],
          isActive: true,
        },
      });
      console.log('[TradeUnleashedUserSyncService] Created default employee role');
    }

    return role;
  }
}

export const tradeUnleashedUserSyncService = new TradeUnleashedUserSyncService();

