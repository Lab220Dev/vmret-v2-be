const sql = require("mssql"); // Importa a biblioteca 'mssql' para interação com o banco de dados SQL Server.
const { logQuery } = require("../../utils/logUtils"); // Importa a função 'logQuery' para registrar logs de consultas SQL.

 /**
  * Função para listar as DMs de um cliente.
  * @param {Object} request - O objeto de requisição contendo os filtros para a consulta.
  * @param {Object} response - O objeto de resposta para enviar o resultado ao cliente.
  * @returns {Object} Retorna a lista de DMs associadas ao cliente.
  */
async function listarDM(request, response) {
  try {
    // Verifica se o ID do cliente foi enviado na requisição, caso contrário, retorna erro 401.
    if (!request.body.id_cliente) {
      return response.status(401).json("ID do cliente não enviado");
    }

    // Consulta SQL para buscar as DMs do cliente com o estado 'deleted' igual a 0 (não deletados).
    let query =
      "SELECT ID_DM, Identificacao FROM DMs WHERE deleted = 0 AND ID_cliente = @IDcliente";
    
    // Cria um novo objeto de requisição SQL e adiciona o parâmetro do cliente.
    const dbRequest = new sql.Request();
    dbRequest.input("IDcliente", sql.Int, request.body.id_cliente);

    // Executa a consulta e aguarda o resultado.
    const result = await dbRequest.query(query);

    // Retorna os dados das DMs como resposta, se encontrados.
    response.status(200).json(result.recordset);
  } catch (error) {
    // Caso ocorra algum erro, imprime no console e retorna o erro 500.
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para gerar um relatório de itens de DM filtrado por cliente e DM.
 * @param {Object} request - O objeto de requisição contendo os filtros para a consulta.
 * @param {Object} response - O objeto de resposta para enviar o resultado ao cliente.
 * @returns {Object} Retorna os itens filtrados com base nos parâmetros fornecidos.
 */
async function relatorio(request, response) {
  try {
    // Extrai os parâmetros necessários da requisição.
    const { id_cliente, id_dm, id_usuario } = request.body;

    // Verifica se o ID do cliente foi enviado na requisição, caso contrário, retorna erro 401.
    if (!id_cliente) {
      return response.status(401).json("ID do cliente não enviado");
    }

    // Variável para armazenar a consulta SQL.
    let query;
    const dbRequest = new sql.Request();
    dbRequest.input("id_cliente", sql.Int, id_cliente);

    // Se o id_dm for nulo, consulta todos os itens da DM do cliente.
    if (id_dm === null) {
      query =
        "SELECT sku, nome, Posicao,Placa,Motor1,DIP,Andar,Controladora, quantidade, quantidademinima, capacidade FROM DM_Itens WHERE id_cliente = @id_cliente AND deleted = 0";
    } else {
      // Se o id_dm for fornecido, filtra também pelo ID_DM.
      query =
        "SELECT sku, nome, Posicao,Placa,Motor1,DIP,Andar,Controladora, quantidade, quantidademinima, capacidade FROM DM_Itens WHERE id_cliente = @id_cliente AND ID_DM = @ID_DM AND deleted = 0";
      dbRequest.input("ID_DM", sql.Int, id_dm); // Adiciona o ID_DM como parâmetro na consulta.
    }

    // Executa a consulta SQL e aguarda o resultado.
    const result = await dbRequest.query(query);

    // Se houverem itens no resultado, mapeia os dados para o formato desejado.
    if (result.rowsAffected[0] > 0) {
      const itensFiltrados = result.recordset.map((row) => {
        // Monta a posição com base no modelo de controladora.
        let posicao;
        if (row.Controladora === "2018") {
          posicao = `${row.Placa} / ${row.Motor1}`;
        } else if (row.Controladora === "2023") {
          posicao = `${row.Andar} / ${row.Posicao}`;
        } else if (row.Controladora.includes("Locker")) {
          posicao = `${row.Placa} / ${row.Posicao}`;
        } else {
          posicao = "Posição desconhecida"; // Caso o modelo não seja reconhecido.
        }
        // Retorna os dados do item formatados.
        return {
          sku: row.sku,
          nome: row.nome,
          quantidade: row.quantidade,
          quantidademinima: row.quantidademinima,
          capacidade: row.capacidade,
          Posicao: posicao,
          modelo: row.Controladora,
        };
      });
      // Envia os dados filtrados como resposta.
      response.status(200).send(itensFiltrados);
    } else {
      // Se não houverem itens, retorna um array vazio.
      response.status(200).send([]);
    }
  } catch (error) {
    // Caso ocorra algum erro, imprime no console e retorna erro 500.
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para gerar um relatório de estoque baixo.
 * @param {Object} request - O objeto de requisição contendo os filtros para a consulta.
 * @param {Object} response - O objeto de resposta para enviar o resultado ao cliente.
 * @returns {Object} Retorna os itens com estoque baixo ou os top 5 itens com menor estoque.
 */
async function relatorioEstoqueBaixo(request, response) {
  try {
    const { id_cliente, id_usuario } = request.body;
    const params = {
      id_cliente: id_cliente,
    };

    // Consulta para buscar itens com estoque baixo (quantidade maior ou igual ao mínimo, mas não ultrapassando o mínimo + 2).
    let queryEstoqueBaixo = `
            SELECT sku, nome, quantidade, quantidademinima 
            FROM DM_Itens 
            WHERE id_cliente = @id_cliente 
              AND quantidade >= quantidademinima
              AND quantidade <= quantidademinima + 2
              AND quantidademinima > 0
              AND deleted = 0
        `;

    // Consulta para buscar os top 5 itens com menor estoque.
    let queryTop5Itens = `
            SELECT TOP 5 sku, nome, quantidade, quantidademinima 
            FROM DM_Itens 
            WHERE id_cliente = @id_cliente
              AND deleted = 0
            ORDER BY quantidade ASC
        `;

    // Verifica se o ID do cliente foi enviado na requisição, caso contrário, retorna erro 401.
    if (!id_cliente) {
      return response.status(401).json("ID do cliente não enviado");
    }

    // Cria um novo objeto de requisição SQL e adiciona o parâmetro do cliente.
    const dbRequest = new sql.Request();
    dbRequest.input("id_cliente", sql.Int, id_cliente);

    // Executa a consulta de estoque baixo.
    let result = await dbRequest.query(queryEstoqueBaixo);

    // Se houverem itens com estoque baixo, retorna o resultado.
    if (result.rowsAffected[0] > 0) {
      // Loga a criação do relatório de estoque baixo.
      logQuery(
        "info",
        `Usuário ${id_usuario} criou um novo Relatório de Estoque Baixo`,
        "sucesso",
        "SELECT",
        id_cliente,
        id_usuario,
        queryEstoqueBaixo,
        params
      );
      // Retorna os itens de estoque baixo como resposta.
      response.status(201).send(result.recordset);
    } else {
      // Se não houverem itens com estoque baixo, executa a consulta dos top 5 itens com menor estoque.
      result = await dbRequest.query(queryTop5Itens);

      // Loga a criação do relatório dos top 5 itens com menor estoque.
      logQuery(
        "info",
        `Usuário ${id_usuario} criou um Relatório dos Top 5 Itens com Menor Estoque`,
        "sucesso",
        "SELECT",
        id_cliente,
        id_usuario,
        queryTop5Itens,
        params
      );
      // Retorna os top 5 itens com menor estoque como resposta.
      response.status(200).send(result.recordset);
    }
  } catch (error) {
    // Caso ocorra algum erro, imprime no console e retorna erro 500.
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para buscar os itens de DM de um cliente com quantidade mínima maior que zero.
 * @param {Object} req - O objeto de requisição contendo os filtros para a consulta.
 * @param {Object} res - O objeto de resposta para enviar o resultado ao cliente.
 * @returns {Object} Retorna os itens de DM filtrados.
 */
async function HomeOperador(req, res) {
  //console.log(req);
  const { id_cliente } = req.body;
  try {
    // Consulta para buscar itens do cliente com quantidade mínima maior que zero e não deletados.
    let query = `
  SELECT * 
  FROM DM_Itens 
  WHERE id_cliente = @id_cliente 
    AND quantidademinima > 0
    AND deleted = 0
`; 
    // Cria um novo objeto de requisição SQL e adiciona o parâmetro do cliente.
    const request = new sql.Request();
    request.input("id_cliente", sql.Int, id_cliente);

    // Executa a consulta SQL e aguarda o resultado.
    const result = await request.query(query);

    // Se houverem itens, mapeia os dados para o formato desejado.
    if (result.rowsAffected[0] > 0) {
      const itensFiltrados = result.recordset.map((row) => {
        let posicao;
        if (row.Controladora === "2018") {
          posicao = `${row.Placa} / ${row.Motor1}`;
        } else if (row.Controladora === "2023") {
          posicao = `${row.Andar} / ${row.Posicao}`;
        } else if (row.Controladora === "Locker") {
          posicao = `${row.Placa} / ${row.Posicao}`;
        } else {
          posicao = "Posição desconhecida"; // Caso o modelo não seja reconhecido.
        }
        // Retorna os dados do item formatados.
        return {
          ID_DM: row.ID_DM,
          sku: row.sku,
          nome: row.nome,
          quantidade: row.quantidade,
          quantidademinima: row.quantidademinima,
          capacidade: row.capacidade,
          Posicao: posicao,
          modelo: row.Controladora,
        };
      });
      // Envia os dados filtrados como resposta.
      res.status(200).send(itensFiltrados);
    } else {
      // Se não houverem itens, retorna um array vazio.
      res.status(200).send([]);
    }
  } catch (err) {
    // Caso ocorra algum erro, retorna erro 500.
    res.status(500).send("Erro ao executar consulta");
  }
}

// Exporta todas as funções para que possam ser utilizadas em outras partes do código.
module.exports = {
  relatorio,
  listarDM,
  HomeOperador,
  relatorioEstoqueBaixo,
};