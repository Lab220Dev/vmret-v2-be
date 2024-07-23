const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');

router.post('/login', loginController.login);
router.post('/logout', loginController.logout); 
router.post('/menu', loginController.menu); 

module.exports = router;