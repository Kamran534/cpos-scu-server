/**
 * Script to seed demo categories into the database
 * 
 * Usage:
 *   node scripts/seed-categories.js <jwt-token>
 * 
 * Or set JWT_TOKEN environment variable:
 *   JWT_TOKEN=your-token node scripts/seed-categories.js
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_URL = process.env.API_URL || 'http://localhost:4000/api/categories';
const JWT_TOKEN = process.argv[2] || process.env.JWT_TOKEN;

if (!JWT_TOKEN) {
  console.error('Error: JWT token is required');
  console.error('Usage: node scripts/seed-categories.js <jwt-token>');
  console.error('   Or: JWT_TOKEN=your-token node scripts/seed-categories.js');
  process.exit(1);
}

async function seedCategories() {
  try {
    // Read the categories file
    const categoriesPath = join(__dirname, '../demo-data/categories.json');
    const categoriesData = await readFile(categoriesPath, 'utf-8');
    const categories = JSON.parse(categoriesData);

    console.log(`\n📦 Seeding ${categories.length} categories...\n`);

    const results = [];
    
    for (const category of categories) {
      try {
        const response = await fetch(API_URL, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${JWT_TOKEN}`,
          },
          body: JSON.stringify(category),
        });

        const result = await response.json();

        if (result.success) {
          console.log(`✅ Created: ${category.name} (ID: ${result.data.id})`);
          results.push({ success: true, category: category.name, data: result.data });
        } else {
          console.error(`❌ Failed: ${category.name} - ${result.error}`);
          results.push({ success: false, category: category.name, error: result.error });
        }
      } catch (error) {
        console.error(`❌ Error creating ${category.name}:`, error.message);
        results.push({ success: false, category: category.name, error: error.message });
      }

      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📦 Total: ${categories.length}\n`);

    if (failed > 0) {
      console.log('Failed categories:');
      results
        .filter(r => !r.success)
        .forEach(r => console.log(`   - ${r.category}: ${r.error}`));
    }

  } catch (error) {
    console.error('Error reading categories file:', error.message);
    process.exit(1);
  }
}

seedCategories();

