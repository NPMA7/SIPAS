const router     = require('express').Router();
const adminAuth  = require('../middleware/adminAuth');
const { requireSuperAdmin } = require('../middleware/adminAuth');
const { login, getProfile, changePassword, gatewaySso } = require('../controllers/adminController');
const swaggerSpec = require('../config/swagger');

router.get('/gateway-sso',      gatewaySso);
router.post('/login',           login);
router.get('/profile',          adminAuth, getProfile);
router.put('/change-password',  adminAuth, changePassword);
router.get('/openapi.json',     adminAuth, requireSuperAdmin, (req, res) => res.json(swaggerSpec));

module.exports = router;
