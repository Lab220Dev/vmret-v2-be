const sql = require('mssql');

async function Salvar(request, response) {
    const { id_cliente, texto, id = "" ,id_usuario} = request.body;
    
    try {
        const { id_cliente, Texto } = request.body;

        if (!id_cliente) {
            return response.status(401).json("ID do cliente não enviado");
        }   

        const dbRequest = new sql.Request();
        dbRequest.input('ID_Cliente', sql.Int, id_cliente);
        dbRequest.input('Texto', sql.NText, Texto);

        // Verifica se já existe um registro para o id_cliente
        const checkQuery = `SELECT ID FROM Ficha_Retirada WHERE ID_Cliente = @ID_Cliente`;
        const checkResult = await dbRequest.query(checkQuery);

        let query;
        if (checkResult.recordset.length > 0) {
            // Se existir, atualiza o registro
            query = `UPDATE Ficha_Retirada
                     SET Texto = @Texto
                     WHERE ID_Cliente = @ID_Cliente`;
        } else {
            // Se não existir, cria um novo registro
            query = `INSERT INTO Ficha_Retirada (ID_Cliente, Texto)
                     VALUES (@ID_Cliente, @Texto);`;
        }

        const result = await dbRequest.query(query);
        response.status(200).json(result.recordset);
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

async function Recuperar(request, response) {
    try {
        const { id_cliente, id="" } = request.body;

        if (!id_cliente) {
            return response.status(401).json("ID do cliente não enviado");
        }

        const query = `
            SELECT * FROM Ficha_Retirada 
            WHERE id_cliente = @id_cliente 
        `;
        console.log(query)
        const dbRequest = new sql.Request();
        dbRequest.input('id_cliente', sql.Int, id_cliente);
        dbRequest.input('id', sql.Int, id);

        const result = await dbRequest.query(query);
        
        response.status(200).json(result.recordset);
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}
module.exports = {
    Salvar,Recuperar
 };