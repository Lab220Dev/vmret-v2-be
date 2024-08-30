const sql = require('mssql');
const { logQuery } = require('../../utils/logUtils');
const crypto = require('crypto');
const convertToBoolean = (value) => {
    return value === 'true';
};
function generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
}
function getMenuOrderByProfile(perfil) {
    const menuOrderMaster = {
        'Dashboard': { id_item: 1, icone: 'pi pi-fw pi-chart-pie' },
        'Relatórios': { id_item: 2, icone: 'pi pi-fw pi-list' },
        'Configurações': { id_item: 3, icone: 'pi pi-fw pi-cog' },
        'Importações': { id_item: 4, icone: 'pi pi-fw pi-upload' },
        'EndPoints': { id_item: 5, icone: 'pi pi-fw pi-cloud' },
        'Cadastros': { id_item: 6, icone: 'pi pi-fw pi-user-plus' }
    };

    const menuOrderOperador = {
        'Dashboard': { id_item: 1, icone: 'pi pi-fw pi-chart-pie' },
        'Dispenser Machines': { id_item: 3, icone: 'pi pi-fw pi-box' },
        'Produtos': { id_item: 4, icone: 'pi pi-fw pi-tags' },
        'Relatórios': { id_item: 2, icone: 'pi pi-fw pi-list' }
    };

    const menuOrderAvulso = {
        'Dashboard': { id_item: 1, icone: 'pi pi-fw pi-chart-pie' },
        'Liberação Avulsa': { id_item: 2, icone: 'pi pi-fw pi-key' },
        'Consulta Status de Liberação Avulsa': { id_item: 3, icone: 'pi pi-fw pi-search' }
    };

    switch (perfil) {
        case 1: // Master
            return menuOrderMaster;
        case 3: // Operador
            return menuOrderOperador;
        case 4: // Avulso
            return menuOrderAvulso;
        default:
            throw new Error('Perfil não reconhecido');
    }
}
async function inserirMenuPrincipal(transaction, id_cliente, perfil, nome, order) {
    let sqlRequest = new sql.Request(transaction);
    sqlRequest.input('Cod_Cli', sql.Int, id_cliente)
        .input('Nome', sql.VarChar, nome)
        .input('Perfil', sql.Int, perfil)
        .input('Icone', sql.VarChar, order.icone)
        .input('ID_item', sql.Int, order.id_item);

    console.log(`Inserindo menu: ${nome}`);
    await sqlRequest.query(`
        INSERT INTO Menu (ID_item, Cod_Cli, Nome, Perfil, Icone)
        VALUES (@ID_item, @Cod_Cli, @Nome, @Perfil, @Icone)
    `);
    console.log(`Menu ${nome} inserido com sucesso`);
}

// Função para inserir o submenu
async function inserirSubmenu(transaction, id_cliente, perfil, id_item, submenu, referenciaCliente) {
    let sqlRequest = new sql.Request(transaction);
    let submenuTo = null;

    if (!submenu.subsubmenus || submenu.subsubmenus.length === 0) {
        const result = await sqlRequest.query(`
            SELECT [to] FROM Menu_Itens WHERE Nome = '${submenu.name}' AND Cod_Cli = ${referenciaCliente}
        `);
        submenuTo = result.recordset[0]?.to || '';
    }

    sqlRequest.input('ID_Item', sql.Int, id_item)
        .input('Cod_Cli', sql.Int, id_cliente)
        .input('Nome', sql.VarChar, submenu.name)
        .input('Perfil', sql.Int, perfil)
        .input('to', sql.VarChar, submenuTo);

    console.log(`Inserindo submenu: ${submenu.name}`);

    if (submenu.subsubmenus && submenu.subsubmenus.length > 0) {
        const resultSubmenu = await sqlRequest.query(`
            INSERT INTO Menu_Itens (ID_Item, Cod_Cli, Nome, Perfil, [to], ID_Sub_Item)
            OUTPUT INSERTED.ID
            VALUES (@ID_Item, @Cod_Cli, @Nome, @Perfil, NULL, 0)
        `);
        const submenuId = resultSubmenu.recordset[0].ID;
        console.log(`Submenu ${submenu.name} inserido com ID_Sub_Item: ${submenuId}`);
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
async function inserirSubsubmenu(transaction, id_cliente, perfil, id_item, id_sub_item, subsubmenu, referenciaCliente) {
    let sqlRequest = new sql.Request(transaction);
    const result = await sqlRequest.query(`
        SELECT [to] FROM Menu_Itens WHERE Nome = '${subsubmenu.name}' AND Cod_Cli = ${referenciaCliente}
    `);
    const subsubmenuTo = result.recordset[0]?.to || '';

    console.log(`Inserindo subsubmenu: ${subsubmenu.name}`);
    sqlRequest.input('ID_Item', sql.Int, id_item)
        .input('ID_Sub_Item', sql.Int, id_sub_item)
        .input('Cod_Cli', sql.Int, id_cliente)
        .input('Nome', sql.VarChar, subsubmenu.name)
        .input('Perfil', sql.Int, perfil)
        .input('to', sql.VarChar, subsubmenuTo);

    await sqlRequest.query(`
        INSERT INTO Menu_Itens (ID_Item, ID_Sub_Item, Cod_Cli, Nome, Perfil, [to])
        VALUES (@ID_Item, @ID_Sub_Item, @Cod_Cli, @Nome, @Perfil, @to)
    `);
    console.log(`Subsubmenu ${subsubmenu.name} inserido com sucesso`);
}
async function listar(request, response) {
    try {
        const query = 'SELECT * FROM clientes WHERE deleted = 0';
        const result = await new sql.Request().query(query);
        response.status(200).json(result.recordset);
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
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
        const resultId = await sqlRequest.query(`SELECT ISNULL(MAX(id_cliente), 0) AS lastId FROM clientes`);
        const lastId = resultId.recordset[0].lastId;
        const newIdCliente = lastId + 1;

        // Prepara as variáveis para a query de inserção de cliente
        sqlRequest.input('id_cliente', sql.Int, newIdCliente);
        sqlRequest.input('nome', sql.VarChar, nome);
        sqlRequest.input('cpfcnpj', sql.VarChar, cpfcnpj);
        sqlRequest.input('ativo', sql.Bit, ativo);
        sqlRequest.input('deleted', sql.Bit, false);
        sqlRequest.input('created', sql.DateTime, new Date());
        sqlRequest.input('updated', sql.DateTime, new Date());
        sqlRequest.input('last_login', sql.DateTime, new Date('1900-01-01 00:00:00.000'));
        sqlRequest.input('usar_api', sql.Bit, usar_api);
        sqlRequest.input('atualizado', sql.Bit, false);

        // Executa a query para inserir o cliente
        await sqlRequest.query(queryCliente);

        // Instancia um novo sql.Request para a query de inserção de API Key
        sqlRequest = new sql.Request(transaction);

        // Prepara as variáveis para a query de inserção de API Key
        sqlRequest.input('id_cliente', sql.Int, newIdCliente);
        sqlRequest.input('api_key', sql.VarChar, apiKey);
        sqlRequest.input('nome_cliente', sql.VarChar, nome);

        // Executa a query para inserir a chave de API
        await sqlRequest.query(queryApiKey);

        // Commit da transação
        await transaction.commit();

        response.status(201).send('Cliente criado com sucesso e API Key gerada!');
    } catch (error) {
        await transaction.rollback();  // Em caso de erro, reverte a transação
        console.error('Erro ao inserir o usuário:', error.message);
        response.status(500).send('Erro ao inserir o usuário');
    }
}

async function atualizar(request, response) {
    const { id_cliente, nome, cpfcnpj, ativo, usarapi, id_usuario } = request.body;
    const params = {
        nome: nome,
        cpfcnpj: cpfcnpj,
        ativo: convertToBoolean(ativo),
        updated: new Date(),
        usar_api: convertToBoolean(usarapi),
        atualizado: true,
        id_cliente: id_cliente
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
        request.input('id_cliente', sql.Int, id_cliente);
        request.input('nome', sql.VarChar, nome);
        request.input('cpfcnpj', sql.VarChar, cpfcnpj);
        request.input('ativo', sql.Bit, (ativo));
        request.input('updated', sql.DateTime, new Date());
        request.input('usar_api', sql.Bit, (usarapi));
        request.input('atualizado', sql.Bit, true);
        const result = await request.query(query);
        if (result.rowsAffected && result.rowsAffected[0] > 0) {
            logQuery('info', `O usuário ${id_usuario} atualizou o cliente:${id_cliente}`, 'sucesso', 'UPDATE', id_cliente, id_usuario, query, params);
            response.status(200).json("Cliente atualizado com sucesso");
        } else {
            logQuery('error', `O usuário ${id_usuario} falhou em atualizar o cliente:${id_cliente}`, 'falha', 'UPDATE', id_cliente, id_usuario, query, params);
        }
    } catch (error) {
        logQuery('error', error.message, 'falha', 'UPDATE', id_cliente, id_usuario, query, params);
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}
async function deletar(request, response) {
    const { id_cliente, id_usuario } = request.body;
    const query = "UPDATE clientes SET deleted = 1 WHERE id_cliente = @id_cliente";
    const params = {
        id_cliente: id_cliente
    };
    try {

        if (!id_cliente) {
            return response.status(400).json({ error: "ID do cliente não foi enviado" });
        }

        const sqlRequest = new sql.Request();
        sqlRequest.input('id_cliente', sql.Int, id_cliente);

        const result = await sqlRequest.query(query);

        if (result.rowsAffected[0] > 0) {
            logQuery('info', `O usuário ${id_usuario} deletou o cliente ${id_cliente}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);
            response.status(200).json({ message: "cliente excluído com sucesso" });
        } else {
            logQuery('error', `O usuário ${id_usuario} falhou em deletar o cliente ${id_cliente}`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
            response.status(404).json({ error: "cliente não encontrado" });
        }

    } catch (error) {
        logQuery('error', error.message, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
        console.error('Erro ao excluir:', error.message);
        response.status(500).send('Erro ao excluir');
    }
}


async function salvarMenus(request, response) {
    const { id_cliente, perfil, menus } = request.body;
    const referenciaCliente = 57;
    let transaction;
    try {
        console.log("Perfil recebido:", perfil);
        const menuOrder = getMenuOrderByProfile(perfil); // Obter o menuOrder com base no perfil
        console.log("Menu Order selecionado:", menuOrder);

        transaction = new sql.Transaction();
        await transaction.begin();
        console.log("Transação iniciada");
        if (!menuOrder['Dashboard']) {
            throw new Error('Menu "Dashboard" não encontrado no menuOrder para o perfil especificado');
        }
        await inserirMenuPrincipal(transaction, id_cliente, perfil, 'Dashboard', menuOrder['Dashboard']);

        for (let menu of menus) {
            const order = menuOrder[menu.name];
            if (!order) {
                console.log(`Menu ${menu.name} não encontrado no menuOrder para o perfil ${perfil}`);
                continue;
            }

            await inserirMenuPrincipal(transaction, id_cliente, perfil, menu.name, order);

            for (let submenu of menu.submenus) {
                const submenuId = await inserirSubmenu(transaction, id_cliente, perfil, order.id_item, submenu, referenciaCliente);

                if (submenuId > 0 && submenu.subsubmenus) {
                    for (let subsubmenu of submenu.subsubmenus) {
                        await inserirSubsubmenu(transaction, id_cliente, perfil, order.id_item, submenuId, subsubmenu, referenciaCliente);
                    }
                }
            }
        }

        await transaction.commit();
        console.log("Transação concluída com sucesso");
        response.status(200).send('Menus salvos com sucesso!');
    } catch (error) {
        await transaction.rollback();
        console.error('Erro ao salvar menus:', error.message);
        response.status(500).send('Erro ao salvar menus');
    }
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
            requestSql.input('id_cliente', sql.Int, id_cliente);

            const MenuR = await requestSql.query(queryMenu);
            const Menu = MenuR.recordset;

            const MenuItemR = await requestSql.query(queryMenuItem);
            const MenuItem = MenuItemR.recordset;

            // Construir a árvore de menus (ou vazio se não houver menus/itens)
            const menuTree = Menu.length > 0 || MenuItem.length > 0 ? buildMenuTree(Menu, MenuItem) : [];
            menuTree.forEach(cleanItems);

            // Adicionar a árvore de menus ao cliente
            clientesComMenu.push({
                ...cliente,
                menus: menuTree
            });
        }

        // Retornar os clientes com seus menus
        response.status(200).json(clientesComMenu);

    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

function buildMenuTree(menus, menuItems) {
    const menuMap = {};
    const itemMap = {};

    // Popula o menuMap com os menus principais
    menus.forEach(menu => {
        menuMap[menu.ID_item] = {
            label: menu.Nome,
            icon: menu.Icone || null,
            to: menu.Nome.toLowerCase() === 'dashboard' ? '/dashboard' : (menu.To || null),
            items: []
        };
    });

    // Popula o itemMap com os itens do menu
    menuItems.forEach(item => {
        itemMap[item.ID] = {
            label: item.Nome,
            icon: item.Icone || null,
            to: item.to || null,
            items: []
        };
    });

    // Adiciona os itens aos seus menus ou sub-itens correspondentes
    menuItems.forEach(item => {
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
module.exports = {
    listar,
    atualizar,
    deletar,
    adicionar,
    salvarMenus,
    listarComMenu
};