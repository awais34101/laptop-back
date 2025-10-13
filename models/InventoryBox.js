import mongoose from 'mongoose';

const inventoryBoxSchema = new mongoose.Schema({
  boxNumber: { 
    type: String, 
    required: true, 
    trim: true 
    // Removed global unique - will use compound index instead
  },
  location: { 
    type: String, 
    required: true,
    enum: ['Store', 'Store2', 'Warehouse'],
    trim: true,
    default: 'Store'
  },
  description: { 
    type: String, 
    trim: true 
  },
  capacity: { 
    type: Number, 
    default: 50 
  },
  items: [{
    itemId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Item' 
    },
    itemName: String,
    quantity: { 
      type: Number, 
      default: 0 
    },
    notes: String
  }],
  status: {
    type: String,
    enum: ['Active', 'Full', 'Inactive'],
    default: 'Active'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Compound unique index - boxNumber must be unique per location
inventoryBoxSchema.index({ boxNumber: 1, location: 1 }, { unique: true });

// Additional indexes for faster searches
inventoryBoxSchema.index({ location: 1 });
inventoryBoxSchema.index({ 'items.itemId': 1 });

export default mongoose.model('InventoryBox', inventoryBoxSchema);
