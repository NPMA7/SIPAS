const router = require('express').Router();
const adminAuth = require('../middleware/adminAuth');
const { preventVisitorMutation } = require('../middleware/adminAuth');
const ctrl = require('../controllers/portalSettingsController');

// Public route: Captive portal login can fetch appearance config
router.get('/', ctrl.getSettings);

// Protected admin routes: Only superadmin & operator can update
router.put('/', adminAuth, preventVisitorMutation, ctrl.updateSettings);
router.post('/reset', adminAuth, preventVisitorMutation, ctrl.resetSettings);

module.exports = router;
