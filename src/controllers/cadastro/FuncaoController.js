// Importa o módulo 'mssql', utilizado para interagir com o banco de dados SQL Server.
const sql = require("mssql");

// Importa a função 'logQuery' do módulo utilitário localizado em '../../utils/logUtils'.
// A função 'logQuery' provavelmente é usada para registrar detalhes sobre a execução de queries no banco de dados.
const { logQuery } = require("../../utils/logUtils");

/**
 * Função para listar todas as funções de um cliente, onde o ID do cliente é fornecido.
 *
 * @param {Object} request Objeto contendo os dados da requisição, como o ID do cliente.
 * @param {Object} response Objeto usado para enviar a resposta ao cliente, incluindo status e dados ou mensagens de erro.
 *
 * @returns {Promise} Retorna uma Promise que resolve com as funções do cliente ou em caso de erro.
 */
async function listar(request, response) {
  try {
    const id_cliente = request.body.id_cliente; // Extrai o ID do cliente do corpo da requisição.

    // Verifica se o ID do cliente foi fornecido.
    if (id_cliente) {
      // Define a query para listar todas as funções de um cliente, onde a função não foi deletada.
      const query =
        "SELECT *  FROM Funcao WHERE id_cliente = @id_cliente AND Deleted = 0";

      // Cria uma nova requisição SQL e define o parâmetro 'id_cliente'.
      request = new sql.Request();
      request.input("id_cliente", sql.Int, id_cliente);

      // Executa a query e aguarda o resultado.
      const result = await request.query(query);

      // Retorna o resultado com status 200 se a consulta for bem-sucedida.
      response.status(200).json(result.recordset);
      return;
    }

    // Se o ID do cliente não for enviado, retorna um erro 401 (não autorizado).
    response.status(401).json("ID do cliente não enviado");
  } catch (error) {
    // Caso ocorra erro na execução da consulta, loga e retorna erro 500 (erro interno do servidor).
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

async function listarPaginada(request, response) {
  try {
    const {
      id_cliente,
      first = 0,
      rows = 10,
      sortField = "id_funcao",
      sortOrder = "ASC",
      filters = {},
    } = request.body;// Extrai dados do corpo da requisição.

     // Verifica se o ID do cliente foi fornecido, se não foi, retorna erro.
    if (!id_cliente) {
      return response.status(401).json({ error: "ID do cliente não enviado" });
    }

  // Cria uma nova requisição SQL
    const sqlRequest = new sql.Request();

    // Query inicial com filtros básicos
    let queryFuncoes = `
      SELECT 
        COUNT(*) OVER() AS TotalRecords,
       Funcao.*
        FROM 
        Funcao
      WHERE 
        id_cliente = @id_cliente AND Deleted = 0
    `;
if (filters.global && filters.global.value) {
      const globalValue = `%${filters.global.value}%`; // Adiciona o wildcard para LIKE
      queryFuncoes += ` AND ( 
          nome LIKE @globalValue OR 
          id_centro_custo LIKE @globalValue
      )`;
  
      sqlRequest.input("globalValue", sql.NVarChar, globalValue);
  }
    sqlRequest.input("id_cliente", sql.Int, id_cliente);

    // Filtros dinâmicos
    if (filters.nome) {
      queryFuncoes += ` AND nome LIKE @nome`;
      sqlRequest.input("nome", sql.NVarChar, `%${filters.nome.value}%`);
    }
    if (filters.id_centro_custo) {
      queryFuncoes += ` AND id_centro_custo LIKE @id_centro_custo`;
      sqlRequest.input("id_centro_custo", sql.Int, `%${filters.id_centro_custo.value}%`);
    }

    // Ordenação e Paginação
    queryFuncoes += `
      ORDER BY ${sortField} ${sortOrder === "DESC" ? "DESC" : "ASC"}
      OFFSET @first ROWS FETCH NEXT @rows ROWS ONLY;
    `;

    sqlRequest.input("first", sql.Int, first);
    sqlRequest.input("rows", sql.Int, rows);

    // Executa a consulta de funções
    const funcoesResult = await sqlRequest.query(queryFuncoes);

    // Extrai os dados paginados e o total de registros
    const funcoes = funcoesResult.recordset;
    const totalRecords = funcoes.length > 0 ? funcoes[0].TotalRecords : 0;

    // Retorna os dados paginados e o total de registros
    response.status(200).json({ funcoes, totalRecords });
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para listar as funções de um cliente de forma simplificada, retornando apenas o id e nome.
 *
 * @param {Object} request Objeto contendo os dados da requisição, como o ID do cliente.
 * @param {Object} response Objeto usado para enviar a resposta ao cliente, incluindo status e dados ou mensagens de erro.
 *
 * @returns {Promise} Retorna uma Promise que resolve com as funções simplificadas ou em caso de erro.
 */
async function listarSimples(request, response) {
  try {
    const id_cliente = request.body.id_cliente; // Extrai o ID do cliente do corpo da requisição.

    // Verifica se o ID do cliente foi fornecido.
    if (id_cliente) {
      // Define a query para listar apenas o id e nome das funções de um cliente.
      const query =
        "SELECT id_funcao, nome FROM Funcao WHERE id_cliente = @id_cliente AND Deleted = 0";

      // Cria uma nova requisição SQL e define o parâmetro 'id_cliente'.
      request = new sql.Request();
      request.input("id_cliente", sql.Int, id_cliente);

      // Executa a query e aguarda o resultado.
      const result = await request.query(query);

      // Retorna o resultado com status 200 se a consulta for bem-sucedida.
      response.status(200).json(result.recordset);
      return;
    }

    // Se o ID do cliente não for enviado, retorna um erro 401 (não autorizado).
    response.status(401).json("ID do cliente não enviado");
  } catch (error) {
    // Caso ocorra erro na execução da consulta, loga e retorna erro 500 (erro interno do servidor).
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para adicionar uma nova função de centro de custo no banco de dados.
 *
 * @param {Object} request Objeto contendo os dados para adicionar a função, como id_cliente, nome, código, centro de custo, e id_usuario.
 * @param {Object} response Objeto usado para enviar a resposta ao cliente, incluindo status e mensagens de erro.
 *
 * @returns {Promise} Retorna uma Promise que resolve quando a função for adicionada ou em caso de erro.
 */
async function adicionar(request, response) {
  const { id_cliente, nome, codigo, id_centro_custo, id_usuario } =
    request.body; // Extrai os dados do corpo da requisição.

  // Define a query para inserir uma nova função no banco de dados.
  const query = `
    INSERT INTO Funcao
    (id_cliente, Codigo, nome, Deleted, id_centro_custo)
    VALUES (@id_cliente, @codigo, @nome, @deleted, @id_centro_custo);
  `;

  // Parâmetros a serem passados para a query SQL.
  const params = {
    ID_Cliente: id_cliente,
    codigo: codigo,
    nome: nome,
    id_centro_custo: id_centro_custo,
    Deleted: false,
  };

  try {
    // Verifica se o ID do cliente foi enviado na requisição.
    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado"); // Retorna erro 401 (não autorizado) se o ID do cliente não for fornecido.
      return;
    }

    // Cria uma nova requisição SQL e define os parâmetros.
    const sqlRequest = new sql.Request();
    sqlRequest.input("ID_Cliente", sql.Int, id_cliente);
    sqlRequest.input("codigo", sql.Int, codigo);
    sqlRequest.input("nome", sql.VarChar, nome);
    sqlRequest.input("id_centro_custo", sql.Int, id_centro_custo);
    sqlRequest.input("Deleted", sql.Bit, false);

    // Executa a query para inserir a função no banco de dados.
    const result = await sqlRequest.query(query);

    // Verifica se a função foi inserida com sucesso.
    if (result.rowsAffected[0] > 0) {
      // logQuery('info', `Usuário ${id_usuario} criou um novo Centro de Custo`, 'sucesso', 'INSERT', id_cliente, id_usuario, query, params);
      response.status(201).send("Centro do Custo criado com sucesso!"); // Retorna status 201 (criado) se a operação for bem-sucedida.
    } else {
      // logQuery('error', `Usuário ${id_usuario} falhou ao criar Centro de Custo`, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
      response.status(400).send("Falha ao criar o Centro do Custo"); // Retorna erro 400 (solicitação inválida) se a inserção falhar.
    }
  } catch (error) {
    // Se ocorrer erro ao adicionar a função, registra o erro e retorna status 500 (erro interno do servidor).
    const errorMessage = error.message.includes(
      "Query não fornecida para logging"
    )
      ? "Erro crítico: Falha na operação"
      : `Erro ao adicionar Centro de Custo: ${error.message}`;
    // logQuery('error', errorMessage, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
    console.error("Erro ao adicionar registro:", error.message);
    response.status(500).send("Erro ao adicionar registro"); // Retorna erro 500 se a operação falhar.
  }
}

/**
 * Função para atualizar os dados de uma função existente no banco de dados.
 *
 * @param {Object} request Objeto contendo os dados para atualizar a função, como id_cliente, id_funcao, nome, e outros campos.
 * @param {Object} response Objeto usado para enviar a resposta ao cliente, incluindo status e mensagens de erro.
 *
 * @returns {Promise} Retorna uma Promise que resolve quando a função for atualizada ou em caso de erro.
 */
async function atualizar(request, response) {
  const { id_cliente, id_centro_custo, nome, id_funcao, codigo, id_usuario } =
    request.body; // Extrai os dados necessários da requisição.

  // Define a query para atualizar uma função existente no banco de dados.
  const query = `UPDATE Funcao
  SET 
  id_cliente = @id_cliente,
  id_centro_custo = @id_centro_custo,
  nome = @nome,
  codigo = @codigo
  WHERE id_funcao = @id_funcao`;

  // Parâmetros a serem passados para a query SQL.
  const params = {
    id_cliente: id_cliente,
    id_centro_custo: id_centro_custo,
    nome: nome,
    codigo: codigo,
    id_funcao: id_funcao,
  };

  try {
    // Verifica se o ID da função foi fornecido na requisição.
    if (!id_funcao) {
      response.status(400).json("ID da Função não enviado"); // Retorna erro 400 (solicitação inválida) se o ID da função não for fornecido.
      return;
    }

    // Cria uma nova requisição SQL e define os parâmetros.
    const sqlRequest = new sql.Request();
    sqlRequest.input("id_cliente", sql.Int, id_cliente);
    sqlRequest.input("id_centro_custo", sql.Int, id_centro_custo);
    sqlRequest.input("nome", sql.VarChar, nome);
    sqlRequest.input("codigo", sql.Int, codigo);
    sqlRequest.input("id_funcao", sql.Int, id_funcao);

    // Executa a query de atualização no banco de dados.
    const result = await sqlRequest.query(query);

    // Verifica se a função foi atualizada com sucesso.
    if (result.rowsAffected[0] > 0) {
      // logQuery('info', `O usuário ${id_usuario} atualizou o Centro de Custo ${ID_CentroCusto}`, 'sucesso', 'UPDATE', id_cliente, id_usuario, query, params);
      response.status(200).send("Centro de custo atualizado com sucesso!"); // Retorna status 200 (OK) se a atualização for bem-sucedida.
      return;
    } else {
      // logQuery('error', `Usuário ${id_usuario} tentou atualizar o Centro ${ID_CentroCusto}, mas sem sucesso.`, 'Falha', 'UPDATE', id_cliente, id_usuario, query, params);
      response.status(400).send("Falha ao atualizar o centro de custo"); // Retorna erro 400 (solicitação inválida) se a atualização falhar.
    }
  } catch (error) {
    // Se ocorrer erro ao atualizar a função, registra o erro e retorna status 500 (erro interno do servidor).
    // logQuery('error', `${error.message}`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
    console.error("Erro ao atualizar registro:", error.message);
    response.status(500).send("Erro ao atualizar registro"); // Retorna erro 500 se a operação falhar.
  }
}

/**
 * Função para deletar uma função do banco de dados, marcando-a como excluída.
 *
 * @param {Object} request Objeto contendo os dados para deletar a função, como id_funcao, id_cliente e id_usuario.
 * @param {Object} response Objeto usado para enviar a resposta ao cliente, incluindo status e mensagens de erro.
 *
 * @returns {Promise} Retorna uma Promise que resolve quando a função for deletada ou em caso de erro.
 */
async function deleteFuncao(request, response) {
  const { id_funcao, id_cliente, id_usuario } = request.body; // Extrai os dados do corpo da requisição.

  // Define a query para marcar uma função como deletada.
  let query = "UPDATE Funcao SET deleted = 1 WHERE 1 = 1";
  const params = { id_funcao: id_funcao };

  try {
    // Verifica se o ID da função foi enviado.
    if (!id_funcao) {
      return response.status(401).json("ID da função não foi enviado"); // Retorna erro 401 se o ID da função não for fornecido.
    }

    // Adiciona a condição ao query.
    query += ` AND id_funcao = @id_funcao`;

    // Cria uma nova requisição SQL e define o parâmetro 'id_funcao'.
    const sqlRequest = new sql.Request();
    sqlRequest.input("id_funcao", sql.Int, id_funcao);

    // Executa a query para marcar a função como deletada.
    const result = await sqlRequest.query(query);

    // Verifica se a função foi deletada com sucesso.
    if (result.rowsAffected[0] > 0) {
      logQuery(
        "info",
        `O usuário ${id_usuario} deletou a função ${id_funcao}`,
        "sucesso",
        "DELETE",
        id_cliente,
        id_usuario,
        query,
        params
      );
      response.status(200).json({ message: "Função deletada com sucesso!" }); // Retorna status 200 se a exclusão for bem-sucedida.
    } else {
      logQuery(
        "error",
        `Erro ao excluir: Função ${id_funcao} não encontrada ou não deletada`,
        "erro",
        "DELETE",
        id_cliente,
        id_usuario,
        query,
        params
      );
      response.status(400).send("Nenhuma alteração foi feita na função."); // Retorna erro 400 se nenhuma alteração foi feita.
    }
  } catch (error) {
    // Registra o erro e retorna status 500 se ocorrer falha ao deletar a função.
    logQuery(
      "error",
      `Erro ao excluir função: ${error.message}`,
      "erro",
      "DELETE",
      id_cliente,
      id_usuario,
      query,
      params
    );
    console.error("Erro ao excluir:", error.message);
    response.status(500).send("Erro ao excluir"); // Retorna erro 500 se a operação falhar.
  }
}

async function fetchdados(request,response){
  const {id_funcionario} = request.body;
  const query = `SELECT nome,matricula,cpf,id_funcao FROM funcionarios WHERE id_funcionario = @id_funcionario`;

  try {
    if (!id_funcao) {
      return response.status(401).json("ID da função não foi enviado");
    }

    const sqlRequest = new sql.Request();
    sqlRequest.input("id_funcao", sql.Int, id_funcao);

    const result = await sqlRequest.query(query);

    if (result.rowsAffected[0] > 0) {
      response.status(200).json(result.recordset);
    } else {
      response.status(400).send("Nenhuma função encontrada");
    }
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}


// Exporta as funções para que possam ser utilizadas em outros arquivos.
module.exports = {
  adicionar,
  listar,
  listarPaginada,
  atualizar,
  deleteFuncao,
  listarSimples,
};
