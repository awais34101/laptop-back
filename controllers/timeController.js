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
    if (open) return res.status(400).json({ error: 'Already clocked in' });

    const entry = await TimeEntry.create({
      user: user._id,
      staffName: user.name,
      role: user.role,
      date: sod,
      clockIn: now,
      notes: req.body?.notes || ''
    });
    res.json(entry);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function clockOut(req, res) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const sod = startOfDayUTC(new Date());
    const open = await TimeEntry.findOne({ user: user._id, date: sod, clockOut: null });
    if (!open) return res.status(400).json({ error: 'No active shift' });

    const now = new Date();
    const duration = Math.max(0, Math.round((now - new Date(open.clockIn)) / 60000));
    open.clockOut = now;
    open.durationMinutes = duration;
    await open.save();
    res.json(open);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function listTimeEntries(req, res) {
  try {
    const { from, to, userId, page = 1, limit = 20 } = req.query;
    const q = {};
    if (userId) q.user = userId;
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = startOfDayUTC(new Date(from));
      if (to) q.date.$lte = startOfDayUTC(new Date(to));
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      TimeEntry.find(q).sort({ date: -1, createdAt: -1 }).skip(skip).limit(Number(limit)),
      TimeEntry.countDocuments(q)
    ]);
    res.json({ data: items, page: Number(page), total, totalPages: Math.ceil(total / Number(limit)) || 1 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function adminUpdateEntry(req, res) {
  try {
    const { id } = req.params;
    const { clockIn, clockOut, notes } = req.body;
    const entry = await TimeEntry.findById(id);
    if (!entry) return res.status(404).json({ error: 'Not found' });
    if (clockIn) entry.clockIn = new Date(clockIn);
    if (clockOut) entry.clockOut = new Date(clockOut);
    if (notes !== undefined) entry.notes = notes;
    if (entry.clockIn && entry.clockOut) {
      entry.durationMinutes = Math.max(0, Math.round((new Date(entry.clockOut) - new Date(entry.clockIn)) / 60000));
    }
    await entry.save();
    res.json(entry);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function deleteEntry(req, res) {
  try {
    await TimeEntry.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
