import { PrismaClient } from '@prisma/client';
import readline from 'node:readline';

const prisma = new PrismaClient();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * Parse user input array
 * Supports both JSON array format and comma-separated values
 */
function parseInput(input) {
  input = input.trim();
  
  // Clean up malformed quotes from PowerShell/Windows command line
  // Handle cases like: " 3111L\ -> 3111L
  // Remove trailing backslashes that escaped quotes
  input = input.replace(/\\+"/g, '"');  // \\" -> "
  input = input.replace(/\\+$/g, '');   // Remove trailing backslashes
  input = input.replace(/^\\+/g, '');   // Remove leading backslashes
  input = input.replace(/\\'/g, "'");   // \' -> '
  
  // Fix malformed quotes like: " 3111L\ -> 3111L
  input = input.replace(/"\s+([^"]+)\\/g, '"$1"');  // " text\ -> "text"
  input = input.replace(/\\"([^"]+)"\\/g, '"$1"'); // \"text"\ -> "text"
  
  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    // Not JSON, try comma-separated
  }
  
  // Try comma-separated values
  if (input.includes(',')) {
    return input.split(',').map(item => {
      let trimmed = item.trim();
      
      // Clean up malformed quotes and backslashes
      trimmed = trimmed.replace(/\\+$/g, '');  // Remove trailing backslashes
      trimmed = trimmed.replace(/^\\+/g, '');  // Remove leading backslashes
      
      // Remove surrounding quotes if present (handle both " and ')
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        trimmed = trimmed.slice(1, -1);
      } else if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
        trimmed = trimmed.slice(1, -1);
      }
      
      // Clean up any remaining quote fragments
      trimmed = trimmed.replace(/^["']+|["']+$/g, '');
      trimmed = trimmed.trim();
      
      // Try to parse as number
      if (!isNaN(trimmed) && trimmed !== '') {
        return trimmed.includes('.') ? parseFloat(trimmed) : parseInt(trimmed);
      }
      // Try to parse as boolean
      if (trimmed === 'true') return true;
      if (trimmed === 'false') return false;
      // Try to parse as null
      if (trimmed === 'null' || trimmed === '') return null;
      // Return as string
      return trimmed;
    });
  }
  
  // Single value - clean up and remove quotes if present
  input = input.replace(/\\+$/g, '');  // Remove trailing backslashes
  if ((input.startsWith('"') && input.endsWith('"')) ||
      (input.startsWith("'") && input.endsWith("'"))) {
    input = input.slice(1, -1);
  }
  
  return [input];
}

/**
 * Extract values from array based on TradeUnleashed stockQuery API format
 * Format: [id, name, sku, barCode, productId, onhand, committed, incoming, continueSelling, imageUrl]
 */
function extractValues(arr) {
  const values = {
    inventoryItemId: null,
    name: null,
    sku: null,
    barcode: null,
    productId: null,
    code: null
  };

  // TradeUnleashed stockQuery format: [id, name, sku, barCode, productId, ...]
  if (arr.length >= 10) {
    // Index 0: Inventory Item ID (externalId for variant)
    if (typeof arr[0] === 'number') {
      values.inventoryItemId = String(arr[0]);
    }

    // Index 1: Name
    if (typeof arr[1] === 'string' && arr[1]) {
      values.name = arr[1];
    }

    // Index 2: SKU
    if (typeof arr[2] === 'string' && arr[2]) {
      values.sku = arr[2];
      values.code = arr[2]; // Use SKU as code for productCode search
    }

    // Index 3: Barcode
    if (typeof arr[3] === 'string' && arr[3]) {
      values.barcode = arr[3];
    }

    // Index 4: Product ID (externalId for product)
    if (typeof arr[4] === 'number') {
      values.productId = String(arr[4]);
    }
  } else if (arr.length >= 5) {
    // Partial format: [id, name, sku, barcode, productId]
    if (typeof arr[0] === 'number') {
      values.inventoryItemId = String(arr[0]);
    }
    if (typeof arr[1] === 'string' && arr[1]) {
      values.name = arr[1];
    }
    if (typeof arr[2] === 'string' && arr[2]) {
      values.sku = arr[2];
      values.code = arr[2];
    }
    if (typeof arr[3] === 'string' && arr[3]) {
      values.barcode = arr[3];
    }
    if (typeof arr[4] === 'number') {
      values.productId = String(arr[4]);
    }
  } else if (arr.length >= 2) {
    // Simpler pattern: [id, sku, ...]
    if (typeof arr[0] === 'number') {
      values.inventoryItemId = String(arr[0]);
      values.productId = String(arr[0]);
    }
    if (typeof arr[1] === 'string' && arr[1]) {
      values.sku = arr[1];
      values.code = arr[1];
    }
  } else if (arr.length === 1) {
    // Single value - could be ID or SKU
    const val = arr[0];
    if (typeof val === 'number') {
      values.inventoryItemId = String(val);
      values.productId = String(val);
    } else if (typeof val === 'string') {
      values.sku = val;
      values.code = val;
    }
  }

  return values;
}

async function checkProduct(searchValues) {
  try {
    console.log('\n=== Searching for Product ===');
    console.log('Search criteria:');
    if (searchValues.inventoryItemId) console.log(`  - Inventory Item ID (externalId): ${searchValues.inventoryItemId}`);
    if (searchValues.productId) console.log(`  - Product ID (externalId): ${searchValues.productId}`);
    if (searchValues.sku) console.log(`  - SKU: ${searchValues.sku}`);
    if (searchValues.code) console.log(`  - Code: ${searchValues.code}`);
    if (searchValues.barcode) console.log(`  - Barcode: ${searchValues.barcode}`);
    console.log('');

    // Count totals
    const productCount = await prisma.product.count();
    const variantCount = await prisma.productVariant.count();
    const inventoryCount = await prisma.inventoryItem.count();

    console.log('=== Database Totals ===');
    console.log(`Products: ${productCount}`);
    console.log(`Variants: ${variantCount}`);
    console.log(`Inventory Items: ${inventoryCount}`);
    console.log('');

    let found = false;

    // 1. Search variant by externalId (inventory item ID)
    if (searchValues.inventoryItemId) {
      const variantByExtId = await prisma.productVariant.findFirst({
        where: {
          externalId: searchValues.inventoryItemId,
          externalSystem: 'tradeunleashed'
        },
        include: { 
          product: true,
          inventoryItems: {
            include: { location: true }
          }
        }
      });

      if (variantByExtId) {
        console.log('✅ FOUND Variant by externalId (inventory item ID):');
        console.log(JSON.stringify(variantByExtId, null, 2));
        found = true;
      } else {
        console.log(`❌ NOT FOUND Variant by externalId: ${searchValues.inventoryItemId}`);
      }
      console.log('');
    }

    // 2. Search by SKU
    if (searchValues.sku) {
      const variantBySku = await prisma.productVariant.findUnique({
        where: { sku: searchValues.sku },
        include: { 
          product: true,
          inventoryItems: {
            include: { location: true }
          }
        }
      });

      if (variantBySku) {
        console.log('✅ FOUND Variant by SKU:');
        console.log(JSON.stringify(variantBySku, null, 2));
        found = true;
      } else {
        console.log(`❌ NOT FOUND Variant by SKU: ${searchValues.sku}`);
      }
      console.log('');
    }

    // 3. Search by barcode
    if (searchValues.barcode) {
      const variantByBarcode = await prisma.productVariant.findFirst({
        where: { barcode: searchValues.barcode },
        include: { product: true }
      });

      if (variantByBarcode) {
        console.log('✅ FOUND Variant by barcode:');
        console.log(JSON.stringify(variantByBarcode, null, 2));
        found = true;
      } else {
        console.log(`❌ NOT FOUND Variant by barcode: ${searchValues.barcode}`);
      }
      console.log('');
    }

    // 4. Search product by externalId (product ID)
    if (searchValues.productId) {
      const productByExtId = await prisma.product.findFirst({
        where: {
          externalId: searchValues.productId,
          externalSystem: 'tradeunleashed'
        },
        include: {
          variants: {
            include: {
              inventoryItems: {
                include: { location: true }
              }
            }
          }
        }
      });

      if (productByExtId) {
        console.log('✅ FOUND Product by externalId (product ID):');
        console.log(JSON.stringify(productByExtId, null, 2));
        found = true;
      } else {
        console.log(`❌ NOT FOUND Product by externalId: ${searchValues.productId}`);
      }
      console.log('');
    }

    // 5. Search product by productCode
    if (searchValues.code) {
      const productByCode = await prisma.product.findUnique({
        where: { productCode: searchValues.code },
        include: {
          variants: {
            include: {
              inventoryItems: {
                include: { location: true }
              }
            }
          }
        }
      });

      if (productByCode) {
        console.log('✅ FOUND Product by productCode:');
        console.log(JSON.stringify(productByCode, null, 2));
        found = true;
      } else {
        console.log(`❌ NOT FOUND Product by productCode: ${searchValues.code}`);
      }
      console.log('');
    }

    // Summary
    console.log('=== Summary ===');
    if (found) {
      console.log('✅ Product/Variant EXISTS in database');
      console.log('');
      console.log('What this means:');
      console.log('  • The product/variant you searched for is present in the database');
      if (searchValues.inventoryItemId) {
        console.log(`  • Inventory Item ID ${searchValues.inventoryItemId} maps to a ProductVariant`);
      }
      if (searchValues.productId) {
        console.log(`  • Product ID ${searchValues.productId} maps to a Product`);
      }
      if (searchValues.sku) {
        console.log(`  • SKU "${searchValues.sku}" is assigned to a ProductVariant`);
      }
      console.log('  • You can use this product in sales orders');
      console.log('  • The variant ID from the search results can be used as variantId in lineItems');
    } else {
      console.log('❌ Product/Variant NOT FOUND in database');
      console.log('');
      console.log('What this means:');
      console.log('  • The product/variant you searched for does NOT exist in the database');
      console.log('  • You may need to sync this product from TradeUnleashed first');
      console.log('  • Check if the externalId mapping is correct');
      console.log('  • Verify the product was imported during the sync process');
    }
    console.log('');

  } catch (error) {
    console.error('Error:', error);
  }
}

async function main() {
  try {
    console.log('=== Product Checker ===');
    console.log('Enter product data as an array (JSON format or comma-separated)');
    console.log('');
    console.log('Examples:');
    console.log('  JSON: [359605, "3111L", null, "3111L", 359604, 0.0, 0.0, 0.0, null, null]');
    console.log('  CSV:  359605,3111L,,3111L,359604');
    console.log('  ID:   359605');
    console.log('  SKU:  "3111L"');
    console.log('');
    console.log('PowerShell Tip: Use single quotes to avoid escaping issues:');
    console.log('  npm run check-product \'[359605, "3111L", null, "3111L", 359604, 0.0, 0.0, 0.0, null, null]\'');
    console.log('');

    const input = await question('Enter product data: ');
    
    if (!input || input.trim() === '') {
      console.log('No input provided. Exiting...');
      rl.close();
      await prisma.$disconnect();
      return;
    }

    const parsedArray = parseInput(input);
    console.log('\nParsed input:', parsedArray);
    
    const searchValues = extractValues(parsedArray);
    console.log('Extracted search values:', searchValues);
    
    await checkProduct(searchValues);

    // Ask if user wants to check another product
    const again = await question('\nCheck another product? (y/n): ');
    if (again.toLowerCase() === 'y' || again.toLowerCase() === 'yes') {
      console.log('\n');
      await main(); // Recursive call
    } else {
      rl.close();
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Error:', error);
    rl.close();
    await prisma.$disconnect();
  }
}

// Check if running with command line arguments
if (process.argv.length > 2) {
  // Command line mode
  // Join all arguments, handling cases where JSON is split across args
  let input = process.argv.slice(2).join(' ');
  
  // Debug: Show raw input received
  console.log('=== Command Line Mode ===');
  console.log('Raw input received:', JSON.stringify(input));
  console.log('');
  console.log('Tip: If quotes are mangled, try using single quotes in PowerShell:');
  console.log('  npm run check-product \'[359605, "3111L", null, "3111L", 359604, 0.0, 0.0, 0.0, null, null]\'');
  console.log('');
  
  // If it looks like JSON but isn't properly quoted, try to reconstruct it
  if (input.startsWith('[') && !input.endsWith(']')) {
    // Might be split, try to join properly
    input = process.argv.slice(2).join(' ');
  }
  
  const parsedArray = parseInput(input);
  console.log('Parsed array:', parsedArray);
  console.log('');
  
  const searchValues = extractValues(parsedArray);
  
  checkProduct(searchValues)
    .then(() => prisma.$disconnect())
    .catch(error => {
      console.error('Error:', error);
      prisma.$disconnect();
    });
} else {
  // Interactive mode
  main();
}
