const express = require('express');
const router = express.Router();
const FichasController = require('../../controllers/relatorios/FichasController');

router.post('/listarplanta', FichasController.listarPlanta);
router.post('/listarFuncionario', FichasController.listarFuncionario);
router.post('/relatorio', FichasController.relatorio);
router.post('/gerarPDF', FichasController.gerarPDF);

module.exports = router;