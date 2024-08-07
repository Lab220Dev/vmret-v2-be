const express = require('express');
const router = express.Router();
const RetiradasRealizadasController = require('../../controllers/relatorios/retiradaRealizadasController');

router.post('/relatorio', RetiradasRealizadasController.relatorio);
router.post('/listardm', RetiradasRealizadasController.listarDM);

module.exports = router;