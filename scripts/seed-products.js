/**
 * Script to seed products with variants and inventory
 * 
 * Usage:
 *   node scripts/seed-products.js
 * 
 * This script uses Prisma directly to create products, variants, and inventory items.
 * It will:
 * 1. Fetch existing categories, brands, suppliers, and locations
 * 2. Create or find brands and suppliers
 * 3. Create products with proper category assignments
 * 4. Create variants for each product
 * 5. Create inventory items for each variant at specified locations
 */

import { PrismaClient } from '@prisma/client';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

async function findOrCreateBrand(name, contactInfo = null) {
  let brand = await prisma.brand.findUnique({
    where: { name },
  });

  if (!brand) {
    brand = await prisma.brand.create({
      data: {
        name,
        contactInfo,
      },
    });
    console.log(`   ✅ Created brand: ${name}`);
  } else {
    console.log(`   ℹ️  Found existing brand: ${name}`);
  }

  return brand;
}

async function findOrCreateSupplier(name, contactInfo = null, email = null, phone = null, address = null) {
  let supplier = await prisma.supplier.findUnique({
    where: { name },
  });

  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: {
        name,
        contactInfo,
        email,
        phone,
        address,
      },
    });
    console.log(`   ✅ Created supplier: ${name}`);
  } else {
    console.log(`   ℹ️  Found existing supplier: ${name}`);
  }

  return supplier;
}

async function findCategoryByName(categoryName) {
  // First try to find in subcategories
  let category = await prisma.category.findFirst({
    where: {
      name: categoryName,
      parentCategoryId: { not: null }, // Subcategory
    },
  });

  // If not found, try parent categories
  if (!category) {
    category = await prisma.category.findFirst({
      where: {
        name: categoryName,
        parentCategoryId: null, // Parent category
      },
    });
  }

  return category;
}

async function findLocationByCode(locationCode) {
  return await prisma.location.findUnique({
    where: { code: locationCode },
  });
}

async function createOrGetLocation(code, name = null) {
  let location = await findLocationByCode(code);

  if (!location) {
    location = await prisma.location.create({
      data: {
        code,
        name: name || code,
        type: 'Store',
        isActive: true,
      },
    });
    console.log(`   ✅ Created location: ${code}`);
  } else {
    console.log(`   ℹ️  Found existing location: ${code}`);
  }

  return location;
}

async function seedProducts() {
  try {
    console.log('\n📦 Seeding products with variants and inventory...\n');

    // Read products data
    const productsPath = join(__dirname, '../demo-data/products-with-variants.json');
    const productsData = await readFile(productsPath, 'utf-8');
    const data = JSON.parse(productsData);

    // Ensure default location exists
    console.log('Step 1: Setting up locations...\n');
    const defaultLocation = await createOrGetLocation('MAIN-STORE', 'Main Store');
    console.log('');

    let totalProducts = 0;
    let totalVariants = 0;
    let totalInventoryItems = 0;
    let successfulProducts = 0;
    let successfulVariants = 0;
    let successfulInventory = 0;

    console.log('Step 2: Creating products, variants, and inventory...\n');

    for (const productData of data.products) {
      totalProducts++;
      console.log(`\n📱 Processing: ${productData.name}`);

      try {
        // Find or create brand
        const brand = productData.brandName
          ? await findOrCreateBrand(productData.brandName)
          : null;

        // Find or create supplier
        const supplier = productData.supplierName
          ? await findOrCreateSupplier(productData.supplierName)
          : null;

        // Find category
        const category = productData.categoryName
          ? await findCategoryByName(productData.categoryName)
          : null;

        if (!category) {
          console.error(`   ❌ Category "${productData.categoryName}" not found. Skipping product.`);
          continue;
        }

        // Check if product already exists
        let product = await prisma.product.findUnique({
          where: { productCode: productData.productCode },
        });

        if (product) {
          console.log(`   ℹ️  Product already exists: ${productData.productCode}`);
          product = await prisma.product.update({
            where: { productCode: productData.productCode },
            data: {
              name: productData.name,
              description: productData.description,
              categoryId: category.id,
              brandId: brand?.id,
              supplierId: supplier?.id,
              hasVariants: productData.hasVariants,
              trackInventory: productData.trackInventory,
              isTaxable: productData.isTaxable,
              images: productData.images || [],
              tags: productData.tags || [],
            },
          });
        } else {
          // Create product
          product = await prisma.product.create({
            data: {
              productCode: productData.productCode,
              name: productData.name,
              description: productData.description,
              categoryId: category.id,
              brandId: brand?.id,
              supplierId: supplier?.id,
              hasVariants: productData.hasVariants,
              trackInventory: productData.trackInventory,
              isTaxable: productData.isTaxable,
              images: productData.images || [],
              tags: productData.tags || [],
            },
          });
          console.log(`   ✅ Created product: ${productData.name}`);
        }

        successfulProducts++;

        // Create variants
        if (productData.variants && productData.variants.length > 0) {
          console.log(`   Creating ${productData.variants.length} variant(s)...`);

          for (let i = 0; i < productData.variants.length; i++) {
            const variantData = productData.variants[i];
            totalVariants++;

            try {
              // Check if variant already exists
              let variant = await prisma.productVariant.findUnique({
                where: { sku: variantData.sku },
              });

              if (variant) {
                console.log(`      ℹ️  Variant already exists: ${variantData.sku}`);
                variant = await prisma.productVariant.update({
                  where: { sku: variantData.sku },
                  data: {
                    productId: product.id,
                    variantName: variantData.variantName,
                    barcode: variantData.barcode || null,
                    upc: variantData.upc || null,
                    options: variantData.options || null,
                    retailPrice: variantData.retailPrice,
                    wholesalePrice: variantData.wholesalePrice || null,
                    cost: variantData.cost || null,
                    compareAtPrice: variantData.compareAtPrice || null,
                    weight: variantData.weight || null,
                    dimensions: variantData.dimensions || null,
                    image: variantData.image || null,
                    position: i,
                  },
                });
              } else {
                variant = await prisma.productVariant.create({
                  data: {
                    productId: product.id,
                    sku: variantData.sku,
                    barcode: variantData.barcode || null,
                    upc: variantData.upc || null,
                    variantName: variantData.variantName,
                    options: variantData.options || null,
                    retailPrice: variantData.retailPrice,
                    wholesalePrice: variantData.wholesalePrice || null,
                    cost: variantData.cost || null,
                    compareAtPrice: variantData.compareAtPrice || null,
                    weight: variantData.weight || null,
                    dimensions: variantData.dimensions || null,
                    image: variantData.image || null,
                    position: i,
                  },
                });
                console.log(`      ✅ Created variant: ${variantData.variantName} (${variantData.sku})`);
              }

              successfulVariants++;

              // Create inventory items
              if (productData.inventory && productData.inventory.length > 0) {
                for (const inventoryData of productData.inventory) {
                  const location = await findLocationByCode(inventoryData.locationCode) || defaultLocation;

                  // Check if inventory item already exists
                  const existingInventory = await prisma.inventoryItem.findUnique({
                    where: {
                      variantId_locationId: {
                        variantId: variant.id,
                        locationId: location.id,
                      },
                    },
                  });

                  if (existingInventory) {
                    // Update existing inventory
                    await prisma.inventoryItem.update({
                      where: {
                        variantId_locationId: {
                          variantId: variant.id,
                          locationId: location.id,
                        },
                      },
                      data: {
                        quantityOnHand: inventoryData.quantityOnHand,
                        quantityAvailable: inventoryData.quantityAvailable,
                        quantityCommitted: inventoryData.quantityCommitted || 0,
                        quantityIncoming: inventoryData.quantityIncoming || 0,
                        reorderPoint: inventoryData.reorderPoint || null,
                        reorderQuantity: inventoryData.reorderQuantity || null,
                      },
                    });
                    console.log(`         ℹ️  Updated inventory at ${location.code}`);
                  } else {
                    // Create new inventory item
                    await prisma.inventoryItem.create({
                      data: {
                        variantId: variant.id,
                        locationId: location.id,
                        quantityOnHand: inventoryData.quantityOnHand,
                        quantityAvailable: inventoryData.quantityAvailable,
                        quantityCommitted: inventoryData.quantityCommitted || 0,
                        quantityIncoming: inventoryData.quantityIncoming || 0,
                        reorderPoint: inventoryData.reorderPoint || null,
                        reorderQuantity: inventoryData.reorderQuantity || null,
                      },
                    });
                    console.log(`         ✅ Created inventory at ${location.code}: ${inventoryData.quantityOnHand} units`);
                    successfulInventory++;
                  }
                  totalInventoryItems++;
                }
              }
            } catch (error) {
              console.error(`      ❌ Error creating variant ${variantData.sku}:`, error.message);
            }
          }
        }
      } catch (error) {
        console.error(`   ❌ Error creating product ${productData.name}:`, error.message);
      }
    }

    // Summary
    console.log(`\n\n📊 Summary:`);
    console.log(`   Products:`);
    console.log(`      ✅ Successful: ${successfulProducts}/${totalProducts}`);
    console.log(`   Variants:`);
    console.log(`      ✅ Successful: ${successfulVariants}/${totalVariants}`);
    console.log(`   Inventory Items:`);
    console.log(`      ✅ Successful: ${successfulInventory}/${totalInventoryItems}`);
    console.log(`   📦 Total Created:`);
    console.log(`      Products: ${successfulProducts}`);
    console.log(`      Variants: ${successfulVariants}`);
    console.log(`      Inventory Items: ${successfulInventory}\n`);

  } catch (error) {
    console.error('Error reading products file:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedProducts().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

