import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export default async function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  try {
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.userId);
    if (!user || !user.isActive || user.passwordVersion !== payload.passwordVersion) {
      return res.status(401).json({ error: 'Token invalid or user inactive' });
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}


export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Usage: requirePermission('items', 'edit')
export function requirePermission(section, action) {
  return async (req, res, next) => {
    // req.user.permissions is available from JWT
    const perms = req.user && req.user.permissions;
    if (!perms || !perms[section] || !perms[section][action]) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
