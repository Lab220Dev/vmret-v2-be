const express = require('express');
const router = express.Router();
const plantaController = require('../../controllers/cadastro/plantaController');

router.post('/listar', plantaController.listar);
router.post('/listarPaginando', plantaController.listarPaginado);
router.post('/listaSimples', plantaController.listaSimlpes);
router.post('/adicionar', plantaController.adicionar); 
router.post('/atualizar', plantaController.atualizar);
router.post('/deletePlanta', plantaController.deletePlanta); 

module.exports = router;