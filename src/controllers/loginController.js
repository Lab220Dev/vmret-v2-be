const sql = require('mssql');

const CryptoJS = require('crypto-js');
const jwt = require('jsonwebtoken');
const segredo = '%$&*656$4#%$3@@@__';
const opcoes = {
    expiresIn: '1h'
};

async function login(request, response) {
    try {
        const { email, senha } = request.body;
        if (!email || !senha) {
            response.status(400).json("E-mail e senha são obrigatórios");
            return;
        }
        const hashMD5 = CryptoJS.MD5(senha).toString();
        const query = `
        SELECT * FROM Usuarios
        WHERE email = @Email
          AND senha = @Senha`;
        const result = await new sql.Request()
            .input('Email', sql.VarChar, email)
            .input('Senha', sql.VarChar, hashMD5)
            .query(query)
        const Usuario = result.recordset[0];

        if (Usuario) {
            delete Usuario.senha;
            const id_cliente = Usuario.id_cliente; 

            const queryMenu = `
                SELECT * FROM Menu
                WHERE Cod_cli = @id_cliente`;
            const queryMenuItem = `
                SELECT * FROM menu_itens
                WHERE Cod_cli = @id_cliente`;

            const requestSql = new sql.Request();
            requestSql.input('id_cliente', sql.Int, id_cliente);

            const MenuR = await requestSql.query(queryMenu);
            const Menu = MenuR.recordset;
            const MenuItemR = await requestSql.query(queryMenuItem);
            const MenuItem = MenuItemR.recordset;

            const menuTree = buildMenuTree(Menu, MenuItem);
            menuTree.forEach(cleanItems);
            const token = jwt.sign({ Usuario }, segredo, opcoes);
            response.status(200).json({ token, Usuario, items: menuTree });
        } else {
            response.status(401).json("E-mail ou senha inválidos");
        }

    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }

}

async function logout(request, response) {
    response.status(200).json({ message: 'Logoff bem-sucedido' });
}


function buildMenuTree(menus, menuItems) {
    const menuMap = {};
    const itemMap = {};

    // Cria o mapa de menus
    menus.forEach(menu => {
        menuMap[menu.ID] = {
            label: menu.Nome,
            icon: menu.Icone || null,
            to: menu.To || null,
            items: []
        };
    });

    // Cria o mapa de itens
    menuItems.forEach(item => {
        itemMap[item.ID] = {
            label: item.Nome,
            icon: item.Icone || null,
            to: item.to || null,
            items: []
        };
    });

    // Organiza os itens e sub-itens
    menuItems.forEach(item => {
        if (item.ID_Sub_Item && item.ID_Sub_Item !== 0) {
            // Adiciona o item como sub-item do item pai
            if (itemMap[item.ID_Sub_Item]) {
                itemMap[item.ID_Sub_Item].items.push(itemMap[item.ID]);
            }
        } else {
            // Adiciona o item como item do menu pai
            if (menuMap[item.ID_Item]) {
                menuMap[item.ID_Item].items.push(itemMap[item.ID]);
            }
        }
    });

    // Converte o mapa de menus em uma lista
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
    login,
    logout
};