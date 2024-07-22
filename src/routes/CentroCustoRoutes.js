const express = require('express');
const router = express.Router();
const CentroCustocontroller = require('../controllers/CentroCustoController');

router.post('/listar', CentroCustocontroller.listar);
router.post('/adicionar', CentroCustocontroller.adicionar); 
router.post('/deleteCentro', CentroCustocontroller.deleteCentro);
router.post('/atualizar', CentroCustocontroller.atualizar); 

module.exports = router;