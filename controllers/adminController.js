const User = require('../models/User');

exports.dashboard = (req, res) => {
  res.render('admin/dashboard');
};

exports.panel = async (req, res) => {
  try {
    const search = (req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const { rows, total, totalPages } = await User.findAll({ search, page });
    res.render('admin/panel', { users: rows, search, page, totalPages, total });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error al cargar usuarios');
    res.redirect('/admin');
  }
};

exports.registerForm = (req, res) => {
  res.render('admin/users-register');
};

exports.register = async (req, res) => {
  try {
    const { email, password, role, direction } = req.body;
    await User.create({ email, password, role, direction });
    req.flash('success', 'Usuario registrado exitosamente.');
    res.redirect('/admin/panel');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error al registrar usuario');
    res.redirect('/admin/users/register');
  }
};

exports.editForm = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send('Usuario no encontrado.');
    res.render('admin/users-edit', { editUser: user });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/panel');
  }
};

exports.update = async (req, res) => {
  try {
    const { email, password, role, direction } = req.body;
    await User.update(req.params.id, { email, password, role, direction });
    req.flash('success', 'Usuario actualizado exitosamente.');
    res.redirect('/admin/panel');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error al actualizar usuario');
    res.redirect('/admin/panel');
  }
};

exports.delete = async (req, res) => {
  try {
    const id = parseInt(req.body.id_user);
    if (id === req.session.user.id) {
      req.flash('error', 'No puedes eliminar tu propio usuario.');
      return res.redirect('/admin/panel');
    }
    await User.delete(id);
    req.flash('success', 'Usuario eliminado exitosamente.');
    res.redirect('/admin/panel');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error al eliminar usuario');
    res.redirect('/admin/panel');
  }
};
