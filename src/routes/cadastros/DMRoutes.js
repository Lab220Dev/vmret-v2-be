const express = require('express');
const router = express.Router();
const DMController = require('../../controllers/cadastro/DMcontroller');

router.post('/listar', DMController.listarDM);
router.post('/listarDMResumido', DMController.listarDMResumido);
router.post('/recuperarInfo', DMController.recuperarClienteInfo);
router.post('/updateInfo', DMController.updateClienteInfo);
router.post('/adicionar', DMController.adicionar);
router.post('/atualizar', DMController.atualizar);
router.post('/listaritens', DMController.listarItensDM);
router.post('/adicionarItens', DMController.adicionarItensDM);
router.post('/atualizarItens', DMController.atualizarItemDM);
router.post('/deleteItem', DMController.deletarItensDM);
router.post('/delete', DMController.deletarDM);

module.exports = router;