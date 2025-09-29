// Importa o módulo 'mssql', utilizado para interagir com o banco de dados SQL Server.
const sql = require("mssql");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const { DateTime } = require("luxon");

// Importa a função 'logQuery' do módulo utilitário localizado em '../../utils/logUtils'.
// A função 'logQuery' provavelmente é usada para registrar detalhes sobre a execução de queries no banco de dados.
const { logQuery } = require("../../utils/logUtils");

// Importa o módulo 'crypto', que fornece funcionalidades de criptografia, como a geração de chaves seguras e hashes.
const crypto = require("crypto");

/**
 * Converte uma string para um valor booleano.
 *
 * A função compara o valor da string e retorna `true` se a string for exatamente igual a `"true"`, caso contrário, retorna `false`.
 *
 * @param {string} value - O valor a ser convertido em booleano.
 * @returns {boolean} - Retorna `true` se o valor for `"true"`, caso contrário, retorna `false`.
 */
const convertToBoolean = (value) => {
  return value === "true";
};

/**
 * Gera uma chave de API aleatória e única em formato hexadecimal.
 *
 * A função utiliza o módulo `crypto` para gerar 32 bytes aleatórios, que são então convertidos para uma string hexadecimal de 64 caracteres.
 *
 * @returns {string} - Retorna a chave gerada em formato hexadecimal.
 */
function generateApiKey() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Retorna a estrutura do menu principal conforme o perfil do usuário.
 *
 * @param {number} perfil - O ID do perfil do usuário.
 * @returns {object} - Retorna um objeto que representa o menu configurado para o perfil.
 * @throws {Error} - Lança um erro se o perfil não for reconhecido.
 */
function getMenuOrderByProfile(perfil) {
  // Estrutura de menu para diferentes perfis

  /**
   * Objeto que define a ordem e os ícones para o menu de itens no caso do "Menu Master".
   * Cada chave do objeto representa uma opção de menu, e o valor associado contém um objeto
   * com o `id_item` (um identificador único para o item do menu) e o `icone` (uma string que
   * define o ícone a ser exibido para o item, utilizando a biblioteca PrimeIcons).
   *
   * @constant {Object} menuOrderMaster
   * @property {Object} Dashboard - Menu do Dashboard.
   * @property {Object} Relatórios - Menu de Relatórios.
   * @property {Object} Configurações - Menu de Configurações.
   * @property {Object} Importações - Menu de Importações.
   * @property {Object} EndPoints - Menu de EndPoints.
   * @property {Object} Cadastros - Menu de Cadastros.
   *
   * @example
   * menuOrderMaster.Dashboard = { id_item: 1, icone: "pi pi-fw pi-chart-pie" };
   */
  const menuOrderMaster = {
    Dashboard: { id_item: 1, icone: "pi pi-fw pi-chart-pie" },
    Relatórios: { id_item: 2, icone: "pi pi-fw pi-list" },
    Configurações: { id_item: 3, icone: "pi pi-fw pi-cog" },
    Importações: { id_item: 4, icone: "pi pi-fw pi-upload" },
    EndPoints: { id_item: 5, icone: "pi pi-fw pi-cloud" },
    Cadastros: { id_item: 6, icone: "pi pi-fw pi-user-plus" },
  };

  /**
   * Objeto que define a ordem e os ícones para o menu de itens no caso do "Menu Operador".
   * Cada chave do objeto representa uma opção de menu, e o valor associado contém um objeto
   * com o `id_item` (um identificador único para o item do menu) e o `icone` (uma string que
   * define o ícone a ser exibido para o item, utilizando a biblioteca PrimeIcons).
   *
   * @constant {Object} menuOrderOperador
   * @property {Object} Dashboard - Menu do Dashboard.
   * @property {Object} "Dispenser Machines" - Menu de Máquinas Dispensadoras.
   * @property {Object} Produtos - Menu de Produtos.
   * @property {Object} Relatórios - Menu de Relatórios.
   *
   * @example
   * menuOrderOperador.Dashboard = { id_item: 1, icone: "pi pi-fw pi-chart-pie" };
   */
  const menuOrderOperador = {
    Dashboard: { id_item: 1, icone: "pi pi-fw pi-chart-pie" },
    "Dispenser Machines": { id_item: 3, icone: "pi pi-fw pi-box" },
    Produtos: { id_item: 4, icone: "pi pi-fw pi-tags" },
    Relatórios: { id_item: 2, icone: "pi pi-fw pi-list" },
  };

  /**
   * Objeto que define a ordem e os ícones para o menu de itens no caso do "Menu Avulso".
   * Cada chave do objeto representa uma opção de menu, e o valor associado contém um objeto
   * com o `id_item` (um identificador único para o item do menu) e o `icone` (uma string que
   * define o ícone a ser exibido para o item, utilizando a biblioteca PrimeIcons).
   *
   * @constant {Object} menuOrderAvulso
   * @property {Object} Dashboard - Menu do Dashboard.
   * @property {Object} "Liberação Avulsa" - Menu para liberação avulsa.
   * @property {Object} "Consulta Status de Liberação Avulsa" - Menu para consulta de status de liberação.
   *
   * @example
   * menuOrderAvulso.Dashboard = { id_item: 1, icone: "pi pi-fw pi-chart-pie" };
   */
  const menuOrderAvulso = {
    Dashboard: { id_item: 1, icone: "pi pi-fw pi-chart-pie" },
    "Liberação Avulsa": { id_item: 2, icone: "pi pi-fw pi-key" },
    "Consulta Status de Liberação Avulsa": {
      id_item: 3,
      icone: "pi pi-fw pi-search",
    },
  };

  // Retorna o menu conforme o perfil
  switch (perfil) {
    case 1: // Master
      return menuOrderMaster;
    case 3: // Operador
      return menuOrderOperador;
    case 4: // Avulso
      return menuOrderAvulso;
    default:
      throw new Error("Perfil não reconhecido");
  }
}

async function salvarMenus(request, response) {
  const { id_cliente, perfil, menus } = request.body; //pega as info do body
  const referenciaCliente = 88; // Cliente de referência
  let transaction;

  try {
    console.log("Perfil recebido:", perfil);

    const menuOrder = getMenuOrderByProfile(perfil);
    console.log("Menu Order selecionado:", menuOrder);

    transaction = new sql.Transaction();
    await transaction.begin();
    console.log("Transação iniciada");

    // *********************** Inserir Dashboard ****************************
    if (menuOrder["Dashboard"]) {
      const dashboardOrder = menuOrder["Dashboard"];
      const existsDashboard = await verificarMenuExistente(
        transaction,
        id_cliente,
        "Dashboard"
      );

      if (!existsDashboard) {
        // Insere o menu caso ele não exista
        await inserirMenuPrincipal(
          transaction,
          id_cliente,
          perfil,
          "Dashboard",
          dashboardOrder
        );
        console.log("Dashboard inserido com sucesso!");
      } else {
        // Se já existe, verifica se está marcado como deletado
        const requestCheckDeleted = new sql.Request(transaction);
        const result = await requestCheckDeleted
          .input("id_cliente", sql.Int, id_cliente)
          .input("perfil", sql.Int, perfil)
          .input("Nome", sql.VarChar, "Dashboard").query(`
      SELECT deleted FROM Menu 
      WHERE Cod_Cli = @id_cliente AND Perfil = @perfil AND Nome = @Nome
    `);

        const deletedValue = result.recordset[0]?.deleted;

        if (deletedValue === true || deletedValue === 1) {
          // Atualiza deleted = 0
          const requestUpdate = new sql.Request(transaction);

          const updateParams = {
            id_cliente,
            perfil,
            Nome: "Dashboard",
          };

          console.log("🔍 Parâmetros do UPDATE:", updateParams);

          requestUpdate
            .input("id_cliente", sql.Int, updateParams.id_cliente)
            .input("perfil", sql.Int, updateParams.perfil)
            .input("Nome", sql.VarChar, updateParams.Nome);

          const updateQuery = `
  UPDATE Menu 
  SET deleted = 0 
  WHERE Cod_Cli = @id_cliente AND Perfil = @perfil AND Nome = @Nome AND deleted = 1
`;

          console.log("🔄 Executando UPDATE:\n", updateQuery);

          const result = await requestUpdate.query(updateQuery);
          console.log("🔁 Linhas afetadas:", result.rowsAffected);

          console.log("Dashboard reativado (deleted = 0).");
        } else {
          console.log("Dashboard já existe e está ativo. Pulando inserção.");
        }
      }
    }

    console.log("Preparando dados para inserção...");
    //*********************MENU  **************************/
    // Obter menus existentes no banco
    const existingMenus = await obterMenusExistentes(
      transaction,
      id_cliente,
      perfil
    );
    const existingMenuNames = new Set(existingMenus.map((m) => m.Nome));
    // Obter submenus existentes no banco
    const existingSubMenus = await obterSubMenusExistentes(
      transaction,
      id_cliente,
      perfil
    );
    const existingSubMenuNames = new Set(existingSubMenus.map((m) => m.Nome));

    // Preparação dos dados
    const bulkMenus = [];
    const bulkSubmenus = [];
    const submenuNames = [];
    const subsubmenuMap = {};

    for (let menu of menus) {
      const order = menuOrder[menu.name];
      if (!order) {
        console.log(`Menu ${menu.name} não encontrado para o perfil ${perfil}`);
        continue;
      }

      if (!existingMenuNames.has(menu.name)) {
        bulkMenus.push({
          ID_item: order.id_item,
          Cod_Cli: id_cliente,
          Nome: menu.name,
          Perfil: perfil,
          Icone: order.icone,
          Deleted: 0,
        });
      } else {
        // Verifica se o menu está deletado e reativa ele
        const request = new sql.Request(transaction);
        request.input("id_cliente", sql.Int, id_cliente);
        request.input("menu_name", sql.VarChar, menu.name);
        request.input("perfil", sql.Int, perfil);

        await request.query(`
          UPDATE Menu SET deleted = 0 
          WHERE Cod_Cli = @id_cliente AND Nome = @menu_name AND Perfil = @perfil AND deleted = 1
        `);
        console.log(`✅ Menu '${menu.name}' reativado (deleted = 0)`);
      }

      //********************************** SUBMENU *************************/

      for (let submenu of menu.submenus) {
        submenuNames.push(submenu.name);

        // ✔️ Se o submenu não existe no banco, adiciona à lista de inserção
        if (!existingSubMenuNames.has(submenu.name)) {
          bulkSubmenus.push({
            ID_Item: order.id_item,
            Cod_Cli: id_cliente,
            Nome: submenu.name,
            Perfil: perfil,
            To: null,
            ID_Sub_Item: 0,
            Deleted: 0,
          });
        } else {
          // Verifica se o submenu está deletado e reativa ele
          const request = new sql.Request(transaction);
          request.input("id_cliente", sql.Int, id_cliente);
          request.input("submenu_name", sql.VarChar, submenu.name);
          request.input("perfil", sql.Int, perfil);

          await request.query(`
            UPDATE Menu_Itens SET deleted = 0 
            WHERE Cod_Cli = @id_cliente AND Nome = @submenu_name AND Perfil = @perfil AND deleted = 1
          `);
          console.log(`✅ Menu '${submenu.name}' reativado (deleted = 0)`);
        }

        //****************************** SUBSUBMENU ***************************/

        if (submenu.subsubmenus) {
          subsubmenuMap[submenu.name] = submenu.subsubmenus;
          submenu.subsubmenus.forEach((subsubmenu) =>
            submenuNames.push(subsubmenu.name)
          );
        }
      }
    }
    console.log("Preparação dos dados concluída com sucesso!");

    // INSERIR MENUS PRINCIPAIS
    console.log("Inserindo menus principais...");

    await bulkInsert(transaction, "Menu", bulkMenus, 500);

    console.log(`✅ Inseridos ${bulkMenus.length} registros na tabela Menu`);

    // Obter os valores 'To' de todos os submenus e subsubmenus
    console.log(
      "Buscando valores 'To' para todos os submenus e subsubmenus..."
    );
    const submenuToValues = await getAllSubmenuToValues(
      transaction,
      submenuNames,
      referenciaCliente
    );

    // Atualizar os valores 'To' nos submenus
    bulkSubmenus.forEach((submenu) => {
      submenu.To = submenuToValues[submenu.Nome] || null; // Preenche o valor 'To'
    });

    // INSERIR SUBMENU
    console.log("Inserindo submenus...");

    await bulkInsert(transaction, "Menu_Itens", bulkSubmenus, 500);

    console.log(
      `✅ Inseridos ${bulkSubmenus.length} registros na tabela Menu_Itens (Submenus)`
    );

    // Obter os IDs dos submenus recém-inseridos
    console.log("Buscando IDs dos submenus para preparar os subsubmenus...");
    const submenuIdMap = {};
    for (let menu of menus) {
      const submenuIds = await getInsertedSubmenuIds(
        transaction,
        id_cliente,
        menuOrder[menu.name].id_item
      );
      Object.assign(submenuIdMap, submenuIds); // Adiciona os IDs ao mapa global
    }

    // Preparar os subsubmenus para inserção
    const bulkSubsubmenus = [];
    const existingSubsubMenus = await obterSubsubMenusExistentes(
      transaction,
      id_cliente,
      perfil
    );
    const existingSubsubMenuNames = new Set(
      existingSubsubMenus.map((m) => m.Nome)
    );

    for (let [submenuName, subsubmenus] of Object.entries(subsubmenuMap)) {
      const submenuId = submenuIdMap[submenuName]; // Obter o ID do submenu pai
      if (!submenuId) {
        console.warn(
          `⚠️ ID do submenu '${submenuName}' não encontrado. Pulando subsubmenus.`
        );
        continue;
      }

      for (let subsubmenu of subsubmenus) {
        if (!existingSubsubMenuNames.has(subsubmenu.name)) {
          // Se o subsubmenu não existe no banco, adiciona à lista para inserção
          bulkSubsubmenus.push({
            ID_Item: submenuIdMap[subsubmenu.name] || 0, // ID do menu pai
            ID_Sub_Item: submenuId, // ID do submenu pai
            Cod_Cli: id_cliente,
            Nome: subsubmenu.name,
            Perfil: perfil,
            To: submenuToValues[subsubmenu.name] || null,
            Deleted: 0,
          });
        } else {
          // Se o subsubmenu já existe, mas está marcado como deleted = 1, reativa ele
          const request = new sql.Request(transaction);
          request.input("id_cliente", sql.Int, id_cliente);
          request.input("subsubmenu_name", sql.VarChar, subsubmenu.name);
          request.input("perfil", sql.Int, perfil);

          await request.query(`
            UPDATE Menu_Itens SET deleted = 0 
            WHERE Cod_Cli = @id_cliente AND Nome = @subsubmenu_name AND Perfil = @perfil AND deleted = 1
          `);
          console.log(
            `✅ Subsubmenu '${subsubmenu.name}' reativado (deleted = 0)`
          );
        }
      }
    }
    console.log("Subsubmenus preparados para inserção!");

    // INSERIR SUBSUBMENUS
    console.log("Inserindo subsubmenus...");
    await bulkInsert(transaction, "Menu_Itens", bulkSubsubmenus, 500);
    console.log(
      `✅ Inseridos ${bulkSubsubmenus.length} registros na tabela Menu_Itens (Subsubmenus)`
    );

    // 🔄 Atualizar 'deleted = 1' para menus e submenus que não estão na nova lista
    await marcarDeletados(transaction, id_cliente, menus, perfil);
    // Finalizar a transação
    await transaction.commit();
    console.log("✅ Transação concluída com sucesso!");
    response.status(200).send("Menus salvos com sucesso!");
  } catch (error) {
    // Reverter a transação em caso de erro
    if (transaction) {
      try {
        await transaction.rollback();
        console.log("⚠️ Transação revertida com sucesso.");
      } catch (rollbackError) {
        console.error("Erro ao reverter a transação:", rollbackError.message);
      }
    }

    console.error("❌ Erro ao salvar menus:", error.message);
    response.status(500).send("Erro ao salvar menus");
  }
}

//  buscar os menus existentes no banco
async function obterMenusExistentes(transaction, id_cliente, perfil) {
  const request = new sql.Request(transaction);
  request.input("id_cliente", sql.Int, id_cliente);
  request.input("perfil", sql.Int, perfil);

  const result = await request.query(`
    SELECT Nome FROM Menu WHERE Cod_Cli = @id_cliente AND Perfil = @perfil 
  `);

  return result.recordset;
}

async function obterSubMenusExistentes(transaction, id_cliente, perfil) {
  const request = new sql.Request(transaction);
  request.input("id_cliente", sql.Int, id_cliente);
  request.input("perfil", sql.Int, perfil);

  const result = await request.query(`
    SELECT * FROM Menu_Itens WHERE Cod_cli = @id_cliente AND Perfil = @perfil AND ID_Sub_Item = 0
    `);

  return result.recordset;
}

async function obterSubsubMenusExistentes(transaction, id_cliente, perfil) {
  const request = new sql.Request(transaction);
  request.input("id_cliente", sql.Int, id_cliente);
  request.input("perfil", sql.Int, perfil);

  const result = await request.query(`
    SELECT Nome FROM Menu_Itens WHERE Cod_cli = @id_cliente AND Perfil = @perfil AND ID_Sub_Item > 0
    `);

  return result.recordset;
}

// marcar menus como deletados
async function marcarDeletados(transaction, id_cliente, newMenus, perfil) {
  const newMenuNames = new Set(newMenus.map((m) => m.name)); // Conjunto de novos menus
  const existingMenus = await obterMenusExistentes(
    transaction,
    id_cliente,
    perfil
  ); // Obter menus existentes do banco

  // Verificar e marcar os menus que não estão mais na nova lista como deletados
  for (let menu of existingMenus) {
  // Ignora o Dashboard
  if (menu.Nome === "Dashboard") {
    console.log("⏭️ Ignorando 'Dashboard' ao marcar como deletado.");
    continue;
  }

  if (!newMenuNames.has(menu.Nome)) {
    console.log(`Marcando como deletado: ${menu.Nome}`);

    const request = new sql.Request(transaction);
    request.input("id_cliente", sql.Int, id_cliente);
    request.input("menu_name", sql.VarChar, menu.Nome);
    request.input("perfil", sql.Int, perfil);

    await request.query(`
      UPDATE Menu SET deleted = 1 
      WHERE Cod_Cli = @id_cliente AND Nome = @menu_name AND Perfil = @perfil AND deleted = 0
    `);
  }
}


  // Verificar e marcar submenus como deletados
  const newSubmenus = newMenus ? newMenus.flatMap((m) => m.submenus) : [];
  const newSubmenuNames = new Set(newSubmenus.map((s) => s.name)); // Nomes dos novos submenus
  const existingSubmenus = await obterSubMenusExistentes(
    transaction,
    id_cliente,
    perfil
  ); // Submenus existentes no banco

  for (let submenu of existingSubmenus) {
    if (!newSubmenuNames.has(submenu.Nome)) {
      console.log(`Marcando submenu como deletado: ${submenu.Nome}`);

      const request = new sql.Request(transaction);
      request.input("id_cliente", sql.Int, id_cliente);
      request.input("submenu_name", sql.VarChar, submenu.Nome);
      request.input("perfil", sql.Int, perfil);

      await request.query(`
        UPDATE Menu_Itens SET deleted = 1 
        WHERE Cod_Cli = @id_cliente AND Nome = @submenu_name AND Perfil = @perfil AND ID_Sub_Item = 0 AND deleted = 0
      `);
    }
  }

  // Verificar e marcar subsubmenus como deletados
  const newSubsubmenus = newMenus
    ? newMenus.flatMap((m) => m.submenus.flatMap((s) => s.subsubmenus || []))
    : [];
  const newSubsubmenuNames = new Set(newSubsubmenus.map((s) => s.name)); // Nomes dos novos subsubmenus
  const existingSubsubmenus = await obterSubsubMenusExistentes(
    transaction,
    id_cliente,
    perfil
  ); // Subsubmenus existentes no banco

  for (let subsubmenu of existingSubsubmenus) {
    if (!newSubsubmenuNames.has(subsubmenu.Nome)) {
      console.log(`Marcando subsubmenu como deletado: ${subsubmenu.Nome}`);

      const request = new sql.Request(transaction);
      request.input("id_cliente", sql.Int, id_cliente);
      request.input("subsubmenu_name", sql.VarChar, subsubmenu.Nome);
      request.input("perfil", sql.Int, perfil);

      await request.query(`
        UPDATE Menu_Itens SET deleted = 1 
        WHERE Cod_Cli = @id_cliente AND Nome = @subsubmenu_name AND Perfil = @perfil AND ID_Sub_Item > 0 AND deleted = 0
      `);
    }
  }
}

// obter valores 'To' para submenus e subsubmenus
async function getAllSubmenuToValues(
  transaction,
  submenuNames,
  referenciaCliente
) {
  if (submenuNames.length === 0) return {};

  const request = new sql.Request(transaction);
  const inClause = submenuNames.map((name) => `'${name}'`).join(", ");
  request.input("referenciaCliente", sql.Int, referenciaCliente);

  const result = await request.query(`
    SELECT Nome, To FROM Menu_Itens WHERE Cod_Cli = @referenciaCliente AND Nome IN (${inClause})
  `);

  return result.recordset.reduce((acc, row) => {
    acc[row.Nome] = row.To;
    return acc;
  }, {});
}

// obter os IDs dos submenus recém-inseridos
async function getInsertedSubmenuIds(transaction, id_cliente, menuId) {
  const request = new sql.Request(transaction);
  request.input("id_cliente", sql.Int, id_cliente);
  request.input("menuId", sql.Int, menuId);

  const result = await request.query(`
    SELECT Nome, ID_Item FROM Menu_Itens WHERE Cod_Cli = @id_cliente AND ID_Item = @menuId
  `);

  return result.recordset.reduce((acc, row) => {
    acc[row.Nome] = row.ID_Item;
    return acc;
  }, {});
}

/**
 * Verifica se um menu com o nome especificado já existe no banco.
 */
async function verificarMenuExistente(transaction, id_cliente, menuName) {
  const request = new sql.Request(transaction);
  request.input("id_cliente", sql.Int, id_cliente);
  request.input("menu_name", sql.VarChar, menuName);

  const result = await request.query(`
    SELECT COUNT(*) AS count 
    FROM Menu 
    WHERE Cod_Cli = @id_cliente AND Nome = @menu_name 
  `);

  return result.recordset[0].count > 0;
}

/**
 * Realiza o bulk insert em uma tabela SQL.
 */
async function bulkInsert(transaction, tableName, data, batchSize = 500) {
  if (!data.length) return;

  // Cria a lista de colunas para o SQL
  const columns = Object.keys(data[0])
    .map((col) => `[${col}]`)
    .join(", ");

  // Processa os dados em lotes
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);

    // Cria a lista de valores para o SQL
    const values = batch
      .map(
        (row) =>
          "(" +
          Object.values(row)
            .map((value) =>
              typeof value === "string"
                ? `'${value.replace(/'/g, "''")}'`
                : value === null || value === undefined
                ? "NULL"
                : value
            )
            .join(", ") +
          ")"
      )
      .join(", ");

    // Monta a query de insert
    const sqlQuery = `INSERT INTO ${tableName} (${columns}) VALUES ${values}`;
    console.log(
      `Executando bulk insert na tabela ${tableName}, registros: ${batch.length}`
    );
    // Cria a requisição SQL com a transação
    const request = new sql.Request(transaction);
    request.timeout = 60000; // 60 segundos de timeout
    // Executa a query
    try {
      await request.query(sqlQuery);
      console.log(
        `✅ Bulk insert concluído para a tabela ${tableName}, lote de ${batch.length} registros.`
      );
    } catch (err) {
      console.error(
        `❌ Erro ao executar bulk insert na tabela ${tableName}:`,
        err.message
      );
      throw err;
    }
  }
}

/**
 * Obtém os IDs dos submenus relacionados a um item de menu específico e um cliente,
 * executando uma consulta no banco de dados.
 * @async
 * @function getInsertedSubmenuIds
 * @param {Object} transaction - A transação ativa utilizada para realizar a consulta.
 * @param {number} id_cliente - O identificador do cliente para filtrar os submenus.
 * @param {number} menuId - O identificador do item de menu para filtrar os submenus.
 * @returns {Promise<Object>} Retorna um objeto contendo os submenus, com o nome do submenu como chave e o ID como valor.
 * @throws {Error} Lança um erro caso ocorra falha ao executar a consulta SQL.
 */
async function getInsertedSubmenuIds(transaction, id_cliente, menuId) {
  // Consulta SQL para obter os IDs e Nomes dos submenus relacionados ao cliente e item de menu especificados.
  const query = `
    SELECT ID, Nome
    FROM Menu_Itens
    WHERE Cod_Cli = @id_cliente AND ID_Item = @menuId
  `;

  // Cria uma nova requisição SQL utilizando a transação fornecida.
  const request = new sql.Request(transaction);

  // Adiciona os parâmetros para a consulta SQL, vinculando as variáveis id_cliente e menuId.
  request.input("id_cliente", sql.Int, id_cliente);
  request.input("menuId", sql.Int, menuId);

  try {
    // Executa a consulta SQL e aguarda o resultado.
    const result = await request.query(query);

    // Exibe no console o resultado da consulta, mostrando os submenus encontrados.
    console.log(
      `✅ IDs dos submenus obtidos para ID_Item=${menuId}:`,
      result.recordset
    );

    // Retorna um objeto com o nome do submenu como chave e o ID do submenu como valor.
    return result.recordset.reduce((acc, row) => {
      acc[row.Nome] = row.ID;
      return acc;
    }, {});
  } catch (err) {
    // Em caso de erro na consulta, exibe a mensagem de erro no console.
    console.error("❌ Erro ao buscar IDs dos submenus:", err.message);

    // Lança o erro para que o chamador possa tratar o problema.
    throw err;
  }
}

async function inserirMenuPrincipal(
  transaction, // A transação ativa para a inserção no banco de dados.
  id_cliente, // O ID do cliente que está associando o item de menu.
  perfil, // O perfil de usuário relacionado ao item de menu.
  nome, // O nome do item de menu.
  order // O objeto 'order' contendo o ícone e o ID do item de menu.
) {
  // Cria uma nova instância de uma requisição SQL associada à transação ativa.
  const sqlRequest = new sql.Request(transaction);

  // Adiciona os parâmetros necessários à requisição SQL, associando o valor das variáveis aos respectivos campos.
  sqlRequest
    .input("Cod_Cli", sql.Int, id_cliente) // Parâmetro que representa o código do cliente (ID).
    .input("Nome", sql.VarChar, nome) // Parâmetro que representa o nome do item de menu.
    .input("Perfil", sql.Int, perfil) // Parâmetro que representa o perfil associado ao item de menu.
    .input("Icone", sql.VarChar, order.icone) // Parâmetro que representa o ícone associado ao item de menu.
    .input("ID_item", sql.Int, order.id_item); // Parâmetro que representa o ID do item de menu.

  // Realiza a query de inserção no banco de dados para adicionar o novo item de menu.
  await sqlRequest.query(`
    INSERT INTO Menu (ID_item, Cod_Cli, Nome, Perfil, Icone)
    VALUES (@ID_item, @Cod_Cli, @Nome, @Perfil, @Icone)
  `);
}

async function getAllSubmenuToValues(
  transaction,
  submenuNames,
  referenciaCliente
) {
  // Se não houver submenus na lista, retorna um objeto vazio imediatamente.
  if (!submenuNames.length) return {};

  // Monta a consulta SQL para buscar os valores da coluna 'To' dos submenus fornecidos.
  const query = `
    SELECT Nome, [to]
    FROM Menu_Itens
    WHERE Nome IN (${submenuNames
      .map((name) => `'${name.replace(/'/g, "''")}'`)
      .join(", ")})
      AND Cod_Cli = @referenciaCliente
  `;

  // Cria uma nova requisição SQL associada à transação fornecida.
  const request = new sql.Request(transaction);
  request.input("referenciaCliente", sql.Int, referenciaCliente); // Passa o identificador do cliente como parâmetro para a consulta.

  try {
    // Executa a consulta SQL e aguarda o resultado.
    const result = await request.query(query);

    // Exibe no console os valores 'To' obtidos.
    console.log(`✅ Valores 'To' obtidos:`, result.recordset);

    // Retorna um mapa onde as chaves são os nomes dos submenus e os valores são os valores da coluna 'To'.
    // Caso o valor de 'To' seja nulo ou indefinido, será atribuído 'null'.
    return result.recordset.reduce((acc, row) => {
      acc[row.Nome] = row.to || null; // Usa 'null' caso 'to' seja nulo ou indefinido.
      return acc;
    }, {});
  } catch (err) {
    // Caso ocorra algum erro, exibe a mensagem de erro no console.
    console.error("❌ Erro ao buscar valores 'To':", err.message);

    // Relança o erro para que o chamador possa tratar o erro.
    throw err;
  }
}

/**
 * Função para listar os clientes e seus respectivos menus a partir do banco de dados.
 * Para cada cliente, os menus principais e os itens de menu associados são recuperados e organizados em uma árvore de menus.
 *
 * @param {Object} request - O objeto de solicitação da requisição HTTP, contendo os parâmetros necessários para a execução da função.
 * @param {Object} response - O objeto de resposta da requisição HTTP, utilizado para enviar o resultado ou erro de volta ao cliente.
 *
 * @returns {void} Retorna a resposta com um status HTTP e os dados dos clientes e seus menus, ou um erro se ocorrer durante o processo.
 */
async function listarComMenu(request, response) {
  try {
    // Consulta SQL para recuperar todos os clientes não deletados
    const queryClientes = `
            SELECT *
            FROM clientes
            WHERE deleted = 0`;

    // Executa a consulta SQL para pegar os clientes
    const resultClientes = await new sql.Request().query(queryClientes);
    const clientes = resultClientes.recordset;

    // Array para armazenar os clientes com seus menus
    const clientesComMenu = [];

    // Itera sobre cada cliente
    for (const cliente of clientes) {
      const id_cliente = cliente.id_cliente;

      // Consulta SQL para recuperar os menus principais deste cliente
      const queryMenu = `
                SELECT * FROM Menu
                WHERE Cod_cli = @id_cliente`;

      // Consulta SQL para recuperar os itens de menu deste cliente
      const queryMenuItem = `
                SELECT * FROM menu_itens
                WHERE Cod_cli = @id_cliente`;

      // Prepara a requisição SQL com o ID do cliente
      const requestSql = new sql.Request();
      requestSql.input("id_cliente", sql.Int, id_cliente);

      // Executa as consultas para recuperar os menus e itens de menu
      const MenuR = await requestSql.query(queryMenu);
      const Menu = MenuR.recordset;

      const MenuItemR = await requestSql.query(queryMenuItem);
      const MenuItem = MenuItemR.recordset;

      // Construir a árvore de menus (ou vazio se não houver menus/itens)
      const menuTree =
        Menu.length > 0 || MenuItem.length > 0
          ? buildMenuTree(Menu, MenuItem)
          : [];
      // Limpa os itens do menu para garantir que não há dados indesejados
      menuTree.forEach(cleanItems);

      // Adiciona o cliente com os menus à lista
      clientesComMenu.push({
        ...cliente,
        menus: menuTree,
      });
    }
    // Retorna os clientes com seus menus
    response.status(200).json(clientesComMenu);
  } catch (error) {
    // Caso ocorra algum erro, retorna um erro HTTP 500
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}
async function listarComMenuPaginado(request, response) {
  try {
    const {
      first = 0,
      rows = 10,
      sortField = "id_cliente",
      sortOrder = "ASC",
      filters = {},
    } = request.body;

    // Consulta inicial para listar os clientes com paginação
    let queryClientes = `
      SELECT 
        COUNT(*) OVER() AS TotalRecords, 
        clientes.id_cliente,
        clientes.nome,
        clientes.cpfcnpj as cnpj,
        clientes.ativo,
        clientes.deleted,
        clientes.created,
        clientes.updated,
        clientes.last_login,
        clientes.usar_api,
        clientes.atualizado        
      FROM 
        clientes
      WHERE 
        deleted = 0
    `;

    const sqlRequest = new sql.Request();

    // Adiciona filtros dinâmicos, se presentes
    if (filters.global && filters.global.value) {
      const globalValue = `%${filters.global.value}%`; // Adiciona o wildcard para LIKE
      queryClientes += ` AND (
          id_cliente LIKE @globalValue OR 
          nome LIKE @globalValue OR 
          last_login LIKE @globalValue
      )`;

      sqlRequest.input("globalValue", sql.NVarChar, globalValue);
    }

    // Adiciona ordenação e paginação
    queryClientes += `
      ORDER BY ${sortField} ${sortOrder === "DESC" ? "DESC" : "ASC"}
      OFFSET @first ROWS FETCH NEXT @rows ROWS ONLY;
    `;

    sqlRequest.input("first", sql.Int, first);
    sqlRequest.input("rows", sql.Int, rows);

    // Executa a consulta para obter os clientes paginados
    const resultClientes = await sqlRequest.query(queryClientes);

    // Extrai os clientes e o total de registros
    const clientes = resultClientes.recordset;
    const totalRecords = clientes.length > 0 ? clientes[0].TotalRecords : 0;

    // Lista para armazenar os clientes com menus
    const clientesComMenu = [];

    // Itera sobre os clientes retornados para buscar menus e itens de menu
    for (const cliente of clientes) {
      const id_cliente = cliente.id_cliente;

      // Consulta para recuperar os menus do cliente
      const queryMenu = `
        SELECT * 
        FROM Menu
        WHERE Cod_cli = @id_cliente AND deleted = 0
      `;

      // Consulta para recuperar os itens de menu do cliente
      const queryMenuItem = `
        SELECT * 
        FROM menu_itens
        WHERE Cod_cli = @id_cliente AND deleted = 0
      `;

      // Prepara a requisição SQL
      const requestSql = new sql.Request();
      requestSql.input("id_cliente", sql.Int, id_cliente);

      // Executa as consultas para obter os menus e itens
      const menuResult = await requestSql.query(queryMenu);
      const menuItemResult = await requestSql.query(queryMenuItem);

      const menus = menuResult.recordset;
      const menuItens = menuItemResult.recordset;

      // Agrupar menus por perfil
      const menusPorPerfil = {};

      // Itera sobre os menus para agrupar por perfil
      menus.forEach((menu) => {
        const perfil = menu.Perfil;
        if (!menusPorPerfil[perfil]) {
          menusPorPerfil[perfil] = [];
        }
        menusPorPerfil[perfil].push(menu);
      });

      // Itera sobre os itens de menu e agrupa por perfil
      menuItens.forEach((menuItem) => {
        const perfil = menuItem.Perfil;
        if (!menusPorPerfil[perfil]) {
          menusPorPerfil[perfil] = [];
        }
        menusPorPerfil[perfil].push(menuItem);
      });

      // Adiciona o cliente e seus menus agrupados por perfil à lista
      clientesComMenu.push({
        ...cliente,
        menusPorPerfil: menusPorPerfil, // Adiciona os menus por perfil
      });
    }
    // Retorna os clientes paginados com seus menus e o total de registros
    response.status(200).json({ clientesComMenu, totalRecords });
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função que constrói uma árvore de menus a partir dos menus principais e itens de menu.
 *
 * @param {Array} menus - Lista de menus principais.
 * @param {Array} menuItems - Lista de itens de menu associados aos menus principais.
 *
 * @returns {Array} Retorna uma árvore de menus organizada, com menus e submenus devidamente hierarquizados.
 */
function buildMenuTree(menus, menuItems) {
  const menuMap = {};
  const itemMap = {};

  // Popula o menuMap com os menus principais
  menus.forEach((menu) => {
    menuMap[menu.ID_item] = {
      label: menu.Nome,
      icon: menu.Icone || null,
      to:
        menu.Nome.toLowerCase() === "dashboard"
          ? "/dashboard"
          : menu.To || null,
      items: [], // Inicializa uma lista vazia de itens de menu
    };
  });

  // Popula o itemMap com os itens do menu
  menuItems.forEach((item) => {
    itemMap[item.ID] = {
      label: item.Nome,
      icon: item.Icone || null,
      to: item.to || null,
      items: [], // Inicializa uma lista vazia de sub-itens
    };
  });

  // Adiciona os itens aos seus menus ou sub-itens correspondentes
  menuItems.forEach((item) => {
    if (item.ID_Sub_Item && item.ID_Sub_Item !== 0) {
      // Se o item é um subitem, adiciona a seu item pai
      if (itemMap[item.ID_Sub_Item]) {
        itemMap[item.ID_Sub_Item].items.push(itemMap[item.ID]);
      }
    } else {
      // Se o item é um menu principal, adiciona ao menu principal correspondente
      if (menuMap[item.ID_Item]) {
        menuMap[item.ID_Item].items.push(itemMap[item.ID]);
      }
    }
  });

  // Converte o menuMap em um array de menus
  const menuTree = Object.values(menuMap);

  return menuTree;
}

/**
 * Função recursiva que remove a propriedade `items` de um menu caso a lista de itens esteja vazia.
 * Se a lista de itens contiver elementos, a função é chamada recursivamente para limpar os sub-itens.
 *
 * @param {Object} menu - O menu que será processado para remover submenus vazios.
 * @returns {void} Não retorna valor, apenas modifica o menu.
 */
function cleanItems(menu) {
  // Verifica se o menu possui itens
  if (menu.items) {
    // Se não houver itens, remove a propriedade 'items'
    if (menu.items.length === 0) {
      delete menu.items;
    } else {
      // Caso contrário, chama a função recursivamente para limpar itens e subitens
      menu.items.forEach(cleanItems);
    }
  }
}

/**
 * Função para listar todos os clientes não deletados do banco de dados.
 *
 * @param {Object} request - O objeto de solicitação da requisição HTTP, não utilizado nesta função.
 * @param {Object} response - O objeto de resposta da requisição HTTP, usado para enviar os resultados ao cliente.
 *
 * @returns {void} Retorna os dados dos clientes com status HTTP 200 ou um erro em caso de falha.
 */
async function listar(request, response) {
  try {
    // Consulta SQL para recuperar todos os clientes não deletados
    const query = "SELECT * FROM clientes WHERE deleted = 0 ORDER BY nome";

    // Executa a consulta SQL e obtém o resultado
    const result = await new sql.Request().query(query);

    // Retorna os dados dos clientes com status HTTP 200
    response.status(200).json(result.recordset);
  } catch (error) {
    // Em caso de erro, exibe o erro no console e envia a resposta de erro HTTP 500
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para listar clientes com apenas id_cliente e nome, sem dados adicionais.
 *
 * @param {Object} request - O objeto de solicitação da requisição HTTP, não utilizado nesta função.
 * @param {Object} response - O objeto de resposta da requisição HTTP, usado para enviar os resultados ao cliente.
 *
 * @returns {void} Retorna os dados dos clientes com status HTTP 200 ou um erro em caso de falha.
 */
async function listaSimples(request, response) {
  try {
    // Consulta SQL para recuperar o id_cliente e nome dos clientes não deletados
    const query =
      "SELECT id_cliente,nome FROM clientes WHERE deleted = 0 ORDER BY nome";

    // Executa a consulta SQL e obtém o resultado
    const result = await new sql.Request().query(query);

    // Retorna os dados dos clientes com status HTTP 200
    response.status(200).json(result.recordset);
  } catch (error) {
    // Em caso de erro, exibe o erro no console e envia a resposta de erro HTTP 500
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para listar clientes com seus serviços e notificações associadas.
 * Dependendo do papel do usuário (Administrador ou outro), a consulta pode retornar todos os serviços ou apenas os do cliente específico.
 *
 * @param {Object} request - O objeto de solicitação da requisição HTTP, contendo o ID do cliente e o papel do usuário.
 * @param {Object} response - O objeto de resposta da requisição HTTP, usado para enviar os resultados ao cliente.
 *
 * @returns {void} Retorna os clientes com seus serviços e notificações associadas, ou um erro em caso de falha.
 */
async function listarClienteComServicos(request, response) {
  try {
    let query;
    const id_cliente = request.body.id_cliente; // ID do cliente a ser listado
    const userRole = request.roles; // Função ou papéis do usuário para determinar as permissões de consulta

    // Se o usuário for administrador, retorna todos os serviços
    if (userRole.includes("Administrador")) {
      query = `
                SELECT 
                    c.id_cliente, c.nome AS cliente_nome,
                    ns.id_servico, ns.nome AS servico_nome, 
                    ns.frequencia, ns.tipo_notificacao, 
                    ns.id_funcionario_responsavel, ns.hora_notificacao, ns.nome
                FROM 
                    clientes c
                LEFT JOIN 
                    Notificacoes_Servicos ns ON c.id_cliente = ns.id_cliente
                WHERE 
                    c.deleted = 0
                    AND (ns.deleted = 0 OR ns.deleted IS NULL)
                    ORDER BY c.nome
            `;
    } else {
      // Se o usuário não for administrador, retorna apenas os serviços do cliente específico
      query = `
                SELECT 
                    c.id_cliente, c.nome AS cliente_nome,
                    ns.id_servico, ns.nome AS servico_nome, 
                    ns.frequencia, ns.tipo_notificacao, 
                    ns.id_funcionario_responsavel, ns.hora_notificacao, ns.nome
                FROM 
                    clientes c
                LEFT JOIN 
                    Notificacoes_Servicos ns ON c.id_cliente = ns.id_cliente
                WHERE 
                    c.id_cliente = @id_cliente AND c.deleted = 0 AND ns.deleted = 0
            `;
    }
    // Executa a consulta SQL para obter os resultados
    const result = await new sql.Request()
      .input("id_cliente", sql.Int, id_cliente)
      .query(query);

    // Mapeia os resultados para uma estrutura específica
    const clientesComServicos = mapClientesComServicos(result.recordset);

    // Retorna os resultados com status HTTP 200
    response.status(200).json(clientesComServicos);
  } catch (error) {
    // Em caso de erro, exibe o erro no console e envia a resposta de erro HTTP 500
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para adicionar um novo cliente e gerar uma chave de API associada.
 * Realiza a inserção do cliente e da chave de API em uma transação atômica.
 *
 * @param {Object} request - O objeto de solicitação HTTP, contendo os dados do cliente a ser adicionado.
 * @param {Object} response - O objeto de resposta HTTP, usado para enviar a resposta ao cliente.
 *
 * @returns {void} Retorna um status HTTP 201 em caso de sucesso ou um erro HTTP 500 em caso de falha.
 */
async function adicionar(request, response) {
  const { nome, cnpj, ativo, usar_api, id_usuario } = request.body; // Dados do cliente
  const apiKey = generateApiKey(); // Geração da chave de API
  const hash = await bcrypt.hash("123456", saltRounds);
  const queryCliente = `
        INSERT INTO clientes 
        (id_cliente, nome, cpfcnpj, ativo, deleted, created, updated, last_login, usar_api, atualizado)
        VALUES (@id_cliente, @nome, @cnpj, @ativo, @deleted, @created, @updated, @last_login, @usar_api, @atualizado)
    `;

  const queryApiKey = `
        INSERT INTO API_KEY (id_cliente, api_key, Nome_cliente)
        VALUES (@id_cliente, @api_key, @nome_cliente)
    `;
  const queryDash = `
    INSERT INTO Usuario_Dash (id_cliente, login, senha)
    VALUES (@id_cliente, @login, @senha)
`;
  const transaction = new sql.Transaction(); // Inicia uma transação
  try {
    await transaction.begin(); // Começa a transação

    // Instancia um novo sql.Request para a primeira query
    let sqlRequest = new sql.Request(transaction);

    // Recupera o maior valor de id_cliente na tabela
    const resultId = await sqlRequest.query(
      `SELECT ISNULL(MAX(id_cliente), 0) AS lastId FROM clientes`
    );
    const lastId = resultId.recordset[0].lastId;
    const newIdCliente = lastId + 1;
    const nowInBrazil = DateTime.now().setZone("America/Sao_Paulo").toJSDate();
    // Prepara as variáveis para a query de inserção de cliente
    sqlRequest.input("id_cliente", sql.Int, newIdCliente);
    sqlRequest.input("nome", sql.VarChar, nome);
    sqlRequest.input("cnpj", sql.VarChar, cnpj);
    sqlRequest.input("ativo", sql.Bit, ativo);
    sqlRequest.input("deleted", sql.Bit, false);
    sqlRequest.input("created", sql.DateTime, nowInBrazil);
    sqlRequest.input("updated", sql.DateTime, nowInBrazil);
    sqlRequest.input(
      "last_login",
      sql.DateTime,
      new Date("1900-01-01 00:00:00.000")
    );
    sqlRequest.input("usar_api", sql.Bit, usar_api);
    sqlRequest.input("atualizado", sql.Bit, false);

    // Executa a query para inserir o cliente
    await sqlRequest.query(queryCliente);

    // Instancia um novo sql.Request para a query de inserção de API Key
    sqlRequest = new sql.Request(transaction);

    // Prepara as variáveis para a query de inserção de API Key
    sqlRequest.input("id_cliente", sql.Int, newIdCliente);
    sqlRequest.input("api_key", sql.VarChar, apiKey);
    sqlRequest.input("nome_cliente", sql.VarChar, nome);

    // Executa a query para inserir a chave de API
    await sqlRequest.query(queryApiKey);

    // Instancia um novo sql.Request para a query de inserção de Usuario_Dash
    sqlRequest = new sql.Request(transaction);
    const login = nome.trim().toLowerCase() + "@lab220.com.br";
    // Prepara as variáveis para a query de inserção de API Key
    sqlRequest.input("id_cliente", sql.Int, newIdCliente);
    sqlRequest.input("login", sql.NVarChar, login);
    sqlRequest.input("senha", sql.NVarChar, hash);

    await sqlRequest.query(queryDash);

    // Commit da transação
    await transaction.commit();

    response.status(201).send("Cliente criado com sucesso e API Key gerada!"); // Retorna sucesso
  } catch (error) {
    await transaction.rollback(); // Em caso de erro, reverte a transação
    console.error("Erro ao inserir o usuário:", error.message);
    response.status(500).send("Erro ao inserir o usuário"); // Retorna erro
  }
}

/**
 * Função para adicionar serviços a um cliente específico.
 * A inserção é realizada de forma transacional para garantir a integridade dos dados.
 *
 * @param {Object} request - O objeto de solicitação HTTP, contendo os dados do cliente e os serviços a serem adicionados.
 * @param {Object} response - O objeto de resposta HTTP, usado para enviar a resposta ao cliente.
 *
 * @returns {void} Retorna um status HTTP 200 em caso de sucesso ou um erro HTTP 500 em caso de falha.
 */
async function adicionarServico(request, response) {
  const { id_cliente, servicos } = request.body; // Dados do cliente e os serviços a serem adicionados
  try {
    let transaction = new sql.Transaction();
    await transaction.begin(); // Inicia a transação
    for (const servico of servicos) {
      for (const metodo of servico.metodos_notificacao) {
        let dest = [];
        if (metodo === "email") {
          dest = servico.destinatarios;
        } else if (metodo === "notif") {
          dest = servico.destinatariosweb;
        } else {
          continue;
        }
        for (const destinatario of dest) {
          const servicoComMetodo = {
            ...servico,
            metodos_notificacao: [metodo],
          };
          await inserirNovoServico(
            transaction,
            id_cliente,
            servicoComMetodo,
            destinatario
          );
        }
      }
    }

    await transaction.commit(); // Commit da transação se tudo estiver bem
    response.status(200).json({ message: "Serviços adicionados com sucesso" }); // Resposta de sucesso
  } catch (error) {
    console.error("Erro ao salvar configurações", error);
    if (transaction) {
      await transaction.rollback(); // Rollback em caso de erro
    }
    response.status(500).json({ message: "Erro ao salvar configurações" }); // Resposta de erro
  }
}

/**
 * Função para atualizar os serviços de um cliente, incluindo reativação de serviços deletados.
 * A atualização é realizada de forma transacional, com a verificação de serviços existentes.
 *
 * @param {Object} request - O objeto de solicitação HTTP, contendo os dados do cliente e os serviços a serem atualizados.
 * @param {Object} response - O objeto de resposta HTTP, usado para enviar a resposta ao cliente.
 *
 * @returns {void} Retorna um status HTTP 200 em caso de sucesso ou um erro HTTP 500 em caso de falha.
 */
async function atualizarServico(request, response) {
  const { id_cliente, servicos } = request.body;
  let transaction;

  try {
    transaction = new sql.Transaction();
    await transaction.begin(); // Inicia a transação

    // Recupera os serviços existentes para o cliente (já associados)
    const existingServices = await buscarServicosExistentes(
      transaction,
      id_cliente
    );
    // Cria um Set para facilitar a verificação: "id_servico-id_funcionario"
    const existingAssociations = new Set(
      existingServices.map(
        (reg) => `${reg.id_servico}-${reg.id_funcionario_responsavel}`
      )
    );

    // Marca como deletados os registros que não estão no payload
    await marcarServicosDeletados(
      transaction,
      id_cliente,
      existingServices,
      servicos
    );

    for (const servico of servicos) {
      const processados = new Set();

      // Itera sobre cada método de notificação do serviço
      for (const metodo of servico.metodos_notificacao) {
        // Seleciona o array de destinatários conforme o método
        let destinatariosArray = [];
        if (metodo === "email") {
          destinatariosArray = servico.destinatarios;
        } else if (metodo === "notif") {
          destinatariosArray = servico.destinatariosweb;
        }

        // Para cada destinatário desse método
        for (const destinatario of destinatariosArray) {
          const chave = `${servico.id_servico}-${destinatario}`;

          // Se esse funcionário já foi processado para esse serviço, pule
          if (processados.has(chave)) continue;
          processados.add(chave);

          if (existingAssociations.has(chave)) {
            continue;
          }

          // Cria uma cópia do serviço definindo somente o método atual para manter a consistência
          const servicoComMetodo = {
            ...servico,
            metodos_notificacao: [metodo],
          };

          // Verifica se a associação já existe (no banco) considerando o método (caso a lógica permita alteração de tipo)
          const serviceExists = await verificarServicoExistente(
            transaction,
            id_cliente,
            servico.id_servico,
            destinatario,
            metodo
          );

          if (serviceExists) {
            if (serviceExists.deleted) {
              await reativarServico(
                transaction,
                id_cliente,
                servicoComMetodo,
                destinatario
              );
            } else {
              await atualizarServicoExistente(
                transaction,
                id_cliente,
                servicoComMetodo,
                destinatario
              );
            }
          } else {
            await inserirNovoServico(
              transaction,
              id_cliente,
              servicoComMetodo,
              destinatario
            );
          }
        }
      }
    }

    await transaction.commit();
    response.status(200).json({ message: "Serviços atualizados com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar serviços:", error);
    if (transaction) {
      await transaction.rollback();
    }
    response.status(500).json({ message: "Erro ao atualizar serviços" });
  }
}

/**
 * Função para buscar os serviços existentes associados a um cliente.
 * A consulta retorna serviços não deletados (onde deleted = 0).
 *
 * @param {Object} transaction - A transação SQL que será usada para a consulta.
 * @param {number} id_cliente - O ID do cliente cujos serviços serão recuperados.
 *
 * @returns {Array} Retorna uma lista de objetos com os serviços e os responsáveis associados ao cliente.
 */
async function buscarServicosExistentes(transaction, id_cliente) {
  // Cria uma nova requisição SQL associada à transação fornecida.
  const sqlRequest = new sql.Request(transaction);

  // Define o parâmetro `id_cliente` para a consulta SQL.
  sqlRequest.input("id_cliente", sql.Int, id_cliente);

  // Executa a consulta SQL para buscar serviços associados ao cliente fornecido.
  const result = await sqlRequest.query(`
    SELECT id_servico, id_funcionario_responsavel 
    FROM Notificacoes_Servicos 
    WHERE id_cliente = @id_cliente AND deleted = 0
  `);

  // Retorna o conjunto de registros da consulta, que contém os serviços encontrados.
  return result.recordset;
}

/**
 * Função para marcar os serviços que foram deletados, com base na diferença entre os serviços existentes e os novos serviços.
 *
 * @param {Object} transaction - A transação SQL que será usada para realizar as atualizações.
 * @param {number} id_cliente - O ID do cliente cujos serviços precisam ser marcados como deletados.
 * @param {Array} existingServices - A lista de serviços existentes associados ao cliente.
 * @param {Array} servicos - A lista de serviços que devem ser mantidos.
 *
 * @returns {void} Não retorna nada, mas marca os serviços deletados no banco de dados.
 */
async function marcarServicosDeletados(
  transaction,
  id_cliente,
  existingServices,
  servicos
) {
  for (const existing of existingServices) {
    // Verifica se a associação já existe em algum dos arrays do payload
    const found = servicos.some((servico) => {
      if (servico.id_servico !== existing.id_servico) return false;
      return (
        servico.destinatarios.includes(existing.id_funcionario_responsavel) ||
        servico.destinatariosweb.includes(existing.id_funcionario_responsavel)
      );
    });

    // Se o serviço não foi encontrado nos novos serviços, ele precisa ser marcado como deletado
    if (!found) {
      // Cria uma nova requisição SQL associada à transação fornecida
      const sqlRequest = new sql.Request(transaction);

      // Adiciona parâmetros à requisição SQL para proteger contra injeção de SQL
      sqlRequest.input("id_cliente", sql.Int, id_cliente);
      sqlRequest.input("id_servico", sql.Int, existing.id_servico);
      sqlRequest.input(
        "id_funcionario_responsavel",
        sql.Int,
        existing.id_funcionario_responsavel
      );

      await sqlRequest.query(`
        UPDATE Notificacoes_Servicos
        SET deleted = 1
        WHERE id_cliente = @id_cliente 
          AND id_servico = @id_servico
          AND id_funcionario_responsavel = @id_funcionario_responsavel
      `);
    }
  }
}

/**
 * Função para verificar se um serviço específico existe para um cliente e destinatário.
 * Retorna o status de deletado (campo deleted).
 *
 * @param {Object} transaction - A transação SQL que será usada para realizar a consulta.
 * @param {number} id_cliente - O ID do cliente.
 * @param {number} id_servico - O ID do serviço a ser verificado.
 * @param {number} id_funcionario_responsavel - O ID do destinatário associado ao serviço.
 *
 * @returns {Object|null} Retorna o status de deletado (deleted) do serviço ou null caso o serviço não seja encontrado.
 */
async function verificarServicoExistente(
  transaction,
  id_cliente,
  id_servico,
  id_funcionario_responsavel,
  tipo_notificacao
) {
  const sqlRequest = new sql.Request(transaction);

  // Adiciona os parâmetros necessários à requisição SQL para proteger contra injeção de SQL
  sqlRequest.input("id_cliente", sql.Int, id_cliente);
  sqlRequest.input("id_servico", sql.Int, id_servico);
  sqlRequest.input(
    "id_funcionario_responsavel",
    sql.Int,
    id_funcionario_responsavel
  );
  sqlRequest.input("tipo_notificacao", sql.VarChar, tipo_notificacao);

  // Executa a consulta SQL para verificar a existência do serviço atribuído ao funcionário responsável
  const result = await sqlRequest.query(`
    SELECT deleted 
    FROM Notificacoes_Servicos 
    WHERE id_cliente = @id_cliente 
      AND id_servico = @id_servico 
      AND id_funcionario_responsavel = @id_funcionario_responsavel
      AND tipo_notificacao = @tipo_notificacao
  `);

  // Verifica se o serviço foi encontrado e retorna o primeiro registro, caso contrário retorna null
  return result.recordset.length > 0 ? result.recordset[0] : null;
}

/**
 * Função para reativar um serviço marcado como deletado.
 * Atualiza as informações do serviço para permitir que ele seja reusado.
 *
 * @param {Object} transaction - A transação SQL que será usada para a atualização.
 * @param {number} id_cliente - O ID do cliente.
 * @param {Object} servico - O serviço que será reativado.
 * @param {number} destinatario - O ID do destinatário que será associado ao serviço.
 *
 * @returns {void} Não retorna nada, mas reativa o serviço no banco de dados.
 */
async function reativarServico(transaction, id_cliente, servico, destinatario) {
  // Cria uma nova requisição SQL associada à transação fornecida
  const sqlRequest = new sql.Request(transaction);

  // Adiciona os parâmetros necessários à requisição SQL para proteger contra injeção de SQL
  sqlRequest.input("frequencia", sql.VarChar, servico.frequencia_notificacao);
  sqlRequest.input(
    "tipo_notificacao",
    sql.VarChar,
    servico.metodos_notificacao[0]
  );
  sqlRequest.input(
    "hora_notificacao",
    sql.VarChar,
    servico.horario_notificacao
  );
  sqlRequest.input("id_cliente", sql.Int, id_cliente);
  sqlRequest.input("id_servico", sql.Int, servico.id_servico);
  sqlRequest.input("id_funcionario_responsavel", sql.Int, destinatario);

  // Executa a consulta SQL para reativar o serviço e atualizar os dados de notificação
  await sqlRequest.query(`
    UPDATE Notificacoes_Servicos 
    SET frequencia = @frequencia,
        tipo_notificacao = @tipo_notificacao,
        hora_notificacao = @hora_notificacao,
        deleted = 0
    WHERE id_cliente = @id_cliente 
      AND id_servico = @id_servico 
      AND id_funcionario_responsavel = @id_funcionario_responsavel
  `);
}

/**
 * Função para validar o formato da hora de notificação.
 * Se a hora não for válida, a função lança um erro.
 *
 * @param {string} hora - A hora no formato HH:MM ou HH:MM:SS.
 *
 * @returns {string|null} Retorna a hora formatada como HH:MM:SS ou null, caso não haja hora.
 * @throws {Error} Lança um erro se a hora não estiver em um formato válido.
 */
function validarHoraNotificacao(hora) {
  if (!hora) {
    return null; // Se a hora for null, retorna null para o banco de dados
  }

  // Verifica se a string está no formato HH:MM
  const timeFormat = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
  if (timeFormat.test(hora)) {
    // Adiciona ":00" para completar no formato HH:MM:SS
    return `${hora}:00`;
  }

  // Se a string já estiver no formato HH:MM:SS, não faz modificações
  const fullTimeFormat = /^([0-1][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/;
  if (fullTimeFormat.test(hora)) {
    return hora;
  }

  throw new Error("Invalid time format"); // Se não estiver em nenhum formato válido, lança erro
}

/**
 * Função para atualizar as informações de um serviço existente.
 * Atualiza a frequência, tipo de notificação e hora de notificação de um serviço.
 *
 * @param {Object} transaction - A transação SQL usada para executar a atualização.
 * @param {number} id_cliente - O ID do cliente ao qual o serviço está associado.
 * @param {Object} servico - O objeto que contém as informações do serviço a ser atualizado.
 * @param {number} destinatario - O ID do funcionário responsável pelo serviço.
 *
 * @returns {void} Não retorna nada, mas atualiza o serviço na base de dados.
 */
async function atualizarServicoExistente(
  transaction,
  id_cliente,
  servico,
  destinatario
) {
  const sqlRequest = new sql.Request(transaction);

  // Valida o horário de notificação usando uma função externa
  const horaNotificacao = validarHoraNotificacao(servico.horario_notificacao);

  // Adiciona os parâmetros à requisição SQL, garantindo segurança e proteção contra injeções SQL
  sqlRequest.input("frequencia", sql.VarChar, servico.frequencia_notificacao);
  sqlRequest.input(
    "tipo_notificacao",
    sql.VarChar,
    servico.metodos_notificacao[0]
  );
  sqlRequest.input("hora_notificacao", sql.VarChar, horaNotificacao);
  sqlRequest.input("id_cliente", sql.Int, id_cliente);
  sqlRequest.input("id_servico", sql.Int, servico.id_servico);
  sqlRequest.input("id_funcionario_responsavel", sql.Int, destinatario);

  await sqlRequest.query(`
    UPDATE Notificacoes_Servicos 
    SET frequencia = @frequencia,
        tipo_notificacao = @tipo_notificacao,
        hora_notificacao = @hora_notificacao
    WHERE id_cliente = @id_cliente 
      AND id_servico = @id_servico 
      AND id_funcionario_responsavel = @id_funcionario_responsavel
  `);
}

/**
 * Função para inserir um novo serviço na tabela `Notificacoes_Servicos`.
 *
 * @param {Object} transaction - A transação SQL usada para inserir o novo serviço.
 * @param {number} id_cliente - O ID do cliente ao qual o serviço será associado.
 * @param {Object} servico - O objeto contendo as informações do novo serviço.
 * @param {number} destinatario - O ID do funcionário responsável pelo novo serviço.
 *
 * @returns {void} Não retorna nada, mas insere o serviço na base de dados.
 */
async function inserirNovoServico(
  transaction,
  id_cliente,
  servico,
  destinatario
) {
  const sqlRequest = new sql.Request(transaction);
  sqlRequest.input("nome", sql.VarChar, servico.nome_servico);
  sqlRequest.input("frequencia", sql.VarChar, servico.frequencia_notificacao);
  sqlRequest.input(
    "tipo_notificacao",
    sql.VarChar,
    servico.metodos_notificacao[0]
  );
  sqlRequest.input(
    "hora_notificacao",
    sql.VarChar,
    servico.horario_notificacao
  );
  sqlRequest.input("id_cliente", sql.Int, id_cliente);
  sqlRequest.input("id_servico", sql.Int, servico.id_servico);
  sqlRequest.input("id_funcionario_responsavel", sql.Int, destinatario);
  sqlRequest.input("deleted", sql.Bit, 0);

  await sqlRequest.query(`
    INSERT INTO Notificacoes_Servicos 
      (nome, id_cliente, frequencia, tipo_notificacao, id_funcionario_responsavel, hora_notificacao, id_servico, deleted)
    VALUES
      (@nome, @id_cliente, @frequencia, @tipo_notificacao, @id_funcionario_responsavel, @hora_notificacao, @id_servico, @deleted)
  `);
}

/**
 * Função para atualizar os dados de um cliente.
 * Atualiza as informações do cliente, como nome, CPF/CNPJ, ativo e configurações da API.
 *
 * @param {Object} request - O objeto da requisição contendo os dados do cliente a serem atualizados.
 * @param {Object} response - O objeto da resposta para retornar a resposta ao cliente.
 *
 * @returns {void} Retorna uma resposta HTTP indicando se a atualização foi bem-sucedida ou se ocorreu um erro.
 */
async function atualizar(request, response) {
  const { id_cliente, nome, cnpj, ativo, usar_api, id_usuario } = request.body;
  const nowInBrazil = DateTime.now().setZone("America/Sao_Paulo").toJSDate();
  const params = {
    nome: nome,
    cnpj: cnpj,
    ativo: convertToBoolean(ativo),
    updated: nowInBrazil,
    usar_api: convertToBoolean(usar_api),
    atualizado: true,
    id_cliente: id_cliente,
  };

  // Monta a consulta SQL para atualizar os dados do cliente na tabela 'clientes'
  const query = `
    UPDATE clientes
    SET 
        nome = @nome,           
        cpfcnpj = @cnpj,        
        ativo = @ativo,         
        updated = @updated,     
        usar_api = @usar_api,  
        atualizado = @atualizado 
    WHERE id_cliente = @id_cliente`; // Define a condição de atualização (id_cliente)

  try {
    // Cria uma nova requisição SQL para executar a consulta
    const sqlRequest = new sql.Request();
    sqlRequest.input("id_cliente", sql.Int, id_cliente);
    sqlRequest.input("nome", sql.VarChar, nome);
    sqlRequest.input("cnpj", sql.VarChar, cnpj);
    sqlRequest.input("ativo", sql.Bit, ativo);
    sqlRequest.input("updated", sql.DateTime, nowInBrazil);
    sqlRequest.input("usar_api", sql.Bit, usar_api);
    sqlRequest.input("atualizado", sql.Bit, true);
    const result = await sqlRequest.query(query);

    // Verifica se a atualização foi realizada com sucesso
    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      // Se a atualização for bem-sucedida, registra um log da operação
      logQuery(
        "info", // Nível do log
        `O usuário ${id_usuario} atualizou o cliente:${id_cliente}`, // Mensagem do log
        "sucesso", // Status da operação (sucesso)
        "UPDATE", // Tipo de operação (UPDATE)
        id_cliente, // ID do cliente atualizado
        id_usuario, // ID do usuário que fez a atualização
        query, // Consulta SQL executada
        params // Parâmetros utilizados na consulta
      );
      response.status(200).json("Cliente atualizado com sucesso");
    } else {
      logQuery(
        "error",
        `O usuário ${id_usuario} falhou em atualizar o cliente:${id_cliente}`,
        "falha",
        "UPDATE",
        id_cliente,
        id_usuario,
        query,
        params
      );
      response.status(400).json("Falha na atualização do cliente");
    }
  } catch (error) {
    logQuery(
      "error",
      error.message,
      "falha",
      "UPDATE",
      id_cliente,
      id_usuario,
      query,
      params
    );
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

const progressClients = {}; // Armazena o progresso de exclusão de clientes

async function deletar(request, response) {
  // Desestrutura o id_cliente do corpo da requisição
  const { id_cliente } = request.body;

  // Lista de tabelas que precisam ter registros excluídos
  const tables = [
    "Clientes",
    "Menu",
    "Menu_Itens",
    "DMs",
    "Controladoras",
    "DM_Itens",
    "Funcionarios",
    "Ret_Item_Funcionario",
    "Usuarios",
    "Usuarios_DM",
    "Centro_Custos",
    "Setores",
    "Ret_Itens_setor",
    "Funcao",
    "Plantas",
    "Produtos",
    "cad_locker",
  ];
  // Declaração de variável para a transação
  let transaction;

  try {
    // Cria uma nova transação no banco de dados
    transaction = new sql.Transaction();

    // Inicia a transação
    await transaction.begin();

    // Configura os cabeçalhos da resposta para usar Server-Sent Events (SSE)
    response.setHeader("Content-Type", "text/event-stream"); // Define o tipo de conteúdo para SSE
    response.setHeader("Cache-Control", "no-cache"); // Impede o cache da resposta
    response.setHeader("Connection", "keep-alive"); // Mantém a conexão aberta para SSE

    // Inicia um intervalo para enviar o progresso a cada 500ms
    let interval = setInterval(() => {
      // Envia os dados do progresso para o cliente em formato JSON via SSE
      response.write(`data: ${JSON.stringify(progressClients)}\n\n`);
    }, 500);

    // Evento que é acionado quando a conexão é fechada (ex: quando o cliente cancela a requisição)
    request.on("close", () => {
      // Limpa o intervalo para não continuar enviando dados de progresso após o fechamento da conexão
      clearInterval(interval);
      // Remove o cliente da lista de progresso
      delete progressClients[id_cliente];
    });

    // Inicia o progresso para esse cliente específico
    progressClients[id_cliente] = 0;

    for (let i = 0; i < tables.length; i++) {
      // Loop sobre as tabelas para excluir registros
      const table = tables[i];
      let query = `UPDATE ${table} SET deleted = 1 WHERE id_cliente = @id_cliente`;

      if (table === "Ret_Item_Funcionario") {
        query = `UPDATE Ret_Item_Funcionario
          SET deleted = 1
          FROM Ret_Item_Funcionario
          INNER JOIN Funcionarios ON Ret_Item_Funcionario.id_funcionario = Funcionarios.id_funcionario
          WHERE Funcionarios.id_cliente = @id_cliente`;
      } else if (table === "Ret_Itens_setor") {
        query = `UPDATE Ret_Itens_setor
          SET deleted = 1
          FROM Ret_Itens_setor
          INNER JOIN Setores ON Ret_Itens_setor.id_setor = Setores.id_setor
          WHERE Setores.id_cliente = @id_cliente`;
      } else if (table === "Menu") {
        query = `UPDATE Menu SET deleted = 1 WHERE Cod_Cli = @id_cliente`;
      } else if (table === "Menu_Itens") {
        query = `UPDATE Menu_Itens SET deleted = 1 WHERE Cod_Cli = @id_cliente`;
      }

      // Cria uma nova instância de uma requisição SQL associada a uma transação existente
      const sqlrequest = new sql.Request(transaction);

      // Define um parâmetro de entrada para a requisição SQL.
      // O nome do parâmetro é "id_cliente", e ele é do tipo sql.Int.
      // O valor de "id_cliente" será passado como argumento para a consulta SQL.
      sqlrequest.input("id_cliente", sql.Int, id_cliente);

      // Executa a consulta SQL (armazenada em "query") dentro do contexto da transação e aguarda a conclusão da operação
      await sqlrequest.query(query);

      // Atualiza o progresso do cliente específico
      progressClients[id_cliente] = ((i + 1) / tables.length) * 100;
    }

    await transaction.commit();

    // Finaliza o progresso do cliente
    progressClients[id_cliente] = 100;
    response.write(`data: ${JSON.stringify(progressClients)}\n\n`);
    response.end();
  } catch (err) {
    if (transaction) {
      await transaction.rollback();
    }
    progressClients[id_cliente] = -1; // Indica erro no progresso
    response.status(500).json({ "Erro ao excluir cliente": err.message });
  }
}

/**
 * Função para mapear um conjunto de registros de clientes e seus serviços.
 *
 * @param {Array} recordset - O conjunto de registros retornados de uma consulta ao banco de dados.
 *
 * @returns {Array} Retorna um array de objetos de clientes, cada um com uma lista de serviços e notificações associadas.
 */
function mapClientesComServicos(recordset) {
  return recordset.reduce((acc, row) => {
    const clienteIndex = acc.findIndex((c) => c.id_cliente === row.id_cliente);

    if (clienteIndex === -1) {
      acc.push({
        id_cliente: row.id_cliente,
        nome: row.cliente_nome,
        servicos: row.id_servico ? [mapServico(row)] : [],
      });
    } else {
      const serviceIndex = acc[clienteIndex].servicos.findIndex(
        (s) => s.id_servico === row.id_servico
      );

      if (serviceIndex === -1) {
        acc[clienteIndex].servicos.push(mapServico(row));
      } else {
        acc[clienteIndex].servicos[serviceIndex].notificacoes.push(
          mapNotificacao(row)
        );
      }
    }

    return acc;
  }, []);
}
function mapClientesComServicos(recordset) {
  // Usamos o método 'reduce' para iterar sobre cada linha do 'recordset'
  // e transformar ele em uma estrutura desejada (um array de clientes com seus serviços).
  return recordset.reduce((acc, row) => {
    // Procuramos o índice do cliente atual no acumulador (acc).
    // O acumulador será o array de clientes agrupados.
    const clienteIndex = acc.findIndex((c) => c.id_cliente === row.id_cliente);

    // Verificamos se o cliente já existe no acumulador.
    if (clienteIndex === -1) {
      // Se o cliente não foi encontrado, adicionamos um novo objeto no acumulador.
      // Criamos um novo cliente com 'id_cliente', 'nome' e um array 'servicos' vazio inicialmente.
      acc.push({
        id_cliente: row.id_cliente, // ID do cliente
        nome: row.cliente_nome, // Nome do cliente
        servicos: row.id_servico ? [mapServico(row)] : [], // Se houver um 'id_servico', mapeamos o serviço usando a função 'mapServico'
      });
    } else {
      // Caso o cliente já exista no acumulador, procuramos se o serviço já foi adicionado ao cliente.
      const serviceIndex = acc[clienteIndex].servicos.findIndex(
        (s) => s.id_servico === row.id_servico // Procuramos o serviço pelo 'id_servico'
      );

      // Se o serviço não for encontrado no array de serviços do cliente, adicionamos um novo serviço.
      if (serviceIndex === -1) {
        acc[clienteIndex].servicos.push(mapServico(row)); // Adicionamos o serviço mapeado
      } else {
        // Se o serviço já existe, adicionamos a notificação ao serviço.
        // Chamamos a função 'mapNotificacao' para mapear a notificação a partir da linha 'row'.
        acc[clienteIndex].servicos[serviceIndex].notificacoes.push(
          mapNotificacao(row) // Adiciona uma nova notificação ao serviço
        );
      }
    }

    // No final de cada iteração, retornamos o acumulador para a próxima iteração.
    return acc;
  }, []); // O acumulador inicial é um array vazio '[]'.
}

/**
 * Função para mapear um registro de serviço.
 *
 * @param {Object} row - O registro de serviço retornado do banco de dados.
 *
 * @returns {Object} Retorna um objeto representando o serviço e suas notificações.
 */
function mapServico(row) {
  // A função 'mapServico' recebe um objeto 'row' e retorna um novo objeto.
  // Este objeto mapeia as propriedades do serviço que são extraídas da linha 'row'.

  return {
    // A propriedade 'id_servico' é extraída diretamente da linha 'row'.
    id_servico: row.id_servico, // ID do serviço

    // A propriedade 'nome' é o nome do serviço, extraído da linha 'row'.
    nome: row.servico_nome, // Nome do serviço

    // A propriedade 'notificacoes' é um array que contém a notificação mapeada.
    // A função 'mapNotificacao(row)' é chamada para mapear a notificação.
    // A notificação é associada ao serviço.
    notificacoes: [mapNotificacao(row)], // Array contendo a notificação associada ao serviço
  };
}

/**
 * Função para mapear um registro de notificação.
 *
 * @param {Object} row - O registro de notificação retornado do banco de dados.
 *
 * @returns {Object} Retorna um objeto representando a notificação.
 */
function mapNotificacao(row) {
  // A função 'mapNotificacao' recebe um objeto 'row' e retorna um novo objeto que representa uma notificação.

  return {
    nome: row.nome, // Nome da notificação
    frequencia: row.frequencia, // Frequência da notificação (ex: diária, semanal, etc.)
    tipo_notificacao: row.tipo_notificacao, // Tipo de notificação (ex: e-mail, SMS, etc.)
    id_funcionario_responsavel: row.id_funcionario_responsavel, // ID do funcionário responsável pela notificação
    hora_notificacao: row.hora_notificacao, // Hora da notificação (ex: 09:00 AM)
  };
}

/**
 * Função para deletar (marcar como excluído) um serviço de um cliente.
 *
 * @param {Object} request - O objeto da requisição, contendo o ID do cliente, serviço e usuário.
 * @param {Object} response - O objeto da resposta, usado para enviar a resposta ao cliente.
 *
 * @returns {void} Retorna uma resposta HTTP indicando o sucesso ou falha na exclusão do serviço.
 */
async function deletarServico(request, response) {
  const { id_cliente, id_servico, id_usuario } = request.body;

  if (!id_cliente || !id_servico) {
    return response.status(400).json({
      error:
        "Parâmetros insuficientes. id_cliente, id_servico e id_funcionario_responsavel são obrigatórios.",
    });
  }

  try {
    // Verificando se o serviço existe
    const checkQuery = `
            SELECT 1 
            FROM Notificacoes_Servicos 
            WHERE id_cliente = @id_cliente 
            AND id_servico = @id_servico 
            AND deleted = 0
        `;

    const checkSqlRequest = new sql.Request();
    checkSqlRequest.input("id_cliente", sql.Int, id_cliente);
    checkSqlRequest.input("id_servico", sql.Int, id_servico);

    const checkResult = await checkSqlRequest.query(checkQuery);

    if (checkResult.recordset.length === 0) {
      console.log("Serviço não encontrado ou já está deletado.");
      return response
        .status(404)
        .json({ error: "Serviço não encontrado ou já está deletado." });
    }

    // Tentando deletar o serviço
    const query = `
            UPDATE Notificacoes_Servicos 
            SET deleted = 1 
            WHERE id_cliente = @id_cliente 
            AND id_servico = @id_servico 
        `;

    const sqlRequest = new sql.Request();
    sqlRequest.input("id_cliente", sql.Int, id_cliente);
    sqlRequest.input("id_servico", sql.Int, id_servico);

    const result = await sqlRequest.query(query);

    if (result.rowsAffected[0] > 0) {
      console.log(
        `Serviço ${id_servico} para o cliente ${id_cliente} removido com sucesso.`
      );
      logQuery(
        "info",
        `O usuário ${id_usuario} deletou o serviço ${id_servico} para o cliente ${id_cliente}`,
        "sucesso",
        "DELETE",
        id_cliente,
        id_usuario,
        query,
        { id_cliente, id_servico }
      );
      return response
        .status(200)
        .json({ message: "Serviço excluído com sucesso" });
    } else {
      console.log("Falha ao excluir o serviço: Nenhuma linha foi afetada.");
      logQuery(
        "error",
        `O usuário ${id_usuario} falhou em deletar o serviço ${id_servico} para o cliente ${id_cliente}`,
        "erro",
        "DELETE",
        id_cliente,
        id_usuario,
        query,
        { id_cliente, id_servico }
      );
      return response.status(404).json({ error: "Serviço não encontrado" });
    }
  } catch (error) {
    // Log do erro detalhado e resposta
    logQuery(
      "error",
      error.message,
      "erro",
      "DELETE",
      id_cliente,
      id_usuario,
      error.stack,
      { id_cliente: id_cliente, id_servico: id_servico }
    );
    console.error("Erro ao excluir:", error.message);
    return response.status(500).send("Erro ao excluir serviço");
  }
}

async function fetchdadosclient(request, response) {
  // Obtém o id_cliente do corpo da requisição.
  const id_cliente = request.body.id_cliente;

  // Se o id_cliente não for fornecido, retorna um erro 400 (Bad Request) com uma mensagem.
  if (id_cliente == null) {
    return response
      .status(400) // Status HTTP 400 - Bad Request
      .json({ message: "ID do cliente não informado." }); // Retorna um objeto JSON com a mensagem de erro.
  }

  try {
    // Declara a query SQL para buscar os dados do cliente na tabela 'clientes'.
    const query = `
      SELECT 
        c.nome, c.cpfcnpj, c.endereco, c.cidade, c.estado, c.cep
      FROM 
        clientes c
      WHERE 
        c.id_cliente = @id_cliente
    `;

    // Realiza a consulta no banco de dados utilizando o id_cliente como parâmetro de entrada.
    const result = await new sql.Request()
      .input("id_cliente", sql.Int, id_cliente) // Passa o id_cliente como parâmetro para a query SQL.
      .query(query); // Executa a query no banco de dados.

    // Verifica se a consulta retornou algum cliente. Se não houver registros, retorna um erro 404.
    if (result.recordset.length === 0) {
      return response.status(404).json({ message: "Cliente não encontrado." }); // Status HTTP 404 - Not Found
    }

    // Se o cliente for encontrado, extrai o primeiro cliente do resultado da consulta.
    const cliente = result.recordset[0];

    // Retorna o cliente encontrado com status HTTP 200 (OK).
    response.status(200).json(cliente); // Status HTTP 200 - OK, retorna os dados do cliente no formato JSON.
  } catch (error) {
    // Se ocorrer um erro durante a execução da consulta, exibe a mensagem de erro no console.
    console.error("Erro ao buscar cliente:", error.message);

    // Retorna um erro genérico 500 (Internal Server Error) para o cliente.
    response.status(500).send("Erro ao buscar cliente"); // Status HTTP 500 - Internal Server Error
  }
}
async function fetchNotificacoesCliente(req, res) {
  const id_cliente = req.usuario.id_cliente;
  const query = ` select
  id_notificacao,
  CONVERT(varchar, data_criacao, 120)  as data,
  mensagem,
  status
  from Notificacaos where id_cliente = @id_cliente and Tipo = 'app'`;
  const request = new sql.Request();
  request.input("id_cliente", sql.Int, id_cliente);
  const result = await request.query(query);
  if (result.recordset.length === 0) {
    return res.status(404).json({ message: "Nenhuma Notificação Encontrada." });
  }
  let dadosNotificacoes = [];
  for (const notificacao of result.recordset) {
    dadosNotificacoes.push({
      id_notificacao: notificacao.id_notificacao,
      titulo: `Notificação App - ${notificacao.data}`,
      conteudo: notificacao.mensagem,
      data: notificacao.data,
      status: notificacao.status,
    });
  }
  res.status(200).json(dadosNotificacoes);
}
async function NotificacaoLida(req, res) {
  id_notificacao = req.body.id_notificacao;
  const query = `UPDATE Notificacaos SET status = 1 WHERE id_notificacao = @id_notificacao`;
  const request = new sql.Request();
  request.input("id_notificacao", sql.Int, id_notificacao);
  const result = await request.query(query);
  if (result.rowsAffected[0] > 0) {
    return res.status(200).json({ message: "Notificação lida com sucesso." });
  } else {
    return res.status(404).json({ message: "Notificação não encontrada." });
  }
}
module.exports = {
  listar, // A função 'listar' é exportada, provavelmente ela vai buscar ou listar dados.
  listaSimples, // A função 'listaSimples' é exportada, e como o nome sugere, deve retornar uma lista simples de dados.
  atualizar, // A função 'atualizar' é exportada, provavelmente ela realiza a atualização de dados existentes.
  deletar, // A função 'deletar' é exportada, provavelmente ela deleta ou remove registros do banco de dados.
  fetchdadosclient, // A função 'fetchdadosclient' é exportada, e ela provavelmente busca dados relacionados a um cliente.
  adicionar, // A função 'adicionar' é exportada, provavelmente ela adiciona um novo registro ao banco de dados.
  salvarMenus, // A função 'salvarMenus' é exportada, e pode ser usada para salvar menus no banco de dados ou em algum armazenamento.
  listarClienteComServicos, // A função 'listarClienteComServicos' é exportada, e deve listar clientes juntamente com seus serviços associados.
  listarComMenu, // A função 'listarComMenu' é exportada, e deve listar dados com informações de menus incluídas.
  listarComMenuPaginado, // A função 'listarComMenuPaginado' é exportada, e provavelmente retorna resultados paginados com menus.
  adicionarServico, // A função 'adicionarServico' é exportada, provavelmente é usada para adicionar serviços.
  atualizarServico, // A função 'atualizarServico' é exportada, provavelmente realiza a atualização de dados de um serviço.
  deletarServico, // A função 'deletarServico' é exportada, provavelmente deleta um serviço do banco de dados.
  fetchNotificacoesCliente, // A função 'fetchNotificacoesCliente' é exportada, e deve buscar notificações do cliente.
  NotificacaoLida, // A função 'NotificacaoLida' é exportada, e deve marcar uma notificação como lida.
};
