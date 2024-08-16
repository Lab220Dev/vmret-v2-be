const sql = require('mssql');
const { logQuery } = require('../../utils/logUtils');
const convertToBoolean = (value) => {
    return value === 'true';
};
async function listar(request, response) {
    try {
        const query = 'SELECT * FROM clientes WHERE deleted = 0';
        const result = await new sql.Request().query(query);
        response.status(200).json(result.recordset);
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}
async function adicionar(request, response) {
    const { nome, cpfcnpj, ativo, usar_api, id_usuario } = request.body;
    const query = `INSERT INTO clientes (id_cliente, nome, cpfcnpj, ativo, deleted, created, updated, last_login, usar_api, atualizado)
VALUES (@id_cliente, @nome, @cpfcnpj, @ativo, @deleted, @created, @updated, @last_login, @usar_api, @atualizado)`;
    
    try {
        const sqlRequest = new sql.Request();
        
        // Recupera o maior valor de id_cliente na tabela
        const resultId = await sqlRequest.query(`SELECT ISNULL(MAX(id_cliente), 0) AS lastId FROM clientes`);
        const lastId = resultId.recordset[0].lastId;
        const newIdCliente = lastId + 1;
        const params = {
            id_cliente: newIdCliente,
            nome: nome,
            cpfcnpj: cpfcnpj,
            ativo: ativo,
            created: new Date(),
            updated: new Date(),
            last_login: '1900-01-01 00:00:00.000',
            usar_api: convertToBoolean(usar_api),
            atualizado: false
        };
        request = new sql.Request();
        request.input('id_cliente', sql.Int, newIdCliente);
        request.input('nome', sql.VarChar, nome);
        request.input('cpfcnpj', sql.VarChar, cpfcnpj);
        request.input('ativo', sql.Bit, ativo);
        request.input('deleted', sql.Bit, false);
        request.input('created', sql.DateTime, new Date());
        request.input('updated', sql.DateTime, new Date());
        request.input('last_login', sql.DateTime, '1900-01-01 00:00:00.000');
        request.input('usar_api', sql.Bit, usar_api);
        request.input('atualizado', sql.Bit, false);
        const result = await request.query(query);
        if (result.rowsAffected[0] > 0) {
            logQuery('info', `Usuário ${id_usuario} criou um novo Cliente`, 'sucesso', 'INSERT', newIdCliente, id_usuario, query, params);
            response.status(201).send('Cliente criado com sucesso!');
        } else {
            logQuery('error',  `Usuário ${id_usuario} falhou em criar um novo Cliente`, 'erro', 'INSERT', newIdCliente, id_usuario, query, params);
            response.status(400).send('Falha ao criar Novo Cliente');
        }
    } catch (error) {
        const errorMessage = error.message.includes('Query não fornecida para logging')
            ? 'Erro crítico: Falha na operação'
            : `Erro ao adicionar Centro de Custo: ${error.message}`;
        //logQuery('error', errorMessage, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
        console.error('Erro ao inserir o usuário:', error.message);
        response.status(500).send('Erro ao inserir o usuário');
    }
}
async function atualizar(request, response) {
    const { id_cliente, nome, cpfcnpj, ativo, usarapi,id_usuario } = request.body;
    const params = {
        nome: nome,
        cpfcnpj: cpfcnpj,
        ativo: convertToBoolean(ativo),
        updated: new Date(),
        usar_api: convertToBoolean(usarapi),
        atualizado: true,
        id_cliente: id_cliente
    };
    const query = `
    UPDATE clientes
    SET 
        nome = @nome,
        cpfcnpj = @cpfcnpj,
        ativo = @ativo,
        updated = @updated,
        usar_api = @usar_api,
        atualizado = @atualizado
    WHERE id_cliente = @id_cliente`;
    try {
        request = new sql.Request();
        request.input('id_cliente', sql.Int, id_cliente);
        request.input('nome', sql.VarChar, nome);
        request.input('cpfcnpj', sql.VarChar, cpfcnpj);
        request.input('ativo', sql.Bit, (ativo));
        request.input('updated', sql.DateTime, new Date());
        request.input('usar_api', sql.Bit, (usarapi));
        request.input('atualizado', sql.Bit, true);
        const result = await request.query(query);
        if (result.rowsAffected && result.rowsAffected[0] > 0) {
            logQuery('info', `O usuário ${id_usuario} atualizou o cliente:${id_cliente}`, 'sucesso', 'UPDATE', id_cliente, id_usuario, query, params);
            response.status(200).json("Cliente atualizado com sucesso");
        } else {
            logQuery('error',`O usuário ${id_usuario} falhou em atualizar o cliente:${id_cliente}`, 'falha', 'UPDATE', id_cliente, id_usuario, query, params);
        }
    } catch (error) {
        logQuery('error', error.message, 'falha', 'UPDATE', id_cliente, id_usuario, query, params);
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}
async function deletar(request, response) {
    const { id_cliente, id_usuario } = request.body;
    const query = "UPDATE clientes SET deleted = 1 WHERE id_cliente = @id_cliente";
    const params = {
        id_cliente: id_cliente
    };
    try {

        if (!id_cliente) {
            return response.status(400).json({ error: "ID do cliente não foi enviado" });
        }

        const sqlRequest = new sql.Request();
        sqlRequest.input('id_cliente', sql.Int, id_cliente);

        const result = await sqlRequest.query(query);

        if (result.rowsAffected[0] > 0) {
            logQuery('info', `O usuário ${id_usuario} deletou o cliente ${id_cliente}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);
            response.status(200).json({ message: "cliente excluído com sucesso" });
        } else {
            logQuery('error', `O usuário ${id_usuario} falhou em deletar o cliente ${id_cliente}`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
            response.status(404).json({ error: "cliente não encontrado" });
        }

    } catch (error) {
        logQuery('error',error.message , 'erro', 'DELETE', id_cliente, id_usuario, query, params);
        console.error('Erro ao excluir:', error.message);
        response.status(500).send('Erro ao excluir');
    }
}



module.exports = {
    listar,
    atualizar,
    deletar,
    adicionar,
};