
const { logQuery } = require("../../utils/logUtils");
const sql = require("mssql");

async function listar(request, response) {
  try {
    const id_cliente = request.body.id_cliente;
    if (id_cliente) {
      const query =
        "SELECT *  FROM Setores WHERE id_cliente = @id_cliente AND Deleted = 0";
      request = new sql.Request();
      request.input("id_cliente", sql.Int, id_cliente);
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

async function listaSimples(request, response) {
  try {
    const id_cliente = request.body.id_cliente;
    if (id_cliente) {
      const query =
        "SELECT id_setor,nome,id_centro_custo  FROM Setores WHERE id_cliente = @id_cliente AND Deleted = 0";
      request = new sql.Request();
      request.input("id_cliente", sql.Int, id_cliente);
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
    const id_cliente = request.body.id_cliente;
    if (id_cliente) {
      const query = `
      SELECT id_produto, nome
      FROM Produtos
      WHERE id_cliente = @id_cliente AND Deleted = 0
    `;
      request = new sql.Request();
      request.input("id_cliente", sql.Int, id_cliente);
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

async function listarItensDisponiveisSetor(request, response) {
  try {
    const id_cliente = request.body.id_cliente;
    const id_setor = request.body.id_setor;
    if (id_cliente) {
      const query = `
      SELECT *
      FROM Ret_Itens_setor
      WHERE id_cliente = @id_cliente AND id_setor = @id_setor AND Deleted = 0
    `;
      request = new sql.Request();
      request.input("id_cliente", sql.Int, id_cliente);
      request.input("id_setor", sql.Int, id_setor);
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

async function adicionarItem(request, response) {
  try {
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

    if (id_cliente && id_produto) {
      const requestDb = new sql.Request();

      // Recupera o SKU, nome e imagem1 do produto
      const queryProduto = `
        SELECT codigo AS sku, nome, imagem1
        FROM Produtos
        WHERE id_produto = @id_produto AND Deleted = 0
      `;
      requestDb.input("id_produto", sql.Int, id_produto);
      requestDb.input("id_cliente", sql.Int, id_cliente);
      requestDb.input("id_setor", sql.Int, id_setor);
      const produtoResult = await requestDb.query(queryProduto);

      if (produtoResult.recordset.length > 0) {
        const { sku, nome: nomeProduto, imagem1 } = produtoResult.recordset[0];

        // Verifica se o item já existe para o setor e cliente
        const queryCheckExistente = `
          SELECT id_item_setor, qtd_limite
          FROM Ret_Itens_setor
          WHERE id_produto = @id_produto AND id_cliente = @id_cliente AND id_setor = @id_setor AND Deleted = 0
        `;
        const checkResult = await requestDb.query(queryCheckExistente);

        if (checkResult.recordset.length > 0) {
          // Item já existe, vamos atualizar a quantidade
          const { id_item_setor } = checkResult.recordset[0];
          //const novaQuantidade = qtd_limite + quantidade; // Somando a quantidade existente com a nova quantidade
          
          const updateQuery = `
            UPDATE Ret_Itens_setor
            SET qtd_limite = @novaQuantidade
            WHERE id_item_setor = @id_item_setor
          `;
          const updateRequest = new sql.Request();
          updateRequest.input("novaQuantidade", sql.Int, quantidade);
          updateRequest.input("id_item_setor", sql.Int, id_item_setor);

          await updateRequest.query(updateQuery);

          response
            .status(200)
            .json({ message: "Quantidade do item atualizada com sucesso" });
        } else {
          // Item não existe, vamos inserir um novo item
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
          insertRequest.input("deleted", sql.Bit, 0); // Ajuste para 0 para false
          insertRequest.input("sku", sql.NVarChar, sku);
          insertRequest.input("nome", sql.NVarChar, nomeProduto);
          insertRequest.input("imagem1", sql.NVarChar, imagem1);
          insertRequest.input("qtd_limite", sql.Int, quantidade);

          await insertRequest.query(insertQuery);

          response.status(201).json({ message: "Item adicionado com sucesso" });
        }
      } else {
        response.status(404).json({ message: "Produto não encontrado" });
      }
      return;
    }

    response
      .status(400)
      .json({ message: "ID do cliente ou ID do produto não enviado" });
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

async function deletarProduto(request, response) {
  try {
    const { id_cliente, id_produto, id_setor } = request.body;

    if (id_cliente && id_produto && id_setor) {
      const requestDb = new sql.Request();

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

      const resultId = await requestDb.query(queryIdItemSetor);

      if (resultId.recordset.length === 0) {
        response.status(404).json({ message: "Item não encontrado no setor" });
        return;
      }

      const id_item_setor = resultId.recordset[0].id_item_setor;

      const updateQuery = `
        UPDATE Ret_Itens_setor
        SET deleted = 1
        WHERE id_item_setor = @id_item_setor
      `;
      requestDb.input("id_item_setor", sql.Int, id_item_setor);

      const result = await requestDb.query(updateQuery);

      if (result.rowsAffected[0] > 0) {
        response
          .status(200)
          .json({ message: "Item marcado como deletado com sucesso" });
      } else {
        response.status(404).json({ message: "Item não encontrado" });
      }
    } else {
      response.status(400).json({
        message:
          "Dados incompletos: id_produto, id_cliente ou id_setor não fornecidos",
      });
    }
  } catch (error) {
    console.error("Erro ao executar a consulta de deleção:", error.message);
    response.status(500).send("Erro ao executar consulta de deleção");
  }
}

async function atualizarproduto(request, response) {
  try {
    const { id_cliente, id_produto, id_setor, qtd_limite } = request.body;

    if (id_cliente && id_produto && id_setor && qtd_limite !== undefined) {
      const requestDb = new sql.Request();

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

      const resultId = await requestDb.query(queryIdItemSetor);

      if (resultId.recordset.length === 0) {
        return response
          .status(404)
          .json({ message: "Item não encontrado no setor" });
      }

      const id_item_setor = resultId.recordset[0].id_item_setor;

      const updateQuery = `
        UPDATE Ret_Itens_setor
        SET qtd_limite = @qtd_limite
        WHERE id_item_setor = @id_item_setor
      `;

      requestDb.input("qtd_limite", sql.Int, qtd_limite);
      requestDb.input("id_item_setor", sql.Int, id_item_setor);

      const result = await requestDb.query(updateQuery);

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
      return response.status(400).json({
        message:
          "Dados incompletos: id_produto, id_cliente, id_setor ou qtd_limite não fornecidos",
      });
    }
  } catch (error) {
    console.error("Erro ao executar a consulta de atualização:", error.message);
    return response
      .status(500)
      .send("Erro ao executar consulta de atualização");
  }
}
async function adicionar(request, response) {
  const { id_cliente, nome, codigo, id_centro_custo, id_usuario } =
    request.body;
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
    const result = await request.query(query);
    if (result.rowsAffected[0] > 0) {
      //logQuery('info', `O usuário ${id_usuario} deletou o Centro de Custo ${ID_CentroCusto}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);

      response.status(201).send("Setor criado com sucesso!");
      return;
    } else {
      // logQuery('info', `O usuário ${id_usuario} deletou o Centro de Custo ${ID_CentroCusto}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);

      response.status(400).send("Falha ao criar o Setor");
    }
  } catch (error) {
    console.error("Erro ao adicionar registro:", error.message);
    response.status(500).send("Erro ao adicionar registro");
  }
}

async function atualizar(request, response) {
  const { id_cliente, id_centro_custo, nome, id_setor, codigo, id_usuario } =
    request.body;
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
    const result = await request.query(query);
    if (result.rowsAffected[0] > 0) {
      //logQuery('info', `Usuário ${id_usuario} criou um novo Centro de Custo`, 'sucesso', 'INSERT', id_cliente, id_usuario, query, params);
      response.status(200).send("Setor atualizado com sucesso!");
      return;
    } else {
      //logQuery('error', `Usuário ${id_usuario} falhou ao criar Centro de Custo`, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
      response.status(400).send("Falha ao atualizar o  Setor");
    }
  } catch (error) {
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
async function deleteFuncao(request, response) {
  const query = "UPDATE Setores SET deleted = 1 WHERE id_setor = @id_setor";
  const id_setor = request.body.id_setor;
  const id_usuario = request.body.id_usuario;

  const params = {
    id_setor: id_setor,
  };
  try {
    if (!id_setor || typeof id_setor !== "number") {
      response.status(400).json("ID do Setor inválido");
      return;
    }

    const sqlRequest = new sql.Request();
    sqlRequest.input("id_setor", sql.Int, id_setor);

    const result = await sqlRequest.query(query);

    if (result.rowsAffected[0] > 0) {
      response.status(200).json(result.recordset);
      return;
    } else {
      response.status(400).send("Nenhuma alteração foi feita no centro de custo.");
      return;
    }
  } catch (error) {
    console.error("Erro ao excluir setor:", error.message);
    response.status(500).send("Erro interno no servidor");
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
