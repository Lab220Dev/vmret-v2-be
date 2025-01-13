/**
 * Importa o módulo `mssql`, que é utilizado para executar consultas no banco de dados SQL.
 */
const sql = require('mssql');

/**
 * Função assíncrona para salvar ou atualizar um registro de "Ficha_Retirada" no banco de dados.
 * @param {Object} request - O objeto que contém os dados enviados na requisição.
 * @param {Object} response - O objeto usado para enviar a resposta de volta ao cliente.
 */
async function Salvar(request, response) {
    // Desestrutura os dados enviados na requisição, incluindo id_cliente, texto e id_usuario.
    const { id_cliente, texto, id = "", id_usuario } = request.body;

    try {
        // Desestrutura o id_cliente e o Texto do corpo da requisição.
        const { id_cliente, Texto } = request.body;

        // Se o id_cliente não for enviado, retorna um erro 401.
        if (!id_cliente) {
            return response.status(401).json("ID do cliente não enviado");
        }   

        // Cria uma nova requisição para interagir com o banco de dados.
        const dbRequest = new sql.Request();

        // Define os parâmetros para a consulta SQL.
        dbRequest.input('ID_Cliente', sql.Int, id_cliente); // Define o parâmetro ID_Cliente como inteiro.
        dbRequest.input('Texto', sql.NText, Texto); // Define o parâmetro Texto como NText (tipo de dado longo).

        // Consulta SQL para verificar se já existe um registro para o id_cliente.
        const checkQuery = `SELECT ID FROM Ficha_Retirada WHERE ID_Cliente = @ID_Cliente`;
        const checkResult = await dbRequest.query(checkQuery);

        let query; // Variável que armazenará a query final (INSERT ou UPDATE).

        // Se o cliente já tiver um registro, realiza a atualização.
        if (checkResult.recordset.length > 0) {
            // Define a query de atualização.
            query = `UPDATE Ficha_Retirada
                     SET Texto = @Texto
                     WHERE ID_Cliente = @ID_Cliente`;
        } else {
            // Caso contrário, cria um novo registro.
            query = `INSERT INTO Ficha_Retirada (ID_Cliente, Texto)
                     VALUES (@ID_Cliente, @Texto);`;
        }

        // Executa a query de inserção ou atualização.
        const result = await dbRequest.query(query);

        // Retorna a resposta com o resultado da consulta.
        response.status(200).json(result.recordset); // Envia os dados da ficha retirada no corpo da resposta.
    } catch (error) {
        // Se ocorrer um erro durante a execução da consulta, exibe uma mensagem de erro no console e retorna um erro 500.
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

/**
 * Função assíncrona para recuperar os dados de uma "Ficha_Retirada" no banco de dados.
 * @param {Object} request - O objeto que contém os dados enviados na requisição.
 * @param {Object} response - O objeto usado para enviar a resposta de volta ao cliente.
 */
async function Recuperar(request, response) {
    try {
        // Desestrutura os dados enviados na requisição.
        const { id_cliente, id = "" } = request.body;

        // Se o id_cliente não for enviado, retorna um erro 401.
        if (!id_cliente) {
            return response.status(401).json("ID do cliente não enviado");
        }

        // Define a consulta SQL para recuperar os dados da Ficha_Retirada.
        const query = `
            SELECT * FROM Ficha_Retirada 
            WHERE id_cliente = @id_cliente 
        `;
        
        // Exibe no console a query que será executada (para fins de depuração).
        console.log(query)

        // Cria uma nova requisição para interagir com o banco de dados.
        const dbRequest = new sql.Request();

        // Define os parâmetros para a consulta SQL.
        dbRequest.input('id_cliente', sql.Int, id_cliente); // Define o parâmetro id_cliente como inteiro.
        dbRequest.input('id', sql.Int, id); // Define o parâmetro id como inteiro (não utilizado na query, mas passado como parâmetro).

        // Executa a consulta SQL.
        const result = await dbRequest.query(query);

        // Retorna os resultados da consulta no formato JSON.
        response.status(200).json(result.recordset); // Envia os dados encontrados no corpo da resposta.
    } catch (error) {
        // Se ocorrer um erro durante a execução da consulta, exibe uma mensagem de erro no console e retorna um erro 500.
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

/**
 * Exporta as funções Salvar e Recuperar para que possam ser utilizadas em outros módulos.
 */
module.exports = {
    Salvar, // Exporta a função Salvar.
    Recuperar // Exporta a função Recuperar.
};
