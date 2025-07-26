import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import auth, { requireRole } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Helper: sign JWT with version
function signToken(user) {
  const payload = {
    userId: user._id,
    role: user.role,
    canViewFinancials: user.canViewFinancials,
    passwordVersion: user.passwordVersion,
    isActive: user.isActive,
    permissions: user.permissions
  };
  if (user.technicianId) payload.technicianId = user.technicianId;
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

// 1. Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ $or: [ { email }, { name: email } ] });
  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Invalid credentials or inactive user' });
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  // Always return full permissions for admin
  const permissions = user.getEffectivePermissions ? user.getEffectivePermissions() : (user.permissions || {});
  const technicianId = user.technicianId || null;
  const token = signToken({ ...user.toObject(), permissions, technicianId });
  res.json({
    token,
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      canViewFinancials: user.canViewFinancials,
      permissions,
      technicianId
    }
  });
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
  const { name, email, password, role, canViewFinancials, permissions, technicianId } = req.body;
  console.log('ADD STAFF BODY:', req.body); // DEBUG
  if (await User.findOne({ email })) return res.status(400).json({ error: 'Email already exists' });
  const hash = await bcrypt.hash(password, 10);
  const user = new User({ name, email, password: hash, role, canViewFinancials, permissions, technicianId: role === 'technician' ? technicianId : null });
  await user.save();
  console.log('SAVED USER:', user); // DEBUG
  res.json({ message: 'Staff added' });
});

// 4. List users (admin only)
router.get('/list', auth, requireRole('admin'), async (req, res) => {
  const users = await User.find({}, '-password');
  // Always return full permissions for admin
  const usersWithPermissions = users.map(u => {
    const obj = u.toObject();
    obj.permissions = u.getEffectivePermissions ? u.getEffectivePermissions() : (u.permissions || {});
    return obj;
  });
  res.json(usersWithPermissions);
});

// 5. Edit user (admin only)
router.put('/:id/edit', auth, requireRole('admin'), async (req, res) => {
  const { role, canViewFinancials, isActive, permissions, technicianId } = req.body;
  console.log('EDIT USER BODY:', req.body); // DEBUG
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.role = role ?? user.role;
  user.canViewFinancials = canViewFinancials ?? user.canViewFinancials;
  if (permissions) user.permissions = permissions;
  if (role === 'technician') {
    user.technicianId = technicianId || null;
  } else {
    user.technicianId = null;
  }
  if (typeof isActive === 'boolean' && user.isActive !== isActive) {
    user.isActive = isActive;
    user.passwordVersion++;
  }
  await user.save();
  console.log('UPDATED USER:', user); // DEBUG
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

// 7. Permanent delete user (admin only, hard delete)
router.delete('/:id/permanent', auth, requireRole('admin'), async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  await user.deleteOne();
  res.json({ message: 'User permanently deleted' });
});

export default router;
