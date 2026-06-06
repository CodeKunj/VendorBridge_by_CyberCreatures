const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, ROLES } = require('../middleware/rbac.middleware');

router.use(authenticate);

router.get('/',          authorize(ROLES.ADMIN), userController.list);
router.get('/:id',       authorize(ROLES.ADMIN), userController.getById);
router.post('/',         authorize(ROLES.ADMIN), userController.create);
router.put('/:id',       authorize(ROLES.ADMIN), userController.update);
router.delete('/:id',    authorize(ROLES.ADMIN), userController.remove);
router.patch('/profile', userController.updateProfile);

module.exports = router;
