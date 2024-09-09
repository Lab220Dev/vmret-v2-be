const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Função para determinar o tipo MIME com base na extensão do arquivo
const getMimeType = (fileName) => {
    const ext = path.extname(fileName).toLowerCase();
    switch (ext) {
        case '.png':
            return 'image/png';
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        default:
            return 'application/octet-stream'; // Tipo MIME genérico para arquivos desconhecidos
    }
};

const determinarTipo = (texto) => {
    if (texto.includes("Princ")) {
        return "principal";
    } else if (texto.includes("info")) {
        return "info";
    } else {
        return "Secundario";
    }
};

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
        const mimeType = getMimeType(imageName); // Determina o tipo MIME com base na extensão do arquivo

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
    const imageName = req.params.imageName;
    const idCliente = req.params.id;
    const sanitizeFileName = (filename) => filename.replace(/[\/\?<>\\:\*\|"]/g, '-').replace(/ /g, '_');
    const imagePath = path.join(__dirname, '../uploads/produtos', idCliente.toString(), determinarTipo(imageName), sanitizeFileName(imageName.toString()));

    fs.readFile(imagePath, (err, data) => {
        if (err) {
            return res.status(404).json({ error: 'Imagem não encontrada' });
        }

        const base64Image = data.toString('base64');
        const mimeType = getMimeType(imageName); // Determina o tipo MIME com base na extensão do arquivo

        res.json({ image: base64Image, mimeType });
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
