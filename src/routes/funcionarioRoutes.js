const express = require('express');
const router = express.Router();
const funcionarioCountroller = require('../controllers/funcionarioController');

router.post('/listar', funcionarioCountroller.listarFuncionarios);
router.post('/adicionar', funcionarioCountroller.upload.any(),funcionarioCountroller.adicionarFuncionarios);
// router.post('/adicionarfoto', funcionarioCountroller.upload.any(), funcionarioCountroller.foto);
router.post('/listarcentrocusto', funcionarioCountroller.listarCentroCusto);
router.post('/listarhierarquia', funcionarioCountroller.listarHierarquia);
router.post('/listarsetor', funcionarioCountroller.listarSetorDiretoria);
router.post('/listarplanta', funcionarioCountroller.listarPlanta);

module.exports = router;
