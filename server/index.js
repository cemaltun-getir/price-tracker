const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../client/build')));

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create uploads directory if it doesn't exist (fallback for local development)
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

// Connect to MongoDB with retry logic
async function connectToDatabase() {
  try {
    console.log('Attempting to connect to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // Increase timeout to 10s
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      maxPoolSize: 10, // Maintain up to 10 socket connections
      connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
      authSource: 'admin', // Specify auth source
    });
    console.log('✅ Connected to MongoDB Atlas successfully');
    console.log('Database:', MONGODB_URI.split('/').pop().split('?')[0]);
  } catch (err) {
    console.error('❌ Error connecting to MongoDB:', err.message);
    console.error('Error details:', {
      name: err.name,
      code: err.code,
      codeName: err.codeName
    });
    console.log('Server will start anyway, but database operations will fail until connection is established');
    
    // Retry connection after 30 seconds
    setTimeout(() => {
      console.log('Retrying MongoDB connection...');
      connectToDatabase();
    }, 30000);
  }
}

// Start server immediately and connect to database in parallel
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Initialize database connection (non-blocking)
connectToDatabase();

// Mongoose Schemas
const skuSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: String,
  brand: String,
  unit: { type: String, required: true },
  unit_value: { type: String, required: true },
  // Legacy category fields (for backward compatibility)
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: false },
  sub_category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: false },
  // New 4-level category references
  category_level1_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CategoryLevel1', required: false },
  category_level2_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CategoryLevel2', required: false },
  category_level3_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CategoryLevel3', required: false },
  category_level4_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CategoryLevel4', required: false },
  kvi_label: { 
    type: String, 
    enum: ['SKVI', 'KVI', 'Background (BG)', 'Foreground (FG)'], 
    default: 'Background (BG)' 
  },
  buying_price: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  buying_vat: { type: Number, default: 0 },
  buying_price_without_vat: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  selling_price: { type: mongoose.Schema.Types.Decimal128, required: true },
  // Legacy fields for backward compatibility
  category: { type: String },
  sub_category: { type: String }
}, { timestamps: true });

// Pre-save middleware to calculate buying_price_without_vat
skuSchema.pre('save', function(next) {
  const price = this.buying_price ? parseFloat(this.buying_price.toString()) : 0;
  const vat = this.buying_vat ? parseFloat(this.buying_vat) : 0;
  let priceWithoutVat = 0;
  if (price && vat > 0) {
    priceWithoutVat = price / (1 + (vat / 100));
  } else if (price) {
    priceWithoutVat = price;
  } else {
    priceWithoutVat = 0;
  }
  this.buying_price_without_vat = mongoose.Types.Decimal128.fromString(priceWithoutVat.toFixed(2));
  next();
});

// Pre-update middleware to calculate buying_price_without_vat
skuSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  const price = update.buying_price ? parseFloat(update.buying_price.toString()) : 0;
  const vat = update.buying_vat ? parseFloat(update.buying_vat) : 0;
  let priceWithoutVat = 0;
  if (price && vat > 0) {
    priceWithoutVat = price / (1 + (vat / 100));
  } else if (price) {
    priceWithoutVat = price;
  } else if (update.buying_price !== undefined || update.buying_vat !== undefined) {
    priceWithoutVat = 0;
  }
  if (update.buying_price !== undefined || update.buying_vat !== undefined) {
    update.buying_price_without_vat = mongoose.Types.Decimal128.fromString(priceWithoutVat.toFixed(2));
  }
  next();
});

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo: String
}, { timestamps: true });

const locationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  city: { type: String, required: true },
  region: { type: String, required: true },
  demography: { type: String, required: true },
  size: { type: String, required: true },
  domains: { type: [String], required: true, default: [] }
}, { timestamps: true });

// Category hierarchy schemas (4 levels)
// Level 1 uses legacy collection name 'categories'
const categoryLevel1Schema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
}, { timestamps: true, collection: 'categories' });

// Level 2 uses legacy collection name 'subcategories' and legacy field name 'category_id'
const categoryLevel2Schema = new mongoose.Schema({
  name: { type: String, required: true },
  // legacy field name maintained for compatibility with existing data and UI
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true }
}, { timestamps: true, collection: 'subcategories' });

// Level 3 and 4 are new collections
const categoryLevel3Schema = new mongoose.Schema({
  name: { type: String, required: true },
  category_level2_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CategoryLevel2', required: true }
}, { timestamps: true, collection: 'categorylevel3' });

const categoryLevel4Schema = new mongoose.Schema({
  name: { type: String, required: true },
  category_level3_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CategoryLevel3', required: true }
}, { timestamps: true, collection: 'categorylevel4' });

const priceMappingSchema = new mongoose.Schema({
  sku_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SKU', required: true },
  vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  location_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SimpleLocation', required: true },
  price: { type: Number, required: true },
  struck_price: { type: Number, required: false },
  is_discounted: { type: Boolean, default: false },
  unit_price: { type: Number, required: true },
  currency: { type: String, default: 'TRY' }
}, { timestamps: true });

// Simple Location Schema for Price Mappings
const simpleLocationSchema = new mongoose.Schema({
  name: { type: String, required: true }
}, { timestamps: true });

// Models
const CategoryLevel1 = mongoose.model('CategoryLevel1', categoryLevel1Schema);
const CategoryLevel2 = mongoose.model('CategoryLevel2', categoryLevel2Schema);
const CategoryLevel3 = mongoose.model('CategoryLevel3', categoryLevel3Schema);
const CategoryLevel4 = mongoose.model('CategoryLevel4', categoryLevel4Schema);
// Legacy aliases to keep existing refs/populates working
const Category = mongoose.model('Category', categoryLevel1Schema);
const SubCategory = mongoose.model('SubCategory', categoryLevel2Schema);
const SKU = mongoose.model('SKU', skuSchema);
const Vendor = mongoose.model('Vendor', vendorSchema);
const Location = mongoose.model('Location', locationSchema);
const SimpleLocation = mongoose.model('SimpleLocation', simpleLocationSchema);
const PriceMapping = mongoose.model('PriceMapping', priceMappingSchema);

// Cloudinary storage configuration
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: (req, file) => {
      if (file.fieldname === 'image') {
        return 'price-tracker/images';
      } else if (file.fieldname === 'logo') {
        return 'price-tracker/logos';
      } else {
        return 'price-tracker/uploads';
      }
    },
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit', quality: 'auto' }]
  },
});

// Fallback to local storage if Cloudinary is not configured
const localStorage = multer.diskStorage({
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

// Use Cloudinary if configured, otherwise use local storage
const storage = process.env.CLOUDINARY_CLOUD_NAME ? cloudinaryStorage : localStorage;
const upload = multer({ storage: storage });

// Helper function to extract numerical value from unit_value
const extractUnitValue = (unitValueString) => {
  // Extract the first number from the string
  const match = unitValueString.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 1; // Default to 1 if no number found
};

// Category Level 1 Routes
app.get('/api/categories', async (req, res) => { // legacy alias for level 1
  try {
    const categories = await CategoryLevel1.find().sort({ createdAt: -1 });
    const formattedCategories = await Promise.all(categories.map(async category => {
      const level2Items = await CategoryLevel2.find({ category_id: category._id }).select('_id');
      const level2Ids = level2Items.map(i => i._id);
      const level3Items = await CategoryLevel3.find({ category_level2_id: { $in: level2Ids } }).select('_id');
      const level3Ids = level3Items.map(i => i._id);
      const level4Items = await CategoryLevel4.find({ category_level3_id: { $in: level3Ids } }).select('_id');
      const level4Ids = level4Items.map(i => i._id);
      const level2Count = level2Ids.length;
      const skusCount = await SKU.countDocuments({ category_level4_id: { $in: level4Ids } });
      
      return {
        id: category._id,
        name: category.name,
        created_at: category.createdAt,
        sub_categories_count: level2Count,
        skus_count: skusCount,
        can_delete: level2Count === 0 && skusCount === 0
      };
    }));
    res.json(formattedCategories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/categories', async (req, res) => { // legacy alias for level 1
  try {
    const { name } = req.body;
    const category = new CategoryLevel1({ name });
    const savedCategory = await category.save();
    res.json({ id: savedCategory._id, message: 'Category created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/categories/:id', async (req, res) => { // legacy alias for level 1
  try {
    const { name } = req.body;
    await CategoryLevel1.findByIdAndUpdate(req.params.id, { name });
    res.json({ message: 'Category updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => { // legacy alias for level 1
  try {
    // Check if any level 2 categories reference this level 1
    const level2Count = await CategoryLevel2.countDocuments({ category_id: req.params.id });
    if (level2Count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category. It has ${level2Count} child category(ies) that must be deleted first.`,
        details: { type: 'category_level2', count: level2Count }
      });
    }
    
    // Check if any SKUs reference this category via level 4 descendants
    const level2Items = await CategoryLevel2.find({ category_id: req.params.id }).select('_id');
    const level2Ids = level2Items.map(i => i._id);
    const level3Items = await CategoryLevel3.find({ category_level2_id: { $in: level2Ids } }).select('_id');
    const level3Ids = level3Items.map(i => i._id);
    const level4Items = await CategoryLevel4.find({ category_level3_id: { $in: level3Ids } }).select('_id');
    const level4Ids = level4Items.map(i => i._id);
    const skusCount = await SKU.countDocuments({ category_level4_id: { $in: level4Ids } });
    if (skusCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category. It is being used by ${skusCount} product(s). Please change the category of these products first.`,
        details: { type: 'skus', count: skusCount }
      });
    }
    
    await CategoryLevel1.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Category Level 2 Routes (legacy endpoint name kept for compatibility)
app.get('/api/sub-categories', async (req, res) => { // alias for level 2
  try {
    const { category_id } = req.query; // parent level1 id
    const filter = category_id ? { category_id } : {};
    const level2Categories = await CategoryLevel2.find(filter).populate('category_id', 'name').sort({ createdAt: -1 });
    const formatted = await Promise.all(level2Categories.map(async item => {
      const childCount = await CategoryLevel3.countDocuments({ category_level2_id: item._id });
      const level3Items = await CategoryLevel3.find({ category_level2_id: item._id }).select('_id');
      const level3Ids = level3Items.map(i => i._id);
      const level4Items = await CategoryLevel4.find({ category_level3_id: { $in: level3Ids } }).select('_id');
      const level4Ids = level4Items.map(i => i._id);
      const skusCount = await SKU.countDocuments({ category_level4_id: { $in: level4Ids } });
      
      return {
        id: item._id,
        name: item.name,
        category_id: item.category_id._id,
        category_name: item.category_id.name,
        created_at: item.createdAt,
        skus_count: skusCount,
        children_count: childCount,
        can_delete: skusCount === 0 && childCount === 0
      };
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sub-categories', async (req, res) => { // alias for level 2
  try {
    const { name, category_id } = req.body; // parent level1 id
    const item = new CategoryLevel2({ name, category_id });
    const saved = await item.save();
    res.json({ id: saved._id, message: 'Sub-category created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/sub-categories/:id', async (req, res) => { // alias for level 2
  try {
    const { name, category_id } = req.body; // parent level1 id
    await CategoryLevel2.findByIdAndUpdate(req.params.id, { name, category_id });
    res.json({ message: 'Sub-category updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/sub-categories/:id', async (req, res) => { // alias for level 2
  try {
    // Check if any level 3 categories reference this level 2
    const childCount = await CategoryLevel3.countDocuments({ category_level2_id: req.params.id });
    if (childCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete sub-category. It has ${childCount} child category(ies) that must be deleted first.`,
        details: { type: 'category_level3', count: childCount }
      });
    }

    // Check if any SKUs reference this level 2 via level 4 descendants
    const level3Items = await CategoryLevel3.find({ category_level2_id: req.params.id }).select('_id');
    const level3Ids = level3Items.map(i => i._id);
    const level4Items = await CategoryLevel4.find({ category_level3_id: { $in: level3Ids } }).select('_id');
    const level4Ids = level4Items.map(i => i._id);
    const skusCount = await SKU.countDocuments({ category_level4_id: { $in: level4Ids } });
    if (skusCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete sub-category. It is being used by ${skusCount} product(s).`,
        details: { type: 'skus', count: skusCount }
      });
    }

    await CategoryLevel2.findByIdAndDelete(req.params.id);
    res.json({ message: 'Sub-category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Category Level 3 Routes
app.get('/api/category-level3', async (req, res) => {
  try {
    const level2_id = req.query.level2_id || req.query.category_level2_id;
    const filter = level2_id ? { category_level2_id: level2_id } : {};
    const items = await CategoryLevel3.find(filter).populate('category_level2_id', 'name').sort({ createdAt: -1 });
    const formatted = await Promise.all(items.map(async item => {
      const childCount = await CategoryLevel4.countDocuments({ category_level3_id: item._id });
      const level4Items = await CategoryLevel4.find({ category_level3_id: item._id }).select('_id');
      const level4Ids = level4Items.map(i => i._id);
      const skusCount = await SKU.countDocuments({ category_level4_id: { $in: level4Ids } });
      return {
        id: item._id,
        name: item.name,
        level2_id: item.category_level2_id._id,
        level2_name: item.category_level2_id.name,
        children_count: childCount,
        skus_count: skusCount,
        created_at: item.createdAt,
        can_delete: skusCount === 0 && childCount === 0
      };
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/category-level3', async (req, res) => {
  try {
    const { name } = req.body;
    const level2_id = req.body.level2_id || req.body.category_level2_id;
    const item = new CategoryLevel3({ name, category_level2_id: level2_id });
    const saved = await item.save();
    res.json({ id: saved._id, message: 'Category level 3 created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/category-level3/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const level2_id = req.body.level2_id || req.body.category_level2_id;
    await CategoryLevel3.findByIdAndUpdate(req.params.id, { name, category_level2_id: level2_id });
    res.json({ message: 'Category level 3 updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/category-level3/:id', async (req, res) => {
  try {
    const childCount = await CategoryLevel4.countDocuments({ category_level3_id: req.params.id });
    if (childCount > 0) {
      return res.status(400).json({
        error: `Cannot delete category level 3. It has ${childCount} child category(ies).`,
        details: { type: 'category_level4', count: childCount }
      });
    }

    const level4Items = await CategoryLevel4.find({ category_level3_id: req.params.id }).select('_id');
    const level4Ids = level4Items.map(i => i._id);
    const skusCount = await SKU.countDocuments({ category_level4_id: { $in: level4Ids } });
    if (skusCount > 0) {
      return res.status(400).json({
        error: `Cannot delete category level 3. It is used by ${skusCount} product(s).`,
        details: { type: 'skus', count: skusCount }
      });
    }

    await CategoryLevel3.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category level 3 deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Category Level 4 Routes
app.get('/api/category-level4', async (req, res) => {
  try {
    const level3_id = req.query.level3_id || req.query.category_level3_id;
    const filter = level3_id ? { category_level3_id: level3_id } : {};
    const items = await CategoryLevel4.find(filter).populate('category_level3_id', 'name').sort({ createdAt: -1 });
    const formatted = await Promise.all(items.map(async item => {
      const skusCount = await SKU.countDocuments({ category_level4_id: item._id });
      return {
        id: item._id,
        name: item.name,
        level3_id: item.category_level3_id._id,
        level3_name: item.category_level3_id.name,
        skus_count: skusCount,
        created_at: item.createdAt,
        can_delete: skusCount === 0
      };
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/category-level4', async (req, res) => {
  try {
    const { name } = req.body;
    const level3_id = req.body.level3_id || req.body.category_level3_id;
    const item = new CategoryLevel4({ name, category_level3_id: level3_id });
    const saved = await item.save();
    res.json({ id: saved._id, message: 'Category level 4 created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/category-level4/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const level3_id = req.body.level3_id || req.body.category_level3_id;
    await CategoryLevel4.findByIdAndUpdate(req.params.id, { name, category_level3_id: level3_id });
    res.json({ message: 'Category level 4 updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/category-level4/:id', async (req, res) => {
  try {
    const skusCount = await SKU.countDocuments({ category_level4_id: req.params.id });
    if (skusCount > 0) {
      return res.status(400).json({
        error: `Cannot delete category level 4. It is used by ${skusCount} product(s).`,
        details: { type: 'skus', count: skusCount }
      });
    }
    await CategoryLevel4.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category level 4 deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SKU Routes
app.get('/api/skus', async (req, res) => {
  try {
    const skus = await SKU.find()
      .populate('category_level4_id', 'name')
      .populate({
        path: 'category_level4_id',
        populate: {
          path: 'category_level3_id',
          model: 'CategoryLevel3',
          select: 'name',
          populate: {
            path: 'category_level2_id',
            model: 'CategoryLevel2',
            select: 'name',
            populate: {
              path: 'category_id',
              model: 'Category',
              select: 'name'
            }
          }
        }
      })
      .sort({ createdAt: -1 });
    // Convert to match SQLite response format
    const formattedSkus = skus.map(sku => ({
      id: sku._id,
      name: sku.name,
      image: sku.image,
      brand: sku.brand,
      unit: sku.unit,
      unit_value: sku.unit_value,
      // Only level 4 binding; derive names up the tree if populated
      category_level4_id: sku.category_level4_id?._id || null,
      category_level4_name: sku.category_level4_id?.name || null,
      category_level3_id: sku.category_level4_id?.category_level3_id?._id || null,
      category_level3_name: sku.category_level4_id?.category_level3_id?.name || null,
      category_level2_id: sku.category_level4_id?.category_level3_id?.category_level2_id?._id || null,
      category_level2_name: sku.category_level4_id?.category_level3_id?.category_level2_id?.name || null,
      category_level1_id: sku.category_level4_id?.category_level3_id?.category_level2_id?.category_id?._id || null,
      category_level1_name: sku.category_level4_id?.category_level3_id?.category_level2_id?.category_id?.name || null,
      kvi_label: sku.kvi_label || 'Background (BG)',
      buying_price: sku.buying_price ? parseFloat(sku.buying_price.toString()) : 0,
      buying_vat: sku.buying_vat || 0,
      buying_price_without_vat: sku.buying_price_without_vat ? parseFloat(sku.buying_price_without_vat.toString()) : 0,
      selling_price: sku.selling_price ? parseFloat(sku.selling_price.toString()) : 0,
      created_at: sku.createdAt
    }));
    res.json(formattedSkus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/skus', upload.single('image'), async (req, res) => {
  try {
    const { name, brand, unit, unit_value, kvi_label, buying_price, buying_vat, selling_price } = req.body;
    const cat4 = req.body.category_level4_id || '';
    // Use Cloudinary URL if available, otherwise use filename
    const image = req.file ? (req.file.path || req.file.filename) : null;

    const skuData = { name, image, brand, unit, unit_value };
    if (cat4 && cat4 !== '') skuData.category_level4_id = cat4;
    if (kvi_label && kvi_label !== '') {
      skuData.kvi_label = kvi_label;
    }
    if (buying_price && buying_price !== '') {
      const bpStr = String(buying_price).replace(',', '.');
      skuData.buying_price = mongoose.Types.Decimal128.fromString((Number(bpStr)).toFixed(2));
    }
    if (buying_vat && buying_vat !== '') {
      const bvStr = String(buying_vat).replace(',', '.');
      skuData.buying_vat = parseFloat(bvStr);
    }
    if (selling_price && selling_price !== '') {
      const spStr = String(selling_price).replace(',', '.');
      skuData.selling_price = mongoose.Types.Decimal128.fromString((Number(spStr)).toFixed(2));
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
    const { name, brand, unit, unit_value, kvi_label, buying_price, buying_vat, selling_price } = req.body;
    const cat4 = req.body.category_level4_id || '';
    // Use Cloudinary URL if available, otherwise use filename
    const image = req.file ? (req.file.path || req.file.filename) : undefined;
    const id = req.params.id;

    const updateData = { name, brand, unit, unit_value };
    updateData.category_level4_id = cat4 || null;
    // Clear legacy and intermediate fields to enforce level 4 only
    updateData.category_id = null;
    updateData.sub_category_id = null;
    updateData.category_level1_id = null;
    updateData.category_level2_id = null;
    updateData.category_level3_id = null;
    if (kvi_label && kvi_label !== '') {
      updateData.kvi_label = kvi_label;
    }
    if (buying_price && buying_price !== '') {
      const bpStr = String(buying_price).replace(',', '.');
      updateData.buying_price = mongoose.Types.Decimal128.fromString((Number(bpStr)).toFixed(2));
    }
    if (buying_vat && buying_vat !== '') {
      const bvStr = String(buying_vat).replace(',', '.');
      updateData.buying_vat = parseFloat(bvStr);
    }
    if (selling_price && selling_price !== '') {
      const spStr = String(selling_price).replace(',', '.');
      updateData.selling_price = mongoose.Types.Decimal128.fromString((Number(spStr)).toFixed(2));
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
    // Use Cloudinary URL if available, otherwise use filename
    const logo = req.file ? (req.file.path || req.file.filename) : null;

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
    // Use Cloudinary URL if available, otherwise use filename
    const logo = req.file ? (req.file.path || req.file.filename) : undefined;
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
      city: location.city,
      region: location.region,
      demography: location.demography,
      size: location.size,
      domains: location.domains || [],
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
      city, 
      region, 
      demography, 
      size, 
      domains
    } = req.body;

    if (!name || !city || !region || !demography || !size || !domains || !Array.isArray(domains) || domains.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: name, city, region, demography, size, domains (array)' });
    }

    const location = new Location({
      name,
      city,
      region,
      demography,
      size,
      domains
    });
    
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
      city, 
      region, 
      demography, 
      size, 
      domains
    } = req.body;

    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (city !== undefined) updateData.city = city;
    if (region !== undefined) updateData.region = region;
    if (demography !== undefined) updateData.demography = demography;
    if (size !== undefined) updateData.size = size;
    if (domains !== undefined) {
      if (!Array.isArray(domains) || domains.length === 0) {
        return res.status(400).json({ error: 'domains must be a non-empty array' });
      }
      updateData.domains = domains;
    }

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
      city: location.city,
      region: location.region,
      demography: location.demography,
      size: location.size,
      domains: location.domains || []
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
      city: location.city,
      region: location.region,
      demography: location.demography,
      size: location.size,
      domains: location.domains || []
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
    const {
      category_level1_id,
      category_level2_id,
      category_level3_id,
      category_level4_id,
      category_id, // legacy alias for level1
      sub_category_id // legacy alias for level2
    } = req.query;

    let filter = {};
    if (category_level4_id) {
      filter.category_level4_id = category_level4_id;
    } else if (category_level3_id) {
      const level4 = await CategoryLevel4.find({ category_level3_id }).select('_id');
      filter.category_level4_id = { $in: level4.map(i => i._id) };
    } else if (category_level2_id || sub_category_id) {
      const l2 = category_level2_id || sub_category_id;
      const level3 = await CategoryLevel3.find({ category_level2_id: l2 }).select('_id');
      const level3Ids = level3.map(i => i._id);
      const level4 = await CategoryLevel4.find({ category_level3_id: { $in: level3Ids } }).select('_id');
      filter.category_level4_id = { $in: level4.map(i => i._id) };
    } else if (category_level1_id || category_id) {
      const l1 = category_level1_id || category_id;
      const level2 = await CategoryLevel2.find({ category_id: l1 }).select('_id');
      const level2Ids = level2.map(i => i._id);
      const level3 = await CategoryLevel3.find({ category_level2_id: { $in: level2Ids } }).select('_id');
      const level3Ids = level3.map(i => i._id);
      const level4 = await CategoryLevel4.find({ category_level3_id: { $in: level3Ids } }).select('_id');
      filter.category_level4_id = { $in: level4.map(i => i._id) };
    }

    const skus = await SKU.find(filter)
      .populate('category_level4_id', 'name')
      .sort({ createdAt: -1 });
    
    const externalSkus = skus.map(sku => ({
      id: sku._id.toString(),
      name: sku.name,
      image: sku.image,
      brand: sku.brand,
      unit: sku.unit,
      unit_value: sku.unit_value,
      // Full category path derived from level 4
      category_level4_id: sku.category_level4_id?._id.toString() || null,
      category_level4_name: sku.category_level4_id?.name || null,
      kvi_label: sku.kvi_label || 'Background (BG)',
      buying_price: sku.buying_price ? parseFloat(sku.buying_price.toString()) : 0,
      buying_vat: sku.buying_vat || 0,
      buying_price_without_vat: sku.buying_price_without_vat ? parseFloat(sku.buying_price_without_vat.toString()) : 0,
      selling_price: sku.selling_price ? parseFloat(sku.selling_price.toString()) : 0,
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
      .populate('category_level4_id', 'name');
    
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
      category_level4_id: sku.category_level4_id?._id.toString() || null,
      category_level4_name: sku.category_level4_id?.name || null,
      kvi_label: sku.kvi_label || 'Background (BG)',
      buying_price: sku.buying_price ? parseFloat(sku.buying_price.toString()) : 0,
      buying_vat: sku.buying_vat || 0,
      buying_price_without_vat: sku.buying_price_without_vat ? parseFloat(sku.buying_price_without_vat.toString()) : 0,
      selling_price: sku.selling_price ? parseFloat(sku.selling_price.toString()) : 0,
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
    const {
      category_level1_id,
      category_level2_id,
      category_level3_id,
      category_level4_id,
      category_id, // legacy alias for level1
      sub_category_id // legacy alias for level2
    } = req.query;

    let skuFilter = {};
    if (category_level4_id) {
      skuFilter.category_level4_id = category_level4_id;
    } else if (category_level3_id) {
      const level4 = await CategoryLevel4.find({ category_level3_id }).select('_id');
      skuFilter.category_level4_id = { $in: level4.map(i => i._id) };
    } else if (category_level2_id || sub_category_id) {
      const l2 = category_level2_id || sub_category_id;
      const level3 = await CategoryLevel3.find({ category_level2_id: l2 }).select('_id');
      const level3Ids = level3.map(i => i._id);
      const level4 = await CategoryLevel4.find({ category_level3_id: { $in: level3Ids } }).select('_id');
      skuFilter.category_level4_id = { $in: level4.map(i => i._id) };
    } else if (category_level1_id || category_id) {
      const l1 = category_level1_id || category_id;
      const level2 = await CategoryLevel2.find({ category_id: l1 }).select('_id');
      const level2Ids = level2.map(i => i._id);
      const level3 = await CategoryLevel3.find({ category_level2_id: { $in: level2Ids } }).select('_id');
      const level3Ids = level3.map(i => i._id);
      const level4 = await CategoryLevel4.find({ category_level3_id: { $in: level3Ids } }).select('_id');
      skuFilter.category_level4_id = { $in: level4.map(i => i._id) };
    }

    const [locations, priceLocations, skus, vendors, priceMappings, categories, subCategories] = await Promise.all([
      Location.find().sort({ createdAt: -1 }),
      SimpleLocation.find().sort({ createdAt: -1 }),
      SKU.find(skuFilter).populate('category_level4_id', 'name').sort({ createdAt: -1 }),
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
        city: location.city,
        region: location.region,
        demography: location.demography,
        size: location.size,
        domains: location.domains || []
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
        category_level4_id: sku.category_level4_id?._id.toString() || null,
        category_level4_name: sku.category_level4_id?.name || null,
        kvi_label: sku.kvi_label || 'Background (BG)',
        buying_price: sku.buying_price ? parseFloat(sku.buying_price.toString()) : 0,
        buying_vat: sku.buying_vat || 0,
        buying_price_without_vat: sku.buying_price_without_vat ? parseFloat(sku.buying_price_without_vat.toString()) : 0,
        selling_price: sku.selling_price ? parseFloat(sku.selling_price.toString()) : 0,
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
    const categories = await CategoryLevel1.find().sort({ createdAt: -1 });
    const externalCategories = await Promise.all(categories.map(async category => {
      const level2 = await CategoryLevel2.find({ category_id: category._id }).sort({ createdAt: -1 });
      const level2WithChildren = await Promise.all(level2.map(async l2 => {
        const level3 = await CategoryLevel3.find({ category_level2_id: l2._id }).sort({ createdAt: -1 });
        const level3WithChildren = await Promise.all(level3.map(async l3 => {
          const level4 = await CategoryLevel4.find({ category_level3_id: l3._id }).sort({ createdAt: -1 });
          const l3Skus = await SKU.countDocuments({ category_level3_id: l3._id });
          return {
            id: l3._id.toString(),
            name: l3.name,
            created_at: l3.createdAt,
            skus_count: l3Skus,
            children: await Promise.all(level4.map(async l4 => {
              const l4Skus = await SKU.countDocuments({ category_level4_id: l4._id });
              return {
                id: l4._id.toString(),
                name: l4.name,
                created_at: l4.createdAt,
                skus_count: l4Skus
              };
            }))
          };
        }));
        const l2Skus = await SKU.countDocuments({ category_level2_id: l2._id });
        return {
          id: l2._id.toString(),
          name: l2.name,
          created_at: l2.createdAt,
          skus_count: l2Skus,
          children: level3WithChildren
        };
      }));
      const skusCount = await SKU.countDocuments({ category_level1_id: category._id });
      return {
        id: category._id.toString(),
        name: category.name,
        created_at: category.createdAt,
        skus_count: skusCount,
        children: level2WithChildren
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
    const subCategories = await CategoryLevel2.find(filter).populate('category_id', 'name').sort({ createdAt: -1 });
    
    const externalSubCategories = await Promise.all(subCategories.map(async subCategory => {
      const skusCount = await SKU.countDocuments({ $or: [ { category_level2_id: subCategory._id }, { sub_category_id: subCategory._id } ] });
      
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
    if (struck_price && parseFloat(struck_price) >= parseFloat(price)) {
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
      existingMapping.currency = currency || 'TRY';
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
        currency: currency || 'TRY'
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
      if (struck_price && parseFloat(struck_price) >= parseFloat(price)) {
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
          existingMapping.currency = currency || 'TRY';
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
            currency: currency || 'TRY'
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

// Debug endpoint to test MongoDB connection
app.get('/api/db-status', async (req, res) => {
  try {
    const connectionState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    res.json({
      connection_state: states[connectionState],
      connection_state_code: connectionState,
      database_name: mongoose.connection.db ? mongoose.connection.db.databaseName : 'not connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      connection_state: 'error',
      timestamp: new Date().toISOString()
    });
  }
});

// Catch all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Server is started in connectToDatabase() function after DB connection 