const router = require('express').Router();
const multer = require('multer');
const { isUser } = require('../middleware/auth');
const userCtrl = require('../controllers/userController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Solo se permiten archivos PDF'));
  }
});

router.get('/', isUser, userCtrl.dashboard);
router.get('/works', isUser, userCtrl.worksList);
router.get('/works/register', isUser, userCtrl.registerWorkForm);
router.post('/works/register', isUser, upload.single('diameter_tube'), userCtrl.registerWork);
router.get('/works/mark/:id', isUser, userCtrl.markForm);
router.post('/works/mark', isUser, userCtrl.submitMark);

module.exports = router;
