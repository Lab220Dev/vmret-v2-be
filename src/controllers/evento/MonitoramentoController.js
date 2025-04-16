const { getPoolNomad } = require("../../config/dbConfigNomad");
const sql = require("mssql");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const { DateTime } = require("luxon");
const jwt = require("jsonwebtoken");
const segredo = "%$&*656$4#%$3@@@__";
const opcoes = {
  expiresIn: "1h", // Define o tempo de expiração do token JWT para 1 hora.
};
let ultimoNomad = [];
async function login(req, res) {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res
      .status(400)
      .json({ message: "Usuário e senha são obrigatórios" });
  }

  try {
    const query = `
                SELECT * FROM usuario_monitoramento
                WHERE login = @Email
                  And deleted = 0`;

    // Executa a consulta SQL com parâmetros de email e senha criptografada.
    const result = await new sql.Request()
      .input("Email", sql.VarChar, email)
      .query(query);
    if (result.recordset.length === 0) {
      return res.status(401).json({ message: "Usuário não encontrado" });
    }

    const user = result.recordset[0];
    const senhaFinal = typeof senha === "number" ? String(senha) : senha;
    const senhaValida = await bcrypt.compare(senhaFinal, user.senha);

    if (!senhaValida) {
      return res.status(401).json({ message: "Senha inválida" });
    }

    const updateQuery = `
                        UPDATE usuario_monitoramento
                        SET ultimo_login = @LastLogin
                        WHERE id = @id`;
    const nowInBrazil = DateTime.now().setZone("America/Sao_Paulo").toJSDate();
    // Executa a consulta SQL para atualizar o horário de login do usuário.
    await new sql.Request()
      .input("LastLogin", sql.DateTime, nowInBrazil)
      .input("id", sql.Int, user.id)
      .query(updateQuery);

    const token = jwt.sign({ usuario: user }, segredo, opcoes);
    return res
      .status(200)
      .json({ message: "Login bem-sucedido", user, token: token });
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
}
async function register(req, res) {
  const { usuario, senha, produto } = req.body;
  if (!usuario || !senha) {
    return res
      .status(400)
      .json({ message: "Usuário e senha são obrigatórios" });
  }

  try {
    const senhaFinal = typeof senha === "number" ? String(senha) : senha;
    const hashedPassword = await bcrypt.hash(senhaFinal, saltRounds);
    const query = `
            INSERT INTO usuario_monitoramento (login, senha, deleted,ultimo_login,tipo,produto)
            VALUES (@Email, @Senha , 0 , null, @tipo, @Produto)
        `;
    await new sql.Request()
      .input("Email", sql.NVarChar, usuario)
      .input("Senha", sql.NVarChar, hashedPassword)
      .input("tipo", sql.NVarChar, "user")
      .input("Produto", sql.NVarChar, produto)
      .query(query);
    return res.status(201).json({ message: "Usuário registrado com sucesso" });
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
    return res.status(500).json({ message: "Erro interno do servidor" });
  }
}
async function deleteUser(req, res) {
  const id = req.body.id_usuario;
  if (!id) {
    return res.status(400).json({ message: "ID do usuário é obrigatório" });
  }
  try {
    const query = `
            UPDATE usuario_monitoramento
            SET deleted = 1
            WHERE id = @id_usuario
        `;
    await new sql.Request().input("id_usuario", sql.Int, id).query(query);
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
    query += ' AND Evento LIKE @evento';
    params.evento = `%${evento}%`;
  }
  if (status) {
    query += ' AND Status LIKE @status';
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
  query += ' ORDER BY ID DESC';
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
async function relatorioRetirada(req,res){
    const { id_dm, tipo_retorno,qrCode_valido } = req.body.data;
    let query = `Select * from Retiradas where 1=1`;
    let params = {};
    if (id_dm) {
        query += " AND id_dm = @id_dm";
        params.id_dm = id_dm;
      }
    if (tipo_retorno) {
        query += " AND Retorno_Placa = @tipo_retorno";
        params.tipo_retorno = tipo_retorno;
      }
     if(qrCode_valido != null) {
        query += " AND QR_Code_Valido = @qrCode_valido";
        params.qrCode_valido = qrCode_valido;
      }
      query += ' ORDER BY ID_Retirada DESC';
      try {
        const pool = await getPoolNomad();
        if (!pool.connected) {
          await pool.connect();
        }
        const request = pool.request();
        if(params.id_dm)
          request.input("id_dm", sql.Int, parseInt(params.id_dm));
        if(params.tipo_retorno)
          request.input("tipo_retorno", sql.VarChar, params.tipo_retorno);
        if(params.qrCode_valido)
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
module.exports = {
  login,
  register,
  deleteUser,
  checkForUpdatesNomad,
  relatorio,
  relatorioRetirada,
};
