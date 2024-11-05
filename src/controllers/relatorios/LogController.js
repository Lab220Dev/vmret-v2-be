const sql = require('mssql');

async function relatorio(request, response) {
    try {
        const { id_cliente, id_dm, id_usuario, id_funcionario, operacao, data_inicio, data_final } = request.body;

        if (!id_cliente) {
            return response.status(401).json("ID do cliente não enviado");
        }
        let query = `
        SELECT *
        FROM
            Log_Web
        WHERE
            ID_Cliente = @id_cliente
    `;
        let params = { id_cliente };
          if (id_usuario) {
            query += " AND ID_Usuario = @id_usuario";
            params.id_usuario = id_usuario;
          }
          if (operacao) {
            query += " AND Operacao = @operacao";
            params.operacao = operacao;
          }
      
          if (data_inicio && data_final) {
            // Se o usuário enviar data_inicio e data_final
            if (new Date(data_inicio) > new Date(data_final)) {
              return response.status(400).json("A data de início não pode ser posterior à data final");
            }
            query += " AND Dia BETWEEN @data_inicio AND @data_final";
            params.data_inicio = new Date(data_inicio).toISOString();
            params.data_final = new Date(data_final).toISOString();
          } else if (data_inicio) {
            query += " AND Dia >= @data_inicio";
            params.data_inicio = new Date(data_inicio).toISOString();
          } else if (data_final) {
            query += " AND Dia <= @data_final";
            params.data_final = new Date(data_final).toISOString();
          }
        const dbRequest = new sql.Request();
        dbRequest.input("id_cliente", sql.Int, params.id_cliente);
         if (params.id_usuario)  dbRequest.input("id_usuario", sql.Int, params.id_usuario);
         if (params.operacao) dbRequest.input("operacao", sql.VarChar, params.operacao);   
        if (params.data_inicio) dbRequest.input("data_inicio", sql.DateTime, params.data_inicio);
        if (params.data_final) dbRequest.input("data_final", sql.DateTime, params.data_final);

        const result = await dbRequest.query(query);

        response.status(200).json(result.recordset);
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}
async function relatorioMaquina(request, response) {
  try {
      const { id_cliente, id_dm, id_usuario,operacao, id_funcionario, data_inicio, data_final } = request.body;

      if (!id_cliente) {
          return response.status(401).json("ID do cliente não enviado");
      }
      let query = `
      SELECT *
      FROM
          Log_Desk
      WHERE
          ID_Cliente = @id_cliente
  `;
      let params = { id_cliente };
        if (id_dm) {
          query += " AND id_dm = @id_dm";
          params.id_dm = id_dm;
        }
        if (id_usuario) {
          query += " AND ID_Usuario = @id_usuario";
          params.id_usuario = id_usuario;
        }
        if (operacao) {
          query += " AND operacao = @operacao";
          params.operacao = operacao;
        }
        if (id_funcionario) {
          query += " AND id_funcionario = @id_funcionario";
          params.id_funcionario = id_funcionario;
        }
    
        if (data_inicio && data_final) {
          // Se o usuário enviar data_inicio e data_final
          if (new Date(data_inicio) > new Date(data_final)) {
            return response.status(400).json("A data de início não pode ser posterior à data final");
          }
          query += " AND Dia BETWEEN @data_inicio AND @data_final";
          params.data_inicio = new Date(data_inicio).toISOString();
          params.data_final = new Date(data_final).toISOString();
        } else if (data_inicio) {
          query += " AND Dia >= @data_inicio";
          params.data_inicio = new Date(data_inicio).toISOString();
        } else if (data_final) {
          query += " AND Dia <= @data_final";
          params.data_final = new Date(data_final).toISOString();
        }
      const dbRequest = new sql.Request();
      dbRequest.input("id_cliente", sql.Int, params.id_cliente);
       if (params.id_dm)  dbRequest.input("id_dm", sql.Int, params.id_dm);
       if (params.id_usuario) dbRequest.input("id_usuario", sql.VarChar, params.id_usuario);   
       if (params.operacao) dbRequest.input("operacao", sql.VarChar, params.operacao);  
       if (params.id_funcionario) dbRequest.input("id_funcionario", sql.VarChar, params.id_funcionario);   
      if (params.data_inicio) dbRequest.input("data_inicio", sql.DateTime, params.data_inicio);
      if (params.data_final) dbRequest.input("data_final", sql.DateTime, params.data_final);

      const result = await dbRequest.query(query);

      response.status(200).json(result.recordset);
  } catch (error) {
      console.error('Erro ao executar consulta:', error.message);
      response.status(500).send('Erro ao executar consulta');
  }
}
module.exports = {
    relatorio,
    relatorioMaquina
};