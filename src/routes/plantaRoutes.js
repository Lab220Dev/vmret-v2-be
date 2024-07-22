const express = require('express');
const router = express.Router();
const plantaController = require('../controllers/plantaController');

router.post('/listar', plantaController.listar);
router.post('/adicionar', plantaController.adicionar); 
router.post('/atualizar', plantaController.atualizar); 

module.exports = router;