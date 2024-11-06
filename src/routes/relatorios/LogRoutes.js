const express = require('express');
const router = express.Router();
const LogController = require('../../controllers/relatorios/LogController');

router.post('/relatorio', LogController.relatorio);
router.post('/relatoriodesk', LogController.relatorioMaquina);

module.exports = router;