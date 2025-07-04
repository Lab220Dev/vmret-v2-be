const { getPoolNomad } = require("../../config/dbConfigNomad");
const sql = require("mssql");
const CryptoJS = require("crypto-js"); // Importa o módulo `crypto-js` para criptografia de senhas.
const saltRounds = 10;
const { DateTime } = require("luxon");
const jwt = require("jsonwebtoken");
const segredo = "%$&*656$4#%$3@@@__";
const opcoes = {
  expiresIn: "1h", // Define o tempo de expiração do token JWT para 1 hora.
};
let ultimoNomad = [];

async function login(req, res) {
  const { nome, senha } = req.body;
  if (!nome || !senha) {
    return res
      .status(400)
      .json({ message: "Usuário e senha são obrigatórios" });
  }

  try {
    const query = `
                SELECT * FROM Cad_Usuarios
                WHERE nome = @nome
                  `;

    // Executa a consulta SQL com parâmetros de email e senha criptografada.
    const pool = await getPoolNomad();
    if (!pool.connected) {
      await pool.connect();
    }
    const result = await pool
      .request()
      .input("nome", sql.VarChar, nome)
      .query(query);
    if (result.recordset.length === 0) {
      return res.status(401).json({ message: "Usuário não encontrado" });
    }

    const user = result.recordset[0];
    const senhaFinal = typeof senha === "number" ? String(senha) : senha;
    const senhaValida = CryptoJS.MD5(senhaFinal).toString() === user.senha;

    if (!senhaValida) {
      return res.status(401).json({ message: "Senha inválida" });
    }

    return res.status(200).json({ message: "Login bem-sucedido", user });
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
}

async function register(req, res) {
  const {
    nome, // nome do usuário
    senha, // senha do usuário
    monitoramento, // se o usuário tem permissão de monitoramento
    master, // se é master/admin
    abastecimento, // flag ou ID da planta relacionada
  } = req.body;

  try {
    const senhaFinal = typeof senha === "number" ? String(senha) : senha;
    const hashedPassword = CryptoJS.MD5(senhaFinal).toString();

    const query = `
      INSERT INTO Cad_Usuarios (nome, senha, monitoramento, master, abastecimento)
      VALUES (@nome, @senha, @monitoramento, @master, @abastecimento)
    `;

    const pool = await getPoolNomad();
    if (!pool.connected) {
      await pool.connect();
    }

    const request = pool.request(); // <-- CORRIGIDO AQUI
    request.input("nome", sql.VarChar, nome);
    request.input("senha", sql.VarChar, hashedPassword);
    request.input("monitoramento", sql.Bit, monitoramento);
    request.input("master", sql.Bit, master);
    request.input("abastecimento", sql.Bit, abastecimento);

    await request.query(query);

    return res.status(201).json({ message: "Usuário registrado com sucesso" });
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
}

async function listarUsuarios(req, res) {
  try {
    const query = `SELECT * FROM Cad_Usuarios`;

    const pool = await getPoolNomad();
    if (!pool.connected) {
      await pool.connect();
    }

    const result = await pool.request().query(query);

    const usuarios = result.recordset.map((usuario) => ({
      ...usuario,
      senha: "senhaAntiga", // Remove a senha do objeto retornado
    }));

    if (!usuarios.length) {
      return res.status(200).json([]);
    }

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Nenhum usuário encontrado" });
    }

    return res.status(200).json(usuarios);
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
}

async function atualizarUsuario(req, res) {
  const { id_user, nome, senha, monitoramento, master, abastecimento } =
    req.body;

  if (!id_user || !nome) {
    return res
      .status(400)
      .json({ message: "ID e nome do usuário são obrigatórios" });
  }

  try {
    const pool = await getPoolNomad();
    if (!pool.connected) await pool.connect();

    const request = pool.request();
    request.input("id_user", sql.Int, id_user);
    request.input("nome", sql.VarChar, nome);
    request.input("monitoramento", sql.Bit, monitoramento);
    request.input("master", sql.Bit, master);
    request.input("abastecimento", sql.Bit, abastecimento);

    let query = `
      UPDATE Cad_Usuarios
      SET nome = @nome,
          monitoramento = @monitoramento,
          master = @master,
          abastecimento = @abastecimento
    `;

    if (senha) {
      const senhaFinal = typeof senha === "number" ? String(senha) : senha;
      const hashedPassword = CryptoJS.MD5(senhaFinal).toString();
      request.input("senha", sql.VarChar, hashedPassword);
      query += `, senha = @senha`;
    }

    query += ` WHERE id_user = @id_user`;

    await request.query(query);
    return res.status(200).json({ message: "Usuário atualizado com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error.message, error.stack);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
}

async function deleteUser(req, res) {
  const id_user = req.body.id_usuario;
  if (!id_user) {
    return res.status(400).json({ message: "ID do usuário é obrigatório" });
  }
  try {
    const query = `
            DELETE Cad_Usuarios id_user = @id_user
        `;
    await new sql.Request().input("id_user", sql.Int, id).query(query);
    return res.status(200).json({ message: "Usuário excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
}
async function checkForUpdatesNomad() {
  const query = `SELECT * FROM Retiradas`;

  try {
    const pool = await getPoolNomad();
    if (!pool.connected) {
      await pool.connect();
    }
    const result = await pool.request().query(query);
    const atual = result.recordset.map(censurarDados);
    if (ultimoNomad.length === 0) {
      ultimoNomad = atual;
      return atual;
    }

    const fullRecords = atual.map((record) => {
      const existingRecord = ultimoNomad.find((r) => r.ID === record.ID);

      if (!existingRecord) {
        return { ...record, isNew: true };
      }

      const updatedColumns = [];
      if (existingRecord.Retirada !== record.Retirada)
        updatedColumns.push("Retirada");
      if (existingRecord.hora_retirada !== record.hora_retirada)
        updatedColumns.push("hora_retirada");

      return updatedColumns.length > 0
        ? { ...record, isNew: false, updatedColumns }
        : { ...record, isNew: false };
    });

    ultimoNomad = atual;

    return fullRecords;
  } catch (error) {
    console.error("Erro ao verificar atualizações:", error);
    throw error;
  }
}
function censurarDados(record) {
  // Censurar telefone (manter apenas os últimos 4 dígitos)
  if (record.Telefone != null) {
    const telefoneStr = String(record.Telefone); // Converte o telefone para string
    const visibleDigits = telefoneStr.slice(-4); // Últimos 4 dígitos
    const hiddenPart = "*".repeat(telefoneStr.length - 4); // Substitui o restante por '*'
    record.Telefone = hiddenPart + visibleDigits;
  }

  // Censurar email (manter os primeiros 5 caracteres e substituir o restante por '*')
  if (record.Email && typeof record.Email === "string") {
    const [local, domain] = record.Email.split("@");
    if (local.length <= 5) {
      // Se o nome de usuário for menor ou igual a 5 caracteres, substitui tudo por '*'
      record.Email = "*".repeat(local.length) + "@" + domain;
    } else {
      record.Email =
        local.slice(0, 5) + "*".repeat(local.length - 5) + "@" + domain;
    }
  }
  if (record.RG && typeof record.RG === "string") {
    const rgStr = String(record.RG);
    const visibleDigits = rgStr.slice(-3);
    const hiddenPart = "*".repeat(rgStr.length - 3);
    record.RG = hiddenPart + visibleDigits;
  }
  return record;
}

async function relatorio(req, res) {
  const { ativacao, evento, status, data_inicio, data_fim, id_dm } =
    req.body.data;
  let query = `Select Ativacao,Evento, Status, Url,body, Data, Retorno, id_dm from Log where 1=1`;
  let params = {};
  if (ativacao) {
    query += " AND Ativacao = @ativacao";
    params.ativacao = ativacao;
  }
  if (evento) {
    query += " AND Evento LIKE @evento";
    params.evento = `%${evento}%`;
  }
  if (status) {
    query += " AND Status LIKE @status";
    params.status = `%${status}%`;
  }

  if (id_dm) {
    query += " AND id_dm = @id_dm";
    params.id_dm = id_dm;
  }
  if (data_inicio && data_fim) {
    query += " AND Data >= @data_inicio AND Data <= @data_fim";
    const startDate = new Date(data_inicio);
    startDate.setHours(0, 0, 0, 0); // Define hora como 00:00:00
    const endDate = new Date(data_fim);
    endDate.setHours(23, 59, 59, 999); // Define hora como 23:59:59.999
    params.data_inicio = startDate.toISOString(); // Converte para ISO
    params.data_fim = endDate.toISOString(); // Converte para ISO
  } else if (data_inicio) {
    const startDate = new Date(data_inicio);
    startDate.setHours(0, 0, 0, 0); // Define hora como 00:00:00
    query += " AND Data >= @data_inicio";
    params.data_inicio = startDate.toISOString();
  } else if (data_fim) {
    const endDate = new Date(data_fim);
    endDate.setHours(23, 59, 59, 999); // Define hora como 23:59:59.999
    query += " AND Data <= @data_fim";
    params.data_fim = endDate.toISOString();
  }
  query += " ORDER BY ID DESC";
  try {
    const pool = await getPoolNomad();
    if (!pool.connected) {
      await pool.connect();
    }
    const request = pool.request();
    if (params.ativacao)
      request.input("ativacao", sql.VarChar, params.ativacao);
    if (params.evento) request.input("evento", sql.VarChar, params.evento);
    if (params.status) request.input("status", sql.VarChar, params.status);
    if (params.id_dm) request.input("id_dm", sql.Int, parseInt(params.id_dm));
    if (params.data_inicio)
      request.input("data_inicio", sql.DateTime, params.data_inicio);
    if (params.data_fim)
      request.input("data_fim", sql.DateTime, params.data_fim);

    const result = await request.query(query);
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    return res.status(500).json({
      message: "Erro ao executar consulta",
      details: error.message,
    });
  }
}
async function relatorioRetirada(req, res) {
  const { id_dm, tipo_retorno, qrCode_valido } = req.body.data;
  let query = `Select * from Retiradas where 1=1`;
  let params = {};
  if (id_dm) {
    query += " AND id_dm = @id_dm";
    params.id_dm = id_dm;
  }
  if (tipo_retorno) {
    if (tipo_retorno === "OUTROS") {
      query += ` AND Retorno_Placa IN (
                'EXLINIV', 'EXCOLINV', 'EXTONF', 'EXLIMCORR', 'EXTOST00', 'EXSC00', 'EXSC01'
            )`;
    } else {
      query += " AND Retorno_Placa = @tipo_retorno";
      params.tipo_retorno = tipo_retorno;
    }
  }
  if (qrCode_valido != null) {
    query += " AND QR_Code_Valido = @qrCode_valido";
    params.qrCode_valido = qrCode_valido;
  }
  query += " ORDER BY ID_Retirada DESC";
  try {
    const pool = await getPoolNomad();
    if (!pool.connected) {
      await pool.connect();
    }
    const request = pool.request();
    if (params.id_dm) request.input("id_dm", sql.Int, parseInt(params.id_dm));
    if (params.tipo_retorno)
      request.input("tipo_retorno", sql.VarChar, params.tipo_retorno);
    if (params.qrCode_valido)
      request.input("qrCode_valido", sql.VarChar, params.qrCode_valido);
    const result = await request.query(query);
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    return res.status(500).json({
      message: "Erro ao executar consulta",
      details: error.message,
    });
  }
}

async function relatorioAberturaPorta(req, res) {
  const { data_inicio, data_fim } = req.body.data;

  let query = "SELECT * FROM Log_Abastecimento WHERE 1=1";
let params = {};

 if (data_inicio && data_fim) {
    query += " AND Data >= @data_inicio AND data <= @data_fim";
    const startDate = new Date(data_inicio);
    startDate.setHours(0, 0, 0, 0); // Define hora como 00:00:00
    const endDate = new Date(data_fim);
    endDate.setHours(23, 59, 59, 999); // Define hora como 23:59:59.999
    params.data_inicio = startDate.toISOString(); // Converte para ISO
    params.data_fim = endDate.toISOString(); // Converte para ISO
  } else if (data_inicio) {
    const startDate = new Date(data_inicio);
    startDate.setHours(0, 0, 0, 0); // Define hora como 00:00:00
    query += " AND data >= @data_inicio";
    params.data_inicio = startDate.toISOString();
  } else if (data_fim) {
    const endDate = new Date(data_fim);
    endDate.setHours(23, 59, 59, 999); // Define hora como 23:59:59.999
    query += " AND data <= @data_fim";
    params.data_fim = endDate.toISOString();
  }
  query += " ORDER BY ID DESC";
  try {
    const pool = await getPoolNomad();
    if (!pool.connected) {
      await pool.connect();
    }
    const request = pool.request();

    if (params.data_inicio)
      request.input("data_inicio", sql.DateTime, params.data_inicio);
    if (params.data_fim)
      request.input("data_fim", sql.DateTime, params.data_fim);

    const result = await request.query(query);
    return res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    return res.status(500).json({
      message: "Erro ao executar consulta",
      details: error.message,
    });
  }
}

module.exports = {
  login,
  listarUsuarios,
  register,
  atualizarUsuario,
  deleteUser,
  checkForUpdatesNomad,
  relatorio,
  relatorioRetirada,
  relatorioAberturaPorta,
};
