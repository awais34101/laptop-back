import TechnicianAssignment from '../models/TechnicianAssignment.js';
import Technician from '../models/Technician.js';
import Item from '../models/Item.js';

// Get all assignments
export const getAssignments = async (req, res) => {
  try {
    // Only get assignments that have both technicianId and at least one item
    const assignments = await TechnicianAssignment.find({
      technicianId: { $exists: true, $ne: null },
      itemIds: { $exists: true, $not: { $size: 0 } }
    })
      .populate('technicianId', 'name email')
      .populate('itemIds', 'name unit category')
      .populate('itemComments.itemId', 'name unit category');
    
    res.json(assignments);
  } catch (err) {
    console.error('Error fetching assignments:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Assign items to technician
export const createAssignment = async (req, res) => {
  try {
    const { technicianId, itemIds, itemComments = [] } = req.body;
    if (!technicianId || !itemIds || !Array.isArray(itemIds)) {
      return res.status(400).json({ error: 'Invalid data' });
    }

    // Remove these items from any other technician's assignment first
    await TechnicianAssignment.updateMany(
      { itemIds: { $in: itemIds }, technicianId: { $ne: technicianId } },
      { $pull: { itemIds: { $in: itemIds } } }
    );

    // Find existing assignment for this technician
    let assignment = await TechnicianAssignment.findOne({ technicianId });
    
    if (assignment) {
      // Add new items to existing assignment (avoid duplicates)
      const newItems = itemIds.filter(itemId => !assignment.itemIds.includes(itemId));
      assignment.itemIds.push(...newItems);
      
      // Add comments for new items
      const newComments = itemIds.map(itemId => {
        const existingComment = itemComments.find(c => c.itemId === itemId);
        const currentComment = assignment.itemComments.find(c => c.itemId.toString() === itemId);
        
        if (!currentComment) {
          return {
            itemId,
            comment: existingComment ? existingComment.comment : ''
          };
        }
        return null;
      }).filter(Boolean);
      
      assignment.itemComments.push(...newComments);
      await assignment.save();
    } else {
      // Create new assignment if none exists
      const formattedComments = itemIds.map(itemId => {
        const existingComment = itemComments.find(c => c.itemId === itemId);
        return {
          itemId,
          comment: existingComment ? existingComment.comment : ''
        };
      });

      assignment = new TechnicianAssignment({ 
        technicianId, 
        itemIds, 
        itemComments: formattedComments 
      });
      await assignment.save();
    }

    // Return populated assignment
    const populatedAssignment = await TechnicianAssignment.findById(assignment._id)
      .populate('technicianId', 'name email')
      .populate('itemIds', 'name unit category')
      .populate('itemComments.itemId', 'name unit category');

    res.status(201).json(populatedAssignment);
  } catch (err) {
    console.error('Error creating assignment:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Unassign items from technician
export const unassignItems = async (req, res) => {
  try {
    const { technicianId, itemIds } = req.body;
    if (!technicianId || !itemIds || !Array.isArray(itemIds)) {
      return res.status(400).json({ error: 'Invalid data' });
    }

    // Find the assignment for this technician
    const assignment = await TechnicianAssignment.findOne({ technicianId });
    
    if (!assignment) {
      return res.status(404).json({ error: 'No assignment found for this technician' });
    }

    // Remove the specified items from the assignment
    assignment.itemIds = assignment.itemIds.filter(
      itemId => !itemIds.includes(itemId.toString())
    );

    // If no items left, delete the assignment completely
    if (assignment.itemIds.length === 0) {
      await TechnicianAssignment.deleteOne({ technicianId });
      return res.json({ message: 'All items unassigned, assignment removed' });
    }

    // Save the updated assignment
    await assignment.save();

    // Return populated assignment
    const populatedAssignment = await TechnicianAssignment.findById(assignment._id)
      .populate('technicianId', 'name email')
      .populate('itemIds', 'name unit category');

    res.json(populatedAssignment);
  } catch (err) {
    console.error('Error unassigning items:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update comment for an item
export const updateItemComment = async (req, res) => {
  try {
    const { technicianId, itemId, comment } = req.body;
    if (!technicianId || !itemId) {
      return res.status(400).json({ error: 'Invalid data' });
    }

    // Find the assignment for this technician
    const assignment = await TechnicianAssignment.findOne({ technicianId });
    
    if (!assignment) {
      return res.status(404).json({ error: 'No assignment found for this technician' });
    }

    // Find or create the comment for this item
    const commentIndex = assignment.itemComments.findIndex(
      c => c.itemId.toString() === itemId
    );

    if (commentIndex >= 0) {
      // Update existing comment
      assignment.itemComments[commentIndex].comment = comment;
    } else {
      // Add new comment
      assignment.itemComments.push({ itemId, comment });
    }

    await assignment.save();

    // Return populated assignment
    const populatedAssignment = await TechnicianAssignment.findById(assignment._id)
      .populate('technicianId', 'name email')
      .populate('itemIds', 'name unit category')
      .populate('itemComments.itemId', 'name unit category');

    res.json(populatedAssignment);
  } catch (err) {
    console.error('Error updating comment:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Cleanup invalid assignments (for admin use)
export const cleanupInvalidAssignments = async (req, res) => {
  try {
    // Find invalid assignments
    const invalidAssignments = await TechnicianAssignment.find({
      $or: [
        { technicianId: { $exists: false } },
        { technicianId: null },
        { itemIds: { $size: 0 } },
        { itemIds: { $exists: false } }
      ]
    });

    console.log(`Found ${invalidAssignments.length} invalid assignments`);

    // Delete invalid assignments
    const result = await TechnicianAssignment.deleteMany({
      $or: [
        { technicianId: { $exists: false } },
        { technicianId: null },
        { itemIds: { $size: 0 } },
        { itemIds: { $exists: false } }
      ]
    });

    res.json({ 
      message: `Cleaned up ${result.deletedCount} invalid assignments`,
      deletedCount: result.deletedCount 
    });
  } catch (err) {
    console.error('Error cleaning up assignments:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
