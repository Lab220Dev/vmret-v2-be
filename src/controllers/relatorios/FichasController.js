const sql = require("mssql"); // Importa o módulo 'mssql' para interagir com o banco de dados SQL Server.
const { format } = require("date-fns"); // Importa a função 'format' do 'date-fns' para formatar datas.
const { logQuery } = require("../../utils/logUtils"); // Importa a função 'logQuery' para registrar logs de consultas SQL.

// Função assíncrona para criar e retornar um novo objeto de requisição SQL.
async function criarRequest() {
  return new sql.Request(); // Retorna uma nova instância de 'sql.Request' para fazer consultas no banco de dados.
}

/**
 * Função que recupera o texto da ficha de retirada do cliente.
 * @param {Object} request - O objeto de requisição contendo os parâmetros para a consulta.
 * @param {Object} response - O objeto de resposta para retornar os resultados ao cliente.
 * @returns {void} Envia a resposta ao cliente com o texto da ficha ou um erro caso não seja encontrado.
 */
async function textoFicha(request, response) {
  try {
    const id_cliente = request.body.id_cliente; // Obtém o ID do cliente da requisição.

    // Verifica se o ID do cliente foi enviado. Caso contrário, retorna erro 401.
    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado"); // Retorna erro 401 se o ID do cliente não for enviado.
      return; // Sai da função.
    }

    // Consulta SQL para obter o texto da ficha de retirada do cliente.
    const query =
      "SELECT Texto FROM Ficha_Retirada WHERE id_cliente = @id_cliente";

    const requestSql = new sql.Request(); // Cria uma nova requisição SQL.
    requestSql.input("id_cliente", sql.Int, id_cliente); // Define o parâmetro 'id_cliente' para a consulta SQL.

    // Executa a consulta SQL.
    const result = await requestSql.query(query);

    // Verifica se algum resultado foi retornado.
    if (result.recordset.length > 0) {
      response.status(200).json(result.recordset); // Retorna o texto encontrado com status 200.
    } else {
      response.status(404).json("Texto não encontrado"); // Se nenhum texto for encontrado, retorna erro 404.
    }
  } catch (error) {
    // Caso ocorra algum erro durante a execução da consulta, captura o erro e retorna erro 500.
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta"); // Retorna erro 500.
  }
}

/**
 * Função para gerar um relatório de retiradas de produtos de DM com base nos filtros fornecidos.
 * @param {Object} request - O objeto de requisição contendo os filtros para a consulta.
 * @param {Object} response - O objeto de resposta para retornar os resultados ao cliente.
 * @returns {void} Envia a resposta com os dados do relatório ou um erro caso não seja encontrado.
 */
async function relatorio(request, response) {
  try {
    // Desestruturação dos parâmetros recebidos na requisição.
    const {
      id_dm = "",
      id_funcionario,
      data_inicio,
      data_final,
      id_cliente,
    } = request.body;

    // Verifica se o ID do cliente foi enviado. Caso contrário, retorna erro 400.
    if (!id_cliente) {
      return response.status(400).json("ID do cliente não enviado"); // Retorna erro 400 caso o ID do cliente não seja enviado.
    }

    // Inicia a consulta SQL básica para buscar as retiradas de produtos.
    let query1 = `
       SELECT
    ri.ProdutoID,
    ri.ProdutoNome,
    ri.ProdutoSKU,
    p.unidade_medida,
    r.Forma_Autenticacao,
    ri.Quantidade,
    CONVERT( NVARCHAR,r.Dia,120) AS Dia,
    r.id_dm,
    p.id_tipoProduto,
    p.marca,
    p.modelo,
    p.Descricao AS ProdutoDescricao 
FROM
    DM_Retiradas r
INNER JOIN
    DM_Retirada_itens ri ON r.ID_DM_Retirada = ri.id_retirada  AND r.ID_DM = ri.ID_DM
LEFT JOIN
    Produtos p ON ri.ProdutoID = p.ID_Produto
LEFT JOIN
    funcionarios f ON r.ID_Funcionario = f.id_funcionario
WHERE
    r.ID_Cliente = @id_cliente
    `;

    const params = { id_cliente }; // Cria um objeto com o parâmetro 'id_cliente'.

    // Se 'id_funcionario' foi fornecido, adiciona o filtro para 'ID_Funcionario'.
    if (id_funcionario) {
      query1 += " AND r.ID_Funcionario = @id_funcionario"; // Adiciona o filtro para 'ID_Funcionario'.
      params.id_funcionario = id_funcionario; // Adiciona o valor de 'id_funcionario' aos parâmetros.
    }

    // Se 'data_inicio' e 'data_final' foram fornecidos, valida as datas e adiciona os filtros para o intervalo de datas.
    if (data_inicio && data_final) {
      if (new Date(data_inicio) > new Date(data_final)) {
        return response
          .status(400)
          .json("A data de início não pode ser posterior à data final"); // Retorna erro 400 se a data de início for posterior à data final.
      }
      const startDate = new Date(data_inicio);
      startDate.setHours(0, 0, 0, 0); // Define hora como 00:00:00

      const endDate = new Date(data_final);
      endDate.setHours(23, 59, 59, 999); // Define hora como 23:59:59.999

      query1 += " AND r.Dia BETWEEN @data_inicio AND @data_final"; // Filtro de intervalo de datas.
      params.data_inicio = startDate.toISOString(); // Adiciona o valor de 'data_inicio' aos parâmetros.
      params.data_final = endDate.toISOString(); // Adiciona o valor de 'data_final' aos parâmetros.
    } else if (data_inicio) {
      const startDate = new Date(data_inicio);
      startDate.setHours(0, 0, 0, 0);
      query1 += " AND r.Dia >= @data_inicio"; // Filtro para 'data_inicio'.
      params.data_inicio = startDate.toISOString(); // Adiciona o valor de 'data_inicio' aos parâmetros.
    } else if (data_final) {
      const endDate = new Date(data_final);
      endDate.setHours(23, 59, 59, 999);
      query1 += " AND r.Dia <= @data_final"; // Filtro para 'data_final'.
      params.data_final = endDate.toISOString(); // Adiciona o valor de 'data_final' aos parâmetros.
    }

    console.log("Query:", query1); // Log da consulta gerada para depuração.
    console.log("Params:", params); // Log dos parâmetros para depuração.

    const requestSql = await criarRequest(); // Cria uma nova requisição SQL.
    requestSql.input("id_cliente", sql.Int, params.id_cliente); // Adiciona o parâmetro 'id_cliente' à requisição SQL.
    if (params.id_funcionario)
      requestSql.input("id_funcionario", sql.Int, params.id_funcionario); // Adiciona o parâmetro 'id_funcionario' à requisição SQL, se aplicável.
    if (params.data_inicio)
      requestSql.input("data_inicio", sql.DateTime, params.data_inicio); // Adiciona o parâmetro 'data_inicio' à requisição SQL, se aplicável.
    if (params.data_final)
      requestSql.input("data_final", sql.DateTime, params.data_final); // Adiciona o parâmetro 'data_final' à requisição SQL, se aplicável.

    // Executa a consulta SQL.
    const result = await requestSql.query(query1);

    // Verifica se o resultado da consulta não contém dados.
    if (!result.recordset.length) {
      console.warn("Nenhum dado encontrado para os critérios fornecidos."); // Log de aviso se não houver resultados.
      return response.status(200).json({
        message: "Nenhum dado encontrado para os critérios fornecidos.",
        data: [],
      });
    }
    // Retorna os dados do relatório como resposta.
    return response.status(200).json(result.recordset); // Retorna os produtos formatados com status 200.
  } catch (error) {
    // Caso ocorra um erro durante a execução, imprime o erro e retorna erro 500.
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta"); // Retorna erro 500.
  }
}

// Exporta as funções 'relatorio' e 'textoFicha' para que possam ser usadas em outras partes do código.
module.exports = {
  relatorio,
  textoFicha,
};
