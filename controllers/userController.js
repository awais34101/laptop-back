import User from '../models/User.js';
import Technician from '../models/Technician.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

class UserController {
  
  // Helper function to sign JWT tokens
  static signToken(user) {
    const payload = {
      userId: user._id,
      role: user.role,
      canViewFinancials: user.canViewFinancials,
      passwordVersion: user.passwordVersion,
      isActive: user.isActive,
      permissions: user.getEffectivePermissions()
    };
    
    if (user.technicianId) {
      payload.technicianId = user.technicianId;
    }
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  }

  // User authentication
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required',
          code: 'MISSING_CREDENTIALS'
        });
      }

      // Find user by email or name
      const user = await User.findOne({ 
        $or: [{ email: email.toLowerCase() }, { name: email }] 
      }).select('+password +passwordVersion +loginAttempts +lockedUntil');

      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Check if account is locked
      if (user.isLocked) {
        return res.status(401).json({
          error: 'Account is temporarily locked due to failed login attempts',
          code: 'ACCOUNT_LOCKED'
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(401).json({
          error: 'Account has been deactivated',
          code: 'ACCOUNT_DEACTIVATED'
        });
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      
      if (!isValidPassword) {
        await user.incrementLoginAttempts();
        return res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Reset login attempts on successful login
      await user.resetLoginAttempts();

      // Generate token
      const token = UserController.signToken(user);

      // Return response
      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          canViewFinancials: user.canViewFinancials,
          permissions: user.getEffectivePermissions(),
          technicianId: user.technicianId,
          lastLogin: user.lastLogin
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Internal server error during login',
        code: 'LOGIN_ERROR'
      });
    }
  }

  // Get current user profile
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.userId)
        .populate('technicianId', 'name employeeId')
        .populate('createdBy', 'name')
        .populate('updatedBy', 'name');

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      res.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          canViewFinancials: user.canViewFinancials,
          permissions: user.getEffectivePermissions(),
          technicianId: user.technicianId,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          createdBy: user.createdBy,
          updatedBy: user.updatedBy
        }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    }
  }

  // List all users (admin only)
  static async listUsers(req, res) {
    try {
      const { page = 1, limit = 20, role, isActive, search } = req.query;
      
      // Build filter
      const filter = {};
      if (role) filter.role = role;
      if (isActive !== undefined) filter.isActive = isActive === 'true';
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      // Execute query with pagination
      const users = await User.find(filter)
        .populate('technicianId', 'name employeeId')
        .populate('createdBy', 'name')
        .select('-password -passwordVersion -loginAttempts -lockedUntil')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await User.countDocuments(filter);

      // Add effective permissions to each user
      const usersWithPermissions = users.map(user => ({
        ...user.toObject(),
        permissions: user.getEffectivePermissions()
      }));

      res.json({
        users: usersWithPermissions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('List users error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    }
  }

  // Create new user (admin only)
  static async createUser(req, res) {
    try {
      const {
        name,
        email,
        password,
        role = 'staff',
        canViewFinancials,
        permissions,
        technicianId
      } = req.body;

      // Validate required fields
      if (!name || !email || !password) {
        return res.status(400).json({
          error: 'Name, email, and password are required',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      // Check if email already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          error: 'Email already exists',
          code: 'EMAIL_EXISTS'
        });
      }

      // Validate technician ID if provided
      if (technicianId && role === 'technician') {
        const technician = await Technician.findById(technicianId);
        if (!technician) {
          return res.status(400).json({
            error: 'Invalid technician ID',
            code: 'INVALID_TECHNICIAN'
          });
        }
      }

      // Create user
      const userData = {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        role,
        createdBy: req.user.userId
      };

      if (canViewFinancials !== undefined) {
        userData.canViewFinancials = canViewFinancials;
      }

      if (permissions) {
        userData.permissions = permissions;
      }

      if (technicianId && role === 'technician') {
        userData.technicianId = technicianId;
      }

      const user = await User.createUser(userData, req.user.userId);

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          canViewFinancials: user.canViewFinancials,
          permissions: user.getEffectivePermissions(),
          technicianId: user.technicianId,
          isActive: user.isActive
        }
      });

    } catch (error) {
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          error: 'Validation error',
          details: errors,
          code: 'VALIDATION_ERROR'
        });
      }

      console.error('Create user error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    }
  }

  // Update user (admin only)
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        email,
        role,
        canViewFinancials,
        isActive,
        permissions,
        technicianId
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: 'Invalid user ID',
          code: 'INVALID_USER_ID'
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Check if email is taken by another user
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ 
          email: email.toLowerCase(),
          _id: { $ne: id }
        });
        if (existingUser) {
          return res.status(400).json({
            error: 'Email already exists',
            code: 'EMAIL_EXISTS'
          });
        }
      }

      // Validate technician ID if provided
      if (technicianId && role === 'technician') {
        const technician = await Technician.findById(technicianId);
        if (!technician) {
          return res.status(400).json({
            error: 'Invalid technician ID',
            code: 'INVALID_TECHNICIAN'
          });
        }
      }

      // Track what changed for token invalidation
      let shouldInvalidateTokens = false;
      
      // Update fields
      if (name !== undefined) user.name = name.trim();
      if (email !== undefined) user.email = email.toLowerCase().trim();
      
      if (role !== undefined && role !== user.role) {
        user.role = role;
        shouldInvalidateTokens = true;
      }
      
      if (canViewFinancials !== undefined && canViewFinancials !== user.canViewFinancials) {
        user.canViewFinancials = canViewFinancials;
        shouldInvalidateTokens = true;
      }
      
      if (isActive !== undefined && isActive !== user.isActive) {
        user.isActive = isActive;
        shouldInvalidateTokens = true;
      }
      
      if (permissions !== undefined) {
        user.permissions = permissions;
        shouldInvalidateTokens = true;
      }

      if (role === 'technician' && technicianId) {
        user.technicianId = technicianId;
      } else if (role !== 'technician') {
        user.technicianId = null;
      }

      user.updatedBy = req.user.userId;

      // Invalidate tokens if necessary
      if (shouldInvalidateTokens) {
        user.passwordVersion += 1;
      }

      await user.save();

      res.json({
        message: 'User updated successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          canViewFinancials: user.canViewFinancials,
          permissions: user.getEffectivePermissions(),
          technicianId: user.technicianId,
          isActive: user.isActive
        }
      });

    } catch (error) {
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          error: 'Validation error',
          details: errors,
          code: 'VALIDATION_ERROR'
        });
      }

      console.error('Update user error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    }
  }

  // Delete user (admin only) - soft delete
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: 'Invalid user ID',
          code: 'INVALID_USER_ID'
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Prevent admin from deleting themselves
      if (user._id.toString() === req.user.userId.toString()) {
        return res.status(400).json({
          error: 'Cannot delete your own account',
          code: 'CANNOT_DELETE_SELF'
        });
      }

      // Soft delete
      user.isActive = false;
      user.updatedBy = req.user.userId;
      await user.invalidateTokens();

      res.json({
        message: 'User deactivated successfully'
      });

    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    }
  }

  // Permanently delete user (admin only)
  static async permanentDeleteUser(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: 'Invalid user ID',
          code: 'INVALID_USER_ID'
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Prevent admin from deleting themselves
      if (user._id.toString() === req.user.userId.toString()) {
        return res.status(400).json({
          error: 'Cannot delete your own account',
          code: 'CANNOT_DELETE_SELF'
        });
      }

      await User.findByIdAndDelete(id);

      res.json({
        message: 'User permanently deleted'
      });

    } catch (error) {
      console.error('Permanent delete user error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    }
  }

  // Change password
  static async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;
      const { userId } = req.params;

      // Check if user is changing their own password or admin changing someone else's
      if (userId && req.user.role !== 'admin' && req.user.userId.toString() !== userId) {
        return res.status(403).json({
          error: 'You can only change your own password',
          code: 'UNAUTHORIZED_PASSWORD_CHANGE'
        });
      }

      const targetUserId = userId || req.user.userId;
      const user = await User.findById(targetUserId).select('+password');

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Validate old password (required for non-admin or self-change)
      if (!userId || req.user.userId.toString() === targetUserId) {
        if (!oldPassword) {
          return res.status(400).json({
            error: 'Old password is required',
            code: 'OLD_PASSWORD_REQUIRED'
          });
        }

        const isValidOldPassword = await user.comparePassword(oldPassword);
        if (!isValidOldPassword) {
          return res.status(400).json({
            error: 'Current password is incorrect',
            code: 'INVALID_OLD_PASSWORD'
          });
        }
      }

      // Validate new password
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
          error: 'New password must be at least 6 characters long',
          code: 'INVALID_NEW_PASSWORD'
        });
      }

      // Update password
      user.password = newPassword;
      user.updatedBy = req.user.userId;
      await user.invalidateTokens();

      res.json({
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    }
  }

  // Get available permissions
  static async getAvailablePermissions(req, res) {
    try {
      const availablePermissions = User.getAvailablePermissions();
      const rolePermissions = {};
      
      ['admin', 'manager', 'staff', 'technician'].forEach(role => {
        rolePermissions[role] = User.getRolePermissions(role);
      });

      res.json({
        availablePermissions,
        rolePermissions
      });

    } catch (error) {
      console.error('Get permissions error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    }
  }

  // Bulk user operations (admin only)
  static async bulkUpdateUsers(req, res) {
    try {
      const { userIds, action, data } = req.body;

      if (!userIds || !Array.isArray(userIds) || !action) {
        return res.status(400).json({
          error: 'User IDs array and action are required',
          code: 'MISSING_BULK_DATA'
        });
      }

      const results = {
        success: [],
        failed: []
      };

      for (const userId of userIds) {
        try {
          if (!mongoose.Types.ObjectId.isValid(userId)) {
            results.failed.push({ userId, error: 'Invalid user ID' });
            continue;
          }

          const user = await User.findById(userId);
          if (!user) {
            results.failed.push({ userId, error: 'User not found' });
            continue;
          }

          let shouldInvalidateTokens = false;

          switch (action) {
            case 'activate':
              user.isActive = true;
              shouldInvalidateTokens = true;
              break;
            case 'deactivate':
              user.isActive = false;
              shouldInvalidateTokens = true;
              break;
            case 'updateRole':
              if (data.role) {
                user.role = data.role;
                shouldInvalidateTokens = true;
              }
              break;
            case 'updatePermissions':
              if (data.permissions) {
                user.permissions = data.permissions;
                shouldInvalidateTokens = true;
              }
              break;
            default:
              results.failed.push({ userId, error: 'Invalid action' });
              continue;
          }

          user.updatedBy = req.user.userId;
          
          if (shouldInvalidateTokens) {
            user.passwordVersion += 1;
          }

          await user.save();
          results.success.push({ userId, message: 'Updated successfully' });

        } catch (error) {
          results.failed.push({ userId, error: error.message });
        }
      }

      res.json({
        message: 'Bulk operation completed',
        results
      });

    } catch (error) {
      console.error('Bulk update error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    }
  }
}

export default UserController;