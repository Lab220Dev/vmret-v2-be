const express = require('express');
const router = express.Router();
const SDMController = require('../../controllers/relatorios/SDMController');

router.post('/relatorio', SDMController.relatorio);
router.post('/resumo', SDMController.obterDadosResumo);

module.exports = router;