const express = require('express');
const router = express.Router();
const FichasController = require('../../controllers/relatorios/FichasController');


router.post('/relatorio', FichasController.relatorio);
module.exports = router;