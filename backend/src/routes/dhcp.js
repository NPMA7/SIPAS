const router    = require('express').Router();
const adminAuth = require('../middleware/adminAuth');
const { preventVisitorMutation } = require('../middleware/adminAuth');
const ctrl      = require('../controllers/dhcpController');

router.get('/leases',        adminAuth, ctrl.getLeases);
router.delete('/leases/:id', adminAuth, preventVisitorMutation, ctrl.deleteLease);

module.exports = router;
