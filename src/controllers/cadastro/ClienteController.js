// Importa o módulo 'mssql', utilizado para interagir com o banco de dados SQL Server.
const sql = require("mssql");

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

  const menuOrderMaster = {
    Dashboard: { id_item: 1, icone: "pi pi-fw pi-chart-pie" },
    Relatórios: { id_item: 2, icone: "pi pi-fw pi-list" },
    Configurações: { id_item: 3, icone: "pi pi-fw pi-cog" },
    Importações: { id_item: 4, icone: "pi pi-fw pi-upload" },
    EndPoints: { id_item: 5, icone: "pi pi-fw pi-cloud" },
    Cadastros: { id_item: 6, icone: "pi pi-fw pi-user-plus" },
  };

  const menuOrderOperador = {
    Dashboard: { id_item: 1, icone: "pi pi-fw pi-chart-pie" },
    "Dispenser Machines": { id_item: 3, icone: "pi pi-fw pi-box" },
    Produtos: { id_item: 4, icone: "pi pi-fw pi-tags" },
    Relatórios: { id_item: 2, icone: "pi pi-fw pi-list" },
  };

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
  const { id_cliente, perfil, menus } = request.body;

  const referenciaCliente = 88;
  let transaction;

  try {
    console.log("Perfil recebido:", perfil);

    const menuOrder = getMenuOrderByProfile(perfil);
    console.log("Menu Order selecionado:", menuOrder);

    // Inicia a transação
    transaction = new sql.Transaction();
    await transaction.begin();
    console.log("Transação iniciada");

    // Inserir Dashboard
    if (menuOrder["Dashboard"]) {
      const dashboardOrder = menuOrder["Dashboard"];
      const existsDashboard = await verificarMenuExistente(
        transaction,
        id_cliente,
        "Dashboard"
      );

      if (!existsDashboard) {
        await inserirMenuPrincipal(transaction, id_cliente, perfil, "Dashboard", dashboardOrder);
        console.log("Dashboard inserido com sucesso!");
      } else {
        console.log("Dashboard já existe. Pulando inserção.");
      }
    } else {
      console.error("Erro: Menu 'Dashboard' não encontrado no menuOrder.");
      throw new Error('Menu "Dashboard" não encontrado no menuOrder.');
    }

    console.log("Preparando dados para inserção...");

    const bulkMenus = [];
    const bulkSubmenus = [];
    const submenuNames = []; // Lista para coletar os nomes de submenus e subsubmenus
    const subsubmenuMap = {}; // Mapeia submenus para seus subsubmenus

    // Preparar os dados para inserção
    for (let menu of menus) {
      const order = menuOrder[menu.name];
      if (!order) {
        console.log(`Menu ${menu.name} não encontrado para o perfil ${perfil}`);
        continue;
      }

      bulkMenus.push({
        ID_item: order.id_item,
        Cod_Cli: id_cliente,
        Nome: menu.name,
        Perfil: perfil,
        Icone: order.icone,
      });

      for (let submenu of menu.submenus) {
        submenuNames.push(submenu.name); // Adiciona o nome do submenu para consulta

        bulkSubmenus.push({
          ID_Item: order.id_item,
          Cod_Cli: id_cliente,
          Nome: submenu.name,
          Perfil: perfil,
          To: null, // Será preenchido posteriormente
          ID_Sub_Item: 0, // Preenchido posteriormente
        });

        if (submenu.subsubmenus) {
          // Adicionar subsubmenus ao mapa para processamento posterior
          subsubmenuMap[submenu.name] = submenu.subsubmenus;
          submenu.subsubmenus.forEach((subsubmenu) =>
            submenuNames.push(subsubmenu.name)
          );
        }
      }
    }

    console.log("Preparação dos dados concluída com sucesso!");

    // Inserir menus principais
    console.log("Inserindo menus principais...");
    await bulkInsert(transaction, "Menu", bulkMenus, 500);
    console.log(`✅ Inseridos ${bulkMenus.length} registros na tabela Menu`);

    // Obter os valores 'To' de todos os submenus e subsubmenus
    console.log("Buscando valores 'To' para todos os submenus e subsubmenus...");
    const submenuToValues = await getAllSubmenuToValues(transaction, submenuNames, referenciaCliente);

    // Atualizar os valores 'To' nos submenus
    bulkSubmenus.forEach((submenu) => {
      submenu.To = submenuToValues[submenu.Nome] || null; // Preenche o valor 'To'
    });

    // Inserir submenus
    console.log("Inserindo submenus...");
    await bulkInsert(transaction, "Menu_Itens", bulkSubmenus, 500);
    console.log(`✅ Inseridos ${bulkSubmenus.length} registros na tabela Menu_Itens (Submenus)`);

    // Obter os IDs dos submenus recém-inseridos
    console.log("Buscando IDs dos submenus para preparar os subsubmenus...");
    const submenuIdMap = {};
    for (let menu of menus) {
      const submenuIds = await getInsertedSubmenuIds(transaction, id_cliente, menuOrder[menu.name].id_item);
      Object.assign(submenuIdMap, submenuIds); // Adiciona os IDs ao mapa global
    }

    // Preparar os subsubmenus para inserção
    const bulkSubsubmenus = [];
    for (let [submenuName, subsubmenus] of Object.entries(subsubmenuMap)) {
      const submenuId = submenuIdMap[submenuName]; // Obter o ID do submenu pai
      if (!submenuId) {
        console.warn(`⚠️ ID do submenu '${submenuName}' não encontrado. Pulando subsubmenus.`);
        continue;
      }

      for (let subsubmenu of subsubmenus) {
        bulkSubsubmenus.push({
          ID_Item: submenuIdMap[subsubmenu.name] || 0, // ID do menu pai
          ID_Sub_Item: submenuId, // ID do submenu pai
          Cod_Cli: id_cliente,
          Nome: subsubmenu.name,
          Perfil: perfil,
          To: submenuToValues[subsubmenu.name] || null, // Preenche o valor 'To'
        });
      }
    }

    console.log("Subsubmenus preparados para inserção!");

    // Inserir subsubmenus
    console.log("Inserindo subsubmenus...");
    await bulkInsert(transaction, "Menu_Itens", bulkSubsubmenus, 500);
    console.log(`✅ Inseridos ${bulkSubsubmenus.length} registros na tabela Menu_Itens (Subsubmenus)`);

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
    WHERE Cod_Cli = @id_cliente AND Nome = @menu_name AND deleted = 0
  `);

  return result.recordset[0].count > 0;
}

/**
 * Realiza o bulk insert em uma tabela SQL.
 */
async function bulkInsert(transaction, tableName, data, batchSize = 500) {
  if (!data.length) return;

  const columns = Object.keys(data[0]).map((col) => `[${col}]`).join(", ");

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
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

    const sqlQuery = `INSERT INTO ${tableName} (${columns}) VALUES ${values}`;
    console.log(`Executando bulk insert na tabela ${tableName}, registros: ${batch.length}`);

    const request = new sql.Request(transaction);
    request.timeout = 60000; // 60 segundos de timeout
    try {
      await request.query(sqlQuery);
      console.log(`✅ Bulk insert concluído para a tabela ${tableName}, lote de ${batch.length} registros.`);
    } catch (err) {
      console.error(`❌ Erro ao executar bulk insert na tabela ${tableName}:`, err.message);
      throw err;
    }
  }
}

async function getInsertedSubmenuIds(transaction, id_cliente, menuId) {
  const query = `
    SELECT ID, Nome
    FROM Menu_Itens
    WHERE Cod_Cli = @id_cliente AND ID_Item = @menuId
  `;

  const request = new sql.Request(transaction);
  request.input("id_cliente", sql.Int, id_cliente);
  request.input("menuId", sql.Int, menuId);

  try {
    const result = await request.query(query);
    console.log(`✅ IDs dos submenus obtidos para ID_Item=${menuId}:`, result.recordset);
    return result.recordset.reduce((acc, row) => {
      acc[row.Nome] = row.ID;
      return acc;
    }, {});
  } catch (err) {
    console.error("❌ Erro ao buscar IDs dos submenus:", err.message);
    throw err;
  }
}
/**
 * Insere um item de menu principal no banco de dados.
 */
async function inserirMenuPrincipal(transaction, id_cliente, perfil, nome, order) {
  const sqlRequest = new sql.Request(transaction);
  sqlRequest
    .input("Cod_Cli", sql.Int, id_cliente)
    .input("Nome", sql.VarChar, nome)
    .input("Perfil", sql.Int, perfil)
    .input("Icone", sql.VarChar, order.icone)
    .input("ID_item", sql.Int, order.id_item);

  await sqlRequest.query(`
    INSERT INTO Menu (ID_item, Cod_Cli, Nome, Perfil, Icone)
    VALUES (@ID_item, @Cod_Cli, @Nome, @Perfil, @Icone)
  `);
}

async function getAllSubmenuToValues(transaction, submenuNames, referenciaCliente) {
  if (!submenuNames.length) return {};

  const query = `
    SELECT Nome, [to]
    FROM Menu_Itens
    WHERE Nome IN (${submenuNames.map((name) => `'${name.replace(/'/g, "''")}'`).join(", ")})
      AND Cod_Cli = @referenciaCliente
  `;

  const request = new sql.Request(transaction);
  request.input("referenciaCliente", sql.Int, referenciaCliente);

  try {
    const result = await request.query(query);
    console.log(`✅ Valores 'To' obtidos:`, result.recordset);

    // Retorna um mapa Nome -> To
    return result.recordset.reduce((acc, row) => {
      acc[row.Nome] = row.to || null;
      return acc;
    }, {});
  } catch (err) {
    console.error("❌ Erro ao buscar valores 'To':", err.message);
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
        clientes.*
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
        WHERE Cod_cli = @id_cliente
      `;

      // Consulta para recuperar os itens de menu do cliente
      const queryMenuItem = `
        SELECT * 
        FROM menu_itens
        WHERE Cod_cli = @id_cliente
      `;

      // Prepara a requisição SQL
      const requestSql = new sql.Request();
      requestSql.input("id_cliente", sql.Int, id_cliente);

      // Executa as consultas para obter os menus e itens
      const menuResult = await requestSql.query(queryMenu);
      const menuItemResult = await requestSql.query(queryMenuItem);

      const menus = menuResult.recordset;
      const menuItens = menuItemResult.recordset;

      // Constrói a árvore de menus para o cliente atual
      const menuTree =
        menus.length > 0 || menuItens.length > 0
          ? buildMenuTree(menus, menuItens)
          : [];
      menuTree.forEach(cleanItems);

      // Adiciona o cliente e seus menus à lista
      clientesComMenu.push({
        ...cliente,
        menus: menuTree,
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
      items: [],  // Inicializa uma lista vazia de itens de menu
    };
  });

  // Popula o itemMap com os itens do menu
  menuItems.forEach((item) => {
    itemMap[item.ID] = {
      label: item.Nome,
      icon: item.Icone || null,
      to: item.to || null,
      items: [],  // Inicializa uma lista vazia de sub-itens
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
    const query = "SELECT * FROM clientes WHERE deleted = 0";
    
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
    const query = "SELECT id_cliente,nome FROM clientes WHERE deleted = 0";
    
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
    const id_cliente = request.body.id_cliente;  // ID do cliente a ser listado
    const userRole = request.roles;  // Função ou papéis do usuário para determinar as permissões de consulta
    
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
  const { nome, cpfcnpj, ativo, usar_api, id_usuario } = request.body;  // Dados do cliente
  const apiKey = generateApiKey();  // Geração da chave de API

  const queryCliente = `
        INSERT INTO clientes 
        (id_cliente, nome, cpfcnpj, ativo, deleted, created, updated, last_login, usar_api, atualizado)
        VALUES (@id_cliente, @nome, @cpfcnpj, @ativo, @deleted, @created, @updated, @last_login, @usar_api, @atualizado)
    `;

  const queryApiKey = `
        INSERT INTO API_KEY (id_cliente, api_key, Nome_cliente)
        VALUES (@id_cliente, @api_key, @nome_cliente)
    `;

  const transaction = new sql.Transaction();  // Inicia uma transação
  try {
    await transaction.begin();  // Começa a transação

    // Instancia um novo sql.Request para a primeira query
    let sqlRequest = new sql.Request(transaction);

    // Recupera o maior valor de id_cliente na tabela
    const resultId = await sqlRequest.query(
      `SELECT ISNULL(MAX(id_cliente), 0) AS lastId FROM clientes`
    );
    const lastId = resultId.recordset[0].lastId;
    const newIdCliente = lastId + 1;

    // Prepara as variáveis para a query de inserção de cliente
    sqlRequest.input("id_cliente", sql.Int, newIdCliente);
    sqlRequest.input("nome", sql.VarChar, nome);
    sqlRequest.input("cpfcnpj", sql.VarChar, cpfcnpj);
    sqlRequest.input("ativo", sql.Bit, ativo);
    sqlRequest.input("deleted", sql.Bit, false);
    sqlRequest.input("created", sql.DateTime, new Date());
    sqlRequest.input("updated", sql.DateTime, new Date());
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

    // Commit da transação
    await transaction.commit();

    response.status(201).send("Cliente criado com sucesso e API Key gerada!");  // Retorna sucesso
  } catch (error) {
    await transaction.rollback();  // Em caso de erro, reverte a transação
    console.error("Erro ao inserir o usuário:", error.message);
    response.status(500).send("Erro ao inserir o usuário");  // Retorna erro
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
  const { id_cliente, servicos } = request.body;  // Dados do cliente e os serviços a serem adicionados
  try {
    let transaction = new sql.Transaction();
    await transaction.begin();  // Inicia a transação
    for (const servico of servicos) {
      // Para cada serviço, itera pelos destinatários e insere o serviço
      for (const destinatario of servico.destinatarios) {
        await inserirNovoServico(
          transaction,
          id_cliente,
          servico,
          destinatario
        );
      }
    }
    await transaction.commit();  // Commit da transação se tudo estiver bem
    response.status(200).json({ message: "Serviços adicionados com sucesso" });  // Resposta de sucesso
  } catch (error) {
    console.error("Erro ao salvar configurações", error);
    if (transaction) {
      await transaction.rollback();  // Rollback em caso de erro
    }
    response.status(500).json({ message: "Erro ao salvar configurações" });  // Resposta de erro
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
  const { id_cliente, servicos } = request.body;  // Dados do cliente e serviços a serem atualizados
  let transaction;

  try {
    transaction = new sql.Transaction();
    await transaction.begin();  // Inicia a transação

    // Recupera os serviços existentes para o cliente
    const existingServices = await buscarServicosExistentes(
      transaction,
      id_cliente
    );

    // Marca serviços deletados com base na diferença entre serviços existentes e novos
    await marcarServicosDeletados(
      transaction,
      id_cliente,
      existingServices,
      servicos
    );

    // Para cada serviço e destinatário, verifica se já existe e realiza a ação adequada
    for (const servico of servicos) {
      for (const destinatario of servico.destinatarios) {
        const serviceExists = await verificarServicoExistente(
          transaction,
          id_cliente,
          servico.id_servico,
          destinatario
        );
        if (serviceExists) {
          const { deleted } = serviceExists;
          if (deleted) {
            await reativarServico(
              transaction,
              id_cliente,
              servico,
              destinatario
            );  // Reativa o serviço se estiver deletado
          } else {
            await atualizarServicoExistente(
              transaction,
              id_cliente,
              servico,
              destinatario
            );  // Atualiza o serviço existente
          }
        } else {
          await inserirNovoServico(
            transaction,
            id_cliente,
            servico,
            destinatario
          );  // Insere um novo serviço se não existir
        }
      }
    }

    await transaction.commit();  // Commit da transação
    response.status(200).json({ message: "Serviços atualizados com sucesso" });  // Resposta de sucesso
  } catch (error) {
    console.error("Erro ao atualizar serviços:", error);
    if (transaction) {
      await transaction.rollback();  // Rollback em caso de erro
    }
    response.status(500).json({ message: "Erro ao atualizar serviços" });  // Resposta de erro
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
  const sqlRequest = new sql.Request(transaction);
  sqlRequest.input("id_cliente", sql.Int, id_cliente);

  const result = await sqlRequest.query(`
        SELECT id_servico, id_funcionario_responsavel 
        FROM Notificacoes_Servicos 
        WHERE id_cliente = @id_cliente AND deleted = 0
    `);

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
    const found = servicos.some(
      (servico) =>
        servico.id_servico === existing.id_servico &&
        servico.destinatarios.includes(existing.id_funcionario_responsavel)
    );

    if (!found) {
      const sqlRequest = new sql.Request(transaction);
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
  id_funcionario_responsavel
) {
  const sqlRequest = new sql.Request(transaction);
  sqlRequest.input("id_cliente", sql.Int, id_cliente);
  sqlRequest.input("id_servico", sql.Int, id_servico);
  sqlRequest.input(
    "id_funcionario_responsavel",
    sql.Int,
    id_funcionario_responsavel
  );

  const result = await sqlRequest.query(`
        SELECT deleted 
        FROM Notificacoes_Servicos 
        WHERE id_cliente = @id_cliente 
        AND id_servico = @id_servico 
        AND id_funcionario_responsavel = @id_funcionario_responsavel
    `);

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
  const sqlRequest = new sql.Request(transaction);
  sqlRequest.input("frequencia", sql.VarChar, servico.frequencia_notificacao);
  sqlRequest.input(
    "tipo_notificacao",
    sql.VarChar,
    servico.metodos_notificacao.join(", ")
  );
  sqlRequest.input("hora_notificacao", sql.VarChar, servico.horario_notificacao);
  sqlRequest.input("id_cliente", sql.Int, id_cliente);
  sqlRequest.input("id_servico", sql.Int, servico.id_servico);
  sqlRequest.input("id_funcionario_responsavel", sql.Int, destinatario);

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
  const horaNotificacao = validarHoraNotificacao(servico.horario_notificacao);
  sqlRequest.input("frequencia", sql.VarChar, servico.frequencia_notificacao);
  sqlRequest.input(
    "tipo_notificacao",
    sql.VarChar,
    servico.metodos_notificacao.join(", ")
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
    servico.metodos_notificacao.join(", ")
  );
  sqlRequest.input("hora_notificacao", sql.VarChar, servico.horario_notificacao);
  sqlRequest.input("id_cliente", sql.Int, id_cliente);
  sqlRequest.input("id_servico", sql.Int, servico.id_servico);
  sqlRequest.input("id_funcionario_responsavel", sql.Int, destinatario);
  sqlRequest.input("deleted", sql.Bit, 0);

  await sqlRequest.query(`
        INSERT INTO Notificacoes_Servicos 
        (nome, id_cliente, frequencia, tipo_notificacao, id_funcionario_responsavel, hora_notificacao, id_servico, deleted)
        VALUES (@nome, @id_cliente, @frequencia, @tipo_notificacao, @id_funcionario_responsavel, @hora_notificacao, @id_servico, @deleted)
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
  const { id_cliente, nome, cpfcnpj, ativo, usarapi, id_usuario } =
    request.body;
  const params = {
    nome: nome,
    cpfcnpj: cpfcnpj,
    ativo: convertToBoolean(ativo),
    updated: new Date(),
    usar_api: convertToBoolean(usarapi),
    atualizado: true,
    id_cliente: id_cliente,
  };
  const query = `
    UPDATE clientes
    SET 
        nome = @nome,
        cpfcnpj = @cpfcnpj,
        ativo = @ativo,
        updated = @updated,
        usar_api = @usar_api,
        atualizado = @atualizado
    WHERE id_cliente = @id_cliente`;
  try {
    const sqlRequest = new sql.Request();
    sqlRequest.input("id_cliente", sql.Int, id_cliente);
    sqlRequest.input("nome", sql.VarChar, nome);
    sqlRequest.input("cpfcnpj", sql.VarChar, cpfcnpj);
    sqlRequest.input("ativo", sql.Bit, ativo);
    sqlRequest.input("updated", sql.DateTime, new Date());
    sqlRequest.input("usar_api", sql.Bit, usarapi);
    sqlRequest.input("atualizado", sql.Bit, true);
    const result = await sqlRequest.query(query);
    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      logQuery(
        "info",
        `O usuário ${id_usuario} atualizou o cliente:${id_cliente}`,
        "sucesso",
        "UPDATE",
        id_cliente,
        id_usuario,
        query,
        params
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

/**
 * Função para deletar (marcar como excluído) um cliente.
 * 
 * @param {Object} request - O objeto da requisição, contendo o ID do cliente a ser excluído.
 * @param {Object} response - O objeto da resposta, usado para enviar a resposta ao cliente.
 * 
 * @returns {void} Retorna uma resposta HTTP indicando o sucesso ou falha na exclusão do cliente.
 */
async function deletar(request, response) {
  const { id_cliente, id_usuario } = request.body;
  const query =
    "UPDATE clientes SET deleted = 1 WHERE id_cliente = @id_cliente";
  const params = {
    id_cliente: id_cliente,
  };
  try {
    if (!id_cliente) {
      return response
        .status(400)
        .json({ error: "ID do cliente não foi enviado" });
    }

    const sqlRequest = new sql.Request();
    sqlRequest.input("id_cliente", sql.Int, id_cliente);

    const result = await sqlRequest.query(query);

    if (result.rowsAffected[0] > 0) {

      response.status(200).json({ message: "cliente excluído com sucesso" });
    } else {
      logQuery(
        "error",
        `O usuário ${id_usuario} falhou em deletar o cliente ${id_cliente}`,
        "erro",
        "DELETE",
        id_cliente,
        id_usuario,
        query,
        params
      );
      response.status(404).json({ error: "cliente não encontrado" });
    }
  } catch (error) {
    logQuery(
      "error",
      error.message,
      "erro",
      "DELETE",
      id_cliente,
      id_usuario,
      query,
      params
    );
    console.error("Erro ao excluir:", error.message);
    response.status(500).send("Erro ao excluir");
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

/**
 * Função para mapear um registro de serviço.
 * 
 * @param {Object} row - O registro de serviço retornado do banco de dados.
 * 
 * @returns {Object} Retorna um objeto representando o serviço e suas notificações.
 */
function mapServico(row) {
  return {
    id_servico: row.id_servico,
    nome: row.servico_nome,
    notificacoes: [mapNotificacao(row)],
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
  return {
    nome: row.nome,
    frequencia: row.frequencia,
    tipo_notificacao: row.tipo_notificacao,
    id_funcionario_responsavel: row.id_funcionario_responsavel,
    hora_notificacao: row.hora_notificacao,
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
    return response
      .status(400)
      .json({
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

module.exports = {
  listar,
  listaSimples,
  atualizar,
  deletar,
  adicionar,
  salvarMenus,
  listarClienteComServicos,
  listarComMenu,
  listarComMenuPaginado,
  adicionarServico,
  atualizarServico,
  deletarServico,
};
