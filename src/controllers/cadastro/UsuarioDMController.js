const sql = require("mssql"); // Importa o módulo 'mssql' para interagir com o banco de dados SQL Server.
const CryptoJS = require("crypto-js"); // Importa o módulo 'crypto-js' para criptografar dados, como senhas.
const { logQuery } = require("../../utils/logUtils"); // Importa a função 'logQuery' para registrar logs de queries executadas.

/**
 * Função para listar usuários de forma simples.
 * @param {Object} request - Objeto de solicitação HTTP.
 * @param {Object} response - Objeto de resposta HTTP.
 */
async function listarUsuariosSimples(request, response) {
  try {
    // Define a consulta SQL para listar usuários com a coluna 'id' e 'nome'.
    let query = "SELECT id, nome, id_cliente FROM Usuarios_DM WHERE deleted = 0";
    const sqlRequest = new sql.Request(); // Cria um novo objeto de requisição SQL.

    // Verifica se o ID do cliente foi fornecido no corpo da requisição, e adiciona à consulta.
    if (request.body.id_cliente) {
      query += " AND id_cliente = @id_cliente"; // Adiciona o filtro para o cliente.
      sqlRequest.input("id_cliente", sql.Int, request.body.id_cliente); // Passa o parâmetro 'id_cliente' para a consulta.
    }

    // Executa a consulta no banco de dados.
    const result = await sqlRequest.query(query);

    // Retorna os resultados da consulta com os usuários encontrados.
    response.status(200).json(result.recordset);
  } catch (error) {
    // Em caso de erro na execução da consulta, retorna status 500 e a mensagem de erro.
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para listar todos os usuários com mais detalhes.
 * @param {Object} request - Objeto de solicitação HTTP.
 * @param {Object} response - Objeto de resposta HTTP.
 */
async function listar(request, response) {
  try {
    // Define a consulta SQL para listar todos os usuários não excluídos.
    let query = "SELECT * FROM Usuarios_DM WHERE deleted = 0";
    const sqlRequest = new sql.Request(); // Cria um objeto de requisição SQL.

    // Verifica se o 'id_cliente' foi fornecido e adiciona à consulta SQL.
    if (request.body.id_cliente) {
      query += ` AND id_cliente = @id_cliente`; // Filtra pela coluna 'id_cliente'.
      sqlRequest.input("id_cliente", sql.Int, request.body.id_cliente); // Define o valor do parâmetro 'id_cliente'.
    }

    // Executa a consulta SQL.
    const result = await sqlRequest.query(query);

    // Mapeia os resultados dos usuários, ocultando a senha original.
    const usuarios = result.recordset.map((usuario) => ({
      ...usuario,
      senha: "senhaAntiga", // Oculta a senha real no retorno.
    }));

    const userIds = usuarios.map((usuario) => usuario.id); // Extrai os IDs dos usuários.

    // Verifica se há usuários para evitar uma consulta desnecessária.
    if (userIds.length > 0) {
      // Prepara a consulta para obter as permissões de DM dos usuários listados.
      const permissionsQuery = `
                SELECT id_usuario_dm, id_dm 
                FROM DM_Usuario_Permissao 
                WHERE id_usuario_dm IN (${userIds.join(",")}) AND deleted = 0
            `;
      const permissionsRequest = new sql.Request(); // Cria um objeto de requisição para permissões.
      const permissionsResult = await permissionsRequest.query(
        permissionsQuery
      );

      // Agrupa os resultados de permissões por 'id_usuario_dm'.
      const permissionsMap = permissionsResult.recordset.reduce((acc, row) => {
        if (!acc[row.id_usuario_dm]) {
          acc[row.id_usuario_dm] = [];
        }
        acc[row.id_usuario_dm].push(row.id_dm);
        return acc;
      }, {});

      // Adiciona a lista de permissões 'DMOptions' a cada usuário.
      usuarios.forEach((usuario) => {
        usuario.DMOptions = permissionsMap[usuario.id] || []; // Adiciona as permissões de DM ao usuário.
      });
    }

    // Retorna os usuários com suas permissões de DM.
    response.status(200).json(usuarios);
  } catch (error) {
    // Em caso de erro, retorna status 500 e a mensagem de erro.
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}
async function listarPaginado(request, response) {
  try {
    const {
      first = 0,
      rows = 10,
      sortField = "id",
      sortOrder = "ASC",
      filters = {},
      id_cliente,
    } = request.body;

    const sqlRequest = new sql.Request();
    let query = `
            SELECT 
                COUNT(*) OVER() AS TotalRecords, 
                id, nome, email, deleted 
            FROM 
                Usuarios_DM
            WHERE 
                deleted = 0
        `;

    // Adiciona filtro por ID do cliente, se fornecido
    if (id_cliente) {
      query += ` AND id_cliente = @id_cliente`;
      sqlRequest.input("id_cliente", sql.Int, id_cliente);
    }

    // Adiciona filtros dinâmicos
    if (filters.nome) {
      query += ` AND nome LIKE @nome`;
      sqlRequest.input("nome", sql.NVarChar, `%${filters.nome.value}%`);
    }
    if (filters.email) {
      query += ` AND email LIKE @email`;
      sqlRequest.input("email", sql.NVarChar, `%${filters.email.value}%`);
    }

    // Adiciona ordenação e paginação
    query += `
            ORDER BY ${sortField} ${sortOrder === "DESC" ? "DESC" : "ASC"}
            OFFSET @first ROWS FETCH NEXT @rows ROWS ONLY;
        `;

    sqlRequest.input("first", sql.Int, first);
    sqlRequest.input("rows", sql.Int, rows);

    // Executa a consulta e obtém os usuários
    const result = await sqlRequest.query(query);

    // Extrai os usuários e o total de registros
    const usuarios = result.recordset.map((usuario) => ({
      ...usuario,
      senha: "senhaAntiga", // Oculta a senha real no retorno
    }));
    const totalRecords = usuarios.length > 0 ? usuarios[0].TotalRecords : 0;

    // Obtém IDs dos usuários
    const userIds = usuarios.map((usuario) => usuario.id);

    // Verifica se há usuários e busca permissões de DMs
    if (userIds.length > 0) {
      const permissionsQuery = `
                SELECT id_usuario_dm, id_dm 
                FROM DM_Usuario_Permissao 
                WHERE id_usuario_dm IN (${userIds
                  .map((_, i) => `@userId${i}`)
                  .join(",")}) 
                  AND deleted = 0;
            `;

      // Adiciona os IDs dos usuários como parâmetros
      userIds.forEach((id, i) => {
        sqlRequest.input(`userId${i}`, sql.Int, id);
      });

      const permissionsResult = await sqlRequest.query(permissionsQuery);

      // Agrupa permissões por usuário
      const permissionsMap = permissionsResult.recordset.reduce((acc, row) => {
        if (!acc[row.id_usuario_dm]) {
          acc[row.id_usuario_dm] = [];
        }
        acc[row.id_usuario_dm].push(row.id_dm);
        return acc;
      }, {});

      // Adiciona permissões aos usuários
      usuarios.forEach((usuario) => {
        usuario.DMOptions = permissionsMap[usuario.id] || [];
      });
    }

    // Retorna os dados paginados e o total de registros
    response.status(200).json({ usuarios, totalRecords });
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para adicionar um novo usuário no banco de dados.
 * @param {Object} request - Objeto de solicitação HTTP.
 * @param {Object} response - Objeto de resposta HTTP.
 */
async function adicionar(request, response) {
  // Extrai os dados do corpo da requisição.
  const { nome, login, senha, ativo, admin, admin_cliente, id_usuario } =
    request.body;
  const id_cliente = request.body.id_cliente;

  // Define a consulta SQL para inserir um novo usuário.
  const query = `INSERT INTO Usuarios_DM (id_cliente, nome, login,
         senha, ativo, admin, admin_cliente,deleted )
         VALUES (@id_cliente, @nome, @login, @senha, @ativo,
          @admin, @admin_cliente,@deleted)`;

  // Criptografa a senha utilizando MD5.
  const hashMD5 = CryptoJS.MD5(senha).toString();

  // Define os parâmetros para a consulta.
  const params = {
    id_cliente: id_cliente,
    nome: nome,
    login: login,
    senha: hashMD5,
    ativo: ativo,
    deleted: false,
    admin: admin,
    admin_cliente: false,
  };

  try {
    // Cria o objeto de requisição SQL.
    request = new sql.Request();
    request.input("id_cliente", sql.Int, id_cliente);
    request.input("nome", sql.NVarChar, nome);
    request.input("login", sql.VarChar, login);
    request.input("senha", sql.NVarChar, hashMD5);
    request.input("ativo", sql.Bit, ativo);
    request.input("deleted", sql.Bit, false);
    request.input("admin", sql.Bit, admin);
    request.input("admin_cliente", sql.Bit, false);

    // Executa a consulta SQL para inserir o novo usuário.
    const result = await request.query(query);

    // Verifica se a inserção foi bem-sucedida e retorna a resposta.
    if (result.rowsAffected[0] > 0) {
      logQuery(
        "info",
        `Usuário ${id_usuario} criou um novo usuario`,
        "sucesso",
        "INSERT",
        id_cliente,
        id_usuario,
        query,
        params
      ); // Registra no log.
      response.status(201).send("usuario criado com sucesso!"); // Resposta de sucesso.
    } else {
      logQuery(
        "error",
        `Usuário ${id_usuario} falhou ao criar usuario`,
        "falha",
        "INSERT",
        id_cliente,
        id_usuario,
        query,
        params
      ); // Registra no log.
      response.status(400).send("Falha ao criar o usuario"); // Resposta de falha.
    }
  } catch (error) {
    // Em caso de erro, retorna status 500 e a mensagem de erro.
    console.error("Erro ao adicionar Usuario DM:", error.message);
    response.status(500).send("Erro ao adicionar Usuario DM");
  }
}

/**
 * Função para atualizar as informações de um usuário existente.
 * @param {Object} request - Objeto de solicitação HTTP.
 * @param {Object} response - Objeto de resposta HTTP.
 */
async function atualizar(request, response) {
  // Extrai os dados do corpo da requisição.
  const {
    id_cliente,
    id,
    nome,
    login,
    senha,
    ativo,
    admin,
    admin_cliente,
    DMOptions,
  } = request.body;

  // Define a consulta SQL para atualizar as informações do usuário.
  let query = `
        UPDATE Usuarios_DM 
        SET 
            id_cliente = @id_cliente,
            nome = @nome,
            login = @login,
            ativo = @ativo,
            admin = @admin,
            admin_cliente = @admin_cliente
    `;

  // Criptografa a senha se for fornecida.
  const hashMD5 = senha ? CryptoJS.MD5(senha).toString() : null;
  if (senha) {
    query += `, senha = @senha`; // Adiciona a atualização da senha.
  }
  query += ` WHERE id = @id`; // Define a condição para atualizar o usuário correto.

  try {
    // Inicia uma transação para garantir que todas as operações sejam realizadas com sucesso.
    const transaction = new sql.Transaction();
    await transaction.begin();
    const sqlRequest = new sql.Request(transaction); // Cria a requisição dentro da transação.

    // Define os parâmetros para a consulta de atualização.
    sqlRequest.input("id_cliente", sql.Int, id_cliente);
    sqlRequest.input("id", sql.Int, id);
    sqlRequest.input("nome", sql.NVarChar, nome);
    sqlRequest.input("login", sql.VarChar, login);
    sqlRequest.input("ativo", sql.Bit, ativo);
    sqlRequest.input("admin", sql.Bit, admin);
    sqlRequest.input("admin_cliente", sql.Bit, admin_cliente);

    if (senha) {
      sqlRequest.input("senha", sql.NVarChar, hashMD5); // Se senha foi fornecida, adiciona o parâmetro.
    }

    // Executa a consulta para atualizar o usuário.
    const result = await sqlRequest.query(query);
    await transaction.commit(); // Confirma a transação após a execução da consulta.

    // Se a atualização for bem-sucedida, manipula as permissões de DM.
    if (result.rowsAffected[0] > 0) {
      await manipularDMOptions(id, DMOptions); // Manipula as permissões de DM do usuário.
      response.status(200).send("Usuário atualizado com sucesso!"); // Resposta de sucesso.
    } else {
      response.status(400).send("Falha ao atualizar o usuário"); // Resposta de falha.
    }
  } catch (error) {
    // Em caso de erro, retorna status 500 e a mensagem de erro.
    console.error("Erro ao atualizar Usuario DM:", error.message);
    response.status(500).send("Erro ao atualizar Usuario DM");
  }
}

/**
 * Função para manipular as permissões de DM de um usuário.
 * @param {number} id_usuario_dm - O ID do usuário para atualizar as permissões de DM.
 * @param {Array} DMOptions - Lista de IDs de DM que o usuário terá permissão.
 */
async function manipularDMOptions(id_usuario_dm, DMOptions) {
  const transaction = new sql.Transaction(); // Inicia uma transação para garantir a integridade.
  try {
    await transaction.begin(); // Inicia a transação.
    const sqlRequest = new sql.Request(transaction); // Cria uma requisição dentro da transação.

    // Consulta as permissões de DM atuais do usuário.
    sqlRequest.input("id_usuario_dm", sql.Int, id_usuario_dm);
    const existingDMsResult = await sqlRequest.query(`
            SELECT id_dm 
            FROM DM_Usuario_Permissao 
            WHERE id_usuario_dm = @id_usuario_dm
        `);

    // Converte as permissões atuais para um formato de mapa (ID -> estado de 'deleted').
    const dmsatuais = existingDMsResult.recordset.reduce((acc, record) => {
      acc[record.id_dm] = record.deleted;
      return acc;
    }, {});

    // Filtra as permissões novas e as que precisam ser removidas.
    const dmsNovas = DMOptions.filter(
      (dm) => !dmsatuais.hasOwnProperty(dm) || dmsatuais[dm] === 1
    );
    const dmsToRemove = Object.keys(dmsatuais).filter(
      (dm) => !DMOptions.includes(parseInt(dm)) && dmsatuais[dm] === 0
    );

    // Insere as novas permissões de DM ou atualiza as existentes.
    for (const dm of dmsNovas) {
      if (dmsatuais[dm] === 1) {
        // Atualiza o status 'deleted' para 0 se já existe.
        const sqlRequestdm = new sql.Request(transaction);
        sqlRequestdm.input("id_usuario_dm", sql.Int, id_usuario_dm);
        sqlRequestdm.input("id_dm", sql.Int, dm);
        await sqlRequestdm.query(`
                    UPDATE DM_Usuario_Permissao 
                    SET deleted = 0 ,Sincronizado = 0 
                    WHERE id_usuario_dm = @id_usuario_dm AND id_dm = @id_dm
                `);
      } else {
        // Insere um novo registro se a permissão ainda não existir.
        const sqlRequestdm = new sql.Request(transaction);
        sqlRequestdm.input("id_usuario_dm", sql.Int, id_usuario_dm);
        sqlRequestdm.input("id_dm", sql.Int, dm.value);
        await sqlRequestdm.query(`
                    INSERT INTO DM_Usuario_Permissao (id_usuario_dm, id_dm, deleted, Sincronizado)
                    VALUES (@id_usuario_dm, @id_dm, 0, 0)
                `);
      }
    }

    // Remove as permissões de DM que não estão mais na lista.
    for (const dm of dmsToRemove) {
      const sqlRequestdm = new sql.Request(transaction);
      sqlRequestdm.input("id_usuario_dm", sql.Int, id_usuario_dm);
      sqlRequestdm.input("id_dm", sql.Int, dm.id_dm);
      await sqlRequestdm.query(`
                UPDATE DM_Usuario_Permissao 
                SET deleted = 1 
                WHERE id_usuario_dm = @id_usuario_dm AND id_dm = @id_dm
            `);
    }

    // Confirma a transação após todas as operações.
    await transaction.commit();
  } catch (error) {
    // Reverte a transação em caso de erro.
    await transaction.rollback();
    console.error("Erro ao manipular DMOptions:", error.message);
    throw error; // Propaga o erro para ser tratado na função chamadora.
  }
}

/**
 * Função para deletar um usuário do banco de dados.
 * @param {Object} request - Objeto de solicitação HTTP.
 * @param {Object} response - Objeto de resposta HTTP.
 */
async function deletar(request, response) {
  const { id, id_cliente, id_usuario } = request.body;
  // Define a consulta SQL para marcar o usuário como excluído (soft delete).
  const query = "UPDATE Usuarios_DM SET deleted = 1 WHERE id = @id";
  const params = {
    id: id,
  };

  try {
    if (!id) {
      return response.status(400).json({ error: "ID não foi enviado" }); // Retorna erro se ID não for enviado.
    }

    const sqlRequest = new sql.Request(); // Cria uma requisição SQL.
    sqlRequest.input("id", sql.Int, id); // Define o parâmetro para o ID do usuário.

    // Executa a consulta SQL para excluir o usuário.
    const result = await sqlRequest.query(query);

    if (result.rowsAffected[0] > 0) {
      // logQuery('info', `O usuário ${id_usuario} deletou o Centro de Custo ${ID_CentroCusto}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);  // Registra no log.
      response.status(200).json(result.recordset); // Retorna sucesso.
    } else {
      response
        .status(400)
        .send("Nenhuma alteração foi feita no centro de custo."); // Retorna erro se nada foi alterado.
    }
  } catch (error) {
    // Em caso de erro, retorna status 500 e a mensagem de erro.
    console.error("Erro ao excluir:", error.message);
    response.status(500).send("Erro ao excluir");
  }
}

module.exports = {
  adicionar,
  listar,
  listarPaginado,
  atualizar,
  deletar,
  listarUsuariosSimples,
};
