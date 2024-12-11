const sql = require("mssql");
const { logQuery } = require("../../utils/logUtils");
const crypto = require("crypto");
const convertToBoolean = (value) => {
  return value === "true";
};
function generateApiKey() {
  return crypto.randomBytes(32).toString("hex");
}
function getMenuOrderByProfile(perfil) {
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
async function inserirMenuPrincipal(
  transaction,
  id_cliente,
  perfil,
  nome,
  order
) {
  let sqlRequest = new sql.Request(transaction);
  sqlRequest
    .input("Cod_Cli", sql.Int, id_cliente)
    .input("Nome", sql.VarChar, nome)
    .input("Perfil", sql.Int, perfil)
    .input("Icone", sql.VarChar, order.icone)
    .input("ID_item", sql.Int, order.id_item);

  console.log(`Inserindo menu: ${nome}`);
  await sqlRequest.query(`
        INSERT INTO Menu (ID_item, Cod_Cli, Nome, Perfil, Icone)
        VALUES (@ID_item, @Cod_Cli, @Nome, @Perfil, @Icone)
    `);
  console.log(`Menu ${nome} inserido com sucesso`);
}
// Função para inserir o submenu
async function inserirSubmenu(
  transaction,
  id_cliente,
  perfil,
  id_item,
  submenu,
  referenciaCliente
) {
  let sqlRequest = new sql.Request(transaction);
  let submenuTo = null;

  if (!submenu.subsubmenus || submenu.subsubmenus.length === 0) {
    const result = await sqlRequest.query(`
            SELECT [to] FROM Menu_Itens WHERE Nome = '${submenu.name}' AND Cod_Cli = ${referenciaCliente}
        `);
    submenuTo = result.recordset[0]?.to || "";
  }

  sqlRequest
    .input("ID_Item", sql.Int, id_item)
    .input("Cod_Cli", sql.Int, id_cliente)
    .input("Nome", sql.VarChar, submenu.name)
    .input("Perfil", sql.Int, perfil)
    .input("to", sql.VarChar, submenuTo);

  console.log(`Inserindo submenu: ${submenu.name}`);

  if (submenu.subsubmenus && submenu.subsubmenus.length > 0) {
    const resultSubmenu = await sqlRequest.query(`
            INSERT INTO Menu_Itens (ID_Item, Cod_Cli, Nome, Perfil, [to], ID_Sub_Item)
            OUTPUT INSERTED.ID
            VALUES (@ID_Item, @Cod_Cli, @Nome, @Perfil, NULL, 0)
        `);
    const submenuId = resultSubmenu.recordset[0].ID;
    console.log(
      `Submenu ${submenu.name} inserido com ID_Sub_Item: ${submenuId}`
    );
    return submenuId;
  } else {
    await sqlRequest.query(`
            INSERT INTO Menu_Itens (ID_Item, ID_Sub_Item, Cod_Cli, Nome, Perfil, [to])
            VALUES (@ID_Item, 0, @Cod_Cli, @Nome, @Perfil, @to)
        `);
    console.log(`Submenu ${submenu.name} inserido com ID_Sub_Item 0`);
    return 0;
  }
}
// Função para inserir o subsubmenu
async function inserirSubsubmenu(
  transaction,
  id_cliente,
  perfil,
  id_item,
  id_sub_item,
  subsubmenu,
  referenciaCliente
) {
  let sqlRequest = new sql.Request(transaction);
  const result = await sqlRequest.query(`
        SELECT [to] FROM Menu_Itens WHERE Nome = '${subsubmenu.name}' AND Cod_Cli = ${referenciaCliente}
    `);
  const subsubmenuTo = result.recordset[0]?.to || "";

  console.log(`Inserindo subsubmenu: ${subsubmenu.name}`);
  sqlRequest
    .input("ID_Item", sql.Int, id_item)
    .input("ID_Sub_Item", sql.Int, id_sub_item)
    .input("Cod_Cli", sql.Int, id_cliente)
    .input("Nome", sql.VarChar, subsubmenu.name)
    .input("Perfil", sql.Int, perfil)
    .input("to", sql.VarChar, subsubmenuTo);

  await sqlRequest.query(`
        INSERT INTO Menu_Itens (ID_Item, ID_Sub_Item, Cod_Cli, Nome, Perfil, [to])
        VALUES (@ID_Item, @ID_Sub_Item, @Cod_Cli, @Nome, @Perfil, @to)
    `);
  console.log(`Subsubmenu ${subsubmenu.name} inserido com sucesso`);
}

async function salvarMenus(request, response) {
  const { id_cliente, perfil, menus, id_usuario } = request.body; // Certifique-se de que `id_usuario` é passado no body
  const referenciaCliente = 57;  // Defina sua referência de cliente corretamente
  let transaction;
  
  try {
    console.log("Perfil recebido:", perfil);
    const menuOrder = getMenuOrderByProfile(perfil); // Obter o menuOrder com base no perfil
    console.log("Menu Order selecionado:", menuOrder);

    transaction = new sql.Transaction();
    await transaction.begin();
    console.log("Transação iniciada");

    if (!menuOrder["Dashboard"]) {
      throw new Error(
        'Menu "Dashboard" não encontrado no menuOrder para o perfil especificado'
      );
    }

    await inserirMenuPrincipal(
      transaction,
      id_cliente,
      perfil,
      "Dashboard",
      menuOrder["Dashboard"]
    );

    // Consultar os menus existentes do cliente no banco de dados
    const queryMenusExistentes = `
      SELECT * FROM Menu m WHERE Cod_cli = @id_cliente AND deleted = 0
    `;
    const requestSql = new sql.Request();
    requestSql.input("id_cliente", sql.Int, id_cliente);
    
    // Esperar a execução da query para garantir que 'resultMenusExistentes' seja preenchido
    const resultMenusExistentes = await requestSql.query(queryMenusExistentes);

    // Verificar se 'resultMenusExistentes.recordset' existe e tem dados
    const menusExistentes = resultMenusExistentes.recordset || [];

    // Loop sobre os menus e verificar se houve mudanças
    for (let menu of menus) {
      const order = menuOrder[menu.name];
      if (!order) {
        console.log(`Menu ${menu.name} não encontrado no menuOrder para o perfil ${perfil}`);
        continue;
      }

      // Verifique se o menu já existe no banco de dados, se não, insira
      const menuExistente = menusExistentes.find(existingMenu => existingMenu.Nome === menu.name);

      if (menuExistente) {
        // O menu existe, então marque o menu existente como "não deletado" e mantenha-o
        await atualizarMenuExistente(transaction, id_cliente, perfil, menu.name, order);
        
        // Verificar se houve alterações nos submenus
        for (let submenu of menu.submenus) {
          const submenuExistente = await verificarSubmenuExistente(id_cliente, menuExistente.ID_item, submenu.name);
          
          if (!submenuExistente) {
            // Inserir submenu
            const submenuId = await inserirSubmenu(
              transaction,
              id_cliente,
              perfil,
              menuExistente.ID_item,
              submenu,
              referenciaCliente
            );
            
            // Inserir subsubmenus se houver
            if (submenuId > 0 && submenu.subsubmenus) {
              for (let subsubmenu of submenu.subsubmenus) {
                await inserirSubsubmenu(
                  transaction,
                  id_cliente,
                  perfil,
                  menuExistente.ID_item,
                  submenuId,
                  subsubmenu,
                  referenciaCliente
                );
              }
            }
          } else {
            // Marcar o submenu existente como "não deletado"
            await atualizarSubmenuExistente(transaction, submenuExistente.ID_submenu);
          }
        }
      } else {
        // Inserir novo menu principal
        await inserirMenuPrincipal(
          transaction,
          id_cliente,
          perfil,
          menu.name,
          order
        );

        // Inserir submenus e subsubmenus
        for (let submenu of menu.submenus) {
          const submenuId = await inserirSubmenu(
            transaction,
            id_cliente,
            perfil,
            order.id_item,
            submenu,
            referenciaCliente
          );

          if (submenuId > 0 && submenu.subsubmenus) {
            for (let subsubmenu of submenu.subsubmenus) {
              await inserirSubsubmenu(
                transaction,
                id_cliente,
                perfil,
                order.id_item,
                submenuId,
                subsubmenu,
                referenciaCliente
              );
            }
          }
        }
      }
    }

    // Marcar como deletado os menus e submenus que não existem mais
    await marcarMenusDeletados(transaction, id_cliente, menus);

    await transaction.commit();
    console.log("Transação concluída com sucesso");
    response.status(200).send("Menus salvos com sucesso!");
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Erro ao salvar menus:", error.message);
    response.status(500).send("Erro ao salvar menus");
  }
}

async function marcarMenusDeletados(transaction, id_cliente, menus) {
  //Marcar como deletado os menus que não existem mais
  const queryDeleteMenus = `
    UPDATE Menu
    SET deleted = 1
    WHERE Cod_cli = @id_cliente
    AND Nome NOT IN (@menus)
  `;

  // Aqui você pode passar os menus válidos (os que estão sendo enviados) para evitar a exclusão dos menus ainda presentes
  const menuNames = menus.map(menu => menu.name);
  
  const requestSql = new sql.Request();
  requestSql.input("id_cliente", sql.Int, id_cliente);
  requestSql.input("menus", sql.NVarChar, menuNames.join(','));

  await requestSql.query(queryDeleteMenus);
}

async function verificarSubmenuExistente(id_cliente, menuId, submenuName) {
  const querySubmenuExistente = `
    SELECT * FROM Submenu
    WHERE Cod_cli = @id_cliente AND ID_Menu = @menuId AND Nome = @submenuName
  `;
  
  const requestSql = new sql.Request();
  requestSql.input("id_cliente", sql.Int, id_cliente);
  requestSql.input("menuId", sql.Int, menuId);
  requestSql.input("submenuName", sql.NVarChar, submenuName);
  
  const resultSubmenu = await requestSql.query(querySubmenuExistente);
  
  return resultSubmenu.recordset.length > 0 ? resultSubmenu.recordset[0] : null;
}

async function atualizarMenuExistente(transaction, id_cliente, perfil, menuName, menuOrder) {
  // Atualize o menu principal, se necessário
  const queryUpdateMenu = `
    UPDATE Menu
    SET deleted = 0, order = @order
    WHERE Cod_cli = @id_cliente AND Nome = @menuName
  `;
  
  const requestSql = new sql.Request();
  requestSql.input("id_cliente", sql.Int, id_cliente);
  requestSql.input("menuName", sql.NVarChar, menuName);
  requestSql.input("order", sql.Int, menuOrder);
  
  await requestSql.query(queryUpdateMenu);
}

async function atualizarSubmenuExistente(transaction, submenuId) {
  // Atualize o submenu, se necessário
  const queryUpdateSubmenu = `
    UPDATE Submenu
    SET deleted = 0
    WHERE ID_submenu = @submenuId
  `;
  
  const requestSql = new sql.Request();
  requestSql.input("submenuId", sql.Int, submenuId);
  
  await requestSql.query(queryUpdateSubmenu);
}

async function listarComMenu(request, response) {
  try {
    const queryClientes = `
            SELECT *
            FROM clientes
            WHERE deleted = 0`;

    const resultClientes = await new sql.Request().query(queryClientes);
    const clientes = resultClientes.recordset;

    // Array para armazenar os clientes com seus menus
    const clientesComMenu = [];

    for (const cliente of clientes) {
      const id_cliente = cliente.id_cliente;

      // Consulta para os menus principais deste cliente
      const queryMenu = `
                SELECT * FROM Menu
                WHERE Cod_cli = @id_cliente`;

      // Consulta para os itens de menu deste cliente
      const queryMenuItem = `
                SELECT * FROM menu_itens
                WHERE Cod_cli = @id_cliente`;

      const requestSql = new sql.Request();
      requestSql.input("id_cliente", sql.Int, id_cliente);

      const MenuR = await requestSql.query(queryMenu);
      const Menu = MenuR.recordset;

      const MenuItemR = await requestSql.query(queryMenuItem);
      const MenuItem = MenuItemR.recordset;

      // Construir a árvore de menus (ou vazio se não houver menus/itens)
      const menuTree =
        Menu.length > 0 || MenuItem.length > 0
          ? buildMenuTree(Menu, MenuItem)
          : [];
      menuTree.forEach(cleanItems);

      // Adicionar a árvore de menus ao cliente
      clientesComMenu.push({
        ...cliente,
        menus: menuTree,
      });
    }

    // Retornar os clientes com seus menus
    response.status(200).json(clientesComMenu);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}
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
      items: [],
    };
  });

  // Popula o itemMap com os itens do menu
  menuItems.forEach((item) => {
    itemMap[item.ID] = {
      label: item.Nome,
      icon: item.Icone || null,
      to: item.to || null,
      items: [],
    };
  });

  // Adiciona os itens aos seus menus ou sub-itens correspondentes
  menuItems.forEach((item) => {
    if (item.ID_Sub_Item && item.ID_Sub_Item !== 0) {
      if (itemMap[item.ID_Sub_Item]) {
        itemMap[item.ID_Sub_Item].items.push(itemMap[item.ID]);
      }
    } else {
      if (menuMap[item.ID_Item]) {
        menuMap[item.ID_Item].items.push(itemMap[item.ID]);
      }
    }
  });

  // Converte o menuMap em um array de menus
  const menuTree = Object.values(menuMap);

  return menuTree;
}

function cleanItems(menu) {
  if (menu.items) {
    if (menu.items.length === 0) {
      delete menu.items;
    } else {
      menu.items.forEach(cleanItems);
    }
  }
}

async function listar(request, response) {
  try {
    const query = "SELECT * FROM clientes WHERE deleted = 0";
    const result = await new sql.Request().query(query);
    response.status(200).json(result.recordset);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

async function listaSimples(request, response) {
  try {
    const query = "SELECT id_cliente,nome FROM clientes WHERE deleted = 0";
    const result = await new sql.Request().query(query);
    response.status(200).json(result.recordset);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

async function listarClienteComServicos(request, response) {
  try {
    let query;
    const id_cliente = request.body.id_cliente;
    const userRole = request.roles;
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
    // const result = await new sql.Request().query(query);
    const result = await new sql.Request()
      .input("id_cliente", sql.Int, id_cliente)
      .query(query);
    //console.log(result.recordset)
    const clientesComServicos = mapClientesComServicos(result.recordset);

    response.status(200).json(clientesComServicos);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

async function adicionar(request, response) {
  const { nome, cpfcnpj, ativo, usar_api, id_usuario } = request.body;
  const apiKey = generateApiKey();

  const queryCliente = `
        INSERT INTO clientes 
        (id_cliente, nome, cpfcnpj, ativo, deleted, created, updated, last_login, usar_api, atualizado)
        VALUES (@id_cliente, @nome, @cpfcnpj, @ativo, @deleted, @created, @updated, @last_login, @usar_api, @atualizado)
    `;

  const queryApiKey = `
        INSERT INTO API_KEY (id_cliente, api_key, Nome_cliente)
        VALUES (@id_cliente, @api_key, @nome_cliente)
    `;

  const transaction = new sql.Transaction();
  try {
    await transaction.begin();

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

    response.status(201).send("Cliente criado com sucesso e API Key gerada!");
  } catch (error) {
    await transaction.rollback(); // Em caso de erro, reverte a transação
    console.error("Erro ao inserir o usuário:", error.message);
    response.status(500).send("Erro ao inserir o usuário");
  }
}

async function adicionarServico(request, response) {
  const { id_cliente, servicos } = request.body;
  try {
    let transaction = new sql.Transaction();
    await transaction.begin();
    for (const servico of servicos) {
      for (const destinatario of servico.destinatarios) {
        await inserirNovoServico(
          transaction,
          id_cliente,
          servico,
          destinatario
        );
      }
    }
    await transaction.commit();
    response.status(200).json({ message: "Serviços adicionados com sucesso" });
  } catch (error) {
    console.error("Erro ao salvar configurações", error);
    if (transaction) {
      await transaction.rollback();
    }
    response.status(500).json({ message: "Erro ao salvar configurações" });
  }
}

async function atualizarServico(request, response) {
  const { id_cliente, servicos } = request.body;
  let transaction;

  try {
    transaction = new sql.Transaction();
    await transaction.begin();

    const existingServices = await buscarServicosExistentes(
      transaction,
      id_cliente
    );

    await marcarServicosDeletados(
      transaction,
      id_cliente,
      existingServices,
      servicos
    );

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
            );
          } else {
            await atualizarServicoExistente(
              transaction,
              id_cliente,
              servico,
              destinatario
            );
          }
        } else {
          await inserirNovoServico(
            transaction,
            id_cliente,
            servico,
            destinatario
          );
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
  // console.log("resultado do verifica Serviço :",result.recordset)
  return result.recordset.length > 0 ? result.recordset[0] : null;
}

async function reativarServico(transaction, id_cliente, servico, destinatario) {
  const sqlRequest = new sql.Request(transaction);
  sqlRequest.input("frequencia", sql.VarChar, servico.frequencia_notificacao);
  sqlRequest.input(
    "tipo_notificacao",
    sql.VarChar,
    servico.metodos_notificacao.join(", ")
  );
  sqlRequest.input("hora_notificacao", sql.Time, servico.horario_notificacao);
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
  //validarHoraNotificacao(servico.horario_notificacao)
  console.log(horaNotificacao);
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
  sqlRequest.input("hora_notificacao", sql.Time, servico.horario_notificacao);
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
    request = new sql.Request();
    request.input("id_cliente", sql.Int, id_cliente);
    request.input("nome", sql.VarChar, nome);
    request.input("cpfcnpj", sql.VarChar, cpfcnpj);
    request.input("ativo", sql.Bit, ativo);
    request.input("updated", sql.DateTime, new Date());
    request.input("usar_api", sql.Bit, usarapi);
    request.input("atualizado", sql.Bit, true);
    const result = await request.query(query);
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
      logQuery(
        "info",
        `O usuário ${id_usuario} deletou o cliente ${id_cliente}`,
        "sucesso",
        "DELETE",
        id_cliente,
        id_usuario,
        query,
        params
      );
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

function mapServico(row) {
  return {
    id_servico: row.id_servico,
    nome: row.servico_nome,
    notificacoes: [mapNotificacao(row)],
  };
}

function mapNotificacao(row) {
  return {
    nome: row.nome,
    frequencia: row.frequencia,
    tipo_notificacao: row.tipo_notificacao,
    id_funcionario_responsavel: row.id_funcionario_responsavel,
    hora_notificacao: row.hora_notificacao,
  };
}

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

    //tentar deletar
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
  adicionarServico,
  atualizarServico,
  deletarServico,
};
