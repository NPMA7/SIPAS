const router    = require('express').Router();
const adminAuth = require('../middleware/adminAuth');
const ctrl      = require('../controllers/hotspotRouterController');

router.get('/active',          adminAuth, ctrl.getActiveSessions);
router.delete('/active/:id',    adminAuth, ctrl.kickActiveSession);
router.get('/hosts',           adminAuth, ctrl.getHosts);
router.delete('/hosts/:id',     adminAuth, ctrl.removeHost);
router.post('/hosts/bypass',    adminAuth, ctrl.toggleBypassHost);
router.get('/users',           adminAuth, ctrl.getRouterUsers);
router.delete('/users/:id',     adminAuth, ctrl.removeRouterUser);
router.get('/bindings',        adminAuth, ctrl.getBindings);
router.post('/bindings',       adminAuth, ctrl.addBinding);
router.delete('/bindings/:id',  adminAuth, ctrl.removeBinding);

module.exports = router;

