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
  TradeUnleashedStockItem,
  TradeUnleashedOrgAccountSetting,
  TradeUnleashedUserRole,
  TradeUnleashedFacilityRole,
  TradeUnleashedPartyRole,
  TradeUnleashedPosSession,
  TradeUnleashedSaleType,
  TradeUnleashedOrderAdjustmentType,
  TradeUnleashedOrderRoleType,
  TradeUnleashedOrderStatusType,
  TradeUnleashedInvoiceItemType,
  TradeUnleashedPaymentType,
  TradeUnleashedPaymentMethod,
  TradeUnleashedContactMechanismType,
  TradeUnleashedPartyRoleType,
  TradeUnleashedPartyRelationshipType,
} from '../types.js';

export class TradeUnleashedClient {
  private config: TradeUnleashedConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private facilityIds: string[] = [];
  private partyId: string | null = null;
  private cachedUserId: string | null = null;

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
      this.accessToken = data.access_token || data.token || null;
      
      // Calculate expiry (if provided, otherwise assume 1 hour)
      const expiresIn = data.expires_in || data.expiresIn || 3600; // seconds
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

      const loginUser =
        data.user?.username ||
        data.user?.email ||
        data.userName ||
        data.person?.name ||
        data.user?.id ||
        'unknown user';

      const facilityRoles = this.collectFacilityRoles(data);
      this.facilityIds = this.collectFacilityIds(facilityRoles);
      this.partyId = this.extractPartyId(data);
      this.cachedUserId = this.extractUserId(data);
      console.log('[TradeUnleashedClient] facilityRoles from login response:', JSON.stringify(facilityRoles, null, 2));
      console.log(
        '[TradeUnleashedClient] Login successful for',
        loginUser,
        '→ facilities:',
        this.facilityIds.length > 0 ? this.facilityIds.join(',') : 'none',
        '→ token expires in',
        `${Math.round(expiresIn / 60)}m`
      );

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

    console.log('TradeUnleashed URL:', url);

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
      
      let items: TradeUnleashedStockItem[] = [];
      
      if (Array.isArray(responseData) && responseData.length >= 2) {
        const headers = responseData[0]; // e.g., ["id", "name", "sku", ...]
        const rows = responseData[1];    // e.g., [[123, "Product", "SKU"], ...]
        
        if (Array.isArray(headers) && Array.isArray(rows)) {
          // Transform CSV-like format to objects
          items = rows.map((row: unknown[]) => {
            const obj: Record<string, unknown> = {};
            headers.forEach((header: string, index: number) => {
              obj[header] = row[index];
            });
            return obj as TradeUnleashedStockItem;
          });
          
          console.log(`[TradeUnleashedClient] Transformed ${items.length} rows from CSV format to objects`);
        }
      } else if (Array.isArray(responseData)) {
        // Already in object format
        items = responseData as TradeUnleashedStockItem[];
      } else {
        // Wrapped in data property
        items = (responseData.items || responseData.data || []) as TradeUnleashedStockItem[];
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
   * Fetch organization account settings
   */
  async fetchOrgAccountSettings(params?: { max?: number; limit?: number }): Promise<TradeUnleashedOrgAccountSetting[]> {
    await this.ensureAuthenticated();

    const queryParams = new URLSearchParams();
    if (params?.max) queryParams.append('max', params.max.toString());
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    } else if (params?.max) {
      queryParams.append('limit', params.max.toString());
    }

    const queryString = queryParams.toString();
    const url = `${this.config.baseUrl}/api/orgAccountSetting${queryString ? `?${queryString}` : ''}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Org account settings fetch failed: ${response.statusText} - ${errorText}`);
      }

      const data = (await response.json()) as unknown;
      if (!Array.isArray(data)) {
        throw new Error('Unexpected org account settings response format');
      }

      return data as TradeUnleashedOrgAccountSetting[];
    } catch (error) {
      throw new Error(
        `TradeUnleashed org account settings error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Fetch user role assignments
   */
  async fetchUserRoles(params?: { max?: number; limit?: number }): Promise<TradeUnleashedUserRole[]> {
    await this.ensureAuthenticated();

    const queryParams = new URLSearchParams();
    const max = params?.max ?? 1000;
    const limit = params?.limit ?? 1000;
    queryParams.append('max', max.toString());
    queryParams.append('limit', limit.toString());

    const url = `${this.config.baseUrl}/api/auth/userRoles?${queryParams.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`User roles fetch failed: ${response.statusText} - ${errorText}`);
      }

      const data = (await response.json()) as unknown;
      if (!Array.isArray(data)) {
        throw new Error('Unexpected user roles response format');
      }

      return data as TradeUnleashedUserRole[];
    } catch (error) {
      throw new Error(
        `TradeUnleashed user roles error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async fetchFacilityRoles(partyId?: string | number): Promise<TradeUnleashedFacilityRole[]> {
    await this.ensureAuthenticated();

    const resolvedPartyId = partyId ?? this.getPartyId();
    if (!resolvedPartyId) {
      throw new Error('Party ID is required to fetch facility roles');
    }

    const where = encodeURIComponent(JSON.stringify({ partyId: { '==': Number(resolvedPartyId) } }));
    const url = `${this.config.baseUrl}/api/facilityRoles?where=${where}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Facility roles fetch failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Unexpected facility roles response format');
      }

      return data as TradeUnleashedFacilityRole[];
    } catch (error) {
      throw new Error(
        `TradeUnleashed facility roles error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async fetchPartyRoles(partyId?: string | number): Promise<TradeUnleashedPartyRole[]> {
    await this.ensureAuthenticated();

    const resolvedPartyId = partyId ?? this.getPartyId();
    if (!resolvedPartyId) {
      throw new Error('Party ID is required to fetch party roles');
    }

    const where = encodeURIComponent(JSON.stringify({ partyId: { '==': Number(resolvedPartyId) } }));
    const url = `${this.config.baseUrl}/api/partyRoles?where=${where}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Party roles fetch failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Unexpected party roles response format');
      }

      return data as TradeUnleashedPartyRole[];
    } catch (error) {
      throw new Error(
        `TradeUnleashed party roles error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async fetchPosSessions(options?: { userId?: string | number; currentSession?: boolean }): Promise<TradeUnleashedPosSession[]> {
    await this.ensureAuthenticated();

    const userId = options?.userId ?? this.getUserId();
    if (!userId) {
      throw new Error('User ID is required to fetch POS sessions');
    }

    const queryParams = new URLSearchParams();
    queryParams.append('userId', userId.toString());
    if (typeof options?.currentSession !== 'undefined') {
      queryParams.append('currentSession', String(options.currentSession));
    }

    const url = `${this.config.baseUrl}/api/POSSession?${queryParams.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`POS sessions fetch failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Unexpected POS sessions response format');
      }

      return data as TradeUnleashedPosSession[];
    } catch (error) {
      throw new Error(
        `TradeUnleashed POS sessions error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async fetchSaleTypes(params?: { max?: number; limit?: number }): Promise<TradeUnleashedSaleType[]> {
    await this.ensureAuthenticated();

    const queryParams = new URLSearchParams();
    const max = params?.max ?? 50;
    const limit = params?.limit ?? 50;
    queryParams.append('max', max.toString());
    queryParams.append('limit', limit.toString());

    const url = `${this.config.baseUrl}/api/saleTypes?${queryParams.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sale types fetch failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Unexpected sale types response format');
      }

      return data as TradeUnleashedSaleType[];
    } catch (error) {
      throw new Error(
        `TradeUnleashed sale types error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async fetchOrderAdjustmentTypes(params?: { max?: number; limit?: number }): Promise<TradeUnleashedOrderAdjustmentType[]> {
    await this.ensureAuthenticated();

    const queryParams = new URLSearchParams();
    const max = params?.max ?? 50;
    const limit = params?.limit ?? 50;
    queryParams.append('max', max.toString());
    queryParams.append('limit', limit.toString());

    const url = `${this.config.baseUrl}/api/orderAdjustmentTypes?${queryParams.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Order adjustment types fetch failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Unexpected order adjustment types response format');
      }

      return data as TradeUnleashedOrderAdjustmentType[];
    } catch (error) {
      throw new Error(
        `TradeUnleashed order adjustment types error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async fetchOrderRoleTypes(params?: { max?: number; limit?: number }): Promise<TradeUnleashedOrderRoleType[]> {
    await this.ensureAuthenticated();

    const queryParams = new URLSearchParams();
    const max = params?.max ?? 50;
    const limit = params?.limit ?? 50;
    queryParams.append('max', max.toString());
    queryParams.append('limit', limit.toString());

    const url = `${this.config.baseUrl}/api/orderRoleTypes?${queryParams.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Order role types fetch failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Unexpected order role types response format');
      }

      return data as TradeUnleashedOrderRoleType[];
    } catch (error) {
      throw new Error(
        `TradeUnleashed order role types error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async fetchOrderStatusTypes(params?: { max?: number; limit?: number }): Promise<TradeUnleashedOrderStatusType[]> {
    await this.ensureAuthenticated();

    const queryParams = new URLSearchParams();
    const max = params?.max ?? 50;
    const limit = params?.limit ?? 50;
    queryParams.append('max', max.toString());
    queryParams.append('limit', limit.toString());

    const url = `${this.config.baseUrl}/api/orderStatusTypes?${queryParams.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Order status types fetch failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Unexpected order status types response format');
      }

      return data as TradeUnleashedOrderStatusType[];
    } catch (error) {
      throw new Error(
        `TradeUnleashed order status types error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async fetchPaymentTypes(params?: { max?: number; limit?: number }): Promise<TradeUnleashedPaymentType[]> {
    await this.ensureAuthenticated();

    const queryParams = new URLSearchParams();
    const max = params?.max ?? 50;
    const limit = params?.limit ?? 50;
    queryParams.append('max', max.toString());
    queryParams.append('limit', limit.toString());

    const url = `${this.config.baseUrl}/api/paymentTypes?${queryParams.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Payment types fetch failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Unexpected payment types response format');
      }

      return data as TradeUnleashedPaymentType[];
    } catch (error) {
      throw new Error(
        `TradeUnleashed payment types error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async fetchPaymentMethods(params?: { max?: number; limit?: number }): Promise<TradeUnleashedPaymentMethod[]> {
    await this.ensureAuthenticated();

    const queryParams = new URLSearchParams();
    const max = params?.max ?? 50;
    const limit = params?.limit ?? 50;
    queryParams.append('max', max.toString());
    queryParams.append('limit', limit.toString());

    const url = `${this.config.baseUrl}/api/paymentMethods?${queryParams.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Payment methods fetch failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Unexpected payment methods response format');
      }

      return data as TradeUnleashedPaymentMethod[];
    } catch (error) {
      throw new Error(
        `TradeUnleashed payment methods error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async fetchContactMechanismTypes(params?: { max?: number; limit?: number }): Promise<TradeUnleashedContactMechanismType[]> {
    await this.ensureAuthenticated();

    const queryParams = new URLSearchParams();
    const max = params?.max ?? 50;
    const limit = params?.limit ?? 50;
    queryParams.append('max', max.toString());
    queryParams.append('limit', limit.toString());

    const url = `${this.config.baseUrl}/api/contactMechanismTypes?${queryParams.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Contact mechanism types fetch failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Unexpected contact mechanism types response format');
      }

      return data as TradeUnleashedContactMechanismType[];
    } catch (error) {
      throw new Error(
        `TradeUnleashed contact mechanism types error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async fetchPartyRoleTypes(params?: { max?: number; limit?: number }): Promise<TradeUnleashedPartyRoleType[]> {
    await this.ensureAuthenticated();

    const queryParams = new URLSearchParams();
    const max = params?.max ?? 50;
    const limit = params?.limit ?? 50;
    queryParams.append('max', max.toString());
    queryParams.append('limit', limit.toString());

    const url = `${this.config.baseUrl}/api/partyRoleTypes?${queryParams.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Party role types fetch failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Unexpected party role types response format');
      }

      return data as TradeUnleashedPartyRoleType[];
    } catch (error) {
      throw new Error(
        `TradeUnleashed party role types error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async fetchPartyRelationshipTypes(params?: { max?: number; limit?: number }): Promise<TradeUnleashedPartyRelationshipType[]> {
    await this.ensureAuthenticated();

    const queryParams = new URLSearchParams();
    const max = params?.max ?? 50;
    const limit = params?.limit ?? 50;
    queryParams.append('max', max.toString());
    queryParams.append('limit', limit.toString());

    const url = `${this.config.baseUrl}/api/partyRelationshipTypes?${queryParams.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Party relationship types fetch failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Unexpected party relationship types response format');
      }

      return data as TradeUnleashedPartyRelationshipType[];
    } catch (error) {
      throw new Error(
        `TradeUnleashed party relationship types error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async fetchInvoiceItemTypes(params?: { max?: number; limit?: number }): Promise<TradeUnleashedInvoiceItemType[]> {
    await this.ensureAuthenticated();

    const queryParams = new URLSearchParams();
    const max = params?.max ?? 50;
    const limit = params?.limit ?? 50;
    queryParams.append('max', max.toString());
    queryParams.append('limit', limit.toString());

    const url = `${this.config.baseUrl}/api/invoiceItemTypes?${queryParams.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Invoice item types fetch failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Unexpected invoice item types response format');
      }

      return data as TradeUnleashedInvoiceItemType[];
    } catch (error) {
      throw new Error(
        `TradeUnleashed invoice item types error: ${error instanceof Error ? error.message : String(error)}`
      );
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

  private collectFacilityRoles(data: TradeUnleashedLoginResponse): TradeUnleashedFacilityRole[] {
    const roles: TradeUnleashedFacilityRole[] = [];
    const sources = [
      data.user?.person?.facilityRoles,
      data.person?.facilityRoles,
    ];

    for (const source of sources) {
      if (Array.isArray(source)) {
        roles.push(...source);
      }
    }

    return roles;
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
   * Get facility IDs discovered from login response
   */
  getFacilityIds(): string[] {
    return this.facilityIds;
  }

  getPartyId(): string | null {
    return this.partyId;
  }

  getUserId(): string | null {
    return this.cachedUserId;
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

  private collectFacilityIds(roles: TradeUnleashedFacilityRole[]): string[] {
    const adminRoleNames = new Set(['FACILITY_ADMIN']);
    const userRoleNames = new Set(['FACILITY_USER']);

    const adminIds: string[] = [];
    const userIds: string[] = [];

    for (const role of roles) {
      const facilityId = role.facility?.id;
      if (!facilityId) continue;

      const idString = facilityId.toString();
      const roleName = role.facilityRoleType?.name || '';

      if (adminRoleNames.has(roleName)) {
        adminIds.push(idString);
      } else if (userRoleNames.has(roleName)) {
        userIds.push(idString);
      }
    }

    if (adminIds.length > 0) {
      console.log('[TradeUnleashedClient] Using facility IDs from FACILITY_ADMIN roles:', adminIds.join(','));
      return adminIds;
    }

    if (userIds.length > 0) {
      console.log('[TradeUnleashedClient] No admin facility roles found; using FACILITY_USER IDs:', userIds.join(','));
      return userIds;
    }

    console.warn('[TradeUnleashedClient] No facility IDs found in roles');
    return [];
  }

  private extractPartyId(data: TradeUnleashedLoginResponse): string | null {
    const candidate =
      data.user?.person?.id ??
      data.person?.id ??
      data.user?.id ??
      null;

    return typeof candidate === 'number' || typeof candidate === 'string'
      ? candidate.toString()
      : null;
  }

  private extractUserId(data: TradeUnleashedLoginResponse): string | null {
    const candidate = data.user?.id ?? data.user?.username ?? null;
    return candidate !== null && candidate !== undefined ? candidate.toString() : null;
  }
}

