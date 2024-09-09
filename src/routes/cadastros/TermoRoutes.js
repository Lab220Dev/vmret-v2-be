const express = require('express');
const router = express.Router();
const TermoController = require('../../controllers/cadastro/TermoController');

router.post('/Salvar', TermoController.Salvar);
router.post('/recuperar', TermoController.Recuperar);

module.exports = router;