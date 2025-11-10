# Demo Category Data

This folder contains demo data for testing the Category API endpoints.

## Files

- `categories.json` - 10 simple categories (flat structure, no hierarchy)
- `categories-hierarchical.json` - **Recommended** - Proper hierarchical structure with parent categories and subcategories
  - 6 parent categories (Electronics, Clothing, Home & Kitchen, Sports, Health & Beauty, Food & Beverages)
  - 30+ subcategories organized under their parent categories

## Usage

### Using Swagger UI

1. Go to `http://localhost:4000/api-docs`
2. Authorize with your JWT token
3. Navigate to `PUT /api/categories`
4. Copy one of the category objects from the JSON files
5. Paste it into the request body
6. Click "Execute"

### Using cURL

```bash
# First, get your JWT token from login
TOKEN="your-jwt-token-here"

# Create a category
curl -X PUT http://localhost:4000/api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Electronics",
    "description": "Electronic devices and accessories",
    "sortOrder": 1,
    "isActive": true
  }'
```

### Using the Hierarchical Seed Script (Recommended)

For proper hierarchical categories with parent-child relationships:

```bash
# First, login to get your JWT token
# Then run:
node scripts/seed-categories-hierarchical.js your-jwt-token-here

# Or set as environment variable:
JWT_TOKEN=your-token node scripts/seed-categories-hierarchical.js
```

This script will:
1. First create all parent categories (Electronics, Clothing, etc.)
2. Then create subcategories under each parent (Smartphones under Electronics, etc.)

### Using the Simple Seed Script

For flat categories without hierarchy:

```bash
node scripts/seed-categories.js your-jwt-token-here
```

### Using a Custom Script

You can also create your own script to bulk insert categories. Here's an example using Node.js:

```javascript
import fetch from 'node-fetch';

const API_URL = 'http://localhost:4000/api/categories';
const TOKEN = 'your-jwt-token-here';
const categories = [
  // Copy categories from categories.json
];

for (const category of categories) {
  const response = await fetch(API_URL, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify(category)
  });
  
  const result = await response.json();
  console.log(`Created: ${category.name}`, result);
}
```

## Category Structure

Each category object can have the following fields:

- `id` (optional): Category ID. If provided, updates existing category; otherwise creates new one
- `name` (required): Category name
- `parentCategoryId` (optional): ID of parent category for hierarchical structure
- `description` (optional): Category description
- `image` (optional): Image URL or path
- `sortOrder` (optional): Sort order for display (default: 0)
- `isActive` (optional): Whether category is active (default: true)

## Notes

- When creating categories with `parentCategoryId`, make sure the parent category exists first
- The `id` field is optional for creation - the server will generate a UUID if not provided
- Categories are sorted by `sortOrder` first, then by `name`

