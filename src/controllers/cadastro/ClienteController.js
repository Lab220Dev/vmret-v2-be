const sql = require('mssql');

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
    try {
        const { nome, cpfcnpj, ativo, usarapi, textoretirada } = request.body;
        const query = `INSERT INTO clientes (nome, cpfcnpj,ativo,,created,updated,last_login,usar_api,atualizado,textoretirado )
        Values (@nome, @cpfcnpj, @ativo, @created, @updated, @last_login, @usar_api, @atualizado, @textoretirado)`
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
        if (result) {
            response.status(201).send("Cliente criado com sucesso!");
            return
        }
        response.status(400).send("Falha ao criar o usuário!");
    } catch (error) {
        console.error('Erro ao inserir o usuário:', error.message);
        response.status(500).send('Erro ao inserir o usuário');
    }
}
async function atualizar(request, response) {
    try {
        const { id_cliente, nome, cpfcnpj, ativo, usarapi, textoretirada } = request.body;
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
        WHERE id_cliente = @id_cliente
    `; request = new sql.Request();
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
            response.status(200).json("Cliente atualizado com sucesso");
        } else {
            response.status(400).json("Erro ao atualizar o Cliente");
        }
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}
async function deletar(request, response) {
    try {
        const { id_cliente } = request.body;

        if (!id_cliente) {
            return response.status(400).json({ error: "ID do cliente não foi enviado" });
        }

        const query = "UPDATE clientes SET deleted = 1 WHERE id_cliente = @id_cliente";
        const sqlRequest = new sql.Request();
        sqlRequest.input('id_cliente', sql.Int, id_cliente);

        const result = await sqlRequest.query(query);
        
        if (result.rowsAffected[0] > 0) {
            response.status(200).json({ message: "cliente excluído com sucesso" });
        } else {
            response.status(404).json({ error: "cliente não encontrado" });
        }

    } catch (error) {
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