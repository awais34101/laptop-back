import User from '../models/User.js';
import TimeEntry from '../models/TimeEntry.js';
import crypto from 'crypto';

// Utility function to hash fingerprint template for comparison
function hashFingerprintTemplate(template) {
  return crypto.createHash('sha256').update(template).digest('hex');
}

// Utility function to calculate similarity score between two fingerprint templates
// In production, you would use a proper biometric matching library
function calculateSimilarity(template1, template2) {
  // Simple similarity calculation (in production, use proper biometric matching)
  // This is a placeholder - real fingerprint matching would use specialized algorithms
  const hash1 = hashFingerprintTemplate(template1);
  const hash2 = hashFingerprintTemplate(template2);
  
  // Calculate Hamming distance for demonstration
  let matches = 0;
  const minLength = Math.min(hash1.length, hash2.length);
  
  for (let i = 0; i < minLength; i++) {
    if (hash1[i] === hash2[i]) matches++;
  }
  
  return (matches / minLength) * 100; // Return similarity percentage
}

// Enroll fingerprint for a user
export async function enrollFingerprint(req, res) {
  try {
    const { userId, fingerprintTemplate, employeeId } = req.body;
    
    if (!userId || !fingerprintTemplate) {
      return res.status(400).json({ 
        error: 'User ID and fingerprint template are required' 
      });
    }
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if fingerprint already exists for another user
    const existingFingerprint = await User.findOne({ 
      fingerprintTemplate: { $exists: true, $ne: null },
      _id: { $ne: userId }
    });
    
    if (existingFingerprint) {
      // Check if the new fingerprint is too similar to existing ones
      const similarity = calculateSimilarity(fingerprintTemplate, existingFingerprint.fingerprintTemplate);
      if (similarity > 85) { // 85% similarity threshold
        return res.status(400).json({ 
          error: 'This fingerprint is already enrolled for another user',
          conflictUser: existingFingerprint.name
        });
      }
    }
    
    // Update user with fingerprint data
    user.fingerprintTemplate = fingerprintTemplate;
    user.fingerprintEnrolledAt = new Date();
    user.biometricEnabled = true;
    
    if (employeeId) {
      user.employeeId = employeeId;
    }
    
    await user.save();
    
    console.log(`[Biometric] Fingerprint enrolled for ${user.name} (${user.email})`);
    
    res.json({
      success: true,
      message: 'Fingerprint enrolled successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
        biometricEnabled: user.biometricEnabled,
        fingerprintEnrolledAt: user.fingerprintEnrolledAt
      }
    });
  } catch (e) {
    console.error('[Biometric] Enrollment error:', e);
    
    if (e.code === 11000 && e.keyPattern?.employeeId) {
      return res.status(400).json({ 
        error: 'Employee ID already exists for another user' 
      });
    }
    
    res.status(500).json({ error: e.message });
  }
}

// Verify fingerprint and identify user
export async function verifyFingerprint(req, res) {
  try {
    const { fingerprintTemplate } = req.body;
    
    if (!fingerprintTemplate) {
      return res.status(400).json({ 
        error: 'Fingerprint template is required' 
      });
    }
    
    console.log('[Biometric] Attempting fingerprint verification...');
    
    // Get all users with fingerprints enrolled
    const users = await User.find({ 
      biometricEnabled: true,
      fingerprintTemplate: { $exists: true, $ne: null },
      isActive: true
    }).select('name email role employeeId photoUrl fingerprintTemplate biometricEnabled');
    
    if (users.length === 0) {
      return res.status(404).json({ 
        error: 'No fingerprints enrolled in the system' 
      });
    }
    
    console.log(`[Biometric] Comparing against ${users.length} enrolled fingerprints...`);
    
    // Find matching user
    let bestMatch = null;
    let bestScore = 0;
    
    for (const user of users) {
      const similarity = calculateSimilarity(fingerprintTemplate, user.fingerprintTemplate);
      console.log(`[Biometric] ${user.name}: ${similarity.toFixed(2)}% match`);
      
      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = user;
      }
    }
    
    // Threshold for accepting a match (90% or higher)
    const MATCH_THRESHOLD = 90;
    
    if (!bestMatch || bestScore < MATCH_THRESHOLD) {
      console.log(`[Biometric] No match found. Best score: ${bestScore.toFixed(2)}%`);
      return res.status(404).json({ 
        error: 'Fingerprint not recognized',
        bestScore: bestScore.toFixed(2)
      });
    }
    
    // Update last used timestamp
    await User.findByIdAndUpdate(bestMatch._id, {
      fingerprintLastUsed: new Date()
    });
    
    console.log(`[Biometric] ✓ Match found: ${bestMatch.name} (${bestScore.toFixed(2)}%)`);
    
    // Check current clock-in status
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    
    const activeEntry = await TimeEntry.findOne({
      user: bestMatch._id,
      date: startOfDay,
      clockOut: null
    });
    
    res.json({
      success: true,
      matchScore: bestScore.toFixed(2),
      user: {
        id: bestMatch._id,
        name: bestMatch.name,
        email: bestMatch.email,
        role: bestMatch.role,
        employeeId: bestMatch.employeeId,
        photoUrl: bestMatch.photoUrl,
        currentlyClockedIn: !!activeEntry,
        activeEntry: activeEntry ? {
          id: activeEntry._id,
          clockIn: activeEntry.clockIn,
          date: activeEntry.date
        } : null
      }
    });
  } catch (e) {
    console.error('[Biometric] Verification error:', e);
    res.status(500).json({ error: e.message });
  }
}

// Biometric clock in
export async function biometricClockIn(req, res) {
  try {
    const { fingerprintTemplate, notes } = req.body;
    
    if (!fingerprintTemplate) {
      return res.status(400).json({ 
        error: 'Fingerprint template is required' 
      });
    }
    
    // Verify fingerprint first
    const users = await User.find({ 
      biometricEnabled: true,
      fingerprintTemplate: { $exists: true, $ne: null },
      isActive: true
    });
    
    let matchedUser = null;
    let bestScore = 0;
    
    for (const user of users) {
      const similarity = calculateSimilarity(fingerprintTemplate, user.fingerprintTemplate);
      if (similarity > bestScore) {
        bestScore = similarity;
        matchedUser = user;
      }
    }
    
    if (!matchedUser || bestScore < 90) {
      return res.status(404).json({ 
        error: 'Fingerprint not recognized. Please try again.' 
      });
    }
    
    // Check if already clocked in
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    const existingEntry = await TimeEntry.findOne({
      user: matchedUser._id,
      date: startOfDay,
      clockOut: null
    });
    
    if (existingEntry) {
      return res.status(400).json({ 
        error: `${matchedUser.name} is already clocked in`,
        user: {
          name: matchedUser.name,
          clockInTime: existingEntry.clockIn
        }
      });
    }
    
    // Create time entry
    const entry = await TimeEntry.create({
      user: matchedUser._id,
      staffName: matchedUser.name,
      role: matchedUser.role,
      date: startOfDay,
      clockIn: now,
      notes: notes || 'Clocked in via biometric scan'
    });
    
    // Update fingerprint last used
    await User.findByIdAndUpdate(matchedUser._id, {
      fingerprintLastUsed: now
    });
    
    console.log(`[Biometric] ✓ ${matchedUser.name} clocked in at ${now.toLocaleTimeString()}`);
    
    res.json({
      success: true,
      message: `Welcome, ${matchedUser.name}! You are now clocked in.`,
      user: {
        id: matchedUser._id,
        name: matchedUser.name,
        employeeId: matchedUser.employeeId,
        photoUrl: matchedUser.photoUrl,
        role: matchedUser.role
      },
      entry: {
        id: entry._id,
        clockIn: entry.clockIn,
        date: entry.date
      },
      matchScore: bestScore.toFixed(2)
    });
  } catch (e) {
    console.error('[Biometric] Clock-in error:', e);
    res.status(500).json({ error: e.message });
  }
}

// Biometric clock out
export async function biometricClockOut(req, res) {
  try {
    const { fingerprintTemplate, notes } = req.body;
    
    if (!fingerprintTemplate) {
      return res.status(400).json({ 
        error: 'Fingerprint template is required' 
      });
    }
    
    // Verify fingerprint first
    const users = await User.find({ 
      biometricEnabled: true,
      fingerprintTemplate: { $exists: true, $ne: null },
      isActive: true
    });
    
    let matchedUser = null;
    let bestScore = 0;
    
    for (const user of users) {
      const similarity = calculateSimilarity(fingerprintTemplate, user.fingerprintTemplate);
      if (similarity > bestScore) {
        bestScore = similarity;
        matchedUser = user;
      }
    }
    
    if (!matchedUser || bestScore < 90) {
      return res.status(404).json({ 
        error: 'Fingerprint not recognized. Please try again.' 
      });
    }
    
    // Find active entry
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    const activeEntry = await TimeEntry.findOne({
      user: matchedUser._id,
      date: startOfDay,
      clockOut: null
    });
    
    if (!activeEntry) {
      return res.status(400).json({ 
        error: `${matchedUser.name} is not currently clocked in`,
        user: {
          name: matchedUser.name
        }
      });
    }
    
    // Calculate duration and update entry
    const duration = Math.max(0, Math.round((now - new Date(activeEntry.clockIn)) / 60000));
    activeEntry.clockOut = now;
    activeEntry.durationMinutes = duration;
    
    if (notes) {
      activeEntry.notes = activeEntry.notes ? `${activeEntry.notes}\n${notes}` : notes;
    } else {
      activeEntry.notes = activeEntry.notes || 'Clocked out via biometric scan';
    }
    
    await activeEntry.save();
    
    // Update fingerprint last used
    await User.findByIdAndUpdate(matchedUser._id, {
      fingerprintLastUsed: now
    });
    
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    console.log(`[Biometric] ✓ ${matchedUser.name} clocked out at ${now.toLocaleTimeString()} (${hours}h ${minutes}m)`);
    
    res.json({
      success: true,
      message: `Goodbye, ${matchedUser.name}! You worked ${hours}h ${minutes}m today.`,
      user: {
        id: matchedUser._id,
        name: matchedUser.name,
        employeeId: matchedUser.employeeId,
        photoUrl: matchedUser.photoUrl,
        role: matchedUser.role
      },
      entry: {
        id: activeEntry._id,
        clockIn: activeEntry.clockIn,
        clockOut: activeEntry.clockOut,
        durationMinutes: duration,
        totalHours: (duration / 60).toFixed(2)
      },
      matchScore: bestScore.toFixed(2)
    });
  } catch (e) {
    console.error('[Biometric] Clock-out error:', e);
    res.status(500).json({ error: e.message });
  }
}

// Get all enrolled staff
export async function getEnrolledStaff(req, res) {
  try {
    const staff = await User.find({ 
      biometricEnabled: true,
      isActive: true
    }).select('name email role employeeId photoUrl biometricEnabled fingerprintEnrolledAt fingerprintLastUsed')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      total: staff.length,
      staff: staff.map(s => ({
        id: s._id,
        name: s.name,
        email: s.email,
        role: s.role,
        employeeId: s.employeeId,
        photoUrl: s.photoUrl,
        biometricEnabled: s.biometricEnabled,
        fingerprintEnrolledAt: s.fingerprintEnrolledAt,
        fingerprintLastUsed: s.fingerprintLastUsed
      }))
    });
  } catch (e) {
    console.error('[Biometric] Get enrolled staff error:', e);
    res.status(500).json({ error: e.message });
  }
}

// Remove fingerprint enrollment
export async function removeFingerprint(req, res) {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.fingerprintTemplate = null;
    user.biometricEnabled = false;
    user.fingerprintEnrolledAt = null;
    user.fingerprintLastUsed = null;
    
    await user.save();
    
    console.log(`[Biometric] Fingerprint removed for ${user.name}`);
    
    res.json({
      success: true,
      message: 'Fingerprint removed successfully',
      user: {
        id: user._id,
        name: user.name,
        biometricEnabled: user.biometricEnabled
      }
    });
  } catch (e) {
    console.error('[Biometric] Remove fingerprint error:', e);
    res.status(500).json({ error: e.message });
  }
}

// Upload staff photo
export async function uploadStaffPhoto(req, res) {
  try {
    const { userId, photoBase64 } = req.body;
    
    if (!userId || !photoBase64) {
      return res.status(400).json({ 
        error: 'User ID and photo are required' 
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Store photo as base64 (in production, upload to cloud storage like AWS S3)
    user.photoUrl = photoBase64;
    await user.save();
    
    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      user: {
        id: user._id,
        name: user.name,
        photoUrl: user.photoUrl
      }
    });
  } catch (e) {
    console.error('[Biometric] Upload photo error:', e);
    res.status(500).json({ error: e.message });
  }
}
