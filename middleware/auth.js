import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Main authentication middleware
export default async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Access denied. No valid token provided.',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. Invalid token format.',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch fresh user data from database
    const user = await User.findById(decoded.userId).select('+passwordVersion');
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token. User not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account has been deactivated.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Check if user account is locked
    if (user.isLocked) {
      return res.status(401).json({ 
        error: 'Account is temporarily locked due to failed login attempts.',
        code: 'ACCOUNT_LOCKED'
      });
    }

    // Check password version (invalidate old tokens)
    if (user.passwordVersion !== decoded.passwordVersion) {
      return res.status(401).json({ 
        error: 'Token has been invalidated. Please login again.',
        code: 'TOKEN_INVALIDATED'
      });
    }

    // Attach user data to request
    req.user = {
      userId: user._id,
      role: user.role,
      canViewFinancials: user.canViewFinancials,
      technicianId: user.technicianId,
      permissions: user.getEffectivePermissions(),
      name: user.name,
      email: user.email
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token has expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Internal server error during authentication.',
      code: 'AUTH_ERROR'
    });
  }
}

// Role-based access control middleware
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}.`,
        code: 'INSUFFICIENT_ROLE'
      });
    }

    next();
  };
}

// Permission-based access control middleware
export function requirePermission(section, action = 'view') {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required.',
          code: 'AUTH_REQUIRED'
        });
      }

      // Admin always has all permissions
      if (req.user.role === 'admin') {
        return next();
      }

      // Get fresh permissions from database for critical operations
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(401).json({ 
          error: 'User not found.',
          code: 'USER_NOT_FOUND'
        });
      }

      const permissions = user.getEffectivePermissions();
      
      // Check if user has the required permission
      if (!permissions[section]?.[action]) {
        return res.status(403).json({ 
          error: `Access denied. Required permission: ${section}.${action}`,
          code: 'INSUFFICIENT_PERMISSION',
          required: { section, action }
        });
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({ 
        error: 'Internal server error during authorization.',
        code: 'AUTH_ERROR'
      });
    }
  };
}

// Multiple permissions check (user needs at least one)
export function requireAnyPermission(permissionList) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required.',
          code: 'AUTH_REQUIRED'
        });
      }

      // Admin always has all permissions
      if (req.user.role === 'admin') {
        return next();
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(401).json({ 
          error: 'User not found.',
          code: 'USER_NOT_FOUND'
        });
      }

      const permissions = user.getEffectivePermissions();
      
      // Check if user has at least one of the required permissions
      const hasPermission = permissionList.some(({ section, action }) => 
        permissions[section]?.[action]
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Access denied. Insufficient permissions.',
          code: 'INSUFFICIENT_PERMISSION',
          required: permissionList
        });
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({ 
        error: 'Internal server error during authorization.',
        code: 'AUTH_ERROR'
      });
    }
  };
}

// Financial data access middleware
export function requireFinancialAccess() {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!req.user.canViewFinancials) {
      return res.status(403).json({ 
        error: 'Access denied. Financial data access required.',
        code: 'FINANCIAL_ACCESS_DENIED'
      });
    }

    next();
  };
}

// Self-service middleware (users can only access their own data)
export function requireSelfOrAdmin(userIdParam = 'userId') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    const targetUserId = req.params[userIdParam] || req.body[userIdParam];
    
    if (req.user.role === 'admin' || req.user.userId.toString() === targetUserId) {
      return next();
    }

    return res.status(403).json({ 
      error: 'Access denied. You can only access your own data.',
      code: 'SELF_ACCESS_ONLY'
    });
  };
}
