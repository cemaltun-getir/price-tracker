# External API Documentation

This document describes the external API endpoints available for accessing data from the Price Tracker application.

## Base URL
All endpoints are prefixed with `/api/external/`

## Available Endpoints

### 1. Locations
Detailed location information including province, district, region, demography, size, and domain.

**Get all locations:**
```
GET /api/external/locations
```

**Get single location:**
```
GET /api/external/locations/:id
```

**Response format:**
```json
{
  "id": "location_id",
  "name": "Location Name",
  "province": "Province Name",
  "district": "District Name",
  "region": "Region Name",
  "demography": "Demography Type",
  "size": "Size Category",
  "domain": "Domain Type"
}
```

### 2. Price Locations
Simple location names used for price mappings.

**Get all price locations:**
```
GET /api/external/price-locations
```

**Get single price location:**
```
GET /api/external/price-locations/:id
```

**Response format:**
```json
{
  "id": "price_location_id",
  "name": "Price Location Name",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

### 3. SKUs
Product information including name, brand, unit, category, subcategory, buying price details, and selling price.

**Get all SKUs:**
```
GET /api/external/skus
```

**Get single SKU:**
```
GET /api/external/skus/:id
```

**Response format:**
```json
{
  "id": "sku_id",
  "name": "Product Name",
  "image": "image_filename.jpg",
  "brand": "Brand Name",
  "unit": "Unit Type",
  "unit_value": "Unit Value",
  "category_id": "category_id",
  "category_name": "Category Name",
  "sub_category_id": "sub_category_id",
  "sub_category_name": "Sub Category Name",
  "kvi_label": "SKVI|KVI|Background (BG)|Foreground (FG)",
  "buying_price": 15.99,
  "buying_vat": 20.0,
  "buying_price_without_vat": 13.33,
  "selling_price": 19.99,
  "waste_price": 5.99,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

### 4. Vendors
Vendor information including name and logo.

**Get all vendors:**
```
GET /api/external/vendors
```

**Get single vendor:**
```
GET /api/external/vendors/:id
```

**Response format:**
```json
{
  "id": "vendor_id",
  "name": "Vendor Name",
  "logo": "logo_filename.jpg",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

### 5. Price Mappings
Price mapping information including SKU, vendor, location, price, and unit price.

**Get all price mappings:**
```
GET /api/external/price-mappings
```

**Get single price mapping:**
```
GET /api/external/price-mappings/:id
```

**Response format:**
```json
{
  "id": "price_mapping_id",
  "sku_id": "sku_id",
  "vendor_id": "vendor_id",
  "location_id": "location_id",
  "price": 15.99,
  "struck_price": 19.99,
  "is_discounted": true,
  "unit_price": 7.995,
  "currency": "USD",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z",
  "sku_name": "Product Name",
  "vendor_name": "Vendor Name",
  "location_name": "Location Name",
  "brand": "Brand Name",
  "unit": "kg",
  "unit_value": "2"
}
```

### 6. Categories
Category information including name and counts of sub-categories and SKUs.

**Get all categories:**
```
GET /api/external/categories
```

**Get single category:**
```
GET /api/external/categories/:id
```

**Response format:**
```json
{
  "id": "category_id",
  "name": "Category Name",
  "created_at": "2024-01-01T00:00:00.000Z",
  "sub_categories_count": 2,
  "skus_count": 5,
  "sub_categories": [
    {
      "id": "sub_category_id",
      "name": "Sub-Category Name",
      "created_at": "2024-01-01T00:00:00.000Z",
      "skus_count": 3
    }
  ]
}
```

### 7. Sub-Categories
Sub-category information including name, parent category, and SKU count.

**Get all sub-categories:**
```
GET /api/external/sub-categories
```

**Get sub-categories by category:**
```
GET /api/external/sub-categories?category_id=category_id_here
```

**Get single sub-category:**
```
GET /api/external/sub-categories/:id
```

**Response format:**
```json
{
  "id": "sub_category_id",
  "name": "Sub-Category Name",
  "category_id": "category_id",
  "category_name": "Category Name",
  "created_at": "2024-01-01T00:00:00.000Z",
  "skus_count": 3
}
```

### 8. All Data (Combined)
Get all data types in a single request.

**Get all data:**
```
GET /api/external/all
```

**Response format:**
```json
{
  "locations": [...],
  "price_locations": [...],
  "skus": [...],
  "vendors": [...],
  "price_mappings": [...],
  "categories": [...],
  "sub_categories": [...]
}
```

### 9. Warehouse Product Expiry Data
Get inventory data with expiry information for products across warehouses.

**Get warehouse product expiry data:**
```
GET /api/external/warehouse-product-expiry
```

**Response format:**
```json
[
  {
    "warehouse_id": "string",
    "warehouse_name": "string", 
    "sku_id": "string",
    "sku_name": "string",
    "category_id": "string",
    "category_name": "string",
    "quantity_on_hand": "number",
    "days_until_expiry": "number",
    "expiry_date": "string (ISO date)"
  }
]
```

**Features:**
- Returns ALL inventory with expiry dates (frontend will filter)
- Includes products from all warehouses
- Sorted by days_until_expiry (ascending) for critical items first
- Real-time data (fetch on each request)
- Days until expiry calculated dynamically

### 10. Waste Price Update
Update waste price for a specific SKU from external sources.

**Update waste price:**
```
POST /api/external/waste-price
```

**Request body:**
```json
{
  "sku_id": "string",
  "warehouse_id": "string",
  "waste_price": "number", 
  "user_id": "string",
  "applied_at": "ISO 8601 timestamp"
}
```

**Response format:**
```json
{
  "message": "Waste price updated successfully",
  "sku_id": "string",
  "warehouse_id": "string",
  "waste_price": "number",
  "applied_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp"
}
```

**Validation:**
- All fields are required
- `waste_price` must be a non-negative number
- `applied_at` must be a valid ISO 8601 timestamp
- `sku_id` must reference an existing SKU
- `warehouse_id` must reference an existing warehouse (Location or SimpleLocation)

**Error responses:**
- `400` - Missing required fields or invalid data
- `404` - SKU or warehouse not found
- `500` - Server error

## Usage Examples

### JavaScript/Fetch
```javascript
// Get all locations
const response = await fetch('/api/external/locations');
const locations = await response.json();

// Get specific SKU
const skuResponse = await fetch('/api/external/skus/sku_id_here');
const sku = await skuResponse.json();

// Get all price mappings
const priceMappingsResponse = await fetch('/api/external/price-mappings');
const priceMappings = await priceMappingsResponse.json();

// Get specific price mapping
const priceMappingResponse = await fetch('/api/external/price-mappings/price_mapping_id_here');
const priceMapping = await priceMappingResponse.json();

// Get all categories
const categoriesResponse = await fetch('/api/external/categories');
const categories = await categoriesResponse.json();

// Get specific category
const categoryResponse = await fetch('/api/external/categories/category_id_here');
const category = await categoryResponse.json();

// Get all sub-categories
const subCategoriesResponse = await fetch('/api/external/sub-categories');
const subCategories = await subCategoriesResponse.json();

// Get sub-categories by category
const subCategoriesByCategoryResponse = await fetch('/api/external/sub-categories?category_id=category_id_here');
const subCategoriesByCategory = await subCategoriesByCategoryResponse.json();

// Get specific sub-category
const subCategoryResponse = await fetch('/api/external/sub-categories/sub_category_id_here');
const subCategory = await subCategoryResponse.json();

// Get all data at once
const allDataResponse = await fetch('/api/external/all');
const allData = await allDataResponse.json();

// Get warehouse product expiry data
const expiryResponse = await fetch('/api/external/warehouse-product-expiry');
const expiryData = await expiryResponse.json();

// Update waste price
const wastePrice = {
  sku_id: "sku_id_here",
  warehouse_id: "warehouse_id_here",
  waste_price: 5.99,
  user_id: "user_id_here",
  applied_at: new Date().toISOString()
};
const wastePriceResponse = await fetch('/api/external/waste-price', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(wastePrice)
});
const wastePriceResult = await wastePriceResponse.json();
```

### cURL
```bash
# Get all vendors
curl -X GET http://localhost:3001/api/external/vendors

# Get specific price location
curl -X GET http://localhost:3001/api/external/price-locations/price_location_id_here

# Get all price mappings
curl -X GET http://localhost:3001/api/external/price-mappings

# Get specific price mapping
curl -X GET http://localhost:3001/api/external/price-mappings/price_mapping_id_here

# Get all categories
curl -X GET http://localhost:3001/api/external/categories

# Get specific category
curl -X GET http://localhost:3001/api/external/categories/category_id_here

# Get all sub-categories
curl -X GET http://localhost:3001/api/external/sub-categories

# Get sub-categories by category
curl -X GET "http://localhost:3001/api/external/sub-categories?category_id=category_id_here"

# Get specific sub-category
curl -X GET http://localhost:3001/api/external/sub-categories/sub_category_id_here

# Get all data
curl -X GET http://localhost:3001/api/external/all

# Get warehouse product expiry data
curl -X GET http://localhost:3001/api/external/warehouse-product-expiry

# Update waste price
curl -X POST http://localhost:3001/api/external/waste-price \
  -H "Content-Type: application/json" \
  -d '{
    "sku_id": "sku_id_here",
    "warehouse_id": "warehouse_id_here",
    "waste_price": 5.99,
    "user_id": "user_id_here",
    "applied_at": "2024-01-01T12:00:00.000Z"
  }'
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `404` - Resource not found
- `500` - Server error

Error responses include an error message:
```json
{
  "error": "Error description"
}
```

## Notes

- All IDs are returned as strings (MongoDB ObjectId converted to string)
- Dates are returned in ISO 8601 format
- Image and logo fields contain filenames, not full URLs
- The `/api/external/all` endpoint is useful for initial data loading or synchronization
- All endpoints support CORS for cross-origin requests 

# External API Documentation

## Overview

This document describes the external APIs used by the project.

## API Endpoints

- `/api/locations` - Retrieves a list of locations.
  - Method: GET
  - Response: JSON array of location objects.

## Usage

Ensure the server is running before making API requests.

## Notes

- All API requests should handle errors gracefully.
- Authentication is not required for the current endpoints.
