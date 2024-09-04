const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

function determinarTipo(texto) {
    if (texto.includes("Princ")) {
        return "principal";
    } else if (texto.includes("info")) {
        return "info";
    } else {
        return "Secundario";
    }
}

router.get('/produto/:id/:imageName', (req, res) => {
    const imageName = req.params.imageName;
    const idCliente = req.params.id;
    const sanitizeFileName = (filename) => filename.replace(/[\/\?<>\\:\*\|"]/g, '-').replace(/ /g, '_');
    const imagePath = path.join(__dirname, '../uploads/produtos', idCliente.toString(), determinarTipo(imageName), sanitizeFileName(imageName.toString()));

    fs.readFile(imagePath, (err, data) => {
        if (err) {
            return res.status(404).json({ error: 'Imagem não encontrada' });
        }

        const base64Image = data.toString('base64');
        const mimeType = 'image/png';

        res.json({ image: base64Image, mimeType });
    });



});

router.get('/produtoExt/:id/:imageName', (req, res) => {
    const imageName = req.params.imageName;
    const idCliente = req.params.id;

    // Função para sanitizar o nome do arquivo, removendo caracteres inválidos
    const sanitizeFileName = (filename) => filename.replace(/[\/\?<>\\:\*\|"]/g, '-').replace(/ /g, '_');

    // Caminho completo para a imagem
    const imagePath = path.join(__dirname, '../uploads/produtos', idCliente.toString(), determinarTipo(imageName), sanitizeFileName(imageName.toString()));

    // Verifica se o arquivo existe antes de tentar enviá-lo
    fs.access(imagePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).json({ error: 'Imagem não encontrada' });
        }

        // Envia a imagem diretamente
        res.sendFile(imagePath);
    });
});

router.post('/produtos/imagesAdicionais', (req, res) => {
    const { idcliente, imageNames } = req.body;
    const sanitizeFileName = (filename) => filename.replace(/[\/\?<>\\:\*\|"]/g, '-').replace(/ /g, '_');
    if (!Array.isArray(imageNames)) {
        return res.status(400).json({ error: 'Formato inválido para a lista de nomes de imagens' });
    }

    const images = imageNames.map((imageName) => {
        const imagePath = path.join(__dirname, '../uploads/produtos', idcliente.toString(), 'secundario', sanitizeFileName(imageName));

        if (fs.existsSync(imagePath)) {
            const data = fs.readFileSync(imagePath);
            const base64Image = data.toString('base64');
            const mimeType = 'image/png';
            return { imageName, image: base64Image, mimeType };
        } else {
            return { imageName, error: 'Imagem não encontrada' };
        }
    });

    res.json(images);
});

router.get('/funcionario/:id/:imageName', (req, res) => {
    const imageName = req.params.imageName;
    const idCliente = req.params.id;
    const sanitizeFileName = (filename) => filename.replace(/[\/\?<>\\:\*\|"]/g, '-').replace(/ /g, '_');
    const imagePath = path.join(__dirname, '../uploads/funcionarios', idCliente.toString(),  sanitizeFileName(imageName.toString()));
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
