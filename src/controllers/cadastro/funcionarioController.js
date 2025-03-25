/**
 * Requer a biblioteca `mssql` para interagir com o banco de dados SQL.
 * @module mssql
 */
const sql = require("mssql");

/**
 * Requer o módulo `path` para trabalhar com caminhos de arquivos.
 * @module path
 */
const path = require("path");

/**
 * Requer o módulo `fs.promises` para lidar com operações de leitura e escrita de arquivos de forma assíncrona.
 * @module fs.promises
 */
const fs = require("fs").promises;

/**
 * Função para registrar logs das consultas no banco de dados.
 * @module logUtils
 */
const { logQuery } = require("../../utils/logUtils");

/**
 * Requer a biblioteca `multer` para manipulação de uploads de arquivos.
 * @module multer
 */
const multer = require("multer");

/**
 * Funções para envio de e-mails e geração de HTML para e-mails.
 * @module emailService
 */
const { sendEmail, generateEmailHTML2 } = require("../../utils/emailService");

/**
 * Requer a biblioteca `crypto-js` para criptografia de dados, como a geração de hashes.
 * @module crypto-js
 */
const CryptoJS = require("crypto-js");

/**
 * Requer o módulo `axios` para fazer requisições HTTP externas.
 * @module axios
 */
const axios = require("axios");

/**
 * Configuração do armazenamento de arquivos temporários em memória usando o `multer`.
 * @type {multer.StorageEngine}
 */
const storage = multer.memoryStorage();

/**
 * Configura o middleware do `multer` para fazer upload de arquivos.
 * @type {multer.Instance}
 */
const upload = multer({ storage: storage });
const { DateTime } = require("luxon");

/**
 *
 * @param {string} value - Valor a ser convertido.
 * @returns {boolean} Retorna `true` se o valor for "true", caso contrário `false`.
 */
const convertToBoolean = (value) => {
  return value === "true"; //Função para converter valores de string ("true"/"false") para booleano.
};

/**
 * Função que lista todos os funcionários de um cliente, incluindo seus itens associados.
 * @param {Object} request - Objeto da requisição, contendo os dados enviados pelo cliente.
 * @param {Object} response - Objeto de resposta que será retornado para o cliente.
 */
async function listarFuncionarios(request, response) {
  try {
    // Verifica se o ID do cliente foi enviado na requisição
    if (!request.body.id_cliente) {
      return response.status(401).json({ error: "ID do cliente não enviado" });
    }

    // Extrai o ID do cliente da requisição
    const id_cliente = request.body.id_cliente;

    // Consulta SQL para listar todos os funcionários do cliente, que não foram marcados como excluídos
    const queryFuncionarios = `
            SELECT *
            FROM funcionarios 
            WHERE id_cliente = @id_cliente 
            AND deleted = 0
        `;

    // Cria uma requisição SQL
    const sqlRequest = new sql.Request();
    // Passa o parâmetro `id_cliente` para a consulta
    sqlRequest.input("id_cliente", sql.Int, id_cliente);

    // Executa a consulta no banco de dados
    const funcionariosResult = await sqlRequest.query(queryFuncionarios);
    // Mapeia os resultados da consulta, ocultando a senha dos funcionários
    const funcionarios = funcionariosResult.recordset.map((funcionarios) => ({
      ...funcionarios,
      senha: "senhaAntiga", // Oculta a senha real
    }));

    // Se não houver funcionários, retorna uma lista vazia
    if (!funcionarios.length) {
      return response.status(200).json([]);
    }

    // Consulta para listar os itens associados a cada funcionário
    const queryItensFuncionario = `
        SELECT *
        FROM Ret_Item_Funcionario 
        WHERE id_funcionario = @id_funcionario 
        AND deleted = 0
    `;
    // Itera sobre cada funcionário para buscar seus itens
    for (let funcionario of funcionarios) {
      const sqlRequestItens = new sql.Request();
      // Passa o ID do funcionário para a consulta de itens
      sqlRequestItens.input(
        "id_funcionario",
        sql.Int,
        funcionario.id_funcionario
      );

      // Executa a consulta de itens
      const itensResult = await sqlRequestItens.query(queryItensFuncionario);
      // Adiciona os itens ao funcionário
      const itens = itensResult.recordset;
      funcionario.itens = itens;
    }

    // Retorna os funcionários com seus itens associados
    response.status(200).json(funcionarios);
  } catch (error) {
    // Em caso de erro, registra no console e retorna erro 500
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}
async function listarFuncionariosPagianda(request, response) {
  try {
    const {
      id_cliente,
      first = 0,
      rows = 10,
      sortField = "id_funcionario",
      sortOrder = "ASC",
      filters = {},
    } = request.body; // Extrai os dados do corpo da requisição.

    // Verifica se o ID da função foi enviado.
    if (!id_cliente) {
      return response.status(401).json({ error: "ID do cliente não enviado" });
    }

    // Cria uma requisição SQL
    const sqlRequest = new sql.Request();

    // Query inicial com filtros básicos
    let queryFuncionarios = `
      SELECT 
        COUNT(*) OVER() AS TotalRecords, 
        funcionarios.*
      FROM 
        funcionarios
      WHERE 
        id_cliente = @id_cliente AND deleted = 0
    `;

    sqlRequest.input("id_cliente", sql.Int, id_cliente);
if (filters.global && filters.global.value) {
                    const globalValue = `%${filters.global.value}%`; // Adiciona o wildcard para LIKE
                    queryFuncionarios += ` AND (
                        funcionarios.nome LIKE @globalValue OR 
                        funcionarios.matricula LIKE @globalValue 
                    )`;
                
                    sqlRequest.input("globalValue", sql.NVarChar, globalValue);
                }
   
    // Ordenação e Paginação
    queryFuncionarios += `
      ORDER BY ${sortField} ${sortOrder === "DESC" ? "DESC" : "ASC"}
      OFFSET @first ROWS FETCH NEXT @rows ROWS ONLY;
    `;

    sqlRequest.input("first", sql.Int, first);
    sqlRequest.input("rows", sql.Int, rows);

    // Executa a consulta de funcionários
    const funcionariosResult = await sqlRequest.query(queryFuncionarios);

    // Extrai os dados paginados e o total de registros
    const funcionarios = funcionariosResult.recordset.map((funcionarios) => ({
      ...funcionarios,
      senha: "senhaAntiga", // Oculta a senha real
    }));
    const totalRecords =
      funcionarios.length > 0 ? funcionarios[0].TotalRecords : 0;
    if (!funcionarios.length) {
      return response.status(200).json([]);
    }
    // Consulta SQL
    const queryItensFuncionario = `
    SELECT *
    FROM Ret_Item_Funcionario 
    WHERE id_funcionario = @id_funcionario 
    AND deleted = 0
`;
    // Itera sobre cada funcionário para buscar seus itens
    for (let funcionario of funcionarios) {
      const sqlRequestItens = new sql.Request();
      // Passa o ID do funcionário para a consulta de itens
      sqlRequestItens.input(
        "id_funcionario",
        sql.Int,
        funcionario.id_funcionario
      );

      // Executa a consulta de itens
      const itensResult = await sqlRequestItens.query(queryItensFuncionario);
      // Adiciona os itens ao funcionário
      const itens = itensResult.recordset;
      funcionario.itens = itens;
    }

    // Retorna os dados paginados e o total de registros
    response.status(200).json({ funcionarios, totalRecords });
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função que lista apenas o ID e o nome dos funcionários de um cliente.
 * @param {Object} request - Objeto da requisição, contendo os dados enviados pelo cliente.
 * @param {Object} response - Objeto de resposta que será retornado para o cliente.
 */
async function listarFuncionariosSimples(request, response) {
  try {
    // Verifica se o ID do cliente foi enviado na requisição
    if (!request.body.id_cliente) {
      return response.status(401).json({ error: "ID do cliente não enviado" });
    }

    // Extrai o ID do cliente da requisição
    const id_cliente = request.body.id_cliente;

    // Consulta SQL para listar ID e nome dos funcionários do cliente
    const queryFuncionarios = `
            SELECT id_funcionario,nome
            FROM funcionarios 
            WHERE id_cliente = @id_cliente 
            AND deleted = 0
        `;

    // Cria uma requisição SQL
    const sqlRequest = new sql.Request();
    // Passa o parâmetro `id_cliente` para a consulta
    sqlRequest.input("id_cliente", sql.Int, id_cliente);

    // Executa a consulta no banco de dados
    const funcionariosResult = await sqlRequest.query(queryFuncionarios);
    // Mapeia os resultados da consulta
    const funcionarios = funcionariosResult.recordset;

    // Se não houver funcionários, retorna uma lista vazia
    if (!funcionarios.length) {
      return response.status(200).json([]);
    }

    // Retorna os funcionários com seus IDs e nomes
    response.status(200).json(funcionarios);
  } catch (error) {
    // Em caso de erro, registra no console e retorna erro 500
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}
async function listarFuncionarios(request, response) {
  try {
    // Verifica se o ID do cliente foi enviado na requisição
    if (!request.body.id_cliente) {
      return response.status(401).json({ error: "ID do cliente não enviado" });
    }

    // Extrai o ID do cliente da requisição

    const id_cliente = request.body.id_cliente;

    // Consulta SQL para listar ID e nome dos funcionários do cliente
    const queryFuncionarios = `
            SELECT *
            FROM funcionarios 
            WHERE id_cliente = @id_cliente 
            AND deleted = 0
        `;

    // Cria uma requisição SQL
    const sqlRequest = new sql.Request();
    // Passa o parâmetro `id_cliente` para a consulta
    sqlRequest.input("id_cliente", sql.Int, id_cliente);

    // Executa a consulta no banco de dados
    const funcionariosResult = await sqlRequest.query(queryFuncionarios);
    // Mapeia os resultados da consulta
    const funcionarios = funcionariosResult.recordset.map((funcionarios) => ({
      ...funcionarios,
      senha: "senhaAntiga", // Oculta a senha real
    }));

    // Se não houver funcionários, retorna uma lista vazia
    if (!funcionarios.length) {
      // Retorna os funcionários com seus IDs e nomes
      return response.status(200).json([]);
    }

    // Consulta SQL para listar ID e nome dos funcionários do cliente
    const queryItensFuncionario = `
        SELECT *
        FROM Ret_Item_Funcionario 
        WHERE id_funcionario = @id_funcionario 
        AND deleted = 0
    `;
    for (let funcionario of funcionarios) {
      const sqlRequestItens = new sql.Request();
      sqlRequestItens.input(
        "id_funcionario",
        sql.Int,
        funcionario.id_funcionario
      );

      const itensResult = await sqlRequestItens.query(queryItensFuncionario);
      const itens = itensResult.recordset;
      funcionario.itens = itens;
    }
    response.status(200).json(funcionarios);
  } catch (error) {
    // Em caso de erro, registra no console e retorna erro 500
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}
async function listarFuncionariosRelatorio(request, response) {
  try {
    // Verifica se o ID do cliente foi enviado.
    if (!request.body.id_cliente) {
      return response.status(401).json({ error: "ID do cliente não enviado" });
    }

    const id_cliente = request.body.id_cliente; // Extrai os dados do corpo da requisição.

    // Consulta SQL para listar ID e nome dos funcionários do cliente
    const queryFuncionarios = `
            SELECT id_funcionario,nome,id_setor,id_funcao,id_planta,id_centro_custo,data_admissao,matricula
            FROM funcionarios 
            WHERE id_cliente = @id_cliente 
            AND deleted = 0
        `;

    const sqlRequest = new sql.Request();
    sqlRequest.input("id_cliente", sql.Int, id_cliente);

    const funcionariosResult = await sqlRequest.query(queryFuncionarios);
    const funcionarios = funcionariosResult.recordset;

    if (!funcionarios.length) {
      return response.status(200).json([]);
    }
    response.status(200).json(funcionarios);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}
async function adiconarFuncionarioExt(request, response) {
  let transaction;
  // Resgatando os campos relevantes do form-data (dados do funcionário)
  const name = request.body["form_fields[name]"];
  const email = request.body["form_fields[email]"];
  const telefone = request.body["form_fields[Telefone]"];
  const empresa = request.body["form_fields[Empresa]"];
  const cargo = request.body["form_fields[Cargo]"];
  const id_usuario = request.body.id_usuario;

  // Consulta SQL 
  const query = `
          INSERT INTO funcionarios (id_cliente, nome, matricula, email, senha, empresa, cargo, sincronizado) 
          VALUES (@id_cliente, @nome, @matricula, @email, @senha, @empresa, @cargo, @sincronizado)
      `;

  try {
    // Inicia a transação no banco de dados
    transaction = new sql.Transaction();
    await transaction.begin();

    // Cria um hash MD5 da senha usando os últimos 4 dígitos do telefone
    const hashMD5 = CryptoJS.MD5(telefone.slice(-4)).toString();
    const sqlrequest = new sql.Request(transaction);
    // Passa os dados do funcionário para a consulta de inserção
    sqlrequest
      .input("id_cliente", sql.Int, 79)
      .input("nome", sql.VarChar, name)
      .input("matricula", sql.VarChar, telefone)
      .input("email", sql.VarChar, email)
      .input("senha", sql.VarChar, hashMD5)
      .input("Empresa", sql.VarChar, empresa)
      .input("Cargo", sql.VarChar, cargo)
      .input("Sincronizado", sql.Bit, 0);

    // Executa a consulta de inserção
    const result = await sqlrequest.query(query);
    // Se a inserção for bem-sucedida, envia e-mail e mensagem
    if (result.rowsAffected.length > 0) {
      const params = {
        id_cliente: 79,
        nome: name,
        matricula: telefone,
        email: email,
        senha: hashMD5,
        empresa: empresa,
        cargo: cargo,
        sincronizado: 0,
      };

      // Log da inserção no banco de dados
      logQuery(
        "info",
        `Funcionário ${name} inserido com sucesso pelo usuário ${id_usuario}`,
        "sucesso",
        "INSERT",
        null,
        id_usuario,
        query,
        params
      );

      // Geração do e-mail HTML para o funcionário
      let Email = generateEmailHTML2(telefone.slice(-4));
      // Envio do e-mail para o funcionário
      await sendEmail(email, "Sua senha", Email);

      // Log do envio de e-mail
      logQuery(
        "info",
        `E-mail enviado para ${email} com a senha de retirada`,
        "sucesso",
        "EMAIL",
        null,
        id_usuario,
        "sendEmail",
        { email }
      );

      // Envio da mensagem via ChatPro
      await enviarMensagem(telefone, id_usuario);

      // Commit da transação
      await transaction.commit();
      response
        .status(200)
        .json({ message: "Funcionário adicionado com sucesso." });
    }
  } catch (error) {
    if (transaction) {
      // Se houver erro, faz rollback da transação
      await transaction.rollback();
    }

    // Log de erro na inserção do funcionário
    const errorParams = {
      id_cliente: 79,
      nome: name,
      matricula: telefone,
      email: email,
      empresa: empresa,
      cargo: cargo,
    };

    logQuery(
      "error",
      `Erro ao adicionar funcionário ${name}: ${error.message}`,
      "falha",
      "ERROR",
      null,
      id_usuario,
      query,
      errorParams
    );

    // Log do stack trace
    logQuery(
      "error",
      `Stack trace: ${error.stack}`,
      "falha",
      "ERROR_STACK",
      null,
      id_usuario,
      query,
      {}
    );

    console.error("Erro ao adicionar funcionário:", error);
    response.status(500).json({ error: "Erro ao adicionar funcionário." });
  }
}

/**
 * Função para enviar uma mensagem via API do ChatPro.
 * @param {string} telefone - Número do telefone para o qual a mensagem será enviada.
 * @param {number} id_usuario - ID do usuário que está enviando a mensagem.
 */
const enviarMensagem = async (telefone, id_usuario) => {
  const options = {
    method: "POST",
    url: "https://v5.chatpro.com.br/chatpro-w2u3pnxtci/api/v1/send_message",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      Authorization: "ac9de8b5b1f8f8cd344c8e9057e365e7",
    },
    data: {
      number: `${telefone}`,
      message: `Sua senha para retirada é: ${telefone.slice(-4)}`,
    },
  };

  try {
    const response = await axios.request(options);
    if (response.status === 201) {
      console.log("Mensagem enviada com sucesso:", response.data);

      // Log de sucesso
      logQuery(
        "info",
        `Mensagem enviada para o telefone ${telefone}`,
        "sucesso",
        "CHATPRO",
        null,
        id_usuario,
        "send_message",
        { telefone }
      );
    } else {
      console.error(
        "Falha ao enviar a mensagem:",
        response.status,
        response.statusText
      );

      // Log de falha
      logQuery(
        "error",
        `Falha ao enviar a mensagem para o telefone ${telefone}`,
        "falha",
        "CHATPRO",
        null,
        id_usuario,
        "send_message",
        { telefone, status: response.status, statusText: response.statusText }
      );
    }
  } catch (error) {
    console.error("Erro ao enviar a mensagem:", error.message);

    // Log do erro completo com stack trace
    logQuery(
      "error",
      `Erro ao enviar mensagem para o telefone ${telefone}`,
      "falha",
      "CHATPRO",
      null,
      id_usuario,
      "send_message",
      { telefone, error: error.message, stack: error.stack }
    );
  }
};

/**
 * Função para adicionar um novo funcionário ao banco de dados.
 * @async
 * @function adicionarFuncionarios
 * @param {Object} request - Objeto contendo os dados enviados pelo cliente.
 * @param {Object} response - Objeto de resposta que será enviado de volta ao cliente.
 * @returns {void} Responde com uma mensagem de sucesso ou erro.
 */
async function adicionarFuncionarios(request, response) {
  // Desestruturando os dados do corpo da requisição para variáveis
  const {
    id_setor, // ID do setor do funcionário
    id_funcao, // ID da função do funcionário
    nome, // Nome do funcionário
    matricula, // Matrícula do funcionário
    biometria, // Biometria do funcionário
    RG, // RG do funcionário
    CPF, // CPF do funcionário
    CTPS, // CTPS do funcionário
    id_planta, // ID da planta (local onde o funcionário trabalha)
    data_admissao, // Data de admissão do funcionário
    hora_inicial, // Hora inicial de trabalho
    hora_final, // Hora final de trabalho
    segunda, // Booleano que indica se o funcionário trabalha na segunda-feira
    terca, // Booleano que indica se o funcionário trabalha na terça-feira
    quarta, // Booleano que indica se o funcionário trabalha na quarta-feira
    quinta, // Booleano que indica se o funcionário trabalha na quinta-feira
    sexta, // Booleano que indica se o funcionário trabalha na sexta-feira
    sabado, // Booleano que indica se o funcionário trabalha no sábado
    domingo, // Booleano que indica se o funcionário trabalha no domingo
    ordem, // Ordem do funcionário na lista
    id_centro_custo, // ID do centro de custo associado ao funcionário
    status, // Status do funcionário (ativo/inativo)
    senha, // Senha do funcionário
    biometria2, // Segunda biometria do funcionário
    email, // E-mail do funcionário
    face, // Foto do rosto do funcionário
    id_usuario, // ID do usuário que está criando o funcionário
  } = request.body;

  // Obtendo o id_cliente (cliente) do corpo da requisição
  const id_cliente = request.body.id_cliente;

  // Variável para armazenar o nome do arquivo de foto do funcionário
  let nomeFuncionario = "";

  // Definindo a query SQL para inserir os dados do novo funcionário
  const query = `INSERT INTO funcionarios
        (id_cliente, id_setor, id_funcao, nome, matricula, 
         biometria, RG, CPF, CTPS, id_planta, foto, data_admissao, 
         hora_inicial, hora_final,
         segunda, terca, quarta, quinta, sexta, sabado, domingo, 
         deleted, ordem, id_centro_custo, status, senha, biometria2, email, face, Sincronizado)
        VALUES (@id_cliente, @id_setor, 
        @id_funcao, @nome, @matricula, @biometria, @RG,
        @CPF, @CTPS, @id_planta, @foto, @data_admissao, 
        @hora_inicial, @hora_final,
        @segunda, @terca, @quarta, @quinta, @sexta, @sabado, @domingo,
        @deleted, @ordem, @id_centro_custo, @status, @senha, 
        @biometria2, @email, @face, 0)`;

  // Parâmetros que serão usados na consulta SQL
  const params = {
    id_cliente, // ID do cliente
    id_setor, // ID do setor
    id_funcao, // ID da função
    nome, // Nome do funcionário
    matricula, // Matrícula do funcionário
    biometria, // Biometria
    RG, // RG
    CPF, // CPF
    CTPS, // CTPS
    id_planta, // ID da planta
    foto: nomeFuncionario, // Foto do funcionário (nome do arquivo)
    data_admissao, // Data de admissão
    hora_inicial, // Hora inicial de trabalho
    hora_final, // Hora final de trabalho
    segunda: convertToBoolean(segunda), // Converte os valores "true" ou "false" para booleano
    terca: convertToBoolean(terca),
    quarta: convertToBoolean(quarta),
    quinta: convertToBoolean(quinta),
    sexta: convertToBoolean(sexta),
    sabado: convertToBoolean(sabado),
    domingo: convertToBoolean(domingo),
    deleted: false, // Definindo que o funcionário não está excluído
    ordem, // Ordem do funcionário na lista
    id_centro_custo, // Centro de custo
    status, // Status do funcionário
    senha, // Senha do funcionário
    biometria2, // Segunda biometria
    email, // E-mail do funcionário
    face, // Foto do rosto do funcionário
  };

  try {
    // Gerenciamento de arquivos enviados na requisição
    const files = request.files; // Obtém os arquivos enviados

    // Função para sanitizar o nome do arquivo (retirar caracteres especiais e acentos)
    const sanitizeFileName = (filename) => {
      if (typeof filename === "string") {
        const parts = filename.split("."); // Divide o nome do arquivo em partes (nome + extensão)
        const extension = parts.length > 1 ? `.${parts.pop()}` : ""; // Pega a extensão do arquivo
        const nameWithoutExtension = parts
          .join(".")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Remove acentos
          .replace(/[^a-zA-Z0-9 _]/g, "-") // Substitui caracteres especiais por '-'
          .replace(/ /g, "_"); // Substitui espaços por '_'
        return `${nameWithoutExtension}${extension}`; // Retorna o nome do arquivo sanitizado
      } else {
        console.error("Filename is not a string:", filename); // Log do erro se o nome do arquivo não for string
        return "unknown_filename"; // Retorna um nome padrão se não for string
      }
    };

    const uploadPath = path.join(
      __dirname, // Caminho do diretório atual
      "../../uploads/funcionarios", // Diretório para upload de fotos
      id_cliente.toString() // Subdiretório para cada cliente
    );

    // Criação do diretório de upload, caso não exista
    await fs.mkdir(uploadPath, { recursive: true });

    // Loop para processar cada arquivo enviado
    for (let i = 0; i < files.length; i++) {
      const file = files[i]; // Obtém o arquivo atual
      const fileExtension = path.extname(file.originalname); // Obtém a extensão do arquivo
      nomeFuncionario = sanitizeFileName(`${nome}${fileExtension}`); // Sanitiza o nome do arquivo
      const filePath = path.join(uploadPath, nomeFuncionario); // Caminho completo do arquivo
      await fs.writeFile(filePath, file.buffer); // Salva o arquivo no sistema
    }

    // Criptografia da senha com MD5
    const hashMd5 = CryptoJS.MD5(senha).toString();

    // Criação de uma requisição SQL para inserir o funcionário
    const sqlRequest = new sql.Request();
    sqlRequest.input("id_cliente", sql.Int, id_cliente); // Adiciona o parâmetro id_cliente
    sqlRequest.input("id_setor", sql.Int, id_setor); // Adiciona o parâmetro id_setor
    sqlRequest.input("id_funcao", sql.Int, id_funcao); // Adiciona o parâmetro id_funcao
    sqlRequest.input("nome", sql.VarChar, nome); // Adiciona o parâmetro nome
    sqlRequest.input("matricula", sql.VarChar, matricula); // Adiciona o parâmetro matricula
    sqlRequest.input("biometria", sql.NVarChar, biometria); // Adiciona o parâmetro biometria
    sqlRequest.input("RG", sql.VarChar, RG); // Adiciona o parâmetro RG
    sqlRequest.input("CPF", sql.VarChar, CPF); // Adiciona o parâmetro CPF
    sqlRequest.input("CTPS", sql.VarChar, CTPS); // Adiciona o parâmetro CTPS
    sqlRequest.input(
      "id_planta",
      sql.Int,
      id_planta ? parseInt(id_planta, 10) : 0
    ); // Adiciona o parâmetro id_planta
    sqlRequest.input("foto", sql.VarChar, nomeFuncionario); // Adiciona o parâmetro foto (nome do arquivo)
    sqlRequest.input("data_admissao", sql.DateTime, data_admissao); // Adiciona o parâmetro data_admissao
    sqlRequest.input("hora_inicial", sql.Time, hora_inicial); // Adiciona o parâmetro hora_inicial
    sqlRequest.input("hora_final", sql.Time, hora_final); // Adiciona o parâmetro hora_final
    sqlRequest.input("segunda", sql.Bit, convertToBoolean(segunda)); // Adiciona o parâmetro segunda
    sqlRequest.input("terca", sql.Bit, convertToBoolean(terca)); // Adiciona o parâmetro terca
    sqlRequest.input("quarta", sql.Bit, convertToBoolean(quarta)); // Adiciona o parâmetro quarta
    sqlRequest.input("quinta", sql.Bit, convertToBoolean(quinta)); // Adiciona o parâmetro quinta
    sqlRequest.input("sexta", sql.Bit, convertToBoolean(sexta)); // Adiciona o parâmetro sexta
    sqlRequest.input("sabado", sql.Bit, convertToBoolean(sabado)); // Adiciona o parâmetro sabado
    sqlRequest.input("domingo", sql.Bit, convertToBoolean(domingo)); // Adiciona o parâmetro domingo
    sqlRequest.input("deleted", sql.Bit, false); // Define que o funcionário não foi excluído
    sqlRequest.input("ordem", sql.Int, ordem); // Adiciona o parâmetro ordem
    sqlRequest.input("id_centro_custo", sql.Int, id_centro_custo); // Adiciona o parâmetro id_centro_custo
    sqlRequest.input("status", sql.NVarChar, status); // Adiciona o parâmetro status
    sqlRequest.input("senha", sql.NVarChar, hashMd5); // Adiciona a senha criptografada
    sqlRequest.input("biometria2", sql.NVarChar, biometria2); // Adiciona a segunda biometria
    sqlRequest.input("email", sql.VarChar, email); // Adiciona o e-mail
    sqlRequest.input("face", sql.VarChar, face); // Adiciona a foto do rosto

    // Executa a consulta SQL
    const result = await sqlRequest.query(query);

    // Verifica se a inserção foi bem-sucedida
    if (result.rowsAffected[0] > 0) {
      // Se a inserção foi bem-sucedida, responde com sucesso
      response.status(201).send("Funcionário criado com sucesso!");
    } else {
      // Se a inserção falhou, responde com erro
      response.status(400).send("Falha ao criar o funcionário");
    }
  } catch (error) {
    // Caso ocorra algum erro durante o processo, responde com erro
    const errorMessage = error.message.includes(
      "Query não fornecida para logging"
    )
      ? "Erro crítico: Falha na operação"
      : `Erro ao adicionar funcionário: ${error.message}`;
    console.error("Erro ao inserir funcionário:", error.message); // Registra o erro no console
    response.status(500).send("Erro ao inserir funcionário"); // Responde com erro genérico
  }
}

/**
 * Função para fazer upload da foto do funcionário.
 * @async
 * @function foto
 * @param {Object} request - Objeto contendo os dados da requisição.
 * @param {Object} response - Objeto de resposta.
 * @returns {void} Responde com a foto ou erro.
 */
async function foto(request, response) {
  // Verifica se foi enviado algum arquivo na requisição
  if (!request.files) {
    // Caso não tenha arquivos, responde com erro
    return response.status(400).send("Nenhum arquivo foi enviado.");
  }

  // Obtém o id_cliente do corpo da requisição
  const { id_cliente } = request.body;

  // Obtém o arquivo enviado (no caso, a foto do funcionário)
  const foto = request.file;

  // Aqui seria necessário salvar o arquivo ou realizar algum processamento adicional
}

/**
 * Função para listar os centros de custo de um cliente.
 * @async
 * @function listarCentroCusto
 * @param {Object} request - Objeto contendo os dados da requisição.
 * @param {Object} response - Objeto de resposta.
 * @returns {void} Retorna a lista de centros de custo ou erro.
 */
async function listarCentroCusto(request, response) {
  try {
    // Inicializa a consulta SQL para obter os centros de custo
    let query = "SELECT DISTINCT id_centro_custo FROM funcionarios WHERE 1 = 1";

    // Verifica se o id_cliente foi fornecido na requisição
    if (request.body.id_cliente) {
      // Adiciona filtro para id_cliente na consulta
      query += ` AND id_cliente = '${request.body.id_cliente}'`;

      // Executa a consulta SQL
      const result = await new sql.Request().query(query);

      // Retorna a lista de centros de custo
      response.status(200).json(result.recordset);
      return;
    }

    // Caso não tenha o id_cliente, responde com erro
    response.status(401).json("id do cliente não enviado");
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para listar os setores da diretoria de um cliente.
 * @async
 * @function listarSetorDiretoria
 * @param {Object} request - Objeto contendo os dados da requisição.
 * @param {Object} response - Objeto de resposta.
 * @returns {void} Retorna a lista de setores ou erro.
 */
async function listarSetorDiretoria(request, response) {
  try {
    // Inicializa a consulta SQL para obter os setores
    let query = "SELECT DISTINCT id_setor FROM funcionarios WHERE 1 = 1";

    // Verifica se o id_cliente foi fornecido
    if (request.body.id_cliente) {
      // Adiciona o filtro de id_cliente
      query += ` AND id_cliente = '${request.body.id_cliente}'`;

      // Executa a consulta
      const result = await new sql.Request().query(query);

      // Retorna a lista de setores
      response.status(200).json(result.recordset);
      return;
    }

    // Caso não tenha o id_cliente, responde com erro
    response.status(401).json("id do cliente não enviado");
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para listar as funções hierárquicas dos funcionários.
 * @async
 * @function listarHierarquia
 * @param {Object} request - Objeto contendo os dados da requisição.
 * @param {Object} response - Objeto de resposta.
 * @returns {void} Retorna a lista de funções ou erro.
 */
async function listarHierarquia(request, response) {
  try {
    // Inicializa a consulta SQL para obter as funções dos funcionários
    let query = "SELECT DISTINCT id_funcao FROM funcionarios WHERE 1 = 1";

    // Verifica se o id_cliente foi fornecido
    if (request.body.id_cliente) {
      // Adiciona o filtro de id_cliente
      query += ` AND id_cliente = '${request.body.id_cliente}'`;

      // Executa a consulta
      const result = await new sql.Request().query(query);

      // Retorna a lista de funções
      response.status(200).json(result.recordset);
      return;
    }

    // Caso não tenha o id_cliente, responde com erro
    response.status(401).json("id do cliente não enviado");
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para listar as plantas associadas a um cliente.
 *
 * Esta função consulta o banco de dados para obter as plantas (id_planta) de
 * funcionários relacionados ao id_cliente fornecido na requisição.
 *
 * @async
 * @function listarPlanta
 * @param {Object} request - Objeto contendo os dados enviados pelo cliente.
 * @param {Object} response - Objeto de resposta que será enviado ao cliente.
 * @returns {void} Retorna uma lista de plantas ou um erro.
 */
async function listarPlanta(request, response) {
  try {
    // Inicializa a consulta SQL para obter as plantas dos funcionários
    let query = "SELECT DISTINCT id_planta FROM funcionarios WHERE 1 = 1";

    // Verifica se o id_cliente foi enviado na requisição
    if (request.body.id_cliente) {
      // Adiciona filtro para id_cliente na consulta
      query += ` AND id_cliente = '${request.body.id_cliente}'`;

      // Executa a consulta SQL
      const result = await new sql.Request().query(query);

      // Retorna os resultados da consulta no formato JSON
      response.status(200).json(result.recordset);
      return;
    }

    // Se o id_cliente não foi fornecido, retorna erro 401
    response.status(401).json("id do cliente não enviado");
  } catch (error) {
    // Caso ocorra um erro, imprime no console e retorna erro 500
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para excluir um funcionário.
 *
 * Esta função marca um funcionário como excluído (definindo `deleted = 1`)
 * no banco de dados, com base no id_funcionario fornecido na requisição.
 *
 * @async
 * @function deleteFuncionario
 * @param {Object} request - Objeto contendo os dados enviados pelo cliente.
 * @param {Object} response - Objeto de resposta que será enviado ao cliente.
 * @returns {void} Retorna a confirmação da exclusão ou um erro.
 */
async function deleteFuncionario(request, response) {
  // Desestrutura os dados necessários da requisição
  const { id_usuario, id_cliente, id_funcionario } = request.body;

  // Verifica se o id_funcionario foi fornecido na requisição
  if (!id_funcionario) {
    // Se o id_funcionario não foi fornecido, retorna erro 401
    return response.status(401).json("ID do funcionário não foi enviado");
  }

  // Consulta SQL para marcar o funcionário como excluído
  const query = `
  UPDATE Funcionarios SET deleted = 1 WHERE id_funcionario = @id_funcionario;
    
  UPDATE Ret_Item_Funcionario SET deleted = 1 WHERE id_funcionario = @id_funcionario;`;
  const params = id_funcionario;

  try {
    // Cria uma instância de consulta SQL
    const sqlRequest = new sql.Request();
    // Define o parâmetro para a consulta SQL
    sqlRequest.input("id_funcionario", sql.Int, id_funcionario);

    // Executa a consulta de exclusão
    const result = await sqlRequest.query(query);

    // Verifica se a exclusão foi bem-sucedida
    if (result.rowsAffected[0] > 0) {
      // Se foi, retorna uma mensagem de sucesso
      return response
        .status(200)
        .json({ message: "Funcionário deletado com sucesso!" });
    } else {
      // Caso não tenha ocorrido alteração, retorna erro 400
      return response
        .status(400)
        .send("Nenhuma alteração foi feita no funcionário.");
    }
  } catch (error) {
    // Caso ocorra algum erro, imprime no console e retorna erro 500
    console.error("Erro ao excluir:", error.message);
    return response
      .status(500)
      .send(`Erro ao excluir funcionário: ${error.message}`);
  }
}

/**
 * Função para atualizar os dados de um funcionário.
 *
 * Esta função recebe os dados atualizados de um funcionário e os insere
 * ou atualiza no banco de dados. Caso a foto ou outros arquivos sejam
 * enviados, eles também são processados e salvos no sistema.
 *
 * @async
 * @function atualizarFuncionario
 * @param {Object} request - Objeto contendo os dados enviados pelo cliente.
 * @param {Object} response - Objeto de resposta que será enviado ao cliente.
 * @returns {void} Retorna uma mensagem de sucesso ou erro.
 */
async function atualizarFuncionario(request, response) {
  // Consulta SQL para atualizar os dados do funcionário no banco de dados
  const query = `
    UPDATE funcionarios
    SET id_setor = @id_setor, id_funcao = @id_funcao,
        nome = @nome, matricula = @matricula, biometria = @biometria,
        RG = @RG, CPF = @CPF, CTPS = @CTPS, id_planta = @id_planta,
        foto = @foto, data_admissao = @data_admissao, hora_inicial = @hora_inicial,
        hora_final = @hora_final, segunda = @segunda, terca = @terca,
        quarta = @quarta, quinta = @quinta, sexta = @sexta, sabado = @sabado,
        domingo = @domingo, id_centro_custo = @id_centro_custo,
        status = @status, senha = @senha, biometria2 = @biometria2,
        email = @email, face = @face
    WHERE id_funcionario = @id_funcionario`;

  // Desestrutura os dados enviados na requisição
  const {
    id_funcionario,
    id_setor,
    id_funcao,
    nome,
    matricula,
    biometria,
    RG,
    CPF,
    CTPS,
    id_planta,
    data_admissao,
    hora_inicial,
    hora_final,
    segunda,
    terca,
    quarta,
    quinta,
    sexta,
    sabado,
    domingo,
    id_centro_custo,
    status,
    senha,
    biometria2,
    email,
    face,
    foto,
    id_usuario,
  } = request.body;

  let itens = request.body.itens;

  // Se os itens forem passados como string, tenta convertê-los para objeto
  if (typeof itens === "string") {
    try {
      itens = JSON.parse(itens);
    } catch (error) {
      console.error("Erro ao fazer parse de itens:", error);
      return response.status(400).json({ error: "Formato inválido de itens" });
    }
  }

  // Define o nome da foto do funcionário
  let nomeFuncionario = foto;
  const id_cliente = request.body.id_cliente;
  const files = request.files; // Arquivos enviados na requisição
  const hashMd5 = CryptoJS.MD5(senha).toString(); // Criptografa a senha
  const params = {
    id_funcionario,
    id_setor,
    id_funcao,
    nome,
    matricula,
    biometria,
    RG,
    CPF,
    CTPS,
    id_planta,
    foto: nomeFuncionario,
    data_admissao,
    hora_inicial,
    hora_final,
    segunda,
    terca,
    quarta,
    quinta,
    sexta,
    sabado,
    domingo,
    id_centro_custo,
    status,
    hashMd5,
    biometria2,
    email,
    face,
  };

  try {
    // Se arquivos foram enviados, realiza o upload da foto
    if (files && files.length > 0) {
      const file = files[0];
      const uploadPath = path.join(
        process.cwd(),
        "src",
        "uploads",
        "funcionarios",
        id_cliente.toString()
      );
      await fs.mkdir(uploadPath, { recursive: true });
      const filePath = path.join(uploadPath, foto);
      await fs.writeFile(filePath, file.buffer);
    }

    // Cria a consulta SQL para atualizar os dados do funcionário
    const sqlRequest = new sql.Request();
    sqlRequest.input("id_funcionario", sql.Int, id_funcionario);
    sqlRequest.input("id_setor", sql.Int, id_setor);
    sqlRequest.input("id_funcao", sql.Int, id_funcao);
    sqlRequest.input("nome", sql.VarChar, nome);
    sqlRequest.input("matricula", sql.VarChar, matricula);
    sqlRequest.input("biometria", sql.NVarChar, biometria);
    sqlRequest.input("RG", sql.VarChar, RG);
    sqlRequest.input("CPF", sql.VarChar, CPF);
    sqlRequest.input("CTPS", sql.VarChar, CTPS);
    sqlRequest.input("id_planta", sql.Int, id_planta);
    sqlRequest.input("foto", sql.VarChar, foto);
    sqlRequest.input("data_admissao", sql.DateTime, data_admissao);
    sqlRequest.input("hora_inicial", sql.Time, hora_inicial);
    sqlRequest.input("hora_final", sql.Time, hora_final);
    sqlRequest.input("segunda", sql.Bit, convertToBoolean(segunda));
    sqlRequest.input("terca", sql.Bit, convertToBoolean(terca));
    sqlRequest.input("quarta", sql.Bit, convertToBoolean(quarta));
    sqlRequest.input("quinta", sql.Bit, convertToBoolean(quinta));
    sqlRequest.input("sexta", sql.Bit, convertToBoolean(sexta));
    sqlRequest.input("sabado", sql.Bit, convertToBoolean(sabado));
    sqlRequest.input("domingo", sql.Bit, convertToBoolean(domingo));
    sqlRequest.input("id_centro_custo", sql.Int, id_centro_custo);
    sqlRequest.input("status", sql.NVarChar, status);
    sqlRequest.input("senha", sql.NVarChar, hashMd5);
    sqlRequest.input("biometria2", sql.NVarChar, biometria2);
    sqlRequest.input("email", sql.VarChar, email);
    sqlRequest.input("face", sql.VarChar, face);

    // Executa a consulta SQL de atualização
    const result = await sqlRequest.query(query);

    // Verifica se a atualização foi bem-sucedida
    if (result.rowsAffected[0] > 0) {
      let itensAlterados = false;

      // Se houver itens para alterar, processa cada um
      if (itens && itens.length > 0) {
        for (const item of itens) {
          // Processa cada tipo de ação (new, update, delete)
          if (item.action === "new") {
            const insertQuery = `
              INSERT INTO Ret_Item_Funcionario (id_funcionario, id_produto, nome_produto, sku, quantidade)
              VALUES (@id_funcionario, @id_produto, @nome_produto, @sku, @quantidade)
            `;
            const insertRequest = new sql.Request();
            insertRequest.input("id_funcionario", sql.Int, id_funcionario);
            insertRequest.input("id_produto", sql.Int, item.id_produto);
            insertRequest.input("nome_produto", sql.VarChar, item.nome_produto);
            insertRequest.input("sku", sql.VarChar, item.sku);
            insertRequest.input("quantidade", sql.Int, item.quantidade);
            await insertRequest.query(insertQuery);
            itensAlterados = true;
          } else if (item.action === "update") {
            const updateQuery = `
              UPDATE Ret_Item_Funcionario
              SET quantidade = @quantidade
              WHERE id_item_funcionario = @id_item_funcionario
            `;
            const updateRequest = new sql.Request();
            updateRequest.input(
              "id_item_funcionario",
              sql.Int,
              item.id_item_funcionario
            );
            updateRequest.input("quantidade", sql.Int, item.quantidade);
            await updateRequest.query(updateQuery);
            itensAlterados = true;
          } else if (item.action === "delete") {
            const deleteQuery = `
              UPDATE Ret_Item_Funcionario
              SET deleted = 1
              WHERE id_item_funcionario = @id_item_funcionario
            `;
            const deleteRequest = new sql.Request();
            deleteRequest.input(
              "id_item_funcionario",
              sql.Int,
              item.id_item_funcionario
            );
            await deleteRequest.query(deleteQuery);
            itensAlterados = true;
          }
        }
      }

      // Retorna resposta dependendo se houve alterações nos itens
      if (itensAlterados) {
        response
          .status(200)
          .json({ message: "Funcionário e itens atualizados com sucesso!" });
      } else {
        response.status(200).json({
          message: "Funcionário atualizado, sem alterações nos itens.",
        });
      }
    } else {
      response.status(400).send("Nenhuma alteração foi feita no funcionário.");
    }
  } catch (error) {
    // Caso ocorra um erro durante a atualização
    console.error("Erro ao atualizar funcionário:", error.message);
    response.status(500).send("Erro ao atualizar funcionário");
  }
}

/**
 * Função para adicionar um item a um funcionário.
 *
 * Esta função insere um novo item no banco de dados ou atualiza a quantidade de um item existente.
 *
 * @async
 * @function adicionarItem
 * @param {Object} request - Objeto com os dados enviados pelo cliente.
 * @param {Object} response - Objeto de resposta a ser enviado ao cliente.
 * @returns {void} Resposta com os dados do item ou erro.
 */
async function adicionarItem(request, response) {
  try {
    // Extrai os dados do corpo da requisição.
    let { id_produto, id_funcionario, id_cliente, quantidade, deleted } =
      request.body;

    // Verifica se os IDs do produto e do cliente foram enviados.
    if (!id_produto || !id_cliente) {
      return response
        .status(400)
        .json({ message: "ID do produto e cliente são obrigatórios" });
    }

    // Cria uma instância para a execução de consultas SQL.
    const requestDb = new sql.Request();
    requestDb.input("id_produto", sql.Int, id_produto);
    requestDb.input("id_cliente", sql.Int, id_cliente);

    // Se o ID do funcionário não for enviado, pega o último funcionário cadastrado.
    if (!id_funcionario) {
      const queryUltimoFuncionario = `
        SELECT TOP 1 id_funcionario
        FROM Funcionarios
        ORDER BY id_funcionario DESC
      `;
      const funcionarioResult = await requestDb.query(queryUltimoFuncionario);

      // Caso não encontre nenhum funcionário, retorna erro.
      if (funcionarioResult.recordset.length === 0) {
        return response.status(400).json({
          message: "Nenhum funcionário encontrado para o id_cliente fornecido.",
        });
      }

      // Atribui o próximo ID do funcionário para o novo item.
      id_funcionario = funcionarioResult.recordset[0].id_funcionario + 1;
    }

    // Consulta o banco de dados para buscar as informações do produto.
    const queryProduto = `
      SELECT codigo AS sku, nome, imagem1
      FROM Produtos
      WHERE id_produto = @id_produto AND Deleted = 0
    `;
    const produtoResult = await requestDb.query(queryProduto);

    // Se o produto não for encontrado, retorna erro.
    if (produtoResult.recordset.length === 0) {
      return response.status(404).json({ message: "Produto não encontrado" });
    }

    // Extrai os dados do produto retornado da consulta.
    const { sku, nome: nomeProduto, imagem1 } = produtoResult.recordset[0];

    // Verifica se o item já existe para o funcionário.
    const queryCheckExistente = `
      SELECT id_item_funcionario, quantidade
      FROM Ret_Item_Funcionario
      WHERE id_produto = @id_produto AND id_funcionario = @id_funcionario AND Deleted = 0
    `;
    requestDb.input("id_funcionario", sql.Int, id_funcionario);
    const checkResult = await requestDb.query(queryCheckExistente);

    // Se o item já existe, atualiza a quantidade do item.
    if (checkResult.recordset.length > 0) {
      const { id_item_funcionario } = checkResult.recordset[0];
      const novaQuantidade = Number(quantidade);

      const updateQuery = `
        UPDATE Ret_Item_Funcionario
        SET quantidade = @novaQuantidade
        WHERE id_item_funcionario = @id_item_funcionario
      `;
      const updateRequest = new sql.Request();
      updateRequest.input("novaQuantidade", sql.Int, novaQuantidade);
      updateRequest.input("id_item_funcionario", sql.Int, id_item_funcionario);

      // Executa a atualização no banco de dados.
      const RESULT = await updateRequest.query(updateQuery);

      // Se a atualização for bem-sucedida, retorna os dados atualizados.
      if (RESULT.rowsAffected[0] > 0) {
        const listarRequest = new sql.Request();
        const queryItensFuncionario = `
          SELECT *
          FROM Ret_Item_Funcionario 
          WHERE id_funcionario = @id_funcionario 
            AND deleted = 0
        `;
        listarRequest.input("id_funcionario", sql.Int, id_funcionario);
        const result = await listarRequest.query(queryItensFuncionario);
        return response.status(201).json({
          dados: result.recordsets,
          message: "Item adicionado com sucesso",
        });
      }
    } else {
      // Se o item não existir, insere um novo item.
      const queryMaxId = `SELECT ISNULL(MAX(id_item_funcionario), 0) + 1 FROM Ret_Item_Funcionario`;
      const idResult = await requestDb.query(queryMaxId);

      const insertQuery = `
        INSERT INTO Ret_Item_Funcionario (id_funcionario, id_produto, sku, nome_produto, quantidade, deleted)
        VALUES (@id_funcionario, @id_produto, @sku, @nome_produto, @quantidade, @deleted)
      `;
      const insertRequest = new sql.Request();
      insertRequest.input("id_funcionario", sql.Int, id_funcionario);
      insertRequest.input("id_produto", sql.Int, id_produto);
      insertRequest.input("sku", sql.NVarChar, sku);
      insertRequest.input("nome_produto", sql.NVarChar, nomeProduto);
      insertRequest.input("quantidade", sql.Int, quantidade);
      insertRequest.input("deleted", sql.Bit, deleted || 0);

      // Executa a inserção no banco de dados.
      const insertResult = await insertRequest.query(insertQuery);

      // Se a inserção for bem-sucedida, retorna os dados do item.
      if (insertResult.rowsAffected[0] > 0) {
        const listarRequest = new sql.Request();
        const queryItensFuncionario = `
          SELECT *
          FROM Ret_Item_Funcionario 
          WHERE id_funcionario = @id_funcionario 
            AND deleted = 0
        `;
        listarRequest.input("id_funcionario", sql.Int, id_funcionario);
        const result = await listarRequest.query(queryItensFuncionario);
        return response.status(201).json({
          dados: result.recordsets,
          message: "Item adicionado com sucesso",
        });
      }
    }
  } catch (error) {
    // Caso ocorra um erro, imprime a mensagem de erro e retorna uma resposta de erro.
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para listar todos os operadores de um cliente.
 *
 * Esta função consulta o banco de dados para obter todos os operadores do cliente
 * especificado pelo ID do cliente.
 *
 * @async
 * @function listarOperadores
 * @param {Object} request - Objeto com os dados enviados pelo cliente.
 * @param {Object} response - Objeto de resposta a ser enviado ao cliente.
 * @returns {void} Lista de operadores ou erro.
 */
async function listarOperadores(request, response) {
  const { id_cliente } = request.body;

  try {
    // Verifica se o id_cliente foi fornecido.
    if (!id_cliente) {
      return response.status(401).json("ID do cliente não enviado");
    }

    // Consulta SQL para buscar os operadores do cliente.
    let query =
      "SELECT * FROM Usuarios WHERE deleted = 0 AND role = 'Operador' AND id_cliente = @id_cliente";
    const dbRequest = new sql.Request();
    dbRequest.input("id_cliente", sql.Int, id_cliente);

    // Executa a consulta e retorna os resultados.
    const result = await dbRequest.query(query);
    response.status(200).json(result.recordset);
  } catch (error) {
    // Caso ocorra um erro, imprime a mensagem de erro e retorna uma resposta de erro.
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}

/**
 * Função para deletar um item de um funcionário.
 *
 * Esta função marca um item como deletado no banco de dados.
 *
 * @async
 * @function deleteItem
 * @param {Object} request - Objeto com os dados enviados pelo cliente.
 * @param {Object} response - Objeto de resposta a ser enviado ao cliente.
 * @returns {void} Resposta com a confirmação ou erro.
 */
async function deleteItem(request, response) {
  const { id_produto, id_funcionario, id_cliente, quantidade } = request.body;

  // Verifica se o ID do produto foi enviado.
  if (!id_produto) {
    return response.status(400).json({ error: "ID do Item não foi enviado" });
  }

  // Consulta SQL para marcar o item como deletado.
  const deleteQuery = `
    UPDATE Ret_Item_Funcionario 
    SET deleted = 1 
    WHERE id_produto = @id_produto AND id_funcionario = @id_funcionario
  `;

  // Consulta para buscar os itens restantes do funcionário.
  const fetchItemsQuery = `
    SELECT * 
    FROM Ret_Item_Funcionario 
    WHERE id_funcionario = @id_funcionario 
      AND deleted = 0
  `;

  try {
    const sqlRequest = new sql.Request();

    // Parâmetros da consulta.
    sqlRequest.input("id_produto", sql.Int, id_produto);
    sqlRequest.input("id_funcionario", sql.Int, id_funcionario);

    // Executa a exclusão do item.
    const deleteResult = await sqlRequest.query(deleteQuery);

    // Se a exclusão for bem-sucedida, retorna os itens restantes.
    if (deleteResult.rowsAffected[0] > 0) {
      const fetchRequest = new sql.Request();
      fetchRequest.input("id_funcionario", sql.Int, id_funcionario);

      const result = await fetchRequest.query(fetchItemsQuery);

      return response.status(200).json({
        message: "Item deletado com sucesso!",
        items: result.recordset,
      });
    } else {
      return response
        .status(400)
        .json({ error: "Nenhuma alteração foi feita no item." });
    }
  } catch (error) {
    // Caso ocorra um erro, imprime a mensagem de erro e retorna uma resposta de erro.
    console.error("Erro ao excluir:", error.message);
    return response
      .status(500)
      .json({ error: `Erro ao excluir item: ${error.message}` });
  }
}
async function fetchdados(request, response) {
  const { id_funcionario } = request.body;//    // Extrai o ID funcionário da requisição

  // Consulta SQL
  const query = `
  SELECT 
    f.nome, f.matricula, f.cpf, f.id_funcao, fn.nome as funcao_nome , elementos
  FROM 
    funcionarios f
  LEFT JOIN 
    funcao fn ON f.id_funcao = fn.id_funcao
  WHERE 
    f.id_funcionario = @id_funcionario
`;

  try {
    // Verifica se o ID do produto foi enviado.
    if (!id_funcionario) {
      return response.status(401).json("ID da função não foi enviado");
    }

    // Cria uma instância de consulta SQL
    const sqlRequest = new sql.Request();
    sqlRequest.input("id_funcionario", sql.Int, id_funcionario);

    const result = await sqlRequest.query(query);
    if (result.recordset.length === 0) {
      return response
        .status(404)
        .json({ message: "Funcionário não encontrado" });
    }
    // Retorna apenas o primeiro objeto do array
    response.status(200).json(result.recordset[0]);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
}
// Exporta as funções para uso em outros módulos.
module.exports = {
  upload,
  foto,
  fetchdados,
  listarFuncionarios,
  listarFuncionariosSimples,
  listarFuncionariosRelatorio,
  listarFuncionariosPagianda,
  adicionarFuncionarios,
  listarCentroCusto,
  listarSetorDiretoria,
  listarHierarquia,
  listarPlanta,
  atualizarFuncionario,
  deleteFuncionario,
  listarOperadores,
  adiconarFuncionarioExt,
  adicionarItem,
  deleteItem,
};
