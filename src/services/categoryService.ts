import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateCategoryInput {
  id?: string; // Optional: if provided, will update existing category
  name: string;
  parentCategoryId?: string | null;
  description?: string | null;
  image?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  parentCategoryId?: string | null;
  description?: string | null;
  image?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export class CategoryService {
  /**
   * Create or update a category (PUT operation)
   * If id is provided, updates existing category; otherwise creates new one
   */
  async createOrUpdateCategory(input: CreateCategoryInput) {
    // Validate parent category if provided
    if (input.parentCategoryId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: input.parentCategoryId },
      });

      if (!parentCategory) {
        throw new Error('Parent category not found');
      }

      // Prevent circular reference (category cannot be its own parent)
      if (input.id && input.id === input.parentCategoryId) {
        throw new Error('Category cannot be its own parent');
      }
    }

    // If id is provided, update existing category
    if (input.id) {
      const existingCategory = await prisma.category.findUnique({
        where: { id: input.id },
      });

      if (!existingCategory) {
        throw new Error('Category not found');
      }

      // Check for circular reference in hierarchy
      if (input.parentCategoryId) {
        const wouldCreateCycle = await this.wouldCreateCycle(
          input.id,
          input.parentCategoryId
        );
        if (wouldCreateCycle) {
          throw new Error('Cannot set parent category: would create circular reference');
        }
      }

      const category = await prisma.category.update({
        where: { id: input.id },
        data: {
          name: input.name,
          parentCategoryId: input.parentCategoryId ?? null,
          description: input.description ?? null,
          image: input.image ?? null,
          sortOrder: input.sortOrder ?? existingCategory.sortOrder,
          isActive: input.isActive ?? existingCategory.isActive,
        },
        include: {
          parentCategory: true,
          childCategories: true,
          _count: {
            select: {
              products: true,
            },
          },
        },
      });

      return category;
    }

    // Create new category
    const category = await prisma.category.create({
      data: {
        name: input.name,
        parentCategoryId: input.parentCategoryId ?? null,
        description: input.description ?? null,
        image: input.image ?? null,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
      },
      include: {
        parentCategory: true,
        childCategories: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return category;
  }

  /**
   * Get all categories
   */
  async getAllCategories(includeInactive: boolean = false) {
    const where = includeInactive ? {} : { isActive: true };

    const categories = await prisma.category.findMany({
      where,
      include: {
        parentCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        childCategories: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return categories;
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parentCategory: true,
        childCategories: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    return category;
  }

  /**
   * Check if setting a parent category would create a circular reference
   */
  private async wouldCreateCycle(
    categoryId: string,
    newParentId: string
  ): Promise<boolean> {
    // If the new parent is the category itself, it's a cycle
    if (categoryId === newParentId) {
      return true;
    }

    // Check if the new parent is a descendant of the category
    let currentParentId: string | null = newParentId;
    const visited = new Set<string>();

    while (currentParentId) {
      if (visited.has(currentParentId)) {
        // Already visited, potential cycle
        return true;
      }

      if (currentParentId === categoryId) {
        // Found the category in the parent chain, would create cycle
        return true;
      }

      visited.add(currentParentId);

      const parent: { parentCategoryId: string | null } | null = await prisma.category.findUnique({
        where: { id: currentParentId },
        select: { parentCategoryId: true },
      });

      currentParentId = parent?.parentCategoryId ?? null;
    }

    return false;
  }
}

export const categoryService = new CategoryService();

