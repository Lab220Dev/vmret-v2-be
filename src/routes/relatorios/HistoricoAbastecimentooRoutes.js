const express = require('express');
const router = express.Router();
const HistoricoAbastecimentoController = require('../../controllers/relatorios/HistoricoAbastecimentoController');

router.post('/relatorio', HistoricoAbastecimentoController.relatorio);

module.exports = router;