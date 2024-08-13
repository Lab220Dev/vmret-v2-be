const sql = require('mssql');

async function relatorio(request, response) {
    try {
        const { id_cliente, id_dm, id_usuario, id_funcionario, operacao, data_inicio, data_final } = request.body;

        if (!id_cliente) {
            return response.status(401).json("ID do cliente não enviado");
        }
        const queryParts = [];
        const queryParams = {};

        queryParts.push("ID_DM = @id_dm");
        queryParams.id_dm = id_dm;

        queryParts.push("id_cliente = @id_cliente");
        queryParams.id_cliente = id_cliente;

        if (id_funcionario) {
            queryParts.push("id_funcionario = @id_funcionario");
            queryParams.id_funcionario = id_funcionario;
        }

        if (data_inicio && data_final) {
            queryParts.push("CONVERT(date, status_time) BETWEEN @data_inicio AND @data_final");
            queryParams.data_inicio = data_inicio;
            queryParams.data_final = data_final;
        } else if (data_inicio) {
            queryParts.push("CONVERT(date, status_time) >= @data_inicio");
            queryParams.data_inicio = data_inicio;
        } else if (data_final) {
            queryParts.push("CONVERT(date, status_time) <= @data_final");
            queryParams.data_final = data_final;
        }

        const query = `
            SELECT * FROM Log_Web 
            WHERE ${queryParts.join(' AND ')}
        `;

        const dbRequest = new sql.Request();
        for (const param in queryParams) {
            dbRequest.input(param, sql.Date, queryParams[param]);
        }

        const result = await dbRequest.query(query);

        response.status(200).json(result.recordset);
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

module.exports = {
    relatorio
 };