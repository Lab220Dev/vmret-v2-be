const sql = require('mssql');
const CryptoJS = require('crypto-js');
const { logQuery } = require('../../utils/logUtils');

async function adicionar(request, response) {
    const sqlRequest = new sql.Request();
    // Recupera o maior valor de id_cliente na tabela
    const resultId = await sqlRequest.query(`SELECT ISNULL(MAX(id_usuario), 0) AS lastId FROM usuarios`);
    const lastId = resultId.recordset[0].lastId;
    const newIdCliente = lastId + 1;
    const { nome, email, senha, ativo, id_planta, id_cliente, role, id_usuario } = request.body;
    const query = `INSERT INTO usuarios (nome, email, senha, ativo, deleted, id_planta, id_cliente, role)
    Values (@nome, @email, @senha, @ativo, @deleted, @id_planta, @id_cliente, @role)`
    const hashMD5 = CryptoJS.MD5(senha).toString();
    const params = {
        nome: nome,
        email: email,
        senha: hashMD5,
        ativo: ativo,
        deleted: false,
        id_planta: id_planta,
        id_cliente: id_cliente,
        role: role,
    };
    try {
        request = new sql.Request();
        request.input('nome', sql.VarChar, nome);
        request.input('email', sql.VarChar, email);
        request.input('senha', sql.VarChar, hashMD5);
        request.input('ativo', sql.Bit, ativo);
        request.input('deleted', sql.Bit, false);
        request.input('id_planta', sql.Int, id_planta);
        request.input('id_cliente', sql.Int, id_cliente);
        request.input('role', sql.NVarChar, role);
        const result = await request.query(query);
        if (result.rowsAffected[0] > 0) {
            logQuery('info', `Usuário ${id_usuario} criou um novo usuario web ${newIdCliente}`, 'sucesso', 'INSERT', id_cliente, id_usuario, query, params);
            response.status(201).send("Usuário criado com sucesso!");
            return
        } else {
            logQuery('error', `Usuário ${id_usuario} não criou um novo usuario web`, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
            response.status(400).send('Falha ao criar o Centro de Custo');
        }
        response.status(400).send("Falha ao criar o usuário!");
    } catch (error) {
        logQuery('error', errorMessage, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
        console.error('Erro ao inserir o usuário:', error.message);
        response.status(500).send('Erro ao inserir o usuário');
    }
}

async function listar(request, response) {
    try {
        let query;
        if (request.body.id_cliente) {
            query = `SELECT * FROM usuarios WHERE id_cliente = '${request.body.id_cliente}' AND deleted != 1`;
        } else {
            query = `
                SELECT usuarios.*, clientes.nome AS nome_cliente 
                FROM usuarios 
                LEFT JOIN clientes ON usuarios.id_cliente = clientes.id_cliente
                WHERE usuarios.deleted != 1
            `;
        }

        // Executa a query
        const result = await new sql.Request().query(query);

        const usuarios = result.recordset.map(usuario => {
            return {
                ...usuario,
                senha: 'senhaAntiga'
            };
        });
        response.status(200).json(usuarios);
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

async function listarPlanta(request, response) {
    try {
        let query = 'SELECT DISTINCT id_planta FROM funcionarios WHERE 1 = 1';


        if (request.body.id_cliente) {
            query += ` AND id_cliente = '${request.body.id_cliente}'`;
            const result = await new sql.Request().query(query);
            response.status(200).json(result.recordset);
            return;
        }
        response.status(401).json("id do cliente não enviado");
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}
async function deleteUsuario(request, response) {
    const id_usuario = request.body.id_usuario;
    const id_usuario_delete = request.body.id_usuario_delete;
    const id_cliente = request.body.id_cliente;
    let query = "UPDATE usuarios SET deleted = 1 WHERE id_usuario = @id_usuario";
    const params = {
        id_cliente: id_usuario_delete,
    };
    try {

        if (id_usuario) {
            const sqlRequest = new sql.Request();
            sqlRequest.input('id_usuario', sql.Int, id_usuario_delete);
            const result = await sqlRequest.query(query);
            if (result.rowsAffected[0] > 0) {
                logQuery('info', `Usuário ${id_usuario} deletou o o usuario${id_usuario_delete}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);
                response.status(200).json(result.recordset);
                return
            } else {
                //throw new Error(`Erro ao excluir: ${ID_CentroCusto} não encontrado.`);
                logQuery('erro', `Usuário ${id_usuario} deletou o o usuario${id_usuario_delete}`, 'falha', 'DELETE', id_cliente, id_usuario, query, params);
                response.status(400).send('Não foi possivel deletar o usuario');
            }
        }
        response.status(401).json("id do usuario não foi enviado");
    } catch (error) {
        console.error('Erro ao excluir:', error.message);
        response.status(500).send('Erro ao excluir');
    }
}

async function atualizarUsuario(request, response) {
    const {id_usuario_pedinte, ativo,celular,deleted,email,id_cliente,id_planta,id_usuario,last_login,nome,role,telefone,senha} = request.body;

    let query = `
        UPDATE usuarios
        SET 
            nome = @nome,
            celular = @celular,
            deleted = @deleted,
            last_login = @last_login,
            telefone = @telefone,
            ativo = @ativo,
            id_planta = @id_planta,
            role = @role`;

    const params = {
        nome: nome,
        email: email,
        celular:celular,
        deleted:deleted,
        id_cliente:id_cliente,
        last_login:last_login,
        telefone:telefone,
        ativo: ativo,
        id_planta: id_planta,
        role: role
    };

    if (senha) {
        const hashMD5 = CryptoJS.MD5(senha).toString();
        query += `, senha = @senha`; 
        params.senha = hashMD5;
    }

    query += ` WHERE id_usuario = @id_usuario and id_cliente=@id_cliente`;
    params.id_usuario = id_usuario;
    params.id_cliente = id_cliente;

    try {
        const sqlRequest = new sql.Request();

        sqlRequest.input('id_usuario', sql.Int, params.id_usuario);
        sqlRequest.input('nome', sql.VarChar, params.nome);
        sqlRequest.input('email', sql.VarChar, params.email);
        sqlRequest.input('celular', sql.VarChar, params.celular);
        sqlRequest.input('deleted', sql.Int, params.deleted);
        sqlRequest.input('id_cliente', sql.Int, params.id_cliente);
        sqlRequest.input('last_login', sql.DateTime, params.last_login);
        sqlRequest.input('telefone', sql.Int, params.telefone);
        sqlRequest.input('ativo', sql.Bit,ativo);
        if (params.senha) sqlRequest.input('senha', sql.VarChar, params.senha);
        sqlRequest.input('id_planta', sql.Int, params.id_planta);
        sqlRequest.input('role', sql.VarChar, params.role);

        const result = await sqlRequest.query(query);

        if (result.rowsAffected[0] > 0) {
            logQuery('info', `Usuário ${id_usuario_pedinte} atualizou o usuário web ${id_usuario}.`, 'sucesso', 'UPDATE', id_cliente, id_usuario, query, params);
            response.status(200).send("Usuário atualizado com sucesso!");
        } else {
            logQuery('Erro', `Usuário ${id_usuario_pedinte} falhou ao atualizar o usuário web ${id_usuario}.`, 'erro', 'UPDATE', id_cliente, id_usuario, query, params);
            response.status(400).send("Falha ao atualizar o usuário!");
        }
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error.message);
        logQuery('Erro', error.message, 'erro', 'UPDATE', id_cliente, id_usuario, query, params);

        response.status(500).send('Erro ao atualizar usuário');
    }
}

module.exports = {
    adicionar, listar, listarPlanta, atualizarUsuario, deleteUsuario
};
