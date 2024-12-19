const sql = require("mssql");
/**
 * Função para obter o próximo ID disponível para um item na tabela DM_itens.
 *
 * @returns {Promise<number>} Retorna o próximo ID disponível para um item.
 */
async function obterProximoIdItem() {
  const sqlRequest = new sql.Request();
  const query = `SELECT ISNULL(MAX(id_item), 0) + 1 AS NextIdItem FROM DM_itens`;
  const result = await sqlRequest.query(query);
  return result.recordset[0].NextIdItem;
}

/**
 * Função para listar as DMs (Dispositivos de Manutenção) com suas respectivas controladoras.
 *
 * @param {Object} request - O objeto da requisição contendo o ID do cliente (opcional).
 * @param {Object} response - O objeto da resposta que será enviado ao cliente.
 *
 * @returns {void} Retorna uma resposta HTTP com a lista de DMs e controladoras ou um erro.
 */
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
          row.Tipo_Controladora === "Locker"
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
              ...new Set([...controladoraExistente.Mola1, row.Posicao]),
            ];
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
            Mola2: row.Mola2 ? [row.Mola2] : [],
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

/**
 * Função para listar as DMs de forma resumida, contendo apenas o `id_dm` e `Identificacao`.
 *
 * @param {Object} request - O objeto da requisição contendo o `id_cliente` (opcional).
 * @param {Object} response - O objeto da resposta que será enviado ao cliente.
 *
 * @returns {void} Retorna uma resposta HTTP com a lista resumida de DMs ou um erro.
 */
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

/**
 * Função para inserir uma controladora genérica no banco de dados, com base no tipo de controladora.
 *
 * @param {Object} transaction - A transação SQL em que a inserção será realizada.
 * @param {Object} controladora - Objeto contendo os dados da controladora a ser inserida.
 * @param {number} dmId - O ID do DM onde a controladora será associada.
 * @param {number} clienteId - O ID do cliente associado à controladora.
 *
 * @returns {Promise<void>} Retorna uma Promise que resolve quando a inserção for concluída.
 */
async function inserirControladoraGenerica(
  transaction,
  controladora,
  dmId,
  clienteId
) {
  // Verifica o tipo da controladora e realiza a inserção adequada
  const tipoControladora = controladora.tipo;

  if (tipoControladora === "2018") {
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
  } else if (tipoControladora === "2023") {
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
  } else if (tipoControladora === "Locker") {
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

/**
 * Função responsável por adicionar uma nova DM (Digital Media) no banco de dados, incluindo as controladoras associadas.
 *
 * @async
 * @function adicionar
 * @param {object} request - O objeto de solicitação HTTP.
 * @param {object} response - O objeto de resposta HTTP.
 * @returns {void} Retorna uma resposta HTTP com status de sucesso ou erro.
 */
async function adicionar(request, response) {
  // Desestruturação dos dados recebidos do corpo da solicitação.
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

  // Declara a consulta SQL para inserir uma nova DM.
  const queryDM = `
    INSERT INTO DMs (
      ID_Cliente, Numero, Devolucao, Identificacao, Ativo, Deleted, Created, Updated, Versao, Enviada, OP_Senha, 
      OP_Biometria, OP_Facial, Integracao, ClienteID, ClienteNome, UserID, Chave, ID_CR_Usuario, URL, Sincronizado, ChaveAPI)
    OUTPUT INSERTED.ID_DM
    VALUES (
      @ID_Cliente, @Numero, @Devolucao, @Identificacao, @Ativo, @Deleted, @Created, @Updated, @Versao, @Enviada, 
      @OP_Senha, @OP_Biometria, @OP_Facial, @Integracao, @ClienteID, @ClienteNome, @UserID, @Chave, @ID_CR_Usuario, 
      @URL, @Sincronizado, @ChaveAPI)`;

  let transaction;

  try {
    // Verifica se o 'IDcliente' foi enviado na requisição. Se não, retorna erro.
    if (!IDcliente) {
      return response.status(401).json("ID do cliente não enviado");
    }

    // Cria e inicia uma nova transação SQL.
    transaction = new sql.Transaction();
    await transaction.begin();

    // Prepara a consulta SQL com os dados fornecidos.
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

    // Define a URL a ser inserida, dependendo se a integração é ativada.
    const urlToInsert = Integracao
      ? "https://api.mobsolucoesdigitais.com.br"
      : URL;
    sqlRequest.input("URL", sql.NVarChar, urlToInsert);

    // Executa a consulta SQL para inserir a DM e obter o ID da DM inserida.
    const resultDM = await sqlRequest.query(queryDM);
    const dmId = resultDM.recordset[0].ID_DM;

    // Se houver controladoras, insere cada uma delas associada à DM criada.
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

    // Confirma a transação no banco de dados.
    await transaction.commit();
    response.status(201).send("DM e Controladoras criadas com sucesso!");
  } catch (error) {
    // Em caso de erro, desfaz a transação e retorna uma mensagem de erro.
    if (transaction) await transaction.rollback();
    console.error("Erro ao adicionar DM:", error);
    response.status(500).send("Erro ao adicionar DM");
  }
}

/**
 * Função responsável por adicionar uma nova DM (Digital Media) no banco de dados, incluindo as controladoras associadas.
 *
 * @async
 * @function adicionar
 * @param {object} request - O objeto de solicitação HTTP.
 * @param {object} response - O objeto de resposta HTTP.
 * @returns {void} Retorna uma resposta HTTP com status de sucesso ou erro.
 */
async function adicionar(request, response) {
  // Desestruturação dos dados recebidos do corpo da solicitação.
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

  // Declara a consulta SQL para inserir uma nova DM.
  const queryDM = `
    INSERT INTO DMs (
      ID_Cliente, Numero, Devolucao, Identificacao, Ativo, Deleted, Created, Updated, Versao, Enviada, OP_Senha, 
      OP_Biometria, OP_Facial, Integracao, ClienteID, ClienteNome, UserID, Chave, ID_CR_Usuario, URL, Sincronizado, ChaveAPI)
    OUTPUT INSERTED.ID_DM
    VALUES (
      @ID_Cliente, @Numero, @Devolucao, @Identificacao, @Ativo, @Deleted, @Created, @Updated, @Versao, @Enviada, 
      @OP_Senha, @OP_Biometria, @OP_Facial, @Integracao, @ClienteID, @ClienteNome, @UserID, @Chave, @ID_CR_Usuario, 
      @URL, @Sincronizado, @ChaveAPI)`;

  let transaction;

  try {
    // Verifica se o 'IDcliente' foi enviado na requisição. Se não, retorna erro.
    if (!IDcliente) {
      return response.status(401).json("ID do cliente não enviado");
    }

    // Cria e inicia uma nova transação SQL.
    transaction = new sql.Transaction();
    await transaction.begin();

    // Prepara a consulta SQL com os dados fornecidos.
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

    // Define a URL a ser inserida, dependendo se a integração é ativada.
    const urlToInsert = Integracao
      ? "https://api.mobsolucoesdigitais.com.br"
      : URL;
    sqlRequest.input("URL", sql.NVarChar, urlToInsert);

    // Executa a consulta SQL para inserir a DM e obter o ID da DM inserida.
    const resultDM = await sqlRequest.query(queryDM);
    const dmId = resultDM.recordset[0].ID_DM;

    // Se houver controladoras, insere cada uma delas associada à DM criada.
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

    // Confirma a transação no banco de dados.
    await transaction.commit();
    response.status(201).send("DM e Controladoras criadas com sucesso!");
  } catch (error) {
    // Em caso de erro, desfaz a transação e retorna uma mensagem de erro.
    if (transaction) await transaction.rollback();
    console.error("Erro ao adicionar DM:", error);
    response.status(500).send("Erro ao adicionar DM");
  }
}

/**
 * Função responsável por atualizar uma DM existente no banco de dados, incluindo as controladoras associadas.
 *
 * @async
 * @function atualizar
 * @param {object} request - O objeto de solicitação HTTP.
 * @param {object} response - O objeto de resposta HTTP.
 * @returns {void} Retorna uma resposta HTTP com status de sucesso ou erro.
 */
async function atualizar(request, response) {
  // Desestruturação dos dados recebidos do corpo da solicitação.
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

  // Exibe no console os dados recebidos para facilitar o debug.
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
    // Verifica se os campos 'ID_DM' e 'IDcliente' foram enviados.
    if (!ID_DM || !IDcliente) {
      return response
        .status(400)
        .json({ message: "ID_DM e IDcliente são obrigatórios." });
    }

    // Cria e inicia uma nova transação SQL.
    transaction = new sql.Transaction();
    await transaction.begin();

    // Prepara a consulta SQL para atualizar a DM existente.
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

    // Executa a consulta de atualização da DM no banco de dados.
    await requestDM.query(updateDMQuery);

    // Prepara a consulta para buscar controladoras associadas à DM.
    const requestControladoras = new sql.Request(transaction);
    const selectControladorasQuery = `SELECT * FROM Controladoras WHERE ID_DM = @ID_DM AND Deleted = 0`;
    requestControladoras.input("ID_DM", sql.Int, ID_DM);

    // Executa a consulta e mapeia as controladoras existentes.
    const resultControladoras = await requestControladoras.query(
      selectControladorasQuery
    );
    const existingControladorasMap = new Map();
    resultControladoras.recordset.forEach((ctrl) => {
      if (ctrl.Tipo_Controladora === "2018") {
        existingControladorasMap.set(ctrl.Placa, ctrl); // Mapeia por placa
      } else if (
        ctrl.Tipo_Controladora === "2023" ||
        ctrl.Tipo_Controladora === "Locker"
      ) {
        existingControladorasMap.set(ctrl.DIP, ctrl); // Mapeia por DIP
      }
    });

    /**
     * Função que atualiza ou insere controladoras com base no tipo especificado (2018, 2023, Locker, 2024).
     * Para cada controladora, verifica se já existe uma controladora com o mesmo identificador (placa ou DIP).
     * Se existir, ela é atualizada; caso contrário, uma nova controladora é inserida.
     *
     * @async
     * @function atualizarControladoras
     * @param {Array} Controladoras - Lista de controladoras a serem processadas.
     * @param {Transaction} transaction - A transação SQL em andamento.
     * @param {number} ID_DM - O ID da DM associada.
     * @param {number} IDcliente - O ID do cliente associado.
     * @param {Map} existingControladorasMap - Mapa que contém controladoras já existentes, mapeadas por placa ou DIP.
     * @returns {void} Retorna uma resposta HTTP com status de sucesso ou erro após processar as controladoras.
     */
    for (const controladora of Controladoras) {
      // Verifica o tipo da controladora e processa de acordo com o tipo especificado.
      if (controladora.tipo === "2018") {
        // Busca uma controladora existente com base na placa.
        const existingControladora = existingControladorasMap.get(
          controladora.dados.placa
        );

        if (existingControladora) {
          // Se a controladora existir, atualiza a controladora existente.
          await atualizarControladora2018(
            transaction,
            controladora,
            ID_DM,
            IDcliente,
            existingControladora
          );
        } else {
          // Caso a controladora não exista, adiciona uma nova controladora 2018.
          console.log(controladora);
          await adicionarControladora2018(
            transaction,
            controladora,
            ID_DM,
            IDcliente
          );
        }
      } else if (controladora.tipo === "2023") {
        // Busca uma controladora existente com base no DIP.
        const existingControladora = existingControladorasMap.get(
          controladora.dados.dip
        );

        if (existingControladora) {
          // Se a controladora existir, atualiza a controladora existente.
          await atualizarControladora2023(
            transaction,
            controladora,
            ID_DM,
            IDcliente,
            existingControladora
          );
        } else {
          // Caso a controladora não exista, adiciona uma nova controladora 2023.
          await adicionarControladora2023(
            transaction,
            controladora,
            ID_DM,
            IDcliente
          );
        }
      } else if (controladora.tipo === "Locker") {
        // Busca uma controladora existente com base no DIP.
        const existingControladora = existingControladorasMap.get(
          controladora.dados.dip
        );

        if (existingControladora) {
          // Se a controladora existir, atualiza a controladora existente.
          await atualizarControladoraLocker(
            transaction,
            controladora,
            ID_DM,
            IDcliente,
            existingControladora
          );
        } else {
          // Caso a controladora não exista, adiciona uma nova controladora Locker.
          await adicionarControladoraLocker(
            transaction,
            controladora,
            ID_DM,
            IDcliente
          );
        }
      } else if (controladora.tipo === "2024") {
        // Busca uma controladora existente com base na placa.
        const existingControladora = existingControladorasMap.get(
          controladora.dados.placa
        );

        if (existingControladora) {
          // Se a controladora existir, atualiza a controladora existente.
          await atualizarControladora2024(
            transaction,
            controladora,
            ID_DM,
            IDcliente,
            existingControladora
          );
        } else {
          // Caso a controladora não exista, adiciona uma nova controladora 2024.
          await adicionarControladora2024(
            transaction,
            controladora,
            ID_DM,
            IDcliente
          );
        }
      }
    }

    // Após todas as controladoras serem processadas, confirma a transação no banco de dados.
    await transaction.commit();

    // Retorna uma resposta HTTP indicando que as DM e controladoras foram atualizadas com sucesso.
    response
      .status(200)
      .json({ message: "DM e controladoras atualizadas com sucesso." });
  } catch (error) {
    // Em caso de erro, desfaz a transação e retorna uma mensagem de erro.
    if (transaction) await transaction.rollback();
    console.error("Erro ao atualizar DM:", error);
    response.status(500).json({ message: "Erro ao atualizar DM." });
  }
}

/**
 * Atualiza ou insere novas molas para controladoras do tipo 2024.
 * Esta função compara as molas existentes nas controladoras com as novas molas informadas,
 * removendo molas que não estão mais presentes e inserindo novas molas.
 *
 * @async
 * @function atualizarControladora2024
 * @param {Transaction} transaction - A transação SQL em andamento.
 * @param {Object} controladora - O objeto que contém os dados da controladora a ser atualizada.
 * @param {number} dmId - O ID da DM associada à controladora.
 * @param {number} clienteId - O ID do cliente associado à controladora.
 * @param {Object} existingControladora - O objeto contendo os dados da controladora existente, incluindo molas.
 * @returns {Promise<void>} Retorna uma promessa que representa a execução da operação.
 */
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

/**
 * Atualiza ou insere novas posições para controladoras do tipo Locker.
 * A função compara as posições existentes nas controladoras com as novas posições fornecidas,
 * removendo posições antigas e inserindo novas posições.
 *
 * @async
 * @function atualizarControladoraLocker
 * @param {Transaction} transaction - A transação SQL em andamento.
 * @param {Object} controladora - O objeto que contém os dados da controladora a ser atualizada.
 * @param {number} dmId - O ID da DM associada à controladora.
 * @param {number} clienteId - O ID do cliente associado à controladora.
 * @param {Object} existingControladora - O objeto contendo os dados da controladora existente, incluindo as posições.
 * @returns {Promise<void>} Retorna uma promessa que representa a execução da operação.
 */
async function atualizarControladoraLocker(
  transaction,
  controladora,
  dmId,
  clienteId,
  existingControladora
) {
  const novasPosicoes = new Set(controladora.dados.posicao);
  const posicoesExistentes = new Set(existingControladora.Posicao);

  // Remove posições antigas
  for (const posicao of posicoesExistentes) {
    if (!novasPosicoes.has(posicao)) {
      const sqlRequest = new sql.Request(transaction);
      const query = `
        UPDATE Controladoras SET Deleted = 1 WHERE ID_DM = @ID_DM AND Posicao = @Posicao`;

      sqlRequest.input("ID_DM", sql.Int, dmId);
      sqlRequest.input("Posicao", sql.Int, posicao);

      await sqlRequest.query(query);
    }
  }

  // Insere novas posições
  for (const posicao of novasPosicoes) {
    if (!posicoesExistentes.has(posicao)) {
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
}

/**
 * Atualiza ou insere novas posições e andares para controladoras do tipo 2023.
 * A função compara as posições e andares existentes nas controladoras com as novas informações fornecidas,
 * removendo as posições e andares antigos e inserindo os novos.
 *
 * @async
 * @function atualizarControladora2023
 * @param {Transaction} transaction - A transação SQL em andamento.
 * @param {Object} controladora - O objeto que contém os dados da controladora a ser atualizada.
 * @param {number} dmId - O ID da DM associada à controladora.
 * @param {number} clienteId - O ID do cliente associado à controladora.
 * @param {Object} existingControladora - O objeto contendo os dados da controladora existente, incluindo posições e andares.
 * @returns {Promise<void>} Retorna uma promessa que representa a execução da operação.
 */
async function atualizarControladora2023(
  transaction,
  controladora,
  dmId,
  clienteId,
  existingControladora
) {
  const novasPosicoes = new Set(controladora.dados.posicao);
  const novasAndares = new Set(controladora.dados.andar);
  const posicoesExistentes = new Set(existingControladora.Posicao);
  const andaresExistentes = new Set(existingControladora.Andar);

  // Remove posições antigas
  for (const posicao of posicoesExistentes) {
    if (!novasPosicoes.has(posicao)) {
      const sqlRequestUpdate = new sql.Request(transaction);
      const updateQuery = `
        UPDATE Controladoras SET Deleted = 1 WHERE ID_DM = @ID_DM AND Posicao = @Posicao`;

      sqlRequestUpdate.input("ID_DM", sql.Int, dmId);
      sqlRequestUpdate.input("Posicao", sql.Int, posicao);

      await sqlRequestUpdate.query(updateQuery);
    }
  }

  // Remove andares antigos
  for (const andar of andaresExistentes) {
    if (!novasAndares.has(andar)) {
      const sqlRequestUpdate = new sql.Request(transaction);
      const updateQuery = `
        UPDATE Controladoras SET Deleted = 1 WHERE ID_DM = @ID_DM AND Andar = @Andar`;

      sqlRequestUpdate.input("ID_DM", sql.Int, dmId);
      sqlRequestUpdate.input("Andar", sql.Int, andar);

      await sqlRequestUpdate.query(updateQuery);
    }
  }

  // Insere novas posições e andares
  for (const posicao of novasPosicoes) {
    if (!posicoesExistentes.has(posicao)) {
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
      sqlRequestInsert.input("Andar", sql.Int, [...novasAndares][0]);
      sqlRequestInsert.input("Posicao", sql.Int, posicao);

      await sqlRequestInsert.query(insertQuery);
    }
  }
}

/**
 * Atualiza ou insere novas molas para controladoras do tipo 2018.
 * A função compara as molas existentes nas controladoras com as novas molas fornecidas,
 * removendo molas antigas e inserindo novas molas.
 *
 * @async
 * @function atualizarControladora2018
 * @param {Transaction} transaction - A transação SQL em andamento.
 * @param {Object} controladora - O objeto que contém os dados da controladora a ser atualizada.
 * @param {number} dmId - O ID da DM associada à controladora.
 * @param {number} clienteId - O ID do cliente associado à controladora.
 * @param {Object} existingControladora - O objeto contendo os dados da controladora existente, incluindo molas.
 * @returns {Promise<void>} Retorna uma promessa que representa a execução da operação.
 */
async function atualizarControladora2018(
  transaction,
  controladora,
  dmId,
  clienteId,
  existingControladora
) {
  const novasMolas = new Set(controladora.dados.molas);
  const molasExistentes = new Set(existingControladora.Mola1);

  // Remove molas antigas
  for (const mola of molasExistentes) {
    if (!novasMolas.has(mola)) {
      const sqlRequest = new sql.Request(transaction);
      const query = `
        UPDATE Controladoras SET Deleted = 1 WHERE ID_DM = @ID_DM AND Mola1 = @Mola1`;

      sqlRequest.input("ID_DM", sql.Int, dmId);
      sqlRequest.input("Mola1", sql.Int, mola);

      await sqlRequest.query(query);
    }
  }

  // Insere novas molas
  for (const mola of novasMolas) {
    if (!molasExistentes.has(mola)) {
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
    }
  }
}

/**
 * Função para adicionar controladoras do tipo 2024 no banco de dados.
 *
 * @param {Object} transaction A transação SQL usada para a execução da query.
 * @param {Object} controladora O objeto que contém os dados da controladora a ser inserida.
 * @param {number} dmId O ID do dispositivo de monitoramento (DM) associado.
 * @param {number} clienteId O ID do cliente associado.
 *
 * @returns {Promise} Retorna uma Promise que resolve quando as queries forem executadas.
 */
async function adicionarControladora2024(
  transaction,
  controladora,
  dmId,
  clienteId
) {
  // Cria uma requisição SQL baseada na transação passada
  const sqlRequest = new sql.Request(transaction);

  // Itera sobre cada mola1 presente nos dados da controladora
  for (const mola1 of controladora.dados.mola1) {
    // Definindo a query SQL de inserção para a mola1
    const query = `INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, Placa, Mola1, Sincronizado, Deleted)
      VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @Placa, @Mola1, 0, 0);`;

    // Passando os valores necessários para a query SQL
    sqlRequest.input("ID_Cliente", sql.Int, clienteId);
    sqlRequest.input("ID_DM", sql.Int, dmId);
    sqlRequest.input("Tipo_Controladora", sql.NVarChar, controladora.tipo);
    sqlRequest.input("Placa", sql.Int, controladora.dados.placa);
    sqlRequest.input("Mola1", sql.Int, mola1);

    // Executa a query de inserção
    await sqlRequest.query(query);
  }

  // Itera sobre cada mola2 presente nos dados da controladora
  for (const mola2 of controladora.dados.mola2) {
    // Definindo a query SQL de inserção para a mola2
    const query = `INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, Placa, Mola2, Sincronizado, Deleted)
      VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @Placa, @Mola2, 0, 0);`;

    // Passando os valores necessários para a query SQL
    sqlRequest.input("Mola2", sql.Int, mola2);

    // Executa a query de inserção
    await sqlRequest.query(query);
  }
}

/**
 * Função para adicionar controladoras do tipo Locker no banco de dados.
 *
 * @param {Object} transaction A transação SQL usada para a execução da query.
 * @param {Object} controladora O objeto que contém os dados da controladora a ser inserida.
 * @param {number} dmId O ID do dispositivo de monitoramento (DM) associado.
 * @param {number} clienteId O ID do cliente associado.
 *
 * @returns {Promise} Retorna uma Promise que resolve quando as queries forem executadas.
 */
async function adicionarControladoraLocker(
  transaction,
  controladora,
  dmId,
  clienteId
) {
  // Cria uma requisição SQL baseada na transação passada
  const sqlRequest = new sql.Request(transaction);

  // Itera sobre cada posição presente nos dados da controladora
  for (const posicao of controladora.dados.posicao) {
    // Definindo a query SQL de inserção para a posição
    const query = `INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, DIP, Posicao, Sincronizado, Deleted)
      VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @DIP, @Posicao, 0, 0);`;

    // Passando os valores necessários para a query SQL
    sqlRequest.input("ID_Cliente", sql.Int, clienteId);
    sqlRequest.input("ID_DM", sql.Int, dmId);
    sqlRequest.input("Tipo_Controladora", sql.NVarChar, controladora.tipo);
    sqlRequest.input("DIP", sql.Int, controladora.dados.dip);
    sqlRequest.input("Posicao", sql.Int, posicao);

    // Executa a query de inserção
    await sqlRequest.query(query);
  }
}

/**
 * Função para adicionar controladoras do tipo 2023 no banco de dados.
 *
 * @param {Object} transaction A transação SQL usada para a execução da query.
 * @param {Object} controladora O objeto que contém os dados da controladora a ser inserida.
 * @param {number} dmId O ID do dispositivo de monitoramento (DM) associado.
 * @param {number} clienteId O ID do cliente associado.
 *
 * @returns {Promise} Retorna uma Promise que resolve quando as queries forem executadas.
 */
async function adicionarControladora2023(
  transaction,
  controladora,
  dmId,
  clienteId
) {
  // Cria uma requisição SQL baseada na transação passada
  const sqlRequest = new sql.Request(transaction);

  // Itera sobre cada andar nos dados da controladora
  for (const andar of controladora.dados.andar) {
    // Itera sobre cada posição nos dados da controladora
    for (const posicao of controladora.dados.posicao) {
      // Definindo a query SQL de inserção para a combinação de andar e posição
      const query = `INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, DIP, Andar, Posicao, Sincronizado, Deleted)
        VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @DIP, @Andar, @Posicao, 0, 0);`;

      // Passando os valores necessários para a query SQL
      sqlRequest.input("ID_Cliente", sql.Int, clienteId);
      sqlRequest.input("ID_DM", sql.Int, dmId);
      sqlRequest.input("Tipo_Controladora", sql.NVarChar, controladora.tipo);
      sqlRequest.input("DIP", sql.Int, controladora.dados.dip);
      sqlRequest.input("Andar", sql.Int, andar);
      sqlRequest.input("Posicao", sql.Int, posicao);

      // Executa a query de inserção
      await sqlRequest.query(query);
    }
  }
}

/**
 * Função para adicionar controladoras do tipo 2018 no banco de dados.
 *
 * @param {Object} transaction A transação SQL usada para a execução da query.
 * @param {Object} controladora O objeto que contém os dados da controladora a ser inserida.
 * @param {number} dmId O ID do dispositivo de monitoramento (DM) associado.
 * @param {number} clienteId O ID do cliente associado.
 *
 * @returns {Promise} Retorna uma Promise que resolve quando as queries forem executadas.
 */
async function adicionarControladora2018(
  transaction,
  controladora,
  dmId,
  clienteId
) {
  // Itera sobre cada mola nos dados da controladora
  for (const mola of controladora.dados.molas) {
    // Definindo a query SQL de inserção para a mola
    const query = `INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, Placa, Mola1, Sincronizado, Deleted)
      VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @Placa, @Mola1, 0, 0);`;

    // Cria uma requisição SQL baseada na transação passada
    const sqlRequest = new sql.Request(transaction);

    // Passando os valores necessários para a query SQL
    sqlRequest.input("ID_Cliente", sql.Int, clienteId);
    sqlRequest.input("ID_DM", sql.Int, dmId);
    sqlRequest.input("Tipo_Controladora", sql.NVarChar, controladora.tipo);
    sqlRequest.input("Placa", sql.NVarChar, controladora.dados.placa);
    sqlRequest.input("Mola1", sql.Int, mola);

    // Executa a query de inserção
    await sqlRequest.query(query);
  }
}

/**
 * Função para listar os itens de um DM (Dispositivo de Monitoramento) específico no banco de dados.
 *
 * @param {Object} request Objeto contendo os dados da requisição, como o ID do DM, cliente e usuário.
 * @param {Object} response Objeto usado para enviar a resposta ao cliente, incluindo status e dados.
 *
 * @returns {Promise} Retorna uma Promise que resolve quando os itens são filtrados e a resposta é enviada.
 */
async function listarItensDM(request, response) {
  try {
    // Recupera os parâmetros enviados na requisição
    const id_dm = request.body.id_dm;
    const id_cliente = request.body.id_cliente;
    const id_usuario = request.body.id_usuario;

    // Verifica se o id_dm foi fornecido
    if (id_dm) {
      // Define a query SQL para buscar os itens do DM
      const query = `
      SELECT * FROM DM_Itens
      WHERE Deleted = 0 AND ID_DM = @id_dm AND ID_Cliente = @id_cliente
    `;
      // Cria uma nova requisição SQL
      const request = new sql.Request();

      // Adiciona parâmetros à query para evitar SQL Injection
      request.input("id_dm", sql.Int, id_dm);
      request.input("id_cliente", sql.Int, id_cliente);

      // Executa a query e aguarda o resultado
      const result = await request.query(query);

      // Filtra e mapeia os dados de cada linha da consulta para o formato desejado
      const itensFiltrados = result.recordset.map((row) => {
        let posicao;
        let modeloControladora;

        // Verifica o tipo de controladora e formata a posição adequadamente
        if (row.Controladora === "2018") {
          posicao = `${row.Controladora} / ${row.Placa} / ${row.Motor1} / ${row.Motor2}`;
        } else if (row.Controladora === "2023") {
          posicao = `${row.Controladora} / ${row.DIP} / ${row.Andar} / ${row.Posicao}`;
        } else if (row.Controladora === "Locker") {
          posicao = `${row.Controladora} / ${row.DIP} / ${row.Posicao}`;
        } else {
          posicao = "Posição desconhecida";
        }

        modeloControladora = `${row.Controladora}`;

        // Retorna um novo objeto com os dados formatados
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

      // Envia a resposta com os itens filtrados e status 200
      response.status(200).json(itensFiltrados);
      return;
    }

    // Caso o id_dm não tenha sido enviado, responde com erro 401
    response.status(401).json("id da DM não enviado");
    return;
  } catch (error) {
    // Caso ocorra algum erro durante a execução, loga e responde com erro 500
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para adicionar novos itens a um DM (Dispositivo de Monitoramento) no banco de dados.
 *
 * @param {Object} request Objeto contendo os dados da requisição, como os detalhes do item a ser adicionado.
 * @param {Object} response Objeto usado para enviar a resposta ao cliente, incluindo status e mensagens de erro.
 *
 * @returns {Promise} Retorna uma Promise que resolve quando o item for adicionado ou em caso de erro.
 */
async function adicionarItens(request, response) {
  // Extrai os parâmetros enviados na requisição
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

  // Define a query de inserção para adicionar o item ao banco de dados
  const insertQuery = `INSERT INTO DM_itens (
    id_item, id_cliente, ID_DM, id_produto, Controladora, Placa, Motor1, Motor2, 
    DIP, Andar, Posicao, quantidade, quantidademinima, capacidade, deleted, nome, 
    ProdutoCodigo, sku, unidade_medida, imagem1, ca
  ) 
  VALUES (
    @id_item, @id_cliente, @ID_DM, @id_produto, @Controladora, @Placa, @Motor1, @Motor2, 
    @DIP, @Andar, @Posicao, @quantidade, @quantidademinima, @capacidade, @deleted, @nome, 
    @ProdutoCodigo, @sku, @unidade_medida, @imagem1, @ca
  )`;

  try {
    // Verifica se o ID do cliente foi fornecido
    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado");
      return;
    }

    // Cria uma requisição SQL para buscar os dados do produto
    const sqlRequest = new sql.Request();
    const produtoQuery = `SELECT nome, codigo AS ProdutoCodigo, codigo AS sku, unidade_medida, imagem1, quantidademinima, ca
                          FROM produtos
                          WHERE id_produto = @id_produto`;

    // Passa o id_produto como parâmetro para evitar SQL Injection
    sqlRequest.input("id_produto", sql.Int, id_produto);

    // Executa a query para buscar os dados do produto
    const produtoResult = await sqlRequest.query(produtoQuery);

    // Verifica se o produto foi encontrado
    if (produtoResult.recordset.length === 0) {
      response.status(404).json("Produto não encontrado");
      return;
    }

    // Extrai os dados do produto retornado
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

    // Obtém o próximo ID do item a ser inserido
    const nextIdItem = await obterProximoIdItem();

    // Cria uma nova requisição SQL para inserir o item
    const sqlRequest2 = new sql.Request();
    const params = {
      id_item: nextIdItem,
      id_cliente: id_cliente,
      ID_DM: id_dm,
      id_produto: id_produto,
      Controladora: tipo_controladora,
      Placa: Placa,
      Motor1: Motor1,
      Motor2: Motor2,
      DIP: Dip,
      Andar: null,
      Posicao: null,
      quantidade: 0,
      capacidade: Capacidade,
      deleted: false,
      nome: nome,
      ProdutoCodigo: ProdutoCodigo,
      sku: sku,
      unidade_medida: unidade_medida,
      imagem1: imagem1,
      ca: ca,
      quantidademinima: quantidademinima,
    };

    // Adiciona os parâmetros da query para evitar SQL Injection
    sqlRequest2.input("id_item", sql.Int, nextIdItem);
    sqlRequest2.input("id_cliente", sql.Int, id_cliente);
    sqlRequest2.input("ID_DM", sql.Int, id_dm);
    sqlRequest2.input("id_produto", sql.Int, id_produto);
    sqlRequest2.input("Controladora", sql.VarChar, tipo_controladora);
    sqlRequest2.input("Placa", sql.Int, Placa);
    sqlRequest2.input("Motor1", sql.Int, Motor1);
    sqlRequest2.input("Motor2", sql.Int, Motor2);
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

    // Executa a query de inserção
    const insertResult = await sqlRequest2.query(insertQuery);

    // Verifica se a inserção foi bem-sucedida
    if (insertResult.rowsAffected[0] > 0) {
      response.status(201).send("Item DM criado com sucesso!");
    } else {
      response.status(400).send("Falha ao criar o item DM!");
    }
  } catch (error) {
    // Trata qualquer erro que ocorrer durante a execução
    const errorMessage = error.message.includes(
      "Query não fornecida para logging"
    )
      ? "Erro crítico: Falha na operação"
      : `Erro ao adicionar Centro de Custo: ${error.message}`;

    console.error("Erro ao executar a consulta:", error);
    response.status(500).send("Erro interno do servidor");
  }
}

/**
 * Função para atualizar os dados de um item em um Dispositivo de Monitoramento (DM).
 *
 * @param {Object} request Objeto contendo os dados para atualização do item DM.
 * @param {Object} response Objeto usado para enviar a resposta ao cliente, incluindo status e mensagens de erro.
 *
 * @returns {Promise} Retorna uma Promise que resolve quando a atualização é concluída.
 */
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

  // Define a query de atualização para o item DM
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
      Sincronizado = 0
    WHERE
      id_item = @id_item
    AND id_cliente = @id_cliente
    AND ID_DM = @ID_DM
  `;

  try {
    // Verifica se os parâmetros essenciais estão presentes
    if (!id_cliente || !id_item) {
      response.status(401).json("ID do cliente ou ID do item não enviado");
      return;
    }

    // Consulta para recuperar os dados do produto
    const sqlRequest = new sql.Request();
    const produtoQuery = `
      SELECT nome, codigo AS ProdutoCodigo, codigo AS sku, unidade_medida, imagem1, quantidademinima, ca, capacidade
      FROM produtos
      WHERE id_produto = @id_produto
    `;
    sqlRequest.input("id_produto", sql.Int, id_produto);
    const produtoResult = await sqlRequest.query(produtoQuery);

    // Verifica se o produto foi encontrado
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

    // Define os parâmetros para a query de atualização
    const sqlRequest2 = new sql.Request();
    sqlRequest2.input("id_item", sql.Int, id_item);
    sqlRequest2.input("id_cliente", sql.Int, id_cliente);
    sqlRequest2.input("ID_DM", sql.Int, id_dm);
    sqlRequest2.input("id_produto", sql.Int, id_produto);
    sqlRequest2.input("Controladora", sql.VarChar, tipo_controladora);
    sqlRequest2.input("Placa", sql.Int, Placa);
    sqlRequest2.input("Motor1", sql.Int, Motor1);
    sqlRequest2.input("Motor2", sql.Int, Motor2);
    sqlRequest2.input("DIP", sql.Int, Dip);
    sqlRequest2.input("Andar", sql.Int, Andar);
    sqlRequest2.input("Posicao", sql.Int, Posicao);
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

    // Executa a query de atualização
    const updateResult = await sqlRequest2.query(updateQuery);

    // Verifica se a atualização foi bem-sucedida
    if (updateResult.rowsAffected[0] > 0) {
      response.status(200).send("Item DM atualizado com sucesso!");
    } else {
      response.status(404).send("Item DM não encontrado ou não atualizado.");
    }
  } catch (error) {
    // Trata erros durante a execução
    console.error("Erro ao executar a atualização:", error);
    response.status(500).send("Erro ao atualizar o item DM.");
  }
}

/**
 * Função para deletar um item DM (Dispositivo de Monitoramento) no banco de dados.
 *
 * @param {Object} request Objeto contendo os dados da requisição, como o ID do item e usuário.
 * @param {Object} response Objeto usado para enviar a resposta ao cliente, incluindo status e mensagens de erro.
 *
 * @returns {Promise} Retorna uma Promise que resolve quando o item for deletado ou em caso de erro.
 */
async function deletarItensDM(request, response) {
  const id_item = request.body.id_item;
  const id_usuario = request.body.id_usuario;
  const id_cliente = request.body.id_cliente;

  // Define a query pra "excluir" o item DM
  const query = "UPDATE DM_Itens SET deleted = 1 WHERE id_item = @id_item";
  const params = {
    id_item: id_item,
  };

  try {
    // Verifica se os parâmetros essenciais estão presentes
    if (!id_item) {
      response.status(401).json("ID do item não enviado");
      return;
    }

    const sqlRequest = new sql.Request();
    sqlRequest.input("id_item", sql.Int, id_item);
    const result = await sqlRequest.query(query);

    // Verifica se a atualização foi bem-sucedida
    if (result.rowsAffected[0] > 0) {
      response.status(200).json({ message: "Item excluído com sucesso" });
    } else {
      response.status(404).json({ error: "Item não encontrado" });
    }
  } catch (error) {
    // Trata erros durante a execução

    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para deletar um DM (Dispositivo de Monitoramento) específico no banco de dados.
 *
 * @param {Object} request Objeto contendo os dados da requisição, como o ID da DM e usuário.
 * @param {Object} response Objeto usado para enviar a resposta ao cliente, incluindo status e mensagens de erro.
 *
 * @returns {Promise} Retorna uma Promise que resolve quando a DM for deletada ou em caso de erro.
 */
async function deletarDM(request, response) {
  const ID_DM = request.body.ID_DM;
  const id_usuario = request.body.id_usuario;
  const id_cliente = request.body.id_cliente;

  // Define a query pra "excluir" a DM

  const query = "UPDATE DMs SET deleted = 1 WHERE ID_DM = @ID_DM";
  const params = {
    ID_DM: ID_DM,
  };

  try {
    // Verifica se os parâmetros essenciais estão presentes

    if (!ID_DM) {
      response.status(401).json("ID da DM não enviado");
      return;
    }

    const sqlRequest = new sql.Request();
    sqlRequest.input("ID_DM", sql.Int, ID_DM);
    const result = await sqlRequest.query(query);

    // Verifica se a atualização foi bem-sucedida
    if (result.rowsAffected[0] > 0) {
      response.status(200).json({ message: "DM excluído com sucesso" });
    } else {
      response.status(404).json({ error: "DM não encontrado" });
    }
  } catch (error) {
    // Trata erros durante a execução

    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para recuperar informações de um cliente específico do banco de dados.
 *
 * @param {Object} request Objeto contendo os dados da requisição, como o ID do cliente.
 * @param {Object} response Objeto usado para enviar a resposta ao cliente, incluindo status e dados ou mensagens de erro.
 *
 * @returns {Promise} Retorna uma Promise que resolve com os dados do cliente ou um erro.
 */
async function recuperarClienteInfo(request, response) {
  const id_cliente = request.body.id_cliente;
  try {
    // Define a query pra recuperar as info do cliente

    const query = `SELECT ID_DM, Identificacao, ClienteID, UserID, URL, Chave, ChaveAPI FROM DMs WHERE ID_Cliente = @id_cliente AND Deleted = 0 AND Integracao = 1`;
    const transaction = new sql.Transaction();
    await transaction.begin();

    const sqlRequest = new sql.Request(transaction);
    sqlRequest.input("id_cliente", sql.Int, id_cliente);

    const result = await sqlRequest.query(query);

    await transaction.commit();
    // Verifica se a atualização foi bem-sucedida
    if (result.recordset.length > 0) {
      return response.status(200).json(result.recordset);
    } else {
      return response
        .status(401)
        .json({ message: "Nenhuma Maquina com Integração registrada." });
    }
  } catch (error) {
    // Trata erros durante a execução

    if (transaction) {
      await transaction.rollback();
    }
    console.error("Erro ao recuperar informações do cliente:", error);
    throw error;
  }
}

/**
 * Função para atualizar as informações de um cliente no banco de dados.
 *
 * @param {Object} request Objeto contendo os dados da requisição, como o ID do cliente, DM, e outros campos de dados a serem atualizados.
 * @param {Object} response Objeto usado para enviar a resposta ao cliente, incluindo status e mensagens de erro.
 *
 * @returns {Promise} Retorna uma Promise que resolve quando as informações do cliente forem atualizadas.
 */
async function updateClienteInfo(request, response) {
  const { id_cliente, ID_DM, ClienteID, UserID, URL, Chave, ChaveAPI } =
    request.body;
  try {
    // Define a query pra atualizar as info do cliente

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
    // Verifica se a atualização foi bem-sucedida
    if (result.rowsAffected > 0) {
      return response.status(200).json({ message: "Atualizado com sucesso" });
    } else {
      return response
        .status(404)
        .json({ message: "Nenhuma informação encontrada para o cliente." });
    }
  } catch (error) {
    // Trata erros durante a execução

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
  listarItensDM,
  adicionarItens,
  deletarItensDM,
  atualizar,
  atualizarItemDM,
  deletarDM,
  listarDMResumido,
  recuperarClienteInfo,
  updateClienteInfo,
};
