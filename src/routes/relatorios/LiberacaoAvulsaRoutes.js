const express = require('express');
const router = express.Router();
const LiberacaoAvulsaController = require('../../controllers/relatorios/LiberacaoAvulsaController');


router.post('/relatorio', LiberacaoAvulsaController.relatorio);
router.get('/lockerdisponiveis', LiberacaoAvulsaController.queryLocker);
router.get('/listarDIP', LiberacaoAvulsaController.queryDIPs);
router.post('/lockerItens', LiberacaoAvulsaController.lockerItens);
router.post('/adicionar', LiberacaoAvulsaController.adicionar);
router.post('/listarPosicoes', LiberacaoAvulsaController.listarPosicoes);
module.exports = router;