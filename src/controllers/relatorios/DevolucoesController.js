const sql = require("mssql"); // Importa a biblioteca mssql para interagir com o banco de dados SQL Server.
const { format } = require("date-fns"); // Importa a função 'format' da biblioteca 'date-fns' para formatar datas.
const { logWithOperation } = require("../../middleware/Logger"); // Importa a função logWithOperation para gerar logs.
const { logQuery } = require("../../utils/logUtils"); // Importa a função logQuery para gerar logs de consultas SQL.

 /**
  * Função para gerar um relatório de devoluções baseado em filtros enviados na requisição.
  * @param {Object} request - O objeto de requisição que contém os filtros e parâmetros do relatório.
  * @param {Object} response - O objeto de resposta para enviar os resultados do relatório ao cliente.
  * @returns {Object} Retorna um relatório filtrado com os dados de devoluções.
  */
async function relatorio(request, response) {
  try {
    // Desestruturação dos parâmetros enviados na requisição.
    const {
      id_dm = "", // ID da DM (opcional).
      id_funcionario = "", // ID do funcionário (opcional).
      data_inicio, // Data de início do filtro (obrigatório se fornecido).
      data_final, // Data final do filtro (obrigatório se fornecido).
      id_cliente, // ID do cliente (obrigatório).
      id_usuario, // ID do usuário que gerou o relatório.
    } = request.body; // Extrai os dados do corpo da requisição.

    // Verifica se o ID do cliente foi fornecido. Caso contrário, retorna erro.
    if (!id_cliente) {
      return response.status(401).json("ID do cliente não enviado");
    }

    // Consulta SQL inicial para buscar os dados de devoluções.
    let query = `
            SELECT  
                dvi.ID_Devolucao_Item,  
                dvi.ID_DM,
                dvi.ID_Cliente,
                dvi.Porta,
                dvi.Dip,
                dvi.Andar,
                dvi.Posicao,
                dvi.Mola,
                dvi.ProdutoID,
                dvi.ProdutoNome,
                dvi.ProdutoSKU,
                dvi.Quantidade,
                dvi.Sincronizado,
                dvi.Retorno,
                dvi.id_funcionario,
                CONVERT(NVARCHAR, dvi.Dia, 120) AS Dia,   
                f.nome, 
                f.matricula, 
                f.email 
            FROM
                DM_Devolucao_Itens dvi  
            LEFT JOIN
                funcionarios f ON dvi.id_funcionario = f.id_funcionario  
            WHERE
                dvi.ID_Cliente = @id_cliente AND dvi.Sincronizado = 1
        `;

    // Inicializa os parâmetros que serão passados para a consulta SQL.
    let params = { id_cliente };

    // Se o ID da DM for fornecido, adiciona o filtro à consulta SQL.
    if (id_dm) {
      query += " AND ID_DM = @id_dm";
      params.id_dm = id_dm; // Adiciona o ID da DM aos parâmetros.
    }
    // Se o ID do funcionário for fornecido, adiciona o filtro à consulta SQL.
    if (id_funcionario) {
      query += " AND dvi.id_funcionario = @id_funcionario";
      params.id_funcionario = id_funcionario; // Adiciona o ID do funcionário aos parâmetros.
    }

    // Se as datas de início e final forem fornecidas, adiciona o filtro de intervalo de datas.
    if (data_inicio && data_final) {
      query += " AND dvi.Dia BETWEEN @data_inicio AND @data_final";
      params.data_inicio = new Date(data_inicio).toISOString(); // Converte a data de início para o formato ISO.
      params.data_final = new Date(data_final).toISOString(); // Converte a data final para o formato ISO.
    } else if (data_inicio) {
      query += " AND dvi.Dia >= @data_inicio";
      params.data_inicio = new Date(data_inicio).toISOString(); // Converte a data de início para o formato ISO.
    } else if (data_final) {
      query += " AND dvi.Dia <= @data_final";
      params.data_final = new Date(data_final).toISOString(); // Converte a data final para o formato ISO.
    }

    // Cria uma nova requisição SQL para executar a consulta.
    request = new sql.Request();
    request.input("id_cliente", sql.Int, id_cliente); // Define o parâmetro id_cliente na requisição.

    // Adiciona os parâmetros opcionais à requisição SQL, se fornecidos.
    if (params.id_dm) request.input("id_dm", sql.Int, id_dm);
    if (params.id_funcionario) request.input("id_funcionario", sql.Int, id_funcionario);
    if (params.data_inicio) request.input("data_inicio", sql.DateTime, params.data_inicio);
    if (params.data_final) request.input("data_final", sql.DateTime, params.data_final);

    // Executa a consulta SQL e aguarda o resultado.
    const result = await request.query(query);

    // Mapeia os resultados da consulta para formatar a data e preparar a resposta.
    const devolucaofiltradas = result.recordset.map((row) => ({
      ID_Devolucao_Item: row.ID_Devolucao_Item, // ID do item de devolução.
      ID_DM: row.ID_DM, // ID da DM.
      ID_Cliente: row.ID_Cliente, // ID do cliente.
      id_funcionario: row.id_funcionario, // ID do funcionário.
      Porta: row.Porta, // Número da porta.
      nome: row.nome, // Nome do funcionário.
      matricula: row.matricula, // Matrícula do funcionário.
      email: row.email, // E-mail do funcionário.
      Dip: row.Dip, // Código DIP.
      Dia:row.Dia, // Formata a data de devolução no formato dd/MM/yyyy - HH:mm.
      Andar: row.Andar, // Andar onde ocorreu a devolução.
      Posicao: row.Posicao, // Posição do item.
      Mola: row.Mola, // Informações sobre a mola.
      ProdutoID: row.ProdutoID, // ID do produto devolvido.
      ProdutoNome: row.ProdutoNome, // Nome do produto devolvido.
      ProdutoSKU: row.ProdutoSKU, // SKU do produto devolvido.
      Quantidade: row.Quantidade, // Quantidade devolvida.
      Retorno: row.Retorno, // Status de retorno da devolução.
    }));

    // Log de sucesso na geração do relatório, comentado por enquanto.
    // logQuery(
    //   "info",
    //   `Usuário ${id_usuario} gerou um relatório de devolução`,
    //   "sucesso",
    //   "Relatório",
    //   id_cliente,
    //   id_usuario,
    //   query,
    //   params
    // );

    // Retorna o relatório filtrado como resposta em formato JSON.
    return response.status(200).json(devolucaofiltradas);
  } catch (error) {
    // Log de falha ao gerar o relatório, comentado por enquanto.
    // logQuery(
    //   "error",
    //   `Erro ao gerar o relatório para o usuário ${id_usuario}: ${error.message}`,
    //   "falha",
    //   "Relatório",
    //   id_cliente,
    //   id_usuario,
    //   query,
    //   {}
    // );

    // Exibe o erro no console caso algo tenha falhado.
    console.error("Erro ao executar consulta:", error.message);

    // Retorna um erro 500 caso algo tenha falhado no processo.
    response.status(500).send("Erro ao executar consulta");
  }
}

// Exporta a função relatorio para ser utilizada em outros arquivos.
module.exports = {
  relatorio,
};