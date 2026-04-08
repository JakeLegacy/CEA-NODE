const Work = require('../models/Work');

exports.viewPdf = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).send('ID inválido.');

    const pdf = await Work.getPdf(id);
    if (!pdf) return res.status(404).send('No hay PDF.');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="diametro_${id}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener PDF');
  }
};
