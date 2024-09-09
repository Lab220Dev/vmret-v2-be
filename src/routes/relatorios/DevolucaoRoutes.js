const express = require('express');
const router = express.Router();
const DevolucoesController = require('../../controllers/relatorios/DevolucoesController');

router.post('/relatorio', DevolucoesController.relatorio);

module.exports = router;