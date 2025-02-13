const express = require('express');
const router = express.Router();
const clienteController = require('../../controllers/cadastro/ClienteController');

router.post('/listar', clienteController.listar);
router.post('/listaSimples', clienteController.listaSimples);
router.post('/listarServicos', clienteController.listarClienteComServicos);
router.get('/listarClienteServicos', clienteController.listarClienteComServicos);
router.post('/salvarMenus', clienteController.salvarMenus);
router.post('/atualizarServico', clienteController.atualizarServico);
router.post('/listarComMenu', clienteController.listarComMenu);
router.post('/listarComMenuPaginado', clienteController.listarComMenuPaginado);
router.post('/atualizar', clienteController.atualizar);
router.post('/adicionar', clienteController.adicionar); 
router.post('/adicionarServico', clienteController.adicionarServico);
router.post('/deletarServico', clienteController.deletarServico); 

//processo de deletar e atualizar progressbar
router.post('/deletar', clienteController.deletar); // Rota para excluir o cliente e acompanhar o progresso

// Rota para excluir o cliente e acompanhar o progresso
router.get('/deletar', clienteController.deletar); 

module.exports = router;