import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://awaiszafar704salat:cwUVVBeHDM7u7KFD@cluster0salat.5jzzorb.mongodb.net/car_rental_crm?retryWrites=true&w=majority&appName=Cluster0salat';


async function createAdmin() {
  await mongoose.connect(MONGO_URI);
  // Delete old admin(s)
  await User.deleteMany({ role: 'admin' });
  // Create new admin - let the User model handle password hashing
  const newUser = await User.create({
    name: 'Awais',
    email: 'awaiszafar704@gmail.com',
    password: 'Awais123', // Raw password - model will hash it
    role: 'admin',
    canViewFinancials: true,
    isActive: true
  });
  console.log('New admin user created:', newUser);
  await mongoose.disconnect();
}
createAdmin();
