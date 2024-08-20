const express = require('express');
const router = express.Router();
const ImportController = require('../../controllers/cadastro/ImportController');

router.post('/mass', ImportController.importacao);


module.exports = router;