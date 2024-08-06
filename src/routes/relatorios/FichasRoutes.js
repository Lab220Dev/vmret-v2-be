const express = require('express');
const router = express.Router();
const FichasRetiradas = require('../../controllers/relatorios/FichasController');

router.post('/gerarFicha', FichasRetiradas.gerarFicha);
router.post('/listarplanta', FichasRetiradas.listarPlanta);
router.post('/listarFuncionario', FichasRetiradas.listarFuncionario);
router.post('/relatorio', FichasRetiradas.relatorio);

module.exports = router;