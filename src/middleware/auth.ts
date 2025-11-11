import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../config/index.js';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    roleId: string;
    roleName: string;
    firstName: string;
    lastName: string;
    employeeCode?: string | null;
  };
  terminal?: {
    id: string;
    terminalCode: string;
    branchId: string;
  };
}

const JWT_SECRET: string = config.jwtSecret || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN: string = config.jwtExpiresIn || '24h';

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        username: string;
        email: string;
        roleId: string;
        roleName: string;
        firstName: string;
        lastName: string;
        employeeCode?: string | null;
      };

      // Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          role: true,
        },
      });

      if (!user || !user.isActive) {
        res.status(401).json({ error: 'User not found or inactive' });
        return;
      }

      // Check if user is terminated
      if (user.terminationDate && user.terminationDate <= new Date()) {
        res.status(401).json({ error: 'User account has been terminated' });
        return;
      }

      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        roleId: user.roleId,
        roleName: user.role.name,
        firstName: user.firstName,
        lastName: user.lastName,
        employeeCode: user.employeeCode,
      };

      next();
    } catch (jwtError) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
    return;
  }
};

/**
 * Middleware to verify terminal authentication
 */
export const authenticateTerminal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        terminalId: string;
        terminalCode: string;
        branchId: string;
      };

      // NOTE: Terminal authentication removed as terminals are not used
      // Verify terminal still exists and is active
      res.status(401).json({ error: 'Terminal authentication not implemented' });
      return;

      req.terminal = {
        id: decoded.terminalId,
        terminalCode: decoded.terminalCode,
        branchId: decoded.branchId,
      };

      next();
    } catch (jwtError) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
  } catch (error) {
    console.error('Terminal authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
    return;
  }
};

/**
 * Middleware to check if user has required role by role name
 */
export const authorize = (...allowedRoleNames: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!allowedRoleNames.includes(req.user.roleName)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

/**
 * Generate JWT token for user
 */
export const generateUserToken = (user: {
  id: string;
  username: string;
  email: string;
  roleId: string;
  role: { name: string };
  firstName: string;
  lastName: string;
  employeeCode?: string | null;
}): string => {
  const payload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    roleId: user.roleId,
    roleName: user.role.name,
    firstName: user.firstName,
    lastName: user.lastName,
    employeeCode: user.employeeCode,
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

/**
 * Generate JWT token for terminal
 */
export const generateTerminalToken = (terminal: {
  id: string;
  terminalCode: string;
  branchId: string;
}): string => {
  return jwt.sign(
    {
      terminalId: terminal.id,
      terminalCode: terminal.terminalCode,
      branchId: terminal.branchId,
    },
    JWT_SECRET,
    { expiresIn: '365d' } // Terminals have longer-lived tokens
  );
};

export { JWT_SECRET, JWT_EXPIRES_IN };
