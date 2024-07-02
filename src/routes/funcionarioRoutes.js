const express = require('express');
const router = express.Router();
const funcionarioCountroller = require('../controllers/funcionarioController');

router.post('/listar', funcionarioCountroller.listarFuncionarios);
router.post('/adicionar', funcionarioCountroller.adicionarFuncionarios);
router.post('/listarcentrocusto', funcionarioCountroller.listarCentroCusto);
router.post('/listarhierarquia', funcionarioCountroller.listarHierarquia);
router.post('/listarsetor', funcionarioCountroller.listarSetorDiretoria);

module.exports = router;
