const express = require('express');
const router = express.Router();
const DMController = require('../../controllers/cadastro/DMcontroller');

router.post('/listar', DMController.listarDM);
router.post('/listarPaginado', DMController.listarDMPaginado);
router.post('/listaDmId', DMController.listarDMResumido2);
router.post('/listarDMResumido', DMController.listarDMResumido);
router.post('/recuperarInfo', DMController.recuperarClienteInfo);
router.post('/updateInfo', DMController.updateClienteInfo);
router.post('/adicionar', DMController.adicionar);
router.post('/atualizar', DMController.atualizar);
router.post('/listaritens', DMController.listarItensDM);
router.post('/adicionarItensDM', DMController.adicionarItens);
router.post('/atualizarItens', DMController.atualizarItemDM);
router.post('/deleteItem', DMController.deletarItensDM);
router.post('/delete', DMController.deletarDM);
router.post('/validar', DMController.validar);
router.post('/seforlocker', DMController.seforlocker);
router.post('/getLocker', DMController.getLocker);

module.exports = router;