const express = require('express');
const router = express.Router();
const apikeyController = require('../controllers/apikeyController');

router.post('/recuperar', apikeyController.recuperar);

module.exports = router;