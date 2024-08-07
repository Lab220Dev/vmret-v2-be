const express = require('express');
const router = express.Router();
const SDMController = require('../../controllers/relatorios/SDMController');

router.post('/relatorio', SDMController.relatorio);

module.exports = router;