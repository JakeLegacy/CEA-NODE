const router = require('express').Router();
const { isAdmin } = require('../middleware/auth');
const scoresCtrl = require('../controllers/scoresController');

router.get('/puntuacion', isAdmin, scoresCtrl.puntuacion);
router.get('/ponderacion', isAdmin, scoresCtrl.ponderacionForm);
router.post('/ponderacion', isAdmin, scoresCtrl.ponderacionUpdate);
router.get('/editar-calificacion', isAdmin, scoresCtrl.editarCalificacionForm);
router.post('/editar-calificacion', isAdmin, scoresCtrl.editarCalificacionUpdate);

module.exports = router;
