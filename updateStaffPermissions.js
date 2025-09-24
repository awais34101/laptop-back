import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';

// Load environment variables
dotenv.config();

async function updateStaffPermissions() {
  try {
    console.log('Connecting to database...');
    
    // Connect to MongoDB
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/crm';
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully');
    
    // Find all staff users
    const staffUsers = await User.find({ role: 'staff' });
    console.log(`Found ${staffUsers.length} staff users`);

    if (staffUsers.length === 0) {
      console.log('No staff users found to update');
      return;
    }

    // Update each staff user's permissions
    for (const user of staffUsers) {
      console.log(`Updating permissions for staff user: ${user.name} (${user.email})`);
      
      // Get current effective permissions
      const currentPermissions = user.getEffectivePermissions();
      
      // Add the new permissions
      const updatedPermissions = {
        ...currentPermissions,
        purchases: { view: true },
        purchaseSheets: { view: true },
        technicians: { view: true },
        warehouse: { view: true }
      };
      
      // Update the user with new permissions
      user.permissions = updatedPermissions;
      await user.save();
      
      console.log(`✓ Updated permissions for ${user.name}`);
    }

    console.log('All staff users updated successfully!');
    
  } catch (error) {
    console.error('Error updating staff permissions:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

updateStaffPermissions();