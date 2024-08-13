const sql = require('mssql');
const { logQuery } = require('../../utils/logUtils');


async function listar(request, response) {
    try {
        let query = 'SELECT * FROM plantas WHERE deleted = 0';
        if (request.body.id_cliente) {
            query += ` AND id_cliente = '${request.body.id_cliente}'`;
            request = new sql.Request();
            const result = await request.query(query);
            response.status(200).json(result.recordset);
            return;
        }
        response.status(401).json("ID do cliente não enviado");
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

async function adicionar(request, response) {
    const { codigo, nome, userId = '', senha = '', urlapi = '',
        clienteid = '' } = request.body;
    const id_cliente = request.body.id_cliente;
    const id_usuario = request.body.id_cliente;
    const query = `INSERT INTO plantas (id_cliente, codigo, nome,
     userId, senha, urlapi, clientid , deleted)
     VALUES (@id_cliente, @codigo, @nome, @userId, @senha,
      @urlapi, @clientid, @deleted)`;
    const params = {
        id_cliente: id_cliente,
        codigo: codigo,
        nome: nome,
        deleted: false,
        userid: userId,
        senha: senha,
        urlapi: urlapi,
        clientid: clienteid,
    };
    try {
        request = new sql.Request();
        request.input('id_cliente', sql.Int, id_cliente);
        request.input('codigo', sql.NVarChar, codigo);
        request.input('nome', sql.VarChar, nome);
        request.input('deleted', sql.Bit, false);
        request.input('userid', sql.NVarChar, userId);
        request.input('senha', sql.NVarChar, senha);
        request.input('urlapi', sql.NVarChar, urlapi);
        request.input('clientid', sql.NVarChar, clienteid);
        const result = await request.query(query);
        if (result.rowsAffected[0] > 0) {
            logQuery('info', `Usuário ${id_usuario} criou um novo Centro de Custo`, 'sucesso', 'INSERT', id_cliente, id_usuario, query, params);
            response.status(201).send('Planta criada com sucesso!');
            return;
        } else {
            logQuery('error', `Usuário ${id_usuario} falhou ao criar Centro de Custo`, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
            response.status(400).send('Falha ao criar o Centro de Custo');
        }
    } catch (error) {
        const errorMessage = error.message.includes('Query não fornecida para logging')
            ? 'Erro crítico: Falha na operação'
            : `Erro ao adicionar Centro de Custo: ${error.message}`;
        logQuery('error', errorMessage, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
        console.error('Erro ao adicionar Planta:', error.message);
        response.status(500).send('Erro ao adicionar Planta');
    }
}
async function atualizar(request, response) {
    const { codigo, nome, userId, senha, urlapi,
        clienteid, id_planta } = request.body;
    const id_cliente = request.body.id_cliente;
    const id_usuario = request.body.id_usuario;
    const query = `UPDATE plantas 
    SET id_cliente = @id_cliente,
    codigo = @codigo,
    nome = @nome,
    userId = @userid,
    senha = @senha,
    urlapi = @urlapi,
    clientid = @clientid
    WHERE id_planta = @id_planta`;
    const params = {
        id_cliente: id_cliente,
        codigo: codigo,
        nome: nome,
        userId: userId,
        senha: senha,
        urlapi: urlapi,
        clientid: clienteid,
        id_planta: id_planta
    };
    try {
        request = new sql.Request();
        request.input('id_cliente', sql.Int, id_cliente);
        request.input('codigo', sql.NVarChar, codigo);
        request.input('nome', sql.VarChar, nome);
        request.input('userId', sql.NVarChar, userId);
        request.input('senha', sql.NVarChar, senha);
        request.input('urlapi', sql.NVarChar, urlapi);
        request.input('clientid', sql.NVarChar, clienteid);
        request.input('id_planta', sql.Int, id_planta);
        const result = await request.query(query);
        if (result.rowsAffected && result.rowsAffected[0] > 0) {
            logQuery('info', `O usuário ${id_usuario} atualizou o Centro de Custo ${ID_CentroCusto}`, 'sucesso', 'UPDATE', id_cliente, id_usuario, query, params);
            response.status(200).json("Produto atualizado com sucesso");
        } else {
            logQuery('error', `Usuário ${id_usuario} tentou atualizar o Centro ${ID_CentroCusto}, mas sem sucesso.`, 'Falha', 'UPDATE', id_cliente, id_usuario, query, params);
            response.status(400).json("Erro ao atualizar o Produto");
        }
    } catch (error) {
        logQuery('error', ` ${error.message}`, 'erro', 'UPDATE', id_cliente, id_usuario, query, params);
        console.error('Erro ao adicionar Planta:', error.message);
        response.status(500).send('Erro ao adicionar Planta');
    }
}
module.exports = {
    adicionar, listar, atualizar
};
