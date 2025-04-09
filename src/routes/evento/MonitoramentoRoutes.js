const express = require('express');
const router = express.Router();
const  {autenticarToken }= require('../../middleware/authMiddleware');
const monitoramentoController = require('../../controllers/evento/MonitoramentoController');

router.get('/updateNomad', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    try{
        const primeirosDados = await monitoramentoController.checkForUpdatesNomad();
        if (primeirosDados.length > 0) {
            res.write(`data: ${JSON.stringify(primeirosDados)}\n\n`);
        }else{
            res.write(`data: ${JSON.stringify([])}\n\n`);
        }
        const intervalId = setInterval(async () => {
            const atualizacoes = await monitoramentoController.checkForUpdatesNomad();
            res.write(`data: ${JSON.stringify(atualizacoes)}\n\n`);
        }, 45000);
        req.on('close', () => {
            clearInterval(intervalId);
        });
    }catch (error) {
        console.error("Erro ao verificar atualizações:", error);
        res.status(500).send('Erro interno do servidor');
    }
});

router.post('/novoUsuario',monitoramentoController.register);
router.post('/deleteUsuario', autenticarToken,monitoramentoController.deleteUser);
router.post('/login', monitoramentoController.login);
module.exports = router;