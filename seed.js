import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { seedSampleData } from './models/sampleData.js';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    await seedSampleData();
    console.log('Sample data seeded');
    process.exit(0);
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
