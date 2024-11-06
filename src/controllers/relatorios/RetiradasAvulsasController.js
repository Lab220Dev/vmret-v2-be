const sql = require("mssql");
const { logQuery } = require("../../utils/logUtils");

async function relatorio(request, response) {
  try {
    const {
      id_dm = "",
      id_setor = "",
      id_planta = "",
      id_funcionario = "",
      data_inicio,
      data_final,
      id_cliente,
      id_usuario,
    } = request.body;

    if (!id_cliente) {
      return response.status(401).json("ID do cliente não enviado");
    }

    let query = `
            SELECT  
                r.ID_DM AS DM,
                r.Dia AS Data,
                f.matricula AS Matricula,
                r.Autenticacao AS Voucher,
                f.nome AS Nome,
                f.email AS Email,
                CONCAT(p.codigo, '/', p.ca) AS CodigoCa,
                ri.ProdutoNome AS Item
            FROM
                Retiradas r
            INNER JOIN
                retirada_itens ri ON r.ID_DM_Retirada = ri.id_retirada
            LEFT JOIN
                funcionarios f ON r.ID_Funcionario = f.id_funcionario
            LEFT JOIN
                produtos p ON ri.ProdutoID = p.id_produto
            WHERE
                r.ID_Cliente = @id_cliente
                AND r.Forma_Autenticacao = 'Avulsa'
        `;

    let params = { id_cliente };

    if (id_dm) {
      query += " AND r.ID_DM = @id_dm";
      params.id_dm = id_dm;
    }
    if (id_setor) {
      query += " AND r.ID_Setor = @id_setor";
      params.id_setor = id_setor;
    }
    if (id_planta) {
      query += " AND r.ID_Planta = @id_planta";
      params.id_planta = id_planta;
    }
    if (id_funcionario) {
      query += " AND r.ID_Funcionario = @id_funcionario";
      params.id_funcionario = id_funcionario;
    }

    if (data_inicio && data_final) {
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

    request = new sql.Request();
    request.input("id_cliente", sql.Int, params.id_cliente);
    if (params.id_dm)
      request.input("id_dm", sql.VarChar, params.id_dm.toString());
    if (params.id_setor)
      request.input("id_setor", sql.VarChar, params.id_setor);
    if (params.id_planta)
      request.input("id_planta", sql.VarChar, params.id_planta);
    if (params.id_funcionario)
      request.input("id_funcionario", sql.VarChar, params.id_funcionario);
    if (params.data_inicio)
      request.input("data_inicio", sql.DateTime, params.data_inicio);
    if (params.data_final)
      request.input("data_final", sql.DateTime, params.data_final);

    const result = await request.query(query);

    const retiradasfiltradas = result.recordset.map((row) => ({
      DM: row.DM,
      Data: format(new Date(row.Data), "dd/MM/yyyy - HH:mm"),
      Matricula: row.Matricula,
      Voucher: row.Voucher,
      Nome: row.Nome,
      Email: row.Email,
      CodigoCa: row.CodigoCa,
      Item: row.Item,
    }));

    // Log de sucesso na geração do relatório
    logQuery(
      "info",
      `Usuário ${id_usuario} gerou um relatório de retiradas avulsas`,
      "sucesso",
      "Relatório",
      id_cliente,
      id_usuario,
      query,
      params
    );

    return response.status(200).json(retiradasfiltradas);
  } catch (error) {
    // Log de falha ao gerar o relatório
    logQuery(
      "error",
      `Erro ao gerar o relatório para o usuário ${id_usuario}: ${error.message}`,
      "falha",
      "Relatório",
      id_cliente,
      id_usuario,
      query,
      {}
    );

    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

module.exports = {
  relatorio,
};
