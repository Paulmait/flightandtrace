/**
 * Privacy API Routes
 * Handles aircraft blocking, opt-out requests, and privacy controls
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/privacy-docs/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'privacy-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

/**
 * Submit opt-out request
 */
router.post('/opt-out-request', upload.single('documentation'), async (req, res) => {
  try {
    const {
      requestType,
      aircraftRegistration,
      ownerName,
      ownerEmail,
      ownerPhone,
      companyName,
      reason,
      requestScope,
      effectiveDate,
      additionalInfo
    } = req.body;

    // Validate required fields
    if (!aircraftRegistration || !ownerName || !ownerEmail || !reason) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Aircraft registration, owner name, email, and reason are required'
      });
    }

    // Generate request ID
    const requestId = crypto.randomUUID();
    const submittedAt = new Date().toISOString();

    // Create privacy request record
    const privacyRequest = {
      id: requestId,
      type: requestType,
      status: 'pending_review',
      aircraft: {
        registration: aircraftRegistration.toUpperCase(),
        owner: ownerName,
        operator: companyName || null
      },
      contact: {
        email: ownerEmail,
        phone: ownerPhone || null
      },
      details: {
        reason,
        scope: requestScope,
        effectiveDate: effectiveDate || null,
        additionalInfo: additionalInfo || null
      },
      documentation: req.file ? {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedAt: submittedAt
      } : null,
      submittedAt,
      reviewedAt: null,
      reviewedBy: null,
      notes: []
    };

    // Store in database (implement based on your database)
    await storePrivacyRequest(privacyRequest);

    // Log the request
    req.auditLogger?.logPrivacyEvent('opt_out_request_submitted', null, {
      requestId,
      aircraftRegistration: aircraftRegistration.toUpperCase(),
      requestType,
      automated: false
    });

    // Send confirmation email
    await sendOptOutConfirmationEmail(ownerEmail, requestId, aircraftRegistration);

    res.json({
      success: true,
      requestId,
      message: 'Privacy request submitted successfully',
      estimatedProcessingTime: '5-10 business days'
    });

  } catch (error) {
    console.error('Error processing opt-out request:', error);
    res.status(500).json({
      error: 'Request processing failed',
      message: 'Unable to process your privacy request. Please try again.'
    });
  }
});

/**
 * Get opt-out request status
 */
router.get('/opt-out-request/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await getPrivacyRequest(requestId);

    if (!request) {
      return res.status(404).json({
        error: 'Request not found',
        message: 'Privacy request not found or may have been archived'
      });
    }

    // Return sanitized request data
    res.json({
      id: request.id,
      type: request.type,
      status: request.status,
      aircraft: {
        registration: request.aircraft.registration
      },
      submittedAt: request.submittedAt,
      reviewedAt: request.reviewedAt,
      estimatedCompletion: getEstimatedCompletion(request),
      statusMessage: getStatusMessage(request.status)
    });

  } catch (error) {
    console.error('Error retrieving opt-out request:', error);
    res.status(500).json({
      error: 'Request retrieval failed',
      message: 'Unable to retrieve request status'
    });
  }
});

/**
 * Block aircraft (admin/automated)
 */
router.post('/block-aircraft', requireAuth, async (req, res) => {
  try {
    const { identifier, reason = 'Privacy request' } = req.body;
    const userId = req.user?.id;

    if (!identifier) {
      return res.status(400).json({
        error: 'Missing identifier',
        message: 'Aircraft identifier is required'
      });
    }

    const normalizedId = identifier.toUpperCase();

    // Use privacy service if available
    if (req.privacyService) {
      const result = await req.privacyService.blockAircraft(normalizedId, reason, userId);
      res.json(result);
    } else {
      // Fallback implementation
      await storeBlockedAircraft(normalizedId, reason, userId);
      res.json({ success: true, aircraftId: normalizedId });
    }

  } catch (error) {
    console.error('Error blocking aircraft:', error);
    res.status(500).json({
      error: 'Blocking failed',
      message: 'Unable to block aircraft'
    });
  }
});

/**
 * Unblock aircraft (admin only)
 */
router.post('/unblock-aircraft', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { identifier } = req.body;
    const userId = req.user?.id;

    const normalizedId = identifier.toUpperCase();

    if (req.privacyService) {
      const result = await req.privacyService.unblockAircraft(normalizedId, 'Admin action', userId);
      res.json(result);
    } else {
      await removeBlockedAircraft(normalizedId, userId);
      res.json({ success: true, aircraftId: normalizedId });
    }

  } catch (error) {
    console.error('Error unblocking aircraft:', error);
    res.status(500).json({
      error: 'Unblocking failed',
      message: 'Unable to unblock aircraft'
    });
  }
});

/**
 * Get blocked aircraft list (admin only)
 */
router.get('/blocked-aircraft', requireAuth, requireAdmin, async (req, res) => {
  try {
    const blockedList = await getBlockedAircraftList();
    res.json(blockedList);
  } catch (error) {
    console.error('Error retrieving blocked aircraft:', error);
    res.status(500).json({
      error: 'Retrieval failed',
      message: 'Unable to retrieve blocked aircraft list'
    });
  }
});

/**
 * Data export request (GDPR)
 */
router.post('/data-export', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    if (req.privacyService) {
      const exportData = await req.privacyService.generateDataExport(userId);
      
      // In production, you might want to email the export or store it securely
      res.json({
        success: true,
        exportId: exportData.exportId,
        message: 'Data export has been generated',
        downloadUrl: `/api/privacy/data-export/${exportData.exportId}/download`
      });
    } else {
      throw new Error('Privacy service not available');
    }

  } catch (error) {
    console.error('Error generating data export:', error);
    res.status(500).json({
      error: 'Export failed',
      message: 'Unable to generate data export'
    });
  }
});

/**
 * Data deletion request (GDPR)
 */
router.post('/data-deletion', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestType = 'full' } = req.body;

    if (req.privacyService) {
      const result = await req.privacyService.handleDataDeletion(userId, requestType);
      res.json({
        success: true,
        requestId: result.requestId,
        message: 'Data deletion request has been processed',
        estimatedCompletion: '30 days'
      });
    } else {
      throw new Error('Privacy service not available');
    }

  } catch (error) {
    console.error('Error processing data deletion:', error);
    res.status(500).json({
      error: 'Deletion failed',
      message: 'Unable to process data deletion request'
    });
  }
});

/**
 * Privacy settings for user
 */
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = await getUserPrivacySettings(userId);
    
    res.json({
      dataProcessing: settings.dataProcessing || 'necessary',
      analytics: settings.analytics || false,
      marketing: settings.marketing || false,
      personalization: settings.personalization || false,
      dataRetention: settings.dataRetention || 'default',
      contactPreferences: settings.contactPreferences || {
        email: true,
        sms: false,
        push: true
      }
    });

  } catch (error) {
    console.error('Error retrieving privacy settings:', error);
    res.status(500).json({
      error: 'Settings retrieval failed',
      message: 'Unable to retrieve privacy settings'
    });
  }
});

/**
 * Update privacy settings
 */
router.put('/settings', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = req.body;

    await updateUserPrivacySettings(userId, settings);

    req.auditLogger?.logPrivacyEvent('settings_updated', userId, {
      settings: Object.keys(settings),
      automated: false
    });

    res.json({
      success: true,
      message: 'Privacy settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating privacy settings:', error);
    res.status(500).json({
      error: 'Settings update failed',
      message: 'Unable to update privacy settings'
    });
  }
});

// Utility functions (implement based on your database)
async function storePrivacyRequest(request) {
  // Implementation depends on your database
  console.log('Storing privacy request:', request.id);
}

async function getPrivacyRequest(requestId) {
  // Implementation depends on your database
  return null;
}

async function storeBlockedAircraft(aircraftId, reason, userId) {
  // Implementation depends on your database
  console.log('Blocking aircraft:', aircraftId);
}

async function removeBlockedAircraft(aircraftId, userId) {
  // Implementation depends on your database
  console.log('Unblocking aircraft:', aircraftId);
}

async function getBlockedAircraftList() {
  // Implementation depends on your database
  return [];
}

async function getUserPrivacySettings(userId) {
  // Implementation depends on your database
  return {};
}

async function updateUserPrivacySettings(userId, settings) {
  // Implementation depends on your database
  console.log('Updating privacy settings for user:', userId);
}

async function sendOptOutConfirmationEmail(email, requestId, registration) {
  // Implementation depends on your email service
  console.log('Sending confirmation email to:', email);
}

function getEstimatedCompletion(request) {
  const submitted = new Date(request.submittedAt);
  const estimated = new Date(submitted.getTime() + (10 * 24 * 60 * 60 * 1000)); // 10 days
  return estimated.toISOString();
}

function getStatusMessage(status) {
  const messages = {
    'pending_review': 'Your request is pending review by our privacy team.',
    'under_review': 'Your request is currently being reviewed.',
    'additional_info_required': 'Additional information is required to process your request.',
    'approved': 'Your request has been approved and is being implemented.',
    'implemented': 'Your privacy request has been successfully implemented.',
    'rejected': 'Your request could not be approved. You will receive details via email.',
    'withdrawn': 'This request has been withdrawn.'
  };
  return messages[status] || 'Status unknown';
}

// Middleware
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this endpoint'
    });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({
      error: 'Admin access required',
      message: 'This endpoint requires administrator privileges'
    });
  }
  next();
}

module.exports = router;