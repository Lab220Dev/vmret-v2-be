const sql = require("mssql");

async function DadosClientes(req, res) {
  try {
    const sqlRequest = new sql.Request();
    const query = `
          SELECT 
              id_dm, Identificacao
          FROM 
              DMS
          WHERE 
              Deleted = 0 AND Ativo = 1
          `;
    const ListaDM = await sqlRequest.query(query);

    const timezone = "America/Sao_Paulo";
    const agora = new Date().toLocaleString("en-US", { timeZone: timezone });
    const agoraDate = new Date(agora);

    const onlineList = [];
    const offlineList = [];

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
      sqlRequestStatus.input("id_dm", sql.Int, DM.id_dm);
      const statusResult = await sqlRequestStatus.query(statusQuery);

      if (statusResult.recordset.length > 0) {
        const ultimaAtualizacao = new Date(statusResult.recordset[0].dataHora);
        const diferencaEmMinutos = (agoraDate - ultimaAtualizacao) / 60000;
        if (diferencaEmMinutos <= 5) {
          onlineList.push({ id: DM.id_dm, name: DM.Identificacao });
        } else {
          offlineList.push({ id: DM.id_dm, name: DM.Identificacao });
        }
      } else {
        offlineList.push({ id: DM.id_dm, name: DM.Identificacao });
      }
    }

    const notificacoesQuery = `
          SELECT Tipo, COUNT(*) AS Total
          FROM Notificacaos
          GROUP BY Tipo
          `;
    const notificacoesResult = await sqlRequest.query(notificacoesQuery);
    const notificacoes = { email: 0, push: 0 };
    notificacoesResult.recordset.forEach((notificacao) => {
      if (notificacao.Tipo === "email") notificacoes.email = notificacao.Total;
      if (notificacao.Tipo === "push") notificacoes.push = notificacao.Total;
    });
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
  const clientesResult = await sqlRequest.query(clientesQuery);

  // Mapear resultados para o formato esperado
  const clientes = clientesResult.recordset.map((cliente) => ({
    name: cliente.cliente_nome,
    value: cliente.total_retiradas,
  }));

    const dados = {
      dms: {
        online: {
          count: onlineList.length,
          list: onlineList,
        },
        offline: {
          count: offlineList.length,
          list: offlineList,
        },
      },
      notificacoes,
      clientes
    };

    res.status(200).json(dados);
  } catch (error) {
    console.error("Erro ao buscar dados dos clientes:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
}

async function ResumoDados(req, res) {
  try {
    const sqlRequest = new sql.Request();

    // 1. Obter clientes e suas DMs
    const clientesQuery = `
        SELECT c.id_cliente, c.nome AS cliente_nome, d.id_dm, d.Identificacao AS dm_nome
        FROM Clientes c
        INNER JOIN DMS d ON c.id_cliente = d.id_cliente
        WHERE d.Deleted = 0 AND d.Ativo = 1
      `;
    const clientesResult = await sqlRequest.query(clientesQuery);
    const clientesMap = {};

    clientesResult.recordset.forEach((row) => {
      if (!clientesMap[row.id_cliente]) {
        clientesMap[row.id_cliente] = {
          id_cliente: row.id_cliente,
          nome: row.cliente_nome,
          dms: [],
        };
      }
      clientesMap[row.id_cliente].dms.push({
        id: row.id_dm,
        name: row.dm_nome,
      });
    });

    const listaClientes = Object.values(clientesMap);

    // 2. Processar detalhes para cada DM
    for (const cliente of listaClientes) {
      for (const dm of cliente.dms) {
        const timezone = "America/Sao_Paulo";
        const agora = new Date().toLocaleString("en-US", {
          timeZone: timezone,
        });
        const agoraDate = new Date(agora);

        // Obter status da DM
        const statusQuery = `
            SELECT TOP 1 dataHora
            FROM DM_Status
            WHERE id_dm = @id_dm
            ORDER BY dataHora DESC
          `;
        const statusRequest = new sql.Request();
        statusRequest.input("id_dm", sql.Int, dm.id);
        const statusResult = await statusRequest.query(statusQuery);

        if (statusResult.recordset.length > 0) {
          const ultimaAtualizacao = new Date(
            statusResult.recordset[0].dataHora
          );
          const diferencaEmMinutos = (agoraDate - ultimaAtualizacao) / 60000;
          dm.status = diferencaEmMinutos <= 5 ? "online" : "offline";
          dm.lastPing = `${Math.floor(diferencaEmMinutos)} minutos atrás`;
        } else {
          dm.status = "offline";
          dm.lastPing = "Sem registros";
        }

        // Obter última notificação
        const notificacaoQuery = `
            SELECT TOP 1 data_criacao
            FROM Notificacaos
            WHERE id_cliente = id_cliente
            ORDER BY data_criacao DESC
          `;
        const notificacaoRequest = new sql.Request();
        notificacaoRequest.input("id_cliente", sql.Int, cliente.id_cliente);
        const notificacaoResult = await notificacaoRequest.query(
          notificacaoQuery
        );
        dm.lastNotification =
          notificacaoResult.recordset.length > 0
            ? notificacaoResult.recordset[0].dataHora
            : "Sem notificações";

        // Obter últimas retiradas
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
        retiradasRequest.input("id_dm", sql.Int, dm.id);
        const retiradasResult = await retiradasRequest.query(retiradasQuery);

        const retiradas = {};
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

        // Adicionar retiradas ao DM
        dm.lastWithdrawals = Object.values(retiradas);

        // Gerar dados do gráfico
        const historicoQuery = `
            SELECT TOP 4 dataHora, Status
            FROM DM_Status
            WHERE id_dm = @id_dm
            ORDER BY dataHora DESC
          `;
        const historicoRequest = new sql.Request();
        historicoRequest.input("id_dm", sql.Int, dm.id);
        const historicoResult = await historicoRequest.query(historicoQuery);

        const chartData = {
          labels: historicoResult.recordset.map((h) =>
            new Date(h.dataHora).toLocaleTimeString("pt-BR")
          ),
          datasets: [
            {
              label: dm.name,
              data: historicoResult.recordset.map((h) => {
                const normalizedStatus = h.Status.toLowerCase().trim();
                return ["conectado", "conectada"].includes(normalizedStatus)
                  ? "Online"
                  : "Offline";
              }),
              borderColor: historicoResult.recordset.some((h) =>
                ["conectado", "conectada"].includes(
                  h.Status.toLowerCase().trim()
                )
              )
                ? "#4caf50"
                : "#f44336",
              backgroundColor: historicoResult.recordset.some((h) =>
                ["conectado", "conectada"].includes(
                  h.Status.toLowerCase().trim()
                )
              )
                ? "#4caf50"
                : "#f44336",
              fill: false,
            },
          ],
        };
        dm.chartData = chartData;
      }
    }

    // Consolidar os dados e enviar como resposta
    res.status(200).json(listaClientes);
  } catch (error) {
    console.error("Erro ao buscar lista de clientes:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
}

async function UltimasNotificacoes(req, res) {
  try {
    const sqlRequest = new sql.Request();

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
    const notificacaoResult = await sqlRequest.query(notificacaoQuery);

    // Retornar o resultado
    res.status(200).json(
      notificacaoResult.recordset.length > 0
        ? notificacaoResult.recordset.map((n) => ({
            data_criacao: n.data_criacao,
            mensagem: n.mensagem,
            status: n.status,
            id_cliente: n.id_cliente,
            cliente_nome: n.cliente_nome,
          }))
        : { mensagem: "Sem notificações" }
    );
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    res.status(500).json({ error: "Erro ao buscar notificações." });
  }
}

module.exports = {
  DadosClientes,
  ResumoDados,
  UltimasNotificacoes,
};
