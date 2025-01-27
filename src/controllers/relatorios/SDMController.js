const sql = require("mssql"); // Importa o módulo 'mssql' para interagir com o banco de dados SQL Server
const { logQuery } = require("../../utils/logUtils");
const {  format } = require('date-fns-tz');

/**
 * Função para gerar um relatório baseado nos parâmetros fornecidos (id_cliente, id_dm, dia).
 * @param {Object} request - O objeto de requisição que contém os parâmetros no corpo.
 * @param {Object} response - O objeto de resposta usado para enviar os dados de volta ao cliente.
 * @returns {void} Retorna os dados solicitados ou uma mensagem de erro dependendo do fluxo.
 */
async function relatorio(request, response) {
  try {
    const { id_cliente, id_dm, dia, id_usuario } = request.body;

    if (!id_cliente) {
      return response.status(401).json("ID do cliente não enviado");
    }

    if (!dia || isNaN(new Date(dia))) {
      return response.status(400).json("Parâmetro 'dia' é inválido ou não foi enviado");
    }

    const currentDate = new Date(dia);

    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const dbRequest = new sql.Request();
    dbRequest.input("id_cliente", sql.Int, id_cliente);
    dbRequest.input("startOfDay", sql.DateTime, startOfDay);
    dbRequest.input("endOfDay", sql.DateTime, endOfDay);

    let query;
    const params = { id_cliente, startOfDay: startOfDay.toISOString(), endOfDay: endOfDay.toISOString() };

    if (id_dm === null || id_dm === undefined) {
      query = `
        SELECT 
          ds.ID,
          ds.ID_DM,
          ds.id_cliente,
          ds.status,
          CONVERT(NVARCHAR, ds.dataHora, 120) AS dataHora,
          ds.Sincronizado,
          dms.Identificacao 
        FROM 
          DM_status ds
        Join 
          DMs
        ON
          ds.ID_DM = dms.ID_DM
        WHERE 
          id_cliente = @id_cliente 
          AND dataHora BETWEEN @startOfDay AND @endOfDay
        ORDER BY ID DESC
      `;
    } else {
      query = `
      SELECT 
        ds.ID_DM, 
        ds.ID, 
        d.Identificacao, 
       CONVERT(NVARCHAR, ds.dataHora, 120) AS dataHora,  
        ds.status
      FROM DM_Status ds
      INNER JOIN DMs d ON ds.id_dm = d.ID_DM
      WHERE ds.id_cliente = @id_cliente 
        AND ds.dataHora BETWEEN @startOfDay AND @endOfDay
      ORDER BY ds.ID DESC
      `;
      dbRequest.input("ID_DM", sql.Int, id_dm);
      params.id_dm = id_dm;
    }

    const result = await dbRequest.query(query);

    // Log de sucesso ao gerar o relatório
    logQuery(
      'info',
      `Usuário ${id_usuario} gerou um relatório SDM`,
      'sucesso',
      'Relatório SDM',
      id_cliente,
      id_usuario,
      query,
      params
    );

    response.status(200).json(result.recordset);
  } catch (error) {
    console.error("Erro ao executar consulta:", error);
    response.status(500).json({ error: "Erro ao processar a solicitação." });
  }
}


/**
 * Função para obter um resumo de dados com base no id_cliente.
 * @param {Object} request - O objeto de requisição que contém o id_cliente no corpo.
 * @param {Object} response - O objeto de resposta usado para enviar os dados de volta ao cliente.
 * @returns {void} Retorna os dados organizados para gráfico ou uma mensagem de erro.
 */
async function obterDadosResumo(request, response) {
  try {
    // Extrai o id_cliente da requisição
    const { id_cliente } = request.body;

    // Verifica se o id_cliente foi fornecido
    if (!id_cliente) {
      // Retorna um erro 400 (Bad Request) se id_cliente não foi enviado
      return response.status(400).json({ error: "ID do cliente não enviado" });
    }

    // Calcula o horário atual e o horário das últimas 3 horas
    const agora = new Date();
    const tresHorasAtras = new Date(agora.getTime() - 3 * 60 * 60 * 1000); // Últimas 3 horas

    // Cria um novo objeto de requisição SQL
    const dbRequest = new sql.Request();

    // Define os parâmetros da requisição SQL
    dbRequest.input("id_cliente", sql.Int, id_cliente);
    dbRequest.input("tresHorasAtras", sql.DateTime, tresHorasAtras);
    dbRequest.input("agora", sql.DateTime, agora);

    // Obtem todas as DMs associadas ao cliente que não foram deletadas
    const dmsResult = await dbRequest.query(`
      SELECT ID_DM, Identificacao
      FROM DMs 
      WHERE id_cliente = @id_cliente
      AND Deleted = 0 
    `);

    // Organiza as DMs em um array
    const dms = dmsResult.recordset.map((dm) => ({
      id: dm.ID_DM,
      nome: dm.Identificacao,
    }));

    // Verifica se o cliente não tem DMs associadas
    if (dms.length === 0) {
      // Se nenhuma DM for encontrada, retorna um status 204 (No Content) com uma mensagem
      return response
        .status(204)
        .json({ message: "Nenhuma DM encontrada para este cliente." });
    }

    // Consulta os status das DMs nas últimas 3 horas
    const query = `
      SELECT 
          ID_DM,
          FORMAT(DATEADD(MINUTE, (DATEDIFF(MINUTE, 0, dataHora) / 30) * 30, 0), 'HH:mm') AS intervalo,
          status,
          COUNT(*) AS total
      FROM DM_status
      WHERE 
          id_cliente = @id_cliente
          AND ID_DM IN (${dms.map((dm) => dm.id).join(",")})
          AND dataHora >= @tresHorasAtras
          AND dataHora <= @agora
      GROUP BY 
          ID_DM,
          FORMAT(DATEADD(MINUTE, (DATEDIFF(MINUTE, 0, dataHora) / 30) * 30, 0), 'HH:mm'),
          status
      ORDER BY 
          ID_DM, intervalo;
    `;

    // Executa a consulta
    const result = await dbRequest.query(query);

    // Gera os intervalos de 30 minutos para as últimas 3 horas
    const intervalos = [];
    const currentInterval = new Date(tresHorasAtras);

    // Preenche os intervalos de tempo de 30 minutos
    while (currentInterval <= agora) {
      intervalos.push(currentInterval.toTimeString().slice(0, 5)); // Adiciona o intervalo no formato HH:mm
      currentInterval.setMinutes(currentInterval.getMinutes() + 30); // Avança 30 minutos
    }

    // Organiza os dados no formato para o gráfico
    const datasets = dms.map((dm) => {
      const data = Array(intervalos.length).fill("Offline"); // Inicializa com 'Offline' em todos os intervalos

      // Atualiza os intervalos com o status correto
      intervalos.forEach((intervalo, index) => {
        const registro = result.recordset.find(
          (r) => r.ID_DM === dm.id && r.intervalo === intervalo
        );

        if (registro) {
          // Atualiza o status para 'Online' ou 'Offline' com base no status retornado
          data[index] = registro.status === "Conectado" ? "Online" : "Offline";
        }
      });

      // Retorna o dataset para o gráfico com as cores apropriadas
      return {
        label: dm.nome,
        data: data,
        fill: false,
        backgroundColor: getColor("Conectado"),
        borderColor: getRandomWarmColor("Desconectado"),
        tension: 0.4,
      };
    });

    // Organiza os dados finais para o gráfico
    const lineData = {
      labels: intervalos,
      datasets: datasets,
    };

    // Retorna os dados organizados para o gráfico
    response.status(200).json(lineData);
  } catch (error) {
    // Caso ocorra algum erro durante a execução, retorna erro 500 (Internal Server Error)
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para definir as cores com base no status
 * @param {string} status - O status da DM (Conectado ou Desconectado)
 * @returns {string} A cor correspondente ao status.
 */
function getColor(status) {
  const colorMap = {
    Conectado: "#17202a", // Cor para "Conectado"
    Desconectado: "#00bb7e", // Cor para "Desconectado"
  };
  return colorMap[status] || "#888888"; // Retorna a cor padrão se não encontrado
}

/**
 * Paleta de cores para o gráfico (cores quentes).
 */
const ColorPalette = [
  "#e51e1e", // Vermelho 1
  "#e5501e", // Vermelho 2
  "#e5821e", // Vermelho 3
  "#138f13", // Verde 1
  "#1ee51e", // Verde 2 -
  "#1e1ee5", // Azul
  "#1e88e5", // Azul claro
];

const usedColors = []; // Variável para controlar as cores já usadas

/**
 * Função para obter uma cor aleatória da paleta de cores quentes.
 * @returns {string} Uma cor aleatória da paleta, ou null quando todas as cores forem usadas.
 */
function getRandomWarmColor() {
  // Se todas as cores da paleta já foram usadas, limpa o histórico de cores usadas
  if (usedColors.length === ColorPalette.length) {
    usedColors.length = 0;
    return null;
  }

  let color;
  do {
    color = ColorPalette[Math.floor(Math.random() * ColorPalette.length)]; // Escolhe uma cor aleatória
  } while (usedColors.includes(color)); // Garante que a cor escolhida ainda não foi usada

  usedColors.push(color); // Adiciona a cor escolhida à lista de cores usadas
  return color;
}

module.exports = {
  relatorio,
  obterDadosResumo,
};
