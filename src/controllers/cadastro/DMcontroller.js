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
          Controladoras.Mola2, 
          Controladoras.Deleted as ControladoraDeleted
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
          Controladoras.Mola2, 
          Controladoras.Deleted as ControladoraDeleted
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
    result.recordset.forEach((row) => {
      const dmId = row.ID_DM;
      if (!dmsMap.has(dmId)) {
        dmsMap.set(dmId, {
          ...row,
          Controladoras: [],
        });
      }
      if (row.ControladoraID) {
        let controladoraExistente;

        if (
          row.Tipo_Controladora === "2023" ||
          row.Tipo_Controladora === "Locker" ||
          row.Tipo_Controladora === "Locker-Padrao" ||
          row.Tipo_Controladora === "Locker-Ker"
        ) {
          controladoraExistente = dmsMap
            .get(dmId)
            .Controladoras.find((ctrl) => ctrl.DIP === row.DIP);
        } else {
          controladoraExistente = dmsMap
            .get(dmId)
            .Controladoras.find((ctrl) => ctrl.Placa === row.Placa);
        }

        if (controladoraExistente) {
          if (row.ControladoraDeleted === false) {
            // Atualiza as listas dependendo do tipo da controladora
            if (row.Tipo_Controladora === "2023") {
              controladoraExistente.Andar = [
                ...new Set([...controladoraExistente.Andar, row.Andar]),
              ];
              controladoraExistente.Posicao = [
                ...new Set([...controladoraExistente.Posicao, row.Posicao]),
              ];
            } else if (row.Tipo_Controladora === "2018") {
              controladoraExistente.Mola1 = [
                ...new Set([...controladoraExistente.Mola1, row.Mola1]),
              ];
            } else if (row.Tipo_Controladora === "2024") {
              controladoraExistente.Mola1 = [
                ...new Set([...controladoraExistente.Mola1, row.Mola1]),
              ];
              controladoraExistente.Mola2 = [
                ...new Set([...controladoraExistente.Mola2, row.Mola2]),
              ];
            } else if (row.Tipo_Controladora === "Locker") {
              controladoraExistente.Mola1 = [
                ...new Set([...controladoraExistente.Posicao, row.Posicao]),
              ];
            } else if (row.Tipo_Controladora === "Locker-Padrao") {
              controladoraExistente.Mola1 = [
                ...new Set([...controladoraExistente.Posicao, row.Posicao]),
              ];
            } else if (row.Tipo_Controladora === "Locker-Ker") {
              controladoraExistente.Mola1 = [
                ...new Set([...controladoraExistente.Posicao, row.Posicao]),
              ];
            }
          }
        } else {
          dmsMap.get(dmId).Controladoras.push({
            ID: row.ControladoraID,
            Tipo_Controladora: row.Tipo_Controladora,
            Placa: row.Placa,
            DIP: row.DIP,
            Andar:
              row.ControladoraDeleted === false && row.Andar ? [row.Andar] : [],
            Posicao:
              row.ControladoraDeleted === false && row.Posicao
                ? [row.Posicao]
                : [],
            Mola1:
              row.ControladoraDeleted === false && row.Mola1 ? [row.Mola1] : [],
            Mola2:
              row.ControladoraDeleted === false && row.Mola2 ? [row.Mola2] : [],
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
const listarDMResumido = async (request, response) => {
  try {
    const { id_cliente } = request.body;
    let sqlRequest = new sql.Request();
    let query = `
      SELECT 
        id_dm, Identificacao
      FROM 
        DMS
      WHERE 
        Deleted = 0
    `;

    if (id_cliente) {
      query += ` AND id_cliente = @id_cliente`;
      sqlRequest.input("id_cliente", sql.Int, id_cliente);
    }
    query += ` ORDER BY id_dm`;
    const result = await sqlRequest.query(query);
    response.status(200).json(result.recordset);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta no banco de dados.");
  }
};
const listarDMResumido2 = async (request, response) => {
  try {
    let sqlRequest = new sql.Request();
    let query = `
      SELECT 
        id_dm, Identificacao,id_cliente
      FROM 
        DMS
      WHERE 
        Deleted = 0
    `;
    const result = await sqlRequest.query(query);
    response.status(200).json(result.recordset);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta no banco de dados.");
  }
};
const listarDMPaginado = async (request, response) => {
  try {
    const {
      id_cliente,
      first = 0,
      rows = 10,
      sortField = "Identificacao",
      filters = {},
    } = request.body;
    const sortOrder = request.body.sortOrder === "DESC" ? "DESC" : "ASC";
    let sqlRequest = new sql.Request();

    // Query com paginação, ordenação e filtros
    let queryDMs = `
    SELECT 
    COUNT(*) OVER() AS TotalRecords,
    DMS.*
    FROM DMS
    WHERE DMS.Deleted = 0
  `;
    if (id_cliente) {
      queryDMs += ` AND DMS.ID_Cliente = @id_cliente`;
      sqlRequest.input("id_cliente", sql.Int, id_cliente);
    }
    queryDMs += `
  ORDER BY ${sortField} ${sortOrder}
    OFFSET @first ROWS FETCH NEXT @rows ROWS ONLY;`;
    if (filters.global && filters.global.value) {
      const globalValue = `%${filters.global.value}%`; // Adiciona o wildcard para LIKE
      queryDMs = `
    SELECT 
    COUNT(*) OVER() AS TotalRecords,
    DMS.*
    FROM DMS
    WHERE DMS.Deleted = 0 
      AND (
        id_cliente LIKE @globalValue OR 
        Numero LIKE @globalValue OR 
        Identificacao LIKE @globalValue OR 
        Updated LIKE @globalValue OR 
        ClienteNome LIKE @globalValue
      )
    ORDER BY ${sortField} ${sortOrder}
    OFFSET @first ROWS FETCH NEXT @rows ROWS ONLY;
`;

      sqlRequest.input("globalValue", sql.NVarChar, globalValue);
    }
    sqlRequest.input("first", sql.Int, first);
    sqlRequest.input("rows", sql.Int, rows);

    const dmsResult = await sqlRequest.query(queryDMs);
    const totalRecords =
      dmsResult.recordset.length > 0 ? dmsResult.recordset[0].TotalRecords : 0;
    const dms = dmsResult.recordset;
    const dmIds = dms.map((dm) => dm.ID_DM);
    const queryControladoras = `
      SELECT *
  FROM Controladoras
  WHERE Controladoras.ID_DM IN (${dmIds.length ? dmIds.map((_, index) => `@dmId${index}`).join(",") : "-1"})
  AND Controladoras.Deleted = 0;
    `;

    dmIds.forEach((id, index) => {
      sqlRequest.input(`dmId${index}`, sql.Int, id);
    });

    const controladorasResult = await sqlRequest.query(queryControladoras);
    const controladoras = controladorasResult.recordset;
    const dmsMap = new Map();
    dms.forEach((dm) => {
      dmsMap.set(dm.ID_DM, { ...dm, Controladoras: [] });
    });

    controladoras.forEach((controladora) => {
      if (dmsMap.has(controladora.ID_DM)) {
        const dm = dmsMap.get(controladora.ID_DM);
        let controladoraExistente;
        if (
          controladora.Tipo_Controladora === "2023" ||
          controladora.Tipo_Controladora === "Locker-Padrao" ||
          controladora.Tipo_Controladora === "Locker-Ker"
        ) {
          controladoraExistente = dm.Controladoras.find(
            (ctrl) => ctrl.DIP === controladora.DIP && ctrl.Tipo_Controladora === controladora.Tipo_Controladora
          );
        } else {
          controladoraExistente = dm.Controladoras.find(
            (ctrl) => ctrl.Placa === controladora.Placa 
          );
        }

        if (controladoraExistente) {
          if (controladora.Deleted === false) {
            if (controladora.Tipo_Controladora === "2023") {
              controladoraExistente.Andar = [
                ...new Set([
                  ...controladoraExistente.Andar,
                  controladora.Andar,
                ]),
              ];
              controladoraExistente.Posicao = [
                ...new Set([
                  ...controladoraExistente.Posicao,
                  controladora.Posicao,
                ]),
              ];
            } else if (controladora.Tipo_Controladora === "2018") {
              controladoraExistente.Mola1 = [
                ...new Set([
                  ...controladoraExistente.Mola1,
                  controladora.Mola1,
                ]),
              ];
            } else if (controladora.Tipo_Controladora === "2024") {
              controladoraExistente.Mola1 = [
                ...new Set([
                  ...controladoraExistente.Mola1,
                  controladora.Mola1,
                ]),
              ];
              controladoraExistente.Mola2 = [
                ...new Set([
                  ...controladoraExistente.Mola2,
                  controladora.Mola2,
                ]),
              ];
            } else if (controladora.Tipo_Controladora === "Locker") {
              controladoraExistente.Posicao = [
                ...new Set([
                  ...controladoraExistente.Posicao,
                  controladora.Posicao,
                ]),
              ];
            } else if (controladora.Tipo_Controladora === "Locker-Padrao") {
              controladoraExistente.Posicao = [
                ...new Set([
                  ...controladoraExistente.Posicao,
                  controladora.Posicao,
                ]),
              ];
            } else if (controladora.Tipo_Controladora === "Locker-Ker") {
              controladoraExistente.Posicao = [
                ...new Set([
                  ...controladoraExistente.Posicao,
                  controladora.Posicao,
                ]),
              ];
            }
          }
        } else {
          dm.Controladoras.push({
            ID: controladora.ID,
            Tipo_Controladora: controladora.Tipo_Controladora,
            Placa: controladora.Placa,
            DIP: controladora.DIP,
            Andar:
              controladora.Deleted === false && controladora.Andar
                ? [controladora.Andar]
                : [],
            Posicao:
              controladora.Deleted === false && controladora.Posicao
                ? [controladora.Posicao]
                : [],
            Mola1:
              controladora.Deleted === false && controladora.Mola1
                ? [controladora.Mola1]
                : [],
            Mola2:
              controladora.Deleted === false && controladora.Mola2
                ? [controladora.Mola2]
                : [],
          });
        }
      }
    });

    const dmsArray = Array.from(dmsMap.values());
    response.status(200).json({ dmsArray, totalRecords });
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
};

async function inserirControladoraGenerica(
  transaction,
  controladora,
  dmId,
  clienteId
) {
  // Verifica o tipo da controladora e realiza a inserção adequada
  const tipoControladora = controladora.tipo;
console.log("vocêe stá inserindo pelo caminho gerérico:",tipoControladora)
  if (tipoControladora === "2018" && controladora.dados.placa > 0) {
    for (const mola of controladora.dados.molas) {
      const queryControladora2018 = `
        INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, Placa, Mola1, Sincronizado, Deleted)
        VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @Placa, @Mola1, @Sincronizado, @Deleted)`;
      const sqlRequest2 = new sql.Request(transaction);
      sqlRequest2.input("ID_Cliente", sql.Int, clienteId);
      sqlRequest2.input("ID_DM", sql.Int, dmId);
      sqlRequest2.input("Tipo_Controladora", sql.NVarChar, tipoControladora);
      sqlRequest2.input("Sincronizado", sql.Int, 0);
      sqlRequest2.input("Deleted", sql.Bit, false);
      sqlRequest2.input("Placa", sql.Int, controladora.dados.placa);
      sqlRequest2.input("Mola1", sql.Int, mola);
      await sqlRequest2.query(queryControladora2018);
    }
  } else if (tipoControladora === "2023" && controladora.dados.dip > 0) {
    for (const andar of controladora.dados.andar) {
      for (const posicao of controladora.dados.posicao) {
        const queryControladora2023 = `
          INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, DIP, Andar, Posicao, Sincronizado, Deleted)
          VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @DIP, @Andar, @Posicao, @Sincronizado, @Deleted)`;
        const sqlRequest2 = new sql.Request(transaction);
        sqlRequest2.input("ID_Cliente", sql.Int, clienteId);
        sqlRequest2.input("ID_DM", sql.Int, dmId);
        sqlRequest2.input("Tipo_Controladora", sql.NVarChar, tipoControladora);
        sqlRequest2.input("Sincronizado", sql.Int, 0);
        sqlRequest2.input("Deleted", sql.Bit, false);
        sqlRequest2.input("DIP", sql.Int, controladora.dados.dip);
        sqlRequest2.input("Andar", sql.Int, andar);
        sqlRequest2.input("Posicao", sql.Int, posicao);
        await sqlRequest2.query(queryControladora2023);
      }
    }
  } else if (
    tipoControladora === "Locker" ||
    tipoControladora === "Locker-Padrao" ||
    tipoControladora === "Locker-Ker"
  ) {
    for (const posicao of controladora.dados.posicao) {
      const queryControladoraLocker = `
        INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, DIP, Posicao, Sincronizado, Deleted)
        VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @DIP, @Posicao, @Sincronizado, @Deleted)`;
      const sqlRequest2 = new sql.Request(transaction);
      sqlRequest2.input("ID_Cliente", sql.Int, clienteId);
      sqlRequest2.input("ID_DM", sql.Int, dmId);
      sqlRequest2.input("Tipo_Controladora", sql.NVarChar, tipoControladora);
      sqlRequest2.input("Sincronizado", sql.Int, 0);
      sqlRequest2.input("Deleted", sql.Bit, false);
      sqlRequest2.input("DIP", sql.Int, controladora.dados.dip);
      sqlRequest2.input("Posicao", sql.Int, posicao);
      await sqlRequest2.query(queryControladoraLocker);
    }
  } else if (tipoControladora === "2024") {
    for (const mola1 of controladora.dados.mola1) {
      const queryControladora2024 = `
        INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, Placa, Mola1, Sincronizado, Deleted)
        VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @Placa, @Mola1, @Sincronizado, @Deleted)`;
      const sqlRequest2 = new sql.Request(transaction);
      sqlRequest2.input("ID_Cliente", sql.Int, clienteId);
      sqlRequest2.input("ID_DM", sql.Int, dmId);
      sqlRequest2.input("Tipo_Controladora", sql.NVarChar, tipoControladora);
      sqlRequest2.input("Sincronizado", sql.Int, 0);
      sqlRequest2.input("Deleted", sql.Bit, false);
      sqlRequest2.input("Placa", sql.Int, controladora.dados.placa);
      sqlRequest2.input("Mola1", sql.Int, mola1);
      await sqlRequest2.query(queryControladora2024);
    }
  }
}
async function adicionar(request, response) {
  const {
    IDcliente,
    Ativo,
    Chave,
    ClienteID,
    Integracao,
    ClienteNome,
    Created,
    Deleted,
    Devolucao,
    Enviada,
    Identificacao,
    Numero,
    OP_Biometria,
    OP_Facial,
    OP_Senha,
    URL,
    Updated,
    UserID,
    Versao,
    id_usuario,
    Controladoras,
    ChaveAPI,
  } = request.body;

  console.log("Dados recebidos para adicionar:", {
    IDcliente,
    Ativo,
    Chave,
    ClienteID,
    Integracao,
    ClienteNome,
    Created,
    Deleted,
    Devolucao,
    Enviada,
    Identificacao,
    Numero,
    OP_Biometria,
    OP_Facial,
    OP_Senha,
    URL,
    Updated,
    UserID,
    Versao,
    id_usuario,
    Controladoras,
    ChaveAPI,
  });

  const queryDM = `
    INSERT INTO DMs (
      ID_Cliente, Numero, Devolucao, Identificacao, Ativo, Deleted, Created, Updated, Versao, Enviada, OP_Senha, 
      OP_Biometria, OP_Facial, Integracao, ClienteID, ClienteNome, UserID, Chave, ID_CR_Usuario, URL, Sincronizado,ChaveAPI)
    OUTPUT INSERTED.ID_DM
    VALUES (
      @ID_Cliente, @Numero, @Devolucao, @Identificacao, @Ativo, @Deleted, @Created, @Updated, @Versao, @Enviada, 
      @OP_Senha, @OP_Biometria, @OP_Facial, @Integracao, @ClienteID, @ClienteNome, @UserID, @Chave, @ID_CR_Usuario, 
      @URL, @Sincronizado,@ChaveAPI)`;

  let transaction;

  try {
    if (!IDcliente) {
      return response.status(401).json("ID do cliente não enviado");
    }

    transaction = new sql.Transaction();
    await transaction.begin();

    const sqlRequest = new sql.Request(transaction);
    sqlRequest.input("ID_Cliente", sql.Int, IDcliente);
    sqlRequest.input("Numero", sql.VarChar, Numero);
    sqlRequest.input("Devolucao", sql.Bit, Devolucao);
    sqlRequest.input("Identificacao", sql.NVarChar, Identificacao);
    sqlRequest.input("ChaveAPI", sql.NVarChar, ChaveAPI);
    sqlRequest.input("Ativo", sql.Bit, Ativo);
    sqlRequest.input("Deleted", sql.Bit, false);
    sqlRequest.input("Created", sql.DateTime, new Date());
    sqlRequest.input("Updated", sql.DateTime, "1900-01-01 00:00:00.000");
    sqlRequest.input("Versao", sql.Int, Versao || 1);
    sqlRequest.input("Enviada", sql.Bit, Enviada);
    sqlRequest.input("OP_Senha", sql.Bit, OP_Senha);
    sqlRequest.input("OP_Biometria", sql.Bit, OP_Biometria);
    sqlRequest.input("OP_Facial", sql.Bit, OP_Facial);
    sqlRequest.input("Integracao", sql.Bit, Integracao);
    sqlRequest.input("ClienteID", sql.VarChar, ClienteID);
    sqlRequest.input("ClienteNome", sql.NVarChar, ClienteNome);
    sqlRequest.input("UserID", sql.VarChar, UserID);
    sqlRequest.input("Chave", sql.NVarChar, Chave);
    sqlRequest.input("ID_CR_Usuario", sql.Int, id_usuario);
    sqlRequest.input("Sincronizado", sql.Int, 0);

    const urlToInsert = Integracao
      ? "https://api.mobsolucoesdigitais.com.br"
      : URL;
    sqlRequest.input("URL", sql.NVarChar, urlToInsert);

    const resultDM = await sqlRequest.query(queryDM);

    const dmId = resultDM.recordset[0].ID_DM;

    if (Controladoras && Controladoras.length > 0) {
      for (const controladora of Controladoras) {
        await inserirControladoraGenerica(
          transaction,
          controladora,
          dmId,
          IDcliente
        );
      }
    }

    await transaction.commit();
    response.status(201).send("DM e Controladoras criadas com sucesso!");
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Erro ao adicionar DM:", error);
    response.status(500).send("Erro ao adicionar DM");
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
    ChaveAPI,
  } = request.body;
  console.log("Dados recebidos para atualização:", {
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
    ChaveAPI,
    Devolucao,
  });
  let transaction;

  try {
    if (!ID_DM || !IDcliente) {
      return response
        .status(400)
        .json({ message: "ID_DM e IDcliente são obrigatórios." });
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
          ChaveAPI = @ChaveAPI,
          Devolucao = @Devolucao,
          Sincronizado = 0
      WHERE ID_DM = @ID_DM AND ID_Cliente = @ID_Cliente`;

    const requestDM = new sql.Request(transaction);
    requestDM.input("ID_DM", sql.Int, ID_DM);
    requestDM.input("ID_Cliente", sql.Int, IDcliente);
    requestDM.input("Numero", sql.VarChar, Numero);
    requestDM.input("Identificacao", sql.NVarChar, Identificacao);
    requestDM.input("Ativo", sql.Bit, Ativo);
    requestDM.input("Deleted", sql.Bit, Deleted);
    requestDM.input("Created", sql.DateTime, Created);
    requestDM.input("Updated", sql.DateTime, Updated || new Date());
    requestDM.input("Versao", sql.Int, Versao);
    requestDM.input("Enviada", sql.Bit, Enviada);
    requestDM.input("OP_Senha", sql.Bit, OP_Senha);
    requestDM.input("OP_Biometria", sql.Bit, OP_Biometria);
    requestDM.input("OP_Facial", sql.Bit, OP_Facial);
    requestDM.input("Integracao", sql.Bit, Integracao);
    requestDM.input("ClienteID", sql.VarChar, ClienteID);
    requestDM.input("ClienteNome", sql.NVarChar, ClienteNome);
    requestDM.input("Chave", sql.NVarChar, Chave);
    requestDM.input("ChaveAPI", sql.NVarChar, ChaveAPI);
    requestDM.input("Devolucao", sql.Bit, Devolucao);

    await requestDM.query(updateDMQuery);

    // Nova instância de sql.Request para a próxima consulta
    const requestControladoras = new sql.Request(transaction);

    // Busca as controladoras existentes
    const selectControladorasQuery = `SELECT * FROM Controladoras WHERE ID_DM = @ID_DM`;
    requestControladoras.input("ID_DM", sql.Int, ID_DM);
    const resultControladoras = await requestControladoras.query(
      selectControladorasQuery
    );
    // Mapeia as controladoras existentes com base no identificador único (placa, DIP)
    const existingControladorasMap = new Map();

    resultControladoras.recordset.forEach((ctrl) => {
      // Define o identificador único
      const identificador =
        ctrl.Tipo_Controladora === "2018" || ctrl.Tipo_Controladora === "2024"
          ? ctrl.Placa
          : ctrl.DIP;

      // Inicializa o grupo se não existir
      if (!existingControladorasMap.has(identificador)) {
        existingControladorasMap.set(identificador, {
          Tipo_Controladora: ctrl.Tipo_Controladora,
          Placa: ctrl.Placa,
          DIP: ctrl.DIP,
          Andar: [],
          Posicao: [],
          Mola1: [],
          Mola2: [],
        });
      }

      // Adiciona os valores únicos aos arrays correspondentes
      const agrupado = existingControladorasMap.get(identificador);

      if (ctrl.Andar && !agrupado.Andar.includes(ctrl.Andar)) {
        agrupado.Andar.push(ctrl.Andar);
      }
      if (ctrl.Posicao && !agrupado.Posicao.includes(ctrl.Posicao)) {
        agrupado.Posicao.push(ctrl.Posicao);
      }
      if (ctrl.Mola1 && !agrupado.Mola1.includes(ctrl.Mola1)) {
        agrupado.Mola1.push(ctrl.Mola1);
      }
      if (ctrl.Mola2 && !agrupado.Mola2.includes(ctrl.Mola2)) {
        agrupado.Mola2.push(ctrl.Mola2);
      }
    });

    // Atualiza ou insere controladoras com base no tipo
    for (const controladora of Controladoras) {
      let existingControladora;

      // Busca a controladora no Map com base no tipo
      if (controladora.tipo === "2018" || controladora.tipo === "2024") {
        existingControladora = existingControladorasMap.get(
          controladora.dados.placa
        );
      } else if (
        controladora.tipo === "2023" ||
        controladora.tipo === "Locker-Padrao" ||
        controladora.tipo === "Locker-Ker"
      ) {
        existingControladora = existingControladorasMap.get(
          controladora.dados.dip
        );
      }

      if (existingControladora) {
        // Atualiza a controladora existente
        if (controladora.tipo === "2018" && controladora.dados.placa > 0) {
          await atualizarControladora2018(
            transaction,
            controladora,
            ID_DM,
            IDcliente,
            existingControladora
          );
        } else if (controladora.tipo === "2023" && controladora.dados.dip > 0) {
          await atualizarControladora2023(
            transaction,
            controladora,
            ID_DM,
            IDcliente,
            existingControladora
          );
        } else if (
          (controladora.tipo === "Locker-Padrao" ||
            controladora.tipo === "Locker-Ker")
        ) {
          await atualizarControladoraLocker(
            transaction,
            controladora,
            ID_DM,
            IDcliente,
            existingControladora
          );
        } else if (controladora.tipo === "2024" && controladora.dados.dip > 0) {
          await atualizarControladora2024(
            transaction,
            controladora,
            ID_DM,
            IDcliente,
            existingControladora
          );
        }
      } else {
        // Insere a nova controladora
        if (controladora.tipo === "2018" && controladora.dados.placa > 0) {
          await adicionarControladora2018(
            transaction,
            controladora,
            ID_DM,
            IDcliente
          );
        } else if (controladora.tipo === "2023" && controladora.dados.dip > 0) {
          await adicionarControladora2023(
            transaction,
            controladora,
            ID_DM,
            IDcliente
          );
        } else if (
          (controladora.tipo === "Locker-Padrao" ||
            controladora.tipo === "Locker-Ker")
        ) {
          await adicionarControladoraLocker(
            transaction,
            controladora,
            ID_DM,
            IDcliente
          );
        } else if (controladora.tipo === "2024" && controladora.dados.dip > 0) {
          await adicionarControladora2024(
            transaction,
            controladora,
            ID_DM,
            IDcliente
          );
        }
      }
    }

    await transaction.commit();
    response
      .status(200)
      .json({ message: "DM e controladoras atualizadas com sucesso." });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Erro ao atualizar DM:", error);
    response.status(500).json({ message: "Erro ao atualizar DM." });
  }
}
async function atualizarControladora2024(
  transaction,
  controladora,
  dmId,
  clienteId,
  existingControladora
) {
  const novasMolas1 = new Set(controladora.dados.mola1);
  const molasExistentes1 = new Set(existingControladora.Mola1);
  const novasMolas2 = new Set(controladora.dados.mola2);
  const molasExistentes2 = new Set(existingControladora.Mola2);

  // Remove molas 1 antigas
  for (const mola1 of molasExistentes1) {
    if (!novasMolas1.has(mola1)) {
      const sqlRequest = new sql.Request(transaction);
      const query = `
        UPDATE Controladoras SET Deleted = 1 WHERE ID_DM = @ID_DM AND Mola1 = @Mola1`;

      sqlRequest.input("ID_DM", sql.Int, dmId);
      sqlRequest.input("Mola1", sql.Int, mola1);

      await sqlRequest.query(query);
    }
  }
  // Remove molas 2 antigas
  for (const mola2 of molasExistentes2) {
    if (!novasMolas2.has(mola2)) {
      const sqlRequest = new sql.Request(transaction);

      const query = `
        UPDATE Controladoras SET Deleted = 1 WHERE ID_DM = @ID_DM AND Mola2 = @Mola2`;

      sqlRequest.input("ID_DM", sql.Int, dmId);
      sqlRequest.input("Mola2", sql.Int, mola2);

      await sqlRequest.query(query);
    }
  }

  // Insere novas molas 1
  for (const mola1 of novasMolas1) {
    if (!molasExistentes1.has(mola1)) {
      const sqlRequest = new sql.Request(transaction);

      const query = `
        INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, Placa, Mola1, Sincronizado, Deleted)
        VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @Placa, @Mola1, 0, 0)`;

      sqlRequest.input("ID_Cliente", sql.Int, clienteId);
      sqlRequest.input("ID_DM", sql.Int, dmId);
      sqlRequest.input("Tipo_Controladora", sql.NVarChar, controladora.tipo);
      sqlRequest.input("Placa", sql.Int, controladora.dados.placa);
      sqlRequest.input("Mola1", sql.Int, mola1);

      await sqlRequest.query(query);
    }
  }

  // Insere novas molas 2
  for (const mola2 of novasMolas2) {
    if (!molasExistentes2.has(mola2)) {
      const sqlRequest = new sql.Request(transaction);

      const query = `
        INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, Placa, Mola2, Sincronizado, Deleted)
        VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @Placa, @Mola2, 0, 0)`;

      sqlRequest.input("Mola2", sql.Int, mola2);

      await sqlRequest.query(query);
    }
  }
}
async function atualizarControladoraLocker(
  transaction,
  controladora,
  dmId,
  clienteId,
  existingControladora
) {
  console.log(existingControladora);
  const novasPosicoes = new Set(controladora.dados.posicao);
  const posicoesExistentes = new Set(existingControladora.Posicao);

  const posicoesExistentesArr = Array.from(posicoesExistentes).map(Number);
  const novasPosicoesArr = Array.from(novasPosicoes).map(Number);

  const posicoesParaExcluir = posicoesExistentesArr.filter(
    (posicao) => !novasPosicoesArr.includes(posicao)
  );

  // Remove posições antigas
  for (const posicao of posicoesParaExcluir) {
    const sqlRequestDelete = new sql.Request(transaction);

    const query = `
        UPDATE Controladoras SET Deleted = 1 WHERE ID_DM = @ID_DM AND Posicao = @Posicao AND DIP = @DIP`;

    sqlRequestDelete.input("ID_DM", sql.Int, dmId);
    sqlRequestDelete.input("Posicao", sql.Int, posicao);
    sqlRequestDelete.input("DIP", sql.Int, controladora.dados.dip);

    await sqlRequestDelete.query(query);
    console.log(
      "Posição",
      posicao,
      " do dip",
      controladora.dados.dip,
      " excluída."
    );
  }

  // Para atualizar ou inserir as combinações de posições
  for (const posicao of novasPosicoesArr) {
    if (posicoesExistentesArr.includes(posicao)) {
      const sqlRequestUpdate = new sql.Request(transaction);
      const query = `
        UPDATE Controladoras SET Deleted = 0 WHERE ID_DM = @ID_DM AND Posicao = @Posicao AND DIP = @DIP`;

        sqlRequestUpdate.input("ID_Cliente", sql.Int, clienteId);
      sqlRequestUpdate.input("ID_DM", sql.Int, dmId);
      sqlRequestUpdate.input("Tipo_Controladora", sql.NVarChar, controladora.tipo);
      sqlRequestUpdate.input("DIP", sql.Int, controladora.dados.dip);
      sqlRequestUpdate.input("Posicao", sql.Int, posicao);

      await sqlRequestUpdate.query(query);
        console.log(
          "Posição",
          posicao,
          " do dip",
          controladora.dados.dip,
          " atualizada."
        );
    } else {
      // Se não existir, insere
      const sqlRequestInsert = new sql.Request(transaction);

      const query = `
        INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, DIP, Posicao, Sincronizado, Deleted)
        VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @DIP, @Posicao, 0, 0)`;

        sqlRequestInsert.input("ID_Cliente", sql.Int, clienteId);
        sqlRequestInsert.input("ID_DM", sql.Int, dmId);
        sqlRequestInsert.input("Tipo_Controladora", sql.NVarChar, controladora.tipo);
        sqlRequestInsert.input("DIP", sql.Int, controladora.dados.dip);
        sqlRequestInsert.input("Posicao", sql.Int, posicao);

      await sqlRequestInsert.query(query);
        console.log(
          "Posição",
          posicao,
          " do dip",
          controladora.dados.dip,
          " inserido."
        );
    }
  }
}

async function atualizarControladora2023(
  transaction,
  controladora,
  dmId,
  clienteId,
  existingControladora
) {
  console.log(existingControladora);
  const novasPosicoes = new Set(controladora.dados.posicao);
  const novasAndares = new Set(controladora.dados.andar);
  
  const posicoesExistentes = new Set(existingControladora.Posicao);
  const andaresExistentes = new Set(existingControladora.Andar);

  // Garantir que as posições e andares sejam arrays com números
  const posicoesExistentesArr = Array.from(posicoesExistentes).map(Number);
  const novasPosicoesArr = Array.from(novasPosicoes).map(Number);

  const andaresExistentesArr = Array.from(andaresExistentes).map(Number);
  const novasAndaresArr = Array.from(novasAndares).map(Number);

  // Filtra os andares para que não incluam os andares existentes
  const andaresParaExcluir = andaresExistentesArr.filter(
    (andar) => !novasAndaresArr.includes(andar)
  );
  // Remove andares antigas que não estão nas novas posições
  for (const andar of andaresParaExcluir) {
    const sqlRequestUpdate = new sql.Request(transaction);
    const updateQuery = `
    UPDATE Controladoras SET Deleted = 1 WHERE ID_DM = @ID_DM AND Andar = @Andar AND DIP = @DIP`;

    sqlRequestUpdate.input("ID_DM", sql.Int, dmId);
    sqlRequestUpdate.input("Andar", sql.Int, andar);
    sqlRequestUpdate.input("DIP", sql.Int, controladora.dados.dip);

    await sqlRequestUpdate.query(updateQuery);
    console.log(
      "Andar",
      andar,
      " do dip",
      controladora.dados.dip,
      " excluído."
    );
  }
  // Filtra as novas posições para que não incluam as posições existentes
  const posicoesParaExcluir = posicoesExistentesArr.filter(
    (posicao) => !novasPosicoesArr.includes(posicao)
  );
  // Remove posições antigas que não estão nas novas posições
  for (const posicao of posicoesParaExcluir) {
    const sqlRequestUpdate = new sql.Request(transaction);
    const updateQuery = `
    UPDATE Controladoras SET Deleted = 1 WHERE ID_DM = @ID_DM AND Posicao = @Posicao AND DIP = @DIP`;

    sqlRequestUpdate.input("ID_DM", sql.Int, dmId);
    sqlRequestUpdate.input("Posicao", sql.Int, posicao);
    sqlRequestUpdate.input("DIP", sql.Int, controladora.dados.dip);

    await sqlRequestUpdate.query(updateQuery);
    console.log(
      "Posição",
      posicao,
      " do dip",
      controladora.dados.dip,
      " excluída."
    );
  }
  // Para atualizar ou inserir as combinações de posições e andares
  for (const andar of novasAndaresArr) {
    for (const posicao of novasPosicoesArr) {
      // Verifica se a combinação de posição e andar já existe
      if (
        posicoesExistentesArr.includes(posicao) &&
        andaresExistentesArr.includes(andar)
      ) {
        // Se existir, atualiza
        const sqlRequestUpdate = new sql.Request(transaction);
        const updateQuery = `
        UPDATE Controladoras SET Deleted = 0 WHERE ID_DM = @ID_DM AND Andar = @Andar AND Posicao = @Posicao AND DIP = @DIP`;

        sqlRequestUpdate.input("ID_DM", sql.Int, dmId);
        sqlRequestUpdate.input("Andar", sql.Int, andar);
        sqlRequestUpdate.input("Posicao", sql.Int, posicao);
        sqlRequestUpdate.input("DIP", sql.Int, controladora.dados.dip);

        await sqlRequestUpdate.query(updateQuery);
        console.log(
          "Andar",
          andar,
          " e posição",
          posicao,
          " do dip",
          controladora.dados.dip,
          " atualizada."
        );
      } else {
        // Se não existir, insere
        const sqlRequestInsert = new sql.Request(transaction);
        const insertQuery = `
        INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, DIP, Andar, Posicao, Sincronizado, Deleted)
        VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @DIP, @Andar, @Posicao, 0, 0)`;

        sqlRequestInsert.input("ID_Cliente", sql.Int, clienteId);
        sqlRequestInsert.input("ID_DM", sql.Int, dmId);
        sqlRequestInsert.input(
          "Tipo_Controladora",
          sql.NVarChar,
          controladora.tipo
        );
        sqlRequestInsert.input("DIP", sql.Int, controladora.dados.dip);
        sqlRequestInsert.input("Andar", sql.Int, andar);
        sqlRequestInsert.input("Posicao", sql.Int, posicao);

        await sqlRequestInsert.query(insertQuery);
        console.log(
          "Andar",
          andar,
          " e posição",
          posicao,
          " do dip",
          controladora.dados.dip,
          " inserido."
        );
      }
    }
  }
}
async function atualizarControladora2018(
  transaction,
  controladora,
  dmId,
  clienteId,
  existingControladora
) {
  console.log(existingControladora);
  const novasMolas = new Set(controladora.dados.molas);
  const molasExistentes = new Set(existingControladora.Mola1);

  //Garantir que seja array de números
  const molasNovasArray = Array.from(novasMolas).map(Number);
  const molasExistentesArray = Array.from(molasExistentes).map(Number);

  const molasParaExcluir = molasExistentesArray.filter(
    (mola) => !molasNovasArray.includes(mola)
  );

  // Remove molas antigas
  for (const mola of molasParaExcluir) {
    if (!novasMolas.has(mola)) {
      const sqlRequest = new sql.Request(transaction);

      const query = `
        UPDATE Controladoras SET Deleted = 1 WHERE ID_DM = @ID_DM AND Mola1 = @Mola1 AND Placa = @Placa`;

      sqlRequest.input("ID_DM", sql.Int, dmId);
      sqlRequest.input("Mola1", sql.Int, mola);
      sqlRequest.input("Placa", sql.Int, controladora.dados.placa);

      await sqlRequest.query(query);
      console.log(
        "Mola ",
        mola,
        " da placa ",
        controladora.dados.placa,
        "excluída."
      );
    }
  }

  // if (controladora.dados.placa === existingControladora.Placa) {
  //   throw new Error("Placa não pode ser repetida");
  // }
  // Insere novas molas ou atualiza as já existentes mas deletadas
  for (const mola of molasNovasArray) {
    if (molasExistentesArray.includes(mola)) {
      const sqlRequest = new sql.Request(transaction);

      const query = `
      
        UPDATE Controladoras SET Deleted = 0 WHERE ID_DM = @ID_DM AND Mola1 = @Mola1 AND Placa = @Placa`;

      sqlRequest.input("ID_Cliente", sql.Int, clienteId);
      sqlRequest.input("ID_DM", sql.Int, dmId);
      sqlRequest.input("Tipo_Controladora", sql.NVarChar, controladora.tipo);
      sqlRequest.input("Placa", sql.Int, controladora.dados.placa);
      sqlRequest.input("Mola1", sql.Int, mola);

      await sqlRequest.query(query);
      console.log(
        "Mola ",
        mola,
        " da placa ",
        controladora.dados.placa,
        "atualizada."
      );
    } else {
      const sqlRequest = new sql.Request(transaction);

      const query = `
        INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, Placa, Mola1, Sincronizado, Deleted)
        VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @Placa, @Mola1, 0, 0)`;

      sqlRequest.input("ID_Cliente", sql.Int, clienteId);
      sqlRequest.input("ID_DM", sql.Int, dmId);
      sqlRequest.input("Tipo_Controladora", sql.NVarChar, controladora.tipo);
      sqlRequest.input("Placa", sql.Int, controladora.dados.placa);
      sqlRequest.input("Mola1", sql.Int, mola);

      await sqlRequest.query(query);
      console.log(
        "Mola ",
        mola,
        " da placa ",
        controladora.dados.placa,
        "inserida."
      );
    }
  }
}

async function adicionarControladora2024(
  transaction,
  controladora,
  dmId,
  clienteId
) {
  const sqlRequest = new sql.Request(transaction);

  for (const mola1 of controladora.dados.mola1) {
    const query = `
      INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, Placa, Mola1, Sincronizado, Deleted)
      VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @Placa, @Mola1, 0, 0)`;

    sqlRequest.input("ID_Cliente", sql.Int, clienteId);
    sqlRequest.input("ID_DM", sql.Int, dmId);
    sqlRequest.input("Tipo_Controladora", sql.NVarChar, controladora.tipo);
    sqlRequest.input("Placa", sql.Int, controladora.dados.placa);
    sqlRequest.input("Mola1", sql.Int, mola1);

    await sqlRequest.query(query);
  }

  for (const mola2 of controladora.dados.mola2) {
    const query = `
      INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, Placa, Mola2, Sincronizado, Deleted)
      VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @Placa, @Mola2, 0, 0)`;

    sqlRequest.input("Mola2", sql.Int, mola2);

    await sqlRequest.query(query);
  }
}
async function adicionarControladoraLocker(
  transaction,
  controladora,
  dmId,
  clienteId
) {
 
  for (const posicao of controladora.dados.posicao) {
    const sqlRequest = new sql.Request(transaction);

    const query = `
      INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, DIP, Posicao, Sincronizado, Deleted)
      VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @DIP, @Posicao, 0, 0)`;

    sqlRequest.input("ID_Cliente", sql.Int, clienteId);
    sqlRequest.input("ID_DM", sql.Int, dmId);
    sqlRequest.input("Tipo_Controladora", sql.NVarChar, controladora.tipo);
    sqlRequest.input("DIP", sql.Int, controladora.dados.dip);
    sqlRequest.input("Posicao", sql.Int, posicao);

    await sqlRequest.query(query);
  }
}
async function adicionarControladora2023(
  transaction,
  controladora,
  dmId,
  clienteId
) {
  for (const andar of controladora.dados.andar) {
    for (const posicao of controladora.dados.posicao) {
      const query = `
        INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, DIP, Andar, Posicao, Sincronizado, Deleted)
        VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @DIP, @Andar, @Posicao, 0, 0)`;
      const sqlRequest = new sql.Request(transaction);

      sqlRequest.input("ID_Cliente", sql.Int, clienteId);
      sqlRequest.input("ID_DM", sql.Int, dmId);
      sqlRequest.input("Tipo_Controladora", sql.NVarChar, controladora.tipo);
      sqlRequest.input("DIP", sql.Int, controladora.dados.dip);
      sqlRequest.input("Andar", sql.Int, andar);
      sqlRequest.input("Posicao", sql.Int, posicao);

      await sqlRequest.query(query);
    }
  }
}
async function adicionarControladora2018(
  transaction,
  controladora,
  dmId,
  clienteId
) {
  for (const mola of controladora.dados.molas) {
    const query = `
      INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, Placa, Mola1, Sincronizado, Deleted)
      VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @Placa, @Mola1, 0, 0)`;
    const sqlRequest = new sql.Request(transaction);

    sqlRequest.input("ID_Cliente", sql.Int, clienteId);
    sqlRequest.input("ID_DM", sql.Int, dmId);
    sqlRequest.input("Tipo_Controladora", sql.NVarChar, controladora.tipo);
    sqlRequest.input("Placa", sql.Int, controladora.dados.placa);
    sqlRequest.input("Mola1", sql.Int, mola);

    await sqlRequest.query(query);
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
      request.input("id_dm", sql.Int, id_dm);
      request.input("id_cliente", sql.Int, id_cliente);
      const result = await request.query(query);

      const itensFiltrados = result.recordset.map((row) => {
        let posicao;
        let modeloControladora;
        switch (row.Controladora) {
          case "2018":
            posicao = `${row.Controladora} / ${row.Placa} / ${row.Motor1} / ${row.Motor2}`;
            break;
          case "2023":
            posicao = `${row.Controladora} / ${row.DIP} / ${row.Andar} / ${row.Posicao}`;
            break;
          case "Locker":
          case "Locker-Padrao":
          case "Locker-Ker":
            posicao = `${row.Controladora} / ${row.DIP} / ${row.Posicao}`;
            break;
          default:
            posicao = "Posição desconhecida";
        }

        modeloControladora = `${row.Controladora}`;

        return {
          id_produto: row.id_produto,
          id_item: row.id_item,
          SKU: row.sku,
          Nome_Produto: row.nome,
          QTD: row.quantidade,
          Posicao: posicao,
          modelo: modeloControladora,
          mola: row.Motor1,
          Capacidade: row.capacidade,
        };
      });

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

async function adicionarItens(request, response) {
  const {
    id_produto,
    Motor1,
    Motor2,
    id_cliente,
    id_dm,
    Controladora,
    tipo_controladora,
    id_usuario,
    Dip,
    Posicao,
    Placa,
    Andar,
    Capacidade,
  } = request.body;

  const insertQuery = `INSERT INTO DM_itens (
    id_item, id_cliente, ID_DM, id_produto, Controladora, Placa, Motor1, Motor2, 
    DIP, Andar, Posicao, quantidade, quantidademinima, capacidade, deleted, nome, 
    ProdutoCodigo, sku, unidade_medida, imagem1, ca,Sincronizado
) 
VALUES (
    @id_item, @id_cliente, @ID_DM, @id_produto, @Controladora, @Placa, @Motor1, @Motor2, 
    @DIP, @Andar, @Posicao, @quantidade, @quantidademinima, @capacidade, @deleted, @nome, 
    @ProdutoCodigo, @sku, @unidade_medida, @imagem1, @ca,@Sincronizado
)`;

  try {
    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado");
      return;
    }
    const sqlRequest = new sql.Request();
    const produtoQuery = `SELECT nome, codigo AS ProdutoCodigo, codigo AS sku, unidade_medida, imagem1, quantidademinima, ca
                          FROM produtos
                          WHERE id_produto = @id_produto`;
    sqlRequest.input("id_produto", sql.Int, id_produto);
    const produtoResult = await sqlRequest.query(produtoQuery);

    if (produtoResult.recordset.length === 0) {
      response.status(404).json("Produto não encontrado");
      return;
    }

    const produto = produtoResult.recordset[0];
    const {
      nome,
      ProdutoCodigo,
      sku,
      unidade_medida,
      imagem1,
      quantidademinima,
      ca,
    } = produto;

    const nextIdItem = await obterProximoIdItem();

    const sqlRequest2 = new sql.Request();
    const params = {
      id_item: nextIdItem,
      id_cliente: id_cliente,
      ID_DM: id_dm,
      id_produto: id_produto,
      Controladora: tipo_controladora,
      Placa: Placa,
      Motor1: Motor1,
      Motor2: Motor2 ? Motor2 : 0,
      DIP: Dip,
      Andar: null,
      Posicao: null,
      quantidade: 0,
      capacidade: Capacidade,
      Sincronizado: 0,
      deleted: false,
      nome: nome,
      ProdutoCodigo: ProdutoCodigo,
      sku: sku,
      unidade_medida: unidade_medida,
      imagem1: imagem1,
      ca: ca,
      quantidademinima: quantidademinima,
    };
    sqlRequest2.input("id_item", sql.Int, nextIdItem);
    sqlRequest2.input("id_cliente", sql.Int, id_cliente);
    sqlRequest2.input("ID_DM", sql.Int, id_dm);
    sqlRequest2.input("id_produto", sql.Int, id_produto);
    sqlRequest2.input("Controladora", sql.VarChar, tipo_controladora);
    sqlRequest2.input("Placa", sql.Int, Placa);
    sqlRequest2.input("Motor1", sql.Int, Motor1);
    sqlRequest2.input("Motor2", sql.Int, Motor2 ? Motor2 : 0);
    sqlRequest2.input("DIP", sql.Int, Dip);
    sqlRequest2.input("Andar", sql.Int, Andar);
    sqlRequest2.input("Posicao", sql.Int, Posicao);
    sqlRequest2.input("quantidade", sql.Int, 0);
    sqlRequest2.input("capacidade", sql.Int, Capacidade);
    sqlRequest2.input("deleted", sql.Bit, false);
    sqlRequest2.input("nome", sql.NVarChar, nome);
    sqlRequest2.input("ProdutoCodigo", sql.NVarChar, ProdutoCodigo);
    sqlRequest2.input("sku", sql.NVarChar, sku);
    sqlRequest2.input("unidade_medida", sql.NVarChar, unidade_medida);
    sqlRequest2.input("imagem1", sql.NVarChar, imagem1);
    sqlRequest2.input("ca", sql.NVarChar, ca);
    sqlRequest2.input("quantidademinima", sql.Int, quantidademinima);
    sqlRequest2.input("Sincronizado", sql.Int, 0);

    const insertResult = await sqlRequest2.query(insertQuery);
    if (insertResult.rowsAffected[0] > 0) {
      //logQuery('info', `Usuário ${id_usuario} adicionou um novo item a dm ${id_dm}`, 'sucesso', 'INSERT', id_cliente, id_usuario, insertQuery, params);
      response.status(201).send("Item DM criado com sucesso!");
    } else {
      //logQuery('error',  `Usuário ${id_usuario} falhou ao adicionar um novo item a dm ${id_dm}`, 'falha', 'INSERT', id_cliente, id_usuario, insertQuery, params);
      response.status(400).send("Falha ao criar o item DM!");
    }
  } catch (error) {
    const errorMessage = error.message.includes(
      "Query não fornecida para logging"
    )
      ? "Erro crítico: Falha na operação"
      : `Erro ao adicionar Centro de Custo: ${error.message}`;
    //logQuery('error',  errorMessage, 'falha', 'INSERT', id_cliente, id_usuario, insertQuery, params);
    console.error("Erro ao executar a consulta:", error);
    response.status(500).send("Erro interno do servidor");
  }
}
async function atualizarItemDM(request, response) {
  const {
    id_item,
    id_produto,
    Placa,
    Motor1,
    Motor2,
    id_cliente,
    id_dm,
    Controladora,
    tipo_controladora,
    id_usuario,
    Dip,
    Posicao,
    Andar,
  } = request.body;

  const updateQuery = `
    UPDATE DM_itens
    SET
      id_produto = @id_produto,
      Controladora = @Controladora,
      Placa = @Placa,
      Motor1 = @Motor1,
      Motor2 = @Motor2,
      DIP = @DIP,
      Andar = @Andar,
      Posicao = @Posicao,
      quantidade = @quantidade,
      quantidademinima = @quantidademinima,
      capacidade = @capacidade,
      deleted = @deleted,
      nome = @nome,
      ProdutoCodigo = @ProdutoCodigo,
      sku = @sku,
      unidade_medida = @unidade_medida,
      imagem1 = @imagem1,
      ca = @ca,
      Sincronizado = @Sincronizado
    WHERE
      id_item = @id_item
    AND id_cliente = @id_cliente
    AND ID_DM = @ID_DM
  `;

  try {
    if (!id_cliente || !id_item) {
      response.status(401).json("ID do cliente ou ID do item não enviado");
      return;
    }

    const sqlRequest = new sql.Request();
    const produtoQuery = `
      SELECT nome, codigo AS ProdutoCodigo, codigo AS sku, unidade_medida, imagem1, quantidademinima, ca, capacidade
      FROM produtos
      WHERE id_produto = @id_produto
    `;
    sqlRequest.input("id_produto", sql.Int, id_produto);
    const produtoResult = await sqlRequest.query(produtoQuery);

    if (produtoResult.recordset.length === 0) {
      response.status(404).json("Produto não encontrado");
      return;
    }

    const produto = produtoResult.recordset[0];
    const {
      nome,
      ProdutoCodigo,
      sku,
      unidade_medida,
      imagem1,
      quantidademinima,
      ca,
      capacidade,
    } = produto;

    const sqlRequest2 = new sql.Request();
    const params = {
      id_item: id_item,
      id_cliente: id_cliente,
      ID_DM: id_dm,
      id_produto: id_produto,
      Controladora: tipo_controladora,
      Placa: Placa,
      Motor1: Motor1,
      Motor2: Motor2 ? Motor2 : 0,
      DIP: Dip,
      Andar: Andar,
      Posicao: Posicao,
      Sincronizado: 0,
      quantidade: 0, // Atualize conforme necessário
      capacidade: capacidade,
      deleted: false, // Atualize conforme necessário
      nome: nome,
      ProdutoCodigo: ProdutoCodigo,
      sku: sku,
      unidade_medida: unidade_medida,
      imagem1: imagem1,
      ca: ca,
      quantidademinima: quantidademinima,
    };

    sqlRequest2.input("id_item", sql.Int, id_item);
    sqlRequest2.input("id_cliente", sql.Int, id_cliente);
    sqlRequest2.input("ID_DM", sql.Int, id_dm);
    sqlRequest2.input("id_produto", sql.Int, id_produto);
    sqlRequest2.input("Controladora", sql.VarChar, tipo_controladora);
    sqlRequest2.input("Placa", sql.Int, Placa);
    sqlRequest2.input("Motor1", sql.Int, Motor1);
    sqlRequest2.input("Motor2", sql.Int, Motor2 ? Motor2 : 0);
    sqlRequest2.input("DIP", sql.Int, Dip);
    sqlRequest2.input("Andar", sql.Int, Andar);
    sqlRequest2.input("Posicao", sql.Int, Posicao);
    sqlRequest2.input("Sincronizado", sql.Int, 0);
    sqlRequest2.input("quantidade", sql.Int, 0); // Atualize conforme necessário
    sqlRequest2.input("capacidade", sql.Int, capacidade);
    sqlRequest2.input("deleted", sql.Bit, false); // Atualize conforme necessário
    sqlRequest2.input("nome", sql.NVarChar, nome);
    sqlRequest2.input("ProdutoCodigo", sql.NVarChar, ProdutoCodigo);
    sqlRequest2.input("sku", sql.NVarChar, sku);
    sqlRequest2.input("unidade_medida", sql.NVarChar, unidade_medida);
    sqlRequest2.input("imagem1", sql.NVarChar, imagem1);
    sqlRequest2.input("ca", sql.NVarChar, ca);
    sqlRequest2.input("quantidademinima", sql.Int, quantidademinima);

    const updateResult = await sqlRequest2.query(updateQuery);
    if (updateResult.rowsAffected[0] > 0) {
      response.status(200).send("Item DM atualizado com sucesso!");
    } else {
      response.status(404).send("Item DM não encontrado ou não atualizado.");
    }
  } catch (error) {
    console.error("Erro ao executar a atualização:", error);
    response.status(500).send("Erro ao atualizar o item DM.");
  }
}
async function deletarItensDM(request, response) {
  const id_item = request.body.id_item;
  const id_usuario = request.body.id_usuario;
  const id_cliente = request.body.id_cliente;
  const query =
    "UPDATE DM_Itens SET deleted = 1,Sincronizado = 0 WHERE id_item = @id_item";
  const params = {
    id_item: id_item,
  };
  try {
    if (!id_item) {
      response.status(401).json("ID do item não enviado");
      return;
    }
    const sqlRequest = new sql.Request();
    sqlRequest.input("id_item", sql.Int, id_item);
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
    ID_DM: ID_DM,
  };
  try {
    if (!ID_DM) {
      response.status(401).json("ID da DM não enviado");
      return;
    }
    const sqlRequest = new sql.Request();
    sqlRequest.input("ID_DM", sql.Int, ID_DM);
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
async function recuperarClienteInfo(request, response) {
  const id_cliente = request.body.id_cliente;
  try {
    const query = `SELECT ID_DM, Identificacao, ClienteID, UserID, URL, Chave, ChaveAPI FROM DMs WHERE ID_Cliente = @id_cliente AND Deleted = 0 AND Integracao = 1`;
    const transaction = new sql.Transaction();
    await transaction.begin();

    const sqlRequest = new sql.Request(transaction);
    sqlRequest.input("id_cliente", sql.Int, id_cliente);

    const result = await sqlRequest.query(query);

    await transaction.commit();
    if (result.recordset.length > 0) {
      return response.status(200).json(result.recordset);
    } else {
      return response
        .status(401)
        .json({ message: "Nenhuma Maquina com Integração registrada." });
    }
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }
    console.error("Erro ao recuperar informações do cliente:", error);
    throw error;
  }
}
async function updateClienteInfo(request, response) {
  const { id_cliente, ID_DM, ClienteID, UserID, URL, Chave, ChaveAPI } =
    request.body;
  try {
    const query = `
    UPDATE DMs
    SET 
      ClienteID = @ClienteID,
      UserID = @UserID,
      URL = @URL,
      Chave = @Chave,
      ChaveAPI = @ChaveAPI,
      Sincronizado = 0
    WHERE 
      ID_Cliente = @id_cliente 
      AND ID_DM = @ID_DM
  `;
    const transaction = new sql.Transaction();
    await transaction.begin();
    if (!ID_DM || !id_cliente) {
      return response
        .status(404)
        .json({ message: "informações insusficientes" });
    }
    const sqlRequest = new sql.Request(transaction);
    sqlRequest.input("id_cliente", sql.Int, id_cliente);
    sqlRequest.input("ID_DM", sql.Int, ID_DM);
    sqlRequest.input("ClienteID", sql.NVarChar, ClienteID);
    sqlRequest.input("UserID", sql.NVarChar, UserID);
    sqlRequest.input("URL", sql.NVarChar, URL);
    sqlRequest.input("Chave", sql.NVarChar, Chave);
    sqlRequest.input("ChaveAPI", sql.NVarChar, ChaveAPI);

    const result = await sqlRequest.query(query);

    await transaction.commit();
    if (result.rowsAffected > 0) {
      return response.status(200).json({ message: "Atualizado com sucesso" });
    } else {
      return response
        .status(404)
        .json({ message: "Nenhuma informação encontrada para o cliente." });
    }
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }
    console.error("Erro ao recuperar informações do cliente:", error);
    throw error;
  }
}
module.exports = {
  adicionar,
  listarDM,
  listarDMPaginado,
  listarItensDM,
  listarDMResumido2,
  adicionarItens,
  deletarItensDM,
  atualizar,
  atualizarItemDM,
  deletarDM,
  listarDMResumido,
  recuperarClienteInfo,
  updateClienteInfo,
};
