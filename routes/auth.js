const router = require('express').Router();
const authCtrl = require('../controllers/authController');

router.get('/', authCtrl.loginPage);
router.post('/login', authCtrl.login);
router.get('/logout', authCtrl.logout);

module.exports = router;
