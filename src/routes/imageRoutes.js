const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

router.get('/produtos/:id/:imageName',  (req, res) => {
    const imageName = req.params.imageName;
    const idCliente = req.params.id;
    const imagePath = path.join(__dirname, '../uploads/produtos', idCliente, 'principal', imageName);

    fs.readFile(imagePath, (err, data) => {
        if (err) {
            return res.status(404).json({ error: 'Imagem não encontrada' });
        }

        const base64Image = data.toString('base64');
        const mimeType = 'image/png'; 

        res.json({ image: base64Image, mimeType });
    });



});
router.get('/funcionario/:id/:imageName',  (req, res) => {
    const imageName = decodeURIComponent(req.params.imageName);
    const idCliente = req.params.id;
    const imagePath = path.join(__dirname, '../uploads/funcionarios', idCliente.toString(), imageName);
    fs.readFile(imagePath, (err, data) => {
        if (err) {
            console.error('Error reading image file:', err);
            return res.status(404).json({ error: 'Imagem não encontrada' });
        }

        const base64Image = data.toString('base64');
        const mimeType = 'image/png'; 

        res.json({ image: base64Image, mimeType });
    });
});
module.exports = router;
