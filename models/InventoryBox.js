import mongoose from 'mongoose';

const inventoryBoxSchema = new mongoose.Schema({
  boxNumber: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  location: { 
    type: String, 
    required: true,
    trim: true,
    default: 'Showroom'
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

// Index for faster searches
inventoryBoxSchema.index({ boxNumber: 1 });
inventoryBoxSchema.index({ location: 1 });
inventoryBoxSchema.index({ 'items.itemId': 1 });

export default mongoose.model('InventoryBox', inventoryBoxSchema);
