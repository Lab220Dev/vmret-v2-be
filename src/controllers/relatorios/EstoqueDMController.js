const sql = require('mssql');

async function listarDM(request, response) {
    try {
        if (!request.body.id_cliente) {
            return response.status(401).json("ID do cliente não enviado");
        }

        let query = 'SELECT ID_DM, Numero FROM DMs WHERE deleted = 0 AND IDcliente = @IDcliente';
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
        const { id_cliente, dms } = request.body;
        if (!id_cliente) {
            return response.status(401).json("ID do cliente não enviado");
        }

        if (!dms) {
            return response.status(401).json("ID_DM não enviado");
        }

        let query = 'SELECT sku, nome, Posicao, quantidade, quantidademinima, capacidade FROM DM_Itens WHERE id_cliente = @id_cliente AND ID_DM = @ID_DM';
        const dbRequest = new sql.Request();
        dbRequest.input('id_cliente', sql.Int, id_cliente);
        dbRequest.input('ID_DM', sql.Int, dms);
        
        const result = await dbRequest.query(query);
        response.status(200).json(result.recordset);
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}
module.exports = {
     relatorio, listarDM
  };