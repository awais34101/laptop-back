import mongoose from 'mongoose';
import dotenv from 'dotenv';
import TechnicianAssignment from '../models/TechnicianAssignment.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve .env path relative to this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('Loaded env:', process.env.MONGO_URI, process.env.MONGODB_URI);
const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!uri) {
  console.error('MongoDB URI not found in environment variables.');
  process.exit(1);
}

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const result = await TechnicianAssignment.deleteMany({});
    console.log(`Deleted ${result.deletedCount} technician assignments.`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  });
