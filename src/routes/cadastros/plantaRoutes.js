const express = require('express');
const router = express.Router();
const plantaController = require('../../controllers/cadastro/plantaController');

router.post('/listar', plantaController.listar);
router.post('/listaSimples', plantaController.listaSimlpes);
router.post('/adicionar', plantaController.adicionar); 
router.post('/atualizar', plantaController.atualizar); 

module.exports = router;