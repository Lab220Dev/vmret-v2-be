const sql = require("mssql");
const path = require("path");
const fs = require("fs").promises;
const { logQuery } = require("../../utils/logUtils");
const multer = require("multer");
const { sendEmail, generateEmailHTML2 } = require("../../utils/emailService");
const CryptoJS = require("crypto-js");
const axios = require('axios');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const convertToBoolean = (value) => {
  return value === "true";
};
async function listarFuncionarios(request, response) {
  try {
    if (!request.body.id_cliente) {
      return response.status(401).json({ error: "ID do cliente não enviado" });
    }

    const id_cliente = request.body.id_cliente;

    const queryFuncionarios = `
            SELECT *
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
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
};
async function listarFuncionariosSimples(request, response) {
  try {
    if (!request.body.id_cliente) {
      return response.status(401).json({ error: "ID do cliente não enviado" });
    }

    const id_cliente = request.body.id_cliente;

    const queryFuncionarios = `
            SELECT id_funcionario,nome
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
};
async function adiconarFuncionarioExt(request, response) {
    let transaction;
          // Resgatando os campos relevantes do form-data
          const name = request.body['form_fields[name]'];
          const email = request.body['form_fields[email]'];
          const telefone = request.body['form_fields[Telefone]'];
          const empresa = request.body['form_fields[Empresa]'];
          const cargo = request.body['form_fields[Cargo]'];
          const id_usuario =request.body.id_usuario;
          const query = `
          INSERT INTO funcionarios (id_cliente, nome, matricula, email, senha, empresa, cargo, sincronizado) 
          VALUES (@id_cliente, @nome, @matricula, @email, @senha, @empresa, @cargo, @sincronizado)
      `;
    try {
      
      transaction = new sql.Transaction();
      await transaction.begin();
  

      
      const hashMD5 = CryptoJS.MD5(telefone.slice(-4)).toString();
      const sqlrequest = new sql.Request(transaction);
      sqlrequest.input("id_cliente", sql.Int, 79)
        .input("nome", sql.VarChar, name)
        .input("matricula", sql.VarChar, telefone)
        .input("email", sql.VarChar, email)
        .input("senha", sql.VarChar, hashMD5)
        .input("Empresa", sql.VarChar, empresa)
        .input("Cargo", sql.VarChar, cargo)
        .input("Sincronizado", sql.Bit, 0);
  
      const result = await sqlrequest.query(query);
  
      if (result.rowsAffected.length > 0) {
        const params = {
          id_cliente: 79,
          nome: name,
          matricula: telefone,
          email: email,
          senha: hashMD5,
          empresa: empresa,
          cargo: cargo,
          sincronizado: 0
        };
  
        // Log da inserção no banco de dados
        logQuery('info', `Funcionário ${name} inserido com sucesso pelo usuário ${id_usuario}`, 'sucesso', 'INSERT', null,id_usuario, query, params);
  
        let Email = generateEmailHTML2(telefone.slice(-4));
        await sendEmail(email, 'Sua senha', Email);
  
        // Log do envio de e-mail
        logQuery('info', `E-mail enviado para ${email} com a senha de retirada`, 'sucesso', 'EMAIL', null, id_usuario, 'sendEmail', { email });
  
        // Envio da mensagem via ChatPro
        await enviarMensagem(telefone,id_usuario);
        
        await transaction.commit();
        response.status(200).json({ message: "Funcionário adicionado com sucesso." });
      }
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
  
      const errorParams = {
        id_cliente: 79,
        nome: name,
        matricula: telefone,
        email: email,
        empresa: empresa,
        cargo: cargo
      };
  
      // Log do erro
      logQuery('error', `Erro ao adicionar funcionário ${name}: ${error.message}`, 'falha', 'ERROR', null, id_usuario, query, errorParams);
  
      // Log adicional do stack trace
      logQuery('error', `Stack trace: ${error.stack}`, 'falha', 'ERROR_STACK', null,id_usuario, query, {});
  
      console.error("Erro ao adicionar funcionário:", error);
      response.status(500).json({ error: "Erro ao adicionar funcionário." });
    }
};
const enviarMensagem = async (telefone, id_usuario) => {
    const options = {
      method: 'POST',
      url: 'https://v5.chatpro.com.br/chatpro-w2u3pnxtci/api/v1/send_message',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        Authorization: 'ac9de8b5b1f8f8cd344c8e9057e365e7'
      },
      data: {
        number: `${telefone}`,
        message: `Sua senha para retirada é: ${telefone.slice(-4)}`
      }
    };
  
    try {
      const response = await axios.request(options);
      if (response.status === 201) {
        console.log('Mensagem enviada com sucesso:', response.data);
  
        // Log de sucesso
        logQuery('info', `Mensagem enviada para o telefone ${telefone}`, 'sucesso', 'CHATPRO', null, id_usuario, 'send_message', { telefone });
  
      } else {
        console.error('Falha ao enviar a mensagem:', response.status, response.statusText);
  
        // Log de falha
        logQuery('error', `Falha ao enviar a mensagem para o telefone ${telefone}`, 'falha', 'CHATPRO', null, id_usuario, 'send_message', { telefone, status: response.status, statusText: response.statusText });
      }
    } catch (error) {
      console.error('Erro ao enviar a mensagem:', error.message);
  
      // Log do erro completo com stack trace
      logQuery('error', `Erro ao enviar mensagem para o telefone ${telefone}`, 'falha', 'CHATPRO', null, id_usuario, 'send_message', { telefone, error: error.message, stack: error.stack });
    }
};
async function adicionarFuncionarios(request, response) {
  const {
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
    ordem,
    id_centro_custo,
    status,
    senha,
    biometria2,
    email,
    face,
    id_usuario,
  } = request.body;

  const id_cliente = request.body.id_cliente;
  let nomeFuncionario = "";

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

  const params = {
    id_cliente,
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
    segunda: convertToBoolean(segunda),
    terca: convertToBoolean(terca),
    quarta: convertToBoolean(quarta),
    quinta: convertToBoolean(quinta),
    sexta: convertToBoolean(sexta),
    sabado: convertToBoolean(sabado),
    domingo: convertToBoolean(domingo),
    deleted: false,
    ordem,
    id_centro_custo,
    status,
    senha,
    biometria2,
    email,
    face,
  };

  try {
    // Gerenciamento de arquivos
    const files = request.files;
    const uploadPath = path.join(
      __dirname,
      "../../uploads/funcionarios",
      id_cliente.toString()
    );
    await fs.mkdir(uploadPath, { recursive: true });
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExtension = path.extname(file.originalname);
      nomeFuncionario = `${nome}${fileExtension}`;
      const filePath = path.join(uploadPath, nomeFuncionario);
      await fs.writeFile(filePath, file.buffer);
    }
    const hashMd5 = CryptoJS.MD5(senha).toString();

    // Inserção no banco de dados
    const sqlRequest = new sql.Request();
    sqlRequest.input("id_cliente", sql.Int, id_cliente);
    sqlRequest.input("id_setor", sql.Int, id_setor);
    sqlRequest.input("id_funcao", sql.Int, id_funcao);
    sqlRequest.input("nome", sql.VarChar, nome);
    sqlRequest.input("matricula", sql.VarChar, matricula);
    sqlRequest.input("biometria", sql.NVarChar, biometria);
    sqlRequest.input("RG", sql.VarChar, RG);
    sqlRequest.input("CPF", sql.VarChar, CPF);
    sqlRequest.input("CTPS", sql.VarChar, CTPS);
    sqlRequest.input("id_planta", sql.Int, id_planta ? parseInt(id_planta, 10) : 0);
    sqlRequest.input("foto", sql.VarChar, nomeFuncionario);
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
    sqlRequest.input("deleted", sql.Bit, false);
    sqlRequest.input("ordem", sql.Int, ordem);
    sqlRequest.input("id_centro_custo", sql.Int, id_centro_custo);
    sqlRequest.input("status", sql.NVarChar, status);
    sqlRequest.input("senha", sql.NVarChar, hashMd5);
    sqlRequest.input("biometria2", sql.NVarChar, biometria2);
    sqlRequest.input("email", sql.VarChar, email);
    sqlRequest.input("face", sql.VarChar, face);

    const result = await sqlRequest.query(query);
    if (result.rowsAffected[0] > 0) {
      //logQuery('info', `Usuário ${id_usuario} criou um novo Centro de Custo`, 'sucesso', 'INSERT', id_cliente, id_usuario, query, params);
      response.status(201).send("Funcionário criado com sucesso!");
    } else {
      //logQuery('error', `Usuário ${id_usuario} falhou ao criar Centro de Custo`, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
      response.status(400).send("Falha ao criar o funcionario");
    }
  } catch (error) {
    const errorMessage = error.message.includes(
      "Query não fornecida para logging"
    )
      ? "Erro crítico: Falha na operação"
      : `Erro ao adicionar Centro de Custo: ${error.message}`;
    // logQuery('error', errorMessage, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
    console.error("Erro ao inserir funcionário:", error.message);
    response.status(500).send("Erro ao inserir funcionário");
  }
};
async function foto(request, response) {
  if (!request.files) {
    return response.status(400).send("Nenhum arquivo foi enviado.");
  }

  const { id_cliente } = request.body;
  const foto = request.file;
};
async function listarCentroCusto(request, response) {
  try {
    let query = "SELECT DISTINCT id_centro_custo FROM funcionarios WHERE 1 = 1";

    if (request.body.id_cliente) {
      query += ` AND id_cliente = '${request.body.id_cliente}'`;
      const result = await new sql.Request().query(query);
      response.status(200).json(result.recordset);
      return;
    }
    response.status(401).json("id do cliente não enviado");
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
};
async function listarSetorDiretoria(request, response) {
  try {
    let query = "SELECT DISTINCT id_setor FROM funcionarios WHERE 1 = 1";

    if (request.body.id_cliente) {
      query += ` AND id_cliente = '${request.body.id_cliente}'`;
      const result = await new sql.Request().query(query);
      response.status(200).json(result.recordset);
      return;
    }
    response.status(401).json("id do cliente não enviado");
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
};
async function listarHierarquia(request, response) {
  try {
    let query = "SELECT DISTINCT id_funcao FROM funcionarios WHERE 1 = 1";

    if (request.body.id_cliente) {
      query += ` AND id_cliente = '${request.body.id_cliente}'`;
      const result = await new sql.Request().query(query);
      response.status(200).json(result.recordset);
      return;
    }
    response.status(401).json("id do cliente não enviado");
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
};
async function listarPlanta(request, response) {
  try {
    let query = "SELECT DISTINCT id_planta FROM funcionarios WHERE 1 = 1";

    if (request.body.id_cliente) {
      query += ` AND id_cliente = '${request.body.id_cliente}'`;
      const result = await new sql.Request().query(query);
      response.status(200).json(result.recordset);
      return;
    }
    response.status(401).json("id do cliente não enviado");
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
};
async function deleteFuncionario(request, response) {
  const { id_usuario, id_cliente, id_funcionario } = request.body;

  if (!id_funcionario) {
    return response.status(401).json("ID do funcionário não foi enviado");
  }

  const query =
    "UPDATE Funcionarios SET deleted = 1 WHERE id_funcionario = @id_funcionario";
  const params = id_funcionario;

  try {
    const sqlRequest = new sql.Request();
    sqlRequest.input("id_funcionario", sql.Int, id_funcionario);
    const result = await sqlRequest.query(query);

    if (result.rowsAffected[0] > 0) {
      return response
        .status(200)
        .json({ message: "Funcionário deletado com sucesso!" });
    } else {
      return response
        .status(400)
        .send("Nenhuma alteração foi feita no funcionário.");
    }
  } catch (error) {
    console.error("Erro ao excluir:", error.message);
    return response
      .status(500)
      .send(`Erro ao excluir funcionário: ${error.message}`);
  }
};
async function atualizarFuncionario(request, response) {
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
  if (typeof itens === "string") {
    try {
      itens = JSON.parse(itens);
    } catch (error) {
      console.error("Erro ao fazer parse de itens:", error);
      return response.status(400).json({ error: "Formato inválido de itens" });
    }
  }
  let nomeFuncionario = foto;
  const id_cliente = request.body.id_cliente;
  const files = request.files;
  const hashMd5 = CryptoJS.MD5(senha).toString();
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
    // Atualização de arquivos, se necessário
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

    // Atualização do funcionário
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

    const result = await sqlRequest.query(query);

    // Verifica se a atualização do funcionário foi bem-sucedida
    if (result.rowsAffected[0] > 0) {
      let itensAlterados = false; // Verifica se algum item foi alterado
      if (itens && itens.length > 0) {
        for (const item of itens) {
          console.log("Processando item:", item);
          if (item.action === "new") {
            const insertQuery = `
                            INSERT INTO Ret_Item_Funcionario (id_funcionario, id_produto, nome_produto, sku, quantidade)
                            VALUES (@id_funcionario, @id_produto, @nome_produto, @sku, @quantidade)
                        `;
            console.log("Inserindo item:", item);
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
            ); // Usa o id_item_funcionario
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
            ); // Usa o id_item_funcionario
            await deleteRequest.query(deleteQuery);
            itensAlterados = true;
          }
        }
      }

      // Retorna a resposta dependendo se os itens foram alterados ou não
      if (itensAlterados) {
        response
          .status(200)
          .json({ message: "Funcionário e itens atualizados com sucesso!" });
      } else {
        response
          .status(200)
          .json({
            message: "Funcionário atualizado, sem alterações nos itens.",
          });
      }
    } else {
      response.status(400).send("Nenhuma alteração foi feita no funcionário.");
    }
  } catch (error) {
    console.error("Erro ao atualizar funcionário:", error.message);
    response.status(500).send("Erro ao atualizar funcionário");
  }
};
async function listarOperadores(request, response) {
  const { id_cliente } = request.body;
  try {
    if (!id_cliente) {
      return response.status(401).json("ID do cliente não enviado");
    }

    let query =
      "SELECT * FROM Usuarios WHERE deleted = 0 AND role = 'Operador' AND id_cliente = @id_cliente";
    const dbRequest = new sql.Request();
    dbRequest.input("id_cliente", sql.Int, id_cliente);

    const result = await dbRequest.query(query);
    response.status(200).json(result.recordset);
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message);
    response.status(500).send("Erro ao executar consulta");
  }
};

module.exports = {
  upload,
  foto,
  listarFuncionarios,
  listarFuncionariosSimples,
  adicionarFuncionarios,
  listarCentroCusto,
  listarSetorDiretoria,
  listarHierarquia,
  listarPlanta,
  atualizarFuncionario,
  deleteFuncionario,
  listarOperadores,
  adiconarFuncionarioExt,
};
