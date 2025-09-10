const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../client/build')));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
if (!fs.existsSync('uploads/images')) {
  fs.mkdirSync('uploads/images');
}
if (!fs.existsSync('uploads/logos')) {
  fs.mkdirSync('uploads/logos');
}

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/price-tracker';

// Log current setup information
console.log('MongoDB connection configured for:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  maxPoolSize: 10, // Maintain up to 10 socket connections
  bufferCommands: false, // Disable mongoose buffering
})
  .then(() => {
    console.log('Connected to MongoDB Atlas successfully');
    console.log('Database:', MONGODB_URI.split('/').pop().split('?')[0]);
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });

// Mongoose Schemas
const skuSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: String,
  brand: String,
  unit: { type: String, required: true },
  unit_value: { type: String, required: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: false },
  sub_category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: false },
  kvi_label: { 
    type: String, 
    enum: ['SKVI', 'KVI', 'Background (BG)', 'Foreground (FG)'], 
    default: 'Background (BG)' 
  },
  buying_price: { type: Number, default: 0 },
  buying_vat: { type: Number, default: 0 },
  buying_price_without_vat: { type: Number, default: 0 },
  // Legacy fields for backward compatibility
  category: { type: String },
  sub_category: { type: String }
}, { timestamps: true });

// Pre-save middleware to calculate buying_price_without_vat
skuSchema.pre('save', function(next) {
  if (this.buying_price && this.buying_vat > 0) {
    this.buying_price_without_vat = this.buying_price / (1 + (this.buying_vat / 100));
  } else if (this.buying_price) {
    this.buying_price_without_vat = this.buying_price; // If VAT is 0, price without VAT equals price
  } else {
    this.buying_price_without_vat = 0;
  }
  next();
});

// Pre-update middleware to calculate buying_price_without_vat
skuSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.buying_price && update.buying_vat > 0) {
    update.buying_price_without_vat = update.buying_price / (1 + (update.buying_vat / 100));
  } else if (update.buying_price) {
    update.buying_price_without_vat = update.buying_price; // If VAT is 0, price without VAT equals price
  } else if (update.buying_price !== undefined || update.buying_vat !== undefined) {
    update.buying_price_without_vat = 0;
  }
  next();
});

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo: String
}, { timestamps: true });

const locationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  province: { type: String, required: true },
  district: { type: String, required: true },
  region: { type: String, required: true },
  demography: { type: String, required: true },
  size: { type: String, required: true },
  domain: { type: String, required: true },
  // Legacy fields for backward compatibility
  district_name: { type: String },
  country: { type: String }
}, { timestamps: true });

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
}, { timestamps: true });

const subCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true }
}, { timestamps: true });

const priceMappingSchema = new mongoose.Schema({
  sku_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SKU', required: true },
  vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  location_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SimpleLocation', required: true },
  price: { type: Number, required: true },
  struck_price: { type: Number, required: false },
  is_discounted: { type: Boolean, default: false },
  unit_price: { type: Number, required: true },
  currency: { type: String, default: 'USD' }
}, { timestamps: true });

// Simple Location Schema for Price Mappings
const simpleLocationSchema = new mongoose.Schema({
  name: { type: String, required: true }
}, { timestamps: true });

// Models
const Category = mongoose.model('Category', categorySchema);
const SubCategory = mongoose.model('SubCategory', subCategorySchema);
const SKU = mongoose.model('SKU', skuSchema);
const Vendor = mongoose.model('Vendor', vendorSchema);
const Location = mongoose.model('Location', locationSchema);
const SimpleLocation = mongoose.model('SimpleLocation', simpleLocationSchema);
const PriceMapping = mongoose.model('PriceMapping', priceMappingSchema);

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'image') {
      cb(null, 'uploads/images/');
    } else if (file.fieldname === 'logo') {
      cb(null, 'uploads/logos/');
    } else {
      cb(null, 'uploads/');
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Helper function to extract numerical value from unit_value
const extractUnitValue = (unitValueString) => {
  // Extract the first number from the string
  const match = unitValueString.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 1; // Default to 1 if no number found
};

// Category Routes
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    const formattedCategories = await Promise.all(categories.map(async category => {
      const subCategoriesCount = await SubCategory.countDocuments({ category_id: category._id });
      const skusCount = await SKU.countDocuments({ category_id: category._id });
      
      return {
        id: category._id,
        name: category.name,
        created_at: category.createdAt,
        sub_categories_count: subCategoriesCount,
        skus_count: skusCount,
        can_delete: subCategoriesCount === 0 && skusCount === 0
      };
    }));
    res.json(formattedCategories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name } = req.body;
    const category = new Category({ name });
    const savedCategory = await category.save();
    res.json({ id: savedCategory._id, message: 'Category created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const { name } = req.body;
    await Category.findByIdAndUpdate(req.params.id, { name });
    res.json({ message: 'Category updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    // First check if any sub-categories reference this category
    const subCategoriesCount = await SubCategory.countDocuments({ category_id: req.params.id });
    if (subCategoriesCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category. It has ${subCategoriesCount} sub-category(ies) that must be deleted first.`,
        details: { type: 'sub_categories', count: subCategoriesCount }
      });
    }
    
    // Check if any SKUs reference this category
    const skusCount = await SKU.countDocuments({ category_id: req.params.id });
    if (skusCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category. It is being used by ${skusCount} product(s). Please change the category of these products first.`,
        details: { type: 'skus', count: skusCount }
      });
    }
    
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sub-Category Routes
app.get('/api/sub-categories', async (req, res) => {
  try {
    const { category_id } = req.query;
    const filter = category_id ? { category_id } : {};
    const subCategories = await SubCategory.find(filter).populate('category_id', 'name').sort({ createdAt: -1 });
    const formattedSubCategories = await Promise.all(subCategories.map(async subCategory => {
      const skusCount = await SKU.countDocuments({ sub_category_id: subCategory._id });
      
      return {
        id: subCategory._id,
        name: subCategory.name,
        category_id: subCategory.category_id._id,
        category_name: subCategory.category_id.name,
        created_at: subCategory.createdAt,
        skus_count: skusCount,
        can_delete: skusCount === 0
      };
    }));
    res.json(formattedSubCategories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sub-categories', async (req, res) => {
  try {
    const { name, category_id } = req.body;
    const subCategory = new SubCategory({ name, category_id });
    const savedSubCategory = await subCategory.save();
    res.json({ id: savedSubCategory._id, message: 'Sub-category created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/sub-categories/:id', async (req, res) => {
  try {
    const { name, category_id } = req.body;
    await SubCategory.findByIdAndUpdate(req.params.id, { name, category_id });
    res.json({ message: 'Sub-category updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/sub-categories/:id', async (req, res) => {
  try {
    // Check if any SKUs reference this sub-category
    const skusCount = await SKU.countDocuments({ sub_category_id: req.params.id });
    if (skusCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete sub-category. It is being used by ${skusCount} product(s). Please change the sub-category of these products first.`,
        details: { type: 'skus', count: skusCount }
      });
    }
    
    await SubCategory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Sub-category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SKU Routes
app.get('/api/skus', async (req, res) => {
  try {
    const skus = await SKU.find()
      .populate('category_id', 'name')
      .populate('sub_category_id', 'name')
      .sort({ createdAt: -1 });
    // Convert to match SQLite response format
    const formattedSkus = skus.map(sku => ({
      id: sku._id,
      name: sku.name,
      image: sku.image,
      brand: sku.brand,
      unit: sku.unit,
      unit_value: sku.unit_value,
      category_id: sku.category_id?._id || null,
      category_name: sku.category_id?.name || 'No Category',
      sub_category_id: sku.sub_category_id?._id || null,
      sub_category_name: sku.sub_category_id?.name || 'No Sub-Category',
      kvi_label: sku.kvi_label || 'Background (BG)',
      buying_price: sku.buying_price || 0,
      buying_vat: sku.buying_vat || 0,
      buying_price_without_vat: sku.buying_price_without_vat || 0,
      created_at: sku.createdAt
    }));
    res.json(formattedSkus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/skus', upload.single('image'), async (req, res) => {
  try {
    const { name, brand, unit, unit_value, category_id, sub_category_id, kvi_label, buying_price, buying_vat } = req.body;
    const image = req.file ? req.file.filename : null;

    const skuData = { name, image, brand, unit, unit_value };
    if (category_id && category_id !== '') {
      skuData.category_id = category_id;
    }
    if (sub_category_id && sub_category_id !== '') {
      skuData.sub_category_id = sub_category_id;
    }
    if (kvi_label && kvi_label !== '') {
      skuData.kvi_label = kvi_label;
    }
    if (buying_price && buying_price !== '') {
      skuData.buying_price = parseFloat(buying_price);
    }
    if (buying_vat && buying_vat !== '') {
      skuData.buying_vat = parseFloat(buying_vat);
    }

    const sku = new SKU(skuData);
    const savedSku = await sku.save();
    
    res.json({ id: savedSku._id, message: 'SKU created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/skus/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, brand, unit, unit_value, category_id, sub_category_id, kvi_label, buying_price, buying_vat } = req.body;
    const image = req.file ? req.file.filename : undefined;
    const id = req.params.id;

    const updateData = { name, brand, unit, unit_value };
    if (category_id && category_id !== '') {
      updateData.category_id = category_id;
    } else {
      updateData.category_id = null;
    }
    if (sub_category_id && sub_category_id !== '') {
      updateData.sub_category_id = sub_category_id;
    } else {
      updateData.sub_category_id = null;
    }
    if (kvi_label && kvi_label !== '') {
      updateData.kvi_label = kvi_label;
    }
    if (buying_price && buying_price !== '') {
      updateData.buying_price = parseFloat(buying_price);
    }
    if (buying_vat && buying_vat !== '') {
      updateData.buying_vat = parseFloat(buying_vat);
    }
    if (image) {
      updateData.image = image;
    }

    await SKU.findByIdAndUpdate(id, updateData);
    res.json({ message: 'SKU updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/skus/:id', async (req, res) => {
  try {
    await SKU.findByIdAndDelete(req.params.id);
    res.json({ message: 'SKU deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Vendor Routes
app.get('/api/vendors', async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    const formattedVendors = vendors.map(vendor => ({
      id: vendor._id,
      name: vendor.name,
      logo: vendor.logo,
      created_at: vendor.createdAt
    }));
    res.json(formattedVendors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/vendors', upload.single('logo'), async (req, res) => {
  try {
    const { name } = req.body;
    const logo = req.file ? req.file.filename : null;

    const vendor = new Vendor({ name, logo });
    const savedVendor = await vendor.save();
    
    res.json({ id: savedVendor._id, message: 'Vendor created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/vendors/:id', upload.single('logo'), async (req, res) => {
  try {
    const { name } = req.body;
    const logo = req.file ? req.file.filename : undefined;
    const id = req.params.id;

    const updateData = { name };
    if (logo) {
      updateData.logo = logo;
    }

    await Vendor.findByIdAndUpdate(id, updateData);
    res.json({ message: 'Vendor updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/vendors/:id', async (req, res) => {
  try {
    await Vendor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Location Routes
app.get('/api/locations', async (req, res) => {
  try {
    const locations = await Location.find().sort({ createdAt: -1 });
    const formattedLocations = locations.map(location => ({
      id: location._id,
      name: location.name,
      province: location.province,
      district: location.district,
      region: location.region,
      demography: location.demography,
      size: location.size,
      domain: location.domain,
      // Legacy fields for backward compatibility
      district_name: location.district_name || location.district,
      country: location.country,
      created_at: location.createdAt
    }));
    res.json(formattedLocations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/locations', async (req, res) => {
  try {
    const { 
      name, 
      province, 
      district, 
      region, 
      demography, 
      size, 
      domain,
      // Legacy fields for backward compatibility
      district_name, 
      country 
    } = req.body;

    const locationData = {};
    
    // New format
    if (name && province && district && region && demography && size && domain) {
      locationData.name = name;
      locationData.province = province;
      locationData.district = district;
      locationData.region = region;
      locationData.demography = demography;
      locationData.size = size;
      locationData.domain = domain;
    }
    // Legacy format support
    else if (district_name && country) {
      locationData.district_name = district_name;
      locationData.country = country;
      // Set default values for required new fields
      locationData.name = district_name;
      locationData.province = country;
      locationData.district = district_name;
      locationData.region = 'Unknown';
      locationData.demography = 'Unknown';
      locationData.size = 'Unknown';
      locationData.domain = 'Unknown';
    } else {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const location = new Location(locationData);
    const savedLocation = await location.save();
    
    res.json({ id: savedLocation._id, message: 'Location created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/locations/:id', async (req, res) => {
  try {
    const { 
      name, 
      province, 
      district, 
      region, 
      demography, 
      size, 
      domain,
      // Legacy fields for backward compatibility
      district_name, 
      country 
    } = req.body;

    const updateData = {};
    
    // New format
    if (name !== undefined) updateData.name = name;
    if (province !== undefined) updateData.province = province;
    if (district !== undefined) updateData.district = district;
    if (region !== undefined) updateData.region = region;
    if (demography !== undefined) updateData.demography = demography;
    if (size !== undefined) updateData.size = size;
    if (domain !== undefined) updateData.domain = domain;
    
    // Legacy format support
    if (district_name !== undefined) updateData.district_name = district_name;
    if (country !== undefined) updateData.country = country;

    await Location.findByIdAndUpdate(req.params.id, updateData);
    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/locations/:id', async (req, res) => {
  try {
    await Location.findByIdAndDelete(req.params.id);
    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Simple Location Routes for Price Mappings
app.get('/api/simple-locations', async (req, res) => {
  try {
    const locations = await SimpleLocation.find().sort({ createdAt: -1 });
    const formattedLocations = locations.map(location => ({
      id: location._id,
      name: location.name,
      created_at: location.createdAt
    }));
    res.json(formattedLocations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/simple-locations', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const location = new SimpleLocation({ name });
    const savedLocation = await location.save();
    
    res.json({ id: savedLocation._id, message: 'Simple location created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/simple-locations/:id', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    await SimpleLocation.findByIdAndUpdate(req.params.id, { name });
    res.json({ message: 'Simple location updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/simple-locations/:id', async (req, res) => {
  try {
    await SimpleLocation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Simple location deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// External API endpoint for location data distribution
app.get('/api/external/locations', async (req, res) => {
  try {
    const locations = await Location.find().sort({ createdAt: -1 });
    const externalLocations = locations.map(location => ({
      id: location._id.toString(),
      name: location.name,
      province: location.province,
      district: location.district,
      region: location.region,
      demography: location.demography,
      size: location.size,
      domain: location.domain
    }));
    res.json(externalLocations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// External API endpoint for single location data
app.get('/api/external/locations/:id', async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    const externalLocation = {
      id: location._id.toString(),
      name: location.name,
      province: location.province,
      district: location.district,
      region: location.region,
      demography: location.demography,
      size: location.size,
      domain: location.domain
    };
    
    res.json(externalLocation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// External API endpoint for price locations (simple locations) data distribution
app.get('/api/external/price-locations', async (req, res) => {
  try {
    const priceLocations = await SimpleLocation.find().sort({ createdAt: -1 });
    const externalPriceLocations = priceLocations.map(location => ({
      id: location._id.toString(),
      name: location.name,
      created_at: location.createdAt
    }));
    res.json(externalPriceLocations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// External API endpoint for single price location data
app.get('/api/external/price-locations/:id', async (req, res) => {
  try {
    const priceLocation = await SimpleLocation.findById(req.params.id);
    if (!priceLocation) {
      return res.status(404).json({ error: 'Price location not found' });
    }
    
    const externalPriceLocation = {
      id: priceLocation._id.toString(),
      name: priceLocation.name,
      created_at: priceLocation.createdAt
    };
    
    res.json(externalPriceLocation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// External API endpoint for SKUs data distribution
app.get('/api/external/skus', async (req, res) => {
  try {
    const skus = await SKU.find()
      .populate('category_id', 'name')
      .populate('sub_category_id', 'name')
      .sort({ createdAt: -1 });
    
    const externalSkus = skus.map(sku => ({
      id: sku._id.toString(),
      name: sku.name,
      image: sku.image,
      brand: sku.brand,
      unit: sku.unit,
      unit_value: sku.unit_value,
      category_id: sku.category_id?._id.toString() || null,
      category_name: sku.category_id?.name || null,
      sub_category_id: sku.sub_category_id?._id.toString() || null,
      sub_category_name: sku.sub_category_id?.name || null,
      kvi_label: sku.kvi_label || 'Background (BG)',
      buying_price: sku.buying_price || 0,
      buying_vat: sku.buying_vat || 0,
      buying_price_without_vat: sku.buying_price_without_vat || 0,
      created_at: sku.createdAt
    }));
    res.json(externalSkus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// External API endpoint for single SKU data
app.get('/api/external/skus/:id', async (req, res) => {
  try {
    const sku = await SKU.findById(req.params.id)
      .populate('category_id', 'name')
      .populate('sub_category_id', 'name');
    
    if (!sku) {
      return res.status(404).json({ error: 'SKU not found' });
    }
    
    const externalSku = {
      id: sku._id.toString(),
      name: sku.name,
      image: sku.image,
      brand: sku.brand,
      unit: sku.unit,
      unit_value: sku.unit_value,
      category_id: sku.category_id?._id.toString() || null,
      category_name: sku.category_id?.name || null,
      sub_category_id: sku.sub_category_id?._id.toString() || null,
      sub_category_name: sku.sub_category_id?.name || null,
      kvi_label: sku.kvi_label || 'Background (BG)',
      buying_price: sku.buying_price || 0,
      buying_vat: sku.buying_vat || 0,
      buying_price_without_vat: sku.buying_price_without_vat || 0,
      created_at: sku.createdAt
    };
    
    res.json(externalSku);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// External API endpoint for vendors data distribution
app.get('/api/external/vendors', async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    const externalVendors = vendors.map(vendor => ({
      id: vendor._id.toString(),
      name: vendor.name,
      logo: vendor.logo,
      created_at: vendor.createdAt
    }));
    res.json(externalVendors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// External API endpoint for single vendor data
app.get('/api/external/vendors/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const externalVendor = {
      id: vendor._id.toString(),
      name: vendor.name,
      logo: vendor.logo,
      created_at: vendor.createdAt
    };
    
    res.json(externalVendor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// External API endpoint for all data types in one response
app.get('/api/external/all', async (req, res) => {
  try {
    const [locations, priceLocations, skus, vendors, priceMappings, categories, subCategories] = await Promise.all([
      Location.find().sort({ createdAt: -1 }),
      SimpleLocation.find().sort({ createdAt: -1 }),
      SKU.find().populate('category_id', 'name').populate('sub_category_id', 'name').sort({ createdAt: -1 }),
      Vendor.find().sort({ createdAt: -1 }),
      PriceMapping.find().populate('sku_id', 'name brand unit unit_value').populate('vendor_id', 'name').sort({ createdAt: -1 }),
      Category.find().sort({ createdAt: -1 }),
      SubCategory.find().populate('category_id', 'name').sort({ createdAt: -1 })
    ]);

    // Process price mappings to include location names
    const processedPriceMappings = [];
    for (const mapping of priceMappings) {
      await mapping.populate('location_id');
      
      let locationName = 'Unknown Location';
      let locationId = mapping.location_id;

      if (mapping.location_id && mapping.location_id.name) {
        locationName = mapping.location_id.name;
        locationId = mapping.location_id._id;
      } else if (mapping.location_id) {
        try {
          const oldLocation = await Location.findById(mapping.location_id);
          if (oldLocation) {
            locationName = oldLocation.name || `${oldLocation.district_name || 'Unknown'}, ${oldLocation.country || 'Unknown'}`;
            locationId = oldLocation._id;
          }
        } catch (err) {
          console.log('Could not find location in old Location model:', err.message);
        }
      }

      processedPriceMappings.push({
        id: mapping._id.toString(),
        sku_id: mapping.sku_id._id.toString(),
        vendor_id: mapping.vendor_id._id.toString(),
        location_id: locationId.toString(),
        price: mapping.price,
        struck_price: mapping.struck_price,
        is_discounted: mapping.is_discounted,
        unit_price: mapping.unit_price,
        currency: mapping.currency,
        created_at: mapping.createdAt,
        updated_at: mapping.updatedAt,
        sku_name: mapping.sku_id.name,
        vendor_name: mapping.vendor_id.name,
        location_name: locationName,
        brand: mapping.sku_id.brand,
        unit: mapping.sku_id.unit,
        unit_value: mapping.sku_id.unit_value
      });
    }

    const response = {
      locations: locations.map(location => ({
        id: location._id.toString(),
        name: location.name,
        province: location.province,
        district: location.district,
        region: location.region,
        demography: location.demography,
        size: location.size,
        domain: location.domain
      })),
      price_locations: priceLocations.map(location => ({
        id: location._id.toString(),
        name: location.name,
        created_at: location.createdAt
      })),
      skus: skus.map(sku => ({
        id: sku._id.toString(),
        name: sku.name,
        image: sku.image,
        brand: sku.brand,
        unit: sku.unit,
        unit_value: sku.unit_value,
        category_id: sku.category_id?._id.toString() || null,
        category_name: sku.category_id?.name || null,
        sub_category_id: sku.sub_category_id?._id.toString() || null,
        sub_category_name: sku.sub_category_id?.name || null,
        kvi_label: sku.kvi_label || 'Background (BG)',
        buying_price: sku.buying_price || 0,
        buying_vat: sku.buying_vat || 0,
        buying_price_without_vat: sku.buying_price_without_vat || 0,
        created_at: sku.createdAt
      })),
      vendors: vendors.map(vendor => ({
        id: vendor._id.toString(),
        name: vendor.name,
        logo: vendor.logo,
        created_at: vendor.createdAt
      })),
      price_mappings: processedPriceMappings,
      categories: await Promise.all(categories.map(async category => {
        const subCategories = await SubCategory.find({ category_id: category._id }).sort({ createdAt: -1 });
        const skusCount = await SKU.countDocuments({ category_id: category._id });
        
        return {
          id: category._id.toString(),
          name: category.name,
          created_at: category.createdAt,
          sub_categories_count: subCategories.length,
          skus_count: skusCount,
          sub_categories: await Promise.all(subCategories.map(async subCategory => {
            const subCategorySkusCount = await SKU.countDocuments({ sub_category_id: subCategory._id });
            
            return {
              id: subCategory._id.toString(),
              name: subCategory.name,
              created_at: subCategory.createdAt,
              skus_count: subCategorySkusCount
            };
          }))
        };
      })),
      sub_categories: await Promise.all(subCategories.map(async subCategory => {
        const skusCount = await SKU.countDocuments({ sub_category_id: subCategory._id });
        
        return {
          id: subCategory._id.toString(),
          name: subCategory.name,
          category_id: subCategory.category_id._id.toString(),
          category_name: subCategory.category_id.name,
          created_at: subCategory.createdAt,
          skus_count: skusCount
        };
      }))
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// External API endpoint for price mappings data distribution
app.get('/api/external/price-mappings', async (req, res) => {
  try {
    const priceMappings = await PriceMapping.find()
      .populate('sku_id', 'name brand unit unit_value')
      .populate('vendor_id', 'name')
      .sort({ createdAt: -1 });

    const externalPriceMappings = [];

    for (const mapping of priceMappings) {
      // Try to populate from SimpleLocation first
      await mapping.populate('location_id');
      
      let locationName = 'Unknown Location';
      let locationId = mapping.location_id;

      if (mapping.location_id && mapping.location_id.name) {
        // Successfully populated from SimpleLocation
        locationName = mapping.location_id.name;
        locationId = mapping.location_id._id;
      } else if (mapping.location_id) {
        // Location ID exists but couldn't populate from SimpleLocation
        // Try to find in old Location model
        try {
          const oldLocation = await Location.findById(mapping.location_id);
          if (oldLocation) {
            locationName = oldLocation.name || `${oldLocation.district_name || 'Unknown'}, ${oldLocation.country || 'Unknown'}`;
            locationId = oldLocation._id;
          }
        } catch (err) {
          console.log('Could not find location in old Location model:', err.message);
        }
      }

      externalPriceMappings.push({
        id: mapping._id.toString(),
        sku_id: mapping.sku_id._id.toString(),
        vendor_id: mapping.vendor_id._id.toString(),
        location_id: locationId.toString(),
        price: mapping.price,
        struck_price: mapping.struck_price,
        is_discounted: mapping.is_discounted,
        unit_price: mapping.unit_price,
        currency: mapping.currency,
        created_at: mapping.createdAt,
        updated_at: mapping.updatedAt,
        sku_name: mapping.sku_id.name,
        vendor_name: mapping.vendor_id.name,
        location_name: locationName,
        brand: mapping.sku_id.brand,
        unit: mapping.sku_id.unit,
        unit_value: mapping.sku_id.unit_value
      });
    }

    res.json(externalPriceMappings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// External API endpoint for single price mapping data
app.get('/api/external/price-mappings/:id', async (req, res) => {
  try {
    const priceMapping = await PriceMapping.findById(req.params.id)
      .populate('sku_id', 'name brand unit unit_value')
      .populate('vendor_id', 'name');
    
    if (!priceMapping) {
      return res.status(404).json({ error: 'Price mapping not found' });
    }

    // Try to populate from SimpleLocation first
    await priceMapping.populate('location_id');
    
    let locationName = 'Unknown Location';
    let locationId = priceMapping.location_id;

    if (priceMapping.location_id && priceMapping.location_id.name) {
      // Successfully populated from SimpleLocation
      locationName = priceMapping.location_id.name;
      locationId = priceMapping.location_id._id;
    } else if (priceMapping.location_id) {
      // Location ID exists but couldn't populate from SimpleLocation
      // Try to find in old Location model
      try {
        const oldLocation = await Location.findById(priceMapping.location_id);
        if (oldLocation) {
          locationName = oldLocation.name || `${oldLocation.district_name || 'Unknown'}, ${oldLocation.country || 'Unknown'}`;
          locationId = oldLocation._id;
        }
      } catch (err) {
        console.log('Could not find location in old Location model:', err.message);
      }
    }
    
    const externalPriceMapping = {
      id: priceMapping._id.toString(),
      sku_id: priceMapping.sku_id._id.toString(),
      vendor_id: priceMapping.vendor_id._id.toString(),
      location_id: locationId.toString(),
      price: priceMapping.price,
      struck_price: priceMapping.struck_price,
      is_discounted: priceMapping.is_discounted,
      unit_price: priceMapping.unit_price,
      currency: priceMapping.currency,
      created_at: priceMapping.createdAt,
      updated_at: priceMapping.updatedAt,
      sku_name: priceMapping.sku_id.name,
      vendor_name: priceMapping.vendor_id.name,
      location_name: locationName,
      brand: priceMapping.sku_id.brand,
      unit: priceMapping.sku_id.unit,
      unit_value: priceMapping.sku_id.unit_value
    };
    
    res.json(externalPriceMapping);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// External API endpoint for categories data distribution
app.get('/api/external/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    const externalCategories = await Promise.all(categories.map(async category => {
      const subCategories = await SubCategory.find({ category_id: category._id }).sort({ createdAt: -1 });
      const skusCount = await SKU.countDocuments({ category_id: category._id });
      
      return {
        id: category._id.toString(),
        name: category.name,
        created_at: category.createdAt,
        sub_categories_count: subCategories.length,
        skus_count: skusCount,
        sub_categories: await Promise.all(subCategories.map(async subCategory => {
          const subCategorySkusCount = await SKU.countDocuments({ sub_category_id: subCategory._id });
          
          return {
            id: subCategory._id.toString(),
            name: subCategory.name,
            created_at: subCategory.createdAt,
            skus_count: subCategorySkusCount
          };
        }))
      };
    }));
    res.json(externalCategories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// External API endpoint for single category data
app.get('/api/external/categories/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    const subCategories = await SubCategory.find({ category_id: category._id }).sort({ createdAt: -1 });
    const skusCount = await SKU.countDocuments({ category_id: category._id });
    
    const externalCategory = {
      id: category._id.toString(),
      name: category.name,
      created_at: category.createdAt,
      sub_categories_count: subCategories.length,
      skus_count: skusCount,
      sub_categories: await Promise.all(subCategories.map(async subCategory => {
        const subCategorySkusCount = await SKU.countDocuments({ sub_category_id: subCategory._id });
        
        return {
          id: subCategory._id.toString(),
          name: subCategory.name,
          created_at: subCategory.createdAt,
          skus_count: subCategorySkusCount
        };
      }))
    };
    
    res.json(externalCategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// External API endpoint for sub-categories data distribution
app.get('/api/external/sub-categories', async (req, res) => {
  try {
    const { category_id } = req.query;
    const filter = category_id ? { category_id } : {};
    const subCategories = await SubCategory.find(filter).populate('category_id', 'name').sort({ createdAt: -1 });
    
    const externalSubCategories = await Promise.all(subCategories.map(async subCategory => {
      const skusCount = await SKU.countDocuments({ sub_category_id: subCategory._id });
      
      return {
        id: subCategory._id.toString(),
        name: subCategory.name,
        category_id: subCategory.category_id._id.toString(),
        category_name: subCategory.category_id.name,
        created_at: subCategory.createdAt,
        skus_count: skusCount
      };
    }));
    res.json(externalSubCategories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// External API endpoint for single sub-category data
app.get('/api/external/sub-categories/:id', async (req, res) => {
  try {
    const subCategory = await SubCategory.findById(req.params.id).populate('category_id', 'name');
    if (!subCategory) {
      return res.status(404).json({ error: 'Sub-category not found' });
    }
    
    const skusCount = await SKU.countDocuments({ sub_category_id: subCategory._id });
    
    const externalSubCategory = {
      id: subCategory._id.toString(),
      name: subCategory.name,
      category_id: subCategory.category_id._id.toString(),
      category_name: subCategory.category_id.name,
      created_at: subCategory.createdAt,
      skus_count: skusCount
    };
    
    res.json(externalSubCategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Price Mapping Routes
app.get('/api/price-mappings', async (req, res) => {
  try {
    const priceMappings = await PriceMapping.find()
      .populate('sku_id', 'name brand unit unit_value')
      .populate('vendor_id', 'name')
      .sort({ createdAt: -1 });

    const formattedMappings = [];

    for (const mapping of priceMappings) {
      // Try to populate from SimpleLocation first
      await mapping.populate('location_id');
      
      let locationName = 'Unknown Location';
      let locationId = mapping.location_id;

      if (mapping.location_id && mapping.location_id.name) {
        // Successfully populated from SimpleLocation
        locationName = mapping.location_id.name;
        locationId = mapping.location_id._id;
      } else if (mapping.location_id) {
        // Location ID exists but couldn't populate from SimpleLocation
        // Try to find in old Location model
        try {
          const oldLocation = await Location.findById(mapping.location_id);
          if (oldLocation) {
            locationName = oldLocation.name || `${oldLocation.district_name || 'Unknown'}, ${oldLocation.country || 'Unknown'}`;
            locationId = oldLocation._id;
          }
        } catch (err) {
          console.log('Could not find location in old Location model:', err.message);
        }
      }

      formattedMappings.push({
        id: mapping._id,
        sku_id: mapping.sku_id._id,
        vendor_id: mapping.vendor_id._id,
        location_id: locationId,
        price: mapping.price,
        struck_price: mapping.struck_price,
        is_discounted: mapping.is_discounted,
        unit_price: mapping.unit_price,
        currency: mapping.currency,
        created_at: mapping.createdAt,
        updated_at: mapping.updatedAt,
        sku_name: mapping.sku_id.name,
        vendor_name: mapping.vendor_id.name,
        location_name: locationName,
        brand: mapping.sku_id.brand,
        unit: mapping.sku_id.unit,
        unit_value: mapping.sku_id.unit_value
      });
    }

    res.json(formattedMappings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/price-mappings', async (req, res) => {
  try {
    const { sku_id, vendor_id, location_id, price, struck_price, is_discounted, currency } = req.body;

    // Get SKU to calculate unit price
    const sku = await SKU.findById(sku_id);
    if (!sku) {
      return res.status(400).json({ error: 'SKU not found' });
    }

    // Validate struck price if provided
    if (struck_price && struck_price >= price) {
      return res.status(400).json({ error: 'Struck price must be lower than the regular price' });
    }

    // Calculate unit price
    const unitValue = extractUnitValue(sku.unit_value);
    const unitPrice = price / unitValue;

    // Check if mapping already exists
    const existingMapping = await PriceMapping.findOne({
      sku_id,
      vendor_id,
      location_id
    });

    if (existingMapping) {
      // Update existing mapping
      existingMapping.price = price;
      existingMapping.struck_price = struck_price || null;
      existingMapping.is_discounted = is_discounted || false;
      existingMapping.unit_price = unitPrice;
      existingMapping.currency = currency || 'USD';
      const updated = await existingMapping.save();
      res.json({ id: updated._id, message: 'Price mapping updated successfully' });
    } else {
      // Create new mapping
      const priceMapping = new PriceMapping({
        sku_id,
        vendor_id,
        location_id,
        price,
        struck_price: struck_price || null,
        is_discounted: is_discounted || false,
        unit_price: unitPrice,
        currency: currency || 'USD'
      });
      const saved = await priceMapping.save();
      res.json({ id: saved._id, message: 'Price mapping created successfully' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/price-mappings/:id', async (req, res) => {
  try {
    await PriceMapping.findByIdAndDelete(req.params.id);
    res.json({ message: 'Price mapping deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Excel Upload Route
app.post('/api/upload-excel', upload.single('excel'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each row
    for (let index = 0; index < data.length; index++) {
      const row = data[index];
      const { sku_id, vendor_id, location_id, price, struck_price, is_discounted, currency } = row;

      if (!sku_id || !vendor_id || !location_id || !price) {
        errors.push(`Row ${index + 2}: Missing required fields (sku_id, vendor_id, location_id, price)`);
        errorCount++;
        continue;
      }

      // Validate struck price if provided
      if (struck_price && struck_price >= price) {
        errors.push(`Row ${index + 2}: Struck price must be lower than the regular price`);
        errorCount++;
        continue;
      }

      try {
        // Validate that the IDs exist
        const sku = await SKU.findById(sku_id);
        if (!sku) {
          errors.push(`Row ${index + 2}: SKU with ID "${sku_id}" not found`);
          errorCount++;
          continue;
        }

        const vendor = await Vendor.findById(vendor_id);
        if (!vendor) {
          errors.push(`Row ${index + 2}: Vendor with ID "${vendor_id}" not found`);
          errorCount++;
          continue;
        }

        const location = await SimpleLocation.findById(location_id);
        if (!location) {
          errors.push(`Row ${index + 2}: Location with ID "${location_id}" not found`);
          errorCount++;
          continue;
        }

        // Calculate unit price
        const unitValue = extractUnitValue(sku.unit_value);
        const unitPrice = price / unitValue;

        // Check if mapping exists
        const existingMapping = await PriceMapping.findOne({
          sku_id: sku_id,
          vendor_id: vendor_id,
          location_id: location_id
        });

        if (existingMapping) {
          // Update existing
          existingMapping.price = price;
          existingMapping.struck_price = struck_price || null;
          existingMapping.is_discounted = is_discounted || false;
          existingMapping.unit_price = unitPrice;
          existingMapping.currency = currency || 'USD';
          await existingMapping.save();
        } else {
          // Create new
          const priceMapping = new PriceMapping({
            sku_id: sku_id,
            vendor_id: vendor_id,
            location_id: location_id,
            price,
            struck_price: struck_price || null,
            is_discounted: is_discounted || false,
            unit_price: unitPrice,
            currency: currency || 'USD'
          });
          await priceMapping.save();
        }
        successCount++;
      } catch (error) {
        errors.push(`Row ${index + 2}: ${error.message}`);
        errorCount++;
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Excel upload processed',
      successCount,
      errorCount,
      errors: errors.slice(0, 10) // Limit to first 10 errors
    });

  } catch (error) {
    res.status(500).json({ error: 'Error processing Excel file: ' + error.message });
  }
});

// Debug endpoint to get server IP
app.get('/api/server-ip', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  res.json({ 
    server_ip: ip,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Catch all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 