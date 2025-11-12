/**
 * TradeUnleashed API Client
 * 
 * Handles HTTP communication with TradeUnleashed API
 * NO business logic - just API calls
 */

import { 
  TradeUnleashedConfig,
  TradeUnleashedLoginRequest,
  TradeUnleashedLoginResponse,
  TradeUnleashedStockQueryParams,
  TradeUnleashedStockQueryResponse,
} from '../types';

export class TradeUnleashedClient {
  private config: TradeUnleashedConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: TradeUnleashedConfig) {
    this.config = config;
  }

  /**
   * Login to TradeUnleashed
   */
  async login(): Promise<TradeUnleashedLoginResponse> {
    const url = `${this.config.baseUrl}/api/login`;

    const body: TradeUnleashedLoginRequest = {
      username: this.config.username,
      password: this.config.password,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Login failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as TradeUnleashedLoginResponse;

      // Store token (TradeUnleashed uses 'access_token' field)
      this.accessToken = data.access_token || data.token;
      
      // Calculate expiry (if provided, otherwise assume 1 hour)
      const expiresIn = data.expires_in || data.expiresIn || 3600; // seconds
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

      return data;
    } catch (error) {
      throw new Error(`TradeUnleashed login error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Query stock/inventory items
   */
  async queryStock(params: TradeUnleashedStockQueryParams): Promise<TradeUnleashedStockQueryResponse> {
    await this.ensureAuthenticated();

    // Build query string
    const queryParams = new URLSearchParams();
    if (params.facilityIds) queryParams.append('facilityIds', params.facilityIds);
    if (params.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params.toDate) queryParams.append('toDate', params.toDate);
    if (params.max) queryParams.append('max', params.max.toString());
    if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());
    if (params.orderBy) queryParams.append('orderBy', params.orderBy);

    const url = `${this.config.baseUrl}/api/inventoryItems/stockQuery?${queryParams.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stock query failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as unknown;

      // TradeUnleashed returns data in CSV-like format:
      // [0]: Array of column names (headers)
      // [1]: Array of data rows (each row is an array)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const responseData = data as any;
      
      let items: any[] = [];
      
      if (Array.isArray(responseData) && responseData.length >= 2) {
        const headers = responseData[0]; // e.g., ["id", "name", "sku", ...]
        const rows = responseData[1];    // e.g., [[123, "Product", "SKU"], ...]
        
        if (Array.isArray(headers) && Array.isArray(rows)) {
          // Transform CSV-like format to objects
          items = rows.map((row: any[]) => {
            const obj: any = {};
            headers.forEach((header: string, index: number) => {
              obj[header] = row[index];
            });
            return obj;
          });
          
          console.log(`[TradeUnleashedClient] Transformed ${items.length} rows from CSV format to objects`);
        }
      } else if (Array.isArray(responseData)) {
        // Already in object format
        items = responseData;
      } else {
        // Wrapped in data property
        items = responseData.items || responseData.data || [];
      }
      
      return {
        data: items,
        total: items.length,
        offset: params.offset || 0,
        max: params.max || 50,
        hasMore: false,
      };
    } catch (error) {
      throw new Error(`TradeUnleashed stock query error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken || this.isTokenExpired()) {
      await this.login();
    }
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(): boolean {
    if (!this.tokenExpiry) return true;
    return new Date() >= this.tokenExpiry;
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.login();
      return true;
    } catch (error) {
      console.error('TradeUnleashed connection test failed:', error);
      return false;
    }
  }
}

