const sql = require('mssql');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).fields([
    { name: 'file_principal', maxCount: 1 },
    { name: 'file_secundario', maxCount: 1 },
    { name: 'file_info', maxCount: 1 }
]);

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
        const { id_cliente, id_categoria, nome, descricao, validadedias, codigo, id_planta, id_tipoProduto, unidade_medida, imagem1, imagem2, imagemdetalhe } = request.body;
        const files = request.files;

        if (!id_cliente) {
            response.status(401).json("ID do cliente não enviado");
            return;
        }

        const sanitizeFileName = (filename) => filename.replace(/[\/\?<>\\:\*\|"]/g, '-').replace(/ /g, '_');

        // Diretórios de upload com id_cliente antes da pasta principal
        const uploadPathPrincipal = path.join(__dirname, '../uploads/produtos', id_cliente.toString(), 'principal');
        const uploadPathSecundario = path.join(__dirname, '../uploads/produtos', id_cliente.toString(), 'secundario');
        const uploadPathInfoAdicional = path.join(__dirname, '../uploads/produtos', id_cliente.toString(), 'info');

        // Cria diretórios de upload se não existirem
        await fs.mkdir(uploadPathPrincipal, { recursive: true });
        await fs.mkdir(uploadPathSecundario, { recursive: true });
        await fs.mkdir(uploadPathInfoAdicional, { recursive: true });

        let imagem1Path = '';
        let imagemdetalhePath = '';
        let imagemSecundariaPath = ''; 

        if (files['file_principal']) {
            const file = files['file_principal'][0];
            const nomeArquivoPrincipal = `${sanitizeFileName(imagem1)}`;
            imagem1Path = path.join(uploadPathPrincipal, nomeArquivoPrincipal);
            await fs.writeFile(imagem1Path, file.buffer);
        }


        if (files['file_secundario_0']) {
            const file = files['file_secundario'][0];
            const nomeArquivoSecundario = `${sanitizeFileName(imagem2)}`;
            imagemSecundariaPath = path.join(uploadPathSecundario, nomeArquivoSecundario);
            await fs.writeFile(imagemSecundariaPath, file.buffer);
        }

        // Processa a imagem de informações adicionais
        if (files['file_info']) {
            const file = files['file_info'][0];
            const nomeArquivoInfo = `${sanitizeFileName(imagemdetalhe)}`;
            imagemdetalhePath = path.join(uploadPathInfoAdicional, nomeArquivoInfo);
            await fs.writeFile(imagemdetalhePath, file.buffer);
        }

        const query = `
            INSERT INTO produtos
            (id_cliente, id_categoria, nome, descricao, validadedias,
            imagem1, imagem2, imagem3, imagem4, imagemdetalhe, deleted, codigo,
            quantidademinima, capacidade, ca, id_planta, id_tipoProduto, unidade_medida)
            VALUES
            (@id_cliente, @id_categoria, @nome, @descricao, @validadedias,
            @imagem1, @imagem2, @imagem3, @imagem4, @imagemdetalhe, @deleted, @codigo,
            @quantidademinima, @capacidade, @ca, @id_planta, @id_tipoProduto, @unidade_medida)
        `;

        const requestSql = new sql.Request();
        requestSql.input('id_cliente', sql.Int, id_cliente);
        requestSql.input('id_categoria', sql.Int, id_categoria);
        requestSql.input('nome', sql.VarChar, nome);
        requestSql.input('descricao', sql.VarChar, descricao);
        requestSql.input('validadedias', sql.Int, validadedias);
        requestSql.input('imagem1', sql.VarChar, imagem1);
        requestSql.input('imagem2', sql.VarChar, imagem2); // Imagem secundária única
        requestSql.input('imagem3', sql.VarChar, null); // Não usa imagens 3 e 4
        requestSql.input('imagem4', sql.VarChar, null);
        requestSql.input('imagemdetalhe', sql.VarChar, imagemdetalhe);
        requestSql.input('deleted', sql.Bit, false);
        requestSql.input('codigo', sql.VarChar, codigo);
        requestSql.input('quantidademinima', sql.Int, 0);
        requestSql.input('capacidade', sql.Int, 0);
        requestSql.input('ca', sql.NVarChar, '');
        requestSql.input('id_planta', sql.Int, id_planta);
        requestSql.input('id_tipoProduto', sql.BigInt, id_tipoProduto);
        requestSql.input('unidade_medida', sql.VarChar, unidade_medida);

        const result = await requestSql.query(query);

        if (result) {
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
async function atualizarProduto(request, response) {
    try {
        const { id_produto,id_cliente, id_categoria, nome, descricao, validadedias, codigo, id_planta, id_tipoProduto, unidade_medida, imagem1, imagem2, imagem3, imagem4, imagemdetalhe } = request.body;
        const files = request.files;

        if (!id_produto) {
            response.status(401).json("ID do produto não enviado");
            return;
        }

        // Função para sanitizar nomes de arquivos
        const sanitizeFileName = (filename) => filename.replace(/[\/\?<>\\:\*\|"]/g, '-').replace(/ /g, '_');

        // Diretórios de upload com id_cliente antes da pasta principal
        const uploadPathPrincipal = path.join(__dirname, '../uploads/produtos', id_cliente.toString(), 'principal');
        const uploadPathSecundario = path.join(__dirname, '../uploads/produtos', id_cliente.toString(), 'secundario');
        const uploadPathInfoAdicional = path.join(__dirname, '../uploads/produtos', id_cliente.toString(), 'info');

        // Cria diretórios de upload se não existirem
        await fs.mkdir(uploadPathPrincipal, { recursive: true });
        await fs.mkdir(uploadPathSecundario, { recursive: true });
        await fs.mkdir(uploadPathInfoAdicional, { recursive: true });

        // Lista de caminhos das imagens atualizadas
        let imagem1Path = imagem1;
        let imagemdetalhePath = imagemdetalhe;
        let imagemSecundariasPaths = [imagem2, imagem3, imagem4];

        // Verifica se há alterações nas imagens secundárias
        for (let i = 0; i < 3; i++) {
            if (files[`file_secundario_${i}`]) {
                const file = files[`file_secundario_${i}`][0];
                const nomeArquivoSecundario = `${sanitizeFileName(imagemSecundariasPaths[i])}`;
                const filePath = path.join(uploadPathSecundario, nomeArquivoSecundario);
                await fs.writeFile(filePath, file.buffer);
                imagemSecundariasPaths[i] = filePath;
            }
        }

        // Verifica se há alteração na imagem principal
        if (files['file_principal']) {
            const file = files['file_principal'][0];
            const nomeArquivoPrincipal = `${sanitizeFileName(imagem1)}`;
            imagem1Path = path.join(uploadPathPrincipal, nomeArquivoPrincipal);
            await fs.writeFile(imagem1Path, file.buffer);
        }

        // Verifica se há alteração na imagem de informação adicional
        if (files['file_info']) {
            const file = files['file_info'][0];
            const nomeArquivoInfo = `${sanitizeFileName(imagemdetalhe)}`;
            imagemdetalhePath = path.join(uploadPathInfoAdicional, nomeArquivoInfo);
            await fs.writeFile(imagemdetalhePath, file.buffer);
        }

        // Atualiza o produto no banco de dados
        const query = `
            UPDATE produtos
            SET id_cliente = @id_cliente,
                id_categoria = @id_categoria,
                nome = @nome,
                descricao = @descricao,
                validadedias = @validadedias,
                imagem1 = @imagem1,
                imagem2 = @imagem2,
                imagem3 = @imagem3,
                imagem4 = @imagem4,
                imagemdetalhe = @imagemdetalhe,
                codigo = @codigo,
                id_planta = @id_planta,
                id_tipoProduto = @id_tipoProduto,
                unidade_medida = @unidade_medida
            WHERE id_produto = @id_produto
        `;

        const requestSql = new sql.Request();
        requestSql.input('id_cliente', sql.Int, id_cliente);
        requestSql.input('id_categoria', sql.Int, id_categoria);
        requestSql.input('nome', sql.VarChar, nome);
        requestSql.input('descricao', sql.VarChar, descricao);
        requestSql.input('validadedias', sql.Int, validadedias);
        requestSql.input('imagem1', sql.VarChar, imagem1Path);
        requestSql.input('imagem2', sql.VarChar, imagemSecundariasPaths[0]);
        requestSql.input('imagem3', sql.VarChar, imagemSecundariasPaths[1]);
        requestSql.input('imagem4', sql.VarChar, imagemSecundariasPaths[2]);
        requestSql.input('imagemdetalhe', sql.VarChar, imagemdetalhePath);
        requestSql.input('codigo', sql.VarChar, codigo);
        requestSql.input('id_planta', sql.Int, id_planta);
        requestSql.input('id_tipoProduto', sql.BigInt, id_tipoProduto);
        requestSql.input('unidade_medida', sql.VarChar, unidade_medida);
        requestSql.input('id_produto', sql.Int, id_produto);

        const result = await requestSql.query(query);

        // Verifica se houve sucesso na atualização
        if (result.rowsAffected && result.rowsAffected[0] > 0) {
            response.status(200).json("Produto atualizado com sucesso");
        } else {
            response.status(400).json("Erro ao atualizar o Produto");
        }
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

module.exports = {
    upload,
    imagem1,
    imagem2,
    listarProdutos,
    adicionarProdutos,
    listarPlanta,
    deleteProduto,
    atualizarProduto
};