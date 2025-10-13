import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Define all available permissions in the system
const AVAILABLE_PERMISSIONS = {
  dashboard: { view: true },
  items: { view: true, add: true, edit: true, delete: true },
  inventoryBoxes: { view: true, add: true, edit: true, delete: true },
  purchases: { view: true, add: true, edit: true, delete: true },
  purchaseSheets: { view: true, add: true, edit: true, delete: true },
  returnsStore: { view: true, add: true, edit: true, delete: true },
  returnsStore2: { view: true, add: true, edit: true, delete: true },
  warehouse: { view: true, add: true, edit: true, delete: true },
  sales: { view: true, add: true, edit: true, delete: true },
  salesStore2: { view: true, add: true, edit: true, delete: true },
  closingStore1: { view: true, add: true, edit: true, delete: true },
  closingStore2: { view: true, add: true, edit: true, delete: true },
  customers: { view: true, add: true, edit: true, delete: true },
  technicians: { view: true, add: true, edit: true, delete: true },
  transfers: { view: true, add: true, edit: true, delete: true },
  store: { view: true, add: true, edit: true, delete: true },
  store2: { view: true, add: true, edit: true, delete: true },
  settings: { view: true, edit: true },
  users: { view: true, add: true, edit: true, delete: true },
  expenses: { view: true, add: true, edit: true, delete: true },
  parts: { view: true, add: true, edit: true, delete: true },
  partsInventory: { view: true, add: true, edit: true, delete: true },
  time: { view: true, add: true, edit: true, delete: true },
  documents: { view: true, add: true, edit: true, delete: true },
  returns: { view: true, add: true, edit: true, delete: true },
  assignments: { view: true, add: true, edit: true, delete: true },
  alerts: { view: true, add: true, edit: true, delete: true },
  closing: { view: true, add: true, edit: true, delete: true },
  checklists: { view: true, add: true, edit: true, delete: true, complete: true },
};

// Full admin permissions
const FULL_PERMISSIONS = { ...AVAILABLE_PERMISSIONS };

// Role-based default permissions
const ROLE_PERMISSIONS = {
  admin: FULL_PERMISSIONS,
  manager: {
    dashboard: { view: true },
    items: { view: true, add: true, edit: true, delete: true },
    inventoryBoxes: { view: true, add: true, edit: true, delete: true },
    purchases: { view: true, add: true, edit: true, delete: true },
    purchaseSheets: { view: true, add: true, edit: true, delete: true },
    returnsStore: { view: true, add: true, edit: true, delete: true },
    returnsStore2: { view: true, add: true, edit: true, delete: true },
    warehouse: { view: true, add: true, edit: true, delete: true },
    sales: { view: true, add: true, edit: true, delete: true },
    salesStore2: { view: true, add: true, edit: true, delete: true },
    closingStore1: { view: true, add: true, edit: true, delete: true },
    closingStore2: { view: true, add: true, edit: true, delete: true },
    customers: { view: true, add: true, edit: true, delete: true },
    technicians: { view: true, add: true, edit: true },
    transfers: { view: true, add: true, edit: true, delete: true },
    store: { view: true, add: true, edit: true, delete: true },
    store2: { view: true, add: true, edit: true, delete: true },
    expenses: { view: true, add: true, edit: true, delete: true },
    parts: { view: true, add: true, edit: true, delete: true },
    partsInventory: { view: true, add: true, edit: true, delete: true },
    time: { view: true, add: true, edit: true, delete: true },
    documents: { view: true, add: true, edit: true, delete: true },
    returns: { view: true, add: true, edit: true, delete: true },
    assignments: { view: true, add: true, edit: true, delete: true },
    alerts: { view: true, add: true, edit: true, delete: true },
    closing: { view: true, add: true, edit: true, delete: true },
  },
  staff: {
    dashboard: { view: true },
    items: { view: true, add: true, edit: true },
    inventoryBoxes: { view: true, add: true, edit: true },
    sales: { view: true, add: true, edit: true },
    salesStore2: { view: true, add: true, edit: true },
    customers: { view: true, add: true, edit: true },
    partsInventory: { view: true },
    parts: { view: true },
    documents: { view: true, add: true },
    expenses: { view: true, add: true },
    transfers: { view: true },
    store: { view: true, add: true, edit: true },
    store2: { view: true, add: true, edit: true },
    purchases: { view: true },
    purchaseSheets: { view: true },
    technicians: { view: true },
    warehouse: { view: true },
    time: { view: true, add: true, edit: true },
    returnsStore: { view: true, add: true, edit: true },
    returnsStore2: { view: true, add: true, edit: true },
    closingStore1: { view: true, add: true, edit: true },
    closingStore2: { view: true, add: true, edit: true },
    checklists: { view: true, add: true, edit: true, complete: true },
    settings: { view: true },
  },
  technician: {
    dashboard: { view: true },
    assignments: { view: true, edit: true },
    parts: { view: true },
    partsInventory: { view: true },
    time: { view: true, add: true, edit: true },
    documents: { view: true, add: true },
    customers: { view: true },
  },
};

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: { 
    type: String, 
    enum: {
      values: ['admin', 'manager', 'staff', 'technician'],
      message: 'Role must be one of: admin, manager, staff, technician'
    }, 
    default: 'staff' 
  },
  technicianId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Technician', 
    default: null 
  },
  canViewFinancials: { 
    type: Boolean, 
    default: function() {
      return ['admin', 'manager'].includes(this.role);
    }
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  passwordVersion: { 
    type: Number, 
    default: 1 
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockedUntil: {
    type: Date,
    default: null
  },
  permissions: {
    type: Object,
    default: function() {
      return ROLE_PERMISSIONS[this.role] || {};
    },
    validate: {
      validator: function(permissions) {
        // Validate that permissions follow the correct structure
        for (const [section, actions] of Object.entries(permissions)) {
          if (!AVAILABLE_PERMISSIONS[section]) {
            return false; // Invalid section
          }
          for (const action of Object.keys(actions)) {
            if (!AVAILABLE_PERMISSIONS[section][action]) {
              return false; // Invalid action for this section
            }
          }
        }
        return true;
      },
      message: 'Invalid permission structure'
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { 
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.passwordVersion;
      delete ret.loginAttempts;
      delete ret.lockedUntil;
      return ret;
    }
  }
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockedUntil && this.lockedUntil > Date.now());
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Hash password if it's modified
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  
  // Set default permissions based on role if permissions are empty
  if (this.isModified('role') && (!this.permissions || Object.keys(this.permissions).length === 0)) {
    this.permissions = ROLE_PERMISSIONS[this.role] || {};
  }
  
  // Set canViewFinancials based on role if not explicitly set
  if (this.isModified('role') && this.canViewFinancials === undefined) {
    this.canViewFinancials = ['admin', 'manager'].includes(this.role);
  }
  
  next();
});

// Instance methods
userSchema.methods.getEffectivePermissions = function() {
  // Always return full permissions for admin regardless of stored permissions
  if (this.role === 'admin') {
    return FULL_PERMISSIONS;
  }
  
  const customPermissions = this.permissions || {};
  
  // If user has custom permissions defined, use those exclusively
  // This allows for truly custom permission sets that override role defaults
  if (Object.keys(customPermissions).length > 0) {
    return customPermissions;
  }
  
  // Otherwise, fall back to role-based permissions
  return ROLE_PERMISSIONS[this.role] || {};
};

userSchema.methods.hasPermission = function(section, action) {
  const permissions = this.getEffectivePermissions();
  return !!(permissions[section]?.[action]);
};

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.incrementLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockedUntil && this.lockedUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockedUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockedUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockedUntil: 1 },
    $set: { lastLogin: new Date() }
  });
};

userSchema.methods.invalidateTokens = function() {
  this.passwordVersion += 1;
  return this.save();
};

// Static methods
userSchema.statics.getAvailablePermissions = function() {
  return AVAILABLE_PERMISSIONS;
};

userSchema.statics.getRolePermissions = function(role) {
  return ROLE_PERMISSIONS[role] || {};
};

userSchema.statics.createUser = async function(userData, createdBy = null) {
  const user = new this({
    ...userData,
    createdBy
  });
  
  await user.save();
  return user;
};

export default mongoose.model('User', userSchema);
