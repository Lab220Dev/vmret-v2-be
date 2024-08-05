const sql = require('mssql');


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
    try {
        const { codigo, nome, userid = '', senha = '', urlapi = '',
            clienteid = '' } = request.body;
        const id_cliente = request.body.id_cliente;
        const query = `INSERT INTO plantas (id_cliente, codigo, nome,
         userID, senha, urlapi, clienteid )
         VALUES (@id_cliente, @codigo, @nome, @userid, @senha,
          @urlapi, @clienteid)`;
        request = new sql.Request();
        request.input('id_cliente', sql.Int, id_cliente);
        request.input('codigo', sql.NVarChar, codigo);
        request.input('nome', sql.VarChar, nome);
        request.input('userid', sql.NVarChar, userid);
        request.input('senha', sql.NVarChar, senha);
        request.input('urlapi', sql.NVarChar, urlapi);
        request.input('clienteid', sql.NVarChar, clienteid);
        const result = await request.query(query);
        if (result) {
            response.status(201).send('Planta criada com sucesso!');
            return;
        }
    } catch (error) {
        console.error('Erro ao adicionar Planta:', error.message);
        response.status(500).send('Erro ao adicionar Planta');
    }
}
async function atualizar(request, response) {
    try {
        const { codigo, nome, userid, senha, urlapi,
            clienteid,id_planta } = request.body;
        const id_cliente = request.body.id_cliente;
        const query = `UPDATE plantas 
        SET id_cliente = @id_cliente,
        codigo = @codigo,
        nome = @nome,
        userid = @userid,
        senha = @senha,
        urlapi = @urlapi,
        clienteid = @clienteid
        WHERE id_planta = @id_planta`;
        request = new sql.Request();
        request.input('id_cliente', sql.Int, id_cliente);
        request.input('codigo', sql.NVarChar, codigo);
        request.input('nome', sql.VarChar, nome);
        request.input('userid', sql.NVarChar, userid);
        request.input('senha', sql.NVarChar, senha);
        request.input('urlapi', sql.NVarChar, urlapi);
        request.input('clienteid', sql.NVarChar, clienteid);
        request.input('id_planta', sql.NVarChar, id_planta);
        const result = await request.query(query);
        if (result.rowsAffected && result.rowsAffected[0] > 0) {
            response.status(200).json("Produto atualizado com sucesso");
        } else {
            response.status(400).json("Erro ao atualizar o Produto");
        }
    } catch (error) {
        console.error('Erro ao adicionar Planta:', error.message);
        response.status(500).send('Erro ao adicionar Planta');
    }
}
module.exports = {
    adicionar, listar, atualizar
};
