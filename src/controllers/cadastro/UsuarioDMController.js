const sql = require('mssql');
const CryptoJS = require('crypto-js');
const { logQuery } = require('../../utils/logUtils');

async function listarUsuariosSimples(request, response) {
    try {
        let query = 'SELECT id, nome FROM Usuarios_DM WHERE deleted = 0';
        const sqlRequest = new sql.Request();

        if (request.body.id_cliente) {
            query += ' AND id_cliente = @id_cliente';
            sqlRequest.input('id_cliente', sql.Int, request.body.id_cliente);
        }

        const result = await sqlRequest.query(query);
        response.status(200).json(result.recordset);
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}
async function listar(request, response) {
    try {
        let query = 'SELECT * FROM Usuarios_DM WHERE deleted = 0';
        const sqlRequest = new sql.Request();

        // Adiciona o filtro `id_cliente` se fornecido no corpo da requisição
        if (request.body.id_cliente) {
            query += ` AND id_cliente = @id_cliente`;
            sqlRequest.input('id_cliente', sql.Int, request.body.id_cliente);
        }

        // Executa a consulta para obter os usuários
        const result = await sqlRequest.query(query);
        const usuarios = result.recordset.map(usuario => ({
            ...usuario,
            senha: 'senhaAntiga' // Oculta a senha real
        }));

        const userIds = usuarios.map(usuario => usuario.id); // Coleta os IDs dos usuários

        // Verifica se há usuários para evitar uma consulta desnecessária
        if (userIds.length > 0) {
            // Prepara a consulta para obter permissões de DM para os usuários listados
            const permissionsQuery = `
                SELECT id_usuario_dm, id_dm 
                FROM DM_Usuario_Permissao 
                WHERE id_usuario_dm IN (${userIds.join(',')}) AND deleted = 0
            `;
            const permissionsRequest = new sql.Request();
            const permissionsResult = await permissionsRequest.query(permissionsQuery);

            // Agrupa os `id_dm` em um array por `id_usuario_dm`
            const permissionsMap = permissionsResult.recordset.reduce((acc, row) => {
                if (!acc[row.id_usuario_dm]) {
                    acc[row.id_usuario_dm] = [];
                }
                acc[row.id_usuario_dm].push(row.id_dm);
                return acc;
            }, {});

            // Adiciona `DMOptions` como array ao objeto de cada usuário
            usuarios.forEach(usuario => {
                usuario.DMOptions = permissionsMap[usuario.id] || [];
            });
        }

        // Retorna a lista de usuários com `DMOptions` preenchido
        response.status(200).json(usuarios);
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}
async function adicionar(request, response) {
    const { nome, login, senha, ativo, admin, admin_cliente, id_usuario } = request.body;
    const id_cliente = request.body.id_cliente;
    const query = `INSERT INTO Usuarios_DM (id_cliente, nome, login,
         senha, ativo, admin, admin_cliente,deleted )
         VALUES (@id_cliente, @nome, @login, @senha, @ativo,
          @admin, @admin_cliente,@deleted)`;
    const hashMD5 = CryptoJS.MD5(senha).toString();
    const params = {
        id_cliente: id_cliente,
        nome: nome,
        login: login,
        senha: hashMD5,
        ativo: ativo,
        deleted: false,
        admin: false,
        admin_cliente: false,
    };
    try {
        request = new sql.Request();
        request.input('id_cliente', sql.Int, id_cliente);
        request.input('nome', sql.NVarChar, nome);
        request.input('login', sql.VarChar, login);
        request.input('senha', sql.NVarChar, hashMD5);
        request.input('ativo', sql.Bit, ativo);
        request.input('deleted', sql.Bit, false);
        request.input('admin', sql.Bit, false);
        request.input('admin_cliente', sql.Bit, false);
        const result = await request.query(query);
        if (result.rowsAffected[0] > 0) {
            logQuery('info', `Usuário ${id_usuario} criou um novo usuario`, 'sucesso', 'INSERT', id_cliente, id_usuario, query, params);
            response.status(201).send('usuario criado com sucesso!');
        } else {
            logQuery('error', `Usuário ${id_usuario} falhou ao criar usuario`, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
            response.status(400).send('Falha ao criar o usuario');
        }
    } catch (error) {
        console.error('Erro ao adicionar Usuario DM:', error.message);
        response.status(500).send('Erro ao adicionar Usuario DM');
    }
}
async function atualizar(request, response) {
    const { id_cliente, id, nome, login, senha, ativo, admin, admin_cliente, DMOptions } = request.body;

    let query = `
        UPDATE Usuarios_DM 
        SET 
            id_cliente = @id_cliente,
            nome = @nome,
            login = @login,
            ativo = @ativo,
            admin = @admin,
            admin_cliente = @admin_cliente
    `;

    const hashMD5 = senha ? CryptoJS.MD5(senha).toString() : null;
    if (senha) {
        query += `, senha = @senha`; 
    }
    query += ` WHERE id = @id`;

    try {
        const transaction = new sql.Transaction(); 
        await transaction.begin(); 
        const sqlRequest = new sql.Request(transaction);
        sqlRequest.input('id_cliente', sql.Int, id_cliente);
        sqlRequest.input('id', sql.Int, id);
        sqlRequest.input('nome', sql.NVarChar, nome);
        sqlRequest.input('login', sql.VarChar, login);
        sqlRequest.input('ativo', sql.Bit, ativo);
        sqlRequest.input('admin', sql.Bit, admin);
        sqlRequest.input('admin_cliente', sql.Bit, admin_cliente);

        if (senha) {
            sqlRequest.input('senha', sql.NVarChar, hashMD5);
        }

        const result = await sqlRequest.query(query);
        await transaction.commit();
        if (result.rowsAffected[0] > 0) {
            await manipularDMOptions(id, DMOptions); 

            response.status(200).send('Usuário atualizado com sucesso!');
        } else {
            response.status(400).send('Falha ao atualizar o usuário');
        }
    } catch (error) {
        console.error('Erro ao atualizar Usuario DM:', error.message);
        response.status(500).send('Erro ao atualizar Usuario DM');
    }
}
async function manipularDMOptions(id_usuario_dm, DMOptions) {
    const transaction = new sql.Transaction(); 
    try {
        await transaction.begin(); 
        const sqlRequest = new sql.Request(transaction);

        sqlRequest.input('id_usuario_dm', sql.Int, id_usuario_dm);

        const existingDMsResult = await sqlRequest.query(`
            SELECT id_dm 
            FROM DM_Usuario_Permissao 
            WHERE id_usuario_dm = @id_usuario_dm
        `);

        const dmsatuais = existingDMsResult.recordset.reduce((acc, record) => {
            acc[record.id_dm] = record.deleted;
            return acc;
        }, {});
        const dmsNovas = DMOptions.filter(dm => !dmsatuais.hasOwnProperty(dm) || dmsatuais[dm] === 1);
        const dmsToRemove = Object.keys(dmsatuais)
            .filter(dm => !DMOptions.includes(parseInt(dm)) && dmsatuais[dm] === 0);

        // Insere novos DMs ou atualiaza se for um re-entrada
        for (const dm of dmsNovas) {
            if (dmsatuais[dm] === 1) {
                // Atualiza o registro para deleted = 0 se já existe como deletado
                const sqlRequestdm = new sql.Request(transaction);
                sqlRequestdm.input('id_usuario_dm', sql.Int, id_usuario_dm);
                sqlRequestdm.input('id_dm', sql.Int, dm);
                await sqlRequestdm.query(`
                    UPDATE DM_Usuario_Permissao 
                    SET deleted = 0 ,Sincronizado = 0 
                    WHERE id_usuario_dm = @id_usuario_dm AND id_dm = @id_dm
                `);
            } else {
                // Insere novo registro se não existe
                const sqlRequestdm = new sql.Request(transaction);
                sqlRequestdm.input('id_usuario_dm', sql.Int, id_usuario_dm);
                sqlRequestdm.input('id_dm', sql.Int, dm.id_dm);
                await sqlRequestdm.query(`
                    INSERT INTO DM_Usuario_Permissao (id_usuario_dm, id_dm, deleted,Sincronizado)
                    VALUES (@id_usuario_dm, @id_dm, 0, 0 )
                `);
            }
        }

        // Atualiza DMs para deleted = 1
        for (const dm of dmsToRemove) {
            const sqlRequestdm = new sql.Request(transaction);
            sqlRequestdm.input('id_usuario_dm', sql.Int, id_usuario_dm);
            sqlRequestdm.input('id_dm', sql.Int, dm.id_dm);
            await sqlRequestdm.query(`
                UPDATE DM_Usuario_Permissao 
                SET deleted = 1 
                WHERE id_usuario_dm = @id_usuario_dm AND id_dm = @id_dm
            `);
        }

        await transaction.commit(); // Confirma a transação após todas as operações serem concluídas
    } catch (error) {
        await transaction.rollback(); // Reverte a transação em caso de erro
        console.error('Erro ao manipular DMOptions:', error.message);
        throw error; // Propaga o erro para ser tratado pela função chamadora
    }
}
async function deletar(request, response) {
    const { id, id_cliente, id_usuario } = request.body;
    const query = "UPDATE Usuarios_DM SET deleted = 1 WHERE id = @id";
    const params = {
        id: id
      }; 
    try {
        if (!id) {
            return response.status(400).json({ error: "ID não foi enviado" });
        }

        const sqlRequest = new sql.Request();
        sqlRequest.input('id', sql.Int, id);

        const result = await sqlRequest.query(query);

    if (result.rowsAffected[0] > 0) {
       // logQuery('info', `O usuário ${id_usuario} deletou o Centro de Custo ${ID_CentroCusto}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);
        response.status(200).json(result.recordset);
      } else {
        //throw new Error(`Erro ao excluir: ${ID_CentroCusto} não encontrado.`);
       // logQuery('error',`Erro ao excluir: ${ID_CentroCusto} não encontrado.`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
        response.status(400).send('Nenhuma alteração foi feita no centro de custo.');
      }

    } catch (error) {
        console.error('Erro ao excluir:', error.message);
        response.status(500).send('Erro ao excluir');
    }
}

module.exports = {
    adicionar, listar, atualizar, deletar, listarUsuariosSimples
};
