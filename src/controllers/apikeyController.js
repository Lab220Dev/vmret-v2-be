const sql = require('mssql'); // Importa o módulo 'mssql' para interação com o banco de dados SQL Server
const crypto = require('crypto'); // Importa o módulo 'crypto' para gerar chaves API seguras

/**
 * Função para gerar uma nova chave API única.
 * @returns {string} Uma chave API gerada aleatoriamente em formato hexadecimal.
 */
function generateApiKey() {
    return crypto.randomBytes(32).toString('hex'); // Gera 32 bytes aleatórios e os converte para hexadecimal
}

/**
 * Função responsável por recuperar a chave de API associada a um cliente.
 * Caso não exista, gera uma nova chave de API e a armazena no banco de dados.
 * @param {Object} request - O objeto de requisição que contém o id_cliente no corpo.
 * @param {Object} response - O objeto de resposta usado para enviar os dados de volta ao cliente.
 * @returns {void} Retorna a chave de API ou uma mensagem de erro, dependendo do fluxo.
 */
async function recuperar(request, response) {
    try {
        // Extrai o id_cliente do corpo da requisição
        const { id_cliente } = request.body;

        // Verifica se o id_cliente foi fornecido no corpo da requisição
        if (!id_cliente) {
            // Caso não tenha sido fornecido, retorna um erro 400 (Bad Request)
            return response.status(400).json({ mensagem: 'id_cliente não fornecido' });
        }

        // Conectando ao banco de dados e buscando a chave API associada ao id_cliente
        const querySelect = 'SELECT api_key, Nome_cliente FROM API_KEY WHERE id_cliente = @id_cliente';
        const sqlRequest = new sql.Request(); // Cria uma nova requisição SQL
        sqlRequest.input('id_cliente', sql.Int, id_cliente); // Define o parâmetro id_cliente na consulta
        
        // Executa a consulta para buscar a chave API associada ao id_cliente
        const result = await sqlRequest.query(querySelect);

        // Verifica se a consulta retornou algum resultado (chave API existente)
        if (result.recordset.length > 0) {
            // Se uma chave API for encontrada, retorna a chave API encontrada no banco de dados
            const { api_key } = result.recordset[0];
            return response.json({ apiKey: api_key }); // Retorna a chave API com status 200
        } else {
            // Se nenhuma chave API for encontrada, gera uma nova chave API
            const newApiKey = generateApiKey(); // Chama a função que gera uma nova chave API
            
            // Consulta para buscar o nome do cliente usando o id_cliente
            const nomeClienteQuery = 'SELECT Nome FROM Clientes WHERE id_cliente = @id_cliente';
            const resultNomeCliente = await sqlRequest.query(nomeClienteQuery); // Executa a consulta para o nome do cliente

            // Verifica se o cliente existe no banco de dados
            if (resultNomeCliente.recordset.length === 0) {
                // Se o cliente não for encontrado, retorna um erro 404 (Not Found)
                return response.status(404).json({ mensagem: 'Cliente não encontrado' });
            }

            // Se o cliente for encontrado, obtém o nome do cliente da resposta
            const nomeCliente = resultNomeCliente.recordset[0].Nome;

            // Consulta para inserir a nova chave API no banco de dados
            const queryInsert = `
                INSERT INTO API_KEY (id_cliente, api_key, Nome_cliente)
                VALUES (@id_cliente, @api_key, @nome_cliente)
            `;
            sqlRequest.input('api_key', sql.VarChar, newApiKey); // Define o valor da chave API
            sqlRequest.input('nome_cliente', sql.VarChar, nomeCliente); // Define o nome do cliente

            // Executa a consulta de inserção da nova chave API no banco de dados
            await sqlRequest.query(queryInsert);

            // Retorna a nova chave API gerada com status 200
            return response.json({ apiKey: newApiKey });
        }

    } catch (error) {
        // Caso ocorra algum erro ao executar a consulta, captura o erro e retorna uma mensagem de erro genérica
        console.error('Erro ao executar consulta:', error.message); // Exibe o erro no console para depuração
        response.status(500).send('Erro ao executar consulta'); // Retorna um erro 500 (Internal Server Error) ao cliente
    }
}

// Exporta a função 'recuperar' para que ela possa ser utilizada em outros módulos.
module.exports = {
    recuperar
};