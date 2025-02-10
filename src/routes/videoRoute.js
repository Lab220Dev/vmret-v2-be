const express = require('express');
const multer = require('multer');
const sql = require('mssql');
const { autenticarToken, autorizarRoles } = require('../middleware/authMiddleware');
const path = require('path');
const fs = require('fs');
const { logQuery } = require("../utils/logUtils");

const router = express.Router();

const uploadDir = path.join(__dirname, '../uploads/videos');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null,uploadDir); 
    },
    filename: (req, file, cb) => {
        let customName = req.body.customName && req.body.customName.trim()
            ? req.body.customName
            : `${Date.now()}-${file.originalname}`;
    
        const fileExtension = path.extname(file.originalname);
        console.log('Extensão recebida:',fileExtension)
        if (!customName.endsWith(fileExtension)) {
            customName += fileExtension;
        }
    
        cb(null, customName);
    },
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'video/mp4') {
        cb(null, true);
    } else {
        cb(new Error('Apenas vídeos .mp4 são permitidos'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 }, // Limite de 5MB
});

router.post('/upload',autenticarToken,autorizarRoles(['Master','Administrador']),
 upload.single('video'),
    async (req, res) => {
        let transaction;

        try {
            const file = req.file;
            if (!file) {
                return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
            }
            let customName = req.body.customName && req.body.customName.trim()
            ? req.body.customName
            : req.file.filename;

            const fileExtension = path.extname(file.originalname);
            if (!customName.endsWith(fileExtension)) {
                customName += fileExtension;
            }
            const targetPath = path.resolve(uploadDir, customName);

            if (file.path !== targetPath) {
                fs.renameSync(file.path, targetPath);
            }
            const dmId = req.body.dmId;
                const updateDMQuery = `
                    UPDATE DMs SET
                    Video = @video,
                    Sincronizado = 0
                    WHERE ID_DM = @ID_DM
                    `
                    transaction = new sql.Transaction();
                    await transaction.begin();
                    const request = new sql.Request(transaction);
                    request.input("ID_DM", sql.Int, dmId);
                    request.input("video", sql.VarChar, customName);
                    await request.query(updateDMQuery);

                    // Confirmar a transação
                    await transaction.commit();
                    res.status(200).json({ message: 'Upload realizado com sucesso!', fileName: customName });
        } catch (error) {
            if (transaction) {
                await transaction.rollback(); 
            }
            console.error('Erro ao fazer upload:', error);
            res.status(500).json({ error: 'Erro ao processar o upload.' });
        }
    }
);
router.post('/delete',autenticarToken,autorizarRoles(['Master','Administrador']), async (req, res) => {
        let transaction;

        try {
            const { dmId } = req.body;
            if (!dmId) {
                return res.status(400).json({ error: 'Dados da DM não foram enviadas' });
            }
            const deleteVideoQuery = `
                UPDATE DMs
                SET Video = 'N', Sincronizado = 0
                WHERE ID_DM = @ID_DM
            `;

            transaction = new sql.Transaction();
            await transaction.begin();

            const request = new sql.Request(transaction);
            request.input("ID_DM", sql.Int, dmId);

            await request.query(deleteVideoQuery);

            await transaction.commit();

            res.status(200).json({ message: 'Vídeo removido com sucesso!' });
        } catch (error) {
            if (transaction) {
                await transaction.rollback();
            }
            console.error('Erro ao remover vídeo:', error);
            res.status(500).json({ error: 'Erro ao remover vídeo.' });
        }
    }
);
router.get('/:Identificacao', async (req, res) => {
    const identificacao = req.params.Identificacao;

    try {
        if (!identificacao) {
            return res.status(400).json({ error: 'Identificação não fornecida.' });
        }
        const query = `
            SELECT Video
            FROM DMs
            WHERE Identificacao = @Identificacao
        `;

        const request = new sql.Request();
        request.input('Identificacao', sql.VarChar, identificacao); 
        const result = await request.query(query);

        if (!result.recordset || result.recordset.length === 0) {
            logQuery('error', 'Registro não encontrado para a identificação fornecida', 'falha', 'SELECT', null, null, query,{Identificacao:identificacao});
            return res.status(404).json({ error: 'Registro não encontrado para a identificação fornecida.' });
        }

        const videoName = result.recordset[0].Video;

        const videoPath = path.join(__dirname, '../uploads/videos', videoName);

        if (!fs.existsSync(videoPath)) {
            logQuery('error','Vídeo não encontrado no servidor','falha','VALIDATE',null,null,'nenhuma query associada para o video:@Video no para o Path:@path',{ Video: videoName, Path: videoPath });
            return res.status(404).json({ error: 'Vídeo não encontrado no servidor.' });
        }

        res.download(videoPath, videoName, (err) => {
            if (err) {
                logQuery('error','Erro ao processar o download','falha','DOWNLOAD',null,null,null,{ Video: videoName, Path: videoPath, Error: err.message });
                console.error('Erro ao processar o download:', err);
                res.status(500).json({ error: 'Erro ao processar o download.' });
            }
        });
    } catch (error) {
        logQuery('error',`Erro ao processar requisição para Identificação: ${identificacao}`,'falha','DOWNLOAD', null,null,null,{ Identificacao: identificacao, Error: error.message });
        console.error('Erro ao buscar ou enviar o arquivo:', error);
        res.status(500).json({ error: 'Erro ao processar a requisição.' });
    }
});
module.exports = router;