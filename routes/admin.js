const router = require('express').Router();
const { isAdmin } = require('../middleware/auth');
const adminCtrl = require('../controllers/adminController');

router.get('/', isAdmin, adminCtrl.dashboard);
router.get('/panel', isAdmin, adminCtrl.panel);
router.get('/users/register', isAdmin, adminCtrl.registerForm);
router.post('/users/register', isAdmin, adminCtrl.register);
router.get('/users/edit/:id', isAdmin, adminCtrl.editForm);
router.post('/users/edit/:id', isAdmin, adminCtrl.update);
router.post('/users/delete', isAdmin, adminCtrl.delete);

module.exports = router;
