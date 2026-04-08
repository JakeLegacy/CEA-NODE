const db = require('../config/db');

const User = {
  async findByEmail(email) {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await db.query('SELECT * FROM users WHERE id_user = ?', [id]);
    return rows[0] || null;
  },

  async findAll({ search = '', page = 1, perPage = 10 } = {}) {
    const offset = (page - 1) * perPage;
    let countSql, dataSql, params;

    if (search) {
      countSql = 'SELECT COUNT(*) as total FROM users WHERE email LIKE ? OR role LIKE ?';
      dataSql = 'SELECT id_user, email, direction, role FROM users WHERE email LIKE ? OR role LIKE ? ORDER BY id_user DESC LIMIT ? OFFSET ?';
      const like = `%${search}%`;
      params = [like, like, perPage, offset];
    } else {
      countSql = 'SELECT COUNT(*) as total FROM users';
      dataSql = 'SELECT id_user, email, direction, role FROM users ORDER BY id_user DESC LIMIT ? OFFSET ?';
      params = [perPage, offset];
    }

    const [[{ total }]] = await db.query(countSql, search ? [`%${search}%`, `%${search}%`] : []);
    const [rows] = await db.query(dataSql, params);

    return { rows, total, totalPages: Math.ceil(total / perPage) };
  },

  async create({ email, password, role, direction }) {
    const [result] = await db.query(
      'INSERT INTO users (email, password, role, direction) VALUES (?, ?, ?, ?)',
      [email, password, role, direction]
    );
    return result.insertId;
  },

  async update(id, { email, password, role, direction }) {
    await db.query(
      'UPDATE users SET email = ?, password = ?, role = ?, direction = ? WHERE id_user = ?',
      [email, password, role, direction, id]
    );
  },

  async delete(id) {
    await db.query('DELETE FROM users WHERE id_user = ?', [id]);
  }
};

module.exports = User;
