const express = require('express');
const router = express.Router();
const EstoqueDMController = require('../../controllers/relatorios/EstoqueDMController');

router.post('/listar', EstoqueDMController.listarDM);
router.post('/relatorio', EstoqueDMController.relatorio);
router.post('/ItensEstoqueBaixo', EstoqueDMController.relatorioEstoqueBaixo);

module.exports = router;