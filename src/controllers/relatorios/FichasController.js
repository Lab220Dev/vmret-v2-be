const sql = require("mssql");
const { format } = require("date-fns");

async function criarRequest() {
  return new sql.Request();
}

async function relatorio(request, response) {
  try {
    const { id_dm = "", id_funcionario, data_inicio, data_final, id_cliente } = request.body;

    if (!id_cliente) {
      return response.status(401).json("ID do cliente não enviado");
    }

    let query = `
      SELECT
    ri.ProdutoID,
    ri.ProdutoNome,
    ri.ProdutoSKU,
    ri.Quantidade,
    r.Dia,
    r.id_dm,
    fr.Texto AS TextoFicha,
    p.Descricao AS ProdutoDescricao  
FROM
    Retiradas r
INNER JOIN
    retirada_itens ri ON r.ID_DM_Retirada = ri.id_retirada
LEFT JOIN
    Produtos p ON ri.ProdutoID = p.ID_Produto
    LEFT JOIN
        funcionarios f ON r.ID_Funcionario = f.id_funcionario
      LEFT JOIN
        Ficha_Retirada fr ON r.ID_Cliente = fr.id_cliente
WHERE
    r.ID_Cliente = @id_cliente
    AND (r.ID_Funcionario = @id_funcionario)
    AND (p.ID_Planta = @id_planta)
    `;

    let params = { id_cliente };

    if (id_dm) {
      query += " AND r.ID_DM = @id_dm";
      params.id_dm = id_dm;
    }

    if (id_funcionario) {
      query += " AND r.ID_Funcionario = @id_funcionario";
      params.id_funcionario = id_funcionario;
    }

    if (data_inicio && data_final) {
      if (new Date(data_inicio) > new Date(data_final)) {
        return response.status(400).json("A data de início não pode ser posterior à data final");
      }
      query += " AND r.Dia BETWEEN @data_inicio AND @data_final";
      params.data_inicio = new Date(data_inicio).toISOString();
      params.data_final = new Date(data_final).toISOString();
    } else if (data_inicio) {
      query += " AND r.Dia >= @data_inicio";
      params.data_inicio = new Date(data_inicio).toISOString();
    } else if (data_final) {
      query += " AND r.Dia <= @data_final";
      params.data_final = new Date(data_final).toISOString();
    }

    const requestSql = await criarRequest();
    requestSql.input("id_cliente", sql.Int, params.id_cliente);
    if (params.id_dm) requestSql.input("id_dm", sql.VarChar, id_dm.toString());
    if (params.id_funcionario) requestSql.input("id_funcionario", sql.VarChar, params.id_funcionario);
    if (params.data_inicio) requestSql.input("data_inicio", sql.DateTime, params.data_inicio);
    if (params.data_final) requestSql.input("data_final", sql.DateTime, params.data_final);

    const result = await requestSql.query(query);

    // Processar os dados retornados
    const produtosMap = new Map();

    result.recordset.forEach((row) => {
      const { ProdutoID, ProdutoNome, ProdutoSKU, Quantidade, Dia, TextoFicha } = row;
      const dataFormatada = format(new Date(Dia), "dd/MM/yyyy - HH:mm");

      if (!produtosMap.has(ProdutoID)) {
        produtosMap.set(ProdutoID, {
          ProdutoID,
          ProdutoNome,
          ProdutoSKU,
          quantidade_no_periodo: 0,
          TextoFicha, // Adiciona o texto da ficha ao mapeamento
          Detalhes: [],
        });
      }

      const produto = produtosMap.get(ProdutoID);
      produto.quantidade_no_periodo += Quantidade;
      produto.Detalhes.push({
        ProdutoID,
        ProdutoNome,
        ProdutoSKU,
        Quantidade,
        Data: dataFormatada,
      });
    });

    const produtosList = Array.from(produtosMap.values());

    return response.status(200).json(produtosList);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

module.exports = {
  relatorio,
};