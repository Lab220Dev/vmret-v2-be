const sql = require('mssql');
const CryptoJS = require('crypto-js');
;
async function adicionar(request, response) {
    try {
        const { nome, email, senha, ativo, id_planta, id_cliente, role } = request.body;
        const query = `INSERT INTO usuarios (nome, email, senha, ativo, deleted, id_planta, id_cliente, role)
        Values (@nome, @email, @senha, @ativo, @deleted, @id_planta, @id_cliente, @role)`
        request = new sql.Request();
        const hashMD5 = CryptoJS.MD5(senha).toString();
        request.input('nome', sql.VarChar, nome);
        request.input('email', sql.VarChar, email);
        request.input('senha', sql.VarChar, hashMD5);
        request.input('ativo', sql.Bit, ativo);
        request.input('deleted', sql.Bit, false);
        request.input('id_planta', sql.Int, id_planta);
        request.input('id_cliente', sql.Int, id_cliente);
        request.input('role', sql.NVarChar, role);
        const result = await request.query(query);
        if (result) {
            response.status(201).send("Usuário criado com sucesso!");
            return
        }
        response.status(400).send("Falha ao criar o usuário!");
    } catch (error) {
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
    try {
        let query = "UPDATE usuarios SET deleted = 1 WHERE 1 = 1";

        if (request.body.id_usuario) {
            query += ` AND id_usuario = '${request.body.id_usuario}'`;
            const result = await new sql.Request().query(query);
            response.status(200).json(result.recordset);
            return;
        }
        response.status(401).json("id do usuario não foi enviado");
    } catch (error) {
        console.error('Erro ao excluir:', error.message);
        response.status(500).send('Erro ao excluir');
    }
}

async function atualizarUsuario(request, response) {
    try {
        const { id_usuario, nome, email, senha, ativo, id_planta, id_cliente, role } = request.body;

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
        console.error('Erro ao atualizar funcionário:', error.message);
        response.status(500).send('Erro ao atualizar funcionário');
    }
}

module.exports = {
    adicionar, listar, listarPlanta,atualizarUsuario,deleteUsuario
};
