const { logQuery } = require("../../utils/logUtils");
const sql = require("mssql");

async function listar(request, response) {
  try {
    const id_cliente = request.body.id_cliente; //Consulta os dados do corpo da requisição

    if (id_cliente) {
      //se o Id cliente for identificado...
      const query = //faz a execuçao da query
        "SELECT *  FROM Setores WHERE id_cliente = @id_cliente AND Deleted = 0";

      request = new sql.Request(); // Cria uma nova requisição SQL.
      request.input("id_cliente", sql.Int, id_cliente); // Define os parâmetros que serão usados na consulta SQL.

      // Executa a consulta para atualizar a planta.
      const result = await request.query(query);
      response.status(200).json(result.recordset);
      return;
    }
    response.status(401).json("ID do cliente não enviado");
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}
async function listarPaginado(request, response) {
  try {
    const {
      id_cliente,
      first = 0,
      rows = 10,
      sortField = "id",
      sortOrder = "ASC",
      filters = {},
    } = request.body; //Consulta os dados do corpo da requisição

    //se o Id cliente não for identificado...
    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado");
      return;
    }

    const sqlRequest = new sql.Request(); // Cria uma nova requisição SQL.

    // Query inicial
    let query = `
      SELECT 
        COUNT(*) OVER() AS TotalRecords, 
        Setores.*
      FROM 
        Setores
      WHERE 
        id_cliente = @id_cliente AND Deleted = 0
    `;

    sqlRequest.input("id_cliente", sql.Int, id_cliente); // Define os parâmetros que serão usados na consulta SQL.

    if (filters.nome) {
      query += ` AND nome LIKE @nome`;
      sqlRequest.input("nome", sql.NVarChar, `%${filters.nome.value}%`);
    }
    if (filters.codigo) {
      query += ` AND nome LIKE @codigo`;
      sqlRequest.input("codigo", sql.NVarChar, `%${filters.codigo.value}%`);
    }
    if (filters.id_centro_custo) {
      query += ` AND nome LIKE @id_centro_custo`;
      sqlRequest.input("nome", sql.Int, `%${filters.id_centro_custo.value}%`);
    }

    // Ordenação e Paginação
    query += `
      ORDER BY ${sortField} ${sortOrder === "DESC" ? "DESC" : "ASC"}
      OFFSET @first ROWS FETCH NEXT @rows ROWS ONLY;
    `;

    sqlRequest.input("first", sql.Int, first); // Define os parâmetros que serão usados na consulta SQL.

    sqlRequest.input("rows", sql.Int, rows);

    // Executa a consulta
    const result = await sqlRequest.query(query);

    // Extrai os dados paginados e o total de registros
    const setores = result.recordset;
    const totalRecords = setores.length > 0 ? setores[0].TotalRecords : 0;

    // Retorna os dados paginados e o total de registros
    response.status(200).json({ setores, totalRecords });
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

async function listaSimples(request, response) {
  try {
    const id_cliente = request.body.id_cliente; //Consulta os dados do corpo da requisição
    if (id_cliente) {
      const query =
        "SELECT id_setor,nome,id_centro_custo  FROM Setores WHERE id_cliente = @id_cliente AND Deleted = 0";
      request = new sql.Request(); // Cria uma nova requisição SQL.
      request.input("id_cliente", sql.Int, id_cliente); // Define os parâmetros que serão usados na consulta SQL.
      const result = await request.query(query);
      response.status(200).json(result.recordset);
      return;
    }
    response.status(401).json("ID do cliente não enviado");
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

async function listarItensSetor(request, response) {
  try {
    const id_cliente = request.body.id_cliente; //Consulta os dados do corpo da requisição
    if (id_cliente) {
      const query = `
      SELECT id_produto, nome
      FROM Produtos
      WHERE id_cliente = @id_cliente AND Deleted = 0
    `;

      request = new sql.Request(); // Cria uma nova requisição SQL.
      request.input("id_cliente", sql.Int, id_cliente); // Define os parâmetros que serão usados na consulta SQL.
      const result = await request.query(query); // Executa a consulta
      response.status(200).json(result.recordset);
      return;
    }
    response.status(401).json("ID do cliente não enviado");
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

async function listarItensDisponiveisSetor(request, response) {
  try {
    const id_cliente = request.body.id_cliente; //Consulta os dados do corpo da requisição
    const id_setor = request.body.id_setor;
    if (id_cliente) {
      const query = `
      SELECT *
      FROM Ret_Itens_setor
      WHERE id_cliente = @id_cliente AND id_setor = @id_setor AND Deleted = 0
    `;
      request = new sql.Request(); // Cria uma nova requisição SQL.
      request.input("id_cliente", sql.Int, id_cliente); // Define os parâmetros que serão usados na consulta SQL.
      request.input("id_setor", sql.Int, id_setor); // Define os parâmetros que serão usados na consulta SQL.
      const result = await request.query(query); // Executa a consulta
      response.status(200).json(result.recordset);
      return;
    }
    response.status(401).json("ID do cliente não enviado");
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

async function adicionarItem(request, response) {
  try {
    // Desestruturação dos dados do corpo da requisição para utilizar nas consultas
    const {
      id_produto, // ID do produto que está sendo adicionado
      deleted, // Indica se o item está deletado (geralmente 0 para não deletado, 1 para deletado)
      id_centro_custo, // ID do centro de custo
      id_cliente, // ID do cliente para o qual o item está sendo adicionado
      id_setor, // ID do setor que está recebendo o item
      id_usuario, // ID do usuário que está realizando a ação
      ordem, // Ordem do item (não utilizada diretamente, mas pode ser útil para organização)
      quantidade, // Quantidade do produto a ser adicionada
    } = request.body; // Pega os dados enviados no corpo da requisição

    // Verifica se tanto o id_cliente quanto o id_produto foram enviados
    if (id_cliente && id_produto) {
      const requestDb = new sql.Request(); // Cria um novo objeto de requisição SQL para executar as consultas no banco de dados

      // Query SQL para recuperar o SKU, nome e imagem1 do produto baseado no id_produto
      const queryProduto = `
        SELECT codigo AS sku, nome, imagem1
        FROM Produtos
        WHERE id_produto = @id_produto AND Deleted = 0
      `;
      requestDb.input("id_produto", sql.Int, id_produto); // Define o parâmetro id_produto para ser utilizado na consulta SQL
      requestDb.input("id_cliente", sql.Int, id_cliente); // Define o parâmetro id_cliente para ser utilizado na consulta SQL
      requestDb.input("id_setor", sql.Int, id_setor); // Define o parâmetro id_setor para ser utilizado na consulta SQL
      const produtoResult = await requestDb.query(queryProduto); // Executa a consulta SQL e aguarda o resultado

      // Verifica se o produto foi encontrado no banco de dados
      if (produtoResult.recordset.length > 0) {
        const { sku, nome: nomeProduto, imagem1 } = produtoResult.recordset[0]; // Pega os dados do produto retornados pela consulta

        // Query SQL para verificar se o item já existe para o setor e cliente
        const queryCheckExistente = `
          SELECT id_item_setor, qtd_limite
          FROM Ret_Itens_setor
          WHERE id_produto = @id_produto AND id_cliente = @id_cliente AND id_setor = @id_setor AND Deleted = 0
        `;
        const checkResult = await requestDb.query(queryCheckExistente); // Executa a consulta para verificar se o item já existe

        // Se o item já existe, atualiza a quantidade
        if (checkResult.recordset.length > 0) {
          const { id_item_setor } = checkResult.recordset[0]; // Pega o id_item_setor do item encontrado

          // Query SQL para atualizar a quantidade do item
          const updateQuery = `
            UPDATE Ret_Itens_setor
            SET qtd_limite = @novaQuantidade
            WHERE id_item_setor = @id_item_setor
          `;

          const updateRequest = new sql.Request(); // Cria uma nova requisição SQL para atualizar a quantidade
          updateRequest.input("novaQuantidade", sql.Int, quantidade); // Define o parâmetro novaQuantidade
          updateRequest.input("id_item_setor", sql.Int, id_item_setor); // Define o parâmetro id_item_setor para identificar o item

          await updateRequest.query(updateQuery); // Executa a consulta de atualização

          // Retorna uma resposta indicando que a quantidade foi atualizada com sucesso
          response
            .status(200)
            .json({ message: "Quantidade do item atualizada com sucesso" });
        } else {
          // Se o item não existe, cria um novo item no setor
          const queryMaxId = `
            SELECT ISNULL(MAX(id_item_setor), 0) + 1 AS novo_id_item_setor
            FROM Ret_Itens_setor
          `;
          const idResult = await requestDb.query(queryMaxId); // Consulta para obter o próximo ID para o novo item
          const novoIdItemSetor = idResult.recordset[0].novo_id_item_setor; // Pega o novo ID gerado

          // Query SQL para inserir um novo item no setor
          const insertQuery = `
            INSERT INTO Ret_Itens_setor (id_item_setor, id_cliente, id_setor, id_produto, deleted, sku, nome, imagem1, qtd_limite)
            VALUES (@novo_id_item_setor, @id_cliente, @id_setor, @id_produto, @deleted, @sku, @nome, @imagem1, @qtd_limite)
          `;
          const insertRequest = new sql.Request(); // Cria uma nova requisição SQL para inserir o novo item
          insertRequest.input("novo_id_item_setor", sql.Int, novoIdItemSetor); // Define o parâmetro novo_id_item_setor
          insertRequest.input("id_cliente", sql.Int, id_cliente); // Define o parâmetro id_cliente
          insertRequest.input("id_setor", sql.Int, id_setor); // Define o parâmetro id_setor
          insertRequest.input("id_produto", sql.Int, id_produto); // Define o parâmetro id_produto
          insertRequest.input("deleted", sql.Bit, 0); // Define o parâmetro deleted (0 significa que o item não está deletado)
          insertRequest.input("sku", sql.NVarChar, sku); // Define o parâmetro sku
          insertRequest.input("nome", sql.NVarChar, nomeProduto); // Define o parâmetro nome
          insertRequest.input("imagem1", sql.NVarChar, imagem1); // Define o parâmetro imagem1
          insertRequest.input("qtd_limite", sql.Int, quantidade); // Define o parâmetro qtd_limite

          await insertRequest.query(insertQuery); // Executa a consulta de inserção do novo item

          // Retorna uma resposta indicando que o item foi adicionado com sucesso
          response.status(201).json({ message: "Item adicionado com sucesso" });
        }
      } else {
        // Se o produto não for encontrado, retorna um erro 404
        response.status(404).json({ message: "Produto não encontrado" });
      }
      return; // Finaliza a execução da função caso o produto e o item sejam processados corretamente
    }

    // Se o id_cliente ou id_produto não forem fornecidos, retorna erro 400
    response
      .status(400)
      .json({ message: "ID do cliente ou ID do produto não enviado" });
  } catch (error) {
    // Se ocorrer algum erro no bloco try, captura e retorna erro 500
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

async function deletarProduto(request, response) {
  try {
    // Desestruturação dos dados do corpo da requisição para utilização nas consultas
    const { id_cliente, id_produto, id_setor } = request.body; // Obtém os valores de id_cliente, id_produto e id_setor do corpo da requisição

    // Verifica se os três parâmetros necessários foram fornecidos
    if (id_cliente && id_produto && id_setor) {
      const requestDb = new sql.Request(); // Cria uma nova requisição SQL para interagir com o banco de dados

      // Query SQL para encontrar o id_item_setor com base nos parâmetros fornecidos
      const queryIdItemSetor = `
        SELECT id_item_setor
        FROM Ret_Itens_setor
        WHERE id_cliente = @id_cliente
        AND id_produto = @id_produto
        AND id_setor = @id_setor
        AND Deleted = 0
      `;
      // Define os parâmetros para a consulta SQL
      requestDb.input("id_cliente", sql.Int, id_cliente);
      requestDb.input("id_produto", sql.Int, id_produto);
      requestDb.input("id_setor", sql.Int, id_setor);

      // Executa a consulta para encontrar o id_item_setor correspondente
      const resultId = await requestDb.query(queryIdItemSetor);

      // Se não houver resultado, significa que o item não foi encontrado
      if (resultId.recordset.length === 0) {
        response.status(404).json({ message: "Item não encontrado no setor" });
        return; // Interrompe a execução da função caso o item não seja encontrado
      }

      // Se o item for encontrado, pega o id_item_setor
      const id_item_setor = resultId.recordset[0].id_item_setor;

      // Query SQL para marcar o item como deletado (alterando o campo 'deleted' para 1)
      const updateQuery = `
        UPDATE Ret_Itens_setor
        SET deleted = 1
        WHERE id_item_setor = @id_item_setor
      `;
      requestDb.input("id_item_setor", sql.Int, id_item_setor); // Define o parâmetro id_item_setor para a consulta de atualização

      // Executa a consulta de atualização para marcar o item como deletado
      const result = await requestDb.query(updateQuery);

      // Verifica se a atualização foi bem-sucedida, baseado na quantidade de linhas afetadas
      if (result.rowsAffected[0] > 0) {
        // Se o item foi marcado como deletado, retorna um status 200
        response
          .status(200)
          .json({ message: "Item marcado como deletado com sucesso" });
      } else {
        // Se a atualização não afetou nenhuma linha, o item não foi encontrado
        response.status(404).json({ message: "Item não encontrado" });
      }
    } else {
      // Se algum dos parâmetros necessários não foi fornecido, retorna erro 400
      response.status(400).json({
        message:
          "Dados incompletos: id_produto, id_cliente ou id_setor não fornecidos",
      });
    }
  } catch (error) {
    // Se ocorrer algum erro no processo, captura e retorna um erro 500
    console.error("Erro ao executar a consulta de deleção:", error.message);
    response.status(500).send("Erro ao executar consulta de deleção");
  }
}

async function atualizarproduto(request, response) {
  // Função assíncrona para atualizar a quantidade do produto em um setor.
  try {
    // Inicia o bloco de código onde erros serão tratados

    const { id_cliente, id_produto, id_setor, qtd_limite } = request.body; // Extrai os parâmetros do corpo da requisição.

    if (id_cliente && id_produto && id_setor && qtd_limite !== undefined) {
      // Verifica se todos os dados necessários foram fornecidos (cliente, produto, setor e quantidade limite)

      const requestDb = new sql.Request(); // Cria uma nova requisição SQL para executar a consulta no banco de dados.

      const queryIdItemSetor = `
        SELECT id_item_setor
        FROM Ret_Itens_setor
        WHERE id_cliente = @id_cliente
        AND id_produto = @id_produto
        AND id_setor = @id_setor
        AND Deleted = 0
      `;

      // Adiciona os parâmetros para a consulta SQL
      requestDb.input("id_cliente", sql.Int, id_cliente);
      requestDb.input("id_produto", sql.Int, id_produto);
      requestDb.input("id_setor", sql.Int, id_setor);

      // Executa a consulta SQL
      const resultId = await requestDb.query(queryIdItemSetor);

      if (resultId.recordset.length === 0) {
        // Se não encontrar nenhum item do produto no setor
        return response
          .status(404) // Retorna status 404 (não encontrado)
          .json({ message: "Item não encontrado no setor" }); // Retorna uma mensagem informando que o item não foi encontrado
      }

      const id_item_setor = resultId.recordset[0].id_item_setor; // Obtém o ID do item do setor encontrado

      const updateQuery = `
        UPDATE Ret_Itens_setor
        SET qtd_limite = @qtd_limite
        WHERE id_item_setor = @id_item_setor
      `;

      // Adiciona os parâmetros para a consulta SQL
      requestDb.input("qtd_limite", sql.Int, qtd_limite);
      requestDb.input("id_item_setor", sql.Int, id_item_setor);

      // Executa a consulta SQL de atualização
      const result = await requestDb.query(updateQuery);

      if (result.rowsAffected[0] > 0) {
        // Se alguma linha foi afetada pela atualização (significa que houve sucesso)
        return response
          .status(200) // Retorna status 200 (OK)
          .json({ message: "Quantidade atualizada com sucesso" }); // Retorna uma mensagem de sucesso
      } else {
        // Se nenhuma linha foi afetada (não houve atualização)
        return response
          .status(404) // Retorna status 404 (não encontrado)
          .json({ message: "Erro ao atualizar a quantidade" }); // Retorna uma mensagem informando que houve um erro ao atualizar a quantidade
      }
    } else {
      // Caso algum dos dados essenciais não tenha sido fornecido
      return response.status(400).json({
        // Retorna um erro 400 (Bad Request)
        message:
          "Dados incompletos: id_produto, id_cliente, id_setor ou qtd_limite não fornecidos", // Mensagem informando que os dados estão incompletos
      });
    }
  } catch (error) {
    // Caso ocorra um erro durante a execução do código
    console.error("Erro ao executar a consulta de atualização:", error.message); // Exibe o erro no console
    return response
      .status(500) // Retorna um erro 500 (Erro interno do servidor)
      .send("Erro ao executar consulta de atualização"); // Retorna uma mensagem genérica de erro
  }
} // Fim da função

async function adicionar(request, response) {
  const { id_cliente, nome, codigo, id_centro_custo, id_usuario } =
    request.body; //Consulta os dados do corpo da requisição
  const query = `INSERT INTO Setores
        ( id_cliente, Codigo, nome, Deleted,id_centro_custo)
        VALUES(@id_cliente, @codigo,@nome,@deleted,@id_centro_custo );
      `;
  const params = {
    // Define os parâmetros que serão usados na consulta SQL
    id_cliente: id_cliente, // ID do cliente
    codigo: codigo, // Código do setor
    nome: nome, // Nome do setor
    id_centro_custo: id_centro_custo, // ID do centro de custo associado
    Deleted: false, // Marca o setor como não deletado (false)
  };

  try {
    // Inicia o bloco onde serão tratadas exceções

    if (!id_cliente) {
      // Verifica se o 'id_cliente' foi enviado na requisição
      response.status(401).json("ID do cliente não enviado"); // Se não for enviado, retorna erro 401 (não autorizado)
      return; // Interrompe a execução da função se o ID do cliente não for enviado
    }

    request = new sql.Request(); // Cria uma nova instância de uma requisição SQL

    // Adiciona os parâmetros à consulta SQL
    request.input("ID_Cliente", sql.Int, id_cliente);
    request.input("codigo", sql.NVarChar, codigo);
    request.input("nome", sql.VarChar, nome);
    request.input("id_centro_custo", sql.Int, id_centro_custo);
    request.input("Deleted", sql.Bit, false);

    const result = await request.query(query); // Executa a consulta SQL para inserir os dados no banco de dados

    if (result.rowsAffected[0] > 0) {
      // Verifica se o número de linhas afetadas pela consulta é maior que 0 (indicando sucesso)
      //logQuery('info', `O usuário ${id_usuario} deletou o Centro de Custo ${ID_CentroCusto}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);  // Registro de log (comentado)

      response.status(201).send("Setor criado com sucesso!"); // Retorna status 201 (Criado) e mensagem de sucesso
      return; // Interrompe a execução após retornar a resposta
    } else {
      // Caso o número de linhas afetadas seja 0 (indicando falha na criação)
      // logQuery('info', `O usuário ${id_usuario} deletou o Centro de Custo ${ID_CentroCusto}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);  // Registro de log (comentado)

      response.status(400).send("Falha ao criar o Setor"); // Retorna status 400 (Bad Request) e mensagem de erro
    }
  } catch (error) {
    // Captura qualquer erro durante a execução da consulta
    console.error("Erro ao adicionar registro:", error.message); // Exibe o erro no console
    response.status(500).send("Erro ao adicionar registro"); // Retorna status 500 (Erro interno do servidor) e mensagem de erro
  }
} // Fim da função

async function atualizar(request, response) {
  // Desestruturação dos dados do corpo da requisição para utilização nas consultas
  const { id_cliente, id_centro_custo, nome, id_setor, codigo, id_usuario } = request.body; // Obtém os valores de id_cliente, id_centro_custo, nome, id_setor, codigo e id_usuario do corpo da requisição
  
  // Definindo a query SQL para atualizar os dados do setor
  const query = `UPDATE Setores
  SET 
  id_cliente=@id_cliente,
  id_centro_custo=@id_centro_custo,
  nome=@nome,
  codigo=@codigo
  WHERE id_setor = @id_setor`;

  // Parâmetros a serem usados na query SQL
  const params = {
    id_cliente: id_cliente,
    id_centro_custo: id_centro_custo,
    nome: nome,
    codigo: codigo,
    id_setor: id_setor,
  };

  try {
    // Verifica se o id_setor foi fornecido, se não, retorna um erro 400
    if (!id_setor) {
      response.status(400).json("ID do Setor não enviado");
      return;
    }

    // Criação da requisição SQL
    request = new sql.Request();

    // Definindo os parâmetros para a consulta SQL
    request.input("ID_Cliente", sql.Int, id_cliente);
    request.input("codigo", sql.NVarChar, codigo);
    request.input("nome", sql.VarChar, nome);
    request.input("id_centro_custo", sql.Int, id_centro_custo);
    request.input("id_setor", sql.Int, id_setor);

    // Executa a query SQL para atualizar o setor
    const result = await request.query(query);

    // Se a atualização for bem-sucedida, retorna uma resposta com status 200
    if (result.rowsAffected[0] > 0) {
      // Comentado: Aqui você poderia registrar o log de sucesso da operação
      response.status(200).send("Setor atualizado com sucesso!");
      return;
    } else {
      // Comentado: Aqui você poderia registrar o log de falha ao tentar atualizar o setor
      response.status(400).send("Falha ao atualizar o Setor");
    }
  } catch (error) {
    // Trata qualquer erro que ocorrer durante o processo
    const errorMessage = error.message.includes("Query não fornecida para logging")
      ? "Erro crítico: Falha na operação"
      : `Erro ao adicionar Centro de Custo: ${error.message}`;

    // Comentado: Aqui você poderia registrar o log de erro
    console.error("Erro ao atualizar registro:", error.message);
    response.status(500).send("Erro ao atualizar registro"); // Retorna um erro 500 se houver falha na execução
  }
}


async function deleteFuncao(request, response) {
  // Função assíncrona para deletar (marcar como 'deleted') um setor e itens associados.
  const id_setor = request.body.id_setor; // Obtém o 'id_setor' do corpo da requisição.
  const id_usuario = request.body.id_usuario; // Obtém o 'id_usuario' do corpo da requisição (não está sendo utilizado diretamente na função).

  const query = `
  UPDATE Setores SET deleted = 1 WHERE id_setor = @id_setor;
  UPDATE Ret_Itens_setor SET deleted = 1 WHERE id_setor = @id_setor;
  `;

  const params = {
    // Define os parâmetros para a consulta SQL (atualmente não está sendo usado diretamente no código)
    id_setor: id_setor, // Passa o 'id_setor' para ser utilizado na consulta SQL
  };

  try {
    // Inicia o bloco de código onde os erros são tratados

    if (!id_setor || typeof id_setor !== "number") {
      // Verifica se o 'id_setor' foi passado e se é um número válido
      response.status(400).json("ID do Setor inválido"); // Retorna um erro 400 (Bad Request) se o 'id_setor' não for válido
      return; // Interrompe a execução da função se o 'id_setor' for inválido
    }

    const sqlRequest = new sql.Request(); // Cria uma nova instância de uma requisição SQL
    sqlRequest.input("id_setor", sql.Int, id_setor); // Adiciona o parâmetro 'id_setor' à consulta SQL

    const result = await sqlRequest.query(query); // Executa a consulta SQL e aguarda o resultado

    if (result.rowsAffected[0] > 0) {
      // Verifica se alguma linha foi afetada (alterada) pela consulta
      response.status(200).json(result.recordset); // Retorna a resposta com status 200 e os registros alterados (se houverem)
      return; // Interrompe a execução da função após retornar a resposta
    } else {
      // Se nenhuma linha foi afetada pela consulta (por exemplo, o setor não foi encontrado)
      response
        .status(400)
        .send("Nenhuma alteração foi feita no centro de custo."); // Retorna um erro 400 indicando que nenhuma alteração foi realizada
      return; // Interrompe a execução da função
    }
  } catch (error) {
    // Caso ocorra algum erro na execução da consulta
    console.error("Erro ao excluir setor:", error.message); // Exibe o erro no console
    response.status(500).send("Erro interno no servidor"); // Retorna um erro 500 (erro interno do servidor) ao cliente
  }
} // Fim da função

module.exports = {
  adicionar,
  listar,
  listarPaginado,
  atualizar,
  deleteFuncao,
  listarItensSetor,
  adicionarItem,
  listarItensDisponiveisSetor,
  listaSimples,
  deletarProduto,
  atualizarproduto,
};
