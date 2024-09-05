const express = require('express');
const router = express.Router();
const LiberacaoAvulsaController = require('../../controllers/relatorios/LiberacaoAvulsaController');


router.post('/relatorio', LiberacaoAvulsaController.relatorio);

module.exports = router;