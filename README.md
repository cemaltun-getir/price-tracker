# Price Tracker System

A comprehensive web application for managing SKUs, vendors, locations, and price mappings with Excel upload functionality.

## Features

### SKU Management
- Create SKUs with name, brand, unit type, unit value, and images
- Support for various units (piece, kg, liters, grams, ml, pounds, ounces)
- Image upload and display functionality
- Buying price and VAT management with automatic calculation of price without VAT
- Full CRUD operations (Create, Read, Update, Delete)

### Vendor Management
- Manage vendor information with name and logo
- Logo upload and display
- Clean vendor listing with visual cards

### Location Management
- Manage geographical locations with district name and country
- Simple and efficient location tracking

### Price Mapping
- Link SKUs with vendors in specific locations
- Set prices with currency support (USD, EUR, GBP, TRY)
- Manual price entry via intuitive UI
- Bulk Excel upload for price data
- Automatic duplicate handling (updates existing mappings)

### Dashboard
- Overview statistics for all entities
- Recent price mappings display
- Visual charts and metrics

### Excel Upload
- Support for bulk price data upload
- Required columns: sku_name, vendor_name, district_name, country, price, currency
- Error reporting and success tracking
- Validation and data integrity checks

## Technology Stack

### Backend
- **Node.js** with Express.js
- **SQLite** database for data storage
- **Multer** for file uploads (images and Excel files)
- **xlsx** library for Excel file processing
- **CORS** for cross-origin requests

### Frontend
- **React** with functional components and hooks
- **React Router** for navigation
- **Tailwind CSS** for modern, responsive styling
- **Axios** for API communication

## Project Structure

```
price-tracker/
├── package.json                    # Root package.json with development scripts
├── server/                         # Backend application
│   ├── package.json               # Server dependencies
│   ├── index.js                   # Main server file with API routes
│   ├── price_tracker.db           # SQLite database (created automatically)
│   └── uploads/                   # File uploads directory
│       ├── images/                # SKU images
│       └── logos/                 # Vendor logos
├── client/                        # Frontend React application
│   ├── package.json              # Client dependencies
│   ├── public/
│   │   └── index.html             # HTML template
│   ├── src/
│   │   ├── App.js                 # Main React component with routing
│   │   ├── index.js               # React app entry point
│   │   ├── index.css              # Tailwind CSS imports
│   │   ├── services/
│   │   │   └── api.js             # API service layer
│   │   └── components/
│   │       ├── Dashboard.js        # Dashboard with statistics
│   │       ├── SKUManager.js       # SKU management component
│   │       ├── VendorManager.js    # Vendor management component
│   │       ├── LocationManager.js  # Location management component
│   │       └── PriceMappingManager.js # Price mapping with Excel upload
│   ├── tailwind.config.js         # Tailwind CSS configuration
│   └── postcss.config.js          # PostCSS configuration
└── README.md                      # This file
```

## Setup Instructions

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn package manager

### Installation

1. **Clone or download the project**
   ```bash
   # If you have the project files, navigate to the project directory
   cd price-tracker
   ```

2. **Install all dependencies**
   ```bash
   # Install root dependencies and both server and client dependencies
   npm run install-all
   ```

3. **Start the development servers**
   ```bash
   # This will start both backend (port 3001) and frontend (port 3000) concurrently
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### Alternative Manual Setup

If the automated installation doesn't work, you can set up manually:

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..

# Install client dependencies
cd client
npm install
cd ..
```

Then start the servers separately:

```bash
# Terminal 1 - Start the backend server
cd server
npm run dev

# Terminal 2 - Start the frontend client
cd client
npm start
```

## Database

The application uses SQLite for data storage. The database file (`price_tracker.db`) is created automatically in the server directory when you first run the application.

### Database Schema

- **skus**: id, name, image, brand, unit, unit_value, buying_price, buying_vat, buying_price_without_vat, created_at
- **vendors**: id, name, logo, created_at
- **locations**: id, district_name, country, created_at
- **price_mappings**: id, sku_id, vendor_id, location_id, price, currency, created_at, updated_at

## Usage Guide

### 1. Setting Up Your Data

1. **Create SKUs**
   - Navigate to the SKUs section
   - Click "Add New SKU"
   - Fill in the product details (name, brand, unit, unit value)
   - Optionally upload a product image
   - Save the SKU

2. **Add Vendors**
   - Go to the Vendors section
   - Click "Add New Vendor"
   - Enter vendor name and optionally upload a logo
   - Save the vendor

3. **Create Locations**
   - Navigate to Locations
   - Click "Add New Location"
   - Enter district name and country
   - Save the location

### 2. Managing Prices

#### Manual Price Entry
1. Go to Price Mappings
2. Click "Add Price Mapping"
3. Select SKU, Vendor, and Location from dropdowns
4. Enter the price and select currency
5. Save the mapping

#### Excel Upload
1. Prepare an Excel file with columns:
   - `sku_id`: Database ID of the SKU (use the "Copy ID" button in SKU Management)
   - `vendor_id`: Database ID of the vendor (use the "Copy ID" button in Vendor Management)
   - `location_id`: Database ID of the location (use the "Copy ID" button in Location Management)
   - `price`: Numeric price value
   - `currency`: Currency code (USD, EUR, GBP, TRY)

2. Go to Price Mappings and click "Upload Excel"
3. Select your Excel file and upload
4. Review the upload results for any errors

#### Finding Entity IDs

To get the IDs needed for Excel import:
1. Go to SKU Management, Vendor Management, or Location Management
2. Find the entity you want to reference
3. Click the "Copy ID" button next to the Edit/Delete buttons
4. The ID will be copied to your clipboard and the button will show "Copied!" confirmation
5. Paste the ID into your Excel file

### 3. Viewing Data

- **Dashboard**: Overview of all your data with statistics and recent price mappings
- **Individual Sections**: Detailed views for SKUs, Vendors, Locations, and Price Mappings
- **Search and Filter**: Use the interface to find specific items

## API Endpoints

### SKUs
- `GET /api/skus` - Get all SKUs
- `POST /api/skus` - Create new SKU (with image upload)
- `PUT /api/skus/:id` - Update SKU
- `DELETE /api/skus/:id` - Delete SKU

### Vendors
- `GET /api/vendors` - Get all vendors
- `POST /api/vendors` - Create new vendor (with logo upload)
- `PUT /api/vendors/:id` - Update vendor
- `DELETE /api/vendors/:id` - Delete vendor

### Locations
- `GET /api/locations` - Get all locations
- `POST /api/locations` - Create new location
- `PUT /api/locations/:id` - Update location
- `DELETE /api/locations/:id` - Delete location

### Price Mappings
- `GET /api/price-mappings` - Get all price mappings with joined data
- `POST /api/price-mappings` - Create or update price mapping
- `DELETE /api/price-mappings/:id` - Delete price mapping
- `POST /api/upload-excel` - Upload Excel file for bulk price import

## File Storage

- **SKU Images**: Stored in `server/uploads/images/`
- **Vendor Logos**: Stored in `server/uploads/logos/`
- **Uploaded Excel Files**: Temporarily processed and then deleted

## Production Deployment

For production deployment:

1. Build the React application:
   ```bash
   cd client
   npm run build
   ```

2. Serve the built files from your backend or use a web server
3. Update the API URL in the frontend configuration
4. Consider using a more robust database like PostgreSQL
5. Set up proper environment variables for configuration

## Troubleshooting

### Common Issues

1. **Port already in use**: Change ports in package.json scripts
2. **Database errors**: Delete the SQLite file to reset the database
3. **File upload issues**: Check that uploads directories exist
4. **Excel upload errors**: Ensure column names match exactly
5. **Network errors**: Verify that both frontend and backend are running

### Support

For issues or questions:
- Check the browser console for frontend errors
- Check the server terminal for backend errors
- Ensure all dependencies are properly installed
- Verify that the database has been created successfully

## License

MIT License - feel free to use this project for your own price tracking needs! 