const sql = require('mssql');  // Importa o módulo `mssql` para executar consultas SQL no banco de dados.
const { logQuery } = require('../../utils/logUtils'); // Importa a função `logQuery` para registrar logs de consultas SQL.

/**
 * Função assíncrona para listar plantas no banco de dados.
 * Verifica se o ID do cliente foi enviado e retorna as plantas correspondentes.
 * @param {Object} request - O objeto que contém os dados da requisição, incluindo o ID do cliente.
 * @param {Object} response - O objeto usado para enviar a resposta de volta ao cliente.
 */
async function listar(request, response) {
    try {
        // Consulta inicial para selecionar todas as plantas que não estão marcadas como deletadas.
        let query = 'SELECT * FROM plantas WHERE deleted = 0';
        
        // Verifica se o ID do cliente foi enviado na requisição.
        if (request.body.id_cliente) {
            // Se o ID do cliente foi enviado, adiciona uma condição à consulta.
            query += ` AND id_cliente = '${request.body.id_cliente}'`;
            request = new sql.Request(); // Cria uma nova requisição SQL.
            
            // Executa a consulta no banco de dados e obtém o resultado.
            const result = await request.query(query);
            
            // Retorna os dados das plantas como resposta no formato JSON.
            response.status(200).json(result.recordset);  // Envia as plantas encontradas para o cliente.
            return;
        }

        // Se o ID do cliente não for enviado, retorna um erro 401.
        response.status(401).json("ID do cliente não enviado");
    } catch (error) {
        // Em caso de erro, exibe a mensagem de erro no console e envia um erro 500 para o cliente.
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

/**
 * Função assíncrona para listar plantas de forma simplificada (apenas ID e nome).
 * @param {Object} request - O objeto que contém os dados da requisição, incluindo o ID do cliente.
 * @param {Object} response - O objeto usado para enviar a resposta de volta ao cliente.
 */
async function listaSimlpes(request, response) {
    try {
        // Consulta inicial para selecionar ID e nome das plantas que não estão marcadas como deletadas.
        let query = 'SELECT id_planta, nome FROM plantas WHERE deleted = 0';
        
        // Verifica se o ID do cliente foi enviado na requisição.
        if (request.body.id_cliente) {
            // Se o ID do cliente foi enviado, adiciona uma condição à consulta.
            query += ` AND id_cliente = '${request.body.id_cliente}'`;
            request = new sql.Request(); // Cria uma nova requisição SQL.
            
            // Executa a consulta no banco de dados e obtém o resultado.
            const result = await request.query(query);
            
            // Retorna os dados das plantas simplificados (apenas ID e nome) como resposta no formato JSON.
            response.status(200).json(result.recordset); // Envia os resultados para o cliente.
            return;
        }

        // Se o ID do cliente não for enviado, retorna um erro 401.
        response.status(401).json("ID do cliente não enviado");
    } catch (error) {
        // Em caso de erro, exibe a mensagem de erro no console e envia um erro 500 para o cliente.
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

/**
 * Função assíncrona para adicionar uma nova planta no banco de dados.
 * @param {Object} request - O objeto que contém os dados da requisição, incluindo os dados da planta a ser adicionada.
 * @param {Object} response - O objeto usado para enviar a resposta de volta ao cliente.
 */
async function adicionar(request, response) {
    // Desestrutura os dados enviados na requisição (dados da planta).
    const { codigo, nome, userId = '', senha = '', urlapi = '', clienteid = '' } = request.body;
    
    // Recupera o ID do cliente e ID do usuário da requisição.
    const id_cliente = request.body.id_cliente;
    const id_usuario = request.body.id_usuario;  

    // Query SQL para inserir uma nova planta no banco de dados.
    const query = `INSERT INTO plantas (id_cliente, codigo, nome, userId, senha, urlapi, clientid , deleted)
     VALUES (@id_cliente, @codigo, @nome, @userId, @senha, @urlapi, @clientid, @deleted)`;

    // Parâmetros que serão passados para a consulta SQL.
    const params = {
        id_cliente: id_cliente,
        codigo: codigo,
        nome: nome,
        deleted: false, // Marca a planta como não deletada.
        userId: userId,
        senha: senha,
        urlapi: urlapi,
        clientid: clienteid,
    };

    try {
        request = new sql.Request(); // Cria uma nova requisição SQL.
        
        // Define os parâmetros que serão usados na consulta SQL.
        request.input('id_cliente', sql.Int, id_cliente);
        request.input('codigo', sql.NVarChar, codigo);
        request.input('nome', sql.VarChar, nome);
        request.input('deleted', sql.Bit, false);  // Define 'deleted' como false.
        request.input('userId', sql.NVarChar, userId);
        request.input('senha', sql.NVarChar, senha);
        request.input('urlapi', sql.NVarChar, urlapi);
        request.input('clientid', sql.NVarChar, clienteid);

        // Executa a consulta para adicionar a planta.
        const result = await request.query(query);

        // Se a planta for adicionada com sucesso, retorna uma resposta de sucesso.
        if (result.rowsAffected[0] > 0) {
            response.status(201).send('Planta criada com sucesso!');
            return;
        } else {
            response.status(400).send('Falha ao criar a Planta');
        }
    } catch (error) {
        // Se houver um erro, exibe a mensagem de erro no console e retorna um erro 500.
        const errorMessage = error.message.includes('Query não fornecida para logging')
            ? 'Erro crítico: Falha na operação'
            : `Erro ao adicionar Planta: ${error.message}`;
        // logQuery('error', errorMessage, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
        console.error('Erro ao adicionar Planta:', error.message);
        response.status(500).send('Erro ao adicionar Planta');
    }
}

/**
 * Função assíncrona para atualizar os dados de uma planta no banco de dados.
 * @param {Object} request - O objeto que contém os dados da requisição, incluindo os dados da planta a ser atualizada.
 * @param {Object} response - O objeto usado para enviar a resposta de volta ao cliente.
 */
async function atualizar(request, response) {
    // Desestrutura os dados enviados na requisição (dados da planta).
    const { codigo, nome, userId, senha, urlapi, clienteid, id_planta } = request.body;

    // Recupera o ID do cliente e ID do usuário da requisição.
    const id_cliente = request.body.id_cliente;
    const id_usuario = request.body.id_usuario;

    // Query SQL para atualizar os dados de uma planta no banco de dados.
    const query = `UPDATE plantas 
    SET id_cliente = @id_cliente,
    codigo = @codigo,
    nome = @nome,
    userId = @userid,
    senha = @senha,
    urlapi = @urlapi,
    clientid = @clientid
    WHERE id_planta = @id_planta`;

    // Parâmetros que serão passados para a consulta SQL.
    const params = {
        id_cliente: id_cliente,
        codigo: codigo,
        nome: nome,
        userId: userId,
        senha: senha,
        urlapi: urlapi,
        clientid: clienteid,
        id_planta: id_planta
    };

    try {
        request = new sql.Request(); // Cria uma nova requisição SQL.
        
        // Define os parâmetros que serão usados na consulta SQL.
        request.input('id_cliente', sql.Int, id_cliente);
        request.input('codigo', sql.NVarChar, codigo);
        request.input('nome', sql.VarChar, nome);
        request.input('userId', sql.NVarChar, userId);
        request.input('senha', sql.NVarChar, senha);
        request.input('urlapi', sql.NVarChar, urlapi);
        request.input('clientid', sql.NVarChar, clienteid);
        request.input('id_planta', sql.Int, id_planta);

        // Executa a consulta para atualizar a planta.
        const result = await request.query(query);

        // Se a planta for atualizada com sucesso, retorna uma resposta de sucesso.
        if (result.rowsAffected && result.rowsAffected[0] > 0) {
            // logQuery('info', `O usuário ${id_usuario} atualizou o Centro de Custo ${ID_CentroCusto}`, 'sucesso', 'UPDATE', id_cliente, id_usuario, query, params);
            response.status(200).json("Produto atualizado com sucesso");
        } else {
            // logQuery('error', `Usuário ${id_usuario} tentou atualizar o Centro ${ID_CentroCusto}, mas sem sucesso.`, 'Falha', 'UPDATE', id_cliente, id_usuario, query, params);
            response.status(400).json("Erro ao atualizar o Produto");
        }
    } catch (error) {
        // logQuery('error', ` ${error.message}`, 'erro', 'UPDATE', id_cliente, id_usuario, query, params);
        console.error('Erro ao adicionar Planta:', error.message);
        response.status(500).send('Erro ao adicionar Planta');
    }
}

async function deletePlanta(request, response) {
    let query =
        "UPDATE Plantas SET deleted = 1 WHERE id_planta = @id_planta";
    const id_planta = request.body.id_planta;
  
    console.log("Recebido no corpo da requisição:", id_planta);  // Log para ver o conteúdo da requisição

    if (!id_planta || !request.body.id_planta) {
        console.log("ID da planta não encontrado no corpo da requisição");
        return response.status(400).send("ID da planta não foi enviado");
    }

    const params = {
          id_planta: id_planta,
      };
    try {
      if (id_planta) {
        const sqlRequest = new sql.Request();
        sqlRequest.input("id_planta", sql.Int, id_planta);
        const result = await sqlRequest.query(query);
        if (result.rowsAffected[0] > 0) {
          // logQuery('info', `O usuário ${id_usuario} deletou o Centro de Custo ${id_setor}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);
          response.status(200).json(result.recordset);
        } else {
          //  logQuery('error', `Erro ao excluir: ${id_setor} não encontrado.`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
          response
            .status(400)
            .send("Nenhuma alteração foi feita no centro de custo.");
        }
      }
    } catch (error) {
      response.status(500).send("Erro ao excluir");
    }
  }
/**
 * Exporta as funções para que possam ser usadas em outros módulos.
 */
module.exports = {
    adicionar,  // Função para adicionar uma nova planta.
    listar,     // Função para listar as plantas.
    atualizar,  // Função para atualizar uma planta.
    listaSimlpes, // Função para listar plantas de forma simplificada.
    deletePlanta
};
