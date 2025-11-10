import { Response } from 'express';
import { productService } from '../services/productService.js';
import { AuthRequest } from '../middleware/auth.js';

export class ProductController {
  /**
   * Get all products
   * GET /api/products
   */
  async getAllProducts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const categoryId = req.query.categoryId as string | undefined;
      const brandId = req.query.brandId as string | undefined;
      const supplierId = req.query.supplierId as string | undefined;
      const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
      const includeVariants = req.query.includeVariants === 'true';
      const includeInventory = req.query.includeInventory === 'true';

      const products = await productService.getAllProducts({
        categoryId,
        brandId,
        supplierId,
        isActive,
        includeVariants,
        includeInventory,
      });

      res.status(200).json({
        success: true,
        data: products,
        count: products.length,
      });
    } catch (error) {
      console.error('Get all products error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch products',
      });
    }
  }

  /**
   * Get product by ID
   * GET /api/products/:id
   */
  async getProductById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const includeVariants = req.query.includeVariants !== 'false';
      const includeInventory = req.query.includeInventory === 'true';

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Product ID is required',
        });
        return;
      }

      const product = await productService.getProductById(id, includeVariants, includeInventory);

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      console.error('Get product by ID error:', error);
      const statusCode = error instanceof Error && error.message === 'Product not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch product',
      });
    }
  }

  /**
   * Get product by product code
   * GET /api/products/code/:productCode
   */
  async getProductByCode(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { productCode } = req.params;
      const includeVariants = req.query.includeVariants !== 'false';
      const includeInventory = req.query.includeInventory === 'true';

      if (!productCode) {
        res.status(400).json({
          success: false,
          error: 'Product code is required',
        });
        return;
      }

      const product = await productService.getProductByCode(productCode, includeVariants, includeInventory);

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      console.error('Get product by code error:', error);
      const statusCode = error instanceof Error && error.message === 'Product not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch product',
      });
    }
  }

  /**
   * Get product variants
   * GET /api/products/:id/variants
   */
  async getProductVariants(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const includeInventory = req.query.includeInventory === 'true';

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Product ID is required',
        });
        return;
      }

      const variants = await productService.getProductVariants(id, includeInventory);

      res.status(200).json({
        success: true,
        data: variants,
        count: variants.length,
      });
    } catch (error) {
      console.error('Get product variants error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch variants',
      });
    }
  }

  /**
   * Get variant by ID
   * GET /api/variants/:id
   */
  async getVariantById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const includeInventory = req.query.includeInventory === 'true';

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Variant ID is required',
        });
        return;
      }

      const variant = await productService.getVariantById(id, includeInventory);

      res.status(200).json({
        success: true,
        data: variant,
      });
    } catch (error) {
      console.error('Get variant by ID error:', error);
      const statusCode = error instanceof Error && error.message === 'Variant not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch variant',
      });
    }
  }

  /**
   * Get variant by SKU
   * GET /api/variants/sku/:sku
   */
  async getVariantBySku(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { sku } = req.params;
      const includeInventory = req.query.includeInventory === 'true';

      if (!sku) {
        res.status(400).json({
          success: false,
          error: 'SKU is required',
        });
        return;
      }

      const variant = await productService.getVariantBySku(sku, includeInventory);

      res.status(200).json({
        success: true,
        data: variant,
      });
    } catch (error) {
      console.error('Get variant by SKU error:', error);
      const statusCode = error instanceof Error && error.message === 'Variant not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch variant',
      });
    }
  }

  /**
   * Get variant inventory
   * GET /api/variants/:id/inventory
   */
  async getVariantInventory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Variant ID is required',
        });
        return;
      }

      const inventory = await productService.getVariantInventory(id);

      res.status(200).json({
        success: true,
        data: inventory,
        count: inventory.length,
      });
    } catch (error) {
      console.error('Get variant inventory error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch inventory',
      });
    }
  }

  /**
   * Get inventory by location
   * GET /api/inventory/location/:locationId
   */
  async getInventoryByLocation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const variantId = req.query.variantId as string | undefined;

      if (!locationId) {
        res.status(400).json({
          success: false,
          error: 'Location ID is required',
        });
        return;
      }

      const inventory = await productService.getInventoryByLocation(locationId, variantId);

      res.status(200).json({
        success: true,
        data: inventory,
        count: inventory.length,
      });
    } catch (error) {
      console.error('Get inventory by location error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch inventory',
      });
    }
  }
}

export const productController = new ProductController();

