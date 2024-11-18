const express = require('express');
const router = express.Router();
const Setorcontroller = require('../../controllers/cadastro/Setorcontroller');

router.post('/listar', Setorcontroller.listar);
router.post('/listaSimples', Setorcontroller.listaSimples);
router.post('/fetchProdutoSetor', Setorcontroller.listarItensSetor);
router.post('/itensdisponiveissetor', Setorcontroller.listarItensDisponiveisSetor);
router.post('/additem', Setorcontroller.adicionarItem);
router.post('/adicionar', Setorcontroller.adicionar); 
router.post('/atualizar', Setorcontroller.atualizar); 
router.post('/deletar', Setorcontroller.deleteFuncao); 

module.exports = router;