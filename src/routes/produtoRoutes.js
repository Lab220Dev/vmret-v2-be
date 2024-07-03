const express = require('express');
const router = express.Router();
const produtosController = require('../controllers/produtoController');

router.post('/listar', produtosController.listarProdutos);
router.post('/adicionar', produtosController.adicionarProdutos);
router.post('/listarplanta', produtosController.listarPlanta);

module.exports = router;