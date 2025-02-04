const sql = require("mssql"); // Importa o módulo mssql para realizar consultas SQL no banco de dados.

/**
 * Função responsável por gerar o relatório com base nas informações de log.
 *
 * @param {Object} request - O objeto de requisição HTTP, contendo os parâmetros da consulta.
 * @param {Object} response - O objeto de resposta HTTP, utilizado para retornar os resultados ou erros.
 * @returns {Promise<void>} - Retorna a resposta com os dados da consulta ou um erro.
 */
async function relatorio(request, response) {
  try {
    // Desestruturação dos parâmetros enviados no corpo da requisição
    const {
      id_cliente,
      id_dm,
      id_usuario,
      id_funcionario,
      operacao,
      data_inicio,
      data_final,
    } = request.body;

    // Verifica se o ID do cliente foi enviado na requisição
    if (!id_cliente) {
      // Se não foi enviado o ID do cliente, retorna status 401 com a mensagem de erro
      return response.status(401).json("ID do cliente não enviado");
    }

    // Inicia a construção da consulta SQL básica para buscar dados na tabela Log_Web
    let query = `
        SELECT 
          ID,
          ID_Cliente,
          ID_Usuario,
          Operacao,
          Log_Web,
          Log_String,
          Resultado,
          CONVERT(NVARCHAR, Dia, 120) AS Dia,
        FROM
            Log_Web
        WHERE
            ID_Cliente = @id_cliente
    `;
    let params = { id_cliente }; // Inicializa o objeto de parâmetros para a consulta SQL

    // Verifica se o ID do usuário foi fornecido e adiciona à query
    if (id_usuario) {
      query += " AND ID_Usuario = @id_usuario"; // Filtra a consulta pelo ID do usuário
      params.id_usuario = id_usuario; // Adiciona o ID do usuário aos parâmetros
    }

    // Verifica se a operação foi fornecida e adiciona à query
    if (operacao) {
      query += " AND Operacao = @operacao"; // Filtra a consulta pela operação
      params.operacao = operacao; // Adiciona a operação aos parâmetros
    }

    // Verifica se as datas de início e fim foram fornecidas
    if (data_inicio && data_final) {
      // Se a data de início for posterior à data final, retorna erro 400
      if (new Date(data_inicio) > new Date(data_final)) {
        return response
          .status(400)
          .json("A data de início não pode ser posterior à data final");
      }
      // Adiciona a condição de filtro para o intervalo de datas
      query += " AND Dia BETWEEN @data_inicio AND @data_final";
      // Converte as datas para o formato ISO e as adiciona aos parâmetros
      params.data_inicio = new Date(data_inicio).toISOString();
      params.data_final = new Date(data_final).toISOString();
    } else if (data_inicio) {
      // Se somente a data de início for fornecida, filtra a consulta para valores maiores ou iguais a essa data
      query += " AND Dia >= @data_inicio";
      params.data_inicio = new Date(data_inicio).toISOString(); // Converte a data de início para ISO
    } else if (data_final) {
      // Se somente a data final for fornecida, filtra a consulta para valores menores ou iguais a essa data
      query += " AND Dia <= @data_final";
      params.data_final = new Date(data_final).toISOString(); // Converte a data final para ISO
    }

    // Cria um objeto de requisição SQL
    const dbRequest = new sql.Request();

    // Define os parâmetros de entrada para a consulta SQL
    dbRequest.input("id_cliente", sql.Int, params.id_cliente); // Define o parâmetro ID_Cliente
    if (params.id_usuario)
      dbRequest.input("id_usuario", sql.Int, params.id_usuario); // Define o parâmetro ID_Usuario se estiver presente
    if (params.operacao)
      dbRequest.input("operacao", sql.VarChar, params.operacao); // Define o parâmetro Operacao se estiver presente
    if (params.data_inicio)
      dbRequest.input("data_inicio", sql.DateTime, params.data_inicio); // Define o parâmetro Data_Inicio se estiver presente
    if (params.data_final)
      dbRequest.input("data_final", sql.DateTime, params.data_final); // Define o parâmetro Data_Final se estiver presente

    // Executa a consulta SQL
    const result = await dbRequest.query(query);

    // Retorna os resultados da consulta no formato JSON com status 200
    response.status(200).json(result.recordset);
  } catch (error) {
    // Log de erro em caso de falha na execução da consulta
    console.error("Erro ao executar consulta:", error.message);
    // Retorna status 500 com a mensagem de erro
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função responsável por gerar o relatório de logs da máquina, com base nas informações de log.
 *
 * @param {Object} request - O objeto de requisição HTTP, contendo os parâmetros da consulta.
 * @param {Object} response - O objeto de resposta HTTP, utilizado para retornar os resultados ou erros.
 * @returns {Promise<void>} - Retorna a resposta com os dados da consulta ou um erro.
 */
async function relatorioMaquina(request, response) {
  try {
    // Desestruturação dos parâmetros recebidos na requisição
    const {
      id_cliente,
      id_dm,
      id_usuario,
      operacao,
      id_funcionario,
      data_inicio,
      data_final,
    } = request.body;

    // Inicia a construção da consulta SQL básica para buscar dados na tabela Log_Desk
    let query = `
      SELECT 
      ID,
      id_cliente,
      ID_DM,
      DM_Log,
      CONVERT( NVARCHAR, Dia, 120) AS Dia,
      Log_String,
      Resultado,
      Operacao,
      Sincronizado
      FROM
          DM_Log_Desk
      WHERE
          1 = 1
  `;
    let params = {}; // Inicializa o objeto de parâmetros para a consulta SQL

    // Verifica se o ID do Cliente foi fornecido e adiciona à consulta
    if (id_cliente) {
      query += " AND ID_Cliente = @id_cliente"; // Filtra a consulta pelo ID do cliente
      params.id_cliente = id_cliente; // Adiciona o ID do DM aos parâmetros
    }

    // Verifica se o ID do DM foi fornecido e adiciona à consulta
    if (id_dm) {
      query += " AND ID_DM = @id_dm"; // Filtra a consulta pelo ID do DM
      params.id_dm = id_dm; // Adiciona o ID do DM aos parâmetros
    }

    // Verifica se o ID do usuário foi fornecido e adiciona à consulta
    if (id_usuario) {
      query += " AND ID_Usuario_Desk = @id_usuario"; // Filtra a consulta pelo ID do usuário
      params.id_usuario = id_usuario; // Adiciona o ID do usuário aos parâmetros
    }

    // Verifica se a operação foi fornecida e adiciona à consulta
    if (operacao) {
      query += " AND Operacao = @operacao"; // Filtra a consulta pela operação
      params.operacao = operacao; // Adiciona a operação aos parâmetros
    }

    // Verifica se o ID do funcionário foi fornecido e adiciona à consulta
    if (id_funcionario) {
      query += " AND ID_Funcionario = @id_funcionario"; // Filtra a consulta pelo ID do funcionário
      params.id_funcionario = id_funcionario; // Adiciona o ID do funcionário aos parâmetros
    }

    // Verifica se as datas de início e fim foram fornecidas
    if (data_inicio && data_final) {
      // Se a data de início for posterior à data final, retorna erro 400
      if (new Date(data_inicio) > new Date(data_final)) {
        return response
          .status(400)
          .json("A data de início não pode ser posterior à data final");
      }
      // Adiciona a condição de filtro para o intervalo de datas
      query += " AND Dia BETWEEN @data_inicio AND @data_final";
      // Converte as datas para o formato ISO e as adiciona aos parâmetros
      params.data_inicio = new Date(data_inicio).toISOString();
      params.data_final = new Date(data_final).toISOString();
    } else if (data_inicio) {
      // Se somente a data de início for fornecida, filtra a consulta para valores maiores ou iguais a essa data
      query += " AND Dia >= @data_inicio";
      params.data_inicio = new Date(data_inicio).toISOString(); // Converte a data de início para ISO
    } else if (data_final) {
      // Se somente a data final for fornecida, filtra a consulta para valores menores ou iguais a essa data
      query += " AND Dia <= @data_final";
      params.data_final = new Date(data_final).toISOString(); // Converte a data final para ISO
    }

    // Cria um objeto de requisição SQL
    const dbRequest = new sql.Request();

    // Define os parâmetros de entrada para a consulta SQL
    if (params.id_cliente) dbRequest.input("id_cliente", sql.Int, params.id_cliente); // Define o parâmetro ID_Cliente
    if (params.id_dm) dbRequest.input("id_dm", sql.Int, params.id_dm); // Define o parâmetro ID_DM se estiver presente
    if (params.id_usuario)
      dbRequest.input("id_usuario", sql.Int, params.id_usuario); // Define o parâmetro ID_Usuario se estiver presente
    if (params.operacao)
      dbRequest.input("operacao", sql.VarChar, params.operacao); // Define o parâmetro Operacao se estiver presente
    if (params.id_funcionario)
      dbRequest.input("id_funcionario", sql.VarChar, params.id_funcionario); // Define o parâmetro ID_Funcionario se estiver presente
    if (params.data_inicio)
      dbRequest.input("data_inicio", sql.DateTime, params.data_inicio); // Define o parâmetro Data_Inicio se estiver presente
    if (params.data_final)
      dbRequest.input("data_final", sql.DateTime, params.data_final); // Define o parâmetro Data_Final se estiver presente

    // Executa a consulta SQL
    const result = await dbRequest.query(query);

    // Retorna os resultados da consulta no formato JSON com status 200
    response.status(200).json(result.recordset);
    console.log(result.recordset);
  } catch (error) {
    // Log de erro em caso de falha na execução da consulta
    console.error("Erro ao executar consulta:", error.message);
    // Retorna status 500 com a mensagem de erro
    response.status(500).send("Erro ao executar consulta");
  }
}

module.exports = {
  relatorio, // Exporta a função relatorio
  relatorioMaquina, // Exporta a função relatorioMaquina
};
