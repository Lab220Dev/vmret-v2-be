const sql = require("mssql"); // Importa o módulo 'mssql' para interagir com o banco de dados SQL Server.
const { logQuery } = require("../../utils/logUtils"); // Importa a função 'logQuery' para registrar logs de consulta.

 /**
 * Função para gerar um relatório de retiradas avulsas de DM para um cliente.
 * @param {Object} request - O objeto de requisição que contém os parâmetros do relatório no corpo da requisição.
 * @param {Object} response - O objeto de resposta usado para retornar os dados ao cliente.
 * @returns {void} Retorna os dados filtrados no formato JSON ou uma mensagem de erro.
 */
async function relatorio(request, response) {
  try {
    // Extrai os parâmetros do corpo da requisição.
    const {
      id_dm = "",         // ID da DM (pode ser opcional)
      id_setor = "",      // ID do setor (pode ser opcional)
      id_planta = "",     // ID da planta (pode ser opcional)
      id_funcionario = "",// ID do funcionário (pode ser opcional)
      data_inicio,        // Data de início do filtro
      data_final,         // Data final do filtro
      id_cliente,         // ID do cliente (obrigatório)
      id_usuario,         // ID do usuário que gerou a requisição (para log)
    } = request.body;

    // Verifica se o id_cliente foi fornecido.
    if (!id_cliente) {
      // Caso o id_cliente não seja enviado, retorna um erro 401 (Unauthorized).
      return response.status(401).json("ID do cliente não enviado");
    }

    // Define a consulta SQL básica, com os filtros necessários para a consulta.
    let query = `
            SELECT  
                r.ID_DM AS DM,                       
                r.Dia AS Data,                        
                f.matricula AS Matricula,             
                r.Autenticacao AS Voucher,            
                f.nome AS Nome,                       
                f.email AS Email,                     
                CONCAT(p.codigo, '/', p.ca) AS CodigoCa,  
                ri.ProdutoNome AS Item                
            FROM
                DM_Retiradas r
            INNER JOIN
                DM_Retirada_itens ri ON r.ID_DM_Retirada = ri.id_retirada  
            LEFT JOIN
                funcionarios f ON r.ID_Funcionario = f.id_funcionario       
            LEFT JOIN
                produtos p ON ri.ProdutoID = p.id_produto                   
            WHERE
                r.ID_Cliente = @id_cliente                                     
                AND r.Forma_Autenticacao = 'Avulsa'                           
        `;

    // Inicializa o objeto de parâmetros para a consulta.
    let params = { id_cliente };

    // Se o id_dm for fornecido, adiciona o filtro correspondente à consulta.
    if (id_dm) {
      query += " AND r.ID_DM = @id_dm";   // Adiciona o filtro de ID da DM
      params.id_dm = id_dm;               // Adiciona o parâmetro id_dm aos parâmetros
    }

    // Se o id_setor for fornecido, adiciona o filtro correspondente à consulta.
    if (id_setor) {
      query += " AND r.ID_Setor = @id_setor"; // Adiciona o filtro de ID do setor
      params.id_setor = id_setor;             // Adiciona o parâmetro id_setor aos parâmetros
    }

    // Se o id_planta for fornecido, adiciona o filtro correspondente à consulta.
    if (id_planta) {
      query += " AND r.ID_Planta = @id_planta"; // Adiciona o filtro de ID da planta
      params.id_planta = id_planta;             // Adiciona o parâmetro id_planta aos parâmetros
    }

    // Se o id_funcionario for fornecido, adiciona o filtro correspondente à consulta.
    if (id_funcionario) {
      query += " AND r.ID_Funcionario = @id_funcionario"; // Adiciona o filtro de ID do funcionário
      params.id_funcionario = id_funcionario;           // Adiciona o parâmetro id_funcionario aos parâmetros
    }

    // Se as datas de início e final forem fornecidas, adiciona os filtros de intervalo de datas.
    if (data_inicio && data_final) {
      query += " AND r.Dia BETWEEN @data_inicio AND @data_final"; // Adiciona o filtro de intervalo de datas
      params.data_inicio = new Date(data_inicio).toISOString();  // Converte data_inicio para formato ISO
      params.data_final = new Date(data_final).toISOString();    // Converte data_final para formato ISO
    } else if (data_inicio) {
      query += " AND r.Dia >= @data_inicio";  // Adiciona o filtro de data de início
      params.data_inicio = new Date(data_inicio).toISOString();  // Converte data_inicio para formato ISO
    } else if (data_final) {
      query += " AND r.Dia <= @data_final";  // Adiciona o filtro de data final
      params.data_final = new Date(data_final).toISOString();    // Converte data_final para formato ISO
    }

    // Cria uma nova requisição para o banco de dados SQL.
    request = new sql.Request();
    
    // Adiciona os parâmetros à requisição SQL.
    request.input("id_cliente", sql.Int, params.id_cliente); // Adiciona o parâmetro id_cliente
    if (params.id_dm) request.input("id_dm", sql.VarChar, params.id_dm.toString()); // Adiciona o parâmetro id_dm se existir
    if (params.id_setor) request.input("id_setor", sql.VarChar, params.id_setor); // Adiciona o parâmetro id_setor se existir
    if (params.id_planta) request.input("id_planta", sql.VarChar, params.id_planta); // Adiciona o parâmetro id_planta se existir
    if (params.id_funcionario) request.input("id_funcionario", sql.VarChar, params.id_funcionario); // Adiciona o parâmetro id_funcionario se existir
    if (params.data_inicio) request.input("data_inicio", sql.DateTime, params.data_inicio); // Adiciona o parâmetro data_inicio se existir
    if (params.data_final) request.input("data_final", sql.DateTime, params.data_final); // Adiciona o parâmetro data_final se existir

    // Executa a consulta SQL no banco de dados.
    const result = await request.query(query);

    // Processa os resultados para formatá-los de acordo com as necessidades do frontend.
    const retiradasfiltradas = result.recordset.map((row) => ({
      DM: row.DM,                               // ID da DM
      Data: format(new Date(row.Data), "dd/MM/yyyy - HH:mm"), // Formata a data no formato "dd/MM/yyyy - HH:mm"
      Matricula: row.Matricula,                 // Matrícula do funcionário
      Voucher: row.Voucher,                     // Voucher associado à retirada
      Nome: row.Nome,                           // Nome do funcionário
      Email: row.Email,                         // Email do funcionário
      CodigoCa: row.CodigoCa,                   // Código CA do produto
      Item: row.Item,                           // Nome do item retirado
    }));

    // Log de sucesso na geração do relatório.
    logQuery(
      "info", // Tipo de log
      `Usuário ${id_usuario} gerou um relatório de retiradas avulsas`, // Mensagem do log
      "sucesso", // Status do log
      "Relatório", // Tipo de operação
      id_cliente, // ID do cliente
      id_usuario, // ID do usuário que gerou a requisição
      query, // Consulta executada
      params // Parâmetros utilizados na consulta
    );

    // Retorna os dados formatados para o cliente com status 200 (OK).
    return response.status(200).json(retiradasfiltradas);

  } catch (error) {
    // Log de falha ao gerar o relatório.
    logQuery(
      "error", // Tipo de log
      `Erro ao gerar o relatório para o usuário ${id_usuario}: ${error.message}`, // Mensagem de erro no log
      "falha", // Status do log
      "Relatório", // Tipo de operação
      id_cliente, // ID do cliente
      id_usuario, // ID do usuário que gerou a requisição
      query, // Consulta executada
      {} // Parâmetros da consulta (vazio em caso de erro)
    );

    // Exibe o erro no console para depuração.
    console.error("Erro ao executar consulta:", error.message);

    // Retorna um erro 500 (Internal Server Error) ao cliente caso algo dê errado.
    response.status(500).send("Erro ao executar consulta");
  }
}

module.exports = {
  relatorio, // Exporta a função relatorio para ser utilizada em outras partes do código
};
