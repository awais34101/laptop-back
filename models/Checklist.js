import mongoose from 'mongoose';

// Checklist Category Schema
const checklistCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Checklist Template Schema
const checklistTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChecklistCategory'
  },
  items: [{
    text: {
      type: String,
      required: true,
      trim: true
    },
    required: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'once', 'custom'],
    default: 'once'
  },
  activeDays: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  stores: [{
    type: String,
    enum: ['store1', 'store2', 'warehouse', 'all']
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Checklist Completion Schema
const checklistCompletionSchema = new mongoose.Schema({
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChecklistTemplate',
    required: true
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  completedAt: {
    type: Date,
    default: Date.now
  },
  items: [{
    text: {
      type: String,
      required: true
    },
    required: {
      type: Boolean,
      default: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date
    },
    notes: {
      type: String,
      trim: true
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  completionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['not-started', 'in-progress', 'completed', 'skipped', 'deleted'],
    default: 'not-started'
  },
  store: {
    type: String,
    enum: ['store1', 'store2', 'warehouse', 'other']
  },
  notes: {
    type: String,
    trim: true
  },
  startedAt: {
    type: Date
  },
  duration: {
    type: Number, // in minutes
    default: 0
  },
  issues: [{
    description: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, { timestamps: true });

// Calculate completion rate before saving
checklistCompletionSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    const completedItems = this.items.filter(item => item.completed).length;
    this.completionRate = Math.round((completedItems / this.items.length) * 100);
    
    // Update status based on completion
    if (this.completionRate === 0) {
      this.status = 'not-started';
    } else if (this.completionRate === 100) {
      this.status = 'completed';
    } else {
      this.status = 'in-progress';
    }
  }
  next();
});

// Indexes for better performance
checklistCategorySchema.index({ name: 1 });
checklistTemplateSchema.index({ name: 1, category: 1, isActive: 1 });
checklistCompletionSchema.index({ templateId: 1, completedBy: 1, completedAt: -1 });
checklistCompletionSchema.index({ completedAt: -1 });
checklistCompletionSchema.index({ status: 1, store: 1 });

const ChecklistCategory = mongoose.model('ChecklistCategory', checklistCategorySchema);
const ChecklistTemplate = mongoose.model('ChecklistTemplate', checklistTemplateSchema);
const ChecklistCompletion = mongoose.model('ChecklistCompletion', checklistCompletionSchema);

export { ChecklistCategory, ChecklistTemplate, ChecklistCompletion };
