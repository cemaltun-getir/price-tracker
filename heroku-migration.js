const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB using Heroku's MONGODB_URI
const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URL;

if (!mongoUri) {
  console.error('MONGODB_URI not found in environment variables');
  process.exit(1);
}

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const locationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  city: { type: String, required: true },
  region: { type: String, required: true },
  demography: { type: String, required: true },
  size: { type: String, required: true },
  domains: { type: [String], default: [] }
}, { timestamps: true });

const Location = mongoose.model('Location', locationSchema);

async function migrateProductionLocations() {
  try {
    console.log('🚀 Starting production migration...');
    console.log(`📊 Connected to: ${mongoUri.split('@')[1] || 'MongoDB'}`);
    
    // Step 1: Check current state
    const totalLocations = await Location.countDocuments();
    const emptyDomains = await Location.countDocuments({ 
      $or: [
        { domains: { $exists: false } },
        { domains: { $size: 0 } }
      ]
    });
    
    console.log(`📈 Total locations: ${totalLocations}`);
    console.log(`⚠️  Locations with empty domains: ${emptyDomains}`);
    
    if (emptyDomains === 0) {
      console.log('✅ All locations already have domains. Migration not needed.');
      return;
    }
    
    // Step 2: Add "Getir" to all locations with empty domains
    console.log('🔄 Step 1: Adding "Getir" to locations with empty domains...');
    const result1 = await Location.updateMany(
      { 
        $or: [
          { domains: { $exists: false } },
          { domains: { $size: 0 } }
        ]
      },
      { 
        $set: { domains: ["Getir"] }
      }
    );
    console.log(`✅ Updated ${result1.modifiedCount} locations with "Getir"`);
    
    // Step 3: Add "Getir Büyük" to Premium locations with large sizes
    console.log('🔄 Step 2: Adding "Getir Büyük" to Premium locations with large sizes...');
    const result2 = await Location.updateMany(
      {
        demography: "Premium",
        $or: [
          { size: { $regex: /Maxi/i } },
          { size: { $regex: /GB/i } },
          { size: { $regex: /Büyük/i } }
        ],
        domains: { $ne: ["Getir", "Getir Büyük"] }
      },
      {
        $set: { domains: ["Getir", "Getir Büyük"] }
      }
    );
    console.log(`✅ Updated ${result2.modifiedCount} Premium locations with "Getir Büyük"`);
    
    // Step 4: Add "Getir Büyük" to non-Premium locations with large sizes
    console.log('🔄 Step 3: Adding "Getir Büyük" to non-Premium locations with large sizes...');
    const result3 = await Location.updateMany(
      {
        demography: { $ne: "Premium" },
        $or: [
          { size: { $regex: /Maxi/i } },
          { size: { $regex: /GB/i } },
          { size: { $regex: /Büyük/i } }
        ],
        domains: { $ne: ["Getir", "Getir Büyük"] }
      },
      {
        $set: { domains: ["Getir", "Getir Büyük"] }
      }
    );
    console.log(`✅ Updated ${result3.modifiedCount} non-Premium locations with "Getir Büyük"`);
    
    // Step 5: Verify results
    console.log('🔍 Verifying migration results...');
    const domainStats = await Location.aggregate([
      {
        $group: {
          _id: "$domains",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    console.log('📊 Domain distribution after migration:');
    domainStats.forEach(stat => {
      console.log(`   ${JSON.stringify(stat._id)}: ${stat.count} locations`);
    });
    
    // Final verification
    const remainingEmpty = await Location.countDocuments({ 
      $or: [
        { domains: { $exists: false } },
        { domains: { $size: 0 } }
      ]
    });
    
    if (remainingEmpty === 0) {
      console.log('🎉 Migration completed successfully! All locations now have domains.');
    } else {
      console.log(`⚠️  Warning: ${remainingEmpty} locations still have empty domains.`);
    }
    
    console.log(`📈 Total locations processed: ${totalLocations}`);
    console.log(`✅ Migration completed at ${new Date().toISOString()}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
  }
}

// Run migration
migrateProductionLocations();
