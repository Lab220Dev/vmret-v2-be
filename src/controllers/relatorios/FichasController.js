const sql = require("mssql");
const { format } = require("date-fns");
const PDFDocument = require('pdfkit');

async function criarRequest() {
  return new sql.Request();
}

async function gerarPDF(request, response) {
  try {
    const id_cliente = request.body.id_cliente;
    
    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado");
      return;
    }

    let query = `
      SELECT
        ri.ProdutoID,
        ri.ProdutoNome,
        ri.ProdutoSKU,
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
      WHERE
        r.ID_Cliente = @id_cliente
        AND (r.ID_Funcionario = @id_funcionario)
        AND (p.ID_Planta = @id_planta)
      ORDER BY
        r.Dia DESC
    `;

    const requestSql = await criarRequest();
    requestSql.input('id_cliente', sql.Int, id_cliente);
    const result = await requestSql.query(query);
    const retiradas = result.recordset;

    // Configurar o PDF
    const doc = new PDFDocument();
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
        let pdfData = Buffer.concat(buffers);
        response.writeHead(200, {
            'Content-Length': Buffer.byteLength(pdfData),
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment;filename=relatorio.pdf',
        }).end(pdfData);
    });

    // Adicionar conteúdo ao PDF
    doc.fontSize(16).text('Relatório de Fichas', { align: 'center' });
    doc.moveDown();

    retiradas.forEach(retirada => {
        doc.fontSize(12).text(`ID Retirada: ${retirada.ID_Retirada}`);
        doc.text(`Data: ${new Date(retirada.Dia).toLocaleDateString()}`);
        doc.text(`Produto: ${retirada.ProdutoNome}`);
        doc.text(`Quantidade: ${retirada.Quantidade}`);
        doc.text(`Funcionário: ${retirada.nome} (Matrícula: ${retirada.matricula})`);
        doc.moveDown();
    });

    doc.end();

  } catch (error) {
    console.error('Erro ao gerar PDF:', error.message);
    response.status(500).send('Erro ao gerar PDF');
  }
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
        r.Dia
      FROM
        Retiradas r
      INNER JOIN
        retirada_itens ri ON r.ID_DM_Retirada = ri.id_retirada
      LEFT JOIN
        funcionarios f ON r.ID_Funcionario = f.id_funcionario
      WHERE
        r.ID_Cliente = @id_cliente
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

async function listarPlanta(request, response) {
  try {
    const id_cliente = request.body.id_cliente;

    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado");
      return;
    }
    const query = "SELECT DISTINCT id_planta FROM funcionarios WHERE id_cliente = @id_cliente";

    const requestSql = await criarRequest();
    requestSql.input("id_cliente", sql.Int, id_cliente);
    const result = await requestSql.query(query);

    response.status(200).json(result.recordset);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

async function listarFuncionario(request, response) {
  try {
    const id_cliente = request.body.id_cliente;

    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado");
      return;
    }
    const query = "SELECT DISTINCT ID_FUNCIONARIO, nome FROM funcionarios WHERE id_cliente = @id_cliente";

    const requestSql = await criarRequest();
    requestSql.input("id_cliente", sql.Int, id_cliente);
    const result = await requestSql.query(query);
    response.status(200).json(result.recordset);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

module.exports = {
  gerarPDF,
  listarPlanta,
  listarFuncionario,
  relatorio
};