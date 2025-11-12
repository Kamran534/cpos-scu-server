/**
 * Core Base Types
 * 
 * Generic types for the core layer
 */

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueryOptions {
  include?: Record<string, boolean>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  where?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProcessResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  validationErrors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

