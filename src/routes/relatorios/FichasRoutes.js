const express = require('express');
const router = express.Router();
const FichasController = require('../../controllers/relatorios/FichasController');


router.post('/relatorio', FichasController.relatorio);
router.post('/textoFicha', FichasController.textoFicha);

module.exports = router;