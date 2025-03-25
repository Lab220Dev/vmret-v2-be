
const sql = require("mssql"); // Importa a biblioteca 'mssql' para trabalhar com o SQL Server

async function relatorio(request, response) {
  try {
    // Extrai os parâmetros fornecidos no corpo da requisição
    const { id_cliente, id_dm, data_inicio, data_final, id_operador } = request.body;

    // Valida se o id_cliente foi fornecido, se não, retorna erro
    if (!id_cliente) {
      return response.status(401).json("ID do cliente não enviado");
    }

    // Inicializa os parâmetros que serão usados na consulta
    let params = { id_cliente };
    let query;

    // Definindo a consulta SQL básica
    query = `
    SELECT 
        a.id_cliente,
        a.id_dm,
        a.id_item,
        a.id_usuario_dm,
        CONVERT(NVARCHAR, a.dia, 120) AS dia, 
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
 // Se o id_dm foi fornecido, adiciona um filtro para o id_dm
 if (id_dm && id_dm !== "") {
    query += ' AND dm.id_dm = @id_dm';
    params.id_dm = id_dm;
}

// Se o id_operador foi fornecido, adiciona um filtro para o id_operador
if (id_operador && id_operador !== "") {
    query += ' AND id_operador = @id_operador';
    params.id_operador = id_operador;
}

// Se as datas de início e fim foram fornecidas, adiciona um filtro de data
if (data_inicio && data_final) {
    query += ' AND Dia BETWEEN @data_inicio AND @data_final';
    params.data_inicio = new Date(data_inicio).toISOString(); // Converte as datas para o formato ISO
    params.data_final = new Date(data_final).toISOString();
} else if (data_inicio) {
    query += ' AND Dia >= @data_inicio'; // Se apenas a data de início for fornecida
    params.data_inicio = new Date(data_inicio).toISOString();
} else if (data_final) {
    query += ' AND Dia <= @data_final'; // Se apenas a data final for fornecida
    params.data_final = new Date(data_final).toISOString();
}

// Cria uma nova requisição SQL
const dbRequest = new sql.Request();

// Define os parâmetros da consulta SQL com base nos valores fornecidos
dbRequest.input('id_cliente', sql.Int, params.id_cliente);
if (params.id_dm) dbRequest.input('id_dm', sql.Int, id_dm);
if (params.id_operador) dbRequest.input('id_operador', sql.Int, params.id_operador);
if (params.data_inicio) dbRequest.input('data_inicio', sql.DateTime, params.data_inicio);
if (params.data_final) dbRequest.input('data_final', sql.DateTime, params.data_final);

// Executa a consulta SQL
const result = await dbRequest.query(query);

// Mapeia o resultado da consulta para formatar os dados conforme necessário
const itensFiltrados = result.recordset.map((row) => {
    let posicao;
    let modeloControladora;

    // Determina a posição com base na controladora
    if (row.controladora === "2018") {
        posicao = ` ${row.placa} / ${row.motor1}`;
    } else if (row.controladora === "2023") {
        posicao = ` ${row.andar} / ${row.posicao}`;
    } else if (row.controladora === "Locker") {
        posicao = `${row.controladora} / $${row.posicao}`;
    } else {
        posicao = "Posição desconhecida"; // Se a controladora não for uma das esperadas
    }

    // Modelo da controladora (simplesmente define o valor de controladora no campo modeloControladora)
    modeloControladora = row.controladora;

    // Retorna o objeto transformado com os dados desejados
    return { 
        Nome_Produto: row.nome_produto, // Nome do produto
        posicao: posicao,               // Posição do produto
        Operador: row.nome_usuario,     // Nome do operador
        login_operador: row.login_usuario, // Login do operador
        quantidade_abastecido: row.qtd_abastecido, // Quantidade abastecida
        Dia: row.dia,                   // Data do abastecimento
        Maquina: row.nome_dm,           // Nome da máquina (DM)
        id_maquina: row.id_dm           // ID da máquina (DM)
    };
});

// Retorna a resposta com os dados processados
response.status(200).json(itensFiltrados);
} catch (error) {
// Em caso de erro, exibe o erro no console e retorna uma resposta de erro
console.error("Erro ao executar consulta:", error.message);
response.status(500).json({
    message: "Erro ao executar consulta",
    error: error.message, // Inclui a mensagem de erro para diagnóstico
});
}
}

module.exports = {
relatorio // Exporta a função relatorio para ser usada em outros arquivos
};