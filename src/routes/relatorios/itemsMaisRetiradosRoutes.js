const express = require('express');
const router = express.Router();
const itemsMaisRetirados = require('../../controllers/relatorios/itemsMaisRetiradosController');

router.post('/relatorio', itemsMaisRetirados.relatorio);
router.post('/ultimos', itemsMaisRetirados.listarUltimos);
router.post('/listardm', itemsMaisRetirados.listarDM);
router.post('/listarPlanta', itemsMaisRetirados.listarPlanta);
router.post('/listarSetor', itemsMaisRetirados.listarSetor);
router.post('/listarCdC', itemsMaisRetirados.listarCdC);
router.post('/listarFuncionario', itemsMaisRetirados.listarFuncionario);
router.post('/listarMaisRet', itemsMaisRetirados.listarMaisRet);

module.exports = router;