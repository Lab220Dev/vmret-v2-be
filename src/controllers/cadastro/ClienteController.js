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
    const { nome, cpfcnpj, ativo, usarapi, textoretirada, id_cliente, id_usuario } = request.body;
    const query = `INSERT INTO clientes (nome, cpfcnpj,ativo,,created,updated,last_login,usar_api,atualizado,textoretirado )
        Values (@nome, @cpfcnpj, @ativo, @created, @updated, @last_login, @usar_api, @atualizado, @textoretirado)`
    const params = {
        nome: nome,
        cpfcnpj: cpfcnpj,
        ativo: ativo,
        created: new Date(),
        updated: new Date(),
        last_login: '1900-01-01 00:00:00.000',
        usar_api: convertToBoolean(usarapi),
        atualizado: false,
        textoretirado: textoretirada
    };
    try {
        if (!id_cliente) {
            response.status(401).json("ID do cliente não enviado");
            return;
        }
        request = new sql.Request();
        request.input('nome', sql.VarChar, nome);
        request.input('cpfcnpj', sql.VarChar, cpfcnpj);
        request.input('ativo', sql.Bit, convertToBoolean(ativo));
        request.input('created', sql.DateTime, new Date());
        request.input('updated', sql.DateTime, new Date());
        request.input('last_login', sql.DateTime, '1900-01-01 00:00:00.000');
        request.input('usar_api', sql.Bit, convertToBoolean(usarapi));
        request.input('atualizado', sql.Bit, false);
        request.input('textoretirado', sql.NVarChar, textoretirada);
        const result = await request.query(query);
        if (result.rowsAffected[0] > 0) {
            //logQuery('info', `Usuário ${id_usuario} criou um novo Centro de Custo`, 'sucesso', 'INSERT', id_cliente, id_usuario, query, params);
            response.status(201).send('Centro de Custo criado com sucesso!');
        } else {
            //logQuery('error', `Usuário ${id_usuario} falhou ao criar Centro de Custo`, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
            response.status(400).send('Falha ao criar o Centro de Custo');
        }
        response.status(400).send("Falha ao criar o usuário!");
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
    const { id_cliente, nome, cpfcnpj, ativo, usarapi, textoretirada } = request.body;
    const params = {
        nome: nome,
        cpfcnpj: cpfcnpj,
        ativo: convertToBoolean(ativo),
        updated: new Date(),
        usar_api: convertToBoolean(usarapi),
        atualizado: true,
        id_cliente: id_cliente,
        textoretirado: textoretirada
    };
    const query = `
    UPDATE clientes
    SET 
        nome = @nome,
        cpfcnpj = @cpfcnpj,
        ativo = @ativo,
        updated = @updated,
        usar_api = @usar_api,
        atualizado = @atualizado,
        textoretirada = @textoretirada
    WHERE id_cliente = @id_cliente`;
    try {
        request = new sql.Request();
        request.input('id_cliente', sql.Int, id_cliente);
        request.input('nome', sql.VarChar, nome);
        request.input('cpfcnpj', sql.VarChar, cpfcnpj);
        request.input('ativo', sql.Bit, convertToBoolean(ativo));
        request.input('updated', sql.DateTime, new Date());
        request.input('usar_api', sql.Bit, convertToBoolean(usarapi));
        request.input('atualizado', sql.Bit, true);
        request.input('textoretirada', sql.NVarChar, textoretirada);
        const result = await request.query(query);
        if (result.rowsAffected && result.rowsAffected[0] > 0) {
            //logQuery('info', `O usuário ${id_usuario} atualizou o Centro de Custo ${ID_CentroCusto}`, 'sucesso', 'UPDATE', id_cliente, id_usuario, query, params);
            response.status(200).json("Cliente atualizado com sucesso");
        } else {
            //logQuery('error', `Usuário ${id_usuario} tentou atualizar o Centro ${ID_CentroCusto}, mas sem sucesso.`, 'Falha', 'UPDATE', id_cliente, id_usuario, query, params);
            response.status(400).json("Erro ao atualizar o Cliente");
        }
    } catch (error) {
        //logQuery('error', ` ${error.message}`, 'erro', 'UPDATE', id_cliente, id_usuario, query, params);
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
            //logQuery('info', `O usuário ${id_usuario} deletou o Centro de Custo ${ID_CentroCusto}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);
            response.status(200).json({ message: "cliente excluído com sucesso" });
        } else {
            //logQuery('error', `Erro ao excluir: ${ID_CentroCusto} não encontrado.`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
            response.status(404).json({ error: "cliente não encontrado" });
        }

    } catch (error) {
        //logQuery('error', `${error.message}`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
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