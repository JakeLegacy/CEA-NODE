const router = require('express').Router();
const multer = require('multer');
const { isAdmin } = require('../middleware/auth');
const worksCtrl = require('../controllers/worksController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Solo se permiten archivos PDF'));
  }
});

router.get('/admin', isAdmin, worksCtrl.adminList);
router.get('/register', isAdmin, worksCtrl.registerForm);
router.post('/register', isAdmin, upload.single('diameter_tube'), worksCtrl.register);
router.get('/edit/:id', isAdmin, worksCtrl.editForm);
router.post('/edit/:id', isAdmin, worksCtrl.update);
router.post('/delete', isAdmin, worksCtrl.delete);

module.exports = router;
