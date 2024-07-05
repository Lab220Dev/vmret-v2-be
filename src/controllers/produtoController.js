const sql = require('mssql');

async function listarProdutos(request, response) {
    try {
        let query = 'SELECT * FROM produtos WHERE 1 = 1';

        if (request.body.id_cliente) {
            query += ` AND id_cliente = '${request.body.id_cliente}'`;
        }
        else {
        response.status(401).json("id do cliente não enviado");
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
        if (request.body.id_cliente) {
            const { id_cliente, id_categoria, nome, descricao, validadedias,
                     codigo, id_planta, id_tipoProduto, unidade_medida } = request.body;
            
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
            requestSql.input('imagem1', sql.VarChar, '');
            requestSql.input('imagem2', sql.VarChar, '');
            requestSql.input('imagem3', sql.VarChar, '');
            requestSql.input('imagem4', sql.VarChar, '');
            requestSql.input('imagemdetalhe', sql.VarChar, '');
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
        } else {
            response.status(401).json("ID do cliente não enviado");
        }
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
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
        response.status(401).json("id do cliente não enviado");
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
        response.status(401).json("id do produto não foi enviado");
    } catch (error) {
        console.error('Erro ao excluir:', error.message);
        response.status(500).send('Erro ao excluir');
    }
}
module.exports = {
    listarProdutos, 
    adicionarProdutos,
    listarPlanta,
    deleteProduto
};