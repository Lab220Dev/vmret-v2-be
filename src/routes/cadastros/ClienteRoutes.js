const express = require('express');
const router = express.Router();
const clienteController = require('../../controllers/cadastro/ClienteController');


router.post('/listar', clienteController.listar);
router.post('/listarServicos', clienteController.listarClienteComServicos);
router.get('/listarClienteServicos', clienteController.listarClienteComServicos);
router.post('/salvarMenus', clienteController.salvarMenus);
router.post('/atualizarServico', clienteController.atualizarServico);
router.post('/listarComMenu', clienteController.listarComMenu);
router.post('/atualizar', clienteController.atualizar);
router.post('/deletar', clienteController.deletar); 
router.post('/adicionar', clienteController.adicionar); 
router.post('/adicionarServico', clienteController.adicionarServico);
router.post('/deletarServico', clienteController.deletarServico); 

module.exports = router;