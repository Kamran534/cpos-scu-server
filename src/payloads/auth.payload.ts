/**
 * Authentication Payload
 * 
 * Common language for authentication data
 * Used for login/logout operations across integrations
 */

export interface LoginPayload {
  sourceSystem: string;           // e.g., 'tradeunleashed'
  username?: string;
  email?: string;
  password?: string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  additionalParams?: Record<string, unknown>;
}

export interface LoginResponsePayload {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  expiresIn?: number;              // seconds
  tokenType?: string;              // e.g., 'Bearer'
  user?: {
    id: string;
    username?: string;
    email?: string;
    name?: string;
  };
  error?: string;
}

export interface RefreshTokenPayload {
  sourceSystem: string;
  refreshToken: string;
}

