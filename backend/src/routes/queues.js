const express = require('express');
const router  = express.Router();
const { getQueues, actionQueue } = require('../controllers/queueController');
const adminAuth = require('../middleware/adminAuth');
const { preventVisitorMutation } = require('../middleware/adminAuth');

router.use(adminAuth);

router.get('/:routerId', getQueues);
router.post('/:routerId/action', preventVisitorMutation, actionQueue);

module.exports = router;
