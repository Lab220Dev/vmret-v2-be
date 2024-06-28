const express = require('express');
const router = express.Router();
const funcionarioCountroller = require('../controllers/funcionarioController');

router.post('/listar', funcionarioCountroller.listarFuncionarios);
router.post('/adicionar', funcionarioCountroller.adicionarFuncionarios);

module.exports = router;
