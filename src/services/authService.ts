import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { generateUserToken } from '../middleware/auth.js';

const prisma = new PrismaClient();

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterUserInput {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId?: string; // Optional: ID of the Role
  roleName?: string; // Optional: Name of the Role (used if roleId not provided)
  pin?: string;
  employeeCode?: string;
  hireDate?: Date | string;
}


export class AuthService {
  /**
   * Register a new user
   */
  async registerUser(input: RegisterUserInput) {
    // Check if username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: input.username },
          { email: input.email },
          ...(input.employeeCode ? [{ employeeCode: input.employeeCode }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new Error('Username, email, or employee code already exists');
    }

    // Find or create role
    let role = null;
    
    if (input.roleId) {
      // Try to find by ID first
      role = await prisma.role.findUnique({
        where: { id: input.roleId },
      });
    }
    
    if (!role && input.roleName) {
      // Try to find by name
      role = await prisma.role.findUnique({
        where: { name: input.roleName },
      });
    }
    
    // If no role found, create a default "employee" role
    if (!role) {
      // Check if default employee role exists
      role = await prisma.role.findUnique({
        where: { name: 'employee' },
      });
      
      if (!role) {
        // Create default employee role
        role = await prisma.role.create({
          data: {
            name: 'employee',
            description: 'Default employee role',
            permissions: ['view_products', 'create_orders', 'view_customers'],
            isActive: true,
          },
        });
        console.log('[AuthService] Created default employee role');
      }
    }

    if (!role || !role.isActive) {
      // Get available roles for better error message
      const availableRoles = await prisma.role.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });
      
      throw new Error(
        `Invalid or inactive role. Available roles: ${availableRoles.map(r => `${r.name} (${r.id})`).join(', ') || 'None found. Please create a role first.'}`
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, 10);

    // Hash PIN if provided
    const pinHash = input.pin ? await bcrypt.hash(input.pin, 10) : null;

    // Parse hireDate if it's a string
    const hireDate = input.hireDate 
      ? (typeof input.hireDate === 'string' ? new Date(input.hireDate) : input.hireDate)
      : null;

    // Create user
    const user = await prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash,
        roleId: role.id,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        pin: pinHash,
        employeeCode: input.employeeCode,
        hireDate: hireDate,
        isActive: true,
      },
      include: {
        role: true,
      },
    });

    // Generate token
    const token = generateUserToken(user);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roleId: user.roleId,
        roleName: user.role.name,
        firstName: user.firstName,
        lastName: user.lastName,
        employeeCode: user.employeeCode,
      },
      token,
    };
  }

  /**
   * Login user
   * Uses email and password for authentication
   */
  async login(input: LoginInput) {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: {
        email: input.email,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    // Check if user is terminated
    if (user.terminationDate && user.terminationDate <= new Date()) {
      throw new Error('User account has been terminated');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      input.password,
      user.passwordHash
    );

    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = generateUserToken(user);

    // Trigger sync on login (async, don't wait)
    // Import syncScheduler dynamically to avoid circular dependency
    import('./syncScheduler.js').then(({ syncScheduler }) => {
      syncScheduler.syncOnLogin(user.id).catch((error) => {
        console.error(`[AuthService] Error syncing on login for user ${user.id}:`, error);
      });
    }).catch((error) => {
      console.error('[AuthService] Failed to load syncScheduler:', error);
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roleId: user.roleId,
        roleName: user.role.name,
        firstName: user.firstName,
        lastName: user.lastName,
        employeeCode: user.employeeCode,
      },
      token,
    };
  }

  /**
   * Get user by ID (includes passwordHash for offline login)
   * GET /api/auth/user/:id
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        locationAssignments: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Return user with passwordHash and locations
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      passwordHash: user.passwordHash, // Include passwordHash for offline login
      roleId: user.roleId,
      roleName: user.role.name,
      employeeCode: user.employeeCode,
      isActive: user.isActive,
      phone: user.phone,
      pin: user.pin,
      hireDate: user.hireDate,
      terminationDate: user.terminationDate,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      locations: user.locationAssignments.map((assignment) => ({
        id: assignment.id,
        userId: assignment.userId,
        locationId: assignment.locationId,
        createdAt: assignment.createdAt,
      })),
    };
  }

  /**
   * Logout user
   * Note: Since UserSession model doesn't exist, this is a placeholder
   * You may want to implement session management separately or add UserSession model
   */
  async logout() {
    // Session management removed as UserSession model doesn't exist in schema
    // Implement your own session management if needed
    return { success: true };
  }

}

export const authService = new AuthService();
