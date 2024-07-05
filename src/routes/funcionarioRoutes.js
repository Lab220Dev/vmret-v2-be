const express = require('express');
const router = express.Router();
const funcionarioController = require('../controllers/funcionarioController');

router.post('/listar', funcionarioController.listarFuncionarios);
router.post('/adicionar', funcionarioController.adicionarFuncionarios);
router.post('/listarcentrocusto', funcionarioController.listarCentroCusto);
router.post('/listarhierarquia', funcionarioController.listarHierarquia);
router.post('/listarsetor', funcionarioController.listarSetorDiretoria);
router.post('/listarplanta', funcionarioController.listarPlanta);
router.post('/deleteFuncionario', funcionarioController.deleteFuncionario);




module.exports = router;
