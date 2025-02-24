const sql = require("mssql"); // Importa o módulo 'mssql' para interagir com o banco de dados SQL Server.
const { DateTime } = require("luxon");
 /**
  * Função que recupera dados sobre os clientes, seus status de DM e notificações.
  * @param {Object} req - O objeto de requisição contendo os parâmetros necessários.
  * @param {Object} res - O objeto de resposta utilizado para enviar os resultados.
  * @returns {void} Envia a resposta com os dados dos clientes ou um erro caso algo ocorra.
  */
async function DadosClientes(req, res) {
  try {
    // Cria uma nova requisição SQL para buscar os DMs ativos.
    const sqlRequest = new sql.Request();
    const query = `
          SELECT 
              id_dm, Identificacao
          FROM 
              DMS
          WHERE 
              Deleted = 0 AND Ativo = 1
          `;
    const ListaDM = await sqlRequest.query(query); // Executa a consulta e aguarda o resultado.

    // Define o fuso horário como "America/Sao_Paulo" para trabalhar com data e hora locais.
    const nowInBrazil = DateTime.now().setZone("America/Sao_Paulo").toJSDate();
    const agoraDate = new Date(nowInBrazil); // Converte a hora atual em um objeto Date.

    // Inicializa as listas de DMs online e offline.
    const onlineList = [];
    const offlineList = [];

    // Itera sobre a lista de DMs para verificar seu status (online ou offline).
    for (const DM of ListaDM.recordset) {
      const sqlRequestStatus = new sql.Request();
      const statusQuery = `
              SELECT 
                  TOP 1 dataHora
              FROM 
                  DM_Status
              WHERE 
                  id_dm = @id_dm
              ORDER BY 
                  dataHora DESC
              `;
      sqlRequestStatus.input("id_dm", sql.Int, DM.id_dm); // Define o parâmetro 'id_dm' para a consulta de status.
      const statusResult = await sqlRequestStatus.query(statusQuery); // Executa a consulta para verificar o status do DM.

      // Verifica se foi encontrado o status do DM.
      if (statusResult.recordset.length > 0) {
        const ultimaAtualizacao = new Date(statusResult.recordset[0].dataHora); // Recupera a última atualização.
        const diferencaEmMinutos = (agoraDate - ultimaAtualizacao) / 60000; // Calcula a diferença em minutos entre a hora atual e a última atualização.
        
        // Se a diferença for menor ou igual a 5 minutos, o DM está online.
        if (diferencaEmMinutos <= 5) {
          onlineList.push({ id: DM.id_dm, name: DM.Identificacao }); // Adiciona o DM à lista de online.
        } else {
          offlineList.push({ id: DM.id_dm, name: DM.Identificacao }); // Caso contrário, o DM é offline.
        }
      } else {
        // Se não houver registro de status, o DM é considerado offline.
        offlineList.push({ id: DM.id_dm, name: DM.Identificacao });
      }
    }

    // Consulta para contar as notificações por tipo (email e push).
    const notificacoesQuery = `
          SELECT Tipo, COUNT(*) AS Total
          FROM Notificacaos
          GROUP BY Tipo
          `;
    const notificacoesResult = await sqlRequest.query(notificacoesQuery); // Executa a consulta de notificações.
    const notificacoes = { email: 0, push: 0 }; // Inicializa o objeto de notificações.

    // Preenche os tipos de notificações com a contagem correspondente.
    notificacoesResult.recordset.forEach((notificacao) => {
      if (notificacao.Tipo === "email") notificacoes.email = notificacao.Total; // Contagem de notificações de tipo 'email'.
      if (notificacao.Tipo === "push") notificacoes.push = notificacao.Total; // Contagem de notificações de tipo 'push'.
    });

    // Consulta para obter os 5 clientes com mais retiradas.
    const clientesQuery = `
    SELECT TOP 5
      r.id_cliente,
      c.nome AS cliente_nome,
      COUNT(r.id_retirada) AS total_retiradas
    FROM dm_retiradas r
    INNER JOIN Clientes c ON c.id_cliente = r.id_cliente
    WHERE r.Dia IS NOT NULL
    GROUP BY r.id_cliente, c.nome
    ORDER BY total_retiradas DESC`;
  const clientesResult = await sqlRequest.query(clientesQuery); // Executa a consulta de clientes.

  // Mapeia os resultados para o formato esperado.
  const clientes = clientesResult.recordset.map((cliente) => ({
    name: cliente.cliente_nome, // Nome do cliente.
    value: cliente.total_retiradas, // Total de retiradas.
  }));

    // Organiza os dados para a resposta.
    const dados = {
      dms: {
        online: {
          count: onlineList.length, // Quantidade de DMs online.
          list: onlineList, // Lista de DMs online.
        },
        offline: {
          count: offlineList.length, // Quantidade de DMs offline.
          list: offlineList, // Lista de DMs offline.
        },
      },
      notificacoes, // Dados de notificações.
      clientes, // Dados dos clientes.
    };

    res.status(200).json(dados); // Retorna os dados organizados com status 200.
  } catch (error) {
    // Em caso de erro, exibe a mensagem de erro e retorna status 500.
    console.error("Erro ao buscar dados dos clientes:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
}

 /**
  * Função que gera um resumo de dados relacionados aos clientes, DMs e suas últimas retiradas.
  * @param {Object} req - O objeto de requisição contendo os parâmetros necessários.
  * @param {Object} res - O objeto de resposta utilizado para enviar os resultados.
  * @returns {void} Envia a resposta com os dados consolidados ou um erro caso algo ocorra.
  */
async function ResumoDados(req, res) {
  try {
    const sqlRequest = new sql.Request();

    // 1. Obter todos os clientes e suas DMs.
    const clientesQuery = `
        SELECT c.id_cliente, c.nome AS cliente_nome, d.id_dm, d.Identificacao AS dm_nome
        FROM Clientes c
        INNER JOIN DMS d ON c.id_cliente = d.id_cliente
        WHERE d.Deleted = 0 AND d.Ativo = 1
      `;
    const clientesResult = await sqlRequest.query(clientesQuery); // Executa a consulta para obter clientes e suas DMs.
    const clientesMap = {}; // Mapeia os dados dos clientes.

    // Organiza os resultados para agrupar as DMs de cada cliente.
    clientesResult.recordset.forEach((row) => {
      if (!clientesMap[row.id_cliente]) {
        clientesMap[row.id_cliente] = {
          id_cliente: row.id_cliente,
          nome: row.cliente_nome,
          dms: [],
        };
      }
      clientesMap[row.id_cliente].dms.push({
        id: row.id_dm, // Adiciona o DM do cliente.
        name: row.dm_nome, // Nome do DM.
      });
    });

    const listaClientes = Object.values(clientesMap); // Converte o mapa em uma lista.

    // 2. Processar detalhes de cada DM.
    for (const cliente of listaClientes) {
      for (const dm of cliente.dms) {
        const nowInBrazil = DateTime.now().setZone("America/Sao_Paulo").toJSDate();
        const agoraDate = new Date(nowInBrazil);

        // Consulta para obter o status da DM.
        const statusQuery = `
            SELECT TOP 1 dataHora
            FROM DM_Status
            WHERE id_dm = @id_dm
            ORDER BY dataHora DESC
          `;
        const statusRequest = new sql.Request();
        statusRequest.input("id_dm", sql.Int, dm.id); // Define o parâmetro 'id_dm'.
        const statusResult = await statusRequest.query(statusQuery); // Executa a consulta para o status.

        // Verifica o status do DM e calcula o tempo desde a última atualização.
        if (statusResult.recordset.length > 0) {
          const ultimaAtualizacao = new Date(statusResult.recordset[0].dataHora); // Obtém a última atualização do status.
          const diferencaEmMinutos = (agoraDate - ultimaAtualizacao) / 60000; // Calcula a diferença em minutos.

          // Se a diferença for menor ou igual a 5 minutos, o DM é online.
          dm.status = diferencaEmMinutos <= 5 ? "online" : "offline"; // Define o status do DM.
          dm.lastPing = `${Math.floor(diferencaEmMinutos)} minutos atrás`; // Tempo desde o último ping.
        } else {
          // Se não houver registro de status, define como offline.
          dm.status = "offline";
          dm.lastPing = "Sem registros";
        }

        // Consulta para obter a última notificação do cliente.
        const notificacaoQuery = `
            SELECT TOP 1 data_criacao
            FROM Notificacaos
            WHERE id_cliente = id_cliente
            ORDER BY data_criacao DESC
          `;
        const notificacaoRequest = new sql.Request();
        notificacaoRequest.input("id_cliente", sql.Int, cliente.id_cliente); // Define o parâmetro 'id_cliente'.
        const notificacaoResult = await notificacaoRequest.query(notificacaoQuery); // Executa a consulta de notificações.

        // Define a última notificação do cliente ou "Sem notificações" caso não haja.
        dm.lastNotification =
          notificacaoResult.recordset.length > 0
            ? notificacaoResult.recordset[0].dataHora
            : "Sem notificações";

        // Consulta para obter as últimas retiradas do DM.
        const retiradasQuery = `
            SELECT TOP 5  
              r.id_retirada,
              r.id_dm,
              r.id_funcionario,
              r.forma_autenticacao,
              r.id_dm_retirada,
              i.Produtonome AS item_nome,
              i.ProdutoSKU AS item_sku,
              i.quantidade AS item_quantidade
            FROM 
              dm_retiradas r
            INNER JOIN 
              dm_retirada_itens i ON r.id_retirada = i.id_retirada
            WHERE 
              r.id_dm = @id_dm
            ORDER BY 
              r.Dia DESC
          `;
        const retiradasRequest = new sql.Request();
        retiradasRequest.input("id_dm", sql.Int, dm.id); // Define o parâmetro 'id_dm' para as retiradas.
        const retiradasResult = await retiradasRequest.query(retiradasQuery); // Executa a consulta de retiradas.

        const retiradas = {}; // Organiza as retiradas em um objeto.

        // Processa as retiradas e os itens dentro delas.
        retiradasResult.recordset.forEach((row) => {
          if (!retiradas[row.id_retirada]) {
            retiradas[row.id_retirada] = {
              id_retirada: row.id_retirada,
              id_funcionario: row.id_funcionario,
              forma_autenticacao: row.forma_autenticacao,
              itens: [],
            };
          }
          retiradas[row.id_retirada].itens.push({
            nome: row.item_nome,
            sku: row.item_sku,
            quantidade: row.item_quantidade,
          });
        });

        // Adiciona as retiradas ao DM.
        dm.lastWithdrawals = Object.values(retiradas);

        // Consulta para gerar os dados do gráfico de status da DM.
        const historicoQuery = `
            SELECT TOP 4 dataHora, Status
            FROM DM_Status
            WHERE id_dm = @id_dm
            ORDER BY dataHora DESC
          `;
        const historicoRequest = new sql.Request();
        historicoRequest.input("id_dm", sql.Int, dm.id); // Define o parâmetro 'id_dm' para o histórico.
        const historicoResult = await historicoRequest.query(historicoQuery); // Executa a consulta de histórico.

        // Organiza os dados para o gráfico.
        const chartData = {
          labels: historicoResult.recordset.map((h) =>
            new Date(h.dataHora).toLocaleTimeString("pt-BR") // Formata as labels do gráfico com as horas.
          ),
          datasets: [
            {
              label: dm.name, // Nome do DM no gráfico.
              data: historicoResult.recordset.map((h) => {
                const normalizedStatus = h.Status.toLowerCase().trim();
                return ["conectado", "conectada"].includes(normalizedStatus)
                  ? "Online" // Se o status for "conectado", define como Online.
                  : "Offline"; // Caso contrário, define como Offline.
              }),
              borderColor: historicoResult.recordset.some((h) =>
                ["conectado", "conectada"].includes(
                  h.Status.toLowerCase().trim()
                )
              )
                ? "#4caf50" // Cor verde se algum status for "conectado".
                : "#f44336", // Cor vermelha se nenhum status for "conectado".
              backgroundColor: historicoResult.recordset.some((h) =>
                ["conectado", "conectada"].includes(
                  h.Status.toLowerCase().trim()
                )
              )
                ? "#4caf50"
                : "#f44336", // Cor de fundo do gráfico.
              fill: false, // Não preenche o gráfico com cor.
            },
          ],
        };
        dm.chartData = chartData; // Adiciona os dados do gráfico ao DM.
      }
    }

    // Retorna a lista consolidada de clientes com seus dados.
    res.status(200).json(listaClientes);
  } catch (error) {
    // Em caso de erro, retorna status 500 e a mensagem de erro.
    console.error("Erro ao buscar lista de clientes:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
}

 /**
  * Função que retorna as últimas notificações enviadas.
  * @param {Object} req - O objeto de requisição contendo os parâmetros necessários.
  * @param {Object} res - O objeto de resposta utilizado para enviar os resultados.
  * @returns {void} Envia a resposta com as últimas notificações ou um erro caso algo ocorra.
  */
async function UltimasNotificacoes(req, res) {
  try {
    const sqlRequest = new sql.Request();

    // Consulta para obter as últimas 5 notificações.
    const notificacaoQuery = `
      SELECT 
        TOP 5 
        n.data_criacao, 
        n.mensagem, 
        n.status, 
        n.id_cliente, 
        c.nome AS cliente_nome
      FROM 
        Notificacaos n
      INNER JOIN 
        Clientes c ON n.id_cliente = c.id_cliente
      ORDER BY 
        n.data_criacao DESC
    `;
    const notificacaoResult = await sqlRequest.query(notificacaoQuery); // Executa a consulta.

    // Retorna as notificações ou uma mensagem caso não haja notificações.
    res.status(200).json(
      notificacaoResult.recordset.length > 0
        ? notificacaoResult.recordset.map((n) => ({
            data_criacao: n.data_criacao, // Data da criação da notificação.
            mensagem: n.mensagem, // Mensagem da notificação.
            status: n.status, // Status da notificação.
            id_cliente: n.id_cliente, // ID do cliente associado à notificação.
            cliente_nome: n.cliente_nome, // Nome do cliente.
          }))
        : { mensagem: "Sem notificações" } // Caso não haja notificações, retorna "Sem notificações".
    );
  } catch (error) {
    // Em caso de erro, retorna status 500 e a mensagem de erro.
    console.error("Erro ao buscar notificações:", error);
    res.status(500).json({ error: "Erro ao buscar notificações." });
  }
}

module.exports = {
  DadosClientes,
  ResumoDados,
  UltimasNotificacoes,
};
