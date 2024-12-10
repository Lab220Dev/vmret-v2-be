const express = require('express');
const router = express.Router();
const DashBoardController = require('../controllers/DashBoardController');

router.post('/ResumoDados', DashBoardController.ResumoDados);
router.post('/DadosClientes', DashBoardController.DadosClientes);
router.post('/UltimasNotificacoes', DashBoardController.UltimasNotificacoes); 

module.exports = router;