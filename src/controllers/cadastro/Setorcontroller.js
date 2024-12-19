// Importa a função logQuery de um arquivo de utilitários para registrar logs de consultas SQL
const { logQuery } = require("../../utils/logUtils");

// Importa o módulo mssql para realizar operações com o banco de dados
const sql = require("mssql");

/**
 * Função para listar setores de um cliente.
 * @param {Object} request - O objeto de solicitação HTTP que contém os dados da requisição.
 * @param {Object} response - O objeto de resposta HTTP que será usado para enviar a resposta ao cliente.
 */
async function listar(request, response) {
  try {
    // Extrai o id_cliente do corpo da requisição
    const id_cliente = request.body.id_cliente;

    // Verifica se o id_cliente foi enviado na requisição
    if (id_cliente) {
      // Define a consulta SQL para listar setores do cliente com o id_cliente fornecido e que não estejam deletados
      const query =
        "SELECT *  FROM Setores WHERE id_cliente = @id_cliente AND Deleted = 0";

      // Cria uma nova instância de Request do mssql para realizar a consulta
      request = new sql.Request();

      // Define o parâmetro id_cliente na consulta SQL
      request.input("id_cliente", sql.Int, id_cliente);

      // Executa a consulta SQL e aguarda o resultado
      const result = await request.query(query);

      // Retorna o resultado da consulta como um JSON para o cliente
      response.status(200).json(result.recordset);
      return;
    }

    // Caso o id_cliente não seja enviado, retorna erro 401 (não autorizado)
    response.status(401).json("ID do cliente não enviado");
  } catch (error) {
    // Caso ocorra algum erro durante a execução da consulta, exibe o erro no console e retorna erro 500
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para listar setores de forma simples (sem detalhes).
 * @param {Object} request - O objeto de solicitação HTTP.
 * @param {Object} response - O objeto de resposta HTTP.
 */
async function listaSimples(request, response) {
  try {
    // Extrai o id_cliente do corpo da requisição
    const id_cliente = request.body.id_cliente;

    // Verifica se o id_cliente foi enviado na requisição
    if (id_cliente) {
      // Define a consulta SQL para listar setores de forma simples
      const query =
        "SELECT * FROM Setores WHERE id_cliente = @id_cliente AND Deleted = 0";

      // Cria uma nova instância de Request do mssql para realizar a consulta
      request = new sql.Request();

      // Define o parâmetro id_cliente na consulta SQL
      request.input("id_cliente", sql.Int, id_cliente);

      // Executa a consulta SQL e aguarda o resultado
      const result = await request.query(query);

      // Retorna o resultado da consulta como um JSON para o cliente
      response.status(200).json(result.recordset);
      return;
    }

    // Caso o id_cliente não seja enviado, retorna erro 401 (não autorizado)
    response.status(401).json("ID do cliente não enviado");
  } catch (error) {
    // Caso ocorra algum erro durante a execução da consulta, exibe o erro no console e retorna erro 500
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para listar os itens (produtos) de um setor.
 * @param {Object} request - O objeto de solicitação HTTP.
 * @param {Object} response - O objeto de resposta HTTP.
 */
async function listarItensSetor(request, response) {
  try {
    // Extrai o id_cliente do corpo da requisição
    const id_cliente = request.body.id_cliente;

    // Verifica se o id_cliente foi enviado na requisição
    if (id_cliente) {
      // Define a consulta SQL para listar produtos de um setor
      const query = `
      SELECT id_produto, nome
      FROM Produtos
      WHERE id_cliente = @id_cliente AND Deleted = 0
    `;

      // Cria uma nova instância de Request do mssql para realizar a consulta
      request = new sql.Request();

      // Define o parâmetro id_cliente na consulta SQL
      request.input("id_cliente", sql.Int, id_cliente);

      // Executa a consulta SQL e aguarda o resultado
      const result = await request.query(query);

      // Retorna o resultado da consulta como um JSON para o cliente
      response.status(200).json(result.recordset);
      return;
    }

    // Caso o id_cliente não seja enviado, retorna erro 401 (não autorizado)
    response.status(401).json("ID do cliente não enviado");
  } catch (error) {
    // Caso ocorra algum erro durante a execução da consulta, exibe o erro no console e retorna erro 500
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para listar itens disponíveis de um setor específico.
 * @param {Object} request - O objeto de solicitação HTTP.
 * @param {Object} response - O objeto de resposta HTTP.
 */
async function listarItensDisponiveisSetor(request, response) {
  try {
    // Extrai o id_cliente e id_setor do corpo da requisição
    const id_cliente = request.body.id_cliente;
    const id_setor = request.body.id_setor;

    // Verifica se o id_cliente foi enviado na requisição
    if (id_cliente) {
      // Define a consulta SQL para listar os itens disponíveis de um setor
      const query = `
      SELECT *
      FROM Ret_Itens_setor
      WHERE id_cliente = @id_cliente AND id_setor = @id_setor AND Deleted = 0
    `;

      // Cria uma nova instância de Request do mssql para realizar a consulta
      request = new sql.Request();

      // Define os parâmetros id_cliente e id_setor na consulta SQL
      request.input("id_cliente", sql.Int, id_cliente);
      request.input("id_setor", sql.Int, id_setor);

      // Executa a consulta SQL e aguarda o resultado
      const result = await request.query(query);

      // Retorna o resultado da consulta como um JSON para o cliente
      response.status(200).json(result.recordset);
      return;
    }

    // Caso o id_cliente não seja enviado, retorna erro 401 (não autorizado)
    response.status(401).json("ID do cliente não enviado");
  } catch (error) {
    // Caso ocorra algum erro durante a execução da consulta, exibe o erro no console e retorna erro 500
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para adicionar um item a um setor.
 * @param {Object} request - O objeto de solicitação HTTP.
 * @param {Object} response - O objeto de resposta HTTP.
 */
async function adicionarItem(request, response) {
  try {
    // Extrai os dados do corpo da requisição
    const {
      id_produto,
      deleted,
      id_centro_custo,
      id_cliente,
      id_setor,
      id_usuario,
      ordem,
      quantidade,
    } = request.body;

    // Verifica se o id_cliente e id_produto foram enviados na requisição
    if (id_cliente && id_produto) {
      const requestDb = new sql.Request();

      // Define a consulta SQL para recuperar o SKU, nome e imagem1 do produto
      const queryProduto = `
        SELECT codigo AS sku, nome, imagem1
        FROM Produtos
        WHERE id_produto = @id_produto AND Deleted = 0
      `;

      // Define o parâmetro id_produto na consulta SQL
      requestDb.input("id_produto", sql.Int, id_produto);

      // Executa a consulta SQL e aguarda o resultado
      const produtoResult = await requestDb.query(queryProduto);

      // Verifica se o produto foi encontrado
      if (produtoResult.recordset.length > 0) {
        const { sku, nome: nomeProduto, imagem1 } = produtoResult.recordset[0];

        // Verifica se o item já existe no setor e cliente
        const queryCheckExistente = `
          SELECT id_item_setor, qtd_limite
          FROM Ret_Itens_setor
          WHERE id_produto = @id_produto AND id_cliente = @id_cliente AND id_setor = @id_setor AND Deleted = 0
        `;
        const checkResult = await requestDb.query(queryCheckExistente);

        if (checkResult.recordset.length > 0) {
          // Item já existe, atualiza a quantidade
          const { id_item_setor, qtd_limite } = checkResult.recordset[0];
          const novaQuantidade = qtd_limite + quantidade;

          const updateQuery = `
            UPDATE Ret_Itens_setor
            SET qtd_limite = @novaQuantidade
            WHERE id_item_setor = @id_item_setor
          `;
          const updateRequest = new sql.Request();
          updateRequest.input("novaQuantidade", sql.Int, novaQuantidade);
          updateRequest.input("id_item_setor", sql.Int, id_item_setor);

          // Executa a atualização da quantidade
          await updateRequest.query(updateQuery);

          response
            .status(200)
            .json({ message: "Quantidade do item atualizada com sucesso" });
        } else {
          // Item não existe, insere um novo item
          const queryMaxId = `
            SELECT ISNULL(MAX(id_item_setor), 0) + 1 AS novo_id_item_setor
            FROM Ret_Itens_setor
          `;
          const idResult = await requestDb.query(queryMaxId);
          const novoIdItemSetor = idResult.recordset[0].novo_id_item_setor;

          const insertQuery = `
            INSERT INTO Ret_Itens_setor (id_item_setor, id_cliente, id_setor, id_produto, deleted, sku, nome, imagem1, qtd_limite)
            VALUES (@novo_id_item_setor, @id_cliente, @id_setor, @id_produto, @deleted, @sku, @nome, @imagem1, @qtd_limite)
          `;
          const insertRequest = new sql.Request();
          insertRequest.input("novo_id_item_setor", sql.Int, novoIdItemSetor);
          insertRequest.input("id_cliente", sql.Int, id_cliente);
          insertRequest.input("id_setor", sql.Int, id_setor);
          insertRequest.input("id_produto", sql.Int, id_produto);
          insertRequest.input("deleted", sql.Bit, 0);
          insertRequest.input("sku", sql.NVarChar, sku);
          insertRequest.input("nome", sql.NVarChar, nomeProduto);
          insertRequest.input("imagem1", sql.NVarChar, imagem1);
          insertRequest.input("qtd_limite", sql.Int, quantidade);

          // Executa a inserção do novo item
          await insertRequest.query(insertQuery);

          response.status(201).json({ message: "Item adicionado com sucesso" });
        }
      } else {
        // Caso o produto não seja encontrado
        response.status(404).json({ message: "Produto não encontrado" });
      }
      return;
    }

    // Caso os dados obrigatórios não sejam fornecidos
    response
      .status(400)
      .json({ message: "ID do cliente ou ID do produto não enviado" });
  } catch (error) {
    // Caso ocorra algum erro, exibe o erro no console e retorna erro 500
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para deletar um produto de um setor.
 * @param {Object} request - O objeto de solicitação HTTP.
 * @param {Object} response - O objeto de resposta HTTP.
 */
async function deletarProduto(request, response) {
  try {
    // Extrai os dados do corpo da requisição
    const { id_cliente, id_produto, id_setor } = request.body;

    // Verifica se os dados necessários foram enviados
    if (id_cliente && id_produto && id_setor) {
      const requestDb = new sql.Request();

      // Define a consulta SQL para recuperar o id_item_setor do produto no setor
      const queryIdItemSetor = `
        SELECT id_item_setor
        FROM Ret_Itens_setor
        WHERE id_cliente = @id_cliente
        AND id_produto = @id_produto
        AND id_setor = @id_setor
        AND Deleted = 0
      `;
      requestDb.input("id_cliente", sql.Int, id_cliente);
      requestDb.input("id_produto", sql.Int, id_produto);
      requestDb.input("id_setor", sql.Int, id_setor);

      // Executa a consulta SQL para verificar se o item existe
      const resultId = await requestDb.query(queryIdItemSetor);

      // Caso o item não seja encontrado, retorna erro 404
      if (resultId.recordset.length === 0) {
        response.status(404).json({ message: "Item não encontrado no setor" });
        return;
      }

      // Obtém o id_item_setor
      const id_item_setor = resultId.recordset[0].id_item_setor;

      // Define a consulta SQL para marcar o item como deletado
      const updateQuery = `
        UPDATE Ret_Itens_setor
        SET deleted = 1
        WHERE id_item_setor = @id_item_setor
      `;
      requestDb.input("id_item_setor", sql.Int, id_item_setor);

      // Executa a consulta de atualização
      const result = await requestDb.query(updateQuery);

      // Caso o item tenha sido deletado com sucesso, retorna uma resposta positiva
      if (result.rowsAffected[0] > 0) {
        response
          .status(200)
          .json({ message: "Item marcado como deletado com sucesso" });
      } else {
        // Caso ocorra algum erro na deleção
        response.status(404).json({ message: "Item não encontrado" });
      }
    } else {
      // Caso os dados necessários não sejam fornecidos
      response
        .status(400)
        .json({
          message:
            "Dados incompletos: id_produto, id_cliente ou id_setor não fornecidos",
        });
    }
  } catch (error) {
    // Caso ocorra algum erro, exibe o erro no console e retorna erro 500
    console.error("Erro ao executar a consulta de deleção:", error.message);
    response.status(500).send("Erro ao executar consulta de deleção");
  }
}

// Função para atualizar a quantidade de um produto em um setor
async function atualizarproduto(request, response) {
  try {
    // Extrai os dados do corpo da requisição
    const { id_cliente, id_produto, id_setor, qtd_limite } = request.body;

    // Verifica se os dados necessários foram enviados
    if (id_cliente && id_produto && id_setor && qtd_limite !== undefined) {
      const requestDb = new sql.Request();

      // Define a consulta SQL para recuperar o id_item_setor do produto no setor
      const queryIdItemSetor = `
        SELECT id_item_setor
        FROM Ret_Itens_setor
        WHERE id_cliente = @id_cliente
        AND id_produto = @id_produto
        AND id_setor = @id_setor
        AND Deleted = 0
      `;
      requestDb.input("id_cliente", sql.Int, id_cliente);
      requestDb.input("id_produto", sql.Int, id_produto);
      requestDb.input("id_setor", sql.Int, id_setor);

      // Executa a consulta SQL para verificar se o item existe
      const resultId = await requestDb.query(queryIdItemSetor);

      // Caso o item não seja encontrado, retorna erro 404
      if (resultId.recordset.length === 0) {
        return response
          .status(404)
          .json({ message: "Item não encontrado no setor" });
      }

      // Obtém o id_item_setor
      const id_item_setor = resultId.recordset[0].id_item_setor;

      // Define a consulta SQL para atualizar a quantidade do item
      const updateQuery = `
        UPDATE Ret_Itens_setor
        SET qtd_limite = @qtd_limite
        WHERE id_item_setor = @id_item_setor
      `;
      requestDb.input("qtd_limite", sql.Int, qtd_limite);
      requestDb.input("id_item_setor", sql.Int, id_item_setor);

      // Executa a consulta de atualização
      const result = await requestDb.query(updateQuery);

      // Caso a quantidade tenha sido atualizada com sucesso, retorna uma resposta positiva
      if (result.rowsAffected[0] > 0) {
        return response
          .status(200)
          .json({ message: "Quantidade atualizada com sucesso" });
      } else {
        return response
          .status(404)
          .json({ message: "Erro ao atualizar a quantidade" });
      }
    } else {
      // Caso os dados necessários não sejam fornecidos
      return response
        .status(400)
        .json({
          message:
            "Dados incompletos: id_produto, id_cliente, id_setor ou qtd_limite não fornecidos",
        });
    }
  } catch (error) {
    // Caso ocorra algum erro, exibe o erro no console e retorna erro 500
    console.error("Erro ao executar a consulta de atualização:", error.message);
    return response
      .status(500)
      .send("Erro ao executar consulta de atualização");
  }
}

/**
 * Função para adicionar um setor.
 * @param {Object} request - O objeto de solicitação HTTP.
 * @param {Object} response - O objeto de resposta HTTP.
 */
async function adicionar(request, response) {
  const { id_cliente, nome, codigo, id_centro_custo, id_usuario } =
    request.body;

  // Define a consulta SQL para inserir um novo setor
  const query = `INSERT INTO Setores
        ( id_cliente, Codigo, nome, Deleted,id_centro_custo)
        VALUES(@id_cliente, @codigo,@nome,@deleted,@id_centro_custo );
      `;
  const params = {
    id_cliente: id_cliente,
    codigo: codigo,
    nome: nome,
    id_centro_custo: id_centro_custo,
    Deleted: false,
  };

  try {
    // Verifica se o id_cliente foi fornecido
    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado");
      return;
    }

    request = new sql.Request();
    request.input("ID_Cliente", sql.Int, id_cliente);
    request.input("codigo", sql.NVarChar, codigo);
    request.input("nome", sql.VarChar, nome);
    request.input("id_centro_custo", sql.Int, id_centro_custo);
    request.input("Deleted", sql.Bit, false);

    // Executa a consulta de inserção
    const result = await request.query(query);

    // Caso a inserção seja bem-sucedida, retorna resposta positiva
    if (result.rowsAffected[0] > 0) {
      //logQuery('info', `O usuário ${id_usuario} deletou o Centro de Custo ${ID_CentroCusto}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);
      response.status(201).send("Setor criado com sucesso!");
      return;
    } else {
      // Caso a inserção falhe, retorna resposta negativa
      // logQuery('info', `O usuário ${id_usuario} deletou o Centro de Custo ${ID_CentroCusto}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);
      response.status(400).send("Falha ao criar o Setor");
    }
  } catch (error) {
    // Caso ocorra algum erro, exibe o erro no console e retorna erro 500
    console.error("Erro ao adicionar registro:", error.message);
    response.status(500).send("Erro ao adicionar registro");
  }
}

/**
 * Função para atualizar um setor.
 * @param {Object} request - O objeto de solicitação HTTP.
 * @param {Object} response - O objeto de resposta HTTP.
 */
async function atualizar(request, response) {
  const { id_cliente, id_centro_custo, nome, id_setor, codigo, id_usuario } =
    request.body;

  // Define a consulta SQL para atualizar um setor existente
  const query = `UPDATE Setores
  SET 
  id_cliente=@id_cliente,
  id_centro_custo=@id_centro_custo,
  nome=@nome,
  codigo=@codigo
  WHERE id_setor = @id_setor`;
  const params = {
    id_cliente: id_cliente,
    id_centro_custo: id_centro_custo,
    nome: nome,
    codigo: codigo,
    id_setor: id_setor,
  };

  try {
    // Verifica se o id_setor foi fornecido
    if (!id_setor) {
      response.status(400).json("ID do Setor não enviado");
      return;
    }

    request = new sql.Request();
    request.input("ID_Cliente", sql.Int, id_cliente);
    request.input("codigo", sql.NVarChar, codigo);
    request.input("nome", sql.VarChar, nome);
    request.input("id_centro_custo", sql.Int, id_centro_custo);
    request.input("id_setor", sql.Int, id_setor);

    // Executa a consulta de atualização
    const result = await request.query(query);

    // Caso a atualização seja bem-sucedida, retorna resposta positiva
    if (result.rowsAffected[0] > 0) {
      //logQuery('info', `Usuário ${id_usuario} criou um novo Centro de Custo`, 'sucesso', 'INSERT', id_cliente, id_usuario, query, params);
      response.status(200).send("Setor atualizado com sucesso!");
      return;
    } else {
      //logQuery('error', `Usuário ${id_usuario} falhou ao criar Centro de Custo`, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
      response.status(400).send("Falha ao atualizar o  Setor");
    }
  } catch (error) {
    // Caso ocorra algum erro, exibe o erro no console e retorna erro 500
    const errorMessage = error.message.includes(
      "Query não fornecida para logging"
    )
      ? "Erro crítico: Falha na operação"
      : `Erro ao adicionar Centro de Custo: ${error.message}`;
    //logQuery('error', errorMessage, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
    console.error("Erro ao atualizar registro:", error.message);
    response.status(500).send("Erro ao atualizar registro");
  }
}

/**
 * Função para excluir um setor.
 * @param {Object} request - O objeto de solicitação HTTP.
 * @param {Object} response - O objeto de resposta HTTP.
 */
async function deleteFuncao(request, response) {
  let query = "UPDATE Setores SET deleted = 1 WHERE id_setor = @id_setor";
  const id_setor = request.body.id_setor;
  const id_cliente = request.body.id_cliente;
  const id_usuario = request.body.id_usuario;
  const params = {
    id_setor: id_setor,
  };

  try {
    // Verifica se o id_setor foi fornecido
    if (id_setor) {
      const sqlRequest = new sql.Request();
      sqlRequest.input("id_setor", sql.Int, id_setor);

      // Executa a consulta para marcar o setor como deletado
      const result = await sqlRequest.query(query);

      // Caso o setor tenha sido deletado com sucesso, retorna resposta positiva
      if (result.rowsAffected[0] > 0) {
        // logQuery('info', `O usuário ${id_usuario} deletou o Centro de Custo ${id_setor}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);
        response.status(200).json(result.recordset);
      } else {
        //  logQuery('error', `Erro ao excluir: ${id_setor} não encontrado.`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
        response
          .status(400)
          .send("Nenhuma alteração foi feita no centro de custo.");
      }
    }
    response.status(401).json("ID do Setor não foi enviado");
  } catch (error) {
    // Caso ocorra algum erro, exibe o erro no console e retorna erro 500
    console.error("Erro ao excluir:", error.message);
    response.status(500).send("Erro ao excluir");
  }
}

module.exports = {
  adicionar,
  listar,
  atualizar,
  deleteFuncao,
  listarItensSetor,
  adicionarItem,
  listarItensDisponiveisSetor,
  listaSimples,
  deletarProduto,
  atualizarproduto,
};
