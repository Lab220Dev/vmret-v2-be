const sql = require("mssql"); // Importa o módulo `mssql` para execução de consultas SQL.
const { sendEmail, generateEmailHTML } = require("../utils/emailService"); // Importa funções para enviar e-mails e gerar HTML do e-mail.
const CryptoJS = require("crypto-js"); // Importa o módulo `crypto-js` para criptografia de senhas.
const jwt = require("jsonwebtoken"); // Importa o módulo `jsonwebtoken` para criação de tokens JWT.
const { DateTime } = require("luxon");
const segredo = "%$&*656$4#%$3@@@__"; // Chave secreta usada para assinar o token JWT.
const opcoes = {
  expiresIn: "1h", // Define o tempo de expiração do token JWT para 1 hora.
};

/**
 * Função que gerencia o processo de login do usuário.
 *
 * @param {Object} request - Objeto de requisição HTTP contendo os dados de login (email e senha).
 * @param {Object} response - Objeto de resposta HTTP que será usado para retornar o status e mensagem.
 * @returns {Promise<void>} - Retorna a resposta com sucesso ou erro.
 */
async function login(request, response) {
  console.log("Dispositivo:", request.headers["user-agent"]);
  try {
    // Extrai o email e a senha enviados no corpo da requisição.
    const { email, senha } = request.body;

    const isMobileDevice = request.headers["user-agent"]
      .toLowerCase()
      .includes("mobile"); // Verifica se o dispositivo é um dispositivo móvel.

    // Verifica se o email e a senha foram fornecidos, caso contrário, retorna erro 400.
    if (!email || !senha) {
      response.status(400).json("E-mail e senha são obrigatórios");
      return; // Interrompe a execução se os dados não foram fornecidos.
    }

    // Criptografa a senha utilizando o MD5.
    const hashMD5 = CryptoJS.MD5(senha).toString();

    // Consulta no banco de dados para verificar se o usuário existe com o e-mail e senha fornecidos.
    const query = `
        SELECT * FROM Usuarios
        WHERE email = @Email
          AND senha = @Senha
          And deleted = 0`;

    // Executa a consulta SQL com parâmetros de email e senha criptografada.
    const result = await new sql.Request()
      .input("Email", sql.VarChar, email)
      .input("Senha", sql.VarChar, hashMD5)
      .query(query);

    // Recupera o usuário encontrado na consulta (se houver).
    const Usuario = result.recordset[0];

    // Verifica se um usuário foi encontrado com o e-mail e senha fornecidos.
    if (Usuario) {
      // Extrai o ID do cliente e remove a senha do objeto do usuário antes de enviar.
      const id_cliente = Usuario.id_cliente;
      delete Usuario.senha;

      // Atribui o papel do usuário à variável 'role'.
      const role = Usuario.role;

      // Atualiza o campo de 'last_login' do usuário com a data e hora atual.
      const updateQuery = `
                UPDATE Usuarios
                SET last_login = @LastLogin
                WHERE id_usuario = @id_usuario`;
      const nowInBrazil = DateTime.now().setZone("America/Sao_Paulo").toJSDate();
      // Executa a consulta SQL para atualizar o horário de login do usuário.
      await new sql.Request()
        .input("LastLogin", sql.DateTime, nowInBrazil)
        .input("id_usuario", sql.Int, Usuario.id_usuario)
        .query(updateQuery);

      // Mapeia o papel do usuário para o perfil correspondente, se existir.
      const perfil = roleToProfile[role];

      // Se o perfil não for encontrado, retorna erro 401 (Perfil de usuário inválido).
      if (!perfil) {
        response.status(401).json("Perfil de usuário inválido");
        return;
      }
      const queryCliente = `
            SELECT usar_api FROM Clientes
            WHERE id_cliente = @id_cliente`;

      const clienteResult = await new sql.Request()
        .input("id_cliente", sql.Int, Usuario.id_cliente)
        .query(queryCliente);

      const cliente = clienteResult.recordset[0];
      Usuario.mob = cliente && cliente.usar_api ? true : false;
      let queryMenu;
      let queryMenuItem;
      const queryNotificacao=` Select COUNT(id_notificacao) AS [count] from Notificacaos where id_cliente = @id_cliente and Tipo = 'app' and status = 0`
      const NotifResult = await new sql.Request()
        .input("id_cliente", sql.Int, Usuario.id_cliente)
        .query(queryNotificacao);
        let qtdNotificacao = 0; // Valor padrão
        if (NotifResult && NotifResult.recordset && NotifResult.recordset[0]) {
          qtdNotificacao = NotifResult.recordset[0].count || 0; // Access the 'count' property
        }
      if (isMobileDevice) {
        queryMenu = `
          SELECT * FROM Menu
          WHERE Cod_cli = @id_cliente
            AND perfil = @perfil AND Nome IN ('Dashboard', 'Relatórios')
            AND deleted = 0`; // Consulta os menus relacionados ao cliente e perfil do usuário.

        // Consulta os itens de menu relacionados ao cliente e perfil do usuário.
        queryMenuItem = `
          SELECT * FROM menu_itens
          WHERE Cod_cli = @id_cliente
            AND perfil = @perfil AND Nome IN ('Retiradas e Devoluções', 'Retiradas Realizadas', 'Fichas de Retiradas', 'Operacional', 'Status DM')
            AND deleted = 0`;

      } else {
                queryMenu = `
        SELECT * FROM Menu
        WHERE Cod_cli = @id_cliente
          AND perfil = @perfil
          AND deleted = 0`;

                // Consulta os itens de menu relacionados ao cliente e perfil do usuário.
                queryMenuItem = `
        SELECT * FROM menu_itens
        WHERE Cod_cli = @id_cliente
          AND perfil = @perfil`;
      }

      const requestSql = new sql.Request();
      requestSql.input("id_cliente", sql.Int, id_cliente);
      requestSql.input("perfil", sql.Int, perfil);

      // Executa a consulta para os menus.
      const MenuR = await requestSql.query(queryMenu);
      const Menu = MenuR.recordset;

      // Executa a consulta para os itens de menu.
      const MenuItemR = await requestSql.query(queryMenuItem);
      const MenuItem = MenuItemR.recordset;

      // Constrói a estrutura do menu a partir dos dados obtidos.
      const menuTree = buildMenuTree(Menu, MenuItem);

      // Limpa os itens de menu que não possuem subitens.
      menuTree.forEach(cleanItems);

      // Gera o token JWT contendo as informações do usuário e seu papel.
      const token = jwt.sign(
        { usuario: Usuario, roles: [role] },
        segredo,
        opcoes
      );

      // Retorna o token, dados do usuário e a estrutura do menu com sucesso (status 200).
      response.status(200).json({ token, Usuario, items: menuTree ,Notificacoes: qtdNotificacao});
    } else {
      // Caso o usuário não seja encontrado, retorna erro 401 (E-mail ou senha inválidos).
      response.status(401).json("E-mail ou senha inválidos");
    }
  } catch (error) {
    // Caso ocorra um erro na execução da consulta, exibe o erro no console e retorna erro 500.
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função de logout, que apenas retorna uma mensagem de sucesso.
 *
 * @param {Object} request - Objeto de requisição HTTP.
 * @param {Object} response - Objeto de resposta HTTP com a mensagem de sucesso.
 * @returns {Promise<void>} - Retorna a resposta com a mensagem de sucesso.
 */
async function logout(request, response) {
  // Retorna uma resposta com sucesso ao realizar o logoff.
  response.status(200).json({ message: "Logoff bem-sucedido" });
}

/**
 * Função para recuperar a senha de um usuário, gerando uma nova senha e enviando por e-mail.
 *
 * @param {Object} req - Objeto de requisição HTTP contendo o e-mail do usuário.
 * @param {Object} res - Objeto de resposta HTTP que será usado para retornar a mensagem de sucesso ou erro.
 * @returns {Promise<void>} - Retorna a resposta com sucesso ou erro.
 */
async function recuperarSenha(req, res) {
  try {
    // Extrai o e-mail enviado no corpo da requisição.
    const email = req.body.email;

    // Verifica se o e-mail foi fornecido, caso contrário, retorna erro 400 (E-mail não fornecido).
    if (!email) {
      return res.status(400).json({ message: "E-mail não fornecido" });
    }

    // Consulta para verificar se o e-mail existe no banco de dados.
    const query = `
        SELECT * FROM Usuarios
        WHERE email = @Email`;

    // Executa a consulta para verificar se o e-mail existe.
    const result = await new sql.Request()
      .input("Email", sql.VarChar, email)
      .query(query);

    // Verifica se o e-mail foi encontrado no banco de dados.
    if (result.recordset.length > 0) {
      // Caso o e-mail seja encontrado, gera uma nova senha simples (idealmente, uma senha mais segura deveria ser gerada).
      const senha = "123456"; // Exemplo de senha simples, idealmente uma senha segura deve ser gerada.
      const hashMD5 = CryptoJS.MD5(senha).toString(); // Criptografa a nova senha utilizando MD5.

      // Atualiza a senha do usuário no banco de dados com a nova senha gerada.
      const queryUpdate = `
            UPDATE Usuarios 
            SET senha = @senha 
            WHERE email = @Email`;

      // Executa a consulta para atualizar a senha no banco de dados.
      const updateResult = await new sql.Request()
        .input("senha", sql.VarChar, hashMD5)
        .input("Email", sql.VarChar, email)
        .query(queryUpdate);

      // Verifica se a atualização foi bem-sucedida.
      if (updateResult.rowsAffected[0] > 0) {
        console.log("Senha atualizada com sucesso");

        // Gera o conteúdo do e-mail com a nova senha e envia para o usuário.
        const htmlContent = generateEmailHTML(senha); // Gera o HTML do e-mail com a nova senha.
        await sendEmail(email, "Sua senha", htmlContent); // Envia o e-mail com a nova senha.

        // Retorna uma resposta com sucesso e mensagem de que a senha foi enviada.
        return res.status(200).json({ message: "Senha enviada com sucesso!" });
      } else {
        console.log("Erro ao atualizar a senha.");
        return res.status(500).json({ message: "Erro ao atualizar a senha." });
      }
    } else {
      console.log("E-mail não encontrado");
      return res.status(404).json({ message: "E-mail não encontrado." });
    }
  } catch (error) {
    // Caso ocorra um erro ao tentar recuperar ou atualizar a senha, retorna erro 500.
    console.error("Erro ao processar a recuperação de senha:", error);
    return res
      .status(500)
      .json({ message: "Erro ao processar a recuperação de senha." });
  }
}

/**
 * Mapeamento de papéis de usuários para perfis no sistema.
 *
 * @type {Object}
 */
const roleToProfile = {
  Master: 1,
  Gestor: 2,
  Operador: 3,
  Avulso: 4,
  Administrador: 5,
};

/**
 * Constrói a árvore de menus a partir dos menus e itens de menu fornecidos.
 *
 * @param {Array} menus - Array de menus principais.
 * @param {Array} menuItems - Array de itens de menu.
 * @returns {Array} - Retorna a árvore de menus com seus sub-itens organizados.
 */
function buildMenuTree(menus, menuItems) {
  const menuMap = {}; // Mapeia os menus principais.
  const itemMap = {}; // Mapeia os itens de menu.

  // Popula o menuMap com os menus principais.
  menus.forEach((menu) => {
    menuMap[menu.ID_item] = {
      label: menu.Nome,
      icon: menu.Icone || null, // Define o ícone do menu, se existir.
      to:
        menu.Nome.toLowerCase() === "dashboard"
          ? "/dashboard"
          : menu.To || null,
      items: [], // Sub-itens, inicialmente vazios.
    };
  });

  // Popula o itemMap com os itens de menu.
  menuItems.forEach((item) => {
    itemMap[item.ID] = {
      label: item.Nome,
      icon: item.Icone || null, // Define o ícone do item, se existir.
      to: item.to || null, // Define a URL do item.
      items: [], // Sub-itens, inicialmente vazios.
    };
  });

  // Adiciona os itens aos seus menus ou sub-itens correspondentes.
  menuItems.forEach((item) => {
    if (item.ID_Sub_Item && item.ID_Sub_Item !== 0) {
      // Se o item for um sub-item, associa ao item pai correspondente.
      if (itemMap[item.ID_Sub_Item]) {
        itemMap[item.ID_Sub_Item].items.push(itemMap[item.ID]);
      }
    } else {
      // Caso contrário, adiciona o item ao menu principal correspondente.
      if (menuMap[item.ID_Item]) {
        menuMap[item.ID_Item].items.push(itemMap[item.ID]);
      }
    }
  });

  // Converte o menuMap em um array de menus.
  const menuTree = Object.values(menuMap);

  return menuTree;
}

/**
 * Limpa os itens de menu que não possuem sub-itens.
 *
 * @param {Object} menu - Menu ou item de menu a ser limpo.
 */
function cleanItems(menu) {
  if (menu.items) {
    if (menu.items.length === 0) {
      delete menu.items; // Remove o campo de sub-itens caso não existam.
    } else {
      // Recursivamente limpa os itens de menu.
      menu.items.forEach(cleanItems);
    }
  }
}

module.exports = {
  login,
  logout,
  recuperarSenha,
};
