/**
 * Customer Payload
 * 
 * Common language for customer data between integration layer and generic layer
 */

import { BasePayload, PayloadMetadata } from './base.payload';

export interface CustomerPayload extends BasePayload {
  // Customer identification
  customerCode: string;
  
  // Personal info
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  
  // Business info
  companyName?: string;
  taxId?: string;
  
  // Classification
  customerType?: 'Regular' | 'VIP' | 'Wholesale' | 'Employee';
  
  // Financial
  creditLimit?: number;
  currentBalance?: number;
  
  // Marketing
  tags?: string[];
  notes?: string;
  
  // Addresses
  addresses?: CustomerAddressPayload[];
  
  // Optional metadata
  metadata?: PayloadMetadata;
}

export interface CustomerAddressPayload {
  addressType: 'billing' | 'shipping' | 'both';
  isDefault?: boolean;
  
  // Address details
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  
  // Contact
  phone?: string;
}

export interface CustomerBatchPayload {
  customers: CustomerPayload[];
  metadata?: PayloadMetadata;
}

