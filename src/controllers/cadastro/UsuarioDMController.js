const sql = require('mssql');
const CryptoJS = require('crypto-js');

async function listar(request, response) {
    try {
        let query = 'SELECT * FROM Usuarios_VM WHERE deleted = 0';
        if (request.body.id_cliente) {
            query += ` AND id_cliente = '${request.body.id_cliente}'`;
            request = new sql.Request();
            const result = await request.query(query);
            const usuarios = result.recordset.map(usuario => {
                return {
                    ...usuario,
                    senha: 'senhaAntiga'
                };
            });
            response.status(200).json(usuarios);
            return;
        } else {
            request = new sql.Request();
            const result = await request.query(query);
            const usuarios = result.recordset.map(usuario => {
                return {
                    ...usuario,
                    senha: 'senhaAntiga'
                };
            });
            response.status(200).json(usuarios);
            return;
        }
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

async function adicionar(request, response) {
    const { nome, login, senha, ativo, admin, admin_cliente, id_usuario } = request.body;
    const id_cliente = request.body.id_cliente;
    const query = `INSERT INTO Usuarios_VM (id_cliente, nome, login,
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
            logQuery('info', `Usuário ${id_usuario} criou um novo Centro de Custo`, 'sucesso', 'INSERT', id_cliente, id_usuario, query, params);
            response.status(201).send('Centro de Custo criado com sucesso!');
        } else {
            logQuery('error', `Usuário ${id_usuario} falhou ao criar Centro de Custo`, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
            response.status(400).send('Falha ao criar o Centro de Custo');
        }
    } catch (error) {
        console.error('Erro ao adicionar Usuario DM:', error.message);
        response.status(500).send('Erro ao adicionar Usuario DM');
    }
}
async function atualizar(request, response) {
    const { id_cliente, id, nome, login, senha, ativo, admin, admin_cliente } = request.body;
    const query = `UPDATE Usuarios_VM 
    SET id_cliente = @id_cliente,
    login = @login,
    senha = @senha,
    ativo = @ativo,
    admin = @admin,
    admin_cliente = @admin_cliente
    WHERE id = @id`;
    const hashMD5 = CryptoJS.MD5(senha).toString();
    const params = {
        id_cliente: id_cliente,
        login: login,
        senha: hashMD5,
        ativo: ativo,
        admin: admin,
        admin_cliente: admin_cliente,
        id: id,
    };
    try {
        request = new sql.Request();
        request.input('id_cliente', sql.Int, id_cliente);
        request.input('id', sql.Int, id);
        request.input('nome', sql.NVarChar, nome);
        request.input('login', sql.VarChar, login);
        request.input('senha', sql.NVarChar, hashMD5);
        request.input('ativo', sql.Bit, ativo);
        request.input('admin', sql.Bit, admin);
        request.input('admin_cliente', sql.Bit, admin_cliente);
        const result = await request.query(query);
        if (result.rowsAffected[0] > 0) {
          //  logQuery('info', `Usuário ${id_usuario} criou um novo Centro de Custo`, 'sucesso', 'INSERT', id_cliente, id_usuario, query, params);
            response.status(201).send('Centro de Custo criado com sucesso!');
        } else {
           // logQuery('error', `Usuário ${id_usuario} falhou ao criar Centro de Custo`, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
            response.status(400).send('Falha ao criar o Centro de Custo');
        }
    } catch (error) {
        console.error('Erro ao adicionar Usuario dm:', error.message);
        response.status(500).send('Erro ao adicionar Usuario dm');
    }
}
async function deletar(request, response) {
    const { id, id_cliente, id_usuario } = request.body;
    const query = "UPDATE Usuarios_VM SET deleted = 1 WHERE id = @id";
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
    adicionar, listar, atualizar, deletar
};
