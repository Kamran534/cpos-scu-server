/**
 * TradeUnleashed Auth Service
 * 
 * Handles authentication with TradeUnleashed
 * Builds login payloads and manages tokens
 */

import { TradeUnleashedClient } from '../api/TradeUnleashedClient';
import { TradeUnleashedConfig } from '../types';
import { LoginResponsePayload } from '../../../payloads';

export class TradeUnleashedAuthService {
  private client: TradeUnleashedClient;

  constructor(config: TradeUnleashedConfig) {
    this.client = new TradeUnleashedClient(config);
  }

  /**
   * Login and build LoginResponsePayload
   */
  async login(): Promise<LoginResponsePayload> {
    try {
      const response = await this.client.login();

      // Build payload
      const payload: LoginResponsePayload = {
        success: true,
        accessToken: response.token,
        refreshToken: response.refreshToken,
        expiresIn: response.expiresIn,
        tokenType: 'Bearer',
        user: response.user ? {
          id: response.user.id,
          username: response.user.username,
          email: response.user.email,
          name: response.user.name,
        } : undefined,
      };

      return payload;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    return await this.client.testConnection();
  }

  /**
   * Get client instance (for other services)
   */
  getClient(): TradeUnleashedClient {
    return this.client;
  }
}

