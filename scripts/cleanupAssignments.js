import mongoose from 'mongoose';
import dotenv from 'dotenv';
import TechnicianAssignment from '../models/TechnicianAssignment.js';

// Load environment variables
dotenv.config();

async function cleanupAssignments() {
  try {
    // Connect to MongoDB using the same config as the server
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find and display problematic assignments
    const invalidAssignments = await TechnicianAssignment.find({
      $or: [
        { technicianId: { $exists: false } },
        { technicianId: null },
        { itemIds: { $size: 0 } },
        { itemIds: { $exists: false } }
      ]
    });

    console.log(`Found ${invalidAssignments.length} invalid assignments:`);
    invalidAssignments.forEach(assignment => {
      console.log(`- ID: ${assignment._id}, TechnicianId: ${assignment.technicianId || 'MISSING'}, ItemIds: ${assignment.itemIds?.length || 0} items`);
    });

    if (invalidAssignments.length > 0) {
      // Delete invalid assignments
      const result = await TechnicianAssignment.deleteMany({
        $or: [
          { technicianId: { $exists: false } },
          { technicianId: null },
          { itemIds: { $size: 0 } },
          { itemIds: { $exists: false } }
        ]
      });

      console.log(`✅ Deleted ${result.deletedCount} invalid assignments`);
    } else {
      console.log('✅ No invalid assignments found');
    }

    // Show remaining valid assignments
    const validAssignments = await TechnicianAssignment.find()
      .populate('technicianId', 'name')
      .populate('itemIds', 'name category');
    
    console.log(`\n📋 Remaining valid assignments: ${validAssignments.length}`);
    validAssignments.forEach(assignment => {
      console.log(`- Technician: ${assignment.technicianId?.name || 'Unknown'}, Items: ${assignment.itemIds?.length || 0}`);
    });

  } catch (error) {
    console.error('❌ Error cleaning up assignments:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the cleanup
cleanupAssignments();
