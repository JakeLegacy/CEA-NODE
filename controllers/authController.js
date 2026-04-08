const bcrypt = require('bcrypt');
const User = require('../models/User');

exports.loginPage = (req, res) => {
  const loginError = req.flash('login_error')[0] || '';
  res.render('auth/login', { loginError });
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByEmail(email.trim());

    if (!user) {
      req.flash('login_error', 'Email o Contraseña incorrectos');
      return res.redirect('/');
    }

    const stored = user.password;
    let ok = false;

    if (stored.startsWith('$2y$') || stored.startsWith('$2b$') || stored.startsWith('$argon')) {
      ok = await bcrypt.compare(password, stored);
    } else {
      ok = stored === password;
    }

    if (!ok) {
      req.flash('login_error', 'Email o Contraseña incorrectos');
      return res.redirect('/');
    }

    req.session.regenerate((err) => {
      if (err) {
        req.flash('login_error', 'Error de sesión');
        return res.redirect('/');
      }
      req.session.user = {
        id: user.id_user,
        email: user.email,
        role: user.role,
        direction: user.direction
      };
      if (user.role === 'admin') return res.redirect('/admin');
      return res.redirect('/user');
    });
  } catch (err) {
    console.error(err);
    req.flash('login_error', 'Error interno del servidor');
    res.redirect('/');
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
};
