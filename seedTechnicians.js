import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Technician from './models/Technician.js';

dotenv.config();

const seedTechnicians = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if technicians exist
    const existingCount = await Technician.countDocuments();
    console.log(`Existing technicians: ${existingCount}`);

    if (existingCount === 0) {
      const sampleTechnicians = [
        {
          name: 'Ahmad Ali',
          email: 'ahmad@company.com',
          phone: '+971501234567',
          specialization: 'Laptop Repair'
        },
        {
          name: 'Sara Mohammed',
          email: 'sara@company.com',
          phone: '+971509876543',
          specialization: 'Hardware Testing'
        },
        {
          name: 'Omar Hassan',
          email: 'omar@company.com',
          phone: '+971507654321',
          specialization: 'Software Installation'
        }
      ];

      await Technician.insertMany(sampleTechnicians);
      console.log('Sample technicians created successfully!');
    } else {
      console.log('Technicians already exist in database');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

seedTechnicians();