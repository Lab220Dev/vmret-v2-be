const sql = require("mssql"); // Importa o módulo 'mssql' para interagir com o banco de dados SQL Server.
const { logQuery } = require("../../utils/logUtils"); // Importa a função 'logQuery' para registrar logs de consultas realizadas.

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

  try {
    switch (
      tipo.toLowerCase() // Verifica o tipo de importação, tornando a verificação case-insensitive.
    ) {
      case "centro de custo":
      case "cdc":
        await insertCentroCustoBulk(dados); // Chama a função para inserir dados de Centro de Custo, passando os dados e o usuário.
        break;
      case "funcao":
        await insertFuncao(dados); // Chama a função para inserir dados de Função.
        break;
      case "setor":
        await insertSetor(dados); // Chama a função para inserir dados de Setor.
        break;
      case "produto":
        await insertProduto(dados); // Chama a função para inserir dados de Produto.
        break;
      case "itens do setor":
      case "itens":
        await insertSetorBulk(dados); // Chama a função para inserir dados de Itens do Setor.
        break;
      case "planta":
        await insertPlanta(dados); // Chama a função para inserir dados de Planta.
        break;
      case "funcionario":
      case "funcionarios":
        await insertFuncionarioBulk(dados); // Chama a função para inserir dados de Funcionário.
        break;
      default:
        return response
          .status(400)
          .json({ message: "Tipo de importação não suportado." }); // Retorna erro caso o tipo não seja reconhecido.
    }

    // Após a inserção bem-sucedida, registra um log indicando o sucesso da importação.
    await logQuery(
      "importacao",
      tipo,
      dados,
      "Importação realizada com sucesso."
    );
    return response
      .status(200)
      .json({ message: "Importação realizada com sucesso." }); // Retorna uma resposta de sucesso ao cliente.
  } catch (error) {
    // Caso ocorra um erro, registra um log indicando o erro ocorrido.
    await logQuery(
      "importacao",
      tipo,
      dados,
      `Erro na importação: ${error.message}`
    );
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
async function insertFuncao(dados, usuario) {
  const transaction = new sql.Transaction(); // Cria uma nova transação SQL.

  try {
    await transaction.begin(); // Inicia a transação.

    const request = new sql.Request(transaction); // Cria uma requisição SQL dentro da transação.
    const query = `INSERT INTO Funcao (Codigo, Nome) VALUES (@Codigo, @Nome)`; // Define a consulta de inserção para a tabela 'Funcao'.

    for (const d of dados) {
      // Para cada dado de função, executa a consulta.
      await request
        .input("Codigo", sql.VarChar, d.codigo) // Adiciona o parâmetro 'Codigo'.
        .input("Nome", sql.VarChar, d.nome) // Adiciona o parâmetro 'Nome'.
        .query(query); // Executa a consulta de inserção.
    }

    await transaction.commit(); // Confirma a transação.
    console.log("Transação de Função concluída com sucesso"); // Log de sucesso.

    // await logQuery('insertFuncao', dados, 'Inserção realizada com sucesso.', 'success', usuario); // Log comentado.
  } catch (error) {
    await transaction.rollback(); // Se ocorrer erro, desfaz as operações realizadas na transação.
    console.error(
      "Erro na transação de Função, todas as operações foram revertidas:",
      error.message
    ); // Log de erro.
    // await logQuery('insertFuncao', dados, `Erro: ${error.message}`, 'error', usuario); // Log comentado.
    throw error; // Lança o erro para ser tratado na função principal.
  }
}

// Função placeholder para inserir Setor
/**
 * Função para inserir dados de Setor (a ser implementada).
 *
 * @async
 * @function insertSetor
 * @param {Array} dados - Dados do setor a serem inseridos.
 * @param {Object} usuario - Informações do usuário que realizou a operação (para log).
 * @returns {void} - Nenhuma resposta é retornada diretamente.
 */
async function insertSetor(dados, usuario) {
  // Implementar lógica similar às funções acima
  try {
    // Lógica de inserção
    // await logQuery('insertSetor', dados, 'Inserção realizada com sucesso.', 'success', usuario); // Log comentado.
  } catch (error) {
    // await logQuery('insertSetor', dados, `Erro: ${error.message}`, 'error', usuario); // Log comentado.
    throw error; // Lança o erro para ser tratado na função principal.
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
async function insertProduto(dados, usuario) {
  // Implementar lógica similar às funções acima
  try {
    // Lógica de inserção
    // await logQuery('insertProduto', dados, 'Inserção realizada com sucesso.', 'success', usuario); // Log comentado.
  } catch (error) {
    // await logQuery('insertProduto', dados, `Erro: ${error.message}`, 'error', usuario); // Log comentado.
    throw error; // Lança o erro para ser tratado na função principal.
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
async function insertSetorBulk(dados, usuario) {
    if (!dados.length) return;
  
    // Array para armazenar os dados processados para a tabela de Setores
    const processedData = [];
  
    for (const d of dados) {
      // Valida os campos obrigatórios para o setor
      if (!d.Nome || d.Nome.trim() === '') {
        throw new Error('Nome é obrigatório para Setor');
      }
      if (!d.Codigo || d.Codigo.toString().trim() === '') {
        throw new Error('Código é obrigatório para Setor');
      }
      if (!d.CodigoCentroCusto || d.CodigoCentroCusto.toString().trim() === '') {
        throw new Error('Código do Centro de Custo é obrigatório para Setor');
      }
  
      // Converte os valores de Código e Código do Centro de Custo se necessário
      const codigo = isNaN(d.Codigo) ? d.Codigo : Number(d.Codigo);
      const codigoCentroCusto = isNaN(d.CodigoCentroCusto)
        ? d.CodigoCentroCusto
        : Number(d.CodigoCentroCusto);
  
      // Busca o ID do Centro de Custo associado utilizando o código (assumindo que a coluna de busca é 'Codigo')
      const centroCustoId = await obterIdOuFalhar('Centro_Custos', 'ID_CentroCusto', 'Codigo', codigoCentroCusto);
  
      // Cria o objeto do setor conforme a estrutura da tabela Setores
      const setor = {
        Nome: d.Nome,
        Codigo: codigo,
        ID_CentroCusto: centroCustoId, // Associação com o Centro de Custo encontrado
      };
  
      processedData.push(setor);
    }
  
    // Inicia a transação e executa o bulk insert para a tabela de Setores
    const transaction = new sql.Transaction();
    try {
      await transaction.begin();
      await bulkInsert(transaction, 'Setores', processedData);
      await transaction.commit();
      console.log('Bulk insert de Setores concluído com sucesso');
      // Aqui você pode registrar log de sucesso se necessário.
    } catch (error) {
      await transaction.rollback();
      console.error('Erro no bulk insert de Setores, operação revertida:', error.message);
      // Aqui você pode registrar log de erro se necessário.
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
async function insertPlanta(dados, usuario) {
  // Implementar lógica similar às funções acima
  try {
    // Lógica de inserção
    // await logQuery('insertPlanta', dados, 'Inserção realizada com sucesso.', 'success', usuario); // Log comentado.
  } catch (error) {
    // await logQuery('insertPlanta', dados, `Erro: ${error.message}`, 'error', usuario); // Log comentado.
    throw error; // Lança o erro para ser tratado na função principal.
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
async function insertFuncionarioBulk(dados) {
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
      d.centroDeCusto
    );
    const plantaId = await obterIdOuFalhar(
      "Plantas",
      "id_planta",
      "Nome",
      d.planta
    );
    const setorId = await obterIdOuFalhar(
      "Setores",
      "id_setor",
      "Nome",
      d.setor
    );
    const funcaoId = await obterIdOuFalhar(
      "Funcao",
      "id_funcao",
      "Nome",
      d.funcao
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

    // Cria o objeto com as colunas conforme a tabela Funcionario
    const funcionario = {
      Nome: d.Nome,
      Matricula: d.Matricula,
      DataDeAdmissao: dataDeAdmissao,
      CPF: d.CPF,
      RG: d.RG,
      CTPS: d.CTPS,
      Email: d.Email,
      ID_CentroCusto: centroDeCustoId,
      id_planta: plantaId,
      id_setor: setorId,
      id_funcao: funcaoId,
      Status: d.Status,
      HoraInicial: horaInicial,
      HoraFinal: horaFinal,
      Segunda: diasBooleanos.Segunda,
      Terca: diasBooleanos.Terca,
      Quarta: diasBooleanos.Quarta,
      Quinta: diasBooleanos.Quinta,
      Sexta: diasBooleanos.Sexta,
      Sabado: diasBooleanos.Sabado,
      Domingo: diasBooleanos.Domingo,
    };

    processedData.push(funcionario);
  }

  // Inicia a transação e executa o bulk insert
  const transaction = new sql.Transaction();
  try {
    await transaction.begin();
    await bulkInsert(transaction, "Funcionario", processedData);
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
async function insertCentroCustoBulk(dados) {
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
    };

    processedData.push(centroCusto);
  }

  // Inicia a transação e executa o bulk insert
  const transaction = new sql.Transaction();
  try {
    await transaction.begin();
    await bulkInsert(transaction, "CentroCusto", processedData);
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
    throw error;
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
async function obterIdOuFalhar(tabela, campoId, campoNome, valor) {
  const request = new sql.Request(); // Cria uma nova requisição SQL.

  let query, result;
  if (isNaN(valor)) {
    // Se o valor não for número, assume-se que é um nome.
    query = `SELECT ${campoId} AS id FROM ${tabela} WHERE ${campoNome} = @valor`; // Consulta para buscar o ID pelo nome.
    result = await request.input("valor", sql.VarChar, valor).query(query);
  } else {
    // Caso contrário, busca-se pelo ID diretamente.
    query = `SELECT ${campoId} AS id FROM ${tabela} WHERE ${campoId} = @valor`; // Consulta para buscar pelo ID.
    result = await request
      .input("valor", sql.Int, parseInt(valor))
      .query(query);
  }

  if (result.recordset.length > 0) {
    // Se a consulta retornar algum resultado.
    return result.recordset[0].id; // Retorna o ID encontrado.
  } else {
    throw new Error(`Valor '${valor}' não encontrado em '${tabela}'`); // Lança erro caso não encontre.
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
