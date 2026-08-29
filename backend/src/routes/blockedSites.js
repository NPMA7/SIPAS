const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/blockedSitesController');
const adminAuth = require('../middleware/adminAuth');
const { preventVisitorMutation } = require('../middleware/adminAuth');

router.get('/',       adminAuth, ctrl.getBlockedSites);
router.post('/',      adminAuth, preventVisitorMutation, ctrl.createBlockedSite);
router.put('/:id',    adminAuth, preventVisitorMutation, ctrl.updateBlockedSite);
router.delete('/:id', adminAuth, preventVisitorMutation, ctrl.deleteBlockedSite);

module.exports = router;
