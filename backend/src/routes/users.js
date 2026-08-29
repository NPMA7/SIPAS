const router    = require('express').Router();
const adminAuth = require('../middleware/adminAuth');
const { preventVisitorMutation, requireSuperAdmin } = require('../middleware/adminAuth');
const ctrl      = require('../controllers/userController');

// Export & Import CSV harus sebelum /:id agar tidak konflik routing
router.get('/export',           adminAuth, requireSuperAdmin, ctrl.exportUsers);
router.post('/import-csv',      adminAuth, preventVisitorMutation, ...ctrl.importCSV);

router.get('/',                 adminAuth, ctrl.getUsers);
router.get('/:id',              adminAuth, ctrl.getUserById);
router.post('/',                adminAuth, preventVisitorMutation, ctrl.createUser);
router.put('/:id',              adminAuth, preventVisitorMutation, ctrl.updateUser);
router.delete('/:id',           adminAuth, preventVisitorMutation, ctrl.deleteUser);
router.put('/:id/bandwidth',    adminAuth, preventVisitorMutation, ctrl.updateBandwidth);
router.put('/:id/block',        adminAuth, preventVisitorMutation, ctrl.toggleWebsiteBlock);

module.exports = router;
