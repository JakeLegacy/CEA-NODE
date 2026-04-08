const router = require('express').Router();
const pdfCtrl = require('../controllers/pdfController');

router.get('/view/:id', pdfCtrl.viewPdf);

module.exports = router;
