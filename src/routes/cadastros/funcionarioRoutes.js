const express = require('express');
const router = express.Router();
const funcionarioController = require('../../controllers/cadastro/funcionarioController');

router.post('/listar', funcionarioController.listarFuncionarios);
router.post('/fetchdados', funcionarioController.fetchdados);
router.post('/listaSimples', funcionarioController.listarFuncionariosSimples);
router.post('/listaRelatorio', funcionarioController.listarFuncionariosRelatorio);
router.post('/listaPaginado', funcionarioController.listarFuncionariosPagianda);
router.post('/adicionar', funcionarioController.upload.any(),funcionarioController.adicionarFuncionarios);
router.post('/adicionarExt', funcionarioController.adiconarFuncionarioExt);
router.put('/atualizar', funcionarioController.upload.any(),funcionarioController.atualizarFuncionario);
router.post('/listarcentrocusto', funcionarioController.listarCentroCusto);
router.post('/listarhierarquia', funcionarioController.listarHierarquia);
router.post('/listarsetor', funcionarioController.listarSetorDiretoria);
router.post('/listarplanta', funcionarioController.listarPlanta);
router.post('/deleteFuncionario', funcionarioController.deleteFuncionario);
router.post('/listarOperarios', funcionarioController.listarOperadores);
router.post('/adicionarItem', funcionarioController.adicionarItem);
router.post('/deleteItem', funcionarioController.deleteItem);

module.exports = router;
