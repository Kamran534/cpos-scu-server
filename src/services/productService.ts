import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ProductService {
  /**
   * Get all products with optional filters
   */
  async getAllProducts(options: {
    categoryId?: string;
    brandId?: string;
    supplierId?: string;
    isActive?: boolean;
    includeVariants?: boolean;
    includeInventory?: boolean;
  } = {}) {
    const {
      categoryId,
      brandId,
      supplierId,
      isActive,
      includeVariants = false,
      includeInventory = false,
    } = options;

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (supplierId) where.supplierId = supplierId;
    if (isActive !== undefined) where.isActive = isActive;

    const include: any = {
      category: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      brand: {
        select: {
          id: true,
          name: true,
        },
      },
      supplier: {
        select: {
          id: true,
          name: true,
        },
      },
    };

    if (includeVariants) {
      include.variants = {
        where: { isActive: true },
        orderBy: { position: 'asc' },
      };
    }

    if (includeInventory && includeVariants) {
      include.variants = {
        where: { isActive: true },
        orderBy: { position: 'asc' },
        include: {
          inventoryItems: {
            include: {
              location: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      };
    }

    const products = await prisma.product.findMany({
      where,
      include,
      orderBy: [
        { createdAt: 'desc' },
      ],
    });

    return products;
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string, includeVariants = true, includeInventory = false) {
    const include: any = {
      category: true,
      brand: true,
      supplier: true,
    };

    if (includeVariants) {
      include.variants = {
        where: { isActive: true },
        orderBy: { position: 'asc' },
      };
    }

    if (includeInventory && includeVariants) {
      include.variants = {
        where: { isActive: true },
        orderBy: { position: 'asc' },
        include: {
          inventoryItems: {
            include: {
              location: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      };
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include,
    });

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }

  /**
   * Get product by product code
   */
  async getProductByCode(productCode: string, includeVariants = true, includeInventory = false) {
    const include: any = {
      category: true,
      brand: true,
      supplier: true,
    };

    if (includeVariants) {
      include.variants = {
        where: { isActive: true },
        orderBy: { position: 'asc' },
      };
    }

    if (includeInventory && includeVariants) {
      include.variants = {
        where: { isActive: true },
        orderBy: { position: 'asc' },
        include: {
          inventoryItems: {
            include: {
              location: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      };
    }

    const product = await prisma.product.findUnique({
      where: { productCode },
      include,
    });

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }

  /**
   * Get all variants for a product
   */
  async getProductVariants(productId: string, includeInventory = false) {
    const include: any = {};

    if (includeInventory) {
      include.inventoryItems = {
        include: {
          location: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      };
    }

    const variants = await prisma.productVariant.findMany({
      where: {
        productId,
        isActive: true,
      },
      include,
      orderBy: { position: 'asc' },
    });

    return variants;
  }

  /**
   * Get variant by ID
   */
  async getVariantById(id: string, includeInventory = false) {
    const include: any = {
      product: {
        select: {
          id: true,
          productCode: true,
          name: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    };

    if (includeInventory) {
      include.inventoryItems = {
        include: {
          location: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      };
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id },
      include,
    });

    if (!variant) {
      throw new Error('Variant not found');
    }

    return variant;
  }

  /**
   * Get variant by SKU
   */
  async getVariantBySku(sku: string, includeInventory = false) {
    const include: any = {
      product: {
        select: {
          id: true,
          productCode: true,
          name: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    };

    if (includeInventory) {
      include.inventoryItems = {
        include: {
          location: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      };
    }

    const variant = await prisma.productVariant.findUnique({
      where: { sku },
      include,
    });

    if (!variant) {
      throw new Error('Variant not found');
    }

    return variant;
  }

  /**
   * Get inventory for a variant
   */
  async getVariantInventory(variantId: string) {
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { variantId },
      include: {
        location: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
        variant: {
          select: {
            id: true,
            sku: true,
            variantName: true,
            product: {
              select: {
                id: true,
                productCode: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return inventoryItems;
  }

  /**
   * Get inventory by location
   */
  async getInventoryByLocation(locationId: string, variantId?: string) {
    const where: any = { locationId };
    if (variantId) where.variantId = variantId;

    const inventoryItems = await prisma.inventoryItem.findMany({
      where,
      include: {
        variant: {
          include: {
            product: {
              select: {
                id: true,
                productCode: true,
                name: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        location: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: [
        {
          variant: {
            product: {
              name: 'asc',
            },
          },
        },
      ],
    });

    return inventoryItems;
  }
}

export const productService = new ProductService();

