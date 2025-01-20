// src/routes/usuariosRoutes.js
const express = require('express');
const router = express.Router();
const usuariosController = require('../../controllers/cadastro/usuarioController');

router.post('/adicionar', usuariosController.adicionar);
router.post('/atualizar', usuariosController.atualizarUsuario);
router.post('/deletar', usuariosController.deleteUsuario);
router.post('/listar', usuariosController.listar);
router.post('/listarPaginado', usuariosController.listarPaginado);
router.post('/listarPlanta', usuariosController.listarPlanta);

module.exports = router;
