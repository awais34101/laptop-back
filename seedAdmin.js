import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/finalsalat';

async function createAdmin() {
  await mongoose.connect(MONGO_URI);
  const exists = await User.findOne({ email: 'awais34101' });
  if (!exists) {
    const hash = await bcrypt.hash('Dubai123', 10);
    await User.create({
      name: 'Awais',
      email: 'awais34101',
      password: hash,
      role: 'admin',
      canViewFinancials: true,
      isActive: true
    });
    console.log('Admin user created.');
  } else {
    console.log('Admin user already exists.');
  }
  await mongoose.disconnect();
}
createAdmin();
