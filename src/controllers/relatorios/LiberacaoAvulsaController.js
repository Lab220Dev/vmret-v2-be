const sql = require("mssql"); // Importa o módulo `mssql` para execução de consultas SQL no banco de dados.
const { format } = require("date-fns"); // Importa a função `format` do `date-fns` para formatação de datas.
const { logQuery } = require("../../utils/logUtils"); // Importa a função `logQuery` para logar as consultas SQL executadas.

// Função principal para gerar o relatório de retiradas avulsas
/**
 * Função para gerar um relatório das retiradas avulsas realizadas por um cliente.
 * 
 * @param {Object} request - O objeto de requisição HTTP, contendo os parâmetros da consulta.
 * @param {Object} response - O objeto de resposta HTTP, utilizado para retornar os resultados ou erros.
 * @returns {Promise<void>} - Retorna a resposta com os dados da consulta ou um erro.
 */
async function relatorio(request, response) {
  try {
    // Desestruturação dos parâmetros enviados no corpo da requisição.
    const {
      id_dm = "", // ID do DM (opcional)
      id_funcionario = "", // ID do funcionário (opcional)
      data_inicio, // Data de início do filtro (opcional)
      data_final, // Data de final do filtro (opcional)
      id_cliente, // ID do cliente (obrigatório)
      voucher, // Voucher (opcional)
      id_usuario, // ID do usuário (opcional)
    } = request.body;

    // Verifica se o parâmetro id_cliente foi enviado na requisição.
    if (!id_cliente) {
      // Se não for enviado, retorna um erro com status 401 e mensagem explicativa.
      return response.status(401).json("ID do cliente não enviado");
    }

    // Inicia a consulta SQL para buscar dados na tabela `Retirada_Avulsa`.
    let query = `
              SELECT 
                 *
              FROM
                  Retirada_Avulsa ra
          `;

    // Cria um objeto para armazenar os parâmetros da consulta.
    let params = { id_cliente };

    // Verifica se o parâmetro id_dm foi enviado e adiciona ao filtro da consulta.
    if (id_dm) {
      query += " AND r.ID_DM = @id_dm"; // Adiciona o filtro pelo ID do DM
      params.id_dm = id_dm; // Adiciona o ID do DM aos parâmetros da consulta
    }

    // Verifica se as datas de início e final foram enviadas, e adiciona os filtros na consulta.
    if (data_inicio && data_final) {
      // Se a data de início for posterior à data final, retorna um erro com status 400.
      if (new Date(data_inicio) > new Date(data_final)) {
        return response
          .status(400)
          .json("A data de início não pode ser posterior à data final");
      }
      // Adiciona a condição para filtrar as retiradas entre o intervalo de datas.
      query += " AND r.Dia BETWEEN @data_inicio AND @data_final";
      // Converte as datas para o formato ISO e adiciona aos parâmetros.
      params.data_inicio = new Date(data_inicio).toISOString();
      params.data_final = new Date(data_final).toISOString();
    } else if (data_inicio) {
      // Se o usuário fornecer apenas a data de início, filtra as retiradas a partir dessa data.
      query += " AND r.Dia >= @data_inicio";
      params.data_inicio = new Date(data_inicio).toISOString();
    } else if (data_final) {
      // Se o usuário fornecer apenas a data final, filtra as retiradas até essa data.
      query += " AND r.Dia <= @data_final";
      params.data_final = new Date(data_final).toISOString();
    }

    // Cria uma requisição SQL utilizando o módulo `mssql`.
    request = new sql.Request();
    // Define os parâmetros de entrada para a consulta SQL.
    request.input("id_cliente", sql.Int, params.id_cliente); // Define o parâmetro ID_Cliente
    if (params.id_dm) request.input("id_dm", sql.VarChar, id_dm.toString()); // Define o parâmetro ID_DM se presente
    // Se o parâmetro `id_funcionario` fosse utilizado, ele seria configurado aqui.
    // if (params.id_funcionario)
    //   request.input("id_funcionario", sql.VarChar, params.id_funcionario);
    if (params.data_inicio) request.input("data_inicio", sql.DateTime, params.data_inicio); // Define o parâmetro Data_Inicio
    if (params.data_final) request.input("data_final", sql.DateTime, params.data_final); // Define o parâmetro Data_Final

    // Executa a consulta SQL e armazena o resultado.
    const result = await request.query(query);

    // Cria um mapa para agrupar os produtos retornados pela consulta.
    const produtosMap = new Map();

    // Processa cada linha do resultado retornado pela consulta.
    result.recordset.forEach((row) => {
      const { ProdutoID, ProdutoNome, ProdutoSKU, Quantidade, Dia } = row; // Extrai os campos necessários
      // Formata a data para o formato 'dd/MM/yyyy - HH:mm' utilizando `date-fns`.
      const dataFormatada = format(new Date(Dia), "dd/MM/yyyy - HH:mm");

      // Verifica se o produto já foi adicionado no mapa. Caso não, adiciona o produto inicial.
      if (!produtosMap.has(ProdutoID)) {
        produtosMap.set(ProdutoID, {
          ProdutoID,
          ProdutoNome,
          ProdutoSKU,
          quantidade_no_periodo: 0, // Inicializa a quantidade total do produto no período
          Detalhes: [], // Inicializa o array para armazenar os detalhes de cada retirada do produto
        });
      }

      // Recupera o produto do mapa para atualizar a quantidade e os detalhes.
      const produto = produtosMap.get(ProdutoID);
      produto.quantidade_no_periodo += Quantidade; // Atualiza a quantidade total do produto
      // Adiciona os detalhes da retirada do produto no array Detalhes.
      produto.Detalhes.push({
        ProdutoID,
        ProdutoNome,
        ProdutoSKU,
        Quantidade,
        Data: dataFormatada, // Adiciona a data formatada da retirada
      });
    });

    // Converte o mapa de produtos em um array para enviar como resposta.
    const produtosList = Array.from(produtosMap.values());

    // Retorna a lista de produtos agrupados com status 200.
    return response.status(200).json(produtosList);
  } catch (error) {
    // Em caso de erro, loga o erro e retorna uma resposta de erro com status 500.
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

// Exporta a função relatorio para que ela possa ser utilizada em outras partes da aplicação.
module.exports = {
  relatorio, // Exporta a função relatorio
};