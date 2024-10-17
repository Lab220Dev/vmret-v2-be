const sql = require("mssql");

async function obterProximoIdItem() {
  const sqlRequest = new sql.Request();
  const query = `SELECT ISNULL(MAX(id_item), 0) + 1 AS NextIdItem FROM DM_itens`;
  const result = await sqlRequest.query(query);
  return result.recordset[0].NextIdItem;
}
const listarDM = async (request, response) => {
  try {
    const id_cliente = request.body.id_cliente;

    let query;
    let sqlRequest = new sql.Request();

    if (!id_cliente) {
      query = `
        SELECT 
          DMS.*, 
          Controladoras.ID as ControladoraID, 
          Controladoras.Tipo_Controladora, 
          Controladoras.Placa, 
          Controladoras.DIP, 
          Controladoras.Andar, 
          Controladoras.Posicao, 
          Controladoras.Mola1, 
          Controladoras.Mola2
        FROM 
          DMS
        LEFT JOIN 
          Controladoras 
        ON 
          DMS.ID_DM = Controladoras.ID_DM
        WHERE 
          DMS.Deleted = 0`;
    } else {
      query = `
        SELECT 
          DMS.*, 
          Controladoras.ID as ControladoraID, 
          Controladoras.Tipo_Controladora, 
          Controladoras.Placa, 
          Controladoras.DIP, 
          Controladoras.Andar, 
          Controladoras.Posicao, 
          Controladoras.Mola1, 
          Controladoras.Mola2
        FROM 
          DMS
        LEFT JOIN 
          Controladoras 
        ON 
          DMS.ID_DM = Controladoras.ID_DM
        WHERE 
          DMS.ID_Cliente = @id_cliente 
          AND DMS.Deleted = 0`;

      sqlRequest.input("id_cliente", sql.Int, id_cliente);
    }

    const result = await sqlRequest.query(query);

    // Agrupa as DMs com suas respectivas controladoras
    const dmsMap = new Map();
    result.recordset.forEach(row => {
      const dmId = row.ID_DM;
      if (!dmsMap.has(dmId)) {
        dmsMap.set(dmId, {
          ...row,
          Controladoras: []
        });
      }

      if (row.ControladoraID) {
        let controladoraExistente;

        if (row.Tipo_Controladora === '2023'||row.Tipo_Controladora === 'Locker') {
          controladoraExistente = dmsMap.get(dmId).Controladoras.find(ctrl => ctrl.DIP === row.DIP);
        } else {
          controladoraExistente = dmsMap.get(dmId).Controladoras.find(ctrl => ctrl.Placa === row.Placa);
        }

        if (controladoraExistente) {
          // Atualiza as listas dependendo do tipo da controladora
          if (row.Tipo_Controladora === '2023') {
            controladoraExistente.Andar = [...new Set([...controladoraExistente.Andar, row.Andar])];
            controladoraExistente.Posicao = [...new Set([...controladoraExistente.Posicao, row.Posicao])];
          } else if (row.Tipo_Controladora === '2018') {
            controladoraExistente.Mola1 = [...new Set([...controladoraExistente.Mola1, row.Mola1])];
          } else if (row.Tipo_Controladora === '2024') {
            controladoraExistente.Mola1 = [...new Set([...controladoraExistente.Mola1, row.Mola1])];
            controladoraExistente.Mola2 = [...new Set([...controladoraExistente.Mola2, row.Mola2])];
          } else if (row.Tipo_Controladora === 'Locker') {
            controladoraExistente.Mola1 = [...new Set([...controladoraExistente.Mola1, row.Posicao])];
          }
        } else {
          dmsMap.get(dmId).Controladoras.push({
            ID: row.ControladoraID,
            Tipo_Controladora: row.Tipo_Controladora,
            Placa: row.Placa,
            DIP: row.DIP,
            Andar: row.Andar ? [row.Andar] : [],
            Posicao: row.Posicao ? [row.Posicao] : [],
            Mola1: row.Mola1 ? [row.Mola1] : [],
            Mola2: row.Mola2 ? [row.Mola2] : []
          });
        }
      }
    });

    const dmsArray = Array.from(dmsMap.values());
    response.status(200).json(dmsArray);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
};

async function inserirControladoraGenerica(transaction, controladora, dmId, clienteId) {
  // Verifica o tipo da controladora e realiza a inserção adequada
  const tipoControladora = controladora.tipo;
  const sqlRequest = new sql.Request(transaction);

  sqlRequest.input('ID_Cliente', sql.Int, clienteId);
  sqlRequest.input('ID_DM', sql.Int, dmId);
  sqlRequest.input('Tipo_Controladora', sql.NVarChar, tipoControladora);
  sqlRequest.input('Sincronizado', sql.Int, 0);  // Sincronizado como 0
  sqlRequest.input('Deleted', sql.Bit, false);  // Deleted como falso

  if (tipoControladora === '2018') {
    for (const mola of controladora.dados.molas) {
      const queryControladora2018 = `
        INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, Placa, Mola1, Sincronizado, Deleted)
        VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @Placa, @Mola1, @Sincronizado, @Deleted)`;
      sqlRequest.input('Placa', sql.Int, controladora.dados.placa);
      sqlRequest.input('Mola1', sql.Int, mola);
      await sqlRequest.query(queryControladora2018);
    }
  } else if (tipoControladora === '2023') {
    for (const andar of controladora.dados.andar) {
      for (const posicao of controladora.dados.posicao) {
        const queryControladora2023 = `
          INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, DIP, Andar, Posicao, Sincronizado, Deleted)
          VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @DIP, @Andar, @Posicao, @Sincronizado, @Deleted)`;
        sqlRequest.input('DIP', sql.Int, controladora.dados.dip);
        sqlRequest.input('Andar', sql.Int, andar);
        sqlRequest.input('Posicao', sql.Int, posicao);
        await sqlRequest.query(queryControladora2023);
      }
    }
  } else if (tipoControladora === 'Locker') {
    for (const posicao of controladora.dados.posicao) {
      const queryControladoraLocker = `
        INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, DIP, Posicao, Sincronizado, Deleted)
        VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @DIP, @Posicao, @Sincronizado, @Deleted)`;
      sqlRequest.input('DIP', sql.Int, controladora.dados.dip);
      sqlRequest.input('Posicao', sql.Int, posicao);
      await sqlRequest.query(queryControladoraLocker);
    }
  } else if (tipoControladora === '2024') {
    for (const mola1 of controladora.dados.mola1) {
      const queryControladora2024 = `
        INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, Placa, Mola1, Sincronizado, Deleted)
        VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @Placa, @Mola1, @Sincronizado, @Deleted)`;
      sqlRequest.input('Placa', sql.Int, controladora.dados.placa);
      sqlRequest.input('Mola1', sql.Int, mola1);
      await sqlRequest.query(queryControladora2024);
    }
  }
}

async function adicionar(request, response) {
  const {
    IDcliente, Ativo, Chave, ClienteID, Integracao, ClienteNome, Created, Deleted, Devolucao, Enviada,
    Identificacao, Numero, OP_Biometria, OP_Facial, OP_Senha, URL, Updated, UserID, Versao, id_usuario,
    Controladoras, senha
  } = request.body;

  const queryDM = `
    INSERT INTO DMs (
      ID_Cliente, Numero, Devolucao, Identificacao, Ativo, Deleted, Created, Updated, Versao, Enviada, OP_Senha, 
      OP_Biometria, OP_Facial, Integracao, ClienteID, ClienteNome, UserID, Chave, ID_CR_Usuario, URL, Sincronizado)
    OUTPUT INSERTED.ID_DM
    VALUES (
      @ID_Cliente, @Numero, @Devolucao, @Identificacao, @Ativo, @Deleted, @Created, @Updated, @Versao, @Enviada, 
      @OP_Senha, @OP_Biometria, @OP_Facial, @Integracao, @ClienteID, @ClienteNome, @UserID, @Chave, @ID_CR_Usuario, 
      @URL, @Sincronizado)`;

  let transaction;

  try {
    if (!IDcliente) {
      return response.status(401).json("ID do cliente não enviado");
    }

    transaction = new sql.Transaction();
    await transaction.begin();

    const sqlRequest = new sql.Request(transaction);
    sqlRequest.input('ID_Cliente', sql.Int, IDcliente);
    sqlRequest.input('Numero', sql.VarChar, Numero);
    sqlRequest.input('Devolucao', sql.Bit, Devolucao);
    sqlRequest.input('Identificacao', sql.NVarChar, Identificacao);
    sqlRequest.input('Ativo', sql.Bit, Ativo);
    sqlRequest.input('Deleted', sql.Bit, false);
    sqlRequest.input('Created', sql.DateTime, new Date());
    sqlRequest.input('Updated', sql.DateTime, '1900-01-01 00:00:00.000');
    sqlRequest.input('Versao', sql.Int, Versao || 1);
    sqlRequest.input('Enviada', sql.Bit, Enviada);
    sqlRequest.input('OP_Senha', sql.Bit, OP_Senha);
    sqlRequest.input('OP_Biometria', sql.Bit, OP_Biometria);
    sqlRequest.input('OP_Facial', sql.Bit, OP_Facial);
    sqlRequest.input('Integracao', sql.Bit, Integracao);
    sqlRequest.input('ClienteID', sql.VarChar, ClienteID);
    sqlRequest.input('ClienteNome', sql.NVarChar, ClienteNome);
    sqlRequest.input('UserID', sql.VarChar, UserID);
    sqlRequest.input('Chave', sql.NVarChar, senha);
    sqlRequest.input('ID_CR_Usuario', sql.Int, id_usuario);
    sqlRequest.input('Sincronizado', sql.Int, 0);  // Sincronizado como 0

    const urlToInsert = Integracao ? 'https://api.mobsolucoesdigitais.com.br' : URL;
    sqlRequest.input('URL', sql.NVarChar, urlToInsert);

    const resultDM = await sqlRequest.query(queryDM);

    const dmId = resultDM.recordset[0].ID_DM;

    if (Controladoras && Controladoras.length > 0) {
      for (const controladora of Controladoras) {
        await inserirControladoraGenerica(transaction, controladora, dmId, IDcliente);
      }
    }

    await transaction.commit();
    response.status(201).send('DM e Controladoras criadas com sucesso!');
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Erro ao adicionar DM:', error);
    response.status(500).send('Erro ao adicionar DM');
  }
}
async function atualizar(request, response) {
  const {
    id_usuario,
    ID_DM,
    IDcliente,
    ClienteNome,
    Numero,
    Identificacao,
    Ativo,
    Deleted,
    Created,
    Updated,
    Versao,
    Enviada,
    OP_Senha,
    OP_Biometria,
    OP_Facial,
    Integracao,
    ClienteID,
    Chave,
    Devolucao,
    Controladoras,
    senha
  } = request.body;

  let transaction;

  try {
    if (!ID_DM || !IDcliente) {
      return response.status(400).json({ message: "ID_DM e IDcliente são obrigatórios." });
    }

    transaction = new sql.Transaction();
    await transaction.begin();

    // Atualiza a DM
    const updateDMQuery = `
      UPDATE DMs SET
          Numero = @Numero,
          Identificacao = @Identificacao,
          Ativo = @Ativo,
          Deleted = @Deleted,
          Created = @Created,
          Updated = @Updated,
          Versao = @Versao,
          Enviada = @Enviada,
          OP_Senha = @OP_Senha,
          OP_Biometria = @OP_Biometria,
          OP_Facial = @OP_Facial,
          Integracao = @Integracao,
          ClienteID = @ClienteID,
          ClienteNome = @ClienteNome,
          Chave = @Chave,
          Devolucao = @Devolucao
      WHERE ID_DM = @ID_DM AND ID_Cliente = @IDcliente`;

    const requestDM = new sql.Request(transaction);
    requestDM.input('ID_DM', sql.Int, ID_DM);
    requestDM.input('IDcliente', sql.Int, IDcliente);
    requestDM.input('Numero', sql.VarChar, Numero);
    requestDM.input('Identificacao', sql.NVarChar, Identificacao);
    requestDM.input('Ativo', sql.Bit, Ativo);
    requestDM.input('Deleted', sql.Bit, Deleted);
    requestDM.input('Created', sql.DateTime, Created);
    requestDM.input('Updated', sql.DateTime, Updated || new Date());
    requestDM.input('Versao', sql.Int, Versao);
    requestDM.input('Enviada', sql.Bit, Enviada);
    requestDM.input('OP_Senha', sql.Bit, OP_Senha);
    requestDM.input('OP_Biometria', sql.Bit, OP_Biometria);
    requestDM.input('OP_Facial', sql.Bit, OP_Facial);
    requestDM.input('Integracao', sql.Bit, Integracao);
    requestDM.input('ClienteID', sql.VarChar, ClienteID);
    requestDM.input('ClienteNome', sql.NVarChar, ClienteNome);
    requestDM.input('Chave', sql.NVarChar, senha);
    requestDM.input('Devolucao', sql.Bit, Devolucao);

    await requestDM.query(updateDMQuery);

    // Busca as controladoras existentes
    const selectControladorasQuery = `SELECT * FROM Controladoras WHERE ID_DM = @ID_DM AND Deleted = 0`;
    const resultControladoras = await requestDM.input('ID_DM', sql.Int, ID_DM).query(selectControladorasQuery);
    const existingControladorasMap = new Map(resultControladoras.recordset.map(ctrl => [ctrl.ID, ctrl]));

    // Atualiza ou insere controladoras
    for (const controladora of Controladoras) {
      await atualizarControladoraGenerica(transaction, controladora, ID_DM, IDcliente, existingControladorasMap);
    }

    await transaction.commit();
    response.status(200).json({ message: "DM e controladoras atualizadas com sucesso." });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Erro ao atualizar DM:", error);
    response.status(500).json({ message: "Erro ao atualizar DM." });
  }
}
async function atualizarControladoraGenerica(transaction, controladora, dmId, clienteId, existingControladorasMap) {
  const tipoControladora = controladora.tipo;
  const sqlRequest = new sql.Request(transaction);
  const existingControladora = existingControladorasMap.get(controladora.ID);
  //Verifica se a controladora existe, caso não insere a controladora nova
  if (!existingControladora) {
    await inserirControladoraGenerica(transaction, controladora, dmId, clienteId);
    return;
  }

  // Verifica se a controladora foi marcada como deletada
  if (controladora.Deleted) {
    const deleteControladoraQuery = `
      UPDATE Controladoras SET Deleted = 1 WHERE ID = @ID`;
    await sqlRequest.input('ID', sql.Int, controladora.ID).query(deleteControladoraQuery);
    return;
  }

  // Atualiza a controladora existente
  if (tipoControladora === '2018') {
    const novasMolas = new Set(controladora.dados.molas);
    const molasExistentes = new Set(existingControladora.Mola1);

    for (const mola of molasExistentes) {
      if (!novasMolas.has(mola)) {
        // Marca mola antiga como deletada
        const updateQuery = `
          UPDATE Controladoras SET Deleted = 1 WHERE ID_DM = @ID_DM AND Mola1 = @Mola1`;
        await sqlRequest.input('ID_DM', sql.Int, dmId).input('Mola1', sql.Int, mola).query(updateQuery);
      }
    }

    for (const mola of novasMolas) {
      if (!molasExistentes.has(mola)) {
        const insertQuery = `
          INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, Placa, Mola1, Sincronizado, Deleted)
          VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @Placa, @Mola1, 0, 0)`;
        await sqlRequest.input('ID_Cliente', sql.Int, clienteId)
          .input('ID_DM', sql.Int, dmId)
          .input('Tipo_Controladora', sql.NVarChar, controladora.tipo)
          .input('Placa', sql.Int, controladora.dados.placa)
          .input('Mola1', sql.Int, mola)
          .query(insertQuery);
      }
    }
  } else if (tipoControladora === '2023') {
    const novasPosicoes = new Set(controladora.dados.posicao);
    const novasAndares = new Set(controladora.dados.andar);
    const posicoesExistentes = new Set(existingControladora.Posicao);
    const andaresExistentes = new Set(existingControladora.Andar);

    // Verifica se andares ou posições existentes foram removidos
    for (const posicao of posicoesExistentes) {
      if (!novasPosicoes.has(posicao)) {
        const updateQuery = `
          UPDATE Controladoras SET Deleted = 1 WHERE ID_DM = @ID_DM AND Posicao = @Posicao`;
        await sqlRequest.input('ID_DM', sql.Int, dmId).input('Posicao', sql.Int, posicao).query(updateQuery);
      }
    }

    for (const andar of andaresExistentes) {
      if (!novasAndares.has(andar)) {
        const updateQuery = `
          UPDATE Controladoras SET Deleted = 1 WHERE ID_DM = @ID_DM AND Andar = @Andar`;
        await sqlRequest.input('ID_DM', sql.Int, dmId).input('Andar', sql.Int, andar).query(updateQuery);
      }
    }

    // Adiciona novas posições e andares que não existiam antes
    for (const posicao of novasPosicoes) {
      if (!posicoesExistentes.has(posicao)) {
        const insertQuery = `
          INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, DIP, Andar, Posicao, Sincronizado, Deleted)
          VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @DIP, @Andar, @Posicao, 0, 0)`;
        await sqlRequest.input('ID_Cliente', sql.Int, clienteId)
          .input('ID_DM', sql.Int, dmId)
          .input('Tipo_Controladora', sql.NVarChar, controladora.tipo)
          .input('DIP', sql.Int, controladora.dados.dip)
          .input('Andar', sql.Int, [...novasAndares][0])  
          .input('Posicao', sql.Int, posicao)
          .query(insertQuery);
      }
    }
  } else if (tipoControladora === 'Locker') {
    const novasPosicoes = new Set(controladora.dados.posicao);
    const posicoesExistentes = new Set(existingControladora.Posicao);

    for (const posicao of posicoesExistentes) {
      if (!novasPosicoes.has(posicao)) {
        const updateQuery = `
          UPDATE Controladoras SET Deleted = 1 WHERE ID_DM = @ID_DM AND Posicao = @Posicao`;
        await sqlRequest.input('ID_DM', sql.Int, dmId).input('Posicao', sql.Int, posicao).query(updateQuery);
      }
    }

    for (const posicao of novasPosicoes) {
      if (!posicoesExistentes.has(posicao)) {
        const insertQuery = `
          INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, DIP, Posicao, Sincronizado, Deleted)
          VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @DIP, @Posicao, 0, 0)`;
        await sqlRequest.input('ID_Cliente', sql.Int, clienteId)
          .input('ID_DM', sql.Int, dmId)
          .input('Tipo_Controladora', sql.NVarChar, controladora.tipo)
          .input('DIP', sql.Int, controladora.dados.dip)
          .input('Posicao', sql.Int, posicao)
          .query(insertQuery);
      }
    }
  } else if (tipoControladora === '2024') {
    const novasMolas1 = new Set(controladora.dados.mola1);
    const molasExistentes1 = new Set(existingControladora.Mola1);
    const novasMolas2 = new Set(controladora.dados.mola2);
    const molasExistentes2 = new Set(existingControladora.Mola2);

    for (const mola1 of molasExistentes1) {
      if (!novasMolas1.has(mola1)) {
        const updateQuery = `
          UPDATE Controladoras SET Deleted = 1 WHERE ID_DM = @ID_DM AND Mola1 = @Mola1`;
        await sqlRequest.input('ID_DM', sql.Int, dmId).input('Mola1', sql.Int, mola1).query(updateQuery);
      }
    }
    for (const mola2 of molasExistentes2) {
      if (!novasMolas2.has(mola2)) {
        const updateQuery = `
          UPDATE Controladoras SET Deleted = 1 WHERE ID_DM = @ID_DM AND Mola2 = @Mola2`;
        await sqlRequest.input('ID_DM', sql.Int, dmId).input('Mola2', sql.Int, mola2).query(updateQuery);
      }
    }

    for (const mola1 of novasMolas1) {
      if (!molasExistentes1.has(mola1)) {
        const insertQuery = `
          INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, Placa, Mola1, Sincronizado, Deleted)
          VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @Placa, @Mola1, 0, 0)`;
        await sqlRequest.input('ID_Cliente', sql.Int, clienteId)
          .input('ID_DM', sql.Int, dmId)
          .input('Tipo_Controladora', sql.NVarChar, controladora.tipo)
          .input('Placa', sql.Int, controladora.dados.placa)
          .input('Mola1', sql.Int, mola1)
          .query(insertQuery);
      }
    }

    for (const mola2 of novasMolas2) {
      if (!molasExistentes2.has(mola2)) {
        const insertQuery = `
          INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, Placa, Mola2, Sincronizado, Deleted)
          VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @Placa, @Mola2, 0, 0)`;
        await sqlRequest.input('ID_Cliente', sql.Int, clienteId)
          .input('ID_DM', sql.Int, dmId)
          .input('Tipo_Controladora', sql.NVarChar, controladora.tipo)
          .input('Placa', sql.Int, controladora.dados.placa)
          .input('Mola2', sql.Int, mola2)
          .query(insertQuery);
      }
    }
  }
}

async function listarItensDM(request, response) {
  try {
    const id_dm = request.body.id_dm;
    const id_cliente = request.body.id_cliente;
    const id_usuario = request.body.id_usuario;
    if (id_dm) {
      const query = `
      SELECT * FROM DM_Itens
      WHERE Deleted = 0 AND ID_DM = @id_dm AND ID_Cliente = @id_cliente
    `;
      const request = new sql.Request();
      request.input('id_dm', sql.Int, id_dm);
      request.input('id_cliente', sql.Int, id_cliente);
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
  const { id_produto, Porta, Motor1, Motor2, id_cliente, id_dm, Controladora, id_usuario, Dip
    , Posicao, Andar
  } = request.body;

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
    const { nome, ProdutoCodigo, sku, unidade_medida, imagem1, quantidademinima, ca, capacidade } = produto;

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
      DIP: Dip,
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
    sqlRequest2.input('Controladora', sql.VarChar, Controladora);
    sqlRequest2.input('Placa', sql.Int, Porta);
    sqlRequest2.input('Motor1', sql.Int, Motor1);
    sqlRequest2.input('Motor2', sql.Int, Motor2);
    sqlRequest2.input('DIP', sql.Int, Dip);
    sqlRequest2.input('Andar', sql.Int, Andar);
    sqlRequest2.input('Posicao', sql.Int, Posicao);
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
      //logQuery('info', `Usuário ${id_usuario} criou um novo Centro de Custo`, 'sucesso', 'INSERT', id_cliente, id_usuario, insertQuery, params);
      response.status(201).send("Item DM criado com sucesso!");
    } else {
      //logQuery('error',  `Usuário ${id_usuario} falhou ao criar Centro de Custo`, 'falha', 'INSERT', id_cliente, id_usuario, insertQuery, params);
      response.status(400).send("Falha ao criar o item DM!");
    }
  } catch (error) {
    const errorMessage = error.message.includes('Query não fornecida para logging')
      ? 'Erro crítico: Falha na operação'
      : `Erro ao adicionar Centro de Custo: ${error.message}`;
    //logQuery('error',  errorMessage, 'falha', 'INSERT', id_cliente, id_usuario, insertQuery, params);
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
      //ogQuery('info', `O usuário ${id_usuario} deletou o Centro de Custo ${id_item}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);
      response.status(200).json({ message: "Item excluído com sucesso" });
    } else {
      //logQuery('error', `Erro ao excluir: ${id_item} não encontrado.`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
      response.status(404).json({ error: "Item não encontrado" });
    }

  } catch (error) {
    //logQuery('error', `${error.message}`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}
async function deletarDM(request, response) {
  const ID_DM = request.body.ID_DM;
  const id_usuario = request.body.id_usuario;
  const id_cliente = request.body.id_cliente;
  const query = "UPDATE DMs SET deleted = 1 WHERE ID_DM = @ID_DM";
  const params = {
    ID_DM: ID_DM
  };
  try {
    if (!ID_DM) {
      response.status(401).json("ID da DM não enviado");
      return;
    }
    const sqlRequest = new sql.Request();
    sqlRequest.input('ID_DM', sql.Int, ID_DM);
    const result = await sqlRequest.query(query);

    if (result.rowsAffected[0] > 0) {
      //logQuery('info', `O usuário ${id_usuario} deletou a DM ${ID_DM}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);
      response.status(200).json({ message: "DM excluído com sucesso" });
    } else {
      //logQuery('error', `Erro ao excluir: ${ID_DM} não encontrado.`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
      response.status(404).json({ error: "Item não encontrado" });
    }

  } catch (error) {
    //logQuery('error', `${error.message}`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}


module.exports = {
  adicionar, listarDM, listarItensDM, adicionarItensDM, deletarItensDM, atualizar, deletarDM
}