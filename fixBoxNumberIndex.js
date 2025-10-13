import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixIndexes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('inventoryboxes');

    // Get existing indexes
    const indexes = await collection.indexes();
    console.log('\nCurrent indexes:');
    indexes.forEach(idx => {
      console.log(`- ${idx.name}:`, JSON.stringify(idx.key));
    });

    // Drop the old unique index on boxNumber
    try {
      await collection.dropIndex('boxNumber_1');
      console.log('\n✅ Dropped old boxNumber_1 unique index');
    } catch (err) {
      if (err.code === 27) {
        console.log('\n⚠️  Index boxNumber_1 does not exist (already dropped or never existed)');
      } else {
        throw err;
      }
    }

    // The new compound index will be created automatically when the model is loaded
    console.log('\n✅ New compound index (boxNumber + location) will be created by Mongoose');
    
    console.log('\n📋 Summary:');
    console.log('- Old behavior: boxNumber was globally unique across all locations');
    console.log('- New behavior: boxNumber is unique per location');
    console.log('- Now you can have Box #1 in Store, Box #1 in Store2, Box #1 in Warehouse');

    await mongoose.connection.close();
    console.log('\nDone! Please restart your backend server.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixIndexes();
