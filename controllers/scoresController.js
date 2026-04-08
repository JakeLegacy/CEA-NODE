const Score = require('../models/Score');
const Work = require('../models/Work');

exports.puntuacion = async (req, res) => {
  try {
    const search = (req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const perPage = 10;
    const offset = (page - 1) * perPage;

    const totalRows = await Score.fetchSectorCount('tecnic', 't', search);
    const totalPages = Math.max(1, Math.ceil(totalRows / perPage));

    const [rowsTec, rowsSoc, rowsPol, rowsEnv, rowsLeg, rowsSe, rowsTotal] = await Promise.all([
      Score.fetchSector('tecnic', 't', 'id_tecnic', 'id_tecnic', search, perPage, offset),
      Score.fetchSector('social', 's', 'id_social', 'id_social', search, perPage, offset),
      Score.fetchSector('politic', 'p', 'id_politic', 'id_politic', search, perPage, offset),
      Score.fetchSector('environment', 'e', 'id_environment', 'id_environment', search, perPage, offset),
      Score.fetchSector('legal', 'l', 'id_legal', 'id_legal', search, perPage, offset),
      Score.fetchSector('socioeconomic', 'se', 'id_socioeconomic', 'id_socioeconomic', search, perPage, offset),
      Score.fetchTotals(search, perPage, offset)
    ]);

    res.render('admin/puntuacion', {
      search, page, totalPages,
      rowsTec, rowsSoc, rowsPol, rowsEnv, rowsLeg, rowsSe, rowsTotal
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error al cargar puntuaciones');
    res.redirect('/admin');
  }
};

exports.ponderacionForm = async (req, res) => {
  try {
    const weightsBySection = await Score.getWeightsGrouped();
    res.render('admin/ponderacion', { weightsBySection });
  } catch (err) {
    console.error(err);
    res.redirect('/scores/puntuacion');
  }
};

exports.ponderacionUpdate = async (req, res) => {
  try {
    if (req.body.weights) {
      const errors = [];
      for (const [id, row] of Object.entries(req.body.weights)) {
        const sub = parseFloat(row.sub) || 0;
        const rubric = parseFloat(row.rubric) || 0;
        if (sub > 1 || sub < 0) errors.push(`Subrubro ID ${id}: peso debe estar entre 0 y 1.0`);
        if (rubric > 1 || rubric < 0) errors.push(`Rubro ID ${id}: peso debe estar entre 0 y 1.0`);
      }

      if (errors.length > 0) {
        req.flash('error', errors.join('<br>'));
        return res.redirect('/scores/ponderacion');
      }

      await Score.updateWeights(req.body.weights);
      await Score.recalculateAllScores();
      req.flash('success', 'Ponderaciones actualizadas y recalculadas correctamente.');
    }
    res.redirect('/scores/ponderacion');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error al actualizar ponderaciones');
    res.redirect('/scores/ponderacion');
  }
};

exports.editarCalificacionForm = async (req, res) => {
  try {
    const [worksResult] = await require('../config/db').query('SELECT id_work, name_project FROM works ORDER BY name_project ASC');
    const idWork = parseInt(req.query.id_work) || 0;
    let scores = {}, workName = '';

    if (idWork > 0) {
      const work = await Work.findById(idWork);
      workName = work ? work.name_project : '';
      scores = await Score.getScoresForWork(idWork);
    }

    res.render('admin/editar-calificacion', { works: worksResult, idWork, workName, scores });
  } catch (err) {
    console.error(err);
    res.redirect('/scores/puntuacion');
  }
};

exports.editarCalificacionUpdate = async (req, res) => {
  try {
    const idWork = parseInt(req.query.id_work) || parseInt(req.body.id_work) || 0;
    if (!idWork) return res.redirect('/scores/editar-calificacion');

    if (req.body.tecnic_update && req.body.id_tecnic) {
      const wiPct = parseFloat(req.body.percentage_WI) || 0;
      const crPct = parseFloat(req.body.percentage_CR) || 0;
      const apPct = parseFloat(req.body.percentage_AP) || 0;
      await Score.updateSection('tecnic', 'id_tecnic', parseInt(req.body.id_tecnic), idWork, {
        work_importance: req.body.work_importance,
        caudal_recover: req.body.caudal_recover,
        actual_problematic: req.body.actual_problematic,
        percentage_WI: wiPct, percentage_CR: crPct, percentage_AP: apPct,
        percentage_TOTAL: wiPct + crPct + apPct
      });
    }

    if (req.body.social_update && req.body.id_social) {
      const snPct = parseFloat(req.body.percentage_SN) || 0;
      const srPct = parseFloat(req.body.percentage_SR) || 0;
      const msPct = parseFloat(req.body.percentage_MS) || 0;
      await Score.updateSection('social', 'id_social', parseInt(req.body.id_social), idWork, {
        service_need: req.body.service_need,
        social_risk: req.body.social_risk,
        marginal_support: req.body.marginal_support,
        percentage_SN: snPct, percentage_SR: srPct, percentage_MS: msPct,
        percentage_TOTAL: snPct + srPct + msPct
      });
    }

    if (req.body.politic_update && req.body.id_politic) {
      const piPct = parseFloat(req.body.percentage_PI) || 0;
      const cPct = parseFloat(req.body.percentage_C) || 0;
      await Score.updateSection('politic', 'id_politic', parseInt(req.body.id_politic), idWork, {
        politic_impact: req.body.politic_impact,
        compromise: req.body.compromise,
        percentage_PI: piPct, percentage_C: cPct,
        percentage_TOTAL: piPct + cPct
      });
    }

    if (req.body.environment_update && req.body.id_environment) {
      const ebPct = parseFloat(req.body.percentage_EB) || 0;
      const irPct = parseFloat(req.body.percentage_IR) || 0;
      await Score.updateSection('environment', 'id_environment', parseInt(req.body.id_environment), idWork, {
        environment_benefit: req.body.environment_benefit,
        integrity_risk: req.body.integrity_risk,
        percentage_EB: ebPct, percentage_IR: irPct,
        percentage_TOTAL: ebPct + irPct
      });
    }

    if (req.body.legal_update && req.body.id_legal) {
      const pPct = parseFloat(req.body.percentage_P) || 0;
      const prPct = parseFloat(req.body.percentage_PR) || 0;
      await Score.updateSection('legal', 'id_legal', parseInt(req.body.id_legal), idWork, {
        permissions: req.body.permissions,
        pass_rights: req.body.pass_rights,
        percentage_P: pPct, percentage_PR: prPct,
        percentage_TOTAL: pPct + prPct
      });
    }

    if (req.body.socioeconomic_update && req.body.id_socioeconomic) {
      const pvPct = parseFloat(req.body.percentage_PH_P_V) || 0;
      const icPct = parseFloat(req.body.percentage_I_C) || 0;
      const igPct = parseFloat(req.body.percentage_IG) || 0;
      const pgPct = parseFloat(req.body.percentage_PG) || 0;
      await Score.updateSection('socioeconomic', 'id_socioeconomic', parseInt(req.body.id_socioeconomic), idWork, {
        poblation_hab: req.body.poblation_hab,
        poblation: req.body.poblation,
        value: req.body.value,
        invertion: req.body.invertion,
        category: req.body.category,
        income_generation: req.body.income_generation,
        poblation_grow: req.body.poblation_grow,
        percentage_PH_P_V: pvPct, percentage_I_C: icPct,
        percentage_IG: igPct, percentage_PG: pgPct,
        percentage_TOTAL: pvPct + icPct + igPct + pgPct
      });
    }

    await Score.recalcTotals(idWork);
    req.flash('success', 'Calificaciones actualizadas correctamente.');
    res.redirect(`/scores/editar-calificacion?id_work=${idWork}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error al actualizar calificaciones');
    res.redirect('/scores/editar-calificacion');
  }
};
