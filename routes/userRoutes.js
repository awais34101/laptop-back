import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import auth, { requireRole } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Helper: sign JWT with version
function signToken(user) {
  return jwt.sign({
    userId: user._id,
    role: user.role,
    canViewFinancials: user.canViewFinancials,
    passwordVersion: user.passwordVersion,
    isActive: user.isActive
  }, JWT_SECRET, { expiresIn: '1d' });
}

// 1. Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('LOGIN ATTEMPT:', { email });
  // Allow login by email or username
  const user = await User.findOne({ $or: [ { email }, { name: email } ] });
  console.log('LOGIN USER FOUND:', user ? {
    email: user.email,
    name: user.name,
    isActive: user.isActive,
    password: user.password
  } : null);
  if (!user) {
    console.log('LOGIN FAIL: user not found');
    return res.status(401).json({ error: 'Invalid credentials or inactive user' });
  }
  if (!user.isActive) {
    console.log('LOGIN FAIL: user inactive');
    return res.status(401).json({ error: 'Invalid credentials or inactive user' });
  }
  const valid = await bcrypt.compare(password, user.password);
  console.log('LOGIN PASSWORD CHECK:', { inputPassword: password, userPasswordHash: user.password, valid });
  if (!valid) {
    console.log('LOGIN FAIL: password incorrect');
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = signToken(user);
  console.log('LOGIN SUCCESS:', { user: user.email || user.name });
  res.json({ token, user: { name: user.name, email: user.email, role: user.role, canViewFinancials: user.canViewFinancials } });
});

// 2. Change password
router.post('/change-password', auth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user.userId);
  const valid = await bcrypt.compare(oldPassword, user.password);
  if (!valid) return res.status(400).json({ error: 'Old password incorrect' });
  user.password = await bcrypt.hash(newPassword, 10);
  user.passwordVersion++;
  await user.save();
  res.json({ message: 'Password changed' });
});

// 3. Add staff (admin only)
router.post('/add-staff', auth, requireRole('admin'), async (req, res) => {
  const { name, email, password, role, canViewFinancials } = req.body;
  if (await User.findOne({ email })) return res.status(400).json({ error: 'Email already exists' });
  const hash = await bcrypt.hash(password, 10);
  const user = new User({ name, email, password: hash, role, canViewFinancials });
  await user.save();
  res.json({ message: 'Staff added' });
});

// 4. List users (admin only)
router.get('/list', auth, requireRole('admin'), async (req, res) => {
  const users = await User.find({}, '-password');
  res.json(users);
});

// 5. Edit user (admin only)
router.put('/:id/edit', auth, requireRole('admin'), async (req, res) => {
  const { role, canViewFinancials, isActive } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.role = role ?? user.role;
  user.canViewFinancials = canViewFinancials ?? user.canViewFinancials;
  if (typeof isActive === 'boolean' && user.isActive !== isActive) {
    user.isActive = isActive;
    user.passwordVersion++;
  }
  await user.save();
  res.json({ message: 'User updated' });
});

// 6. Delete user (admin only, soft delete)
router.delete('/:id/delete', auth, requireRole('admin'), async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.isActive = false;
  user.passwordVersion++;
  await user.save();
  res.json({ message: 'User deactivated' });
});

export default router;
