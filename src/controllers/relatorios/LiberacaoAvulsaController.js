const sql = require("mssql");
const { format } = require("date-fns");

async function relatorio(request, response) {
    try {
      const {
        id_dm = "",
        id_funcionario = "",
        data_inicio,
        data_final,
        id_cliente,
        voucher,
        id_usuario
      } = request.body;
  
      if (!id_cliente) {
        return response.status(401).json("ID do cliente não enviado");
      }
  
      let query = `
              SELECT 
                 *
              FROM
                  Retirada_Avulsa ra
          `;
  
      let params = { id_cliente };
  
      if (id_dm) {
        query += " AND r.ID_DM = @id_dm";
        params.id_dm = id_dm;
      }
  
    //   if (id_funcionario) {
    //     query += " AND r.ID_Funcionario = @id_funcionario";
    //     params.id_funcionario = id_funcionario;
    //   }
  
      if (data_inicio && data_final) {
        // Se o usuário enviar data_inicio e data_final
        if (new Date(data_inicio) > new Date(data_final)) {
          return response.status(400).json("A data de início não pode ser posterior à data final");
        }
        query += " AND r.Dia BETWEEN @data_inicio AND @data_final";
        params.data_inicio = new Date(data_inicio).toISOString();
        params.data_final = new Date(data_final).toISOString();
      } else if (data_inicio) {
        // Se o usuário enviar apenas a data_inicio
        query += " AND r.Dia >= @data_inicio";
        params.data_inicio = new Date(data_inicio).toISOString();
      } else if (data_final) {
        // Se o usuário enviar apenas a data_final
        query += " AND r.Dia <= @data_final";
        params.data_final = new Date(data_final).toISOString();
      }
  
      request = new sql.Request();
      request.input("id_cliente", sql.Int, params.id_cliente);
      if (params.id_dm) request.input("id_dm", sql.VarChar, id_dm.toString());
    //   if (params.id_funcionario)
    //     request.input("id_funcionario", sql.VarChar, params.id_funcionario);
      if (params.data_inicio)
        request.input("data_inicio", sql.DateTime, params.data_inicio);
      if (params.data_final)
        request.input("data_final", sql.DateTime, params.data_final);
  
      const result = await request.query(query);
  
      // Processar os dados retornados
      const produtosMap = new Map();
  
      result.recordset.forEach((row) => {
        const { ProdutoID, ProdutoNome, ProdutoSKU, Quantidade, Dia } = row;
        const dataFormatada = format(new Date(Dia), "dd/MM/yyyy - HH:mm");
  
        if (!produtosMap.has(ProdutoID)) {
          produtosMap.set(ProdutoID, {
            ProdutoID,
            ProdutoNome,
            ProdutoSKU,
            quantidade_no_periodo: 0,
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
    relatorio
  }