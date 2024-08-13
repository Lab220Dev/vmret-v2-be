const sql = require("mssql");
const { format } = require("date-fns");
const { logQuery } = require('../../utils/logUtils');

async function obterProximoIdItem() {
  const sqlRequest = new sql.Request();
  const query = `SELECT ISNULL(MAX(id_item), 0) + 1 AS NextIdItem FROM DM_itens`;
  const result = await sqlRequest.query(query);
  return result.recordset[0].NextIdItem;
}
async function listarDM(request, response) {
  try {
    const id_cliente = request.body.id_cliente;

    if (!id_cliente) {
      const query =
        "SELECT *  FROM DMS WHERE Deleted = 0";
      request = new sql.Request();
      const result = await request.query(query);
      response.status(200).json(result.recordset);
      return;
    }
    const query =
      "SELECT *  FROM DMS WHERE IDcliente = @id_cliente AND Deleted = 0";

    request = new sql.Request();
    request.input("id_cliente", sql.Int, id_cliente);
    const result = await request.query(query);
    response.status(200).json(result.recordset);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

async function adicionar(request, response) {
  const { id_cliente, numero, identificação, ativo,
    voucher, facial, senha, biometria, integracao, userID, ClienteID, chave, id_usuario } = request.body;
  const query = `INSERT INTO DMs ( IDcliente, Numero, Identificacao, Ativo, Deleted, Created, 
    Updated, Versao, Enviada, OP_Senha, OP_Biometria, OP_Facial, Integracao, ClienteID, UserID, Chave)
    Values (@IDcliente, @Numero, @Identificacao, @Ativo, @Deleted, @Created, @Updated, @Versao, @Enviada,
    @OP_Senha, @OP_Biometria, @OP_Facial, @Integracao, @Integracao, @ClienteID, @UserID,@Chave)`;

  const params = {
    IDcliente: id_cliente,
    Numero: Numero,
    Identificacao: convertToBoolean(identificação),
    Ativo: convertToBoolean(ativo),
    Deleted: false,
    Created: new Date(),
    Updated: '1900-01-01 00:00:00.000',
    Versao: 1,
    Enviada: false,
    OP_Senha: convertToBoolean(senha),
    OP_Biometria: convertToBoolean(biometria),
    OP_Facial: convertToBoolean(facial),
    Integracao: convertToBoolean(integracao),
    ClienteID: ClienteID,
    UserID: userID,
    Chave: chave
  };
  try {
    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado");
      return;
    }


    request = new sql.Request();
    request.input('IDcliente', sql.VarChar, id_cliente);
    request.input('Numero', sql.VarChar, numero);
    request.input('Identificacao', sql.Bit, convertToBoolean(identificação));
    request.input('Ativo', sql.Bit, convertToBoolean(ativo));
    request.input('Deleted', sql.Bit, false);
    request.input('Created', sql.DateTime, new Date());
    request.input('Updated', sql.DateTime, '1900-01-01 00:00:00.000');
    request.input('Versao', sql.Int, 1);
    request.input('Enviada', sql.Bit, false);
    request.input('OP_Senha', sql.Bit, convertToBoolean(senha));
    request.input('OP_Biometria', sql.Bit, convertToBoolean(biometria));
    request.input('OP_Facial', sql.Bit, convertToBoolean(facial));
    request.input('Integracao', sql.Bit, convertToBoolean(integracao));
    request.input('ClienteID', sql.DateTime, ClienteID);
    request.input('UserID', sql.DateTime, userID);
    request.input('Chave', sql.NVarChar, chave);
    request = new sql.Request();

    const result = await request.query(query);
    if (result.rowsAffected[0] > 0) {
      logQuery('info', `Usuário ${id_usuario} criou um novo Centro de Custo`, 'sucesso', 'INSERT', id_cliente, id_usuario, query, params);
      response.status(201).send('Centro de Custo criado com sucesso!');
    } else {
      logQuery('error', `Usuário ${id_usuario} falhou ao criar Centro de Custo`, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
      response.status(400).send('Falha ao criar o Centro de Custo');
    }
  } catch (error) {
    const errorMessage = error.message.includes('Query não fornecida para logging')
      ? 'Erro crítico: Falha na operação'
      : `Erro ao adicionar Centro de Custo: ${error.message}`;
    logQuery('error', errorMessage, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
    console.error('Erro ao adicionar registro:', error.message);
    response.status(500).send('Erro ao adicionar Centro de Custo');
  }


}

async function listarItensDM(request, response) {
  try {
    const id_dm = request.body.id_dm;
    if (id_dm) {
      const query =
        "SELECT *  FROM DM_Itens WHERE Deleted = 0 AND ID_DM = @id_dm";
      request = new sql.Request();
      request.input('id_dm', sql.Int, id_dm);
      const result = await request.query(query);
      const itensFiltrados = result.recordset.map(row => ({
        id_item: row.id_item,
        SKU: row.sku,
        Nome_Produto: row.nome,
        QTD: row.quantidade,
        Posicao: `${row.Controladora} / ${row.Placa} / ${row.Motor1}/ ${row.Motor2}`
      }));
      response.status(200).json(itensFiltrados);
      return;
    }
    response.status(401).json("id da DM não enviado");
    return;
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}
async function adicionarItensDM(request, response) {
  const { id_produto, Porta, Motor1, Motor2, id_cliente, id_dm, Controladora, id_usuario } = request.body;
  const { nome, ProdutoCodigo, sku, unidade_medida, imagem1, quantidademinima, ca, capacidade } = produto;

  const insertQuery = `INSERT INTO DM_itens (id_item,id_cliente, ID_DM, id_produto,Controladora, Placa, Motor1, Motor2, 
  DIP, Andar, Posicao, quantidade,quantidademinima, capacidade, deleted,nome, ProdutoCodigo, sku, 
  unidade_medida, imagem1,ca)
 VALUES (@id_item,@id_cliente, @ID_DM, @id_produto,@Controladora, @Placa, @Motor1, @Motor2,@DIP,@Andar,@Posicao,
 @quantidade,@quantidademinima,@capacidade,@deleted, @nome, @ProdutoCodigo, @sku, 
 @unidade_medida, @imagem1, @ca)`;

  try {
    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado");
      return;
    }
    const sqlRequest = new sql.Request();
    const produtoQuery = `SELECT nome, codigo AS ProdutoCodigo, codigo AS sku, unidade_medida, imagem1, quantidademinima, ca, capacidade
                          FROM produtos
                          WHERE id_produto = @id_produto`;
    sqlRequest.input('id_produto', sql.Int, id_produto);
    const produtoResult = await sqlRequest.query(produtoQuery);

    if (produtoResult.recordset.length === 0) {
      response.status(404).json("Produto não encontrado");
      return;
    }

    const produto = produtoResult.recordset[0];
    const nextIdItem = await obterProximoIdItem();

    const sqlRequest2 = new sql.Request();
    const params = {
      id_item: nextIdItem,
      id_cliente: id_cliente,
      ID_DM: id_dm,
      id_produto: id_produto,
      Controladora: Controladora,
      Placa: Porta,
      Motor1: Motor1,
      Motor2: Motor2,
      DIP: null,
      Andar: null,
      Posicao: null,
      quantidade: 0,
      capacidade: capacidade,
      deleted: false,
      nome: nome,
      ProdutoCodigo: ProdutoCodigo,
      sku: sku,
      unidade_medida: unidade_medida,
      imagem1: imagem1,
      ca: ca,
      quantidademinima: quantidademinima
    };
    sqlRequest2.input('id_item', sql.Int, nextIdItem);
    sqlRequest2.input('id_cliente', sql.Int, id_cliente);
    sqlRequest2.input('ID_DM', sql.Int, id_dm);
    sqlRequest2.input('id_produto', sql.Int, id_produto);
    sqlRequest2.input('Controladora', sql.Int, Controladora);
    sqlRequest2.input('Placa', sql.Int, Porta);
    sqlRequest2.input('Motor1', sql.Int, Motor1);
    sqlRequest2.input('Motor2', sql.Int, Motor2);
    sqlRequest2.input('DIP', sql.Int, null);
    sqlRequest2.input('Andar', sql.Int, null);
    sqlRequest2.input('Posicao', sql.Int, null);
    sqlRequest2.input('quantidade', sql.Int, 0);
    sqlRequest2.input('capacidade', sql.Int, capacidade);
    sqlRequest2.input('deleted', sql.Bit, false);
    sqlRequest2.input('nome', sql.NVarChar, nome);
    sqlRequest2.input('ProdutoCodigo', sql.NVarChar, ProdutoCodigo);
    sqlRequest2.input('sku', sql.NVarChar, sku);
    sqlRequest2.input('unidade_medida', sql.NVarChar, unidade_medida);
    sqlRequest2.input('imagem1', sql.NVarChar, imagem1);
    sqlRequest2.input('ca', sql.NVarChar, ca);
    sqlRequest2.input('quantidademinima', sql.Int, quantidademinima);

    const insertResult = await sqlRequest2.query(insertQuery);
    if (insertResult.rowsAffected[0] > 0) {
      logQuery('info', `Usuário ${id_usuario} criou um novo Centro de Custo`, 'sucesso', 'INSERT', id_cliente, id_usuario, insertQuery, params);
      response.status(201).send("Item DM criado com sucesso!");
    } else {
      logQuery('error',  `Usuário ${id_usuario} falhou ao criar Centro de Custo`, 'falha', 'INSERT', id_cliente, id_usuario, insertQuery, params);
      response.status(400).send("Falha ao criar o item DM!");
    }
  } catch (error) {
    const errorMessage = error.message.includes('Query não fornecida para logging') 
      ? 'Erro crítico: Falha na operação'
      : `Erro ao adicionar Centro de Custo: ${error.message}`;
    logQuery('error',  errorMessage, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
    console.error('Erro ao executar a consulta:', error);
    response.status(500).send("Erro interno do servidor");
  }
}

async function deletarItensDM(request, response) {
  const id_item = request.body.id_item;
  const id_usuario = request.body.id_usuario;
  const id_cliente = request.body.id_cliente;
  const query = "UPDATE DM_Itens SET deleted = 1 WHERE id_item = @id_item";
  const params = {
    id_item: id_item
  };
  try {
    if (!id_item) {
      response.status(401).json("ID do item não enviado");
      return;
    }
    const sqlRequest = new sql.Request();
    sqlRequest.input('id_item', sql.Int, id_item);
    const result = await sqlRequest.query(query);

    if (result.rowsAffected[0] > 0) {
      logQuery('info', `O usuário ${id_usuario} deletou o Centro de Custo ${id_item}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);
      response.status(200).json({ message: "Item excluído com sucesso" });
    } else {
      logQuery('error', `Erro ao excluir: ${id_item} não encontrado.`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
      response.status(404).json({ error: "Item não encontrado" });
    }

  } catch (error) {
    logQuery('error', `${error.message}`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}


module.exports = {
  adicionar, listarDM, listarItensDM, adicionarItensDM, deletarItensDM
}