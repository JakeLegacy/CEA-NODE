const Work = require('../models/Work');
const User = require('../models/User');
const Score = require('../models/Score');

exports.dashboard = (req, res) => {
  res.render('user/dashboard');
};

exports.worksList = async (req, res) => {
  try {
    const search = (req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const { rows, total, totalPages } = await Work.findAll({ search, page });

    const userEmail = req.session.user.email;
    const userObj = await User.findByEmail(userEmail);
    const direction = userObj.direction;

    const directionToGroup = {
      UPE: 'socioeconomic',
      DDHE: 'tech_env', DDD: 'tech_env', DGAOT: 'tech_env', DDAS: 'tech_env',
      DGAEI: 'soc_pol',
      DDC: 'legal'
    };
    const group = directionToGroup[direction] || null;
    const completedWorks = group ? await Score.getCompletedWorks(group) : {};

    res.render('user/works-list', {
      works: rows, search, page, totalPages, direction, group, completedWorks
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error al cargar obras');
    res.redirect('/user');
  }
};

exports.registerWorkForm = (req, res) => {
  res.render('user/works-register');
};

exports.registerWork = async (req, res) => {
  try {
    const userObj = await User.findByEmail(req.session.user.email);
    const pdfBuffer = req.file ? req.file.buffer : null;

    await Work.create({
      program: req.body.program,
      user_requires: userObj.direction,
      memo_reference: req.body.memo_reference,
      counts_project: req.body.counts_project,
      expedient_no: req.body.expedient_no,
      folio: parseInt(req.body.folio),
      name_project: req.body.name_project,
      municipality: req.body.municipality,
      benefited_inhabitants: req.body.benefited_inhabitants,
      block: req.body.block,
      sub_block: req.body.sub_block,
      cost_MDP: parseFloat(req.body.cost_MDP),
      budget_MDP: null,
      impact: req.body.impact,
      diameter_tube: pdfBuffer
    });

    req.flash('success', 'Obra registrada exitosamente.');
    res.redirect('/user/works');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error al registrar obra');
    res.redirect('/user/works/register');
  }
};

exports.markForm = async (req, res) => {
  try {
    const idWork = parseInt(req.params.id);
    const obra = await Work.findById(idWork);
    if (!obra) return res.status(404).send('La obra no existe.');

    const userObj = await User.findByEmail(req.session.user.email);
    const direction = userObj.direction;
    const requestedDir = (obra.user_requires || '').toUpperCase().trim();
    const techEnvDirs = ['DDHE', 'DDD', 'DGAOT', 'DDAS'];

    if (techEnvDirs.includes(requestedDir) && direction.toUpperCase() !== requestedDir) {
      return res.status(403).send(`No tienes permiso para calificar esta obra. Solo ${requestedDir} puede calificarla.`);
    }

    const dirToSections = {
      UPE: ['socioeconomic'],
      DDHE: ['tecnic', 'environment'], DDD: ['tecnic', 'environment'],
      DDS: ['tecnic', 'environment'], DGAPRA: ['tecnic', 'environment'],
      DDAS: ['tecnic', 'environment'],
      DGAEI: ['social', 'politic'],
      DDC: ['legal']
    };

    let allowedSections = dirToSections[direction] || [];
    const rated = await Score.getRatedSections(idWork, allowedSections);
    allowedSections = allowedSections.filter(s => !rated.includes(s));

    res.render('user/obras-mark', { obra, direction, allowedSections });
  } catch (err) {
    console.error(err);
    res.redirect('/user/works');
  }
};

exports.submitMark = async (req, res) => {
  try {
    const idWork = parseInt(req.body.id_work);
    const userObj = await User.findByEmail(req.session.user.email);
    const idUser = userObj.id_user;
    const direction = userObj.direction;

    const dirToSections = {
      UPE: ['socioeconomic'],
      DDHE: ['tecnic', 'environment'], DDD: ['tecnic', 'environment'],
      DDS: ['tecnic', 'environment'], DGAPRA: ['tecnic', 'environment'],
      DDAS: ['tecnic', 'environment'],
      DGAEI: ['social', 'politic'],
      DDC: ['legal']
    };

    const allowedSections = dirToSections[direction] || [];
    const weights = await Score.loadWeights();
    const errors = [];

    if (allowedSections.includes('socioeconomic')) {
      if (await Score.alreadyMarked(idWork, idUser, 'socioeconomic')) {
        errors.push('Ya calificaste esta obra en Socioeconómico.');
      } else {
        const poblacion = parseInt(req.body.poblacion) || 0;
        const inversion = parseFloat(req.body.inversion) || 0;
        const generacion = parseInt(req.body.generacion) || 0;
        const crecimiento = parseInt(req.body.crecimiento) || 0;

        const pPHPV = Score.calcPercentage(poblacion, 'socioeconomic', 'poblation', weights);
        const pIC = Score.calcPercentage(Math.round(inversion), 'socioeconomic', 'invertion', weights);
        const pIG = Score.calcPercentage(generacion, 'socioeconomic', 'income_generation', weights);
        const pPG = Score.calcPercentage(crecimiento, 'socioeconomic', 'poblation_grow', weights);

        await Score.insertSocioeconomic({
          id_work: idWork,
          poblation_hab: parseInt(req.body.poblacionhab) || 0,
          poblation: poblacion, value: parseInt(req.body.valor) || 0,
          invertion: inversion, category: parseInt(req.body.categoria) || 0,
          income_generation: generacion, poblation_grow: crecimiento,
          percentage_PH_P_V: pPHPV, percentage_I_C: pIC,
          percentage_IG: pIG, percentage_PG: pPG,
          percentage_TOTAL: pPHPV + pIC + pIG + pPG
        });
        await Score.registerMark(idWork, idUser, 'socioeconomic');
      }
    }

    if (allowedSections.includes('tecnic')) {
      if (await Score.alreadyMarked(idWork, idUser, 'tecnic')) {
        errors.push('Ya calificaste esta obra en Técnico.');
      } else {
        const imp = parseInt(req.body.importancia) || 0;
        const caudal = parseInt(req.body.caudal) || 0;
        const prob = parseInt(req.body.problematica) || 0;
        const pWI = Score.calcPercentage(imp, 'tecnic', 'work_importance', weights);
        const pCR = Score.calcPercentage(caudal, 'tecnic', 'caudal_recover', weights);
        const pAP = Score.calcPercentage(prob, 'tecnic', 'actual_problematic', weights);

        await Score.insertTecnic({
          id_work: idWork, work_importance: imp, caudal_recover: caudal,
          actual_problematic: prob, percentage_WI: pWI, percentage_CR: pCR,
          percentage_AP: pAP, percentage_TOTAL: pWI + pCR + pAP
        });
        await Score.registerMark(idWork, idUser, 'tecnic');
      }
    }

    if (allowedSections.includes('environment')) {
      if (await Score.alreadyMarked(idWork, idUser, 'environment')) {
        errors.push('Ya calificaste esta obra en Ambiental.');
      } else {
        const impAmb = parseInt(req.body.impactoambiental) || 0;
        const compAmb = parseInt(req.body.compromisoambiental) || 0;
        const pEB = Score.calcPercentage(impAmb, 'environment', 'environment_benefit', weights);
        const pIR = Score.calcPercentage(compAmb, 'environment', 'integrity_risk', weights);

        await Score.insertEnvironment({
          id_work: idWork, environment_benefit: impAmb, integrity_risk: compAmb,
          percentage_EB: pEB, percentage_IR: pIR, percentage_TOTAL: pEB + pIR
        });
        await Score.registerMark(idWork, idUser, 'environment');
      }
    }

    if (allowedSections.includes('social')) {
      if (await Score.alreadyMarked(idWork, idUser, 'social')) {
        errors.push('Ya calificaste esta obra en Social.');
      } else {
        const nec = parseInt(req.body.necesidad) || 0;
        const rie = parseInt(req.body.riesgo) || 0;
        const apo = parseInt(req.body.apoyo) || 0;
        const pSN = Score.calcPercentage(nec, 'social', 'service_need', weights);
        const pSR = Score.calcPercentage(rie, 'social', 'social_risk', weights);
        const pMS = Score.calcPercentage(apo, 'social', 'marginal_support', weights);

        await Score.insertSocial({
          id_work: idWork, service_need: nec, social_risk: rie, marginal_support: apo,
          percentage_SN: pSN, percentage_SR: pSR, percentage_MS: pMS,
          percentage_TOTAL: pSN + pSR + pMS
        });
        await Score.registerMark(idWork, idUser, 'social');
      }
    }

    if (allowedSections.includes('politic')) {
      if (await Score.alreadyMarked(idWork, idUser, 'politic')) {
        errors.push('Ya calificaste esta obra en Político.');
      } else {
        const impP = parseInt(req.body.impactopolitico) || 0;
        const comp = parseInt(req.body.compromiso) || 0;
        const pPI = Score.calcPercentage(impP, 'politic', 'politic_impact', weights);
        const pC = Score.calcPercentage(comp, 'politic', 'compromise', weights);

        await Score.insertPolitic({
          id_work: idWork, politic_impact: impP, compromise: comp,
          percentage_PI: pPI, percentage_C: pC, percentage_TOTAL: pPI + pC,
          politiccol: direction
        });
        await Score.registerMark(idWork, idUser, 'politic');
      }
    }

    if (allowedSections.includes('legal')) {
      if (await Score.alreadyMarked(idWork, idUser, 'legal')) {
        errors.push('Ya calificaste esta obra en Jurídico.');
      } else {
        const perm = parseInt(req.body.permisos) || 0;
        const legR = parseInt(req.body.leg_riesgo) || 0;
        const pP = Score.calcPercentage(perm, 'legal', 'permissions', weights);
        const pPR = Score.calcPercentage(legR, 'legal', 'pass_rights', weights);

        await Score.insertLegal({
          id_work: idWork, permissions: perm, pass_rights: legR,
          percentage_P: pP, percentage_PR: pPR, percentage_TOTAL: pP + pPR
        });
        await Score.registerMark(idWork, idUser, 'legal');
      }
    }

    if (errors.length === 0) {
      await Score.recalcTotals(idWork);
      req.flash('success', 'Calificación guardada correctamente.');
    } else {
      req.flash('error', errors.join(' | '));
    }

    res.redirect('/user/works');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error al guardar calificación');
    res.redirect('/user/works');
  }
};
