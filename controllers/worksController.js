const Work = require('../models/Work');

exports.adminList = async (req, res) => {
  try {
    const search = (req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const { rows, total, totalPages } = await Work.findAll({ search, page });
    res.render('admin/obras-admin', { works: rows, search, page, totalPages });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error al cargar obras');
    res.redirect('/admin');
  }
};

exports.registerForm = (req, res) => {
  res.render('admin/obras-register');
};

exports.register = async (req, res) => {
  try {
    const pdfBuffer = req.file ? req.file.buffer : null;
    await Work.create({
      ...req.body,
      folio: parseInt(req.body.folio),
      cost_MDP: parseFloat(req.body.cost_MDP),
      budget_MDP: parseFloat(req.body.budget_MDP),
      diameter_tube: pdfBuffer
    });
    req.flash('success', 'Obra registrada exitosamente.');
    res.redirect('/works/admin');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error al registrar obra');
    res.redirect('/works/register');
  }
};

exports.editForm = async (req, res) => {
  try {
    const obra = await Work.findById(req.params.id);
    if (!obra) return res.status(404).send('Obra no encontrada.');
    res.render('admin/obras-edit', { obra });
  } catch (err) {
    console.error(err);
    res.redirect('/works/admin');
  }
};

exports.update = async (req, res) => {
  try {
    await Work.update(req.params.id, {
      ...req.body,
      folio: parseInt(req.body.folio),
      cost_MDP: parseFloat(req.body.cost_MDP),
      budget_MDP: parseFloat(req.body.budget_MDP),
      diameter_tube: req.body.diameter_tube
    });
    req.flash('success', 'Obra actualizada exitosamente.');
    res.redirect('/works/admin');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error al actualizar obra');
    res.redirect('/works/admin');
  }
};

exports.delete = async (req, res) => {
  try {
    await Work.delete(parseInt(req.body.id));
    req.flash('success', 'Obra eliminada correctamente.');
    res.redirect('/works/admin');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error al eliminar obra');
    res.redirect('/works/admin');
  }
};
