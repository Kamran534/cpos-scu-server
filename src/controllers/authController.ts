import { Response } from 'express';
import { authService } from '../services/authService.js';
import { AuthRequest } from '../middleware/auth.js';

export class AuthController {
  /**
   * Register new user
   * POST /api/auth/register
   */
  async register(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await authService.registerUser({
        ...req.body,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      });
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req: AuthRequest, res: Response): Promise<void> {
    try {
      console.log('[AuthController] Login request received');

      // Support both 'email' and 'username' for backward compatibility
      const { email, username, password } = req.body;
      const loginEmail = email || username;

      // Validate email/username and password (check for null, undefined, or empty string)
      if (!loginEmail || (typeof loginEmail === 'string' && loginEmail.trim().length === 0)) {
        console.warn('[AuthController] Login failed: Missing or empty email/username');
        res.status(400).json({
          success: false,
          error: 'Email or username is required and cannot be empty',
        });
        return;
      }

      if (!password || (typeof password === 'string' && password.trim().length === 0)) {
        console.warn('[AuthController] Login failed: Missing or empty password');
        res.status(400).json({
          success: false,
          error: 'Password is required and cannot be empty',
        });
        return;
      }

      const result = await authService.login({ email: loginEmail, password });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
    }
  }

  /**
   * Get user by ID (includes passwordHash for offline login)
   * GET /api/auth/user/:id
   */
  async getUserById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
        });
        return;
      }

      const user = await authService.getUserById(id);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'User not found',
      });
    }
  }

}

export const authController = new AuthController();
