const sql = require("mssql"); // Importa o módulo 'mssql' para interagir com o banco de dados SQL Server.

 /**
  * Função que gera um relatório de abastecimento de produtos de DM.
  * @param {Object} request - O objeto de requisição contendo os parâmetros necessários para a consulta.
  * @param {Object} response - O objeto de resposta utilizado para enviar os resultados ao cliente.
  * @returns {void} Envia a resposta com os dados do relatório ou um erro caso algo ocorra durante a consulta.
  */
async function relatorio(request, response) {
  try {
    // Desestruturação dos parâmetros recebidos na requisição.
    const { id_cliente, id_dm, data_inicio, data_final, id_operador } = request.body;

    // Verifica se o ID do cliente foi enviado. Caso contrário, retorna erro 401.
    if (!id_cliente) {
      return response.status(401).json("ID do cliente não enviado"); // Retorna erro 401 caso o ID do cliente não seja enviado.
    }

    // Cria um objeto para armazenar os parâmetros da consulta.
    let params = { id_cliente };
    let query;

    // Inicia a consulta SQL para obter as informações de abastecimento de produtos.
    query = `
    SELECT 
        a.id_cliente,
        a.id_dm,
        a.id_item,
        a.id_usuario_dm,
        a.dia,
        a.qtd_abastecido,
        d.nome AS nome_produto,
        d.controladora,
        d.placa,
        d.motor1,
        d.motor2,
        d.dip,
        d.andar,
        d.posicao,
        dm.identificacao AS nome_dm,
        u.nome AS nome_usuario,
        u.login AS login_usuario
    FROM 
        abastecimento a
    LEFT JOIN 
        dm_itens d ON a.id_item = d.id_item
    LEFT JOIN 
        usuarios_dm u ON a.id_usuario_dm = u.id
    LEFT JOIN 
        dms dm ON a.id_dm = dm.id_dm
    WHERE 
        a.id_cliente = @id_cliente
    `;

    // Verifica se o ID do DM foi enviado e, se sim, adiciona o filtro à consulta.
    if (id_dm && id_dm !== "") {
        query += ' AND id_dm = @id_dm'; // Adiciona o filtro de ID_DM à consulta SQL.
        params.id_dm = id_dm; // Adiciona o parâmetro 'id_dm' aos parâmetros da consulta.
    }

    // Verifica se o ID do operador foi enviado e, se sim, adiciona o filtro à consulta.
    if (id_operador && id_operador !== "") {
        query += ' AND id_operador = @id_operador'; // Adiciona o filtro de ID_Operador à consulta SQL.
        params.id_operador = id_operador; // Adiciona o parâmetro 'id_operador' aos parâmetros da consulta.
    }

    // Se 'data_inicio' e 'data_final' foram fornecidos, adiciona o filtro para o intervalo de datas.
    if (data_inicio && data_final) {
        query += ' AND Dia BETWEEN @data_inicio AND @data_final'; // Adiciona filtro de intervalo de datas.
        params.data_inicio = new Date(data_inicio).toISOString(); // Formata e adiciona 'data_inicio' aos parâmetros.
        params.data_final = new Date(data_final).toISOString(); // Formata e adiciona 'data_final' aos parâmetros.
    } else if (data_inicio) {
        query += ' AND Dia >= @data_inicio'; // Adiciona o filtro de data inicial.
        params.data_inicio = new Date(data_inicio).toISOString(); // Formata e adiciona 'data_inicio' aos parâmetros.
    } else if (data_final) {
        query += ' AND Dia <= @data_final'; // Adiciona o filtro de data final.
        params.data_final = new Date(data_final).toISOString(); // Formata e adiciona 'data_final' aos parâmetros.
    }

    // Cria um novo objeto de requisição SQL.
    const dbRequest = new sql.Request();
    dbRequest.input('id_cliente', sql.Int, params.id_cliente); // Adiciona o parâmetro 'id_cliente' à requisição SQL.

    // Condicionais para adicionar os parâmetros opcionais à requisição SQL.
    if (params.id_dm) dbRequest.input('id_dm', sql.Int, id_dm); // Adiciona o parâmetro 'id_dm' se fornecido.
    if (params.id_operador) dbRequest.input('id_operador', sql.Int, params.id_operador); // Adiciona o parâmetro 'id_operador' se fornecido.
    if (params.data_inicio) dbRequest.input('data_inicio', sql.DateTime, params.data_inicio); // Adiciona o parâmetro 'data_inicio' se fornecido.
    if (params.data_final) dbRequest.input('data_final', sql.DateTime, params.data_final); // Adiciona o parâmetro 'data_final' se fornecido.

    // Executa a consulta SQL no banco de dados.
    const result = await dbRequest.query(query);

    // Mapeia o resultado da consulta para a estrutura desejada de objetos.
    const itensFiltrados = result.recordset.map((row) => {
        let posicao; // Variável para armazenar a posição do produto.
        let modeloControladora; // Variável para armazenar o modelo da controladora.

        // Determina a posição com base na controladora.
        if (row.controladora === "2018") {
            posicao = ` ${row.placa} / ${row.motor1}`; // Para a controladora 2018, utiliza a placa e o motor1.
        } else if (row.controladora === "2023") {
            posicao = ` ${row.andar} / ${row.posicao}`; // Para a controladora 2023, utiliza o andar e a posição.
        } else if (row.controladora === "Locker") {
            posicao = `${row.controladora} / $${row.posicao}`; // Para a controladora Locker, utiliza a controladora e a posição.
        } else {
            posicao = "Posição desconhecida"; // Para controladoras desconhecidas, define "Posição desconhecida".
        }

        // Define o modelo da controladora.
        modeloControladora = row.controladora;

        // Retorna um objeto transformado com as informações desejadas.
        return { 
            Nome_Produto: row.nome_produto, // Nome do produto.
            posicao: posicao, // Posição do produto.
            Operador: row.nome_usuario, // Nome do operador.
            login_operador: row.login_usuario, // Login do operador.
            quantidade_abastecido: row.qtd_abastecido, // Quantidade abastecida.
            Dia: row.dia, // Data e hora do abastecimento.
            Maquina: row.nome_dm, // Nome da máquina.
            id_maquina: row.id_dm // ID da máquina.
        };
    });

    // Envia os dados filtrados como resposta no formato JSON.
    response.status(200).json(itensFiltrados); // Retorna os dados com status 200.

  } catch (error) {
    // Se ocorrer um erro durante a execução da consulta, captura o erro e envia a mensagem de erro.
    console.error("Erro ao executar consulta:", error.message); // Exibe o erro no console.
    response.status(500).json({
        message: "Erro ao executar consulta", // Mensagem de erro genérica.
        error: error.message, // Mensagem detalhada do erro.
    }); // Retorna o erro com status 500.
  }
}

// Exporta a função 'relatorio' para que possa ser usada em outros módulos.
module.exports = {
  relatorio
};
