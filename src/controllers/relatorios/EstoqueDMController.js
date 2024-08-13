const sql = require('mssql');
const { logQuery } = require('../../utils/logUtils');
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
        const { id_cliente, dms, id_usuario } = request.body;
        const params = {
            id_cliente: id_cliente,
            ID_DM: dms
          };
        let query = 'SELECT sku, nome, Posicao, quantidade, quantidademinima, capacidade FROM DM_Itens WHERE id_cliente = @id_cliente AND ID_DM = @ID_DM';

        if (!id_cliente) {
            return response.status(401).json("ID do cliente não enviado");
        }

        if (!dms) {
            return response.status(401).json("ID_DM não enviado");
        }

        const dbRequest = new sql.Request();
        dbRequest.input('id_cliente', sql.Int, id_cliente);
        dbRequest.input('ID_DM', sql.Int, dms);
        
        const result = await dbRequest.query(query);
        if (result.rowsAffected[0] > 0) {
            logQuery('info', `Usuário ${id_usuario} criou um novo Centro de Custo`, 'sucesso', 'INSERT', id_cliente, id_usuario, query, params);
            response.status(201).send('Centro de Custo criado com sucesso!');
          } else {
            logQuery('error',  `Usuário ${id_usuario} falhou ao criar Centro de Custo`, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
            response.status(400).send('Falha ao criar o Centro de Custo');
          }
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        logWithOperation('error', `O usuario ${id_usuario} Falhou em gerar um relatorio: ${err.message}`, 'Falha', 'Relatorio Estoque DM', id_cliente, id_usuario);
        response.status(500).send('Erro ao executar consulta');
    }
}
module.exports = {
     relatorio, listarDM
  };