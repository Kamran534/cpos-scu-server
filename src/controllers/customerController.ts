import { Response } from 'express';
import { customerService } from '../services/customerService.js';
import { AuthRequest } from '../middleware/auth.js';

export class CustomerController {
  /**
   * Create a new customer
   * POST /api/customers
   */
  async createCustomer(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, email, phone, address } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          error: 'Customer name is required',
        });
        return;
      }

      const customer = await customerService.createCustomer({
        name,
        email,
        phone,
        address,
      });

      res.status(201).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      console.error('Create customer error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create customer',
      });
    }
  }

  /**
   * Get all customers
   * GET /api/customers
   */
  async getAllCustomers(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const customers = await customerService.getAllCustomers();

      res.status(200).json({
        success: true,
        data: customers,
        count: customers.length,
      });
    } catch (error) {
      console.error('Get all customers error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch customers',
      });
    }
  }

  /**
   * Get customer by ID
   * GET /api/customers/:id
   */
  async getCustomerById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Customer ID is required',
        });
        return;
      }

      const customer = await customerService.getCustomerById(id);

      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      console.error('Get customer by ID error:', error);
      const statusCode = error instanceof Error && error.message === 'Customer not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch customer',
      });
    }
  }

  /**
   * Update a customer
   * PUT /api/customers/:id
   */
  async updateCustomer(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, email, phone, address } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Customer ID is required',
        });
        return;
      }

      const customer = await customerService.updateCustomer(id, {
        name,
        email,
        phone,
        address,
      });

      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      console.error('Update customer error:', error);
      const statusCode = error instanceof Error && error.message === 'Customer not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update customer',
      });
    }
  }

  /**
   * Delete a customer
   * DELETE /api/customers/:id
   */
  async deleteCustomer(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Customer ID is required',
        });
        return;
      }

      await customerService.deleteCustomer(id);

      res.status(200).json({
        success: true,
        message: 'Customer deleted successfully',
      });
    } catch (error) {
      console.error('Delete customer error:', error);
      const statusCode = error instanceof Error && error.message === 'Customer not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete customer',
      });
    }
  }
}

export const customerController = new CustomerController();

