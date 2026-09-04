const router    = require('express').Router();
const adminAuth = require('../middleware/adminAuth');
const { preventVisitorMutation } = require('../middleware/adminAuth');
const ctrl      = require('../controllers/hotspotRouterController');

router.get('/active',          adminAuth, ctrl.getActiveSessions);
router.delete('/active/:id',    adminAuth, preventVisitorMutation, ctrl.kickActiveSession);
router.get('/hosts',           adminAuth, ctrl.getHosts);
router.delete('/hosts/:id',     adminAuth, preventVisitorMutation, ctrl.removeHost);
router.post('/hosts/bypass',    adminAuth, preventVisitorMutation, ctrl.toggleBypassHost);
router.get('/users',           adminAuth, ctrl.getRouterUsers);
router.delete('/users/:id',     adminAuth, preventVisitorMutation, ctrl.removeRouterUser);
router.get('/bindings',        adminAuth, ctrl.getBindings);
router.post('/bindings',       adminAuth, preventVisitorMutation, ctrl.addBinding);
router.put('/bindings/:id',     adminAuth, preventVisitorMutation, ctrl.updateBinding);
router.delete('/bindings/:id',  adminAuth, preventVisitorMutation, ctrl.removeBinding);

module.exports = router;
