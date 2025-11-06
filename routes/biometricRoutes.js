import express from 'express';
import auth, { requirePermission } from '../middleware/auth.js';
import {
  enrollFingerprint,
  verifyFingerprint,
  biometricClockIn,
  biometricClockOut,
  getEnrolledStaff,
  removeFingerprint,
  uploadStaffPhoto
} from '../controllers/biometricController.js';

const router = express.Router();

// Public endpoints for iPad kiosk (no auth required for clock in/out)
router.post('/verify', verifyFingerprint);
router.post('/clock-in', biometricClockIn);
router.post('/clock-out', biometricClockOut);

// Admin endpoints (require authentication)
router.post('/enroll', auth, requirePermission('users', 'edit'), enrollFingerprint);
router.get('/enrolled', auth, requirePermission('users', 'view'), getEnrolledStaff);
router.delete('/remove/:userId', auth, requirePermission('users', 'edit'), removeFingerprint);
router.post('/upload-photo', auth, requirePermission('users', 'edit'), uploadStaffPhoto);

export default router;
