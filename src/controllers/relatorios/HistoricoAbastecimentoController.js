
const sql = require("mssql");

async function relatorio(request, response) {
  try {
    const { id_cliente, id_dm, data_inicio, data_final,id_operador} = request.body;

    if (!id_cliente) {
      return response.status(401).json("ID do cliente não enviado");
    }

    let params = { id_cliente };
    let query;
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
    if (id_dm && id_dm !== "") {
        query += ' AND dm.id_dm = @id_dm';
        params.id_dm = id_dm;
      }
  
      if (id_operador && id_operador !== "") {
        query += ' AND id_operador = @id_operador';
        params.id_operador = id_operador;
      }
    if (data_inicio && data_final) {
        query += ' AND Dia BETWEEN @data_inicio AND @data_final';
        params.data_inicio = new Date(data_inicio).toISOString();
        params.data_final = new Date(data_final).toISOString();
    } else if (data_inicio) {
        query += ' AND Dia >= @data_inicio';
        params.data_inicio = new Date(data_inicio).toISOString();
    } else if (data_final) {
        query += ' AND Dia <= @data_final';
        params.data_final = new Date(data_final).toISOString();
    }
    const dbRequest = new sql.Request();
    dbRequest.input('id_cliente', sql.Int, params.id_cliente);
        if (params.id_dm) dbRequest.input('id_dm', sql.Int, id_dm);
        if (params.id_operador) dbRequest.input('id_operador', sql.Int, params.id_operador);
        if (params.data_inicio) dbRequest.input('data_inicio', sql.DateTime, params.data_inicio);
        if (params.data_final) dbRequest.input('data_final', sql.DateTime, params.data_final);
    const result = await dbRequest.query(query);
    const itensFiltrados = result.recordset.map((row) => {
        let posicao;
        let modeloControladora;
    
        // Determinar a posição com base na controladora
        if (row.controladora === "2018") {
            posicao = ` ${row.placa} / ${row.motor1}`;
        } else if (row.controladora === "2023") {
            posicao = ` ${row.andar} / ${row.posicao}`;
        } else if (row.controladora === "Locker") {
            posicao = `${row.controladora} / $${row.posicao}`;
        } else {
            posicao = "Posição desconhecida";
        }
    
        // Modelo da controladora
        modeloControladora = row.controladora;
    
        // Retorno do objeto transformado
        return { 
            Nome_Produto: row.nome_produto,
            posicao:posicao,
            Operador: row.nome_usuario,
            login_operador: row.login_usuario,
            quantidade_abastecido: row.qtd_abastecido,
            Dia:row.dia,
            Maquina:row.nome_dm,
            id_maquina:row.id_dm
        };
    });
    response.status(200).json(itensFiltrados);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).json({
        message: "Erro ao executar consulta",
        error: error.message,
    });
  }
}

module.exports = {
  relatorio
};