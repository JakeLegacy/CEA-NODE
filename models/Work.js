const db = require('../config/db');

const Work = {
  async findAll({ search = '', page = 1, perPage = 10 } = {}) {
    const offset = (page - 1) * perPage;
    let countSql, dataSql, params;

    if (search) {
      const like = `%${search}%`;
      countSql = 'SELECT COUNT(*) as total FROM works WHERE name_project LIKE ? OR municipality LIKE ? OR program LIKE ?';
      dataSql = 'SELECT * FROM works WHERE name_project LIKE ? OR municipality LIKE ? OR program LIKE ? ORDER BY id_work DESC LIMIT ? OFFSET ?';
      params = [like, like, like, perPage, offset];
    } else {
      countSql = 'SELECT COUNT(*) as total FROM works';
      dataSql = 'SELECT * FROM works ORDER BY id_work DESC LIMIT ? OFFSET ?';
      params = [perPage, offset];
    }

    const [[{ total }]] = await db.query(countSql, search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []);
    const [rows] = await db.query(dataSql, params);

    return { rows, total, totalPages: Math.ceil(total / perPage) };
  },

  async findById(id) {
    const [rows] = await db.query('SELECT * FROM works WHERE id_work = ?', [id]);
    return rows[0] || null;
  },

  async create(data) {
    const sql = `INSERT INTO works (program, user_requires, memo_reference, counts_project,
      expedient_no, folio, name_project, municipality, benefited_inhabitants,
      block, sub_block, cost_MDP, budget_MDP, impact, diameter_tube)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const [result] = await db.query(sql, [
      data.program, data.user_requires, data.memo_reference, data.counts_project,
      data.expedient_no, data.folio, data.name_project, data.municipality,
      data.benefited_inhabitants, data.block, data.sub_block,
      data.cost_MDP, data.budget_MDP || null, data.impact, data.diameter_tube || null
    ]);
    return result.insertId;
  },

  async update(id, data) {
    const sql = `UPDATE works SET program = ?, user_requires = ?, memo_reference = ?,
      counts_project = ?, expedient_no = ?, folio = ?, name_project = ?,
      municipality = ?, benefited_inhabitants = ?, block = ?, sub_block = ?,
      cost_MDP = ?, budget_MDP = ?, impact = ?, diameter_tube = ?
      WHERE id_work = ?`;

    await db.query(sql, [
      data.program, data.user_requires, data.memo_reference, data.counts_project,
      data.expedient_no, data.folio, data.name_project, data.municipality,
      data.benefited_inhabitants, data.block, data.sub_block,
      data.cost_MDP, data.budget_MDP, data.impact, data.diameter_tube,
      id
    ]);
  },

  async delete(id) {
    await db.query('DELETE FROM works WHERE id_work = ?', [id]);
  },

  async getPdf(id) {
    const [rows] = await db.query('SELECT diameter_tube FROM works WHERE id_work = ?', [id]);
    return rows[0]?.diameter_tube || null;
  }
};

module.exports = Work;
