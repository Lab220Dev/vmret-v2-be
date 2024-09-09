const sql = require("mssql");
const { format } = require("date-fns");
const { logQuery } = require('../../utils/logUtils')
async function criarRequest() {
  return new sql.Request();
}

async function textoFicha(request, response) {
  try {
    const id_cliente = request.body.id_cliente;

    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado");
      return;
    }

    const query = "SELECT Texto FROM Ficha_Retirada WHERE id_cliente = @id_cliente";

    const requestSql = new sql.Request();
    requestSql.input("id_cliente", sql.Int, id_cliente);
    const result = await requestSql.query(query);

    if (result.recordset.length > 0) {
      response.status(200).json(result.recordset);
    } else {
      response.status(404).json("Texto não encontrado");
    }
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

async function relatorio(request, response) {
  try {
    const { id_dm = "", id_funcionario, data_inicio, data_final, id_cliente } = request.body;

    if (!id_cliente) {
      return response.status(400).json("ID do cliente não enviado");
    }

    let query1 = `
      SELECT
        ri.ProdutoID,
        ri.ProdutoNome,
        ri.ProdutoSKU,
        p.unidade_medida,
        r.Forma_Autenticacao,
        ri.Quantidade,
        r.Dia,
        r.id_dm,
        p.Descricao AS ProdutoDescricao  
      FROM
        Retiradas r
      INNER JOIN
        retirada_itens ri ON r.ID_DM_Retirada = ri.id_retirada
      LEFT JOIN
        Produtos p ON ri.ProdutoID = p.ID_Produto
      LEFT JOIN
        funcionarios f ON r.ID_Funcionario = f.id_funcionario
      WHERE
        r.ID_Cliente = @id_cliente
    `;

    const params = { id_cliente };

    if (id_dm) {
      query1 += " AND r.ID_DM = @id_dm";
      params.id_dm = id_dm;
    }

    if (id_funcionario) {
      query1 += " AND r.ID_Funcionario = @id_funcionario";
      params.id_funcionario = id_funcionario;
    }

    if (data_inicio && data_final) {
      if (new Date(data_inicio) > new Date(data_final)) {
        return response.status(400).json("A data de início não pode ser posterior à data final");
      }
      query1 += " AND r.Dia BETWEEN @data_inicio AND @data_final";
      params.data_inicio = data_inicio;
      params.data_final = data_final;
    } else if (data_inicio) {
      query1 += " AND r.Dia >= @data_inicio";
      params.data_inicio = data_inicio;
    } else if (data_final) {
      query1 += " AND r.Dia <= @data_final";
      params.data_final = data_final;
    }

    console.log("Query:", query1);
    console.log("Params:", params);

    const requestSql = await criarRequest();
    requestSql.input("id_cliente", sql.Int, params.id_cliente);
    if (params.id_dm) requestSql.input("id_dm", sql.Int, params.id_dm);
    if (params.id_funcionario) requestSql.input("id_funcionario", sql.Int, params.id_funcionario);
    if (params.data_inicio) requestSql.input("data_inicio", sql.DateTime, params.data_inicio);
    if (params.data_final) requestSql.input("data_final", sql.DateTime, params.data_final);

    const result = await requestSql.query(query1);

    if (!result.recordset.length) {
      console.warn("Nenhum dado encontrado para os critérios fornecidos.");
      return response.status(404).json("Nenhum dado encontrado");
    }

    const produtosMap = new Map();

    result.recordset.forEach((row) => {
      const { ProdutoID, ProdutoNome, ProdutoSKU, Quantidade, Dia, ProdutoDescricao, Forma_Autenticacao } = row;
      const dataFormatada = format(new Date(Dia), "dd/MM/yyyy - HH:mm");

        produtosMap.set(ProdutoID, {
          ProdutoID,
          ProdutoNome,
          ProdutoSKU,
          Quantidade,
          ProdutoDescricao,
          Forma_Autenticacao,
          Dia: dataFormatada
        });
      }
    );

    const produtosList = Array.from(produtosMap.values());

    return response.status(200).json(produtosList);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}


module.exports = {
  relatorio,
  textoFicha
};
