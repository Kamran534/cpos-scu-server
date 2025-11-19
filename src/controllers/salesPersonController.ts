/**
 * SalesPerson Controller
 *
 * Handles HTTP requests for sales person operations
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { salesPersonService } from '../services/salesPersonService.js';

export class SalesPersonController {
  /**
   * Create a new sales person
   * POST /api/sales-persons
   */
  async createSalesPerson(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { code, name, email, phone, commission, notes, hireDate } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          error: 'Name is required',
        });
        return;
      }

      // Generate code if not provided
      const salesPersonCode = code || (await salesPersonService.generateCode());

      // Check if code already exists
      const existing = await salesPersonService.getSalesPersonByCode(salesPersonCode);
      if (existing) {
        res.status(400).json({
          success: false,
          error: 'Sales person code already exists',
        });
        return;
      }

      const salesPerson = await salesPersonService.createSalesPerson({
        code: salesPersonCode,
        name,
        email,
        phone,
        commission: commission ? parseFloat(commission) : 0,
        notes,
        hireDate: hireDate ? new Date(hireDate) : undefined,
      });

      res.status(201).json({
        success: true,
        data: salesPerson,
      });
    } catch (error) {
      console.error('Create sales person error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create sales person',
      });
    }
  }

  /**
   * Get all sales persons
   * GET /api/sales-persons
   */
  async getAllSalesPersons(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { search, isActive, limit, offset } = req.query;

      const result = await salesPersonService.getAllSalesPersons({
        search: search as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });

      res.status(200).json({
        success: true,
        data: result.salesPersons,
        meta: {
          total: result.total,
          hasMore: result.hasMore,
        },
      });
    } catch (error) {
      console.error('Get all sales persons error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sales persons',
      });
    }
  }

  /**
   * Get a sales person by ID
   * GET /api/sales-persons/:id
   */
  async getSalesPersonById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const salesPerson = await salesPersonService.getSalesPersonById(id);

      if (!salesPerson) {
        res.status(404).json({
          success: false,
          error: 'Sales person not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: salesPerson,
      });
    } catch (error) {
      console.error('Get sales person by ID error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sales person',
      });
    }
  }

  /**
   * Update a sales person
   * PUT /api/sales-persons/:id
   */
  async updateSalesPerson(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { code, name, email, phone, commission, isActive, notes, hireDate, terminationDate } =
        req.body;

      // Check if sales person exists
      const existing = await salesPersonService.getSalesPersonById(id);
      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Sales person not found',
        });
        return;
      }

      // Check if new code conflicts with another sales person
      if (code && code !== existing.code) {
        const codeExists = await salesPersonService.getSalesPersonByCode(code);
        if (codeExists) {
          res.status(400).json({
            success: false,
            error: 'Sales person code already exists',
          });
          return;
        }
      }

      const salesPerson = await salesPersonService.updateSalesPerson(id, {
        code,
        name,
        email,
        phone,
        commission: commission !== undefined ? parseFloat(commission) : undefined,
        isActive,
        notes,
        hireDate: hireDate ? new Date(hireDate) : undefined,
        terminationDate: terminationDate ? new Date(terminationDate) : undefined,
      });

      res.status(200).json({
        success: true,
        data: salesPerson,
      });
    } catch (error) {
      console.error('Update sales person error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update sales person',
      });
    }
  }

  /**
   * Delete a sales person
   * DELETE /api/sales-persons/:id
   */
  async deleteSalesPerson(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await salesPersonService.deleteSalesPerson(id);

      res.status(200).json({
        success: true,
        message: 'Sales person deleted successfully',
      });
    } catch (error) {
      console.error('Delete sales person error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete sales person',
      });
    }
  }
}

export const salesPersonController = new SalesPersonController();
