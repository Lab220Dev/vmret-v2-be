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
            const role = Usuario.role;
            const perfil = roleToProfile[role];
            console.log(perfil);
            const queryMenu = `
                 SELECT * FROM Menu
                WHERE Cod_cli = @id_cliente
                  AND perfil = @perfil`;
            const queryMenuItem = `
                SELECT * FROM menu_itens
                WHERE Cod_cli = @id_cliente
                  AND perfil = @perfil`;

            const requestSql = new sql.Request();
            requestSql.input('id_cliente', sql.Int, id_cliente);
            requestSql.input('perfil', sql.Int, perfil);

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

const roleToProfile = {
    'Master': 1,
    'Gestor': 2,
    'Operador': 3,
    'Avulso': 4
};
function buildMenuTree(menus, menuItems) {
    const menuMap = {};
    const itemMap = {};

    menus.forEach(menu => {
        menuMap[menu.ID] = {
            label: menu.Nome,
            icon: menu.Icone || null,
            to: menu.Nome.toLowerCase() === 'dashboard' ? '/dashboard' : (menu.To || null),
            items: []
        };
    });

    menuItems.forEach(item => {
        itemMap[item.ID] = {
            label: item.Nome,
            icon: item.Icone || null,
            to: item.to || null,
            items: []
        };
    });

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