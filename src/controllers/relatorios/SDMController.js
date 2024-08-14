const sql = require('mssql');
const { logWithOperation } = require('../../middleware/Logger');

async function relatorio(request, response) {
    try {
        const { id_cliente, id_dm, dia ,id_usuario} = request.body;

        if (!id_cliente) {
            return response.status(401).json("ID do cliente não enviado");
        }

        if (!id_dm) {
            return response.status(401).json("ID da DM não enviado");
        }

        const currentDate = dia ? new Date(dia) : new Date();
        const formattedDate = currentDate.toISOString().split('T')[0];

        const query = `
            SELECT * FROM DM_status 
            WHERE ID_DM = @id_dm 
              AND id_cliente = @id_cliente 
              AND CONVERT(date, status_time) = @dia
        `;

        const dbRequest = new sql.Request();
        dbRequest.input('id_cliente', sql.Int, id_cliente);
        dbRequest.input('id_dm', sql.Int, id_dm);
        dbRequest.input('dia', sql.Date, formattedDate);

        const result = await dbRequest.query(query);
       // logWithOperation('info', `O usuario ${id_usuario} Gerou um relatorio`, `sucesso`, 'Relatorio Status DM', id_cliente, id_usuario);
        response.status(200).json(result.recordset);
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
       // logWithOperation('error', `O usuario ${id_usuario} Falhou em gerar um relatorio: ${err.message}`, 'Falha', 'Relatorio Status DM', id_cliente, id_usuario);
        response.status(500).send('Erro ao executar consulta');
    }
}
module.exports = {
    relatorio
 };