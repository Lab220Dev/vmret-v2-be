const sql = require('mssql');
const CryptoJS = require('crypto-js');
const { logQuery } = require('../../utils/logUtils');

async function adicionar(request, response) {
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
            //logQuery('info', `Usuário ${id_usuario} criou um novo Centro de Custo`, 'sucesso', 'INSERT', id_cliente, id_usuario, query, params);
            response.status(201).send("Usuário criado com sucesso!");
            return
        } else {
            //logQuery('error', `Usuário ${id_usuario} falhou ao criar Centro de Custo`, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
            response.status(400).send('Falha ao criar o Centro de Custo');
        }
        response.status(400).send("Falha ao criar o usuário!");
    } catch (error) {
        const errorMessage = error.message.includes('Query não fornecida para logging')
            ? 'Erro crítico: Falha na operação'
            : `Erro ao adicionar Centro de Custo: ${error.message}`;
        //logQuery('error', errorMessage, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
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
                response.status(200).json(result.recordset);
                return
            } else {
                //throw new Error(`Erro ao excluir: ${ID_CentroCusto} não encontrado.`);
                //ogQuery('error', `Erro ao excluir: ${ID_CentroCusto} não encontrado.`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
                response.status(400).send('Nenhuma alteração foi feita no centro de custo.');
            }
        }
        response.status(401).json("id do usuario não foi enviado");
    } catch (error) {
        console.error('Erro ao excluir:', error.message);
        response.status(500).send('Erro ao excluir');
    }
}

async function atualizarUsuario(request, response) {
    const { id_usuario, nome, email, senha, ativo, id_planta, id_cliente, role } = request.body;
    
    try {

        // Construindo a query dinamicamente
        let query = `UPDATE usuarios SET `;
        let params = [];

        if (nome) {
            query += `nome = @nome, `;
            params.push({ name: 'nome', type: sql.VarChar, value: nome });
        }
        if (email) {
            query += `email = @email, `;
            params.push({ name: 'email', type: sql.VarChar, value: email });
        }
        if (senha) {
            const hashMD5 = CryptoJS.MD5(senha).toString();
            query += `senha = @senha, `;
            params.push({ name: 'senha', type: sql.VarChar, value: hashMD5 });
        }
        if (ativo !== undefined) {
            query += `ativo = @ativo, `;
            params.push({ name: 'ativo', type: sql.Bit, value: ativo });
        }
        if (id_planta) {
            query += `id_planta = @id_planta, `;
            params.push({ name: 'id_planta', type: sql.Int, value: id_planta });
        }
        if (id_cliente) {
            query += `id_cliente = @id_cliente, `;
            params.push({ name: 'id_cliente', type: sql.Int, value: id_cliente });
        }
        if (role) {
            query += `role = @role, `;
            params.push({ name: 'role', type: sql.NVarChar, value: role });
        }

        // Remover a última vírgula e espaço da query
        query = query.slice(0, -2);

        query += ` WHERE id_usuario = @id_usuario;`;
        params.push({ name: 'id_usuario', type: sql.Int, value: id_usuario });

        // Criando a request e adicionando os parâmetros
        request = new sql.Request();
        params.forEach(param => {
            request.input(param.name, param.type, param.value);
        });
        console.log
        const result = await request.query(query);
        if (result.rowsAffected[0] > 0) {
            response.status(200).send("Usuário atualizado com sucesso!");
        } else {
            response.status(400).send("Falha ao atualizar o usuário!");
        }
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error.message);
        response.status(500).send('Erro ao atualizar usuario');
    }
}

module.exports = {
    adicionar, listar, listarPlanta, atualizarUsuario, deleteUsuario
};
