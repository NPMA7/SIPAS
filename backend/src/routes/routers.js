const router    = require('express').Router();
const adminAuth = require('../middleware/adminAuth');
const { preventVisitorMutation } = require('../middleware/adminAuth');
const ctrl      = require('../controllers/routerController');

router.get('/',            adminAuth, ctrl.getRouters);
router.get('/:id',         adminAuth, ctrl.getRouterById);
router.post('/',           adminAuth, preventVisitorMutation, ctrl.createRouter);
router.put('/:id',         adminAuth, preventVisitorMutation, ctrl.updateRouter);
router.delete('/:id',      adminAuth, preventVisitorMutation, ctrl.deleteRouter);
router.get('/:id/test',    adminAuth, ctrl.testConnection);

module.exports = router;
