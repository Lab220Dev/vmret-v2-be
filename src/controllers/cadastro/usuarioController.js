/**
 * Importa a biblioteca `mssql` para realizar consultas SQL.
 */
const sql = require("mssql");

/**
 * Importa o `CryptoJS` para fazer a criptografia MD5 de senhas.
 */
const CryptoJS = require("crypto-js");

/**
 * Importa a função `logQuery` para registrar logs das operações no banco de dados.
 */
const { logQuery } = require("../../utils/logUtils");

/**
 * Função assíncrona para adicionar um novo usuário no banco de dados.
 * @param {Object} request - O objeto que contém os dados enviados na requisição.
 * @param {Object} response - O objeto usado para enviar a resposta de volta ao cliente.
 */
async function adicionar(request, response) {
  // Cria uma nova requisição SQL
  const sqlRequest = new sql.Request();

  // Recupera o maior valor de id_usuario da tabela `usuarios`
  const resultId = await sqlRequest.query(
    `SELECT ISNULL(MAX(id_usuario), 0) AS lastId FROM usuarios`
  );

  // Pega o valor do maior id_usuario encontrado
  const lastId = resultId.recordset[0].lastId;

  // Define o novo id do cliente como o maior id encontrado + 1
  const newIdCliente = lastId + 1;

  // Extrai os dados do corpo da requisição
  const { nome, email, senha, ativo, id_planta, id_cliente, role, id_usuario } =
    request.body;

  // Define a query SQL para inserção de um novo usuário
  const query = `INSERT INTO usuarios (nome, email, senha, ativo, deleted, id_planta, id_cliente, role)
    Values (@nome, @email, @senha, @ativo, @deleted, @id_planta, @id_cliente, @role)`;

  // Criptografa a senha com MD5
  const hashMD5 = CryptoJS.MD5(senha).toString();

  // Define os parâmetros que serão usados na query
  const params = {
    nome: nome,
    email: email,
    senha: hashMD5,
    ativo: ativo,
    deleted: false,
    id_planta: id_planta,
    id_cliente: id_cliente,
    role: role,
  };

  try {
    // Cria uma nova requisição SQL
    request = new sql.Request();

    // Define os parâmetros para a query
    request.input("nome", sql.VarChar, nome);
    request.input("email", sql.VarChar, email);
    request.input("senha", sql.VarChar, hashMD5);
    request.input("ativo", sql.Bit, ativo);
    request.input("deleted", sql.Bit, false);
    request.input("id_planta", sql.Int, id_planta);
    request.input("id_cliente", sql.Int, id_cliente);
    request.input("role", sql.NVarChar, role);

    // Executa a query SQL para inserir o novo usuário
    const result = await request.query(query);

    // Verifica se a inserção foi bem-sucedida
    if (result.rowsAffected[0] > 0) {
      // Registra a criação do novo usuário no log
      logQuery(
        "info",
        `Usuário ${id_usuario} criou um novo usuario web ${newIdCliente}`,
        "sucesso",
        "INSERT",
        id_cliente,
        id_usuario,
        query,
        params
      );
      response.status(201).send("Usuário criado com sucesso!");
      return;
    } else {
      // Registra falha na criação do usuário no log
      logQuery(
        "error",
        `Usuário ${id_usuario} não criou um novo usuario web`,
        "falha",
        "INSERT",
        id_cliente,
        id_usuario,
        query,
        params
      );
      response.status(400).send("Falha ao criar o Centro de Custo");
    }

    // Retorna uma falha genérica caso não tenha ocorrido sucesso na inserção
    response.status(400).send("Falha ao criar o usuário!");
  } catch (error) {
    // Registra o erro no log de falha
    logQuery(
      "error",
      errorMessage,
      "falha",
      "INSERT",
      id_cliente,
      id_usuario,
      query,
      params
    );
    console.error("Erro ao inserir o usuário:", error.message);
    response.status(500).send("Erro ao inserir o usuário");
  }
}

/**
 * Função assíncrona para listar os usuários no banco de dados.
 * @param {Object} request - O objeto que contém os dados enviados na requisição.
 * @param {Object} response - O objeto usado para enviar a resposta de volta ao cliente.
 */
async function listar(request, response) {
  try {
    let query;

    // Se id_cliente foi fornecido, filtra a consulta para aquele cliente
    if (request.body.id_cliente) {
      query = `SELECT * FROM usuarios WHERE id_cliente = '${request.body.id_cliente}' AND deleted != 1`;
    } else {
      // Caso contrário, recupera todos os usuários, incluindo o nome do cliente associado
      query = `
                SELECT usuarios.*, clientes.nome AS nome_cliente 
                FROM usuarios 
                LEFT JOIN clientes ON usuarios.id_cliente = clientes.id_cliente
                WHERE usuarios.deleted != 1
            `;
    }

    // Executa a consulta SQL
    const result = await new sql.Request().query(query);

    // Mapeia os resultados para esconder a senha real
    const usuarios = result.recordset.map((usuario) => {
      return {
        ...usuario,
        senha: "senhaAntiga", // Substitui a senha real por uma palavra fixa para segurança
      };
    });

    // Retorna os usuários encontrados
    response.status(200).json(usuarios);
  } catch (error) {
    // Log de erro caso a consulta falhe
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

async function listarPaginado(request, response) {
  try {
    // Desestruturação dos parâmetros de entrada fornecidos pelo cliente
    const {
      id_cliente, // ID do cliente (se fornecido)
      first = 0, // Primeira linha a ser retornada (padrão é 0)
      rows = 10, // Número de linhas a ser retornado (padrão é 10)
      sortField = "id_usuario", // Campo para ordenar os resultados (padrão é "id_usuario")
      sortOrder = "ASC", // Ordem de ordenação, pode ser "ASC" ou "DESC" (padrão é "ASC")
      filters = {}, // Filtros adicionais aplicados à consulta (padrão é um objeto vazio)
    } = request.body; // Obtém os dados do corpo da requisição

    const sqlRequest = new sql.Request(); // Cria uma nova requisição SQL
    let query;

    // Verifica se o id_cliente foi fornecido
    if (id_cliente) {
      // Consulta SQL para listar os usuários com base no id_cliente
      query = `SELECT 
                COUNT(*) OVER() AS TotalRecords, 
                usuarios.*
                FROM 
                usuarios
                WHERE 
                id_cliente = @id_cliente AND deleted != 1`;
      sqlRequest.input("id_cliente", sql.Int, id_cliente); // Define o parâmetro para a consulta SQL

      // Verifica se existem filtros de busca globais (filtro de pesquisa comum)
      if (filters.global && filters.global.value) {
        const globalValue = `%${filters.global.value}%`; // Adiciona wildcard (%) para o LIKE nas buscas
        // Adiciona a condição de filtro na query SQL
        query += ` AND (
                    usuarios.email LIKE @globalValue OR 
                    usuarios.nome LIKE @globalValue OR 
                    usuarios.role LIKE @globalValue OR 
                    usuarios.last_login LIKE @globalValue
                  )`;

        // Define o parâmetro para a busca global
        sqlRequest.input("globalValue", sql.NVarChar, globalValue);
      }
    } else {
      // Consulta SQL para listar os usuários sem filtrar pelo id_cliente
      query = `
                SELECT 
                COUNT(*) OVER() AS TotalRecords,
                usuarios.*, 
                clientes.nome AS nome_cliente 
                FROM usuarios 
                LEFT JOIN clientes ON usuarios.id_cliente = clientes.id_cliente
                WHERE usuarios.deleted != 1
            `;
      // Verifica se existem filtros de busca globais
      if (filters.global && filters.global.value) {
        const globalValue = `%${filters.global.value}%`; // Adiciona wildcard (%) para o LIKE nas buscas
        // Adiciona a condição de filtro na query SQL
        query += ` AND (
                    usuarios.email LIKE @globalValue OR 
                    usuarios.nome LIKE @globalValue OR 
                    usuarios.role LIKE @globalValue OR 
                    clientes.nome LIKE @globalValue OR 
                    usuarios.last_login LIKE @globalValue
                  )`;

        // Define o parâmetro para a busca global
        sqlRequest.input("globalValue", sql.NVarChar, globalValue);
      }
    }

    // Adiciona as condições de ordenação e paginação à consulta SQL
    query += `
        ORDER BY ${sortField} ${sortOrder === "DESC" ? "DESC" : "ASC"}
        OFFSET @first ROWS FETCH NEXT @rows ROWS ONLY;
      `;

    // Define os parâmetros de paginação
    sqlRequest.input("first", sql.Int, first); // A linha inicial da consulta
    sqlRequest.input("rows", sql.Int, rows); // O número de linhas a ser retornado

    // Executa a consulta SQL
    const result = await sqlRequest.query(query);

    // Mapeia o resultado da consulta para adicionar a propriedade 'senha' com o valor "senhaAntiga"
    const usuarios = result.recordset.map((usuario) => ({
      ...usuario, // Mantém os dados originais do usuário
      senha: "senhaAntiga", // Adiciona um campo de senha fictício
    }));

    // Obtém o total de registros (TotalRecords) a partir do primeiro usuário, caso existam resultados
    const totalRecords = usuarios.length > 0 ? usuarios[0].TotalRecords : 0;

    // Retorna a resposta com os usuários e o número total de registros
    response.status(200).json({ usuarios, totalRecords });
  } catch (error) {
    // Em caso de erro, exibe o erro no console e retorna uma mensagem de erro para o cliente
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função assíncrona para listar as plantas associadas a um cliente.
 * @param {Object} request - O objeto que contém os dados enviados na requisição.
 * @param {Object} response - O objeto usado para enviar a resposta de volta ao cliente.
 */
async function listarPlanta(request, response) {
  try {
    // Define a consulta inicial para recuperar id_planta
    let query = "SELECT DISTINCT id_planta FROM funcionarios WHERE 1 = 1";

    // Se id_cliente foi fornecido, filtra pela planta daquele cliente
    if (request.body.id_cliente) {
      query += ` AND id_cliente = '${request.body.id_cliente}'`;
      const result = await new sql.Request().query(query);
      response.status(200).json(result.recordset); // Retorna os resultados encontrados
      return;
    }

    // Retorna erro se id_cliente não for fornecido
    response.status(401).json("id do cliente não enviado");
  } catch (error) {
    // Log de erro caso a consulta falhe
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função assíncrona para excluir um usuário (marcando como deletado).
 * @param {Object} request - O objeto que contém os dados enviados na requisição.
 * @param {Object} response - O objeto usado para enviar a resposta de volta ao cliente.
 */
async function deleteUsuario(request, response) {
  const id_usuario = request.body.id_usuario;
  const id_usuario_delete = request.body.id_usuario_delete;
  const id_cliente = request.body.id_cliente;

  // Define a query para marcar o usuário como deletado
  let query = "UPDATE usuarios SET deleted = 1 WHERE id_usuario = @id_usuario";

  const params = {
    id_cliente: id_usuario_delete,
  };

  try {
    // Verifica se id_usuario foi enviado
    if (id_usuario) {
      const sqlRequest = new sql.Request();
      sqlRequest.input("id_usuario", sql.Int, id_usuario_delete);

      // Executa a consulta SQL
      const result = await sqlRequest.query(query);

      // Se a exclusão for bem-sucedida
      if (result.rowsAffected[0] > 0) {
        // Loga a exclusão do usuário
        logQuery(
          "info",
          `Usuário ${id_usuario} deletou o o usuario ${id_usuario_delete}`,
          "sucesso",
          "DELETE",
          id_cliente,
          id_usuario,
          query,
          params
        );
        response.status(200).json(result.recordset);
        return;
      } else {
        // Loga erro caso o usuário não tenha sido encontrado
        logQuery(
          "erro",
          `Usuário ${id_usuario} deletou o o usuario ${id_usuario_delete}`,
          "falha",
          "DELETE",
          id_cliente,
          id_usuario,
          query,
          params
        );
        response.status(400).send("Não foi possível deletar o usuário");
      }
    }

    // Retorna erro caso o id_usuario não tenha sido enviado
    response.status(401).json("id do usuario não foi enviado");
  } catch (error) {
    // Log de erro caso a exclusão falhe
    console.error("Erro ao excluir:", error.message);
    response.status(500).send("Erro ao excluir");
  }
}

/**
 * Função assíncrona para atualizar os dados de um usuário.
 * @param {Object} request - O objeto que contém os dados enviados na requisição.
 * @param {Object} response - O objeto usado para enviar a resposta de volta ao cliente.
 */
async function atualizarUsuario(request, response) {
  // Extrai os dados do corpo da requisição
  const {
    id_usuario_pedinte,
    ativo,
    celular,
    deleted,
    email,
    id_cliente,
    id_planta,
    id_usuario,
    last_login,
    nome,
    role,
    telefone,
    senha,
  } = request.body;

  // Define a query SQL de atualização
  let query = `
        UPDATE usuarios
        SET 
            nome = @nome,
            celular = @celular,
            deleted = @deleted,
            last_login = @last_login,
            telefone = @telefone,
            ativo = @ativo,
            id_planta = @id_planta,
            email = @email,
            role = @role`;

  // Define os parâmetros que serão usados na query
  const params = {
    nome: nome,
    email: email,
    celular: celular,
    deleted: deleted,
    id_cliente: id_cliente,
    last_login: last_login,
    telefone: telefone,
    ativo: ativo,
    id_planta: id_planta,
    role: role,
  };

  // Se a senha foi enviada, criptografa ela e adiciona na query
  if (senha) {
    const hashMD5 = CryptoJS.MD5(senha).toString();
    query += `, senha = @senha`;
    params.senha = hashMD5;
  }

  // Finaliza a query de atualização com a condição WHERE
  query += ` WHERE id_usuario = @id_usuario and id_cliente = @id_cliente`;
  params.id_usuario = id_usuario;
  params.id_cliente = id_cliente;

  try {
    // Cria uma nova requisição SQL
    const sqlRequest = new sql.Request();

    // Define os parâmetros para a query
    sqlRequest.input("id_usuario", sql.Int, params.id_usuario);
    sqlRequest.input("nome", sql.VarChar, params.nome);
    sqlRequest.input("email", sql.VarChar, params.email);
    sqlRequest.input("celular", sql.VarChar, params.celular);
    sqlRequest.input("deleted", sql.Int, params.deleted);
    sqlRequest.input("id_cliente", sql.Int, params.id_cliente);
    sqlRequest.input("last_login", sql.DateTime, params.last_login);
    sqlRequest.input("telefone", sql.Int, params.telefone);
    sqlRequest.input("ativo", sql.Bit, ativo);
    if (params.senha) sqlRequest.input("senha", sql.VarChar, params.senha);
    sqlRequest.input("id_planta", sql.Int, params.id_planta);
    sqlRequest.input("role", sql.VarChar, params.role);

    // Executa a query SQL
    const result = await sqlRequest.query(query);

    // Se a atualização for bem-sucedida
    if (result.rowsAffected[0] > 0) {
      // Loga a atualização do usuário
      logQuery(
        "info",
        `Usuário ${id_usuario_pedinte} atualizou o usuário web ${id_usuario}.`,
        "sucesso",
        "UPDATE",
        id_cliente,
        id_usuario,
        query,
        params
      );
      response.status(200).send("Usuário atualizado com sucesso!");
    } else {
      // Loga erro caso a atualização não tenha ocorrido
      logQuery(
        "Erro",
        `Usuário ${id_usuario_pedinte} falhou ao atualizar o usuário web ${id_usuario}.`,
        "erro",
        "UPDATE",
        id_cliente,
        id_usuario,
        query,
        params
      );
      response.status(400).send("Falha ao atualizar o usuário!");
    }
  } catch (error) {
    // Loga o erro caso a atualização falhe
    console.error("Erro ao atualizar usuário:", error.message);
    logQuery(
      "Erro",
      error.message,
      "erro",
      "UPDATE",
      id_cliente,
      id_usuario,
      query,
      params
    );

    response.status(500).send("Erro ao atualizar usuário");
  }
}

/**
 * Exporta as funções para que possam ser usadas em outros módulos.
 */
module.exports = {
  adicionar,
  listar,
  listarPlanta,
  atualizarUsuario,
  deleteUsuario,
  listarPaginado,
};
