const express = require('express');
const router = express.Router();
const DMController = require('../../controllers/cadastro/DMcontroller');

router.post('/listar', DMController.listarDM);
router.post('/adicionar', DMController.adicionar);
router.post('/listaritens', DMController.listarItensDM);
router.post('/adicionarItens', DMController.adicionarItensDM);
router.post('/deleteItem', DMController.deletarItensDM);

module.exports = router;