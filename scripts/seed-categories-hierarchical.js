/**
 * Script to seed hierarchical categories (parent categories with subcategories)
 * 
 * Usage:
 *   node scripts/seed-categories-hierarchical.js <jwt-token>
 *   node scripts/seed-categories-hierarchical.js --login <email> <password>
 * 
 * Or set environment variables:
 *   JWT_TOKEN=your-token node scripts/seed-categories-hierarchical.js
 *   LOGIN_EMAIL=email LOGIN_PASSWORD=password node scripts/seed-categories-hierarchical.js
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const CATEGORIES_API_URL = `${BASE_URL}/api/categories`;
const LOGIN_API_URL = `${BASE_URL}/api/auth/login`;

let JWT_TOKEN = process.argv[2] || process.env.JWT_TOKEN;

// Check if login mode is requested
const isLoginMode = process.argv[2] === '--login' || process.env.LOGIN_EMAIL;

async function login(email, password) {
  try {
    console.log(`\n🔐 Logging in with email: ${email}...\n`);
    
    const response = await fetch(LOGIN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (result.success && result.data?.token) {
      console.log(`✅ Login successful!\n`);
      return result.data.token;
    } else {
      throw new Error(result.error || 'Login failed');
    }
  } catch (error) {
    console.error(`❌ Login error: ${error.message}`);
    throw error;
  }
}

// Main execution function
async function main() {
  // Handle login if needed
  if (isLoginMode) {
    const email = process.argv[3] || process.env.LOGIN_EMAIL;
    const password = process.argv[4] || process.env.LOGIN_PASSWORD;

    if (!email || !password) {
      console.error('Error: Email and password are required for login');
      console.error('Usage: node scripts/seed-categories-hierarchical.js --login <email> <password>');
      console.error('   Or: LOGIN_EMAIL=email LOGIN_PASSWORD=password node scripts/seed-categories-hierarchical.js');
      process.exit(1);
    }

    // Login and get token
    JWT_TOKEN = await login(email, password);
  } else if (!JWT_TOKEN) {
    console.error('Error: JWT token is required');
    console.error('Usage options:');
    console.error('  1. node scripts/seed-categories-hierarchical.js <jwt-token>');
    console.error('  2. node scripts/seed-categories-hierarchical.js --login <email> <password>');
    console.error('  3. JWT_TOKEN=your-token node scripts/seed-categories-hierarchical.js');
    console.error('  4. LOGIN_EMAIL=email LOGIN_PASSWORD=password node scripts/seed-categories-hierarchical.js');
    process.exit(1);
  }

  // Now run the seeding
  await seedHierarchicalCategories();
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

async function createCategory(category, parentId = null) {
  const categoryData = {
    ...category,
    ...(parentId && { parentCategoryId: parentId }),
  };

  const response = await fetch(CATEGORIES_API_URL, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${JWT_TOKEN}`,
    },
    body: JSON.stringify(categoryData),
  });

  const result = await response.json();
  return result;
}

async function seedHierarchicalCategories() {
  try {
    // Read the categories file
    const categoriesPath = join(__dirname, '../demo-data/categories-hierarchical.json');
    const categoriesData = await readFile(categoriesPath, 'utf-8');
    const data = JSON.parse(categoriesData);

    console.log(`\n📦 Seeding hierarchical categories...\n`);
    console.log(`   Step 1: Creating ${data.parentCategories.length} parent categories...\n`);

    // Step 1: Create all parent categories
    const parentCategoryMap = new Map(); // Map to store parent name -> parent ID

    for (const parentCategory of data.parentCategories) {
      try {
        const result = await createCategory(parentCategory);

        if (result.success) {
          parentCategoryMap.set(parentCategory.name, result.data.id);
          console.log(`✅ Created parent: ${parentCategory.name} (ID: ${result.data.id})`);
        } else {
          console.error(`❌ Failed to create parent ${parentCategory.name}: ${result.error}`);
        }
      } catch (error) {
        console.error(`❌ Error creating parent ${parentCategory.name}:`, error.message);
      }

      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n   Step 2: Creating subcategories...\n`);

    // Step 2: Create subcategories with parent references
    let totalSubcategories = 0;
    let successfulSubcategories = 0;
    let failedSubcategories = 0;

    for (const [parentName, subCategories] of Object.entries(data.subCategories)) {
      const parentId = parentCategoryMap.get(parentName);

      if (!parentId) {
        console.error(`⚠️  Parent category "${parentName}" not found, skipping subcategories`);
        continue;
      }

      console.log(`   Creating subcategories for "${parentName}":`);

      for (const subCategory of subCategories) {
        totalSubcategories++;
        try {
          const result = await createCategory(subCategory, parentId);

          if (result.success) {
            successfulSubcategories++;
            console.log(`   ✅ ${subCategory.name}`);
          } else {
            failedSubcategories++;
            console.error(`   ❌ ${subCategory.name}: ${result.error}`);
          }
        } catch (error) {
          failedSubcategories++;
          console.error(`   ❌ ${subCategory.name}: ${error.message}`);
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      console.log('');
    }

    // Summary
    const totalParents = data.parentCategories.length;
    const successfulParents = parentCategoryMap.size;

    console.log(`\n📊 Summary:`);
    console.log(`   Parent Categories:`);
    console.log(`      ✅ Successful: ${successfulParents}/${totalParents}`);
    console.log(`   Subcategories:`);
    console.log(`      ✅ Successful: ${successfulSubcategories}/${totalSubcategories}`);
    console.log(`      ❌ Failed: ${failedSubcategories}`);
    console.log(`   📦 Total Categories Created: ${successfulParents + successfulSubcategories}\n`);

  } catch (error) {
    console.error('Error reading categories file:', error.message);
    process.exit(1);
  }
}

