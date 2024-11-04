const sql = require("mssql");

async function relatorio(request, response) {
  try {
    const { id_cliente, id_dm, dia } = request.body;

    if (!id_cliente) {
      return response.status(401).json("ID do cliente não enviado");
    }

    if (!id_dm) {
      return response.status(401).json("ID da DM não enviado");
    }

    const currentDate = dia ? new Date(dia) : new Date();
    const formattedDate = currentDate.toISOString().split("T")[0];

    let query;
    const dbRequest = new sql.Request();
    dbRequest.input("id_cliente", sql.Int, id_cliente);
    dbRequest.input("dia", sql.Date, formattedDate);

    if (id_dm === null) {
      query =
        "SELECT * FROM DM_status WHERE  id_cliente = @id_cliente AND CONVERT(date, dataHora) = @dia";
    } else {
      query =
        "SELECT * FROM DM_status WHERE ID_DM = @id_dm AND id_cliente = @id_cliente AND CONVERT(date, dataHora) = @dia";
      dbRequest.input("ID_DM", sql.Int, id_dm);
    }

    const result = await dbRequest.query(query);
    response.status(200).json(result.recordset);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}
async function obterDadosResumo(request, response) {
  try {
      const { id_cliente } = request.body;

      if (!id_cliente) {
          return response.status(400).json({ error: "ID do cliente não enviado" });
      }

      const agora = new Date();
      const tresHorasAtras = new Date(agora.getTime() - 3 * 60 * 60 * 1000); // Últimas 3 horas

      const dbRequest = new sql.Request();
      dbRequest.input("id_cliente", sql.Int, id_cliente);
      dbRequest.input("tresHorasAtras", sql.DateTime, tresHorasAtras);
      dbRequest.input("agora", sql.DateTime, agora);

      // Obtenha todas as DMs associadas ao cliente
      const dmsResult = await dbRequest.query(`
          SELECT ID_DM, Identificacao
          FROM DMs 
          WHERE id_cliente = @id_cliente
          AND Deleted = 0 
      `);

      const dms = dmsResult.recordset.map(dm => ({ id: dm.ID_DM, nome: dm.Identificacao }));
      console.log(dms);
      if (dms.length === 0) {
          return response.status(204).json({ message: "Nenhuma DM encontrada para este cliente." });
      }

      const query = `
          SELECT 
              ID_DM,
              FORMAT(DATEADD(MINUTE, (DATEDIFF(MINUTE, 0, dataHora) / 30) * 30, 0), 'HH:mm') AS intervalo,
              status,
              COUNT(*) AS total
          FROM DM_status
          WHERE 
              id_cliente = @id_cliente
              AND ID_DM IN (${dms.map(dm => dm.id).join(",")})
              AND dataHora >= @tresHorasAtras
              AND dataHora <= @agora
          GROUP BY 
              ID_DM,
              FORMAT(DATEADD(MINUTE, (DATEDIFF(MINUTE, 0, dataHora) / 30) * 30, 0), 'HH:mm'),
              status
          ORDER BY 
              ID_DM, intervalo;
      `;

      const result = await dbRequest.query(query);

      // Gera os intervalos de 30 minutos para as últimas 3 horas
      const intervalos = [];
      const currentInterval = new Date(tresHorasAtras);

      while (currentInterval <= agora) {
          intervalos.push(currentInterval.toTimeString().slice(0, 5)); 
          currentInterval.setMinutes(currentInterval.getMinutes() + 30);
      }

      // Organiza os dados no formato solicitado
      const datasets = dms.map(dm => {
          const data = Array(intervalos.length).fill("Offline"); // Inicializa com 'Offline'

          intervalos.forEach((intervalo, index) => {
              const registro = result.recordset.find(
                  r => r.ID_DM === dm.id && r.intervalo === intervalo
              );

              if (registro) {
                  data[index] = registro.status === 'Conectado' ? "Online" : "Offline";
              }
          });

          return {
              label: dm.nome,
              data: data,
              fill: false,
              backgroundColor: getColor('Conectado'), 
              borderColor: getRandomWarmColor('Desconectado'),
              tension: 0.4
          };
      });

      // Prepara o objeto para o gráfico
      const lineData = {
          labels: intervalos,
          datasets: datasets
      };

      response.status(200).json(lineData);
  } catch (error) {
      console.error("Erro ao executar consulta:", error.message);
      response.status(500).send("Erro ao executar consulta");
  }
}


// Função para definir as cores com base no status
function getColor(status) {
  const colorMap = {
      'Conectado': '#17202a',
      'Desconectado': '#00bb7e'
  };
  return colorMap[status] || '#888888';
}

const ColorPalette = [
  '#e51e1e', // Vermelho 1
  '#e5501e', // Vermelho 2
  '#e5821e', // Vermelho 3
  '#138f13', // Verde 1
  '#1ee51e', // Verde 2 -
  '#1e1ee5', // Azul
  '#1e88e5', // Azul claro
  
];

const usedColors = [];

function getRandomWarmColor() {
  if (usedColors.length === ColorPalette.length) {
      
    usedColors.length = 0;
      return null; 
  }

  let color;
  do {
      color = ColorPalette[Math.floor(Math.random() * ColorPalette.length)];
  } while (usedColors.includes(color)); 

  usedColors.push(color); 
  return color;
}

module.exports = {
  relatorio,
  obterDadosResumo,
};
