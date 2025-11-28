import { TradeUnleashedClient } from '../api/TradeUnleashedClient.js';
import {
  TradeUnleashedConfig,
  TradeUnleashedOrgAccountSetting,
} from '../types.js';

/**
 * TradeUnleashed Org Account Setting Service
 *
 * Fetches organization-level settings from TradeUnleashed
 * (Pure integration layer – no DB access)
 */
export class TradeUnleashedOrgAccountSettingService {
  private client: TradeUnleashedClient;

  constructor(config: TradeUnleashedConfig) {
    this.client = new TradeUnleashedClient(config);
  }

  async fetchSettings(params?: {
    max?: number;
    limit?: number;
  }): Promise<TradeUnleashedOrgAccountSetting[]> {
    return this.client.fetchOrgAccountSettings(params);
  }
}


