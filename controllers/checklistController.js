import { ChecklistCategory, ChecklistTemplate, ChecklistCompletion } from '../models/Checklist.js';

// ==================== CATEGORIES ====================

// Get all categories
export const getCategories = async (req, res) => {
  try {
    const categories = await ChecklistCategory.find({ isActive: true })
      .populate('createdBy', 'username')
      .sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error fetching categories' });
  }
};

// Create category
export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Check for duplicate
    const existing = await ChecklistCategory.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: 'Category with this name already exists' });
    }

    const category = new ChecklistCategory({
      name: name.trim(),
      description: description?.trim(),
      createdBy: req.user.userId
    });

    await category.save();
    await category.populate('createdBy', 'username');

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Server error creating category' });
  }
};

// Update category
export const updateCategory = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    const category = await ChecklistCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    if (name) category.name = name.trim();
    if (description !== undefined) category.description = description?.trim();
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();
    await category.populate('createdBy', 'username');

    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Server error updating category' });
  }
};

// Delete category
export const deleteCategory = async (req, res) => {
  try {
    const category = await ChecklistCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if category is used in templates
    const templatesCount = await ChecklistTemplate.countDocuments({ category: req.params.id });
    if (templatesCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete category. It is used in ${templatesCount} template(s)` 
      });
    }

    await ChecklistCategory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Server error deleting category' });
  }
};

// ==================== TEMPLATES ====================

// Get all templates
export const getTemplates = async (req, res) => {
  try {
    const { category, isActive, frequency, store } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (frequency) filter.frequency = frequency;
    if (store) filter.stores = store;

    const templates = await ChecklistTemplate.find(filter)
      .populate('category', 'name')
      .populate('createdBy', 'username')
      .populate('assignedTo', 'username')
      .sort({ name: 1 });

    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ message: 'Server error fetching templates' });
  }
};

// Get template by ID
export const getTemplateById = async (req, res) => {
  try {
    const template = await ChecklistTemplate.findById(req.params.id)
      .populate('category', 'name')
      .populate('createdBy', 'username')
      .populate('assignedTo', 'username');

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ message: 'Server error fetching template' });
  }
};

// Create template
export const createTemplate = async (req, res) => {
  try {
    const { name, description, category, items, frequency, assignedTo, stores, activeDays } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Template name is required' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Template must have at least one item' });
    }

    const template = new ChecklistTemplate({
      name: name.trim(),
      description: description?.trim(),
      category: category || null,
      items: items.map((item, index) => ({
        text: item.text.trim(),
        required: item.required !== false,
        order: item.order || index
      })),
      frequency: frequency || 'once',
      assignedTo: assignedTo || [],
      stores: stores || [],
      activeDays: activeDays || [],
      createdBy: req.user.userId
    });

    await template.save();
    await template.populate('category', 'name');
    await template.populate('createdBy', 'username');
    await template.populate('assignedTo', 'username');

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ message: 'Server error creating template' });
  }
};

// Update template
export const updateTemplate = async (req, res) => {
  try {
    const { name, description, category, items, frequency, assignedTo, stores, isActive, activeDays } = req.body;
    const template = await ChecklistTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (name) template.name = name.trim();
    if (description !== undefined) template.description = description?.trim();
    if (category !== undefined) template.category = category || null;
    if (frequency) template.frequency = frequency;
    if (assignedTo !== undefined) template.assignedTo = assignedTo;
    if (stores !== undefined) template.stores = stores;
    if (isActive !== undefined) template.isActive = isActive;
    if (activeDays !== undefined) template.activeDays = activeDays;
    
    if (items && items.length > 0) {
      template.items = items.map((item, index) => ({
        text: item.text.trim(),
        required: item.required !== false,
        order: item.order || index
      }));
    }

    await template.save();
    await template.populate('category', 'name');
    await template.populate('createdBy', 'username');
    await template.populate('assignedTo', 'username');

    res.json(template);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ message: 'Server error updating template' });
  }
};

// Delete template
export const deleteTemplate = async (req, res) => {
  try {
    const template = await ChecklistTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Check if template has completions
    const completionsCount = await ChecklistCompletion.countDocuments({ templateId: req.params.id });
    if (completionsCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete template. It has ${completionsCount} completion record(s)` 
      });
    }

    await ChecklistTemplate.findByIdAndDelete(req.params.id);
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ message: 'Server error deleting template' });
  }
};

// ==================== COMPLETIONS ====================

// Get completions (history/reports)
export const getCompletions = async (req, res) => {
  try {
    const { days, templateId, completedBy, status, store, startDate, endDate } = req.query;
    const filter = { status: { $ne: 'deleted' } }; // Exclude deleted completions from history

    // Date filtering
    if (days) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));
      filter.completedAt = { $gte: daysAgo };
    } else if (startDate && endDate) {
      filter.completedAt = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    }

    if (templateId) filter.templateId = templateId;
    if (completedBy) filter.completedBy = completedBy;
    if (status) filter.status = status; // This will override the $ne filter if status is explicitly requested
    if (store) filter.store = store;

    const completions = await ChecklistCompletion.find(filter)
      .populate('templateId', 'name category')
      .populate({
        path: 'templateId',
        populate: { path: 'category', select: 'name' }
      })
      .populate('completedBy', 'username')
      .sort({ completedAt: -1 });

    res.json(completions);
  } catch (error) {
    console.error('Error fetching completions:', error);
    res.status(500).json({ message: 'Server error fetching completions' });
  }
};

// Get completion statistics
export const getCompletionStats = async (req, res) => {
  try {
    const { days = 30, store } = req.query;
    const filter = { status: { $ne: 'deleted' } }; // Exclude deleted records from stats

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));
    filter.completedAt = { $gte: daysAgo };

    if (store) filter.store = store;

    const [stats, templateStats] = await Promise.all([
      // Overall stats
      ChecklistCompletion.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
            avgCompletionRate: { $avg: '$completionRate' },
            avgDuration: { $avg: '$duration' }
          }
        }
      ]),

      // By template
      ChecklistCompletion.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$templateId',
            count: { $sum: 1 },
            avgCompletionRate: { $avg: '$completionRate' },
            lastCompleted: { $max: '$completedAt' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Populate template names
    await ChecklistTemplate.populate(templateStats, { path: '_id', select: 'name' });

    res.json({
      overall: stats[0] || {
        total: 0,
        completed: 0,
        inProgress: 0,
        avgCompletionRate: 0,
        avgDuration: 0
      },
      byTemplate: templateStats
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ message: 'Server error fetching statistics' });
  }
};

// Create/Start checklist completion
export const startCompletion = async (req, res) => {
  try {
    const { templateId, store, notes, items, status } = req.body;

    if (!templateId) {
      return res.status(400).json({ message: 'Template ID is required' });
    }

    const template = await ChecklistTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (!template.isActive) {
      return res.status(400).json({ message: 'This template is inactive' });
    }

    // Use items from request if provided, otherwise use template items
    const checklistItems = items && items.length > 0 
      ? items.map(item => ({
          text: item.text,
          required: item.required !== undefined ? item.required : true,
          completed: item.completed || false,
          completedAt: item.completed ? new Date() : null,
          notes: item.notes?.trim(),
          order: item.order || 0
        }))
      : template.items.map(item => ({
          text: item.text,
          required: item.required,
          completed: false,
          order: item.order
        }));

    const completion = new ChecklistCompletion({
      templateId,
      completedBy: req.user.userId,
      startedAt: new Date(),
      store: store || 'other',
      notes: notes?.trim(),
      items: checklistItems,
      status: status || 'not-started' // Use status from request if provided
    });

    await completion.save(); // This will trigger the pre-save hook to calculate completion rate
    await completion.populate('templateId', 'name category');
    await completion.populate('completedBy', 'username');

    res.status(201).json(completion);
  } catch (error) {
    console.error('Error starting completion:', error);
    res.status(500).json({ message: 'Server error starting completion' });
  }
};

// Update checklist completion
export const updateCompletion = async (req, res) => {
  try {
    const { items, notes, issues, status } = req.body;
    const completion = await ChecklistCompletion.findById(req.params.id);

    if (!completion) {
      return res.status(404).json({ message: 'Completion record not found' });
    }

    if (items) {
      completion.items = items.map((item, index) => ({
        ...item,
        completedAt: item.completed && !completion.items[index]?.completed ? new Date() : completion.items[index]?.completedAt
      }));
    }

    if (notes !== undefined) completion.notes = notes?.trim();
    if (issues !== undefined) completion.issues = issues;
    if (status) completion.status = status;

    // Calculate duration if completing
    if (status === 'completed' && completion.startedAt) {
      const duration = Math.round((new Date() - completion.startedAt) / 60000); // minutes
      completion.duration = duration;
    }

    await completion.save(); // Will auto-calculate completion rate
    await completion.populate('templateId', 'name category');
    await completion.populate('completedBy', 'username');

    res.json(completion);
  } catch (error) {
    console.error('Error updating completion:', error);
    res.status(500).json({ message: 'Server error updating completion' });
  }
};

// Get today's pending checklists
export const getTodaysPending = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    const { store } = req.query;

    // Get all active templates
    const filter = { isActive: true };
    if (store) filter.stores = store;

    const templates = await ChecklistTemplate.find(filter)
      .populate('category', 'name');

    // Check which ones are already completed or in-progress today
    const existingCompletions = await ChecklistCompletion.find({
      templateId: { $in: templates.map(t => t._id) },
      status: { $in: ['completed', 'in-progress', 'deleted'] }, // Include deleted status
      $or: [
        { completedAt: { $gte: today } },
        { createdAt: { $gte: today } },
        { startedAt: { $gte: today } }
      ]
    }).select('templateId store status');

    // Create a map of completed/in-progress template+store combinations
    const completedMap = new Map();
    existingCompletions.forEach(c => {
      const key = `${c.templateId}_${c.store || 'all'}`;
      completedMap.set(key, true);
    });

    // Check for once templates that have ever been completed OR in-progress OR deleted
    const onceTemplateIds = templates.filter(t => t.frequency === 'once').map(t => t._id);
    if (onceTemplateIds.length > 0) {
      const onceCompleted = await ChecklistCompletion.find({
        templateId: { $in: onceTemplateIds },
        status: { $in: ['completed', 'in-progress', 'deleted'] } // Include deleted status
      }).select('templateId store');

      onceCompleted.forEach(c => {
        // Mark all variations to ensure proper filtering
        const key1 = `${c.templateId}_${c.store}`;
        const key2 = `${c.templateId}_all`;
        completedMap.set(key1, true);
        completedMap.set(key2, true);
      });
    }

    // Filter templates based on frequency
    const pending = [];
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = daysOfWeek[dayOfWeek];
    
    for (const template of templates) {
      let shouldShow = false;

      switch (template.frequency) {
        case 'daily':
          // Check if activeDays is set and includes today
          if (template.activeDays && template.activeDays.length > 0) {
            shouldShow = template.activeDays.includes(currentDayName);
          } else {
            shouldShow = true; // Show daily if no specific days are set
          }
          break;
        case 'weekly':
          // Check if activeDays is set and includes today
          if (template.activeDays && template.activeDays.length > 0) {
            shouldShow = template.activeDays.includes(currentDayName);
          } else {
            shouldShow = (dayOfWeek === 1); // Default to Monday if no days set
          }
          break;
        case 'monthly':
          // Check if activeDays is set and includes today
          if (template.activeDays && template.activeDays.length > 0) {
            shouldShow = (today.getDate() === 1) && template.activeDays.includes(currentDayName);
          } else {
            shouldShow = (today.getDate() === 1); // Default to 1st of month
          }
          break;
        case 'once':
          // Show if never completed OR in-progress
          shouldShow = true;
          break;
        default:
          shouldShow = false;
      }

      if (shouldShow) {
        // Check if template has specific stores or applies to all
        if (template.stores && template.stores.length > 0) {
          // For each store in template
          template.stores.forEach(templateStore => {
            const key = `${template._id}_${templateStore}`;
            if (!completedMap.has(key)) {
              pending.push({
                ...template.toObject(),
                assignedStore: templateStore
              });
            }
          });
        } else {
          // No specific stores - general checklist
          // Check multiple possible keys for flexibility
          const keyWithAll = `${template._id}_all`;
          const keyWithOther = `${template._id}_other`;
          const keyWithStore1 = `${template._id}_store1`;
          const keyWithStore2 = `${template._id}_store2`;
          const keyWithWarehouse = `${template._id}_warehouse`;
          
          // If none of these keys exist in completedMap, show the template
          if (!completedMap.has(keyWithAll) && 
              !completedMap.has(keyWithOther) &&
              !completedMap.has(keyWithStore1) &&
              !completedMap.has(keyWithStore2) &&
              !completedMap.has(keyWithWarehouse)) {
            pending.push(template);
          }
        }
      }
    }

    res.json(pending);
  } catch (error) {
    console.error('Error fetching pending checklists:', error);
    res.status(500).json({ message: 'Server error fetching pending checklists' });
  }
};

// Delete completion
export const deleteCompletion = async (req, res) => {
  try {
    const completion = await ChecklistCompletion.findById(req.params.id);

    if (!completion) {
      return res.status(404).json({ message: 'Completion record not found' });
    }

    // Only allow deletion by admin or the person who created it
    if (req.user.role !== 'admin' && completion.completedBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this record' });
    }

    // Mark as deleted instead of actually deleting so it won't reappear in pending list
    completion.status = 'deleted';
    await completion.save();
    
    res.json({ message: 'Completion record deleted successfully' });
  } catch (error) {
    console.error('Error deleting completion:', error);
    res.status(500).json({ message: 'Server error deleting completion' });
  }
};
