const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/blockedSitesController');
const { adminAuth } = require('../middleware/auth');

router.get('/',       adminAuth, ctrl.getBlockedSites);
router.post('/',      adminAuth, ctrl.createBlockedSite);
router.put('/:id',    adminAuth, ctrl.updateBlockedSite);
router.delete('/:id', adminAuth, ctrl.deleteBlockedSite);

module.exports = router;
