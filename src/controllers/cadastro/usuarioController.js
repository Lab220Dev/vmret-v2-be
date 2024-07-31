const sql = require('mssql');

async function adicionar(request, response){
    try {
        const{nome, email, telefone, celular, senha, ativo, deleted, last_login, id_planta, id_cliente, role} = request.body;
        const query = `INSERT INTO usuarios (nome, email, telefone, celular, senha, ativo, deleted, last_login, id_planta, id_cliente, role)
        Values (@nome, @email, @telefone, @celular, @senha, @ativo, @deleted, @last_login, @id_planta, @id_cliente, @role)`
        request = new sql.Request();
        request.input('nome', sql.VarChar, nome);
        request.input('email', sql.VarChar, email);
        request.input('telefone', sql.VarChar, telefone);
        request.input('celular', sql.VarChar, celular);
        request.input('senha', sql.VarChar, senha);
        request.input('ativo', sql.Bit, ativo);
        request.input('deleted', sql.Bit, deleted);
        request.input('last_login', sql.DateTime, last_login);
        request.input('id_planta', sql.Int, id_planta);
        request.input('id_cliente', sql.Int, id_cliente);
        request.input('role', sql.NVarChar, role);
        const result = await request.query(query);
        if(result){
            response.status(201).send("Usuário criado com sucesso!");
            return
        }
        response.status(400).send("Falha ao criar o usuário!");
    } catch (error) {
        console.error('Erro ao inserir o usuário:', error.message);
        response.status(500).send('Erro ao inserir o usuário');
    }
}

async function listar(request, response){
    try {
        let query;
        if(request.body.id_cliente){
            query = `SELECT * FROM usuarios WHERE id_cliente = '${request.body.id_cliente}'`;
        } else {
            query = `
                SELECT usuarios.*, clientes.nome AS nome_cliente 
                FROM usuarios 
                LEFT JOIN clientes ON usuarios.id_cliente = clientes.id_cliente
            `;
        }

        // Executa a query
        const result = await new sql.Request().query(query);
        response.status(200).json(result.recordset);       
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
module.exports = {
    adicionar, listar, listarPlanta
};
