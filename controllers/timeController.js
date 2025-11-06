import TimeEntry from '../models/TimeEntry.js';
import User from '../models/User.js';

function startOfDayUTC(d) {
  const dt = new Date(d);
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
}

export async function clockIn(req, res) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = new Date();
    const sod = startOfDayUTC(now);

    // Ensure no active open shift for today
    const open = await TimeEntry.findOne({ user: user._id, date: sod, clockOut: null });
    if (open) return res.status(400).json({ error: 'Already clocked in. Please clock out first.' });

    const entry = await TimeEntry.create({
      user: user._id,
      staffName: user.name,
      role: user.role,
      date: sod,
      clockIn: now,
      notes: req.body?.notes || ''
    });
    
    res.json({
      success: true,
      message: 'Clocked in successfully',
      entry
    });
  } catch (e) {
    console.error('[ClockIn] Error:', e);
    res.status(500).json({ error: e.message });
  }
}

export async function clockOut(req, res) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const sod = startOfDayUTC(new Date());
    const open = await TimeEntry.findOne({ user: user._id, date: sod, clockOut: null });
    if (!open) return res.status(400).json({ error: 'No active shift found. Please clock in first.' });

    const now = new Date();
    const duration = Math.max(0, Math.round((now - new Date(open.clockIn)) / 60000));
    open.clockOut = now;
    open.durationMinutes = duration;
    
    if (req.body?.notes) {
      open.notes = req.body.notes;
    }
    
    await open.save();
    
    res.json({
      success: true,
      message: 'Clocked out successfully',
      entry: open,
      totalMinutes: duration,
      totalHours: (duration / 60).toFixed(2)
    });
  } catch (e) {
    console.error('[ClockOut] Error:', e);
    res.status(500).json({ error: e.message });
  }
}

export async function listTimeEntries(req, res) {
  try {
    const { from, to, userId, page = 1, limit = 20 } = req.query;
    const q = {};
    
    // Check permissions
    const requestingUser = await User.findById(req.user.userId);
    const isManager = ['admin', 'manager'].includes(requestingUser?.role);
    
    // Non-managers can only see their own entries
    if (!isManager) {
      q.user = req.user.userId;
    } else if (userId) {
      q.user = userId;
    }
    
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = startOfDayUTC(new Date(from));
      if (to) q.date.$lte = startOfDayUTC(new Date(to));
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      TimeEntry.find(q)
        .sort({ date: -1, clockIn: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      TimeEntry.countDocuments(q)
    ]);
    
    res.json({ 
      data: items, 
      page: Number(page), 
      total, 
      totalPages: Math.ceil(total / Number(limit)) || 1 
    });
  } catch (e) {
    console.error('[ListTimeEntries] Error:', e);
    res.status(500).json({ error: e.message });
  }
}

export async function adminUpdateEntry(req, res) {
  try {
    const { id } = req.params;
    const { clockIn, clockOut, notes } = req.body;
    
    const entry = await TimeEntry.findById(id);
    if (!entry) return res.status(404).json({ error: 'Time entry not found' });
    
    if (clockIn) entry.clockIn = new Date(clockIn);
    if (clockOut) entry.clockOut = new Date(clockOut);
    if (notes !== undefined) entry.notes = notes;
    
    // Recalculate duration if both timestamps exist
    if (entry.clockIn && entry.clockOut) {
      entry.durationMinutes = Math.max(0, Math.round((new Date(entry.clockOut) - new Date(entry.clockIn)) / 60000));
    }
    
    await entry.save();
    
    res.json({
      success: true,
      message: 'Time entry updated successfully',
      entry
    });
  } catch (e) {
    console.error('[AdminUpdateEntry] Error:', e);
    res.status(500).json({ error: e.message });
  }
}

export async function deleteEntry(req, res) {
  try {
    const entry = await TimeEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Time entry not found' });
    
    await TimeEntry.findByIdAndDelete(req.params.id);
    
    res.json({ 
      success: true,
      message: 'Time entry deleted successfully' 
    });
  } catch (e) {
    console.error('[DeleteEntry] Error:', e);
    res.status(500).json({ error: e.message });
  }
}

// Get current status (clocked in or not)
export async function getCurrentStatus(req, res) {
  try {
    const sod = startOfDayUTC(new Date());
    const open = await TimeEntry.findOne({ 
      user: req.user.userId, 
      date: sod, 
      clockOut: null 
    });
    
    if (open) {
      const elapsed = Math.floor((new Date() - new Date(open.clockIn)) / 1000);
      res.json({
        clockedIn: true,
        entry: open,
        elapsedSeconds: elapsed
      });
    } else {
      res.json({
        clockedIn: false,
        entry: null
      });
    }
  } catch (e) {
    console.error('[GetCurrentStatus] Error:', e);
    res.status(500).json({ error: e.message });
  }
}

// Get time tracking statistics
export async function getTimeStats(req, res) {
  try {
    const { userId, startDate, endDate } = req.query;
    const requestingUser = await User.findById(req.user.userId);
    const isManager = ['admin', 'manager'].includes(requestingUser?.role);
    
    const targetUserId = isManager && userId ? userId : req.user.userId;
    
    const now = new Date();
    const todayStart = startOfDayUTC(now);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const query = { user: targetUserId };
    if (startDate && endDate) {
      query.date = {
        $gte: startOfDayUTC(new Date(startDate)),
        $lte: startOfDayUTC(new Date(endDate))
      };
    }
    
    // Get all entries for the user
    const allEntries = await TimeEntry.find(query).lean();
    
    // Calculate stats
    let todayMinutes = 0;
    let weekMinutes = 0;
    let monthMinutes = 0;
    let totalMinutes = 0;
    let completedShifts = 0;
    let activeShifts = 0;
    
    allEntries.forEach(entry => {
      const entryDate = new Date(entry.date);
      const duration = entry.durationMinutes || 0;
      
      if (entry.clockOut) {
        completedShifts++;
      } else {
        activeShifts++;
      }
      
      totalMinutes += duration;
      
      if (entryDate >= todayStart) todayMinutes += duration;
      if (entryDate >= weekStart) weekMinutes += duration;
      if (entryDate >= monthStart) monthMinutes += duration;
    });
    
    const avgDailyMinutes = allEntries.length > 0 ? totalMinutes / allEntries.length : 0;
    
    res.json({
      success: true,
      stats: {
        today: {
          minutes: todayMinutes,
          hours: (todayMinutes / 60).toFixed(2)
        },
        week: {
          minutes: weekMinutes,
          hours: (weekMinutes / 60).toFixed(2)
        },
        month: {
          minutes: monthMinutes,
          hours: (monthMinutes / 60).toFixed(2)
        },
        total: {
          minutes: totalMinutes,
          hours: (totalMinutes / 60).toFixed(2),
          entries: allEntries.length,
          completedShifts,
          activeShifts
        },
        average: {
          dailyMinutes: avgDailyMinutes.toFixed(0),
          dailyHours: (avgDailyMinutes / 60).toFixed(2)
        }
      }
    });
  } catch (e) {
    console.error('[GetTimeStats] Error:', e);
    res.status(500).json({ error: e.message });
  }
}

// Get summary report for all users (admin only)
export async function getAllUsersReport(req, res) {
  try {
    const { startDate, endDate } = req.query;
    
    const query = {};
    if (startDate && endDate) {
      query.date = {
        $gte: startOfDayUTC(new Date(startDate)),
        $lte: startOfDayUTC(new Date(endDate))
      };
    } else {
      // Default to current month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      query.date = { $gte: startOfDayUTC(monthStart) };
    }
    
    const entries = await TimeEntry.find(query).lean();
    
    // Group by user
    const userStats = {};
    entries.forEach(entry => {
      const userId = entry.user.toString();
      if (!userStats[userId]) {
        userStats[userId] = {
          userId,
          staffName: entry.staffName,
          role: entry.role,
          totalMinutes: 0,
          totalEntries: 0,
          completedShifts: 0,
          activeShifts: 0
        };
      }
      
      userStats[userId].totalMinutes += entry.durationMinutes || 0;
      userStats[userId].totalEntries++;
      
      if (entry.clockOut) {
        userStats[userId].completedShifts++;
      } else {
        userStats[userId].activeShifts++;
      }
    });
    
    // Convert to array and add calculated fields
    const report = Object.values(userStats).map(stat => ({
      ...stat,
      totalHours: (stat.totalMinutes / 60).toFixed(2),
      avgDailyHours: stat.totalEntries > 0 ? (stat.totalMinutes / 60 / stat.totalEntries).toFixed(2) : 0
    })).sort((a, b) => b.totalMinutes - a.totalMinutes);
    
    res.json({
      success: true,
      report,
      totalUsers: report.length,
      period: {
        startDate: query.date?.$gte || 'All time',
        endDate: query.date?.$lte || 'Present'
      }
    });
  } catch (e) {
    console.error('[GetAllUsersReport] Error:', e);
    res.status(500).json({ error: e.message });
  }
}
