const sql = require('mssql'); // Importa o módulo mssql para trabalhar com SQL Server
const { format } = require('date-fns'); // Importa a função de formatação de data da biblioteca date-fns
const { logQuery } = require("../../utils/logUtils"); // Importa o utilitário logQuery para registrar logs da execução da consulta

/**
 * Função responsável por gerar o relatório de retiradas.
 * 
 * @param {Object} request - O objeto de requisição HTTP.
 * @param {Object} response - O objeto de resposta HTTP.
 * @returns {Promise<void>} - Retorna a resposta com os dados ou erro gerado.
 */
async function relatorio(request, response) {
    try {
        // Desestruturação dos parâmetros recebidos no corpo da requisição
        const { id_dm = '', id_funcionario = '', data_inicio, data_final, id_cliente, id_usuario } = request.body;

        // Verifica se o ID do cliente foi fornecido
        if (!id_cliente) {
            // Retorna resposta 401 (não autorizado) caso o ID do cliente não seja enviado
            return response.status(401).json("ID do cliente não enviado");
        }

        // Inicia a construção da query SQL
        let query = `
            SELECT  
                r.ID_Retirada,
                r.ID_DM_Retirada,
                r.ID_DM,
                r.ID_Cliente,
                r.ID_Funcionario,
                r.Forma_Autenticacao,
                r.Autenticacao,
                r.Dia,
                r.Deleted,
                r.Sincronizado,
                ri.ID_Retirada_Item,
                ri.Transacao,
                ri.Porta,
                ri.DIP,
                ri.Andar,
                ri.Posicao,
                ri.Mola,
                ri.ProdutoID,
                ri.ProdutoNome,
                ri.ProdutoSKU,
                ri.Quantidade,
                ri.Retorno,
                f.matricula,
                f.nome,
                f.email,
                dm.Identificacao AS DM_Identificacao
            FROM
                DM_Retiradas r
            INNER JOIN
                DM_Retirada_itens ri ON r.ID_DM_Retirada = ri.id_retirada
            LEFT JOIN
                funcionarios f ON r.ID_Funcionario = f.id_funcionario
            LEFT JOIN
                DMs dm ON r.ID_DM = dm.ID_DM
            WHERE
                r.ID_Cliente = @id_cliente AND r.Sincronizado = 1
        `;
      
        // Cria o objeto de parâmetros que será enviado para a consulta SQL
        let params = { id_cliente };

        // Verifica se o ID do DM foi fornecido e adiciona à query
        if (id_dm) {
            query += ' AND r.ID_DM = @id_dm';
            params.id_dm = id_dm;
        }

        // Verifica se o ID do funcionário foi fornecido e adiciona à query
        if (id_funcionario) {
            query += ' AND r.ID_Funcionario = @id_funcionario';
            params.id_funcionario = id_funcionario;
        }
        
        // Verifica se as datas de início e fim foram fornecidas
        if (data_inicio && data_final) {
            // Adiciona condição para filtrar entre as duas datas
            query += ' AND r.Dia BETWEEN @data_inicio AND @data_final';
            params.data_inicio = new Date(data_inicio).toISOString(); // Converte para o formato ISO
            params.data_final = new Date(data_final).toISOString(); // Converte para o formato ISO
        } else if (data_inicio) {
            // Adiciona condição para filtrar a partir da data de início
            query += ' AND r.Dia >= @data_inicio';
            params.data_inicio = new Date(data_inicio).toISOString();
        } else if (data_final) {
            // Adiciona condição para filtrar até a data final
            query += ' AND r.Dia <= @data_final';
            params.data_final = new Date(data_final).toISOString();
        }

        // Cria um objeto de requisição SQL
        request = new sql.Request();

        // Define os parâmetros de entrada para a consulta SQL
        request.input('id_cliente', sql.Int, params.id_cliente);
        if (params.id_dm) request.input('id_dm', sql.Int, id_dm.toString()); // Define o ID do DM se fornecido
        if (params.id_funcionario) request.input('id_funcionario', sql.Int, params.id_funcionario); // Define o ID do funcionário
        if (params.data_inicio) request.input('data_inicio', sql.DateTime, params.data_inicio); // Define a data de início
        if (params.data_final) request.input('data_final', sql.DateTime, params.data_final); // Define a data final
        
        // Executa a consulta SQL
        const result = await request.query(query);

        // Mapeia os resultados da consulta para o formato desejado
        const retiradasfiltradas = result.recordset.map(row => ({
          ID_Retirada: row.ID_Retirada,
          ID_DM_Retirada: row.ID_DM_Retirada,
          ID_DM: row.ID_DM,
          ID_Cliente: row.ID_Cliente,
          ID_Funcionario: row.ID_Funcionario,
          Matricula: row.matricula,
          Nome: row.nome,
          Email: row.email,
          Dia: new Date(row.Dia).toDateString(), // Converte a data para um formato legível
          ProdutoID: row.ProdutoID,
          ProdutoNome: row.ProdutoNome,
          ProdutoSKU: row.ProdutoSKU,
          Quantidade: row.Quantidade,
          Identificacao: row.DM_Identificacao
        }));

        // Log de sucesso na geração do relatório
        logQuery('info', `Usuário ${id_usuario} gerou um relatório de retiradas`, 'sucesso', 'Relatório', id_cliente, id_usuario, query, params);
        
        // Retorna os dados das retiradas filtradas no formato JSON
        return response.status(200).json(retiradasfiltradas);

    } catch (error) {
        // Log de falha ao gerar o relatório
        logQuery('error', `Erro ao gerar o relatório para o usuário ${id_usuario}: ${error.message}`, 'falha', 'Relatório', id_cliente, id_usuario, query, {});
        
        // Exibe o erro no console e retorna resposta com código 500 (erro interno)
        console.error('Erro ao executar consulta:', error.message);
        return response.status(500).send('Erro ao executar consulta');
    }
}

/**
 * Função para listar os DM (documentos) associados a um cliente.
 * 
 * @param {Object} request - O objeto de requisição HTTP.
 * @param {Object} response - O objeto de resposta HTTP.
 * @returns {Promise<void>} - Retorna a resposta com os dados ou erro gerado.
 */
async function listarDM(request, response) {
    try {
      const id_cliente = request.body.id_cliente; // Obtém o ID do cliente enviado no corpo da requisição
  
      // Verifica se o ID do cliente foi fornecido
      if (!id_cliente) {
        // Retorna resposta 401 (não autorizado) caso o ID do cliente não seja enviado
        response.status(401).json("ID do cliente não enviado");
        return;
      }

      // Query para buscar os DM não deletados do cliente
      const query =
        "SELECT  *  FROM DMS WHERE ID_Cliente = @id_cliente AND Deleted = 0";
  
      // Cria o objeto de requisição SQL
      request = new sql.Request();
      // Define o parâmetro do cliente para a consulta SQL
      request.input("id_cliente", sql.Int, id_cliente);

      // Executa a consulta SQL
      const result = await request.query(query);

      // Mapeia os resultados da consulta para o formato desejado
      const retiradasfiltradas = result.recordset.map(row => ({
        ID_DM: row.ID_DM,
        ID_Cliente: row.IDcliente,
        Identificacao: row.Identificacao,
        Numero: row.Numero
    }));

      // Retorna os dados dos DM não deletados em formato JSON
      response.status(200).json(retiradasfiltradas);
    } catch (error) {
      // Exibe o erro no console e retorna resposta com código 500 (erro interno)
      console.error("Erro ao executar consulta:", error.message);
      response.status(500).send("Erro ao executar consulta");
    }
  }

module.exports = {
    relatorio, listarDM // Exporta as funções para serem utilizadas em outros módulos
};
