const express = require('express');
const router = express.Router();
const adminUsersController = require('../controllers/adminUsersController');
const adminAuth = require('../middleware/adminAuth');
const { requireSuperAdmin } = require('../middleware/adminAuth');

// Seluruh endpoint manajemen admin memerlukan autentikasi login dan hak akses Superadmin
router.use(adminAuth);
router.use(requireSuperAdmin);

router.get('/', adminUsersController.getAllAdminUsers);
router.post('/', adminUsersController.createAdminUser);
router.put('/:id', adminUsersController.updateAdminUser);
router.delete('/:id', adminUsersController.deleteAdminUser);

module.exports = router;
