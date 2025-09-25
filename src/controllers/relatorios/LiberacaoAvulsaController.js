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
    if (params.data_inicio)
      request.input("data_inicio", sql.DateTime, params.data_inicio); // Define o parâmetro Data_Inicio
    if (params.data_final)
      request.input("data_final", sql.DateTime, params.data_final); // Define o parâmetro Data_Final

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
async function queryLocker(req, res) {
  let id_cliente = req.usuario.id_cliente;
  let query = `
    SELECT DISTINCT c.id_dm, d.Identificacao, COUNT(*) AS total_controladoras
    FROM Controladoras c
    JOIN DMs d ON d.id_dm = c.id_dm
    JOIN cad_locker l ON l.id_dm = c.id_dm
    WHERE c.id_cliente = @id_cliente
      AND c.deleted = 0
      AND d.Ativo = 1
      AND d.deleted = 0
      AND l.deleted = 0
    GROUP BY c.id_dm, d.Identificacao
  `;
  try {
    let request = new sql.Request();
    request.input("id_cliente", sql.Int, id_cliente);
    const result = await request.query(query);
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    res.status(500).send("Erro ao executar consulta");
  }
}

async function queryDIPs(req, res) {
  let id_dm = req.query.id_dm;
  let query = `
SELECT DISTINCT c.Tipo_Controladora, c.DIP 
    FROM Controladoras c
    JOIN cad_locker l ON l.id_dm = c.ID_DM
    WHERE c.ID_DM = @id_dm
      AND c.deleted = 0
      AND l.deleted = 0
    ORDER BY c.DIP
  `;

  try {
    let request = new sql.Request();
    request.input("id_dm", sql.Int, id_dm);
    const result = await request.query(query);
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Erro ao buscar DIPs:", error.message);
    res.status(500).send("Erro ao buscar DIPs");
  }
}

async function lockerItens(req, res) {
  // let id_cliente = req.usuario.id_cliente;
  let id_dm = req.body.id_dm;
  let query = ` select * from dm_itens where id_dm = @id_dm and deleted = 0`;
  try {
    let request = new sql.Request();
    request.input("id_dm", sql.Int, id_dm);
    const result = await request.query(query);
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    res.status(500).send("Erro ao executar consulta");
  }
}

async function requisicoesAvulsas(req, res) {
  const id_cliente = req.usuario.id_cliente;
  const id_dm = req.body.id_dm;

  const query = `
    SELECT * 
    FROM Retiradas_Avulsas
    WHERE 
        id_cliente = @id_cliente AND 
        deleted = 0 AND 
        id_dm = @id_dm AND retirado = 0
  `;

  try {
    let request = new sql.Request();
    request.input("id_cliente", sql.Int, id_cliente);
    request.input("id_dm", sql.Int, id_dm);

    const result = await request.query(query);
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Erro ao buscar requisições avulsas:", error.message);
    res.status(500).send("Erro ao buscar requisições avulsas");
  }
}

async function adicionar(req, res) {
  const { id_dm, modulo, posicao, andar, controladora, requisicao } = req.body;

  // verificar se a requisição já existe e está deleted = 1 para alterar somente o id_dm, modulo, posição, andar e colocar deleted = 0
  const checkQuery = `
  SELECT * FROM Retiradas_Avulsas 
  WHERE codigo_requisicao = @requisicao 
    AND id_cliente = @id_cliente 
    AND deleted = 1
  `;

  const checkRequest = new sql.Request();
  checkRequest.input("requisicao", sql.VarChar, requisicao);
  checkRequest.input("id_cliente", sql.Int, req.usuario.id_cliente);

  const checkResult = await checkRequest.query(checkQuery);
  if (checkResult.recordset.length > 0) {
    const updateQuery = `
    UPDATE Retiradas_Avulsas 
    SET id_dm = @id_dm, modulo = @modulo, posicao = @posicao, andar = @andar, controladora = @controladora, deleted = 0
    WHERE codigo_requisicao = @requisicao 
      AND id_cliente = @id_cliente 
      AND deleted = 1
    `;
    const updateRequest = new sql.Request();
    updateRequest.input("id_dm", sql.Int, id_dm);
    updateRequest.input("id_cliente", sql.Int, req.usuario.id_cliente);
    updateRequest.input("modulo", sql.Int, modulo);
    updateRequest.input("posicao", sql.Int, posicao);
    updateRequest.input("andar", sql.Int, andar);
    updateRequest.input("controladora", sql.VarChar, controladora);
    updateRequest.input("requisicao", sql.VarChar, requisicao);

    await updateRequest.query(updateQuery);

    return res.status(200).json({ message: "Item atualizado com sucesso" });
  }

  try {
    const request = new sql.Request();
    request.input("id_dm", sql.Int, id_dm);
    request.input("id_cliente", sql.Int, req.usuario.id_cliente);
    request.input("modulo", sql.Int, modulo);
    request.input("posicao", sql.Int, posicao);
    request.input("andar", sql.Int, andar);
    request.input("controladora", sql.VarChar, controladora);
    request.input("requisicao", sql.VarChar, requisicao);

    const query = `
      INSERT INTO Retiradas_Avulsas (id_dm, id_cliente, modulo, posicao, andar, controladora, codigo_requisicao)
      VALUES (@id_dm, @id_cliente, @modulo, @posicao, @andar, @controladora, @requisicao)
    `;

    await request.query(query);

    return res.status(201).json({ message: "Item adicionado com sucesso" });
  } catch (error) {
    console.error("Erro ao adicionar item:", error.message);
    return res.status(500).json({ error: "Erro ao adicionar item" });
  }
}

async function listarPosicoes(req, res) {
  const { id_dm, dips } = req.body;

  if (!id_dm || !dips || dips.length === null) {
    return res.status(400).send("Parâmetros inválidos");
  }

  try {
    const request = new sql.Request();
    request.input("id_dm", sql.Int, id_dm);

    let filtros = dips
      .map((d, i) => {
        if (d.tipo === "2018") {
          request.input(`tipo${i}`, sql.VarChar, d.tipo);
          return `(c.Tipo_Controladora = @tipo${i})`; // sem DIP
        } else {
          request.input(`tipo${i}`, sql.VarChar, d.tipo);
          request.input(`dip${i}`, sql.Int, d.dip);
          return `(c.Tipo_Controladora = @tipo${i} AND c.DIP = @dip${i})`;
        }
      })
      .join(" OR ");

    const query = `
      SELECT c.Andar, c.Posicao, c.Placa, c.Mola1
      FROM Controladoras c
      JOIN cad_locker l ON l.id_dm = c.id_dm
      WHERE c.Deleted = 0
        AND l.deleted = 0
        AND c.id_dm = @id_dm
        AND (${filtros})
      ORDER BY 
        CASE 
          WHEN c.Tipo_Controladora = '2023' THEN CAST(c.Andar AS INT) 
          ELSE 0 
        END,
        CAST(c.Posicao AS INT)
    `;

    const result = await request.query(query);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Erro ao listar posições:", error.message);
    res.status(500).send("Erro ao listar posições");
  }
}
async function excluirRequisicao(req, res) {
  const { requisicao, id_dm } = req.body;
  const id_cliente = req.usuario.id_cliente;

  if (!requisicao || !id_dm || !id_cliente) {
    return res.status(400).json({ error: "Parâmetros obrigatórios ausentes" });
  }

  try {
    const request = new sql.Request();
    request.input("requisicao", sql.VarChar, requisicao);
    request.input("id_dm", sql.Int, id_dm);
    request.input("id_cliente", sql.Int, id_cliente);

    const query = `
      UPDATE Retiradas_Avulsas
      SET deleted = 1
      WHERE 
        codigo_requisicao = @requisicao AND 
        id_dm = @id_dm AND 
        id_cliente = @id_cliente
    `;

    const result = await request.query(query);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "Requisição não encontrada" });
    }

    return res.status(200).json({ message: "Requisição excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir requisição:", error.message);
    return res.status(500).json({ error: "Erro ao excluir requisição" });
  }
}
// Exporta a função relatorio para que ela possa ser utilizada em outras partes da aplicação.
module.exports = {
  relatorio, // Exporta a função relatorio
  queryLocker,
  queryDIPs,
  lockerItens,
  requisicoesAvulsas,
  adicionar, // Exporta a função para adicionar
  listarPosicoes, // Exporta a função para listar posições
  excluirRequisicao,
};
