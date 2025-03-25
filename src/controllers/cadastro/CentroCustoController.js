// Importa o módulo 'mssql', utilizado para interagir com o banco de dados SQL Server.
const sql = require("mssql");

// Importa a função 'logQuery' de um módulo utilitário para registrar logs de consultas SQL.
const { logQuery } = require("../../utils/logUtils");

/**
 * Função para listar todos os centros de custo de um cliente.
 *
 * @async
 * @function listar
 * @param {Object} request - O objeto de requisição do Express.
 * @param {Object} response - O objeto de resposta do Express.
 * @returns {void} - Retorna os dados dos centros de custo ou um erro, caso não consiga processar a requisição.
 */
async function listar(request, response) {
  try {
    const id_cliente = request.body.id_cliente; // Extrai o ID do cliente do corpo da requisição.

    // Verifica se o ID do cliente foi fornecido. Se sim, executa a consulta.
    if (id_cliente) {
      const query =
        "SELECT *  FROM Centro_Custos WHERE id_cliente = @id_cliente AND Deleted = 0"; // Query SQL para listar os centros de custo ativos (Deleted = 0).

      request = new sql.Request(); // Cria uma nova requisição SQL.
      request.input("id_cliente", sql.Int, id_cliente); // Passa o ID do cliente como parâmetro para a consulta.

      // Executa a consulta e aguarda o resultado.
      const result = await request.query(query);

      // Retorna os resultados da consulta como JSON com o status HTTP 200 (OK).
      response.status(200).json(result.recordset);
      return; // Encerra a execução da função após o retorno.
    }

    // Caso o ID do cliente não tenha sido enviado, retorna um erro 401 (Não Autorizado).
    response.status(401).json("ID do cliente não enviado");
  } catch (error) {
    // Se ocorrer um erro durante a execução da consulta, loga o erro no console.
    console.error("Erro ao executar consulta:", error.message);
    // Retorna um erro 500 (Erro Interno do Servidor) ao cliente.
    response.status(500).send("Erro ao executar consulta");
  }
}
async function listarPaginada(request, response) {
  try {
    const {
      id_cliente,
      first = 0,
      rows = 10,
      sortField = "id_centro_custo",
      sortOrder = "ASC",
      filters = {},
    } = request.body;

    if (!id_cliente) {
      return response.status(401).json("ID do cliente não enviado");
    }

    const sqlRequest = new sql.Request();

    // Query inicial com filtros básicos
    let query = `
      SELECT 
        COUNT(*) OVER() AS TotalRecords,
        Centro_Custos.*
      FROM 
        Centro_Custos
      WHERE 
        id_cliente = @id_cliente AND Deleted = 0
    `;

    // Adiciona o ID do cliente como parâmetro
    sqlRequest.input("id_cliente", sql.Int, id_cliente);
    if (filters.global && filters.global.value) {
      const globalValue = `%${filters.global.value}%`; // Adiciona o wildcard para LIKE
      query += ` AND (
                        Centro_Custos.nome LIKE @globalValue OR 
                        Centro_Custos.Codigo LIKE @globalValue 
                    )`;

      sqlRequest.input("globalValue", sql.NVarChar, globalValue);
    }

    // Ordenação e Paginação
    query += `
      ORDER BY ${sortField} ${sortOrder === "DESC" ? "DESC" : "ASC"}
      OFFSET @first ROWS FETCH NEXT @rows ROWS ONLY;
    `;

    // Adiciona os parâmetros para paginação
    sqlRequest.input("first", sql.Int, first);
    sqlRequest.input("rows", sql.Int, rows);

    // Executa a consulta
    const result = await sqlRequest.query(query);

    // Extrai os dados paginados e o total de registros
    const centrosCusto = result.recordset;
    const totalRecords =
      centrosCusto.length > 0 ? centrosCusto[0].TotalRecords : 0;

    // Retorna os dados paginados e o total de registros
    response.status(200).json({ centrosCusto, totalRecords });
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para listar os centros de custo de forma simplificada (apenas ID e Nome).
 *
 * @async
 * @function listaSimples
 * @param {Object} request - O objeto de requisição do Express.
 * @param {Object} response - O objeto de resposta do Express.
 * @returns {void} - Retorna os dados dos centros de custo ou um erro, caso não consiga processar a requisição.
 */
async function listaSimples(request, response) {
  try {
    const id_cliente = request.body.id_cliente; // Extrai o ID do cliente do corpo da requisição.

    // Verifica se o ID do cliente foi fornecido. Se sim, executa a consulta.
    if (id_cliente) {
      const query =
        "SELECT ID_CentroCusto,Nome  FROM Centro_Custos WHERE id_cliente = @id_cliente AND Deleted = 0"; // Query simplificada (apenas ID e Nome).

      request = new sql.Request(); // Cria uma nova requisição SQL.
      request.input("id_cliente", sql.Int, id_cliente); // Passa o ID do cliente como parâmetro para a consulta.

      // Executa a consulta e aguarda o resultado.
      const result = await request.query(query);

      // Retorna os resultados da consulta como JSON com o status HTTP 200 (OK).
      response.status(200).json(result.recordset);
      return; // Encerra a execução da função após o retorno.
    }

    // Caso o ID do cliente não tenha sido enviado, retorna um erro 401 (Não Autorizado).
    response.status(401).json("ID do cliente não enviado");
  } catch (error) {
    // Se ocorrer um erro durante a execução da consulta, loga o erro no console.
    console.error("Erro ao executar consulta:", error.message);
    // Retorna um erro 500 (Erro Interno do Servidor) ao cliente.
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para adicionar um novo centro de custo.
 *
 * @async
 * @function adicionar
 * @param {Object} request - O objeto de requisição do Express.
 * @param {Object} response - O objeto de resposta do Express.
 * @returns {void} - Retorna um status indicando o sucesso ou falha da operação.
 */
async function adicionar(request, response) {
  const { id_cliente, Codigo, Nome, id_usuario } = request.body; // Extrai os dados necessários da requisição.

  // Query SQL para inserir um novo Centro de Custo.
  const query = `INSERT INTO Centro_Custos
                (ID_Cliente, Codigo, Nome, Deleted)
                VALUES (@ID_Cliente, @codigo, @nome, @deleted);`;

  // Parâmetros que serão usados na query.
  const params = {
    ID_Cliente: id_cliente,
    Codigo: Codigo,
    Nome: Nome,
    Deleted: false, // Marca o centro de custo como não deletado.
  };

  try {
    // Verifica se o ID do cliente foi enviado na requisição. Caso contrário, retorna erro 401.
    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado");
      return;
    }

    // Criação da requisição SQL com os parâmetros necessários.
    const sqlRequest = new sql.Request();
    sqlRequest.input("ID_Cliente", sql.Int, id_cliente);
    sqlRequest.input("codigo", sql.Int, Codigo);
    sqlRequest.input("nome", sql.VarChar, Nome);
    sqlRequest.input("Deleted", sql.Bit, false);

    // Executa a query e aguarda o resultado.
    const result = await sqlRequest.query(query);

    // Verifica se a inserção foi bem-sucedida, verificando o número de linhas afetadas.
    if (result.rowsAffected[0] > 0) {
      // Caso a inserção tenha sido bem-sucedida, retorna status 201 (Criado) e a mensagem de sucesso.
      //logQuery('info', `Usuário ${id_usuario} criou um novo Centro de Custo`, 'sucesso', 'INSERT', id_cliente, id_usuario, query, params);
      response.status(201).send("Centro de Custo criado com sucesso!");
    } else {
      // Caso a inserção falhe, retorna status 400 (Solicitação Incorreta).
      //logQuery('error',  `Usuário ${id_usuario} falhou ao criar Centro de Custo`, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
      response.status(400).send("Falha ao criar o Centro de Custo");
    }
  } catch (error) {
    const errorMessage = error.message.includes(
      "Query não fornecida para logging"
    )
      ? "Erro crítico: Falha na operação"
      : `Erro ao adicionar Centro de Custo: ${error.message}`;

    //logQuery('error',  errorMessage, 'falha', 'INSERT', id_cliente, id_usuario, query, params);

    // Loga o erro no console.
    console.error("Erro ao adicionar registro:", error.message);
    // Retorna um erro 500 (Erro Interno do Servidor) ao cliente.
    response.status(500).send("Erro ao adicionar Centro de Custo");
  }
}

/**
 * Função para excluir um centro de custo, marcando-o como deletado.
 *
 * @async
 * @function deleteCentro
 * @param {Object} request - O objeto de requisição do Express.
 * @param {Object} response - O objeto de resposta do Express.
 * @returns {void} - Retorna um status indicando o sucesso ou falha da operação.
 */
async function deleteCentro(request, response) {
  const { ID_CentroCusto } = request.body; // Extrai os dados necessários da requisição.
  const id_cliente = request.usuario.id_cliente;
  let transaction = new sql.Transaction();

  try {
    // Verifica se o ID do Centro de Custo foi fornecido. Caso contrário, retorna erro 401.
    if (!ID_CentroCusto) {
      response.status(401).json("ID do centro não foi enviado");
      return;
    }
    await transaction.begin();
    // Query para marcar o Centro de Custo como deletado.
    const combinedQuery = `
    UPDATE Centro_Custos SET Deleted = 1 
    WHERE ID_CentroCusto = @ID_CentroCusto AND id_cliente = @id_cliente;
    UPDATE Setores SET deleted = 1 
    WHERE id_centro_custo = @ID_CentroCusto AND id_cliente = @id_cliente;
    UPDATE Funcao SET deleted = 1 
    WHERE id_centro_custo = @ID_CentroCusto AND id_cliente = @id_cliente;
  `;


    // Cria uma nova requisição SQL.
    const sqlRequest = new sql.Request(transaction);
    sqlRequest.input("ID_CentroCusto", sql.Int, ID_CentroCusto);
    sqlRequest.input("id_cliente", sql.Int, id_cliente);

    // Executa a query e aguarda o resultado.
    const result = await sqlRequest.query(combinedQuery);
    const totalRowsAffected = result.rowsAffected.reduce((total, curr) => total + curr, 0);
    if (totalRowsAffected > 0) {
      await transaction.commit();
      return response.status(200).json({ message: "Exclusão realizada com sucesso" });
    } else {
      await transaction.rollback();
      return response.status(400).send("Nenhuma alteração foi feita no centro de custo.");
    }
  } catch (error) {
    await transaction.rollback();
    // Se ocorrer algum erro durante a execução da consulta, loga o erro no console.
    console.error("Erro ao excluir:", error.message);
    // Retorna um erro 500 (Erro Interno do Servidor) ao cliente.
    response.status(500).send("Erro ao excluir");
  }
}

/**
 * Função para atualizar os dados de um centro de custo.
 *
 * @async
 * @function atualizar
 * @param {Object} request - O objeto de requisição do Express.
 * @param {Object} response - O objeto de resposta do Express.
 * @returns {void} - Retorna um status indicando o sucesso ou falha da operação.
 */
async function atualizar(request, response) {
  const { ID_CentroCusto, Nome, Codigo, id_cliente, id_usuario } = request.body; // Extrai os dados necessários da requisição.

  // Parâmetros para a query de atualização.
  const params = {
    ID_Cliente: id_cliente,
    Codigo: Codigo,
    Nome: Nome,
    Deleted: false,
    ID_CentroCusto: ID_CentroCusto,
  };

  // Query SQL para atualizar os dados do Centro de Custo.
  const query = `UPDATE Centro_Custos
  SET ID_Cliente = @ID_Cliente,
      Codigo = @Codigo,
      Nome = @Nome,
      Deleted = @Deleted
  WHERE ID_CentroCusto = @ID_CentroCusto`;

  try {
    // Verifica se o ID do Centro de Custo foi fornecido. Caso contrário, retorna erro 400.
    if (!ID_CentroCusto) {
      response.status(400).json("ID do centro de custo não enviado");
      return;
    }

    // Criação da requisição SQL com os parâmetros necessários.
    const sqlRequest = new sql.Request();
    sqlRequest.input("ID_Cliente", sql.Int, id_cliente);
    sqlRequest.input("Codigo", sql.Int, Codigo);
    sqlRequest.input("Nome", sql.VarChar, Nome);
    sqlRequest.input("Deleted", sql.Bit, false);
    sqlRequest.input("ID_CentroCusto", sql.Int, ID_CentroCusto);

    // Executa a query e aguarda o resultado.
    const result = await sqlRequest.query(query);

    // Verifica se a atualização foi bem-sucedida, verificando o número de linhas afetadas.
    if (result.rowsAffected[0] > 0) {
      // Caso a operação tenha sido bem-sucedida, retorna status 200 (OK) com a mensagem de sucesso.
      //logQuery('info', `O usuário ${id_usuario} atualizou o Centro de Custo ${ID_CentroCusto}`, 'sucesso', 'UPDATE', id_cliente, id_usuario, query, params);
      response.status(200).send("Centro de custo atualizado com sucesso!");
    } else {
      // Caso não tenha ocorrido nenhuma alteração, retorna erro 400 (Solicitação Incorreta).
      //logQuery('error', `Usuário ${id_usuario} tentou atualizar o Centro ${ID_CentroCusto}, mas sem sucesso.`, 'Falha', 'UPDATE', id_cliente, id_usuario, query, params);
      response
        .status(400)
        .send("Nenhuma alteração foi feita no centro de custo.");
    }
  } catch (error) {
    // Se ocorrer algum erro durante a execução da consulta, loga o erro no console.
    //logQuery('error', ` ${error.message}`, 'erro', 'UPDATE', id_cliente, id_usuario, query, params);
    console.error("Erro ao atualizar centro de custo:", error.message);
    // Retorna um erro 500 (Erro Interno do Servidor) ao cliente.
    response.status(500).send("Erro ao atualizar centro de custo");
  }
}

// Exporta as funções para que possam ser utilizadas em outros arquivos.
module.exports = {
  adicionar,
  listar,
  deleteCentro,
  atualizar,
  listaSimples,
  listarPaginada,
};
