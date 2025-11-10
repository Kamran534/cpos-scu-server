import { Response } from 'express';
import { categoryService } from '../services/categoryService.js';
import { AuthRequest } from '../middleware/auth.js';

export class CategoryController {
  /**
   * Create or update category
   * PUT /api/categories
   */
  async createOrUpdateCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const category = await categoryService.createOrUpdateCategory(req.body);

      res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error) {
      console.error('Create/Update category error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create or update category',
      });
    }
  }

  /**
   * Get all categories
   * GET /api/categories
   */
  async getAllCategories(req: AuthRequest, res: Response): Promise<void> {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const categories = await categoryService.getAllCategories(includeInactive);

      res.status(200).json({
        success: true,
        data: categories,
        count: categories.length,
      });
    } catch (error) {
      console.error('Get all categories error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch categories',
      });
    }
  }

  /**
   * Get category by ID
   * GET /api/categories/:id
   */
  async getCategoryById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Category ID is required',
        });
        return;
      }

      const category = await categoryService.getCategoryById(id);

      res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error) {
      console.error('Get category by ID error:', error);
      const statusCode = error instanceof Error && error.message === 'Category not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch category',
      });
    }
  }
}

export const categoryController = new CategoryController();

