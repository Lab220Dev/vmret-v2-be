const sql = require('mssql');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).fields([
    { name: 'file_principal', maxCount: 1 },
    { name: 'file_secundario_0', maxCount: 1 },
    { name: 'file_secundario_1', maxCount: 1 }]);

async function listarProdutos(request, response) {
    try {
        let query = 'SELECT * FROM produtos WHERE 1 = 1';

        if (request.body.id_cliente) {
            query += ` AND id_cliente = '${request.body.id_cliente}'`;
        } else {
            response.status(401).json("ID do cliente não enviado");
            return;
        }

        query += ' AND deleted = 0';

        const result = await new sql.Request().query(query);
        response.status(200).json(result.recordset);

    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

async function adicionarProdutos(request, response) {
    try {
        const { id_cliente, id_categoria, nome, descricao, validadedias, codigo, id_planta, id_tipoProduto, unidade_medida ,imagem1, imagem2} = request.body;
        const files = request.files;

        if (!id_cliente) {
            response.status(401).json("ID do cliente não enviado");
            return;
        }

        // Diretórios de upload com id_cliente antes da pasta principal
        const uploadPathPrincipal = path.join(__dirname, '../uploads/produtos', id_cliente.toString(), 'principal');
        const uploadPathSecundario = path.join(__dirname, '../uploads/produtos', id_cliente.toString(), 'secundario');

        // Cria diretórios de upload se não existirem
        await fs.mkdir(uploadPathPrincipal, { recursive: true });
        await fs.mkdir(uploadPathSecundario, { recursive: true });

        let imagem1Path = '';
        let imagem2Paths = [];
        for (const key in files) {
            const file = files[key][0];
            const fileExtension = path.extname(file.originalname);
            let filePath;

            if (key === 'file_principal') {
                const nomeArquivoPrincipal = `${imagem1}${fileExtension}`;
                filePath = path.join(uploadPathPrincipal, nomeArquivoPrincipal);
                imagem1Path = filePath;
            } else if (key.startsWith('file_secundario_')) {
                const nomeArquivoSecundario = `${imagem2}${fileExtension}`;
                filePath = path.join(uploadPathSecundario, nomeArquivoSecundario);
                imagem2Paths.push(filePath);
            }

            await fs.writeFile(filePath, file.buffer);
        }

        const query = `
            INSERT INTO produtos
            (id_cliente, id_categoria, nome, descricao, validadedias,
            imagem1, imagem2, imagem3, imagem4, imagemdetalhe, deleted, codigo,
            quantidademinima, capacidade, ca, id_planta, id_tipoProduto, unidade_medida)
            VALUES
            (@id_cliente, @id_categoria, @nome, @descricao, @validadedias,
            @imagem1, @imagem2, '', '', '', @deleted, @codigo,
            @quantidademinima, @capacidade, @ca, @id_planta, @id_tipoProduto, @unidade_medida)
        `;

        const requestSql = new sql.Request();
        requestSql.input('id_cliente', sql.Int, id_cliente);
        requestSql.input('id_categoria', sql.Int, id_categoria);
        requestSql.input('nome', sql.VarChar, nome);
        requestSql.input('descricao', sql.VarChar, descricao);
        requestSql.input('validadedias', sql.Int, validadedias);
        requestSql.input('imagem1', sql.VarChar, imagem1);
        requestSql.input('imagem2', sql.VarChar, imagem2); 
        requestSql.input('deleted', sql.Bit, false);
        requestSql.input('codigo', sql.VarChar, codigo);
        requestSql.input('quantidademinima', sql.Int, 0);
        requestSql.input('capacidade', sql.Int, 0);
        requestSql.input('ca', sql.NVarChar, '');
        requestSql.input('id_planta', sql.Int, id_planta);
        requestSql.input('id_tipoProduto', sql.BigInt, id_tipoProduto);
        requestSql.input('unidade_medida', sql.VarChar, unidade_medida);

        const result = await requestSql.query(query);

        if (result.rowsAffected.length > 0) {
            response.status(201).json("Produto registrado com sucesso");
        } else {
            response.status(400).json("Erro ao registrar o Produto");
        }
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

async function imagem1(request, response) {
    console.log(request.body);
    if (!request.files) {
        return response.status(400).send('Nenhum arquivo foi enviado.');
    }
}

async function imagem2(request, response) {
    console.log(request.body);
    if (!request.files) {
        return response.status(400).send('Nenhum arquivo foi enviado.');
    }
}

async function listarPlanta(request, response) {
    try {
        let query = 'SELECT DISTINCT id_planta FROM produtos WHERE 1 = 1';

        if (request.body.id_cliente) {
            query += ` AND id_cliente = '${request.body.id_cliente}'`;
            const result = await new sql.Request().query(query);
            response.status(200).json(result.recordset);
            return;
        }
        response.status(401).json("ID do cliente não enviado");
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

async function deleteProduto(request, response) {
    try {
        let query = "UPDATE produtos SET deleted = 1 WHERE 1 = 1";

        if (request.body.id_produto) {
            query += ` AND id_produto = '${request.body.id_produto}'`;
            const result = await new sql.Request().query(query);
            response.status(200).json(result.recordset);
            return;
        }
        response.status(401).json("ID do produto não foi enviado");
    } catch (error) {
        console.error('Erro ao excluir:', error.message);
        response.status(500).send('Erro ao excluir');
    }
}

module.exports = {
    upload,
    imagem1,
    imagem2,
    listarProdutos, 
    adicionarProdutos,
    listarPlanta,
    deleteProduto
};