const express = require('express');
const router = express.Router();
const RetiradasRealizadasController = require('../../controllers/relatorios/retiradaRealizadasController');

router.post('/relatorio', RetiradasRealizadasController.relatorio);
router.get('/listardm', RetiradasRealizadasController.listarDM);

module.exports = router;