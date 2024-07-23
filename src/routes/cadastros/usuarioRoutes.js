// src/routes/usuariosRoutes.js
const express = require('express');
const router = express.Router();
const usuariosController = require('../../controllers/cadastro/usuarioController');

router.post('/adicionar', usuariosController.adicionar);
router.post('/listar', usuariosController.listar)

module.exports = router;
