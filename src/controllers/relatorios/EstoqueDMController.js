const sql = require('mssql');
const { logQuery } = require('../../utils/logUtils');


async function listarDM(request, response) {
    try {
        if (!request.body.id_cliente) {
            return response.status(401).json("ID do cliente não enviado");
        }

        let query = 'SELECT ID_DM, Identificacao FROM DMs WHERE deleted = 0 AND ID_cliente = @IDcliente';
        const dbRequest = new sql.Request();
        dbRequest.input('IDcliente', sql.Int, request.body.id_cliente);
        
        const result = await dbRequest.query(query);
        response.status(200).json(result.recordset);
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

async function relatorio(request, response) {
    try {
        const { id_cliente, id_dm, id_usuario } = request.body;

        if (!id_cliente) {
            return response.status(401).json("ID do cliente não enviado");
        }

        let query;
        const dbRequest = new sql.Request();
        dbRequest.input('id_cliente', sql.Int, id_cliente);

        if (id_dm === null) {
            query = 'SELECT sku, nome, Posicao, quantidade, quantidademinima, capacidade FROM DM_Itens WHERE id_cliente = @id_cliente';
        } else {
            query = 'SELECT sku, nome, Posicao, quantidade, quantidademinima, capacidade FROM DM_Itens WHERE id_cliente = @id_cliente AND ID_DM = @ID_DM';
            dbRequest.input('ID_DM', sql.Int, id_dm);
        }

        const result = await dbRequest.query(query);
        if (result.rowsAffected[0] > 0) {
            response.status(200).send(result.recordset);
        } else {
            response.status(200).send([]); 
        }
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

module.exports = {
     relatorio, listarDM
  };