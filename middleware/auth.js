function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/');
}

function isAdmin(req, res, next) {
  if (!req.session.user) return res.redirect('/');
  if (req.session.user.role !== 'admin') return res.redirect('/user');
  next();
}

function isUser(req, res, next) {
  if (!req.session.user) return res.redirect('/');
  if (req.session.user.role !== 'user') return res.redirect('/admin');
  next();
}

module.exports = { isAuthenticated, isAdmin, isUser };
