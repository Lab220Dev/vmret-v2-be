const sql = require('mssql');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const { logQuery } = require('../../utils/logUtils');
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
    const { id_cliente, id_categoria, nome, descricao, validadedias, codigo, id_planta, id_tipoProduto, unidade_medida, imagem1, imagem2, imagemdetalhe, id_usuario } = request.body;
    const query = `
    INSERT INTO produtos
    (id_cliente, id_categoria, nome, descricao, validadedias,
    imagem1, imagem2, imagemdetalhe, deleted, codigo,
    quantidademinima, capacidade, ca, id_planta, id_tipoProduto, unidade_medida)
    VALUES
    (@id_cliente, @id_categoria, @nome, @descricao, @validadedias,
    @imagem1, @imagem2, @imagemdetalhe, @deleted, @codigo,
    @quantidademinima, @capacidade, @ca, @id_planta, @id_tipoProduto, @unidade_medida)
`;
    const params = {
        id_cliente: id_cliente,
        id_categoria: id_categoria,
        nome: nome,
        descricao: descricao,
        validadedias: validadedias,
        imagem1: imagem1,
        imagem2: imagem2,
        imagemdetalhe: imagemdetalhe,
        deleted: false,
        codigo: codigo,
        quantidademinima: 0,
        capacidade: 0,
        ca: '',
        id_planta: id_planta,
        id_tipoProduto: id_tipoProduto,
        unidade_medida: unidade_medida,
    };
    try {
        const files = request.files;

        if (!id_cliente) {
            response.status(401).json("ID do cliente não enviado");
            return;
        }


        const sanitizeFileName = (filename) => {
            if (typeof filename === 'string') {
                // Divide o nome do arquivo e a extensão
                const parts = filename.split('.');
                const extension = parts.length > 1 ? `.${parts.pop()}` : '';  // Pega a extensão do arquivo
        
                // Reconstroi o nome do arquivo sem a extensão
                const nameWithoutExtension = parts.join('.').normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')  // Remove acentos
                    .replace(/[^a-zA-Z0-9 _]/g, '-')  // Substitui caracteres especiais por '-'
                    .replace(/ /g, '_');  // Substitui espaços por '_'
        
                // Retorna o nome sanitizado com a extensão preservada
                return `${nameWithoutExtension}${extension}`;
            } else {
                console.error('Filename is not a string:', filename);
                return 'unknown_filename';  // Retorna um nome padrão se não for string
            }
        };

        // Diretórios de upload com id_cliente antes da pasta principal
        const uploadPathPrincipal = path.join(__dirname, '../../uploads/produtos', id_cliente.toString(), 'principal');
        const uploadPathSecundario = path.join(__dirname, '../../uploads/produtos', id_cliente.toString(), 'secundario');
        const uploadPathInfoAdicional = path.join(__dirname, '../../uploads/produtos', id_cliente.toString(), 'info');

        // Cria diretórios de upload se não existirem
        await fs.mkdir(uploadPathPrincipal, { recursive: true });
        await fs.mkdir(uploadPathSecundario, { recursive: true });
        await fs.mkdir(uploadPathInfoAdicional, { recursive: true });

        let imagem1Path = '';
        let imagemdetalhePath = '';
        let imagem2Path = '';

        if (files['file_principal']) {
            const file = files['file_principal'][0];
            const nomeArquivoPrincipal = `${sanitizeFileName(imagem1)}`;
            imagem1Path = path.join(uploadPathPrincipal, nomeArquivoPrincipal);
            await fs.writeFile(imagem1Path, file.buffer);
        }

        if (files['file_secundario']) {
            const file = files['file_secundario'][0];
            const nomeArquivoSecundario = `${sanitizeFileName(imagem2)}`;
            imagem2Path = path.join(uploadPathSecundario, nomeArquivoSecundario);
            await fs.writeFile(imagem2Path, file.buffer);
        }

        if (files['file_info']) {
            const file = files['file_info'][0];
            const nomeArquivoInfo = `${sanitizeFileName(imagemdetalhe)}`;
            imagemdetalhePath = path.join(uploadPathInfoAdicional, nomeArquivoInfo);
            await fs.writeFile(imagemdetalhePath, file.buffer);
        }



        const requestSql = new sql.Request();
        requestSql.input('id_cliente', sql.Int, id_cliente);
        requestSql.input('id_categoria', sql.Int, id_categoria);
        requestSql.input('nome', sql.VarChar, nome);
        requestSql.input('descricao', sql.VarChar, descricao);
        requestSql.input('validadedias', sql.Int, validadedias);
        console.log('image1:', sanitizeFileName(imagem1))
        requestSql.input('imagem1', sql.VarChar, sanitizeFileName(imagem1));
        console.log('image2:', sanitizeFileName(imagem2))
        requestSql.input('imagem2', sql.VarChar, sanitizeFileName(imagem2)); // Imagem secundária única
        requestSql.input('imagemdetalhe', sql.VarChar,sanitizeFileName(imagemdetalhe));
        requestSql.input('deleted', sql.Bit, false);
        requestSql.input('codigo', sql.VarChar, codigo);
        requestSql.input('quantidademinima', sql.Int, 0);
        requestSql.input('capacidade', sql.Int, 0);
        requestSql.input('ca', sql.NVarChar, '');
        requestSql.input('id_planta', sql.Int, id_planta);
        requestSql.input('id_tipoProduto', sql.BigInt, id_tipoProduto);
        requestSql.input('unidade_medida', sql.VarChar, unidade_medida);

        const result = await requestSql.query(query);

        if (result.rowsAffected[0] > 0) {
           // logQuery('info', `Usuário ${id_usuario} criou um novo Centro de Custo`, 'sucesso', 'INSERT', id_cliente, id_usuario, query, params);
            response.status(201).json("Produto registrado com sucesso");

        } else {
            //logQuery('error', `Usuário ${id_usuario} falhou ao criar Centro de Custo`, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
            response.status(400).json("Erro ao registrar o Produto");
        }
    } catch (error) {
        const errorMessage = error.message.includes('Query não fornecida para logging')
            ? 'Erro crítico: Falha na operação'
            : `Erro ao adicionar Centro de Custo: ${error.message}`;
       // logQuery('error', errorMessage, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
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

async function imagemdetalhe(request, response) {
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
    let query = "UPDATE produtos SET deleted = 1 WHERE id_produto = @id_produto";
    const { id_produto, id_cliente, id_usuario } = request.body;
    const params = {
        id_produto: id_produto
    };
    
    try {
        if (id_produto) {
            const sqlRequest = new sql.Request();
            sqlRequest.input('id_produto', sql.Int, id_produto);
            const result = await sqlRequest.query(query);

            if (result.rowsAffected[0] > 0) {
                //logWithOperation('info', `Produto ${id_produto} Deletado com sucesso`, `sucesso`, 'Delete Produto', id_cliente, id_usuario);
                return response.status(200).json(result.recordset);
            } else {
                // logQuery('error', `Erro ao excluir: ${id_produto} não encontrado.`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
                return response.status(400).send('Nenhuma alteração foi feita no centro de custo.');
            }
        } else {
            return response.status(401).json("ID do produto não foi enviado");
        }
    } catch (error) {
        console.error('Erro ao excluir:', error.message);
        // logQuery('error', err.message, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
        return response.status(500).send('Erro ao excluir');
    }
}

async function atualizarProduto(request, response) {
    const { id_usuario, id_produto, id_cliente, id_categoria, nome, descricao, validadedias, codigo, id_planta, id_tipoProduto, unidade_medida, imagem1, imagem2, imagemdetalhe } = request.body;
    const query = `
    UPDATE produtos
    SET id_cliente = @id_cliente,
        id_categoria = @id_categoria,
        nome = @nome,
        descricao = @descricao,
        validadedias = @validadedias,
        imagem1 = @imagem1,
        imagem2 = @imagem2,
        imagemdetalhe = @imagemdetalhe,
        codigo = @codigo,
        id_planta = @id_planta,
        id_tipoProduto = @id_tipoProduto,
        unidade_medida = @unidade_medida
    WHERE id_produto = @id_produto
`;
    const params = {
        id_cliente: id_cliente,
        id_categoria: id_categoria,
        nome: nome,
        descricao: descricao,
        validadedias: validadedias,
        imagem1: imagem1,
        imagem2: imagem2,
        imagemdetalhe: imagemdetalhe,
        codigo: codigo,
        id_planta: id_planta,
        id_tipoProduto: id_tipoProduto,
        unidade_medida: unidade_medida,
        id_produto: id_produto
    };
    try {
        const files = request.files;
        if (!id_produto) {
            response.status(401).json("ID do produto não enviado");
            return;
        }

        // Função para sanitizar nomes de arquivos

        const sanitizeFileName = (filename) => {
            if (typeof filename === 'string') {
                // Divide o nome do arquivo e a extensão
                const parts = filename.split('.');
                const extension = parts.length > 1 ? `.${parts.pop()}` : '';  // Pega a extensão do arquivo
        
                // Reconstroi o nome do arquivo sem a extensão
                const nameWithoutExtension = parts.join('.').normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')  // Remove acentos
                    .replace(/[^a-zA-Z0-9 _]/g, '-')  // Substitui caracteres especiais por '-'
                    .replace(/ /g, '_');  // Substitui espaços por '_'
        
                // Retorna o nome sanitizado com a extensão preservada
                return `${nameWithoutExtension}${extension}`;
            } else {
                console.error('Filename is not a string:', filename);
                return 'unknown_filename';  // Retorna um nome padrão se não for string
            }
        };

        // Diretórios de upload com id_cliente antes da pasta principal
        const uploadPathPrincipal = path.join(__dirname, '../../uploads/produtos', id_cliente.toString(), 'principal');
        const uploadPathSecundario = path.join(__dirname, '../../uploads/produtos', id_cliente.toString(), 'secundario');
        const uploadPathInfoAdicional = path.join(__dirname, '../../uploads/produtos', id_cliente.toString(), 'info');

        // Cria diretórios de upload se não existirem
        await fs.mkdir(uploadPathPrincipal, { recursive: true });
        await fs.mkdir(uploadPathSecundario, { recursive: true });
        await fs.mkdir(uploadPathInfoAdicional, { recursive: true });

        // Lista de caminhos das imagens atualizadas
        let imagem1Path = imagem1;
        let imagemdetalhePath = imagemdetalhe;
        let imagem2Path = imagem2;


        if (files[`file_secundario`]) {
            const file = files[`file_secundario`][0];
            const nomeArquivoSecundario = `${sanitizeFileName(imagem2)}`;
            const filePath = path.join(uploadPathSecundario, nomeArquivoSecundario);
            await fs.writeFile(filePath, file.buffer);
            imagem2Path = filePath; // Corrige para atualizar o caminho da imagem secundária
        }

        if (files['file_principal']) {
            const file = files['file_principal'][0];
            const nomeArquivoPrincipal = `${sanitizeFileName(imagem1)}`;
            imagem1Path = path.join(uploadPathPrincipal, nomeArquivoPrincipal);
            await fs.writeFile(imagem1Path, file.buffer);
        }

        if (files['file_info']) {
            const file = files['file_info'][0];
            const nomeArquivoInfo = `${sanitizeFileName(imagemdetalhe)}`;
            imagemdetalhePath = path.join(uploadPathInfoAdicional, nomeArquivoInfo);
            await fs.writeFile(imagemdetalhePath, file.buffer);
        }

        const requestSql = new sql.Request();
        requestSql.input('id_cliente', sql.Int, id_cliente);
        requestSql.input('id_categoria', sql.Int, id_categoria);
        requestSql.input('nome', sql.VarChar, nome);
        requestSql.input('descricao', sql.VarChar, descricao);
        requestSql.input('validadedias', sql.Int, validadedias);
        requestSql.input('imagem1', sql.VarChar, sanitizeFileName(imagem1));
        requestSql.input('imagem2', sql.VarChar, sanitizeFileName(imagem2));
        requestSql.input('imagemdetalhe', sql.VarChar, sanitizeFileName(imagemdetalhe));
        requestSql.input('codigo', sql.VarChar, codigo);
        requestSql.input('id_planta', sql.Int, id_planta);
        requestSql.input('id_tipoProduto', sql.BigInt, id_tipoProduto);
        requestSql.input('unidade_medida', sql.VarChar, unidade_medida);
        requestSql.input('id_produto', sql.Int, id_produto);

        const result = await requestSql.query(query);

        // Verifica se houve sucesso na atualização
        if (result.rowsAffected && result.rowsAffected[0] > 0) {
           // logQuery('info', `Produto ${id_produto} Deletado com sucesso`, 'sucesso', 'UPDATE', id_cliente, id_usuario, query, params);
            response.status(200).json("Produto atualizado com sucesso");
        } else {
           // logQuery('error', `${err.message}`, 'Falha', 'UPDATE', id_cliente, id_usuario, query, params);
            response.status(400).json("Erro ao atualizar o Produto");
        }
    } catch (error) {
       // logQuery('error', `${err.message}`, 'Falha', 'UPDATE', id_cliente, id_usuario, query, params);
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

module.exports = {
    upload,
    imagem1,
    imagem2,
    imagemdetalhe,
    listarProdutos,
    adicionarProdutos,
    listarPlanta,
    deleteProduto,
    atualizarProduto
};