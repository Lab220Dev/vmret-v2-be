const sql = require('mssql');
const crypto = require('crypto');

function generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
}

async function recuperar(request, response) {
    try {
        const { id_cliente } = request.body;

        // Verifica se o id_cliente foi fornecido
        if (!id_cliente) {
            return response.status(400).json({ mensagem: 'id_cliente não fornecido' });
        }

        // Conectando ao banco de dados e buscando a API key associada ao id_cliente
        const querySelect = 'SELECT api_key, Nome_cliente FROM API_KEY WHERE id_cliente = @id_cliente';
        const sqlRequest = new sql.Request();
        sqlRequest.input('id_cliente', sql.Int, id_cliente);
        
        const result = await sqlRequest.query(querySelect);

        if (result.recordset.length > 0) {
            // Se uma chave de API for encontrada, retorne-a
            const { api_key } = result.recordset[0];
            return response.json({ apiKey: api_key });
        } else {
            // Se nenhuma chave de API for encontrada, gere uma nova
            const newApiKey = generateApiKey();
            const nomeClienteQuery = 'SELECT Nome FROM Clientes WHERE id_cliente = @id_cliente';
            const resultNomeCliente = await sqlRequest.query(nomeClienteQuery);

            if (resultNomeCliente.recordset.length === 0) {
                return response.status(404).json({ mensagem: 'Cliente não encontrado' });
            }

            const nomeCliente = resultNomeCliente.recordset[0].Nome;

            // Inserindo a nova chave de API na tabela API_KEY
            const queryInsert = `
                INSERT INTO API_KEY (id_cliente, api_key, Nome_cliente)
                VALUES (@id_cliente, @api_key, @nome_cliente)
            `;
            sqlRequest.input('api_key', sql.VarChar, newApiKey);
            sqlRequest.input('nome_cliente', sql.VarChar, nomeCliente);

            await sqlRequest.query(queryInsert);

            // Retorne a nova chave de API
            return response.json({ apiKey: newApiKey });
        }

    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

module.exports = {
    recuperar
};
