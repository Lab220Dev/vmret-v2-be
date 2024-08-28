const sql = require('mssql');
const { logQuery } = require('../../utils/logUtils');
const crypto = require('crypto');
const convertToBoolean = (value) => {
    return value === 'true';
};
function generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
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
    const query = `INSERT INTO clientes (id_cliente, nome, cpfcnpj, ativo, deleted, created, updated, last_login, usar_api, atualizado)
VALUES (@id_cliente, @nome, @cpfcnpj, @ativo, @deleted, @created, @updated, @last_login, @usar_api, @atualizado)`;
    const apiKey = generateApiKey();
    const queryApiKey = `INSERT INTO API_KEY (id_cliente, api_key, Nome_cliente) VALUES (@id_cliente, @api_key, @nome_cliente)`;
    const transaction = new sql.Transaction();
    try {
        await transaction.begin();
        const sqlRequest = new sql.Request(transaction);

        // Recupera o maior valor de id_cliente na tabela
        const resultId = await sqlRequest.query(`SELECT ISNULL(MAX(id_cliente), 0) AS lastId FROM clientes`);
        const lastId = resultId.recordset[0].lastId;
        const newIdCliente = lastId + 1;
        const params = {
            id_cliente: newIdCliente,
            nome: nome,
            cpfcnpj: cpfcnpj,
            ativo: ativo,
            created: new Date(),
            updated: new Date(),
            last_login: '1900-01-01 00:00:00.000',
            usar_api: convertToBoolean(usar_api),
            atualizado: false
        };
        request = new sql.Request();
        request.input('id_cliente', sql.Int, newIdCliente);
        request.input('nome', sql.VarChar, nome);
        request.input('cpfcnpj', sql.VarChar, cpfcnpj);
        request.input('ativo', sql.Bit, ativo);
        request.input('deleted', sql.Bit, false);
        request.input('created', sql.DateTime, new Date());
        request.input('updated', sql.DateTime, new Date());
        request.input('last_login', sql.DateTime, '1900-01-01 00:00:00.000');
        request.input('usar_api', sql.Bit, usar_api);
        request.input('atualizado', sql.Bit, false);
        await sqlRequest.query(query);

        // Se o cliente foi inserido com sucesso, insere a chave de API
        sqlRequest.input('api_key', sql.VarChar, apiKey);
        sqlRequest.input('nome_cliente', sql.VarChar, nome);
        await sqlRequest.query(queryApiKey);

        // Commit da transação
        await transaction.commit();

        //logQuery('info', `Usuário ${id_usuario} criou um novo Cliente com API Key`, 'sucesso', 'INSERT', newIdCliente, id_usuario, queryCliente, params);
        response.status(201).send('Cliente criado com sucesso e API Key gerada!');
    } catch (error) {
        const errorMessage = error.message.includes('Query não fornecida para logging')
            ? 'Erro crítico: Falha na operação'
            : `Erro ao adicionar Centro de Custo: ${error.message}`;
        //logQuery('error', errorMessage, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
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