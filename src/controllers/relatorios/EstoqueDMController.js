const sql = require('mssql');
const { logQuery } = require('../../utils/logUtils');
async function listarDM(request, response) {
    try {
        if (!request.body.id_cliente) {
            return response.status(401).json("ID do cliente não enviado");
        }

        let query = 'SELECT ID_DM, Numero FROM DMs WHERE deleted = 0 AND ID_cliente = @IDcliente';
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
        const params = {
            id_cliente: id_cliente,
            ID_DM: id_dm
          };
        let query = 'SELECT sku, nome, Posicao, quantidade, quantidademinima, capacidade FROM DM_Itens WHERE id_cliente = @id_cliente AND ID_DM = @ID_DM';
          console.log('recebido no relatorio:',request.body)
        if (!id_cliente) {
            return response.status(401).json("ID do cliente não enviado");
        }

        if (!id_dm) {
            return response.status(401).json("ID_DM não enviado");
        }

        const dbRequest = new sql.Request();
        dbRequest.input('id_cliente', sql.Int, id_cliente);
        dbRequest.input('ID_DM', sql.Int, id_dm);
        
        const result = await dbRequest.query(query);
        if (result.rowsAffected[0] > 0) {
            logQuery('info', `Usuário ${id_usuario} criou um novo Relatorio de Estoque`, 'sucesso', 'SELECT', id_cliente, id_usuario, query, params);
            response.status(201).send(result.recordset);
          } else {
           // logQuery('error',  `Usuário ${id_usuario} falhou ao criar Centro de Custo`, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
            response.status(400).send('Falha ao criar o Centro de Custo');
          }
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}
module.exports = {
     relatorio, listarDM
  };