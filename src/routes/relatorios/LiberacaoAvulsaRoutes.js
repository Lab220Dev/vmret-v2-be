const express = require('express');
const router = express.Router();
const LiberacaoAvulsaController = require('../../controllers/relatorios/LiberacaoAvulsaController');


router.post('/relatorio', LiberacaoAvulsaController.relatorio);
router.get('/lockerdisponiveis', LiberacaoAvulsaController.queryLocker);
router.post('/lockerItens', LiberacaoAvulsaController.lockerItens);
module.exports = router;