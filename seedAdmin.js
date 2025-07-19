import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/finalsalat';


async function createAdmin() {
  await mongoose.connect(MONGO_URI);
  // Delete old admin(s)
  await User.deleteMany({ role: 'admin' });
  // Create new admin
  const hash = await bcrypt.hash('Awais123', 10);
  await User.create({
    name: 'Awais',
    email: 'awaiszafar704@gmail.com',
    password: hash,
    role: 'admin',
    canViewFinancials: true,
    isActive: true
  });
  console.log('New admin user created.');
  await mongoose.disconnect();
}
createAdmin();
