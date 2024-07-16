const express = require('express');
const router = express.Router();
const produtosController = require('../controllers/produtoController');
const path = require('path');

router.post('/listar', produtosController.listarProdutos);
router.post('/adicionar', produtosController.upload,produtosController.adicionarProdutos);
router.post('/listarplanta', produtosController.listarPlanta);
router.post('/deleteProduto', produtosController.deleteProduto);
module.exports = router;