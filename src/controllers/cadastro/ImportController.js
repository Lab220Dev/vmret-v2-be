const sql = require("mssql"); // Importa o módulo 'mssql' para interagir com o banco de dados SQL Server.
const { logQuery } = require("../../utils/logUtils"); // Importa a função 'logQuery' para registrar logs de consultas realizadas.
const path = require("path"); // Importa o módulo 'path' para manipulação de caminhos de arquivos e diretórios
const fs = require("fs").promises; // Importa o módulo 'fs' para manipulação de arquivos com promessas
const axios = require('axios');
const { DateTime } = require("luxon");
/**
 * Sanitiza o nome do arquivo: remove acentos, espaços e caracteres especiais.
 * @param {string} filename Nome original do arquivo
 * @returns {string} Nome sanitizado
 */
const sanitizeFileName = (filename) => {
  if (typeof filename === "string") {
    const parts = filename.split(".");
    const extension = parts.length > 1 ? `.${parts.pop()}` : "";
    const nameWithoutExtension = parts
      .join(".")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 _]/g, "-")
      .replace(/ /g, "_");
    return `${nameWithoutExtension}${extension}`;
  } else {
    console.error("Filename is not a string:", filename);
    return "unknown_filename";
  }
};
const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (err) {
    return false;
  }
};
function removePunctuation(value) {
  return String(value).replace(/[.,\/-]/g, '');
}
async function downloadImage(url, uploadPath) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const originalname = path.basename(new URL(url).pathname);
    const sanitizedName = sanitizeFileName(originalname);
    const filePath = path.join(uploadPath, sanitizedName);
    await fs.writeFile(filePath, response.data);
    return sanitizedName;
  } catch (error) {
    console.error(`Falha ao baixar a imagem da URL ${url}: ${error.message}`);
    // Dependendo do fluxo, você pode optar por retornar null ou lançar o erro.
    return null;
  }
}
// Função principal de importação
/**
 * Função para realizar a importação de dados para diferentes tipos de entidades.
 * Dependendo do tipo fornecido, chama a função correspondente para inserir dados no banco de dados.
 *
 * @async
 * @function importacao
 * @param {Object} request - Objeto contendo os dados da requisição.
 * @param {Object} response - Objeto usado para enviar a resposta ao cliente.
 * @returns {Object} Resposta JSON com mensagem de sucesso ou erro.
 */
async function importacao(request, response) {
  const { tipo, dados } = request.body; // Desestrutura os dados do corpo da requisição: tipo (tipo de importação) e dados (dados a serem importados).
  const id_cliente = request.usuario.id_cliente; // Obtém o ID do cliente a partir do usuário autenticado.
  try {
    switch (
      tipo.toLowerCase() // Verifica o tipo de importação, tornando a verificação case-insensitive.
    ) {
      case "centro_custo":
        await insertCentroCustoBulk(dados, id_cliente); // Chama a função para inserir dados de Centro de Custo, passando os dados e o usuário.
        break;
      case "funcao":
        await insertFuncao(dados, id_cliente); // Chama a função para inserir dados de Função.
        break;
      case "produtos":
        await insertProdutoBulk(dados, id_cliente); // Chama a função para inserir dados de Produto.
        break;
      case "setor":
        await insertSetorBulk(dados, id_cliente); // Chama a função para inserir dados de Itens do Setor.
        break;
      case "planta":
        await insertPlanta(dados, id_cliente); // Chama a função para inserir dados de Planta.
        break;
      case "funcionarios":
        await insertFuncionarioBulk(dados, id_cliente); // Chama a função para inserir dados de Funcionário.
        break;
      default:
        return response
          .status(400)
          .json({ message: "Tipo de importação não suportado." }); // Retorna erro caso o tipo não seja reconhecido.
    }

    return response
      .status(200)
      .json({ message: "Importação realizada com sucesso." }); // Retorna uma resposta de sucesso ao cliente.
  } catch (error) {
    // Caso ocorra um erro, registra um log indicando o erro ocorrido.

    return response
      .status(500)
      .json({ message: "Erro na importação.", error: error.message }); // Retorna uma resposta de erro.
  }
}
// Função para inserir Função
/**
 * Função para inserir dados de Função no banco de dados.
 *
 * @async
 * @function insertFuncao
 * @param {Array} dados - Dados da função a serem inseridos.
 * @param {Object} usuario - Informações do usuário que realizou a operação (para log).
 * @returns {void} - Nenhuma resposta é retornada diretamente.
 */
async function insertFuncao(dados, id_cliente) {
  if (!dados.length) return;

  // Processa os dados em paralelo com Promise.all
  const processedData = await Promise.all(
    dados.map(async (d) => {
      // Valida os campos obrigatórios
      if (!d.Nome || d.Nome.trim() === "") {
        throw new Error("Nome é obrigatório para Cadastrar Função");
      }
      if (!d.Codigo || d.Codigo.toString().trim() === "") {
        throw new Error("Código é obrigatório para Cadastrar Função");
      }
      if (
        !d.Codigo_Centro_Custo ||
        d.Codigo_Centro_Custo.toString().trim() === ""
      ) {
        throw new Error("cdc é obrigatório para Cadastrar Função");
      }

      // Converte o Código para número, se aplicável
      const codigo = isNaN(d.Codigo) ? d.Codigo : Number(d.Codigo);

      const id_centro_custo = await obterIdOuFalhar(
        "Centro_Custos",
        "ID_CentroCusto",
        "Codigo",
        d.Codigo_Centro_Custo,
        id_cliente
      );

      return {
        Nome: d.Nome,
        Codigo: codigo,
        id_cliente: id_cliente,
        elementos: d.Descricao,
        id_centro_custo: id_centro_custo,
        Deleted: 0,
      };
    })
  );

  // Inicia a transação e executa o bulk insert de forma atômica
  const transaction = new sql.Transaction();
  try {
    await transaction.begin();
    await bulkInsert(transaction, "Funcao", processedData);
    await transaction.commit();
    console.log("Bulk insert de Centro de Custo concluído com sucesso");
  } catch (error) {
    await transaction.rollback();
    console.error(
      "Erro no bulk insert de Centro de Custo, operação revertida:",
      error.message
    );
    throw error;
  }
}

// Função placeholder para inserir Produto
/**
 * Função para inserir dados de Produto (a ser implementada).
 *
 * @async
 * @function insertProduto
 * @param {Array} dados - Dados do produto a serem inseridos.
 * @param {Object} usuario - Informações do usuário que realizou a operação (para log).
 * @returns {void} - Nenhuma resposta é retornada diretamente.
 */
async function insertProdutoBulk(dados, id_cliente) {
  if (!dados.length) return;

  // Define os diretórios para armazenar as imagens
  const uploadPathPrincipal = path.join(__dirname, "../../uploads/produtos", id_cliente.toString(), "principal");
  const uploadPathSecundario = path.join(__dirname, "../../uploads/produtos", id_cliente.toString(), "secundario");
  const uploadPathInfoAdicional = path.join(__dirname, "../../uploads/produtos", id_cliente.toString(), "info");

  // Cria os diretórios se não existirem
  await fs.mkdir(uploadPathPrincipal, { recursive: true });
  await fs.mkdir(uploadPathSecundario, { recursive: true });
  await fs.mkdir(uploadPathInfoAdicional, { recursive: true });

  const processedData = await Promise.all(
    dados.map(async (d) => {
      // Valida os campos obrigatórios
      if (!d.Nome || d.Nome.trim() === "") {
        throw new Error("Nome do Produto é obrigatório");
      }
      if (!d.Codigo || d.Codigo.toString().trim() === "") {
        throw new Error("Código do Produto é obrigatório");
      }
      if (!d.Descricao || d.Descricao.trim() === "") {
        throw new Error("Descrição do Produto é obrigatória");
      }
      if (!d.Especificacao || d.Especificacao.trim() === "") {
        throw new Error("Especificação do Produto é obrigatória");
      }
      if (!d.tipo_produto || d.tipo_produto.trim() === "") {
        throw new Error("Tipo de Produto é obrigatório");
      }
      if (!d.unidade_medida || d.unidade_medida.trim() === "") {
        throw new Error("Unidade de Medida é obrigatória");
      }
      if (!d.validade || d.validade.toString().trim() === "") {
        throw new Error("Validade é obrigatória");
      }
      if (!d.quantidade_minima || d.quantidade_minima.toString().trim() === "") {
        throw new Error("Quantidade Mínima é obrigatória");
      }

      // Converte os campos numéricos conforme necessário
      const codigo = isNaN(d.Codigo) ? d.Codigo : Number(d.Codigo);
      const quantidade_minima = isNaN(d.quantidade_minima)
        ? d.quantidade_minima
        : Number(d.quantidade_minima);

      // Processa as imagens – verifica se veio via upload ou como URL.
      let url_foto_principal = null;
      let url_foto_secundaria = null;
      let url_info_adicional = null;

      if (d.url_foto_principal && isValidUrl(d.url_foto_principal)) {
        url_foto_principal = await downloadImage(d.url_foto_principal, uploadPathPrincipal);
      }

      if (d.url_foto_secundaria && isValidUrl(d.url_foto_secundaria)) {
        url_foto_secundaria = await downloadImage(d.url_foto_secundaria, uploadPathSecundario);
      }

      if (d.url_info_adicional && isValidUrl(d.url_info_adicional)) {
        url_info_adicional = await downloadImage(d.url_info_adicional, uploadPathInfoAdicional);
      }

      const validadeDate = DateTime.fromFormat(d.validade, "yyyy-MM-dd", { zone: "America/Sao_Paulo" });
      const today = DateTime.now().setZone("America/Sao_Paulo");
      const diffInDays = Math.ceil(validadeDate.diff(today, "days").days);

      return {
        nome: d.Nome,
        codigo: codigo,
        descricao: d.Descricao,
        id_tipoProduto: d.tipo_produto,
        id_planta: d.id_planta,
        unidade_medida: d.unidade_medida,
        validadedias: diffInDays,
        quantidademinima: quantidade_minima,
        imagem1: url_foto_principal,
        imagem2: url_foto_secundaria,
        imagemdetalhe: url_info_adicional,
        id_cliente: id_cliente,
        Deleted: 0,
        Sincronizado: 0,
        capacidade: 0,
        id_categoria: 53,
      };
    })
  );

  // Realiza a operação de bulk insert dentro de uma transação para garantir atomicidade.
  const transaction = new sql.Transaction();
  try {
    await transaction.begin();
    await bulkInsert(transaction, "Produtos", processedData);
    await transaction.commit();
    console.log("Bulk insert de Produtos concluído com sucesso");
  } catch (error) {
    await transaction.rollback();
    console.error("Erro no bulk insert de Produtos, operação revertida:", error.message);
    throw error;
  }
}

// Função placeholder para inserir Itens do Setor
/**
 * Função para inserir dados de Itens do Setor (a ser implementada).
 *
 * @async
 * @function insertItensDoSetor
 * @param {Array} dados - Dados dos itens a serem inseridos.
 * @param {Object} usuario - Informações do usuário que realizou a operação (para log).
 * @returns {void} - Nenhuma resposta é retornada diretamente.
 */
async function insertSetorBulk(dados, id_cliente) {
  if (!dados.length) return;

  // Processa os dados em paralelo com Promise.all
  const processedData = await Promise.all(
    dados.map(async (d) => {
      // Valida os campos obrigatórios
      if (!d.Nome || d.Nome.trim() === "") {
        throw new Error("Nome é obrigatório para Cadastrar Setor");
      }
      if (!d.Codigo || d.Codigo.toString().trim() === "") {
        throw new Error("Código é obrigatório para Cadastrar Setor");
      }
      if (
        !d.Codigo_Centro_Custo ||
        d.Codigo_Centro_Custo.toString().trim() === ""
      ) {
        throw new Error("cdc é obrigatório para Cadastrar Setor");
      }

      // Converte o Código para número, se aplicável
      const codigo = isNaN(d.Codigo) ? d.Codigo : Number(d.Codigo);

      const id_centro_custo = await obterIdOuFalhar(
        "Centro_Custos",
        "ID_CentroCusto",
        "Codigo",
        d.Codigo_Centro_Custo,
        id_cliente
      );

      return {
        Nome: d.Nome,
        codigo: codigo,
        id_cliente: id_cliente,
        id_centro_custo: id_centro_custo,
        deleted: 0,
      };
    })
  );

  // Inicia a transação e executa o bulk insert de forma atômica
  const transaction = new sql.Transaction();
  try {
    await transaction.begin();
    await bulkInsert(transaction, "Setores", processedData);
    await transaction.commit();
    console.log("Bulk insert de Setor concluído com sucesso");
  } catch (error) {
    await transaction.rollback();
    console.error(
      "Erro no bulk insert de Setor, operação revertida:",
      error.message
    );
    throw error;
  }
}

// Função placeholder para inserir Planta
/**
 * Função para inserir dados de Planta (a ser implementada).
 *
 * @async
 * @function insertPlanta
 * @param {Array} dados - Dados da planta a serem inseridos.
 * @param {Object} usuario - Informações do usuário que realizou a operação (para log).
 * @returns {void} - Nenhuma resposta é retornada diretamente.
 */
async function insertPlanta(dados, id_cliente) {
  if (!dados.length) return;

  // Processa os dados em paralelo com Promise.all
  const processedData = await Promise.all(
    dados.map(async (d) => {
      // Valida os campos obrigatórios
      if (!d.Nome || d.Nome.trim() === "") {
        throw new Error("Nome é obrigatório para Cadastrar Função");
      }
      if (!d.Codigo || d.Codigo.toString().trim() === "") {
        throw new Error("Código é obrigatório para Cadastrar Função");
      }

      // Converte o Código para número, se aplicável
      const codigo = isNaN(d.Codigo) ? d.Codigo : Number(d.Codigo);

      return {
        Nome: d.Nome,
        Codigo: codigo,
        id_cliente: id_cliente,
        Deleted: 0,
      };
    })
  );

  // Inicia a transação e executa o bulk insert de forma atômica
  const transaction = new sql.Transaction();
  try {
    await transaction.begin();
    await bulkInsert(transaction, "Plantas", processedData);
    await transaction.commit();
    console.log("Bulk insert de Centro de Custo concluído com sucesso");
  } catch (error) {
    await transaction.rollback();
    console.error(
      "Erro no bulk insert de Centro de Custo, operação revertida:",
      error.message
    );
    throw error;
  }
}

async function bulkInsert(transaction, tableName, data, batchSize = 500) {
  if (!data.length) return;

  const columns = Object.keys(data[0])
    .map((col) => `[${col}]`)
    .join(", ");

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const values = batch
      .map(
        (row) =>
          "(" +
          Object.values(row)
            .map((value) =>
              typeof value === "string"
                ? `'${value.replace(/'/g, "''")}'`
                : value === null || value === undefined
                ? "NULL"
                : value
            )
            .join(", ") +
          ")"
      )
      .join(", ");

    const sqlQuery = `INSERT INTO ${tableName} (${columns}) VALUES ${values}`;
    console.log(
      `Executando bulk insert na tabela ${tableName}, registros: ${batch.length}`
    );

    const request = new sql.Request(transaction);
    request.timeout = 60000; // 60 segundos de timeout
    try {
      await request.query(sqlQuery);
      console.log(
        `✅ Bulk insert concluído para a tabela ${tableName}, lote de ${batch.length} registros.`
      );
    } catch (err) {
      console.error(
        `❌ Erro ao executar bulk insert na tabela ${tableName}:`,
        err.message
      );
      throw err;
    }
  }
}
async function insertFuncionarioBulk(dados, id_cliente) {
  if (!dados.length) return;

  // Array para armazenar os dados processados
  const processedData = [];

  for (const d of dados) {
    // Converte os valores dos dias para booleanos
    const diasBooleanos = {
      Segunda: validarBooleano(d.segunda),
      Terca: validarBooleano(d.terca),
      Quarta: validarBooleano(d.quarta),
      Quinta: validarBooleano(d.quinta),
      Sexta: validarBooleano(d.sexta),
      Sabado: validarBooleano(d.sabado),
      Domingo: validarBooleano(d.domingo),
    };

    // Valida e obtém os IDs para as chaves estrangeiras
    const centroDeCustoId = await obterIdOuFalhar(
      "Centro_Custos",
      "ID_CentroCusto",
      "Nome",
      d.Centro_Custo,
      id_cliente
    );
    const plantaId = await obterIdOuFalhar(
      "Plantas",
      "id_planta",
      "Nome",
      d.Planta,
      id_cliente
    );
    const setorId = await obterIdOuFalhar(
      "Setores",
      "id_setor",
      "Nome",
      d.Setor,
      id_cliente
    );
    const funcaoId = await obterIdOuFalhar(
      "Funcao",
      "id_funcao",
      "Nome",
      d.Funcao,
      id_cliente
    );

    if (!centroDeCustoId || !plantaId || !setorId || !funcaoId) {
      throw new Error(
        "Validação falhou para Centro de Custo, Planta, Setor ou Função"
      );
    }

    // Converte datas e horários para os formatos esperados
    const dataDeAdmissao = d.DataDeAdmissao ? new Date(d.DataDeAdmissao) : null;
    const horaInicial = d.HoraInicial
      ? new Date(`1970-01-01T${d.HoraInicial}:00Z`)
      : null;
    const horaFinal = d.HoraFinal
      ? new Date(`1970-01-01T${d.HoraFinal}:00Z`)
      : null;
      const cpfLimpo = removePunctuation(d.CPF);
      const rgLimpo = removePunctuation(d.RG);
      const ctpsLimpo = removePunctuation(d.CTPS);
    // Cria o objeto com as colunas conforme a tabela Funcionario
    const funcionario = {
      Nome: d.Nome,
      matricula: d.Matrícula,
      data_admissao: dataDeAdmissao,
      CPF:cpfLimpo,
      RG: rgLimpo,
      CTPS:ctpsLimpo,
      email: d.Email,
      id_centro_custo: centroDeCustoId,
      id_planta: plantaId,
      id_setor: setorId,
      id_funcao: funcaoId,
      id_cliente: id_cliente,
      deleted: 0,
      status: d.Status,
      hora_inicial: horaInicial,
      hora_final: horaFinal,
      Segunda: diasBooleanos.Segunda ? 1 : 0,
      Terca: diasBooleanos.Terca ? 1 : 0,
      Quarta: diasBooleanos.Quarta ? 1 : 0,
      Quinta: diasBooleanos.Quinta ? 1 : 0,
      Sexta: diasBooleanos.Sexta ? 1 : 0,
      Sabado: diasBooleanos.Sabado ? 1 : 0,
      Domingo: diasBooleanos.Domingo ? 1 : 0,
    };

    processedData.push(funcionario);
  }

  // Inicia a transação e executa o bulk insert
  const transaction = new sql.Transaction();
  try {
    await transaction.begin();
    await bulkInsert(transaction, "Funcionarios", processedData);
    await transaction.commit();
    console.log("Bulk insert de funcionários concluído com sucesso");
    // Aqui você pode registrar log de sucesso se necessário.
  } catch (error) {
    await transaction.rollback();
    console.error(
      "Erro no bulk insert de funcionários, operação revertida:",
      error.message
    );
    // Aqui você pode registrar log de erro se necessário.
    throw error;
  }
}
async function insertCentroCustoBulk(dados, id_cliente) {
  if (!dados.length) return;

  // Array para armazenar os dados processados
  const processedData = [];

  for (const d of dados) {
    // Validação dos campos obrigatórios para CDC
    if (!d.Nome || d.Nome.trim() === "") {
      throw new Error("Nome é obrigatório para Centro de Custo");
    }
    if (!d.Codigo || d.Codigo.toString().trim() === "") {
      throw new Error("Código é obrigatório para Centro de Custo");
    }

    // Converte o Código para número, se aplicável
    const codigo = isNaN(d.Codigo) ? d.Codigo : Number(d.Codigo);

    // Cria o objeto CDC conforme a estrutura da tabela
    const centroCusto = {
      Nome: d.Nome,
      Codigo: codigo,
      ID_Cliente: id_cliente,
      Deleted: 0,
    };

    processedData.push(centroCusto);
  }

  // Inicia a transação e executa o bulk insert
  const transaction = new sql.Transaction();
  try {
    await transaction.begin();
    await bulkInsert(transaction, "Centro_Custos", processedData);
    await transaction.commit();
    console.log("Bulk insert de Centro de Custo concluído com sucesso");
    // Aqui você pode registrar log de sucesso se necessário.
  } catch (error) {
    await transaction.rollback();
    console.error(
      "Erro no bulk insert de Centro de Custo, operação revertida:",
      error.message
    );
    // Aqui você pode registrar log de erro se necessário.
    throw new Error;
  }
}

// Função para obter o ID a partir de um nome ou lançar erro se não encontrado
/**
 * Função que obtém o ID de uma entidade a partir de seu nome ou ID.
 *
 * @async
 * @function obterIdOuFalhar
 * @param {string} tabela - Nome da tabela no banco de dados.
 * @param {string} campoId - Nome da coluna que contém o ID.
 * @param {string} campoNome - Nome da coluna que contém o nome.
 * @param {string|number} valor - Nome ou ID que será usado para a busca.
 * @returns {number} O ID encontrado.
 * @throws {Error} Lança erro caso o valor não seja encontrado.
 */
async function obterIdOuFalhar(tabela, campoId, campoNome, valor, id_cliente) {
  const request = new sql.Request(); // Cria uma nova requisição SQL.
  const isNumber = /^\d+$/.test(valor);
  let query, result;
  if (!isNumber) {
    // Se o valor não for número, assume-se que é um nome.
    query = `SELECT ${campoId} AS id FROM ${tabela} WHERE ${campoNome} = @valor and Deleted = 0 and id_cliente = @id_cliente`; // Consulta para buscar o ID pelo nome.
    result = await request
      .input("valor", sql.VarChar, valor)
      .input("id_cliente", sql.Int, id_cliente)
      .query(query);
  } else {
    // Caso contrário, busca-se pelo ID diretamente.
    query = `SELECT ${campoId} AS id FROM ${tabela} WHERE ${campoId} = @valor AND Deleted = 0 AND id_cliente = @id_cliente`;
    result = await request
      .input("id_cliente", sql.Int, id_cliente)
      .input("valor", sql.VarChar, valor)
      .query(query);
  }

  if (result.recordset.length > 0) {
    if (result.recordset.length > 1) {
      console.warn(
        `Mais de um registro encontrado para valor '${valor}' na tabela '${tabela}'. Usando o primeiro registro.`
      );
    }
    return result.recordset[0].id;
  } else {
    throw new Error(
      `Valor '${valor}' não encontrado em '${tabela}' para o id_cliente '${id_cliente}'.`
    );
  }
}

// Função para validar "Sim"/"Não" para booleanos
/**
 * Função que converte valores "Sim" e "Não" para booleanos.
 *
 * @function validarBooleano
 * @param {string|boolean} valor - O valor a ser validado.
 * @returns {boolean} O valor convertido para booleano.
 * @throws {Error} Lança erro se o valor não for válido.
 */
function validarBooleano(valor) {
  if (typeof valor === "boolean") {
    // Se já for booleano, retorna o valor.
    return valor;
  } else if (typeof valor === "string") {
    // Se for string, valida "Sim"/"Não".
    const valorNormalizado = valor.trim().toLowerCase();
    if (valorNormalizado === "sim") {
      return true;
    } else if (valorNormalizado === "não" || valorNormalizado === "nao") {
      return false;
    }
  }
  throw new Error(`Valor inválido para campo booleano: ${valor}`); // Lança erro se o valor não for válido.
}

// Exportação da função de importação
module.exports = {
  importacao, // Exporta a função principal para ser utilizada em outros módulos.
};
