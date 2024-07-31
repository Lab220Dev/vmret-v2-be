const express = require('express');
const router = express.Router();
const FuncaoController = require('../../controllers/cadastro/FuncaoController');

router.post('/listar', FuncaoController.listar);
router.post('/adicionar', FuncaoController.adicionar); 
router.post('/atualizar', FuncaoController.atualizar); 

module.exports = router;