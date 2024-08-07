const express = require('express');
const router = express.Router();
const Setorcontroller = require('../../controllers/cadastro/Setorcontroller');

router.post('/listar', Setorcontroller.listar);
router.post('/adicionar', Setorcontroller.adicionar); 
router.post('/atualizar', Setorcontroller.atualizar); 
router.post('/deletar', Setorcontroller.deleteFuncao); 

module.exports = router;