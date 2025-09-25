const sql = require("mssql");
const axios = require("axios");
const { DateTime } = require("luxon");
async function obterProximoIdItem() {
  // Cria uma nova requisição para o banco de dados
  const sqlRequest = new sql.Request();

  // Declara a consulta SQL que busca o próximo ID disponível.
  // A consulta pega o maior valor de 'id_item' na tabela 'DM_itens',
  // e adiciona 1 para obter o próximo ID.
  const query = `SELECT ISNULL(MAX(id_item), 0) + 1 AS NextIdItem FROM DM_itens`;

  // Executa a consulta no banco de dados e aguarda a resposta com 'await'
  const result = await sqlRequest.query(query);

  // Retorna o próximo ID. A propriedade 'NextIdItem' do primeiro item no conjunto de resultados.
  return result.recordset[0].NextIdItem;
}
// Definindo a função assíncrona listarDM que lida com a requisição e resposta
const listarDM = async (request, response) => {
  // Começa um bloco try para capturar erros que podem ocorrer durante a execução
  try {
    // Obtém o 'id_cliente' da requisição que foi enviada ao servidor
    const id_cliente = request.body.id_cliente;

    // Inicializa a variável 'query' sem um valor, será definida mais adiante
    let query;

    // Cria um novo objeto 'Request' que será usado para enviar a consulta SQL ao banco de dados
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
          DMS.Deleted = 0
          ORDER BY DMS.Identificacao`;
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
          AND DMS.Deleted = 0
          ORDER BY DMS.Identificacao`;

      // Define o parâmetro 'id_cliente' como um valor de tipo inteiro na consulta SQL
      sqlRequest.input("id_cliente", sql.Int, id_cliente);
    }

    // Executa a consulta SQL
    const result = await sqlRequest.query(query);

    // Agrupa as DMs com suas respectivas controladoras
    const dmsMap = new Map();
    // Itera sobre cada linha do resultado da consulta (registro retornado do banco de dados)
    result.recordset.forEach((row) => {
      // Extrai o ID da DM da linha atual
      const dmId = row.ID_DM;

      // Verifica se a DM já foi adicionada ao mapa
      if (!dmsMap.has(dmId)) {
        // Se não, cria uma nova entrada para essa DM no mapa com suas propriedades
        dmsMap.set(dmId, {
          ...row, // Adiciona todos os dados da linha à nova entrada
          Controladoras: [], // Inicializa um array vazio para armazenar as controladoras relacionadas a essa DM
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
// Declaração da função assíncrona para listar DMs de forma resumida
const listarDMResumido = async (request, response) => {
  try {
    // Desestruturação de 'id_cliente' do corpo da requisição (request.body)
    const { id_cliente } = request.body;

    // Criação de uma nova instância de 'sql.Request' para enviar a consulta ao banco de dados
    let sqlRequest = new sql.Request();

    // Definição da consulta SQL inicial para selecionar os campos 'id_dm' e 'Identificacao' da tabela 'DMS'
    let query = `
      SELECT 
        id_dm, Identificacao
      FROM 
        DMS
      WHERE 
        Deleted = 0
    `;

    // Verifica se 'id_cliente' foi passado na requisição
    if (id_cliente) {
      // Se 'id_cliente' estiver presente, adiciona a condição para filtrar pelo 'id_cliente'
      query += ` AND id_cliente = @id_cliente`;

      // Adiciona o parâmetro 'id_cliente' à consulta
      sqlRequest.input("id_cliente", sql.Int, id_cliente);
    }

    // Adiciona a cláusula ORDER BY para ordenar os resultados por 'Identificacao'
    query += ` ORDER BY Identificacao`;

    // Executa a consulta no banco de dados
    const result = await sqlRequest.query(query);

    // Envia os resultados da consulta de volta para o cliente com status 200 (OK)
    response.status(200).json(result.recordset);
  } catch (error) {
    // Caso ocorra um erro na execução da consulta, ele será capturado e um erro é retornado
    console.error("Erro ao executar consulta:", error.message);

    // Envia o erro de execução de consulta para o cliente com status 500 (erro interno)
    response.status(500).send("Erro ao executar consulta no banco de dados.");
  }
};

// Declaração da função assíncrona para listar DMs de forma resumida, com id_cliente incluído
const listarDMResumido2 = async (request, response) => {
  try {
    // Criação de uma nova instância de 'sql.Request' para enviar a consulta ao banco de dados
    let sqlRequest = new sql.Request();

    // Definição da consulta SQL inicial para selecionar os campos 'id_dm', 'Identificacao', e 'id_cliente' da tabela 'DMS'
    let query = `
      SELECT 
        id_dm, Identificacao, id_cliente
      FROM 
        DMS
      WHERE 
        Deleted = 0
        ORDER BY Identificacao
    `;

    // Executa a consulta no banco de dados
    const result = await sqlRequest.query(query);
    // Envia os resultados da consulta de volta para o cliente com status 200 (OK)
    response.status(200).json(result.recordset);
  } catch (error) {
    // Caso ocorra um erro na execução da consulta, ele será capturado e um erro é retornado
    console.error("Erro ao executar consulta:", error.message);

    // Envia o erro de execução de consulta para o cliente com status 500 (erro interno)
    response.status(500).send("Erro ao executar consulta no banco de dados.");
  }
};

// Função assíncrona para listar DMs de forma paginada, com suporte a filtros e ordenação
const listarDMPaginado = async (request, response) => {
  try {
    // Desestruturação dos parâmetros recebidos na requisição, com valores padrão para first, rows, e sortField
    const {
      id_cliente, // ID do cliente para filtrar os resultados
      first = 0, // Posição inicial da página, padrão 0
      rows = 10, // Número de registros por página, padrão 10
      sortField = "Identificacao", // Campo para ordenação, padrão "Identificacao"
      filters = {}, // Filtros adicionais, padrão um objeto vazio
    } = request.body;

    // Definindo a direção de ordenação: ASC para crescente, DESC para decrescente
    const sortOrder = request.body.sortOrder === "DESC" ? "DESC" : "ASC";

    // Criação de uma nova instância de sql.Request para enviar a consulta ao banco de dados
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

      // Adicionando um parâmetro de entrada chamado "globalValue" à consulta SQL, com tipo NVarChar (string).
      // O valor de "globalValue" é passado de algum lugar fora deste trecho de código.
      sqlRequest.input("globalValue", sql.NVarChar, globalValue);
    }
    // Definindo os parâmetros de paginação: "first" (página inicial) e "rows" (número de registros por página).
    sqlRequest.input("first", sql.Int, first);
    sqlRequest.input("rows", sql.Int, rows);

    // Executando a consulta SQL usando os parâmetros definidos acima. O resultado é armazenado em "dmsResult".
    const dmsResult = await sqlRequest.query(queryDMs);
    // Verificando se a consulta retornou algum resultado e pegando o número total de registros. Caso contrário, definindo como 0.
    const totalRecords =
      dmsResult.recordset.length > 0 ? dmsResult.recordset[0].TotalRecords : 0;
    // A variável "dms" contém todos os registros retornados pela consulta anterior.
    // Agora, o código cria um novo array "dmIds", contendo apenas os IDs de cada DM.
    const dms = dmsResult.recordset;
    const dmIds = dms.map((dm) => dm.ID_DM);
    // A variável "queryControladoras" contém a consulta SQL para buscar controladoras relacionadas aos DMs.
    // Ela inclui um filtro "IN" que irá usar os IDs das DMs retornadas anteriormente (dmIds).
    const queryControladoras = `
SELECT *
FROM Controladoras
WHERE Controladoras.ID_DM IN (${
      dmIds.length ? dmIds.map((_, index) => `@dmId${index}`).join(",") : "-1"
    })
AND Controladoras.Deleted = 0;
`;

    // O código agora começa a adicionar os parâmetros para cada ID de DM ao objeto "sqlRequest".
    // A cada iteração, ele adiciona um parâmetro de entrada para a consulta, como @dmId0, @dmId1, etc.
    dmIds.forEach((id, index) => {
      sqlRequest.input(`dmId${index}`, sql.Int, id);
    });

    // Executa a consulta para buscar as controladoras que correspondem aos IDs das DMs previamente definidos em "queryControladoras".
    const controladorasResult = await sqlRequest.query(queryControladoras);
    // Armazena as controladoras obtidas na consulta anterior na variável "controladoras".
    const controladoras = controladorasResult.recordset;
    // Cria um novo mapa (Map) chamado "dmsMap".
    const dmsMap = new Map();
    // Itera sobre o array "dms" e, para cada DM, adiciona um item ao mapa "dmsMap" usando o ID_DM como chave.
    dms.forEach((dm) => {
      dmsMap.set(dm.ID_DM, { ...dm, Controladoras: [] });
    });

    controladoras.forEach((controladora) => {
      // Itera sobre o array `controladoras`, chamando a função de callback para cada item (cada "controladora").
      if (dmsMap.has(controladora.ID_DM)) {
        // Verifica se o objeto `dmsMap` contém uma chave igual ao valor `controladora.ID_DM`.
        const dm = dmsMap.get(controladora.ID_DM); // Se a chave existir, obtém o valor associado a `ID_DM` no `dmsMap`, que é armazenado na variável `dm`.
        let controladoraExistente; // Declara uma variável chamada `controladoraExistente` que será utilizada para armazenar o resultado da busca.
        if (
          // Inicia uma verificação condicional. A seguir, verifica-se se o `Tipo_Controladora` é um dos valores especificados.
          controladora.Tipo_Controladora === "2023" || // Se o tipo da controladora for igual a "2023",
          controladora.Tipo_Controladora === "Locker-Padrao" || // ou igual a "Locker-Padrao",
          controladora.Tipo_Controladora === "Locker-Ker" // ou igual a "Locker-Ker"
        ) {
          // Se o tipo da controladora for um desses três valores, então:

          controladoraExistente = dm.Controladoras.find(
            // Busca dentro de `dm.Controladoras` (presumidamente um array) utilizando o método `find`:
            (ctrl) =>
              ctrl.DIP === controladora.DIP && // Verifica se o valor de `DIP` na controladora atual é igual ao `DIP` da controladora na iteração.
              ctrl.Tipo_Controladora === controladora.Tipo_Controladora // Verifica também se o tipo de controladora é igual ao tipo da controladora na iteração.
          ); // Se encontrar um item que satisfaça essas condições, ele será atribuído à variável `controladoraExistente`.
        } else {
          // Se o tipo da controladora não for um dos três mencionados:

          controladoraExistente = dm.Controladoras.find(
            // Busca dentro de `dm.Controladoras` um item onde a `Placa` da controladora seja igual à `Placa` da controladora na iteração.
            (ctrl) => ctrl.Placa === controladora.Placa
          ); // Se encontrar um item com a mesma `Placa`, ele será atribuído à variável `controladoraExistente`.
        }

        if (controladoraExistente) {
          // Verifica se a variável `controladoraExistente` contém um valor (ou seja, se uma controladora correspondente foi encontrada).
          if (controladora.Deleted === false) {
            // Verifica se a controladora não foi marcada como deletada (`Deleted` é falso).
            if (controladora.Tipo_Controladora === "2023") {
              // Verifica se o tipo da controladora é "2023".
              controladoraExistente.Andar = [
                // Atualiza o array `Andar` da controladora existente.
                ...new Set([
                  // Cria um novo conjunto (Set) para garantir que os valores sejam únicos.
                  ...controladoraExistente.Andar, // Adiciona os valores existentes de `Andar` da controladora existente.
                  controladora.Andar, // Adiciona o valor de `Andar` da controladora atual.
                ]),
              ]; // Atribui a nova lista (com valores únicos) de volta à variável `Andar` da controladora existente.

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
          // Se `controladoraExistente` não existir (não foi encontrada uma controladora correspondente), executa o bloco de código a seguir.
          dm.Controladoras.push({
            // Adiciona um novo objeto à lista `Controladoras` do `dm`.
            ID: controladora.ID, // Define o ID da nova controladora como o valor de `controladora.ID`.
            Tipo_Controladora: controladora.Tipo_Controladora, // Define o tipo de controladora da nova controladora como o valor de `controladora.Tipo_Controladora`.
            Placa: controladora.Placa, // Define a placa da nova controladora como o valor de `controladora.Placa`.
            DIP: controladora.DIP, // Define o DIP da nova controladora como o valor de `controladora.DIP`.
            // Verifica se a controladora não foi deletada e tem o valor de `Andar`. Se sim, cria um array com `controladora.Andar`, senão, um array vazio.
            Andar:
              controladora.Deleted === false && controladora.Andar
                ? [controladora.Andar]
                : [],
            // Verifica se a controladora não foi deletada e tem o valor de `Posicao`. Se sim, cria um array com `controladora.Posicao`, senão, um array vazio.
            Posicao:
              controladora.Deleted === false && controladora.Posicao
                ? [controladora.Posicao]
                : [],
            // Verifica se a controladora não foi deletada e tem o valor de `Mola1`. Se sim, cria um array com `controladora.Mola1`, senão, um array vazio.
            Mola1:
              controladora.Deleted === false && controladora.Mola1
                ? [controladora.Mola1]
                : [],
            // Verifica se a controladora não foi deletada e tem o valor de `Mola2`. Se sim, cria um array com `controladora.Mola2`, senão, um array vazio.
            Mola2:
              controladora.Deleted === false && controladora.Mola2
                ? [controladora.Mola2]
                : [],
          }); // O objeto com todas as propriedades definidas acima é adicionado à lista `Controladoras` do `dm`.
        }
      }
    });
    const dmsArray = Array.from(dmsMap.values()); // Converte os valores do mapa `dmsMap` para um array e os armazena na variável `dmsArray`.
    response.status(200).json({ dmsArray, totalRecords }); // Envia uma resposta HTTP com o status 200 (OK), contendo o array `dmsArray` e o total de registros (`totalRecords`) no corpo da resposta.
  } catch (error) {
    // Caso ocorra um erro em algum bloco anterior (no `try`), o código entra aqui para tratar o erro.
    console.error("Erro ao executar consulta:", error.message); // Imprime no console o erro ocorrido, com a mensagem associada.
    response.status(500).send("Erro ao executar consulta"); // Envia uma resposta HTTP com o status 500 (Erro interno do servidor) e a mensagem de erro.
  }
};

async function inserirControladoraGenerica( // Define a função assíncrona `inserirControladoraGenerica`, que recebe uma transação, uma controladora, um ID de DM e um ID de cliente.
  transaction, // A transação para ser usada nas consultas SQL.
  controladora, // A controladora que contém os dados a serem inseridos.
  dmId, // O ID do DM associado.
  clienteId // O ID do cliente associado.
) {
  // Verifica o tipo da controladora e realiza a inserção adequada
  const tipoControladora = controladora.tipo; // Obtém o tipo da controladora a partir do objeto `controladora` e armazena em `tipoControladora`.
  console.log("você está inserindo pelo caminho gerérico:", tipoControladora); // Exibe no console o tipo da controladora que está sendo inserido.

  if (tipoControladora === "2018" && controladora.dados.placa > 0) {
    // Verifica se o tipo da controladora é "2018" e se a placa da controladora é maior que 0.
    for (const mola of controladora.dados.molas) {
      // Itera sobre o array de molas contido em `controladora.dados.molas`.
      const queryControladora2018 = `INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, Placa, Mola1, Sincronizado, Deleted)
        VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @Placa, @Mola1, @Sincronizado, @Deleted)`; // A consulta SQL para inserir os dados de uma controladora.

      const sqlRequest2 = new sql.Request(transaction); // Cria uma nova instância de `sql.Request` associada à transação para execução de consultas.
      sqlRequest2.input("ID_Cliente", sql.Int, clienteId); // Define o parâmetro `ID_Cliente` para a consulta SQL, com o tipo `Int` e o valor de `clienteId`.
      sqlRequest2.input("ID_DM", sql.Int, dmId); // Define o parâmetro `ID_DM` para a consulta SQL, com o tipo `Int` e o valor de `dmId`.
      sqlRequest2.input("Tipo_Controladora", sql.NVarChar, tipoControladora); // Define o parâmetro `Tipo_Controladora` para a consulta SQL, com o tipo `NVarChar` e o valor de `tipoControladora`.
      sqlRequest2.input("Sincronizado", sql.Int, 0); // Define o parâmetro `Sincronizado` como 0 (provavelmente para indicar que a controladora ainda não foi sincronizada).
      sqlRequest2.input("Deleted", sql.Bit, false); // Define o parâmetro `Deleted` como `false`, indicando que a controladora não está deletada.
      sqlRequest2.input("Placa", sql.Int, controladora.dados.placa); // Define o parâmetro `Placa` com o valor de `controladora.dados.placa`.
      sqlRequest2.input("Mola1", sql.Int, mola); // Define o parâmetro `Mola1` com o valor de `mola` (um valor do array de molas).

      await sqlRequest2.query(queryControladora2018); // Executa a consulta SQL assíncrona para inserir a controladora no banco de dados.
    }
  } else if (tipoControladora === "2023" && controladora.dados.dip > 0) {
    // Verifica se o tipo da controladora é "2023" e se o valor de `dip` é maior que 0.
    for (const andar of controladora.dados.andar) {
      // Itera sobre o array de andares dentro de `controladora.dados.andar`.
      for (const posicao of controladora.dados.posicao) {
        // Itera sobre o array de posições dentro de `controladora.dados.posicao`.
        const queryControladora2023 = `INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, DIP, Andar, Posicao, Sincronizado, Deleted)
          VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @DIP, @Andar, @Posicao, @Sincronizado, @Deleted)`; // A consulta SQL para inserir a controladora.

        const sqlRequest2 = new sql.Request(transaction); // Cria uma nova instância de `sql.Request` associada à transação para execução de consultas.
        sqlRequest2.input("ID_Cliente", sql.Int, clienteId); // Define o parâmetro `ID_Cliente` para a consulta SQL, com o tipo `Int` e o valor de `clienteId`.
        sqlRequest2.input("ID_DM", sql.Int, dmId); // Define o parâmetro `ID_DM` para a consulta SQL, com o tipo `Int` e o valor de `dmId`.
        sqlRequest2.input("Tipo_Controladora", sql.NVarChar, tipoControladora); // Define o parâmetro `Tipo_Controladora` para a consulta SQL, com o tipo `NVarChar` e o valor de `tipoControladora`.
        sqlRequest2.input("Sincronizado", sql.Int, 0); // Define o parâmetro `Sincronizado` como 0 (indicando que a controladora ainda não foi sincronizada).
        sqlRequest2.input("Deleted", sql.Bit, false); // Define o parâmetro `Deleted` como `false`, indicando que a controladora não foi deletada.
        sqlRequest2.input("DIP", sql.Int, controladora.dados.dip); // Define o parâmetro `DIP` com o valor de `controladora.dados.dip`.
        sqlRequest2.input("Andar", sql.Int, andar); // Define o parâmetro `Andar` com o valor de `andar` da iteração atual.
        sqlRequest2.input("Posicao", sql.Int, posicao); // Define o parâmetro `Posicao` com o valor de `posicao` da iteração atual.

        await sqlRequest2.query(queryControladora2023); // Executa a consulta SQL de forma assíncrona para inserir a controladora no banco de dados.
      }
    }
  } else if (
    // Verifica se o tipo da controladora é "Locker", "Locker-Padrao" ou "Locker-Ker".
    tipoControladora === "Locker" || // Se o tipo for "Locker".
    tipoControladora === "Locker-Padrao" || // Ou se o tipo for "Locker-Padrao".
    tipoControladora === "Locker-Ker" // Ou se o tipo for "Locker-Ker".
  ) {
    for (const posicao of controladora.dados.posicao) {
      // Itera sobre o array `posicao` presente em `controladora.dados`.
      const queryControladoraLocker = `INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, DIP, Posicao, Sincronizado, Deleted)
        VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @DIP, @Posicao, @Sincronizado, @Deleted)`; // A consulta SQL para inserção.

      const sqlRequest2 = new sql.Request(transaction); // Cria uma nova instância de `sql.Request`, associada à transação, para a execução da consulta.
      sqlRequest2.input("ID_Cliente", sql.Int, clienteId); // Define o parâmetro `ID_Cliente` para a consulta SQL, com o tipo `Int` e o valor de `clienteId`.
      sqlRequest2.input("ID_DM", sql.Int, dmId); // Define o parâmetro `ID_DM` para a consulta SQL, com o tipo `Int` e o valor de `dmId`.
      sqlRequest2.input("Tipo_Controladora", sql.NVarChar, tipoControladora); // Define o parâmetro `Tipo_Controladora` para a consulta SQL, com o tipo `NVarChar` e o valor de `tipoControladora`.
      sqlRequest2.input("Sincronizado", sql.Int, 0); // Define o parâmetro `Sincronizado` como 0, indicando que a controladora ainda não foi sincronizada.
      sqlRequest2.input("Deleted", sql.Bit, false); // Define o parâmetro `Deleted` como `false`, indicando que a controladora não foi deletada.
      sqlRequest2.input("DIP", sql.Int, controladora.dados.dip); // Define o parâmetro `DIP` para a consulta SQL, com o valor de `controladora.dados.dip`.
      sqlRequest2.input("Posicao", sql.Int, posicao); // Define o parâmetro `Posicao` para a consulta SQL, com o valor de `posicao` da iteração atual.

      await sqlRequest2.query(queryControladoraLocker); // Executa a consulta SQL de forma assíncrona para inserir a controladora do tipo "Locker".
    }
  } else if (tipoControladora === "2024") {
    // Verifica se o tipo da controladora é "2024".
    for (const mola1 of controladora.dados.mola1) {
      // Itera sobre o array `mola1` presente em `controladora.dados`.
      const queryControladora2024 = `INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, Placa, Mola1, Sincronizado, Deleted)
        VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @Placa, @Mola1, @Sincronizado, @Deleted)`; // A consulta SQL para inserção.

      const sqlRequest2 = new sql.Request(transaction); // Cria uma nova instância de `sql.Request`, associada à transação, para a execução da consulta.
      sqlRequest2.input("ID_Cliente", sql.Int, clienteId); // Define o parâmetro `ID_Cliente` para a consulta SQL, com o tipo `Int` e o valor de `clienteId`.
      sqlRequest2.input("ID_DM", sql.Int, dmId); // Define o parâmetro `ID_DM` para a consulta SQL, com o tipo `Int` e o valor de `dmId`.
      sqlRequest2.input("Tipo_Controladora", sql.NVarChar, tipoControladora); // Define o parâmetro `Tipo_Controladora` para a consulta SQL, com o tipo `NVarChar` e o valor de `tipoControladora`.
      sqlRequest2.input("Sincronizado", sql.Int, 0); // Define o parâmetro `Sincronizado` como 0, indicando que a controladora ainda não foi sincronizada.
      sqlRequest2.input("Deleted", sql.Bit, false); // Define o parâmetro `Deleted` como `false`, indicando que a controladora não foi deletada.
      sqlRequest2.input("Placa", sql.Int, controladora.dados.placa); // Define o parâmetro `Placa` para a consulta SQL, com o valor de `controladora.dados.placa`.
      sqlRequest2.input("Mola1", sql.Int, mola1); // Define o parâmetro `Mola1` com o valor de `mola1` da iteração atual.

      await sqlRequest2.query(queryControladora2024); // Executa a consulta SQL de forma assíncrona para inserir a controladora do tipo "2024".
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

  let transaction; // Declara a variável `transaction` que será usada para a transação no banco de dados.

  try {
    if (!IDcliente) {
      // Verifica se o `IDcliente` foi enviado. Se não, retorna um erro 401 (não autorizado).
      return response.status(401).json("ID do cliente não enviado"); // Retorna erro se o `IDcliente` não estiver presente.
    }

    transaction = new sql.Transaction();
    await transaction.begin();
    const nowInBrazil = DateTime.now().setZone("America/Sao_Paulo").toJSDate();
    const sqlRequest = new sql.Request(transaction);
    sqlRequest.input("ID_Cliente", sql.Int, IDcliente);
    sqlRequest.input("Numero", sql.VarChar, Numero);
    sqlRequest.input("Devolucao", sql.Bit, Devolucao);
    sqlRequest.input("Identificacao", sql.NVarChar, Identificacao);
    sqlRequest.input("ChaveAPI", sql.NVarChar, ChaveAPI);
    sqlRequest.input("Ativo", sql.Bit, Ativo);
    sqlRequest.input("Deleted", sql.Bit, false);
    sqlRequest.input("Created", sql.DateTime, nowInBrazil);
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
      ? "https://api.mobsolucoesdigitais.com.br" // Se `Integracao` for verdadeiro, define a URL como "https://api.mobsolucoesdigitais.com.br".
      : URL; // Caso contrário, usa o valor de `URL` como a URL a ser inserida.
    sqlRequest.input("URL", sql.NVarChar, urlToInsert); // Define o parâmetro `URL` para a consulta SQL com o tipo `NVarChar` e o valor de `urlToInsert`.

    const resultDM = await sqlRequest.query(queryDM); // Executa a consulta SQL `queryDM` para obter o resultado do DM e aguarda a execução da consulta de forma assíncrona.

    const dmId = resultDM.recordset[0].ID_DM; // Obtém o `ID_DM` do primeiro registro retornado pela consulta `resultDM`.

    if (Controladoras && Controladoras.length > 0) {
      // Verifica se existe um array `Controladoras` e se ele contém elementos.
      for (const controladora of Controladoras) {
        // Itera sobre cada `controladora` no array `Controladoras`.
        await inserirControladoraGenerica(
          // Chama a função `inserirControladoraGenerica` para inserir cada controladora, passando os parâmetros necessários.
          transaction,
          controladora,
          dmId,
          IDcliente
        );
      }
    }

    queryPermissions = ` Insert into DM_Usuario_Permissao (ID_DM,ID_Usuario_dm,Deleted,Sincronizado) values (@ID_DM,1044,0,0),(@ID_DM,1045,0,0)`; // Define a consulta SQL para inserir permissões de usuário para os usuários com IDs 1044 e 1045, associando-os ao `ID_DM` e definindo os campos `Deleted` e `Sincronizado` como 0 (não deletado e não sincronizado).
    const sqlRequest2 = new sql.Request(transaction); // Cria uma nova requisição SQL associada à transação atual.
    sqlRequest2.input("ID_DM", sql.Int, dmId); // Define o parâmetro `ID_DM` para a consulta SQL, com o tipo `Int` e o valor de `dmId`.
    await sqlRequest2.query(queryPermissions); // Executa a consulta `queryPermissions` para inserir os dados de permissão no banco de dados
    await transaction.commit(); // Confirma a transação, aplicando todas as operações executadas nela ao banco de dados.

    response.status(201).json({
      message: "DM e Controladoras criadas com sucesso!",
      ID_DM: dmId, // formato igual ao banco
      id_dm: dmId,
    });
  } catch (error) {
    // Inicia o bloco de captura de erro caso alguma exceção ocorra no bloco `try`.
    if (transaction) await transaction.rollback(); // Se a transação foi iniciada, realiza o rollback (desfazendo as operações) para garantir que não haja alterações parciais no banco de dados.
    console.error("Erro ao adicionar DM:", error); // Registra o erro no console para diagnóstico.
    response.status(500).send("Erro ao adicionar DM"); // Retorna uma resposta de erro com status 500 e uma mensagem indicando que ocorreu um erro ao adicionar o DM.
  }
}
async function atualizar(request, response) {
  const {
    id_usuario,
    ID_DM,
    ID_cliente,
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
    URL,
    UserID,
  } = request.body;
  console.log("Dados recebidos para atualização:", {
    // Exibe no console os dados recebidos para atualização.
    ID_DM, // Mostra o valor de `ID_DM`, identificador do DM (controle de máquina).
    ID_cliente, // Mostra o valor de `IDcliente`, identificador do cliente.
    ClienteNome, // Mostra o valor de `ClienteNome`, nome do cliente.
    Numero, // Mostra o valor de `Numero`, número associado ao cliente.
    Identificacao, // Mostra o valor de `Identificacao`, identificador do cliente.
    Ativo, // Mostra o valor de `Ativo`, status de ativação.
    Deleted, // Mostra o valor de `Deleted`, indica se o registro foi deletado.
    Created, // Mostra o valor de `Created`, data de criação do registro.
    Updated, // Mostra o valor de `Updated`, data da última atualização do registro.
    Versao, // Mostra o valor de `Versao`, versão do registro.
    Enviada, // Mostra o valor de `Enviada`, status indicando se a informação foi enviada.
    OP_Senha, // Mostra o valor de `OP_Senha`, se a opção de senha está ativada.
    OP_Biometria, // Mostra o valor de `OP_Biometria`, se a opção de biometria está ativada.
    OP_Facial, // Mostra o valor de `OP_Facial`, se a opção facial está ativada.
    Integracao, // Mostra o valor de `Integracao`, se a integração está ativada.
    ClienteID, // Mostra o valor de `ClienteID`, ID do cliente.
    Chave, // Mostra o valor de `Chave`, chave associada ao cliente.
    ChaveAPI, // Mostra o valor de `ChaveAPI`, chave da API utilizada.
    Devolucao, // Mostra o valor de `Devolucao`, status de devolução.
    URL, // Mostra o valor de `URL`, URL associada ao cliente.
    UserID, // Mostra o valor de `UserID`, ID do usuário que está fazendo a atualização.
  });

  let transaction; // Declara uma variável `transaction` para armazenar a transação do banco de dados.

  try {
    // Inicia o bloco `try` para capturar erros durante a execução do código.
    if (!ID_DM || !ID_cliente) {
      // Verifica se os parâmetros `ID_DM` ou `IDcliente` não foram fornecidos.
      return response // Se algum desses parâmetros estiver ausente, retorna um erro de status 400 (requisição inválida).
        .status(400)
        .json({ message: "ID_DM e IDcliente são obrigatórios." }); // Mensagem de erro indicando que ambos são obrigatórios.
    }

    transaction = new sql.Transaction(); // Cria uma nova instância de transação SQL associada à variável `transaction`, iniciando uma transação no banco de dados.
    await transaction.begin(); // Inicia a transação, o que permite que todas as operações subsequentes sejam executadas de forma atômica (ou seja, ou todas as operações são concluídas com sucesso, ou nenhuma delas é aplicada no banco de dados).

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
          URL = @URL,
          UserID = @UserID,
          Devolucao = @Devolucao,
          Sincronizado = 0
      WHERE ID_DM = @ID_DM AND ID_Cliente = @ID_Cliente`;
    const nowInBrazil = DateTime.now().setZone("America/Sao_Paulo").toJSDate();
    const requestDM = new sql.Request(transaction);
    requestDM.input("ID_DM", sql.Int, ID_DM);
    requestDM.input("ID_Cliente", sql.Int, ID_cliente);
    requestDM.input("Numero", sql.VarChar, Numero);
    requestDM.input("Identificacao", sql.NVarChar, Identificacao);
    requestDM.input("Ativo", sql.Bit, Ativo);
    requestDM.input("Deleted", sql.Bit, Deleted);
    requestDM.input("Created", sql.DateTime, Created);
    requestDM.input("Updated", sql.DateTime, nowInBrazil);
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
    requestDM.input("URL", sql.NVarChar, URL);
    requestDM.input("UserID", sql.VarChar, UserID);

    await requestDM.query(updateDMQuery); // Executa a consulta SQL definida pela variável `updateDMQuery` para atualizar os dados no banco de dados com os parâmetros fornecidos.

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
          : ctrl.Tipo_Controladora === "2023"
          ? ctrl.DIP
          : ctrl.Tipo_Controladora.includes("Locker")
          ? `${ctrl.Tipo_Controladora}_${ctrl.DIP}` // Combina o tipo "Locker" e o DIP como identificador único
          : `${ctrl.Tipo_Controladora}_${ctrl.DIP}`; // Para outros tipos, usa o tipo e o DIP

      // Inicializa o grupo se não existir
      if (!existingControladorasMap.has(identificador)) {
        // Verifica se o identificador não existe no mapa `existingControladorasMap`.
        existingControladorasMap.set(identificador, {
          // Se não existir, adiciona o identificador ao mapa com os seguintes dados.
          Tipo_Controladora: ctrl.Tipo_Controladora, // Define o tipo de controladora (ex: "2023", "Locker", etc.).
          Placa: ctrl.Placa, // Define a placa associada à controladora.
          DIP: ctrl.DIP, // Define o DIP (Digital Input/Output Pin) associado à controladora.
          Andar: [], // Inicializa o array de andares (inicialmente vazio).
          Posicao: [], // Inicializa o array de posições (inicialmente vazio).
          Mola1: [], // Inicializa o array de mola1 (inicialmente vazio).
          Mola2: [], // Inicializa o array de mola2 (inicialmente vazio).
        });
      }

      // Adiciona os valores únicos aos arrays correspondentes
      const agrupado = existingControladorasMap.get(identificador); // Recupera o objeto correspondente ao identificador no mapa `existingControladorasMap`.

      if (ctrl.Andar && !agrupado.Andar.includes(ctrl.Andar)) {
        // Verifica se existe um valor para `Andar` e se ele ainda não está no array `Andar`.
        agrupado.Andar.push(ctrl.Andar); // Se não estiver, adiciona o valor ao array `Andar`.
      }
      if (ctrl.Posicao && !agrupado.Posicao.includes(ctrl.Posicao)) {
        // Verifica se existe um valor para `Posicao` e se ele ainda não está no array `Posicao`.
        agrupado.Posicao.push(ctrl.Posicao); // Se não estiver, adiciona o valor ao array `Posicao`.
      }
      if (ctrl.Mola1 && !agrupado.Mola1.includes(ctrl.Mola1)) {
        // Verifica se existe um valor para `Mola1` e se ele ainda não está no array `Mola1`.
        agrupado.Mola1.push(ctrl.Mola1); // Se não estiver, adiciona o valor ao array `Mola1`.
      }
      if (ctrl.Mola2 && !agrupado.Mola2.includes(ctrl.Mola2)) {
        // Verifica se existe um valor para `Mola2` e se ele ainda não está no array `Mola2`.
        agrupado.Mola2.push(ctrl.Mola2); // Se não estiver, adiciona o valor ao array `Mola2`.
      }
    });

    // Atualiza ou insere controladoras com base no tipo
    for (const controladora of Controladoras) {
      // Itera sobre o array `Controladoras`, processando cada controladora.
      let existingControladora; // Variável para armazenar a controladora existente (caso encontrada no Map).

      // Busca a controladora no Map com base no tipo
      if (controladora.tipo === "2018" || controladora.tipo === "2024") {
        // Se o tipo da controladora for "2018" ou "2024",
        existingControladora = existingControladorasMap.get(
          // Busca a controladora no Map utilizando a `placa` como chave.
          controladora.dados.placa
        );
      } else if (controladora.tipo === "2023") {
        // Se o tipo da controladora for "2023", "Locker-Padrao" ou "Locker-Ker",
        existingControladora = existingControladorasMap.get(
          // Busca a controladora no Map utilizando o `dip` como chave.
          controladora.dados.dip
        );
      } else if (
        controladora.tipo === "Locker-Padrao" ||
        controladora.tipo === "Locker-Ker"
      ) {
        existingControladora = existingControladorasMap.get(
          `${controladora.tipo}_${controladora.dados.dip}`
        );
      }

      if (existingControladora) {
        // Verifica se uma controladora já existe no mapa com base na chave fornecida (placa ou dip).
        // Atualiza a controladora existente
        if (controladora.tipo === "2018" && controladora.dados.placa > 0) {
          // Se o tipo da controladora for "2018" e a placa for maior que 0,
          await atualizarControladora2018(
            // Chama a função `atualizarControladora2018` para atualizar a controladora existente.
            transaction, // Passa a transação atual para garantir que a operação seja realizada de forma atômica.
            controladora, // Passa a controladora que contém os dados a serem atualizados.
            ID_DM, // Passa o ID do DM (Dispositivo de Monitoramento).
            ID_cliente, // Passa o ID do cliente.
            existingControladora // Passa a controladora existente para ser atualizada.
          );
        } else if (controladora.tipo === "2023" && controladora.dados.dip > 0) {
          await atualizarControladora2023(
            transaction,
            controladora,
            ID_DM,
            ID_cliente,
            existingControladora
          );
        } else if (
          controladora.tipo === "Locker-Padrao" ||
          controladora.tipo === "Locker-Ker"
        ) {
          await atualizarControladoraLocker(
            transaction,
            controladora,
            ID_DM,
            ID_cliente,
            existingControladora
          );
        } else if (controladora.tipo === "2024" && controladora.dados.dip > 0) {
          await atualizarControladora2024(
            transaction,
            controladora,
            ID_DM,
            ID_cliente,
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
            ID_cliente
          );
        } else if (controladora.tipo === "2023" && controladora.dados.dip > 0) {
          await adicionarControladora2023(
            transaction,
            controladora,
            ID_DM,
            ID_cliente
          );
        } else if (
          controladora.tipo === "Locker-Padrao" ||
          controladora.tipo === "Locker-Ker"
        ) {
          await adicionarControladoraLocker(
            transaction,
            controladora,
            ID_DM,
            ID_cliente
          );
        } else if (controladora.tipo === "2024" && controladora.dados.dip > 0) {
          await adicionarControladora2024(
            transaction,
            controladora,
            ID_DM,
            ID_cliente
          );
        }
      }
    }
    await transaction.commit(); // Comita (confirma) a transação, aplicando todas as alterações feitas no banco de dados até o momento.

    response // Envia a resposta de sucesso para o cliente.
      .status(200) // Define o código de status HTTP como 200 (OK), indicando que a operação foi bem-sucedida.
      .json({ message: "DM e controladoras atualizadas com sucesso." }); // Envia um JSON contendo uma mensagem de sucesso para o cliente.
  } catch (error) {
    // Caso ocorra um erro durante a execução do código acima, o bloco 'catch' será executado.
    if (transaction) await transaction.rollback(); // Se a transação existir, realiza o rollback para reverter todas as alterações feitas até o momento.
    console.error("Erro ao atualizar DM:", error); // Exibe o erro no console para auxiliar na depuração.

    response.status(500).json({ message: "Erro ao atualizar DM." }); // Envia uma resposta de erro para o cliente com o código 500 (Erro Interno do Servidor) e uma mensagem explicando o problema.
  }
}
async function atualizarControladora2024( // Função assíncrona que atualiza uma controladora do tipo "2024".
  transaction, // A transação que garante a consistência das operações no banco de dados.
  controladora, // A controladora com os novos dados a serem atualizados.
  dmId, // O ID do dispositivo de monitoramento (DM) associado à controladora.
  clienteId, // O ID do cliente que está realizando a atualização.
  existingControladora // A controladora existente no banco de dados que precisa ser atualizada.
) {
  const novasMolas1 = new Set(controladora.dados.mola1); // Cria um Set com as novas molas1 da controladora, removendo duplicatas.
  const molasExistentes1 = new Set(existingControladora.Mola1); // Cria um Set com as molas1 existentes na controladora já registrada no banco de dados.
  const novasMolas2 = new Set(controladora.dados.mola2); // Cria um Set com as novas molas2 da controladora, removendo duplicatas.
  const molasExistentes2 = new Set(existingControladora.Mola2); // Cria um Set com as molas2 existentes na controladora já registrada no banco de dados.

  // Remove molas 1 antigas
  // O comentário indica que o objetivo do código é remover molas 1 antigas, ou seja, molas que não estão mais na lista de novas molas.

  // Inicia um loop para iterar sobre cada "mola1" da lista "molasExistentes1"
  for (const mola1 of molasExistentes1) {
    // Verifica se a "mola1" não está presente no conjunto "novasMolas1"
    if (!novasMolas1.has(mola1)) {
      // Cria uma nova requisição SQL associada à transação atual
      const sqlRequest = new sql.Request(transaction);

      // Define a consulta SQL que será executada, para marcar a mola como deletada
      const query = `
      UPDATE Controladoras SET Deleted = 1 WHERE ID_DM = @ID_DM AND Mola1 = @Mola1`;

      // Define o valor de entrada "ID_DM" como um inteiro e o associa ao valor de "dmId"
      sqlRequest.input("ID_DM", sql.Int, dmId);

      // Define o valor de entrada "Mola1" como um inteiro e o associa ao valor de "mola1"
      sqlRequest.input("Mola1", sql.Int, mola1);

      // Executa a consulta SQL, que irá atualizar a tabela "Controladoras", marcando a mola como deletada
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
  transaction, // Parâmetro que representa a transação SQL para garantir que as operações sejam atômicas.
  controladora, // Parâmetro que contém os dados da nova controladora a ser atualizada.
  dmId, // ID do dispositivo de medição (DM).
  clienteId, // ID do cliente que está realizando a operação.
  existingControladora // Parâmetro que contém os dados da controladora existente no banco de dados.
) {
  // Exibe no console os dados da controladora existente.
  console.log(existingControladora);

  // Cria um conjunto (Set) com as novas posições fornecidas pela nova controladora. Isso elimina duplicatas.
  const novasPosicoes = new Set(controladora.dados.posicao);

  // Cria um conjunto (Set) com as posições existentes da controladora armazenada no banco de dados.
  const posicoesExistentes = new Set(existingControladora.Posicao);

  // Converte o conjunto de posições existentes para um array e mapeia os valores para números.
  const posicoesExistentesArr = Array.from(posicoesExistentes).map(Number);

  // Converte o conjunto de novas posições para um array e mapeia os valores para números.
  const novasPosicoesArr = Array.from(novasPosicoes).map(Number);

  // Cria um array com as posições que existem na controladora existente, mas não estão na nova controladora (ou seja, as posições a serem excluídas).
  const posicoesParaExcluir = posicoesExistentesArr.filter(
    (posicao) => !novasPosicoesArr.includes(posicao) // Filtra as posições da controladora existente que não estão nas novas posições.
  );
  // Remove posições antigas
  // Inicia um loop para iterar sobre cada posição na lista "posicoesParaExcluir", que contém as posições a serem excluídas.
  for (const posicao of posicoesParaExcluir) {
    // Cria uma nova requisição SQL associada à transação atual. A transação garante que todas as operações sejam executadas como uma unidade.
    const sqlRequestDelete = new sql.Request(transaction);

    // Define a consulta SQL que será executada, para marcar a posição como deletada (Deleted = 1).
    const query1 = `
    UPDATE Controladoras SET Deleted = 1 WHERE Tipo_Controladora = @Tipo_Controladora AND ID_DM = @ID_DM AND Posicao = @Posicao AND DIP = @DIP`;

    const query2 = ` 
    UPDATE DM_Itens SET deleted = 1 WHERE Controladora = @Tipo_Controladora AND ID_DM = @ID_DM AND Posicao = @Posicao AND DIP = @DIP`;

    // Define o valor de entrada "Tipo_Controladora" como uma string (NVarChar) e o associa ao tipo da controladora.
    sqlRequestDelete.input(
      "Tipo_Controladora",
      sql.NVarChar,
      controladora.tipo
    );

    // Define o valor de entrada "ID_DM" como um inteiro e o associa ao valor de "dmId", representando o dispositivo de medição.
    sqlRequestDelete.input("ID_DM", sql.Int, dmId);

    // Define o valor de entrada "Posicao" como um inteiro e o associa ao valor da posição que será excluída.
    sqlRequestDelete.input("Posicao", sql.Int, posicao);

    // Define o valor de entrada "DIP" como um inteiro e o associa ao valor do "dip" da controladora.
    sqlRequestDelete.input("DIP", sql.Int, controladora.dados.dip);

    // Executa a consulta SQL, que irá atualizar a tabela "Controladoras", marcando a posição como deletada (Deleted = 1).
    await sqlRequestDelete.query(query1);

    await sqlRequestDelete.query(query2);

    // Exibe no console uma mensagem informando que a posição foi excluída, incluindo a posição e o DIP.
    console.log(
      "Posição",
      posicao,
      " do dip",
      controladora.dados.dip,
      " excluída para a controladora ",
      controladora.tipo
    );
  }

  // Para atualizar ou inserir as combinações de posições
  // Inicia um loop para iterar sobre cada posição na lista "novasPosicoesArr", que contém as novas posições a serem atualizadas.
  for (const posicao of novasPosicoesArr) {
    // Verifica se a posição atual ("posicao") já existe na lista de posições existentes ("posicoesExistentesArr").
    if (posicoesExistentesArr.includes(posicao)) {
      // Cria uma nova requisição SQL associada à transação atual.
      const sqlRequestUpdate = new sql.Request(transaction);

      // Define a consulta SQL que será executada, para atualizar o campo "Deleted" para 0 (marcando a posição como não deletada).
      const query = `
      UPDATE Controladoras SET Deleted = 0 WHERE Tipo_Controladora = @Tipo_Controladora AND ID_DM = @ID_DM AND Posicao = @Posicao AND DIP = @DIP`;
      // Define o valor de entrada "ID_Cliente" como um inteiro e o associa ao valor de "clienteId".
      sqlRequestUpdate.input("ID_Cliente", sql.Int, clienteId);

      // Define o valor de entrada "ID_DM" como um inteiro e o associa ao valor de "dmId", representando o dispositivo de medição.
      sqlRequestUpdate.input("ID_DM", sql.Int, dmId);

      // Define o valor de entrada "Tipo_Controladora" como uma string (NVarChar) e o associa ao tipo da controladora.
      sqlRequestUpdate.input(
        "Tipo_Controladora",
        sql.NVarChar,
        controladora.tipo
      );

      // Define o valor de entrada "DIP" como um inteiro e o associa ao valor de "dip" da controladora.
      sqlRequestUpdate.input("DIP", sql.Int, controladora.dados.dip);

      // Define o valor de entrada "Posicao" como um inteiro e o associa à posição atual que está sendo processada no loop.
      sqlRequestUpdate.input("Posicao", sql.Int, posicao);

      // Executa a consulta SQL para atualizar a tabela "Controladoras", marcando a posição como não deletada (Deleted = 0).
      await sqlRequestUpdate.query(query);

      // Exibe no console uma mensagem informando que a posição foi atualizada com sucesso, incluindo a posição e o DIP.
      console.log(
        "Posição",
        posicao,
        " do dip",
        controladora.dados.dip,
        " atualizada para a controladora ",
        controladora.tipo
      );

      // Caso a posição não exista na lista de posições antigas, entra no bloco "else" para inserção de uma nova posição.
    } else {
      // Cria uma nova requisição SQL associada à transação atual, para realizar a inserção de uma nova posição na tabela.
      const sqlRequestInsert = new sql.Request(transaction);

      // Define a consulta SQL para inserir uma nova posição na tabela "Controladoras".
      const query = `
    INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, DIP, Posicao, Sincronizado, Deleted)
    VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @DIP, @Posicao, 0, 0)`;

      // Define o valor de entrada "ID_Cliente" como um inteiro e o associa ao valor de "clienteId".
      sqlRequestInsert.input("ID_Cliente", sql.Int, clienteId);

      // Define o valor de entrada "ID_DM" como um inteiro e o associa ao valor de "dmId".
      sqlRequestInsert.input("ID_DM", sql.Int, dmId);

      // Define o valor de entrada "Tipo_Controladora" como uma string (NVarChar) e o associa ao tipo da controladora.
      sqlRequestInsert.input(
        "Tipo_Controladora",
        sql.NVarChar,
        controladora.tipo
      );

      // Define o valor de entrada "DIP" como um inteiro e o associa ao valor do "dip" da controladora.
      sqlRequestInsert.input("DIP", sql.Int, controladora.dados.dip);

      // Define o valor de entrada "Posicao" como um inteiro e o associa à posição atual que está sendo processada no loop.
      sqlRequestInsert.input("Posicao", sql.Int, posicao);

      // Executa a consulta SQL para inserir a nova posição na tabela "Controladoras".
      await sqlRequestInsert.query(query);

      // Exibe no console uma mensagem informando que a nova posição foi inserida com sucesso, incluindo a posição e o DIP.
      console.log(
        "Posição",
        posicao,
        " do dip",
        controladora.dados.dip,
        " inserido para a controladora ",
        controladora.tipo
      );
    }
  }
}

// Função assíncrona "atualizarControladora2023" que recebe vários parâmetros, incluindo a transação, a controladora, o ID do DM,
// o ID do cliente e a controladora existente.
async function atualizarControladora2023(
  transaction, // Parâmetro que representa a transação SQL para garantir que as operações sejam atômicas.
  controladora, // Parâmetro contendo os dados da nova controladora a ser atualizada.
  dmId, // ID do dispositivo de medição (DM).
  clienteId, // ID do cliente que está realizando a operação.
  existingControladora // Parâmetro contendo os dados da controladora existente no banco de dados.
) {
  // Exibe no console os dados da controladora existente.
  console.log(existingControladora);

  // Cria um conjunto (Set) com as novas posições e andares fornecidos pela nova controladora.
  // O Set elimina duplicatas automaticamente.
  const novasPosicoes = new Set(controladora.dados.posicao);
  const novasAndares = new Set(controladora.dados.andar);

  // Cria um conjunto (Set) com as posições e andares existentes na controladora do banco de dados.
  const posicoesExistentes = new Set(
    existingControladora.Tipo_Controladora === controladora.tipo
      ? existingControladora.Posicao || []
      : []
  );

  const andaresExistentes = new Set(existingControladora.Andar);

  // Converte os conjuntos de posições e andares existentes para arrays e mapeia os valores para números, isso é feito para garantir que as posições e andares sejam manipulados como números ao realizar comparações e filtragens.
  const posicoesExistentesArr = Array.from(posicoesExistentes).map(Number);
  const novasPosicoesArr = Array.from(novasPosicoes).map(Number);

  const andaresExistentesArr = Array.from(andaresExistentes).map(Number);
  const novasAndaresArr = Array.from(novasAndares).map(Number);

  // Filtra os andares existentes, gerando uma lista de andares a serem excluídos.
  // A lógica filtra os andares existentes que não estão presentes nas novas andares.
  const andaresParaExcluir = andaresExistentesArr.filter(
    (andar) => !novasAndaresArr.includes(andar) // Exclui andares que não estão nas novas andares.
  );

  // Inicia um loop para iterar sobre cada andar que deve ser excluído, ou seja, andares que estão na controladora existente
  // mas não estão presentes nas novas andares fornecidas.
  for (const andar of andaresParaExcluir) {
    // Cria uma nova requisição SQL associada à transação atual.
    const sqlRequestUpdate = new sql.Request(transaction);

    // Define a consulta SQL que será executada, para marcar o andar como excluído, ou seja, definir o campo "Deleted" como 1.
    const query1 = `
  UPDATE Controladoras SET Deleted = 1 WHERE Tipo_Controladora = @Tipo_Controladora AND ID_DM = @ID_DM AND Andar = @Andar AND DIP = @DIP`;
    const query2 = `
    UPDATE DM_Itens SET deleted = 1 WHERE Controladora = @Tipo_Controladora AND ID_DM = @ID_DM AND Andar = @Andar AND DIP = @DIP`;

    // Define o valor de entrada "Tipo_Controladora" como uma string (NVarChar) e o associa ao tipo da controladora.
    sqlRequestUpdate.input(
      "Tipo_Controladora",
      sql.NVarChar,
      controladora.tipo
    );
    // Define o valor de entrada "ID_DM" como um inteiro e o associa ao valor de "dmId".
    sqlRequestUpdate.input("ID_DM", sql.Int, dmId);

    // Define o valor de entrada "Andar" como um inteiro e o associa ao andar atual do loop.
    sqlRequestUpdate.input("Andar", sql.Int, andar);

    // Define o valor de entrada "DIP" como um inteiro e o associa ao valor do "DIP" da controladora.
    sqlRequestUpdate.input("DIP", sql.Int, controladora.dados.dip);

    // Executa a consulta SQL para atualizar a tabela "Controladoras", marcando o andar como deletado.
    await sqlRequestUpdate.query(query1);
    await sqlRequestUpdate.query(query2);

    // Exibe no console uma mensagem informando que o andar foi excluído com sucesso, incluindo o número do andar e o DIP.
    console.log(
      "Andar",
      andar,
      " do dip",
      controladora.dados.dip,
      " excluído para a controladora ",
      controladora.tipo
    );
  }

  // Filtra as novas posições para que não incluam as posições existentes
  // O código cria uma lista de posições a serem excluídas, ou seja, as posições que estão na controladora existente,
  // mas não estão nas novas posições fornecidas.
  const posicoesParaExcluir = posicoesExistentesArr.filter(
    (posicao) => !novasPosicoesArr.includes(posicao) // Se a posição não estiver nas novas posições, ela será incluída para exclusão.
  );

  // Inicia um loop para iterar sobre cada posição que precisa ser excluída.
  for (const posicao of posicoesParaExcluir) {
    // Cria uma nova requisição SQL associada à transação, para garantir que a operação seja atômica.
    const sqlRequestUpdate = new sql.Request(transaction);

    // Define a consulta SQL para atualizar a tabela "Controladoras" e marcar a posição como excluída (Deleted = 1).
    const query1 = `
    UPDATE Controladoras SET Deleted = 1 WHERE Tipo_Controladora = @Tipo_Controladora AND ID_DM = @ID_DM AND Posicao = @Posicao AND DIP = @DIP`;

    const query2 = `
    UPDATE DM_Itens SET deleted = 1 WHERE Controladora = @Tipo_Controladora AND ID_DM = @ID_DM AND Posicao = @Posicao AND DIP = @DIP`;

    // Define o valor de entrada "Tipo_Controladora" como uma string (NVarChar) e o associa ao tipo da controladora.
    sqlRequestUpdate.input(
      "Tipo_Controladora",
      sql.NVarChar,
      controladora.tipo
    );

    // Define o valor de entrada "ID_DM" como um inteiro e o associa ao valor de "dmId" fornecido na função.
    sqlRequestUpdate.input("ID_DM", sql.Int, dmId);

    // Define o valor de entrada "Posicao" como um inteiro e o associa à posição que está sendo processada no loop.
    sqlRequestUpdate.input("Posicao", sql.Int, posicao);

    // Define o valor de entrada "DIP" como um inteiro e o associa ao valor de "DIP" da controladora.
    sqlRequestUpdate.input("DIP", sql.Int, controladora.dados.dip);

    // Executa a consulta SQL para atualizar a tabela, marcando a posição como deletada.
    await sqlRequestUpdate.query(query1);
    await sqlRequestUpdate.query(query2);

    // Exibe no console uma mensagem informando que a posição foi excluída com sucesso, incluindo o número da posição e o DIP.
    console.log(
      "Posição",
      posicao,
      " do dip",
      controladora.dados.dip,
      " excluída para a controladora ",
      controladora.tipo
    );
  }

  // Inicia um loop para iterar sobre cada andar da nova lista de andares.
  for (const andar of novasAndaresArr) {
    // Inicia um loop dentro do loop anterior para iterar sobre cada posição da nova lista de posições.
    for (const posicao of novasPosicoesArr) {
      // Verifica se a combinação de posição e andar já existe nas controladoras existentes no banco de dados.
      // A combinação é considerada existente se a posição está na lista de posições existentes e o andar está na lista de andares existentes.

      const combinacaoExistente = novasAndaresArr.some(
        (andar) =>
          andaresExistentesArr.includes(andar) &&
          novasPosicoesArr.some((posicao) =>
            posicoesExistentesArr.includes(posicao)
          )
      );

      if (combinacaoExistente) {
        console.log(
          "A combinação de andar",
          andar,
          "e posição ",
          posicao,
          "já existe na controladora",
          controladora.tipo
        );
        // Se a combinação de andar e posição já existe, o código cria uma nova requisição SQL associada à transação.
        const sqlRequestUpdate = new sql.Request(transaction);

        // Define a consulta SQL para atualizar a tabela Controladoras, marcando a combinação de andar e posição como não excluída (Deleted = 0).
        const updateQuery = `
        UPDATE Controladoras SET Deleted = 0 WHERE ID_DM = @ID_DM AND Andar = @Andar AND Posicao = @Posicao AND DIP = @DIP`;

        // Define o valor de entrada "ID_DM" como um inteiro e o associa ao valor de "dmId" (ID do dispositivo de medição).
        sqlRequestUpdate.input("ID_DM", sql.Int, dmId);

        // Define o valor de entrada "Andar" como um inteiro e o associa ao andar atual sendo processado.
        sqlRequestUpdate.input("Andar", sql.Int, andar);

        // Define o valor de entrada "Posicao" como um inteiro e o associa à posição atual sendo processada.
        sqlRequestUpdate.input("Posicao", sql.Int, posicao);

        // Define o valor de entrada "DIP" como um inteiro e o associa ao valor do "DIP" da controladora.
        sqlRequestUpdate.input("DIP", sql.Int, controladora.dados.dip);

        // Executa a consulta SQL para atualizar a tabela, definindo o campo "Deleted" como 0 (não deletado) para a combinação de posição e andar.
        await sqlRequestUpdate.query(updateQuery);
      } else {
        // Se não existir, insere
        // Se a combinação de andar e posição não existir na tabela, o código entra no bloco "else" e insere a combinação no banco de dados.

        // Cria uma nova requisição SQL associada à transação para garantir que a operação de inserção seja atômica.
        const sqlRequestInsert = new sql.Request(transaction);

        // Define a consulta SQL para inserir uma nova linha na tabela "Controladoras" com os dados fornecidos.
        const insertQuery = `
          INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, DIP, Andar, Posicao, Sincronizado, Deleted)
          VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @DIP, @Andar, @Posicao, 0, 0)`;

        // Define o valor de entrada "ID_Cliente" como um inteiro e o associa ao valor de "clienteId".
        sqlRequestInsert.input("ID_Cliente", sql.Int, clienteId);

        // Define o valor de entrada "ID_DM" como um inteiro e o associa ao valor de "dmId".
        sqlRequestInsert.input("ID_DM", sql.Int, dmId);

        // Define o valor de entrada "Tipo_Controladora" como uma string e o associa ao tipo da controladora.
        sqlRequestInsert.input(
          "Tipo_Controladora",
          sql.NVarChar,
          controladora.tipo
        );

        // Define o valor de entrada "DIP" como um inteiro e o associa ao valor de "DIP" da controladora.
        sqlRequestInsert.input("DIP", sql.Int, controladora.dados.dip);

        // Define o valor de entrada "Andar" como um inteiro e o associa ao andar atual que está sendo processado no loop.
        sqlRequestInsert.input("Andar", sql.Int, andar);

        // Define o valor de entrada "Posicao" como um inteiro e o associa à posição atual que está sendo processada no loop.
        sqlRequestInsert.input("Posicao", sql.Int, posicao);

        // Executa a consulta SQL de inserção para adicionar uma nova linha na tabela "Controladoras" com os dados fornecidos.
        await sqlRequestInsert.query(insertQuery);

        // Exibe uma mensagem no console informando que a combinação de andar e posição foi inserida com sucesso.
        console.log(
          "Andar",
          andar,
          " e posição",
          posicao,
          " do dip",
          controladora.dados.dip,
          " inserido para a controladora ",
          controladora.tipo
        );
      }
    }
  }
}
// Função assíncrona que atualiza a controladora de 2018 com base em dados fornecidos.
async function atualizarControladora2018(
  transaction, // Transação do banco de dados.
  controladora, // Objeto com dados da controladora a ser atualizada.
  dmId, // ID do dispositivo de medição (DM).
  clienteId, // ID do cliente associado à controladora.
  existingControladora // Dados da controladora existente no banco de dados.
) {
  console.log(existingControladora); // Imprime no console os dados da controladora existente.

  // Cria um conjunto (Set) de novas molas a partir dos dados fornecidos na controladora.
  const novasMolas = new Set(controladora.dados.molas);

  // Cria um conjunto (Set) das molas existentes na controladora já cadastrada.
  const molasExistentes = new Set(existingControladora.Mola1);

  // Converte os conjuntos de molas em arrays e garante que os valores sejam números.
  const molasNovasArray = Array.from(novasMolas).map(Number);
  const molasExistentesArray = Array.from(molasExistentes).map(Number);

  // Filtra as molas existentes para excluir aquelas que não estão mais nas novas molas.
  const molasParaExcluir = molasExistentesArray.filter(
    (mola) => !molasNovasArray.includes(mola)
  );

  // Inicia o loop para remover as molas antigas.
  for (const mola of molasParaExcluir) {
    // Verifica se a mola não existe mais no conjunto de novas molas.
    if (!novasMolas.has(mola)) {
      // Cria uma requisição SQL associada à transação para excluir a mola.
      const sqlRequest = new sql.Request(transaction);

      // Define a consulta SQL para marcar a mola como excluída (Deleted = 1) na tabela Controladoras.
      const query1 = `
        UPDATE Controladoras SET Deleted = 1 WHERE ID_DM = @ID_DM AND Mola1 = @Mola1 AND Placa = @Placa`;
      const query2 = `
        UPDATE DM_Itens SET deleted = 1 where ID_DM = @ID_DM and Placa = @Placa and Controladora = @Controladora and Motor1 = @Mola1`;

      // Define o valor de entrada para o ID do dispositivo de medição (DM).
      sqlRequest.input("ID_DM", sql.Int, dmId);

      // Define o valor de entrada para a mola que será excluída.
      sqlRequest.input("Mola1", sql.Int, mola);

      // Define o valor de entrada para a placa da controladora.
      sqlRequest.input("Placa", sql.Int, controladora.dados.placa);

      sqlRequest.input("Controladora", sql.NVarChar, controladora.tipo);

      // Executa a consulta SQL para marcar a mola como excluída no banco de dados.
      await sqlRequest.query(query1);
      await sqlRequest.query(query2);

      // Exibe uma mensagem no console informando que a mola foi excluída.
      console.log(
        "Mola ",
        mola,
        " da placa ",
        controladora.dados.placa,
        " excluída para a controladora ",
        controladora.tipo
      );
    }
  }

  // Insere novas molas ou atualiza as já existentes mas deletadas
  // Inicia o loop para verificar e atualizar as molas novas
  for (const mola of molasNovasArray) {
    // Verifica se a mola da nova lista existe na lista de molas existentes
    if (molasExistentesArray.includes(mola)) {
      // Cria uma requisição SQL associada à transação para atualizar a mola
      const sqlRequest = new sql.Request(transaction);

      // Define a consulta SQL para atualizar o valor de 'Deleted' para 0, indicando que a mola não está mais excluída
      const query = `
      UPDATE Controladoras SET Deleted = 0 WHERE ID_DM = @ID_DM AND Mola1 = @Mola1 AND Placa = @Placa`;

      // Define o valor de entrada para o ID do cliente
      sqlRequest.input("ID_Cliente", sql.Int, clienteId);

      // Define o valor de entrada para o ID do dispositivo de medição (DM)
      sqlRequest.input("ID_DM", sql.Int, dmId);

      // Define o valor de entrada para o tipo de controladora
      sqlRequest.input("Tipo_Controladora", sql.NVarChar, controladora.tipo);

      // Define o valor de entrada para o número da placa
      sqlRequest.input("Placa", sql.Int, controladora.dados.placa);

      // Define o valor de entrada para o número da mola
      sqlRequest.input("Mola1", sql.Int, mola);

      // Executa a consulta SQL para atualizar o campo 'Deleted' da mola no banco de dados
      await sqlRequest.query(query);

      // Exibe uma mensagem no console informando que a mola foi atualizada
      console.log(
        "Mola ",
        mola,
        " da placa ",
        controladora.dados.placa,
        " atualizada para a controladora ",
        controladora.tipo
      );
    } else {
      // Cria uma nova instância de um objeto `sql.Request` associado a uma transação (`transaction`)
      const sqlRequest = new sql.Request(transaction);

      // Define a consulta SQL que será executada, inserindo dados na tabela `Controladoras`
      const query = `
        INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, Placa, Mola1, Sincronizado, Deleted)
        VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @Placa, @Mola1, 0, 0)`;

      // Adiciona o valor de `clienteId` à consulta SQL como parâmetro de entrada
      sqlRequest.input("ID_Cliente", sql.Int, clienteId);

      // Adiciona o valor de `dmId` à consulta SQL como parâmetro de entrada
      sqlRequest.input("ID_DM", sql.Int, dmId);

      // Adiciona o valor de `controladora.tipo` à consulta SQL como parâmetro de entrada
      sqlRequest.input("Tipo_Controladora", sql.NVarChar, controladora.tipo);

      // Adiciona o valor de `controladora.dados.placa` à consulta SQL como parâmetro de entrada
      sqlRequest.input("Placa", sql.Int, controladora.dados.placa);

      // Adiciona o valor de `mola` à consulta SQL como parâmetro de entrada
      sqlRequest.input("Mola1", sql.Int, mola);

      // Executa a consulta SQL definida acima, com os parâmetros inseridos
      await sqlRequest.query(query);

      // Exibe no console uma mensagem indicando que a mola foi inserida, incluindo os valores de mola e placa
      console.log(
        "Mola ",
        mola,
        " da placa ",
        controladora.dados.placa,
        "inserida para a controladora ",
        controladora.tipo
      );
    }
  }
}

// Função assíncrona para adicionar controladoras no banco de dados, passando uma transação, um objeto de controladora, ID de DM e ID de cliente
async function adicionarControladora2024(
  transaction, // Transação associada ao processo de inserção
  controladora, // Objeto contendo as informações da controladora
  dmId, // ID da DM (Distribuição de Manutenção)
  clienteId // ID do cliente
) {
  // Cria uma nova instância de um objeto `sql.Request` associado à transação recebida
  const sqlRequest = new sql.Request(transaction);

  // Loop que percorre todas as molas1 dentro da controladora
  for (const mola1 of controladora.dados.mola1) {
    // Define a consulta SQL para inserir um registro na tabela `Controladoras` com o valor de mola1
    const query = `
      INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, Placa, Mola1, Sincronizado, Deleted)
      VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @Placa, @Mola1, 0, 0)`;

    // Adiciona os parâmetros à consulta SQL
    sqlRequest.input("ID_Cliente", sql.Int, clienteId); // Adiciona o ID do cliente
    sqlRequest.input("ID_DM", sql.Int, dmId); // Adiciona o ID da DM
    sqlRequest.input("Tipo_Controladora", sql.NVarChar, controladora.tipo); // Adiciona o tipo de controladora
    sqlRequest.input("Placa", sql.Int, controladora.dados.placa); // Adiciona a placa da controladora
    sqlRequest.input("Mola1", sql.Int, mola1); // Adiciona o valor da mola1

    // Executa a consulta SQL de inserção com os parâmetros fornecidos
    await sqlRequest.query(query);
  }

  // Loop que percorre todas as molas2 dentro da controladora
  for (const mola2 of controladora.dados.mola2) {
    // Define a consulta SQL para inserir um registro na tabela `Controladoras` com o valor de mola2
    const query = `
      INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, Placa, Mola2, Sincronizado, Deleted)
      VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @Placa, @Mola2, 0, 0)`;

    // Adiciona os parâmetros à consulta SQL
    sqlRequest.input("Mola2", sql.Int, mola2); // Adiciona o valor da mola2

    // Executa a consulta SQL de inserção com os parâmetros fornecidos
    await sqlRequest.query(query);
  }
}

// Função assíncrona para adicionar controladoras do tipo Locker no banco de dados, usando transação, controladora, ID de DM e ID de cliente
async function adicionarControladoraLocker(
  transaction, // Transação associada ao processo de inserção
  controladora, // Objeto contendo as informações da controladora
  dmId, // ID da DM (Distribuição de Manutenção)
  clienteId // ID do cliente
) {
  // Loop que percorre todas as posições dentro da controladora
  for (const posicao of controladora.dados.posicao) {
    // Cria uma nova instância de um objeto `sql.Request` associado à transação recebida
    const sqlRequest = new sql.Request(transaction);

    // Define a consulta SQL para inserir um registro na tabela `Controladoras` com o valor da posição
    const query = `
      INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, DIP, Posicao, Sincronizado, Deleted)
      VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @DIP, @Posicao, 0, 0)`;

    // Adiciona os parâmetros à consulta SQL
    sqlRequest.input("ID_Cliente", sql.Int, clienteId); // Adiciona o ID do cliente
    sqlRequest.input("ID_DM", sql.Int, dmId); // Adiciona o ID da DM
    sqlRequest.input("Tipo_Controladora", sql.NVarChar, controladora.tipo); // Adiciona o tipo de controladora
    sqlRequest.input("DIP", sql.Int, controladora.dados.dip); // Adiciona o DIP da controladora
    sqlRequest.input("Posicao", sql.Int, posicao); // Adiciona o valor da posição

    // Executa a consulta SQL de inserção com os parâmetros fornecidos
    await sqlRequest.query(query);
  }
}

// Função assíncrona para adicionar controladoras no banco de dados, com base nos dados fornecidos: transação, controladora, ID de DM e ID de cliente
async function adicionarControladora2023(
  transaction, // Transação associada ao processo de inserção
  controladora, // Objeto contendo as informações da controladora
  dmId, // ID da DM (Distribuição de Manutenção)
  clienteId // ID do cliente
) {
  // Loop que percorre todos os valores de "andar" dentro de controladora.dados.andar
  for (const andar of controladora.dados.andar) {
    // Loop que percorre todos os valores de "posicao" dentro de controladora.dados.posicao
    for (const posicao of controladora.dados.posicao) {
      // Define a consulta SQL para inserir um registro na tabela `Controladoras` com os valores de andar e posição
      const query = `
        INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, DIP, Andar, Posicao, Sincronizado, Deleted)
        VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @DIP, @Andar, @Posicao, 0, 0)`;

      // Cria uma nova instância de um objeto `sql.Request` associado à transação recebida
      const sqlRequest = new sql.Request(transaction);

      // Adiciona os parâmetros necessários à consulta SQL
      sqlRequest.input("ID_Cliente", sql.Int, clienteId); // Adiciona o ID do cliente
      sqlRequest.input("ID_DM", sql.Int, dmId); // Adiciona o ID da DM
      sqlRequest.input("Tipo_Controladora", sql.NVarChar, controladora.tipo); // Adiciona o tipo de controladora
      sqlRequest.input("DIP", sql.Int, controladora.dados.dip); // Adiciona o DIP da controladora
      sqlRequest.input("Andar", sql.Int, andar); // Adiciona o valor de andar
      sqlRequest.input("Posicao", sql.Int, posicao); // Adiciona o valor de posição

      // Executa a consulta SQL de inserção com os parâmetros fornecidos
      await sqlRequest.query(query);
    }
  }
}

// Função assíncrona para adicionar controladoras no banco de dados, com base nos dados fornecidos: transação, controladora, ID de DM e ID de cliente
async function adicionarControladora2018(
  transaction, // Transação associada ao processo de inserção
  controladora, // Objeto contendo as informações da controladora
  dmId, // ID da DM (Distribuição de Manutenção)
  clienteId // ID do cliente
) {
  // Loop que percorre todas as molas dentro de controladora.dados.molas
  for (const mola of controladora.dados.molas) {
    // Define a consulta SQL para inserir um registro na tabela `Controladoras` com o valor da mola
    const query = `
      INSERT INTO Controladoras (ID_Cliente, ID_DM, Tipo_Controladora, Placa, Mola1, Sincronizado, Deleted)
      VALUES (@ID_Cliente, @ID_DM, @Tipo_Controladora, @Placa, @Mola1, 0, 0)`;

    // Cria uma nova instância de um objeto `sql.Request` associado à transação recebida
    const sqlRequest = new sql.Request(transaction);

    // Adiciona os parâmetros necessários à consulta SQL
    sqlRequest.input("ID_Cliente", sql.Int, clienteId); // Adiciona o ID do cliente
    sqlRequest.input("ID_DM", sql.Int, dmId); // Adiciona o ID da DM
    sqlRequest.input("Tipo_Controladora", sql.NVarChar, controladora.tipo); // Adiciona o tipo de controladora
    sqlRequest.input("Placa", sql.Int, controladora.dados.placa); // Adiciona a placa da controladora
    sqlRequest.input("Mola1", sql.Int, mola); // Adiciona o valor da mola

    // Executa a consulta SQL de inserção com os parâmetros fornecidos
    await sqlRequest.query(query);
  }
}
// Função assíncrona que lista os itens de uma DM com base no ID da DM, cliente e usuário
async function listarItensDM(request, response) {
  try {
    // Obtém os valores enviados no corpo da requisição (request body)
    const id_dm = request.body.id_dm; // ID da DM
    const id_cliente = request.body.id_cliente; // ID do cliente
    const id_usuario = request.body.id_usuario; // ID do usuário (não está sendo usado na consulta, mas está sendo coletado)

    // Verifica se o ID da DM foi fornecido
    if (id_dm) {
      // Define a consulta SQL para buscar os itens da DM na tabela DM_Itens com filtros de "Deleted", "ID_DM" e "ID_Cliente"
      const query = `
      SELECT * FROM DM_Itens
      WHERE Deleted = 0 AND ID_DM = @id_dm AND ID_Cliente = @id_cliente
    `;

      // Cria uma nova instância de um objeto `sql.Request` para realizar a consulta SQL
      const request = new sql.Request();

      // Adiciona os parâmetros necessários à consulta SQL para evitar injeção de SQL
      request.input("id_dm", sql.Int, id_dm); // Adiciona o ID da DM à consulta
      request.input("id_cliente", sql.Int, id_cliente); // Adiciona o ID do cliente à consulta

      // Executa a consulta SQL de forma assíncrona e aguarda o resultado
      const result = await request.query(query);

      // Mapeia os resultados da consulta para um formato mais amigável
      const itensFiltrados = result.recordset.map((row) => {
        // Declaração de variáveis para armazenar a posição e modelo da controladora
        let posicao;
        let modeloControladora;

        // Verifica o tipo de controladora e monta a posição de acordo
        switch (row.Controladora) {
          case "2018":
            // Caso seja controladora 2018, monta a posição com base nos dados de Placa, Motor1 e Motor2
            posicao = `${row.Controladora} / ${row.Placa} / ${row.Motor1} / ${row.Motor2}`;
            break;
          case "2023":
            // Caso seja controladora 2023, monta a posição com base nos dados de DIP, Andar e Posicao
            posicao = `${row.Controladora} / ${row.DIP} / ${row.Andar} / ${row.Posicao}`;
            break;
          case "Locker":
          case "Locker-Padrao":
          case "Locker-Ker":
            // Para os tipos Locker, Locker-Padrao e Locker-Ker, monta a posição com base no DIP e Posicao
            posicao = `${row.Controladora} / ${row.DIP} / ${row.Posicao}`;
            break;
          default:
            // Caso o tipo de controladora não seja identificado, define a posição como "Posição desconhecida"
            posicao = "Posição desconhecida";
        }

        modeloControladora = `${row.Controladora}`;

        return {
          // Retorna um objeto com os dados formatados para cada item encontrado na consulta:
          id_produto: row.id_produto, // ID do produto
          id_item: row.id_item, // ID do item
          SKU: row.sku, // SKU do produto
          Nome_Produto: row.nome, // Nome do produto
          QTD: row.quantidade, // Quantidade disponível
          Posicao: posicao, // Posição do item, que foi formatada conforme o tipo de controladora
          modelo: modeloControladora, // Modelo da controladora
          mola: row.Motor1, // Valor do Motor1 (isso pode variar dependendo do tipo de controladora)
          Capacidade: row.capacidade, // Capacidade do produto
        };
      });

      // Aqui, a função responde com o status 200 e envia os itens filtrados como resposta em formato JSON.
      response.status(200).json(itensFiltrados);
      return;
    }
    // Se o id_dm não foi enviado na requisição, responde com erro 401 indicando que o id da DM não foi fornecido.
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
    @DIP, @Andar, @Posicao, @quantidade, @quantidademinima, @Capacidade, @deleted, @nome, 
    @ProdutoCodigo, @sku, @unidade_medida, @imagem1, @ca,@Sincronizado
)`;

  // Bloco try-catch para captura de erros durante a execução da função assíncrona
  try {
    // Verifica se o id_cliente foi enviado na requisição, caso contrário retorna um erro 401
    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado"); // Retorna erro caso o id_cliente não seja fornecido
      return; // Interrompe a execução da função após o erro
    }

    // Cria uma nova instância de `sql.Request` para realizar uma consulta SQL
    const sqlRequest = new sql.Request();

    // Define a consulta SQL para buscar dados de um produto na tabela 'produtos' baseado no id_produto
    const produtoQuery = `
    SELECT nome, codigo AS ProdutoCodigo, codigo AS sku, unidade_medida, imagem1, quantidademinima, ca
    FROM produtos
    WHERE id_produto = @id_produto
  `;

    // Adiciona o parâmetro `id_produto` na consulta SQL para evitar injeção de SQL
    sqlRequest.input("id_produto", sql.Int, id_produto);

    // Executa a consulta de forma assíncrona e aguarda o resultado
    const produtoResult = await sqlRequest.query(produtoQuery);

    // Verifica se a consulta retornou algum resultado. Se não retornar, envia erro 404.
    if (produtoResult.recordset.length === 0) {
      response.status(404).json("Produto não encontrado"); // Retorna erro caso o produto não seja encontrado
      return; // Interrompe a execução da função após o erro
    }

    // Se o produto for encontrado, armazena o primeiro registro retornado
    const produto = produtoResult.recordset[0];

    // Desestrutura os dados do produto retornado da consulta SQL para facilitar o uso posterior
    const {
      nome,
      ProdutoCodigo,
      sku,
      unidade_medida,
      imagem1,
      quantidademinima,
      ca,
    } = produto;

    // Obtém o próximo ID para o item, provavelmente usando uma função para gerar esse ID de forma sequencial
    const nextIdItem = await obterProximoIdItem(); // Chama a função assíncrona para obter o próximo ID do item.

    // Cria uma nova instância de `sql.Request` para realizar a consulta SQL
    const sqlRequest2 = new sql.Request(); // Cria uma nova requisição para executar uma consulta SQL.

    // Cria um objeto com todos os parâmetros necessários para inserir no banco de dados
    const params = {
      id_item: nextIdItem, // O próximo ID obtido para o item
      id_cliente: id_cliente, // ID do cliente
      ID_DM: id_dm, // ID da DM (Distribuição de Manutenção)
      id_produto: id_produto, // ID do produto
      Controladora: tipo_controladora, // Tipo de controladora (como '2018', '2023', etc.)
      Placa: Placa, // Placa do item
      Motor1: Motor1, // Motor 1 (provavelmente uma referência de algum valor relacionado ao item)
      Motor2: Motor2 ? Motor2 : 0, // Motor 2, caso não seja fornecido, assume o valor 0
      DIP: Dip, // DIP (provavelmente um valor relacionado ao produto ou configuração do item)
      Andar: null, // Andar é nulo (talvez utilizado apenas em alguns tipos de controladora)
      Posicao: null, // Posição é nula (pode ser definido posteriormente)
      quantidade: 0, // Quantidade inicial (definido como 0 por padrão)
      capacidade: Capacidade, // Capacidade do item (valor passado como parâmetro)
      Sincronizado: 0, // Flag que indica se o item foi sincronizado (0 significa que não foi sincronizado)
      deleted: false, // Flag que indica se o item foi marcado como excluído (false significa que não foi excluído)
      nome: nome, // Nome do produto ou item
      ProdutoCodigo: ProdutoCodigo, // Código do produto
      sku: sku, // SKU (código de estoque) do produto
      unidade_medida: unidade_medida, // Unidade de medida do produto
      imagem1: imagem1, // Imagem do produto
      ca: ca, // Código de caixa (ou algum identificador relacionado)
      quantidademinima: quantidademinima, // Quantidade mínima do produto
    };

    // Para evitar injeção de SQL e garantir segurança, adiciona os parâmetros para a consulta SQL usando `input`
    sqlRequest2.input("id_item", sql.Int, nextIdItem); // Adiciona o parâmetro `id_item` à consulta
    sqlRequest2.input("id_cliente", sql.Int, id_cliente); // Adiciona o parâmetro `id_cliente` à consulta
    sqlRequest2.input("ID_DM", sql.Int, id_dm); // Adiciona o parâmetro `ID_DM` à consulta
    sqlRequest2.input("id_produto", sql.Int, id_produto); // Adiciona o parâmetro `id_produto` à consulta
    sqlRequest2.input("Controladora", sql.VarChar, tipo_controladora); // Adiciona o parâmetro `Controladora` à consulta
    sqlRequest2.input("Placa", sql.Int, Placa); // Adiciona o parâmetro `Placa` à consulta
    sqlRequest2.input("Motor1", sql.Int, Motor1); // Adiciona o parâmetro `Motor1` à consulta
    sqlRequest2.input("Motor2", sql.Int, Motor2 ? Motor2 : 0); // Adiciona o parâmetro `Motor2` (se fornecido, senão é 0)
    sqlRequest2.input("DIP", sql.Int, Dip); // Adiciona o parâmetro `DIP` à consulta
    sqlRequest2.input("Andar", sql.Int, Andar); // Adiciona o parâmetro `Andar` (nulo neste caso)
    sqlRequest2.input("Posicao", sql.Int, Posicao); // Adiciona o parâmetro `Posicao` (nulo neste caso)
    sqlRequest2.input("quantidade", sql.Int, 0); // Adiciona o parâmetro `quantidade` (inicialmente 0)
    sqlRequest2.input("Capacidade", sql.Int, Capacidade); // Adiciona o parâmetro `Capacidade` à consulta
    sqlRequest2.input("deleted", sql.Bit, false); // Adiciona o parâmetro `deleted` (false indica não excluído)
    sqlRequest2.input("nome", sql.NVarChar, nome); // Adiciona o parâmetro `nome` à consulta
    sqlRequest2.input("ProdutoCodigo", sql.NVarChar, ProdutoCodigo); // Adiciona o parâmetro `ProdutoCodigo` à consulta
    sqlRequest2.input("sku", sql.NVarChar, sku); // Adiciona o parâmetro `sku` à consulta
    sqlRequest2.input("unidade_medida", sql.NVarChar, unidade_medida); // Adiciona o parâmetro `unidade_medida` à consulta
    sqlRequest2.input("imagem1", sql.NVarChar, imagem1); // Adiciona o parâmetro `imagem1` à consulta
    sqlRequest2.input("ca", sql.NVarChar, ca); // Adiciona o parâmetro `ca` à consulta
    sqlRequest2.input("quantidademinima", sql.Int, quantidademinima); // Adiciona o parâmetro `quantidademinima` à consulta
    sqlRequest2.input("Sincronizado", sql.Int, 0); // Adiciona o parâmetro `Sincronizado` (inicialmente 0)

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
    Capacidade,
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

    // Cria uma nova instância da requisição SQL para realizar a consulta ao banco de dados
    const sqlRequest = new sql.Request(); // Instancia um objeto de requisição SQL para interagir com o banco de dados.

    // Define a consulta SQL que será executada para recuperar dados de um produto com base no ID fornecido
    const produtoQuery = `
  SELECT nome, codigo AS ProdutoCodigo, codigo AS sku, unidade_medida, imagem1, quantidademinima, ca, capacidade
  FROM produtos
  WHERE id_produto = @id_produto
`; // A consulta SQL seleciona diversos campos da tabela `produtos`, incluindo o nome, código, SKU, unidade de medida, etc., para um produto específico baseado no seu `id_produto`.

    // Associa o parâmetro `id_produto` à consulta SQL, usando o tipo de dado `Int` e o valor passado como argumento
    sqlRequest.input("id_produto", sql.Int, id_produto); // Associa o valor `id_produto` à consulta, substituindo o parâmetro `@id_produto` na consulta SQL.

    // Executa a consulta SQL e aguarda a resposta
    const produtoResult = await sqlRequest.query(produtoQuery); // Realiza a execução assíncrona da consulta SQL e aguarda o resultado.

    // Verifica se a consulta não retornou resultados (i.e., se o produto não foi encontrado)
    if (produtoResult.recordset.length === 0) {
      // Se o `recordset` (conjunto de registros) retornado pela consulta estiver vazio, significa que o produto não foi encontrado.
      response.status(404).json("Produto não encontrado"); // Retorna um código de status 404 e uma mensagem indicando que o produto não foi encontrado.
      return; // Interrompe a execução da função, não processando mais nada após a resposta.
    }

    // Extrai os dados do primeiro produto retornado pela consulta (presumivelmente haverá apenas um produto com o `id_produto` fornecido)
    const produto = produtoResult.recordset[0]; // O produto é obtido do primeiro registro do `recordset` retornado pela consulta.

    // Desestrutura os campos do produto para torná-los mais acessíveis
    const {
      nome, // Nome do produto.
      ProdutoCodigo, // Código do produto (renomeado como `ProdutoCodigo` na consulta).
      sku, // SKU do produto (também renomeado como `sku`).
      unidade_medida, // Unidade de medida do produto.
      imagem1, // Imagem do produto (presumivelmente o caminho ou URL da imagem).
      quantidademinima, // Quantidade mínima do produto.
      ca, // Algum outro campo relacionado ao produto (pode ser "ca" para código de embalagem ou algo relacionado).
    } = produto; // Desestrutura os valores do produto para variáveis locais para facilitar o acesso a cada um desses dados posteriormente.

    // Cria uma nova requisição SQL
    const sqlRequest2 = new sql.Request(); // Instancia um objeto de requisição SQL para interagir com o banco de dados.

    // Define um objeto `params` contendo os dados que serão utilizados na inserção na tabela
    const params = {
      id_item: id_item, // ID do item (gerado ou fornecido de alguma forma)
      id_cliente: id_cliente, // ID do cliente
      ID_DM: id_dm, // ID da DM (provavelmente um identificador de algum tipo de entidade ou módulo)
      id_produto: id_produto, // ID do produto
      Controladora: tipo_controladora, // Tipo da controladora
      Placa: Placa, // Identificador da placa (presumivelmente um número ou código)
      Motor1: Motor1, // Identificador do motor 1
      Motor2: Motor2 ? Motor2 : 0, // Se o Motor2 for fornecido, usa seu valor, caso contrário, usa 0
      DIP: Dip, // Identificador do DIP
      Andar: Andar, // Andar, se aplicável (pode se referir a um nível ou andar físico)
      Posicao: Posicao, // Posição do item, se aplicável
      Sincronizado: 0, // Valor fixo de "sincronizado" (presumivelmente indicando se está ou não sincronizado)
      quantidade: 0, // Quantidade do produto, com valor inicial 0 (pode ser atualizado conforme necessário)
      capacidade: Capacidade, // Capacidade do produto (presumivelmente, a capacidade de carga ou funcionalidade)
      deleted: false, // Flag indicando se o item foi deletado (inicializado como `false`)
      nome: nome, // Nome do produto
      ProdutoCodigo: ProdutoCodigo, // Código do produto (identificador único do produto)
      sku: sku, // SKU (Stock Keeping Unit), código de identificação do produto para inventário
      unidade_medida: unidade_medida, // Unidade de medida do produto (como "kg", "unidade", etc.)
      imagem1: imagem1, // Imagem 1 do produto (presumivelmente o caminho ou URL da imagem)
      ca: ca, // Algum outro parâmetro do produto, possivelmente relacionado a características ou categorização
      quantidademinima: quantidademinima, // Quantidade mínima do produto (usada para controle de estoque)
    };

    // Para cada um dos parâmetros definidos no objeto `params`, associamos ao parâmetro correspondente na consulta SQL
    sqlRequest2.input("id_item", sql.Int, id_item); // Associa o valor do ID do item à consulta SQL
    sqlRequest2.input("id_cliente", sql.Int, id_cliente); // Associa o ID do cliente à consulta SQL
    sqlRequest2.input("ID_DM", sql.Int, id_dm); // Associa o ID da DM à consulta SQL
    sqlRequest2.input("id_produto", sql.Int, id_produto); // Associa o ID do produto à consulta SQL
    sqlRequest2.input("Controladora", sql.VarChar, tipo_controladora); // Associa o tipo da controladora à consulta SQL
    sqlRequest2.input("Placa", sql.Int, Placa); // Associa o valor da placa à consulta SQL
    sqlRequest2.input("Motor1", sql.Int, Motor1); // Associa o valor do motor 1 à consulta SQL
    sqlRequest2.input("Motor2", sql.Int, Motor2 ? Motor2 : 0); // Associa o valor do motor 2 (ou 0, caso não esteja disponível) à consulta SQL
    sqlRequest2.input("DIP", sql.Int, Dip); // Associa o valor do DIP à consulta SQL
    sqlRequest2.input("Andar", sql.Int, Andar); // Associa o andar à consulta SQL
    sqlRequest2.input("Posicao", sql.Int, Posicao); // Associa a posição à consulta SQL
    sqlRequest2.input("Sincronizado", sql.Int, 0); // Define o valor de "Sincronizado" como 0 na consulta SQL
    sqlRequest2.input("quantidade", sql.Int, 0); // Define a quantidade como 0 na consulta SQL (pode ser atualizada mais tarde)
    sqlRequest2.input("capacidade", sql.Int, Capacidade); // Associa a capacidade à consulta SQL
    sqlRequest2.input("deleted", sql.Bit, false); // Define o valor de "deleted" como false na consulta SQL
    sqlRequest2.input("nome", sql.NVarChar, nome); // Associa o nome do produto à consulta SQL
    sqlRequest2.input("ProdutoCodigo", sql.NVarChar, ProdutoCodigo); // Associa o código do produto à consulta SQL
    sqlRequest2.input("sku", sql.NVarChar, sku); // Associa o SKU à consulta SQL
    sqlRequest2.input("unidade_medida", sql.NVarChar, unidade_medida); // Associa a unidade de medida à consulta SQL
    sqlRequest2.input("imagem1", sql.NVarChar, imagem1); // Associa a imagem1 à consulta SQL
    sqlRequest2.input("ca", sql.NVarChar, ca); // Associa o campo "ca" à consulta SQL
    sqlRequest2.input("quantidademinima", sql.Int, quantidademinima); // Associa a quantidade mínima à consulta SQL

    // Executa a consulta SQL de atualização
    const updateResult = await sqlRequest2.query(updateQuery); // A consulta `updateQuery` é executada. O resultado é armazenado na variável `updateResult`.

    // Verifica se a atualização foi bem-sucedida, verificando o número de linhas afetadas
    if (updateResult.rowsAffected[0] > 0) {
      // Se o número de linhas afetadas for maior que 0, significa que o item foi atualizado com sucesso.
      response.status(200).send("Item DM atualizado com sucesso!"); // Envia uma resposta com código de status 200 (sucesso) e a mensagem de sucesso.
    } else {
      // Caso o número de linhas afetadas seja 0, significa que a atualização não foi feita (o item não foi encontrado ou não houve alteração).
      response.status(404).send("Item DM não encontrado ou não atualizado."); // Envia uma resposta com código de status 404 (não encontrado) e a mensagem de erro.
    }
  } catch (error) {
    console.error("Erro ao executar a atualização:", error);
    response.status(500).send("Erro ao atualizar o item DM.");
  }
}
// Função assíncrona para deletar um item da tabela DM_Itens
async function deletarItensDM(request, response) {
  // Extrai os parâmetros do corpo da requisição
  const id_item = request.body.id_item; // ID do item que será deletado
  const id_usuario = request.body.id_usuario; // ID do usuário que está realizando a ação
  const id_cliente = request.body.id_cliente; // ID do cliente associado ao item

  // Consulta SQL que será executada no banco de dados para marcar o item como deletado
  const query =
    "UPDATE DM_Itens SET deleted = 1, Sincronizado = 0 WHERE id_item = @id_item"; // A consulta de atualização define `deleted = 1` para marcar o item como deletado e `Sincronizado = 0` para indicar que o item não está sincronizado.

  // Cria um objeto params para os parâmetros da consulta
  const params = {
    id_item: id_item,
  };

  try {
    // Verifica se o id_item foi enviado na requisição
    if (!id_item) {
      // Se o id_item não for fornecido, retorna um erro
      response.status(401).json("ID do item não enviado");
      return;
    }

    // Cria um novo objeto de requisição SQL para executar a consulta
    const sqlRequest = new sql.Request();

    // Define o parâmetro para a consulta SQL
    sqlRequest.input("id_item", sql.Int, id_item); // Mapeia o parâmetro id_item para o tipo inteiro no banco de dados

    // Executa a consulta no banco de dados
    const result = await sqlRequest.query(query); // A consulta é executada e o resultado é armazenado na variável `result`

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
  // Extrai os parâmetros da requisição
  const ID_DM = request.body.ID_DM;
  const id_usuario = request.body.id_usuario;
  const id_cliente = request.body.id_cliente;

  // Consulta SQL para marcar os itens como deletados
  const query = `
    UPDATE DMs SET deleted = 1 WHERE ID_DM = @ID_DM;
    UPDATE DM_Itens SET deleted = 1 WHERE ID_DM = @ID_DM;
    UPDATE Controladoras SET deleted = 1 WHERE ID_DM = @ID_DM;
    UPDATE cad_locker SET deleted = 1 WHERE ID_DM = @ID_DM;
  `;
  const params = {
    ID_DM: ID_DM,
  };
  // Verificação do parâmetro ID_DM
  try {
    if (!ID_DM) {
      response.status(401).json("ID da DM não enviado");
      return;
    }
    // Cria a requisição SQL e mapeia os parâmetros
    const sqlRequest = new sql.Request();
    sqlRequest.input("ID_DM", sql.Int, ID_DM); // Define o parâmetro ID_DM como inteiro

    // Executa a consulta SQL
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
    // Prepara a consulta SQL
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
async function validar(request, response) {
  const { UserID, Chaveapi, ClienteID, URL } = request.body; // Desestrutura os dados de id_cliente e id_usuario do corpo da requisição.
  try {
    console.log(`${URL}/api/Login`); // Loga a URL de login da API externa.
    const apiResponse = await axios.post(`${URL}/api/Login`, {
      // Faz uma requisição POST para obter o token.
      UserID: UserID,
      AccessKey: Chaveapi,
      IdCliente: ClienteID,
      tpReadFtp: 0,
    });

    const { authenticated, message } = apiResponse.data;
    if (!authenticated) {
      return response
        .status(200)
        .json({ success: false, message: message || "Falha na autenticação." });
    }
    return response
      .status(200)
      .json({ success: true, message: "Autenticação bem-sucedida." });
  } catch (error) {
    return response.status(500).json({
      success: false,
      message: "Erro ao validar o usuário.",
      error: error.message, // Retorna detalhes do erro
    });
  }
}
async function seforlocker(request, response) {
  const { id_dm, id_cliente, is_locker } = request.body;

  try {
    const sqlRequest = new sql.Request();
    sqlRequest.input("id_cliente", sql.Int, id_cliente);
    sqlRequest.input("id_dm", sql.Int, id_dm);

    let action = "Nenhuma ação realizada."; // default

    //se for false
    if (!is_locker) {
      // Sempre desativa
      const updateQuery = `
        UPDATE cad_locker
        SET deleted = 1
        WHERE id_cliente = @id_cliente AND id_dm = @id_dm AND deleted = 0
      `;
      const result = await sqlRequest.query(updateQuery);
      action = result.rowsAffected[0] > 0
        ? "Locker desativado (deleted=1)."
        : "Locker já estava desativado ou não existia.";
    } else {
      // Verifica se existe
      const selectQuery = `
        SELECT TOP 1 deleted
        FROM cad_locker
        WHERE id_cliente = @id_cliente AND id_dm = @id_dm
      `;
      const selectResult = await sqlRequest.query(selectQuery);

      if (selectResult.recordset.length === 0) {
        // Não existe → insere
        const insertQuery = `
          INSERT INTO cad_locker (id_cliente, id_dm, deleted, sincronizado)
          VALUES (@id_cliente, @id_dm, 0, 0)
        `;
        await sqlRequest.query(insertQuery);
        action = "Locker inserido com sucesso.";
      } else {
        
          // Existe mas estava desativado → ativa
          const updateQuery = `
            UPDATE cad_locker
            SET deleted = 0
            WHERE id_cliente = @id_cliente AND id_dm = @id_dm
          `;
          await sqlRequest.query(updateQuery);
          action = "Locker reativado (deleted=0).";
        
      }
    }

    return response.status(200).json({ message: action });

  } catch (error) {
    console.error("Erro ao processar locker:", error);
    return response.status(500).send("Erro ao processar locker");
  }
}


async function getLocker(request, response) {
  const { id_dm, id_cliente } = request.body;

  try {
    const sqlRequest = new sql.Request();
    sqlRequest.input("id_cliente", sql.Int, id_cliente);
    sqlRequest.input("id_dm", sql.Int, id_dm);

    const selectQuery = `
      SELECT 1
      FROM cad_locker
      WHERE id_cliente = @id_cliente
        AND id_dm = @id_dm
        AND deleted = 0
    `;
    const result = await sqlRequest.query(selectQuery);

    // Retorna se existe ou não
    return response.status(200).json({
      exists: result.recordset.length > 0
    });
  } catch (error) {
    console.error("Erro ao buscar locker:", error);
    return response.status(500).send("Erro ao buscar locker");
  }
}

module.exports = {
  adicionar,
  listarDM,
  validar,
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
  seforlocker,
  getLocker,
};
