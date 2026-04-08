const db = require('../config/db');

const Score = {
  async loadWeights() {
    const [rows] = await db.query('SELECT section, code, rubric_weight, sub_weight FROM rubric_weights');
    const weights = {};
    for (const r of rows) {
      if (!weights[r.section]) weights[r.section] = {};
      weights[r.section][r.code] = { rubric: parseFloat(r.rubric_weight), sub: parseFloat(r.sub_weight) };
    }
    return weights;
  },

  calcPercentage(score, section, code, weights) {
    if (score < 1 || score > 5) return 0;
    if (!weights[section]?.[code]) return 0;
    const w = weights[section][code];
    return (score / 5.0) * w.rubric * w.sub * 100.0;
  },

  async alreadyMarked(idWork, idUser, section) {
    const [rows] = await db.query(
      'SELECT 1 FROM work_marks WHERE id_work = ? AND id_user = ? AND section = ? LIMIT 1',
      [idWork, idUser, section]
    );
    return rows.length > 0;
  },

  async registerMark(idWork, idUser, section) {
    await db.query('INSERT INTO work_marks (id_work, id_user, section) VALUES (?, ?, ?)', [idWork, idUser, section]);
  },

  async insertTecnic(data) {
    await db.query(
      `INSERT INTO tecnic (id_work, work_importance, caudal_recover, actual_problematic,
        percentage_WI, percentage_CR, percentage_AP, percentage_TOTAL)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.id_work, data.work_importance, data.caudal_recover, data.actual_problematic,
        data.percentage_WI, data.percentage_CR, data.percentage_AP, data.percentage_TOTAL]
    );
  },

  async insertEnvironment(data) {
    await db.query(
      `INSERT INTO environment (id_work, environment_benefit, integrity_risk,
        percentage_EB, percentage_IR, percentage_TOTAL)
        VALUES (?, ?, ?, ?, ?, ?)`,
      [data.id_work, data.environment_benefit, data.integrity_risk,
        data.percentage_EB, data.percentage_IR, data.percentage_TOTAL]
    );
  },

  async insertSocial(data) {
    await db.query(
      `INSERT INTO social (id_work, service_need, social_risk, marginal_support,
        percentage_SN, percentage_SR, percentage_MS, percentage_TOTAL)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.id_work, data.service_need, data.social_risk, data.marginal_support,
        data.percentage_SN, data.percentage_SR, data.percentage_MS, data.percentage_TOTAL]
    );
  },

  async insertPolitic(data) {
    await db.query(
      `INSERT INTO politic (id_work, politic_impact, compromise,
        percentage_PI, percentage_C, percentage_TOTAL, politiccol)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.id_work, data.politic_impact, data.compromise,
        data.percentage_PI, data.percentage_C, data.percentage_TOTAL, data.politiccol]
    );
  },

  async insertLegal(data) {
    await db.query(
      `INSERT INTO legal (id_work, permissions, pass_rights,
        percentage_P, percentage_PR, percentage_TOTAL)
        VALUES (?, ?, ?, ?, ?, ?)`,
      [data.id_work, data.permissions, data.pass_rights,
        data.percentage_P, data.percentage_PR, data.percentage_TOTAL]
    );
  },

  async insertSocioeconomic(data) {
    await db.query(
      `INSERT INTO socioeconomic (id_work, poblation_hab, poblation, value, invertion, category,
        income_generation, poblation_grow, percentage_PH_P_V, percentage_I_C,
        percentage_IG, percentage_PG, percentage_TOTAL)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.id_work, data.poblation_hab, data.poblation, data.value, data.invertion,
        data.category, data.income_generation, data.poblation_grow,
        data.percentage_PH_P_V, data.percentage_I_C, data.percentage_IG,
        data.percentage_PG, data.percentage_TOTAL]
    );
  },

  async recalcTotals(idWork) {
    const [rows] = await db.query(`
      SELECT
        COALESCE(t.percentage_TOTAL, 0) AS pct_tecnic,
        COALESCE(s.percentage_TOTAL, 0) AS pct_social,
        COALESCE(e.percentage_TOTAL, 0) AS pct_environment,
        COALESCE(p.percentage_TOTAL, 0) AS pct_politic,
        COALESCE(l.percentage_TOTAL, 0) AS pct_legal,
        COALESCE(se.percentage_TOTAL, 0) AS pct_socio
      FROM works w
      LEFT JOIN tecnic t ON t.id_work = w.id_work
      LEFT JOIN social s ON s.id_work = w.id_work
      LEFT JOIN environment e ON e.id_work = w.id_work
      LEFT JOIN politic p ON p.id_work = w.id_work
      LEFT JOIN legal l ON l.id_work = w.id_work
      LEFT JOIN socioeconomic se ON se.id_work = w.id_work
      WHERE w.id_work = ? LIMIT 1
    `, [idWork]);

    if (!rows[0]) return;
    const r = rows[0];
    const pctSum = r.pct_tecnic + r.pct_social + r.pct_environment + r.pct_politic + r.pct_legal + r.pct_socio;

    await db.query(`
      INSERT INTO work_score_totals (id_work, pct_tecnic, pct_social, pct_environment, pct_politic, pct_legal, pct_socio, pct_sum)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        pct_tecnic = VALUES(pct_tecnic), pct_social = VALUES(pct_social),
        pct_environment = VALUES(pct_environment), pct_politic = VALUES(pct_politic),
        pct_legal = VALUES(pct_legal), pct_socio = VALUES(pct_socio),
        pct_sum = VALUES(pct_sum), updated_at = CURRENT_TIMESTAMP
    `, [idWork, r.pct_tecnic, r.pct_social, r.pct_environment, r.pct_politic, r.pct_legal, r.pct_socio, pctSum]);
  },

  async fetchSector(table, alias, idField, orderField, search, perPage, offset) {
    let where = '';
    let params = [];

    if (search) {
      if (/^\d+$/.test(search)) {
        where = `WHERE w.id_work = ? OR w.name_project LIKE ?`;
        params = [parseInt(search), `%${search}%`];
      } else {
        where = `WHERE w.name_project LIKE ?`;
        params = [`%${search}%`];
      }
    }

    const sql = `
      SELECT ${alias}.*, w.name_project
      FROM ${table} ${alias}
      INNER JOIN works w ON ${alias}.id_work = w.id_work
      ${where}
      ORDER BY ${alias}.${orderField} DESC
      LIMIT ? OFFSET ?
    `;
    params.push(perPage, offset);
    const [rows] = await db.query(sql, params);
    return rows;
  },

  async fetchSectorCount(table, alias, search) {
    let where = '';
    let params = [];

    if (search) {
      if (/^\d+$/.test(search)) {
        where = `WHERE w.id_work = ? OR w.name_project LIKE ?`;
        params = [parseInt(search), `%${search}%`];
      } else {
        where = `WHERE w.name_project LIKE ?`;
        params = [`%${search}%`];
      }
    }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM ${table} ${alias} INNER JOIN works w ON ${alias}.id_work = w.id_work ${where}`,
      params
    );
    return total;
  },

  async fetchTotals(search, perPage, offset) {
    let where = '';
    let params = [];

    if (search) {
      if (/^\d+$/.test(search)) {
        where = `WHERE w.id_work = ? OR w.name_project LIKE ?`;
        params = [parseInt(search), `%${search}%`];
      } else {
        where = `WHERE w.name_project LIKE ?`;
        params = [`%${search}%`];
      }
    }

    params.push(perPage, offset);

    const [rows] = await db.query(`
      SELECT w.id_work, w.name_project,
        COALESCE(tot.pct_tecnic, 0) AS pct_tecnic,
        COALESCE(tot.pct_social, 0) AS pct_social,
        COALESCE(tot.pct_environment, 0) AS pct_environment,
        COALESCE(tot.pct_politic, 0) AS pct_politic,
        COALESCE(tot.pct_legal, 0) AS pct_legal,
        COALESCE(tot.pct_socio, 0) AS pct_socio,
        COALESCE(tot.pct_sum, 0) AS pct_sum
      FROM works w
      LEFT JOIN work_score_totals tot ON tot.id_work = w.id_work
      ${where}
      ORDER BY COALESCE(tot.pct_sum, 0) DESC, w.id_work DESC
      LIMIT ? OFFSET ?
    `, params);

    for (const r of rows) {
      await db.query(`
        INSERT INTO work_score_totals (id_work, pct_tecnic, pct_social, pct_environment, pct_politic, pct_legal, pct_socio, pct_sum)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          pct_tecnic = VALUES(pct_tecnic), pct_social = VALUES(pct_social),
          pct_environment = VALUES(pct_environment), pct_politic = VALUES(pct_politic),
          pct_legal = VALUES(pct_legal), pct_socio = VALUES(pct_socio),
          pct_sum = VALUES(pct_sum), updated_at = CURRENT_TIMESTAMP
      `, [r.id_work, r.pct_tecnic, r.pct_social, r.pct_environment, r.pct_politic, r.pct_legal, r.pct_socio, r.pct_sum]);
    }

    return rows;
  },

  async getCompletedWorks(group) {
    const queries = {
      tech_env: 'SELECT id_work FROM tecnic UNION SELECT id_work FROM environment',
      socioeconomic: 'SELECT id_work FROM socioeconomic',
      soc_pol: 'SELECT id_work FROM social UNION SELECT id_work FROM politic',
      legal: 'SELECT id_work FROM legal'
    };

    if (!queries[group]) return {};
    const [rows] = await db.query(queries[group]);
    const map = {};
    for (const r of rows) map[r.id_work] = true;
    return map;
  },

  async getScoresForWork(idWork) {
    const tables = ['tecnic', 'social', 'politic', 'environment', 'legal', 'socioeconomic'];
    const scores = {};
    for (const t of tables) {
      const [rows] = await db.query(`SELECT * FROM ${t} WHERE id_work = ?`, [idWork]);
      scores[t] = rows[0] || null;
    }
    return scores;
  },

  async updateSection(table, idField, idValue, idWork, data) {
    const setClauses = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(data), idValue, idWork];
    await db.query(`UPDATE ${table} SET ${setClauses} WHERE ${idField} = ? AND id_work = ?`, values);
  },

  async recalculateAllScores() {
    const weights = await this.loadWeights();

    const sections = [
      { table: 'tecnic', section: 'tecnic', items: [
        { field: 'work_importance', code: 'work_importance', pctCol: 'percentage_WI' },
        { field: 'caudal_recover', code: 'caudal_recover', pctCol: 'percentage_CR' },
        { field: 'actual_problematic', code: 'actual_problematic', pctCol: 'percentage_AP' }
      ]},
      { table: 'social', section: 'social', items: [
        { field: 'service_need', code: 'service_need', pctCol: 'percentage_SN' },
        { field: 'social_risk', code: 'social_risk', pctCol: 'percentage_SR' },
        { field: 'marginal_support', code: 'marginal_support', pctCol: 'percentage_MS' }
      ]},
      { table: 'environment', section: 'environment', items: [
        { field: 'environment_benefit', code: 'environment_benefit', pctCol: 'percentage_EB' },
        { field: 'integrity_risk', code: 'integrity_risk', pctCol: 'percentage_IR' }
      ]},
      { table: 'legal', section: 'legal', items: [
        { field: 'permissions', code: 'permissions', pctCol: 'percentage_P' },
        { field: 'pass_rights', code: 'pass_rights', pctCol: 'percentage_PR' }
      ]},
      { table: 'politic', section: 'politic', items: [
        { field: 'politic_impact', code: 'politic_impact', pctCol: 'percentage_PI' },
        { field: 'compromise', code: 'compromise', pctCol: 'percentage_C' }
      ]},
      { table: 'socioeconomic', section: 'socioeconomic', items: [
        { field: 'poblation', code: 'poblation', pctCol: 'percentage_PH_P_V' },
        { field: 'invertion', code: 'invertion', pctCol: 'percentage_I_C' },
        { field: 'income_generation', code: 'income_generation', pctCol: 'percentage_IG' },
        { field: 'poblation_grow', code: 'poblation_grow', pctCol: 'percentage_PG' }
      ]}
    ];

    for (const sec of sections) {
      const [rows] = await db.query(`SELECT * FROM ${sec.table}`);
      for (const r of rows) {
        let total = 0;
        const upd = {};
        for (const it of sec.items) {
          const score = parseInt(r[it.field]) || 0;
          const pct = this.calcPercentage(score, sec.section, it.code, weights);
          upd[it.pctCol] = pct;
          total += pct;
        }
        upd.percentage_TOTAL = total;
        const setClauses = Object.keys(upd).map(k => `${k} = ?`).join(', ');
        await db.query(`UPDATE ${sec.table} SET ${setClauses} WHERE id_work = ?`, [...Object.values(upd), r.id_work]);
      }
    }

    const [works] = await db.query('SELECT id_work FROM works');
    for (const w of works) {
      await this.recalcTotals(w.id_work);
    }
  },

  async getWeightsGrouped() {
    const [rows] = await db.query('SELECT * FROM rubric_weights ORDER BY section, code');
    const grouped = {};
    for (const r of rows) {
      if (!grouped[r.section]) grouped[r.section] = [];
      grouped[r.section].push(r);
    }
    return grouped;
  },

  async updateWeights(weights) {
    for (const [id, vals] of Object.entries(weights)) {
      const rubric = parseFloat(vals.rubric) || 0;
      const sub = parseFloat(vals.sub) || 0;
      await db.query('UPDATE rubric_weights SET rubric_weight = ?, sub_weight = ? WHERE id_weight = ?', [rubric, sub, parseInt(id)]);
    }
  },

  async getRatedSections(idWork, allowedSections) {
    const checks = {
      tecnic: 'SELECT 1 FROM tecnic WHERE id_work = ? LIMIT 1',
      environment: 'SELECT 1 FROM environment WHERE id_work = ? LIMIT 1',
      social: 'SELECT 1 FROM social WHERE id_work = ? LIMIT 1',
      politic: 'SELECT 1 FROM politic WHERE id_work = ? LIMIT 1',
      legal: 'SELECT 1 FROM legal WHERE id_work = ? LIMIT 1',
      socioeconomic: 'SELECT 1 FROM socioeconomic WHERE id_work = ? LIMIT 1'
    };

    const rated = [];
    for (const sec of allowedSections) {
      if (!checks[sec]) continue;
      const [rows] = await db.query(checks[sec], [idWork]);
      if (rows.length > 0) rated.push(sec);
    }
    return rated;
  }
};

module.exports = Score;
