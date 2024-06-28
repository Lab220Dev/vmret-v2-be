// src/routes/usuariosRoutes.js
const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarioController');

router.post('/login', usuariosController.login);

module.exports = router;
