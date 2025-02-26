const sql = require("mssql"); // Importa o módulo `mssql` para execução de consultas SQL no banco de dados.
const { format } = require("date-fns"); // Importa a função `format` de `date-fns` para formatação de datas.
const { logQuery } = require("../../utils/logUtils"); // Importa a função `logQuery` para registrar as consultas executadas.

/**
 * Função que gera um relatório de retiradas, agrupando itens retirados por produto.
 * 
 * @param {Object} request - Objeto de requisição HTTP contendo os parâmetros para a consulta.
 * @param {Object} response - Objeto de resposta HTTP para retornar os resultados ou mensagens de erro.
 * @returns {Promise<void>} - Retorna a resposta com os dados ou erro da consulta.
 */
async function relatorio(request, response) {
  try {
    // Extrai os parâmetros enviados no corpo da requisição.
    const {
      id_dm = "", // ID do DM (opcional)
      id_funcionario = "", // ID do funcionário (opcional)
      data_inicio, // Data de início do filtro (opcional)
      data_final, // Data de final do filtro (opcional)
      id_cliente, // ID do cliente (obrigatório)
      id_usuario, // ID do usuário que está gerando o relatório (obrigatório)
    } = request.body;

    // Verifica se o ID do cliente foi enviado, se não, retorna erro com status 401.
    if (!id_cliente) {
      return response.status(401).json("ID do cliente não enviado");
    }

    // Monta a consulta SQL inicial para buscar as retiradas e itens.
    let query = `
            SELECT 
                ri.ProdutoID,
                ri.ProdutoNome,
                ri.ProdutoSKU,
                ri.Quantidade,
                CONVERT( NVARCHAR,r.Dia,120) AS Dia,
                d.Identificacao
            FROM
                DM_Retiradas r
            INNER JOIN
                DM_Retirada_itens ri ON r.ID_DM_Retirada = ri.id_retirada
            INNER JOIN
                DMs d ON r.id_dm = d.ID_DM 
            LEFT JOIN
                funcionarios f ON r.ID_Funcionario = f.id_funcionario
            WHERE
                r.ID_Cliente = @id_cliente
        `;

    // Cria o objeto de parâmetros para a consulta.
    let params = { id_cliente };

    // Adiciona o filtro para o ID_DM, caso tenha sido enviado.
    if (id_dm) {
      query += " AND r.ID_DM = @id_dm";
      params.id_dm = id_dm;
    }

    // Adiciona o filtro para o ID_Funcionario, caso tenha sido enviado.
    if (id_funcionario) {
      query += " AND r.ID_Funcionario = @id_funcionario";
      params.id_funcionario = id_funcionario;
    }

    // Se tanto data_inicio quanto data_final forem enviados, aplica o filtro entre as duas datas.
    if (data_inicio && data_final) {
      // Verifica se a data de início não é posterior à data final, caso contrário retorna erro 400.
      if (new Date(data_inicio) > new Date(data_final)) {
        return response
          .status(400)
          .json("A data de início não pode ser posterior à data final");
      }
      query += " AND r.Dia BETWEEN @data_inicio AND @data_final";
      params.data_inicio = new Date(data_inicio).toISOString(); // Converte para o formato ISO
      params.data_final = new Date(data_final).toISOString(); // Converte para o formato ISO
    } else if (data_inicio) {
      // Se apenas a data de início for fornecida, filtra as retiradas a partir dessa data.
      query += " AND r.Dia >= @data_inicio";
      params.data_inicio = new Date(data_inicio).toISOString();
    } else if (data_final) {
      // Se apenas a data final for fornecida, filtra as retiradas até essa data.
      query += " AND r.Dia <= @data_final";
      params.data_final = new Date(data_final).toISOString();
    }

    // Cria a requisição SQL e define os parâmetros.
    request = new sql.Request();
    request.input("id_cliente", sql.Int, params.id_cliente); // Define o parâmetro do cliente
    if (params.id_dm) request.input("id_dm", sql.VarChar, id_dm.toString()); // Define o parâmetro DM, se presente
    if (params.id_funcionario)
      request.input("id_funcionario", sql.VarChar, params.id_funcionario.toString()); // Define o parâmetro funcionário, se presente
    if (params.data_inicio)
      request.input("data_inicio", sql.DateTime, params.data_inicio); // Define o parâmetro data_inicio
    if (params.data_final)
      request.input("data_final", sql.DateTime, params.data_final); // Define o parâmetro data_final

    // Executa a consulta e armazena o resultado.
    const result = await request.query(query);

    // Processa os dados retornados pela consulta e agrupa por produto.
    const produtosMap = new Map();

    result.recordset.forEach((row) => {
      const {
        ProdutoID,
        ProdutoNome,
        ProdutoSKU,
        Quantidade,
        Identificacao,
        Dia,
      } = row;
      const dataFormatada = format(new Date(Dia), "dd/MM/yyyy - HH:mm"); // Formata a data para o formato desejado

      // Se o produto ainda não estiver no mapa, inicializa ele com os dados.
      if (!produtosMap.has(ProdutoID)) {
        produtosMap.set(ProdutoID, {
          ProdutoID,
          ProdutoNome,
          ProdutoSKU,
          quantidade_no_periodo: 0, // Inicializa a quantidade acumulada do produto
          Detalhes: [], // Inicializa os detalhes das retiradas
        });
      }

      // Recupera o produto do mapa e atualiza a quantidade total e os detalhes da retirada.
      const produto = produtosMap.get(ProdutoID);
      produto.quantidade_no_periodo += Quantidade;
      produto.Detalhes.push({
        ProdutoID,
        ProdutoNome,
        ProdutoSKU,
        Quantidade,
        Identificacao,
        Data: dataFormatada, // Adiciona a data formatada da retirada
      });
    });

    // Converte o mapa de produtos em um array para envio na resposta.
    const produtosList = Array.from(produtosMap.values());

    // Retorna a lista de produtos agrupados com status 200.
    return response.status(200).json(produtosList);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message); // Loga o erro no console
    response.status(500).send("Erro ao executar consulta"); // Retorna erro 500
  }
}

/**
 * Função para listar os DMs (documentos de movimentação) de um cliente.
 * 
 * @param {Object} request - Objeto de requisição HTTP.
 * @param {Object} response - Objeto de resposta HTTP.
 * @returns {Promise<void>} - Retorna a lista de DMs ou erro.
 */
async function listarDM(request, response) {
  try {
    const id_cliente = request.body.id_cliente; // Extrai o ID do cliente enviado no corpo da requisição.

    // Verifica se o ID do cliente foi enviado.
    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado"); // Retorna erro 401 caso o ID não seja enviado.
      return;
    }

    // Consulta SQL para listar os DMs do cliente.
    const query =
      "SELECT * FROM DMS WHERE ID_Cliente = @id_cliente AND Deleted = 0"; 

    request = new sql.Request();
    request.input("id_cliente", sql.Int, id_cliente);
    const result = await request.query(query); // Executa a consulta.

    // Mapeia o resultado para um formato específico.
    const retiradasfiltradas = result.recordset.map((row) => ({
      ID_DM: row.ID_DM,
      ID_Cliente: row.IDcliente,
      Identificacao: row.Identificacao,
      Numero: row.Numero,
    }));

    // Retorna a lista de DMs com status 200.
    response.status(200).json(retiradasfiltradas);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message); // Loga o erro no console.
    response.status(500).send("Erro ao executar consulta"); // Retorna erro 500.
  }
}

/**
 * Função para listar as plantas associadas a um cliente.
 * 
 * @param {Object} request - Objeto de requisição HTTP.
 * @param {Object} response - Objeto de resposta HTTP.
 * @returns {Promise<void>} - Retorna a lista de plantas ou erro.
 */
async function listarPlanta(request, response) {
  try {
    const id_cliente = request.body.id_cliente;

    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado");
      return;
    }
    const query =
      "SELECT DISTINCT id_planta FROM funcionarios WHERE id_cliente = @id_cliente";

    request = new sql.Request();
    request.input("id_cliente", sql.Int, id_cliente);
    const result = await request.query(query);

    response.status(200).json(result.recordset); // Retorna a lista de plantas com status 200.
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message); 
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para listar os setores associados a um cliente.
 * 
 * @param {Object} request - Objeto de requisição HTTP.
 * @param {Object} response - Objeto de resposta HTTP.
 * @returns {Promise<void>} - Retorna a lista de setores ou erro.
 */
async function listarSetor(request, response) {
  try {
    const id_cliente = request.body.id_cliente;

    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado");
      return;
    }
    const query =
      "SELECT DISTINCT id_setor FROM funcionarios WHERE id_cliente = @id_cliente";

    request = new sql.Request();
    request.input("id_cliente", sql.Int, id_cliente);
    const result = await request.query(query);

    response.status(200).json(result.recordset); 
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para listar cdcs associadas a um cliente.
 * 
 * @param {Object} request - Objeto de requisição HTTP.
 * @param {Object} response - Objeto de resposta HTTP.
 * @returns {Promise<void>} - Retorna a lista de cdcs ou erro.
 */
async function listarCdC(request, response) {
  try {
    const id_cliente = request.body.id_cliente;

    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado");
      return;
    }
    const query =
      "SELECT DISTINCT id_centro_custo FROM funcionarios WHERE id_cliente = @id_cliente";

    request = new sql.Request();
    request.input("id_cliente", sql.Int, id_cliente);
    const result = await request.query(query);

    response.status(200).json(result.recordset);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para listar funcionários associadas a um cliente.
 * 
 * @param {Object} request - Objeto de requisição HTTP.
 * @param {Object} response - Objeto de resposta HTTP.
 * @returns {Promise<void>} - Retorna a lista de funcionários ou erro.
 */
async function listarFuncionario(request, response) {
  try {
    const id_cliente = request.body.id_cliente;

    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado");
      return;
    }
    const query =
      "SELECT DISTINCT ID_FUNCIONARIO, nome FROM funcionarios WHERE id_cliente = @id_cliente";

    request = new sql.Request();
    request.input("id_cliente", sql.Int, id_cliente);
    const result = await request.query(query);
    response.status(200).json(result.recordset);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para listar ultimos itens retirados associadas a um cliente.
 * 
 * @param {Object} request - Objeto de requisição HTTP.
 * @param {Object} response - Objeto de resposta HTTP.
 * @returns {Promise<void>} - Retorna a lista de ultimos itens retirados ou erro.
 */
async function listarUltimos(request, response) {
  const id_cliente = request.body.id_cliente;

  try {
    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado");
      return;
    }
    let query = `
        SELECT TOP 5
    ri.ProdutoID,
    ri.ProdutoNome,
    ri.ProdutoSKU,
    ri.Quantidade,
    r.Dia,
    r.id_dm,
    p.Descricao AS ProdutoDescricao,
    d.Identificacao
FROM
    DM_Retiradas r
INNER JOIN
    DM_Retirada_itens ri ON r.ID_DM_Retirada = ri.id_retirada
INNER JOIN
    DMs d ON r.id_dm = d.ID_DM 
    LEFT join 
    Produtos p ON ri.ProdutoID = p.ID_Produto  
WHERE
    r.ID_Cliente = @id_cliente
ORDER BY
    r.Dia DESC`;

    const request = new sql.Request();
    request.input("id_cliente", sql.Int, id_cliente);
    const result = await request.query(query);

    response.status(200).json(result.recordset);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para listar itens mais ret associadas a um cliente.
 * 
 * @param {Object} request - Objeto de requisição HTTP.
 * @param {Object} response - Objeto de resposta HTTP.
 * @returns {Promise<void>} - Retorna a lista de itens mais ret ou erro.
 */
async function listarMaisRet(request, response) {
  const id_cliente = request.body.id_cliente;

  try {
    if (!id_cliente) {
      response.status(401).json("O ID do cliente não foi enviado");
      return;
    }
    let query = `SELECT Top 5
                ri.ProdutoNome,
                ri.ProdutoSKU,
                COUNT(*) AS NumeroDeRetiradas
            FROM 
                DM_Retirada_Itens ri
            JOIN 
                DM_Retiradas r ON ri.id_retirada = r.id_retirada and  r.ID_DM = ri.ID_DM
            WHERE 
                r.Dia >= DATEADD(MONTH, -6, GETDATE())  
                AND r.ID_Cliente = @id_cliente         
            GROUP BY 
                ri.ProdutoNome, 
                ri.ProdutoSKU
            ORDER BY 
                NumeroDeRetiradas DESC`;
    const request = new sql.Request();
    request.input("id_cliente", sql.Int, id_cliente);
    const result = await request.query(query);

    response.status(200).json(result.recordset);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}
module.exports = {
  relatorio,
  listarDM,
  listarPlanta,
  listarSetor,
  listarCdC,
  listarFuncionario,
  listarUltimos,
  listarMaisRet,
};
