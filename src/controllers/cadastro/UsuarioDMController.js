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
        }else {
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
    try {
        const {  nome, login, senha , ativo,admin, admin_cliente } = request.body;
        const id_cliente = request.body.id_cliente;
        const query = `INSERT INTO Usuarios_VM (id_cliente, nome, login,
         senha, ativo, admin, admin_cliente,deleted )
         VALUES (@id_cliente, @nome, @login, @senha, @ativo,
          @admin, @admin_cliente,@deleted)`;
        request = new sql.Request();
        const hashMD5 = CryptoJS.MD5(senha).toString();
        request.input('id_cliente', sql.Int, id_cliente);
        request.input('nome', sql.NVarChar, nome);
        request.input('login', sql.VarChar, login);
        request.input('senha', sql.NVarChar, hashMD5);
        request.input('ativo', sql.Bit, ativo);
        request.input('deleted', sql.Bit, false);
        request.input('admin', sql.Bit, false);
        request.input('admin_cliente', sql.Bit, false);
        const result = await request.query(query);
        if (result) {
            response.status(201).send('Usuario DM criada com sucesso!');
            return;
        }
    } catch (error) {
        console.error('Erro ao adicionar Usuario DM:', error.message);
        response.status(500).send('Erro ao adicionar Usuario DM');
    }
}
async function atualizar(request, response) {
    try {
        const { id_cliente,id ,nome, login, senha , ativo,admin, admin_cliente } = request.body;
        const query = `UPDATE Usuarios_VM 
        SET id_cliente = @id_cliente,
        login = @login,
        senha = @senha,
        ativo = @ativo,
        admin = @admin,
        admin_cliente = @admin_cliente
        WHERE id = @id`;
        request = new sql.Request();
        const hashMD5 = CryptoJS.MD5(senha).toString();

        request.input('id_cliente', sql.Int, id_cliente);
        request.input('id', sql.Int, id);
        request.input('nome', sql.NVarChar, nome);
        request.input('login', sql.VarChar, login);
        request.input('senha', sql.NVarChar, hashMD5);
        request.input('ativo', sql.Bit, ativo);
        request.input('admin', sql.Bit, admin);
        request.input('admin_cliente', sql.Bit, admin_cliente);
        const result = await request.query(query);
        if (result.rowsAffected && result.rowsAffected[0] > 0) {
            response.status(200).json("Usuario dm atualizado com sucesso");
        } else {
            response.status(400).json("Erro ao atualizar o Usuario dm");
        }
    } catch (error) {
        console.error('Erro ao adicionar Usuario dm:', error.message);
        response.status(500).send('Erro ao adicionar Usuario dm');
    }
}
async function deletar(request, response) {
    try {
        const { id } = request.body;

        if (!id) {
            return response.status(400).json({ error: "ID não foi enviado" });
        }

        const query = "UPDATE Usuarios_VM SET deleted = 1 WHERE id = @id";
        const sqlRequest = new sql.Request();
        sqlRequest.input('id', sql.Int, id);

        const result = await sqlRequest.query(query);
        
        if (result.rowsAffected[0] > 0) {
            response.status(200).json({ message: "cliente excluído com sucesso" });
        } else {
            response.status(404).json({ error: "cliente não encontrado" });
        }

    } catch (error) {
        console.error('Erro ao excluir:', error.message);
        response.status(500).send('Erro ao excluir');
    }
}
module.exports = {
    adicionar, listar, atualizar,deletar
};
