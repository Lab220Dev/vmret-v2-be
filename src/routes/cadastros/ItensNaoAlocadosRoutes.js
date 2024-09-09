const express = require('express');
const router = express.Router();
const ItensNaoAlocadosController = require('../../controllers/cadastro/ItensNaoAlocadosController');

router.post('/recuperar', ItensNaoAlocadosController.recuperar);
router.post('/sincronizar', ItensNaoAlocadosController.sincronizar);


module.exports = router;