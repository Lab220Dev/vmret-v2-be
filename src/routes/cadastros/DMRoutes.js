const express = require('express');
const router = express.Router();
const DMController = require('../../controllers/cadastro/DMcontroller');

router.post('/listar', DMController.listarDM);
router.post('/adicionar', DMController.adicionar);

module.exports = router;