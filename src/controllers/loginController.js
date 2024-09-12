const sql = require('mssql');
// const { sendEmail, generateEmailHTML } = require('../utils/emailService');
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
            const id_cliente = Usuario.id_cliente;
            delete Usuario.senha;
            const role = Usuario.role;
            const updateQuery = `
                UPDATE Usuarios
                SET last_login = @LastLogin
                WHERE id_usuario = @id_usuario`;
            const currentDate = new Date();

            await new sql.Request()
                .input('LastLogin', sql.DateTime, currentDate)
                .input('id_usuario', sql.Int, Usuario.id_usuario)
                .query(updateQuery);


            const perfil = roleToProfile[role];
            if (!perfil) {
                response.status(401).json("Perfil de usuário inválido");
                return;
            }
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
            const token = jwt.sign({ usuario: Usuario, roles: [role] }, segredo, opcoes);
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
// async function recuperarSenha(req, res) {
//     try {
//         const email = req.body.email;
//         if (!email) {
//             return res.status(400).json({ message: 'e-mail não fornecido' });
//         }
//         const query = `
//         SELECT senha FROM Usuarios
//         WHERE email = @Email`;
//         const result = await new sql.Request()
//             .input('Email', sql.VarChar, email)
//             .query(query)
//         const senha = result.recordset[0];
//         const htmlContent = generateEmailHTML(senha);
//         await sendEmail(email, 'Sua senha', htmlContent);;
//         res.status(200).json({ message: 'Senha enviada com sucesso!' });
//     } catch (error) {
//         console.error('Erro ao enviar e-mail:', error);
//         res.status(500).json({ message: 'Erro ao enviar e-mail.' });
//     }
// }
const roleToProfile = {
    'Master': 1,
    'Gestor': 2,
    'Operador': 3,
    'Avulso': 4,
    'Administrador': 5
};
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
    login,
    logout,
};