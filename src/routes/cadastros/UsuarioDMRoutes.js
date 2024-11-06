const express = require('express');
const router = express.Router();
const UsuarioDMController = require('../../controllers/cadastro/UsuarioDMController');

router.post('/listar', UsuarioDMController.listar);
router.post('/listaSimples', UsuarioDMController.listarUsuariosSimples);
router.post('/adicionar', UsuarioDMController.adicionar); 
router.post('/atualizar', UsuarioDMController.atualizar); 
router.post('/deletar', UsuarioDMController.deletar); 

module.exports = router;