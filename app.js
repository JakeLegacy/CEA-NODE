require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const worksRoutes = require('./routes/works');
const scoresRoutes = require('./routes/scores');
const pdfRoutes = require('./routes/pdf');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true, limit: '12mb' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(flash());

app.use((req, res, next) => {
  res.locals.flash_success = req.flash('success');
  res.locals.flash_error = req.flash('error');
  res.locals.user = req.session.user || null;
  next();
});

app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/user', userRoutes);
app.use('/works', worksRoutes);
app.use('/scores', scoresRoutes);
app.use('/pdf', pdfRoutes);

app.use((req, res) => {
  res.status(404).render('404');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
