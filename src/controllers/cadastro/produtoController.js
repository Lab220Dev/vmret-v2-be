const sql = require("mssql"); // Importa o módulo 'mssql' para trabalhar com banco de dados SQL Server
const path = require("path"); // Importa o módulo 'path' para manipulação de caminhos de arquivos e diretórios
const fs = require("fs").promises; // Importa o módulo 'fs' para manipulação de arquivos com promessas
const multer = require("multer"); // Importa o módulo 'multer' para o processamento de uploads de arquivos
const { logQuery } = require("../../utils/logUtils"); // Importa a função logQuery para registrar logs de consultas no banco de dados
const storage = multer.memoryStorage(); // Define o armazenamento de arquivos na memória
const upload = multer({ storage: storage }).fields([
  // Configura o multer para aceitar múltiplos arquivos de diferentes campos
  { name: "file_principal", maxCount: 1 }, // Define que o campo 'file_principal' pode ter no máximo 1 arquivo
  { name: "file_secundario", maxCount: 1 }, // Define que o campo 'file_secundario' pode ter no máximo 1 arquivo
  { name: "file_info", maxCount: 1 }, // Define que o campo 'file_info' pode ter no máximo 1 arquivo
]);

/**
 * Função responsável por listar os produtos do banco de dados.
 * Recebe a requisição e retorna os produtos paginados com base nos parâmetros de busca.
 *
 * @param {Object} request - O objeto da requisição que contém os parâmetros.
 * @param {Object} response - O objeto de resposta para enviar a resposta ao cliente.
 */
async function listarProdutos(request, response) {
  try {
    const page = request.body.page || 1; // A página solicitada, padrão é 1
    const pageSize = request.body.pageSize || 10; // O número de itens por página, padrão é 10
    const offset = (page - 1) * pageSize; // Calcula o deslocamento (offset) para a paginação
    const searchTerm = request.body.searchTerm || ""; // Termo de busca fornecido na requisição (se houver)

    // Se houver um termo de busca, adiciona a condição na consulta SQL
    let searchCondition = "";
    if (searchTerm) {
      searchCondition = `AND (nome LIKE '%${searchTerm}%' OR codigo LIKE '%${searchTerm}%')`;
    }

    // Consulta SQL para buscar os produtos com a paginação e o filtro de busca
    let query = `
      SELECT * FROM produtos 
      WHERE id_cliente = '${request.body.id_cliente}' 
      AND deleted = 0 
      ${searchCondition} 
      ORDER BY id_produto
      OFFSET ${offset} ROWS 
      FETCH NEXT ${pageSize} ROWS ONLY
    `;

    // Consulta SQL para contar o total de produtos (usado para calcular a quantidade total de registros)
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM produtos 
      WHERE id_cliente = '${request.body.id_cliente}' 
      AND deleted = 0 
      ${searchCondition}
    `;

    // Executa as consultas SQL
    const result = await new sql.Request().query(query);
    const totalResult = await new sql.Request().query(countQuery);

    // Retorna a resposta com os produtos e o total de registros
    response.status(200).json({
      produtos: result.recordset, // Conjunto de produtos retornados
      totalRecords: totalResult.recordset[0].total, // Total de registros encontrados
    });
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message); // Log do erro no console
    response.status(500).send("Erro ao executar consulta"); // Retorna um erro genérico para o cliente
  }
}

/**
 * Função responsável por listar os produtos de forma resumida.
 *
 * @param {Object} request - O objeto da requisição.
 * @param {Object} response - O objeto de resposta.
 */
async function listarProdutosResumo(request, response) {
  try {
    // Consulta SQL para buscar id_produto, código e nome dos produtos
    let query = `SELECT id_produto, codigo, nome FROM produtos WHERE id_cliente = '${request.body.id_cliente}' AND deleted = 0 ORDER BY codigo`;
    const result = await new sql.Request().query(query); // Executa a consulta no banco de dados
    response.status(200).json(result.recordset); // Retorna os dados dos produtos
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message); // Log do erro no console
    response.status(500).send("Erro ao executar consulta"); // Retorna um erro genérico para o cliente
  }
}
/**
 * Função para adicionar um novo produto no banco de dados.
 *
 * @param {Object} request - O objeto da requisição que contém os dados do produto.
 * @param {Object} response - O objeto de resposta para enviar a resposta ao cliente.
 */
async function adicionarProdutos(request, response) {
  const {
    id_cliente,
    id_categoria,
    nome,
    descricao,
    validadedias,
    codigo,
    id_planta,
    id_tipoProduto,
    unidade_medida,
    imagem1,
    imagem2,
    imagemdetalhe,
    id_usuario,
  } = request.body;

  // Query SQL para inserir um novo produto na tabela
  const query = `
    INSERT INTO produtos
    (id_cliente, id_categoria, nome, descricao, validadedias,
    imagem1, imagem2, imagemdetalhe, deleted, codigo,
    quantidademinima, capacidade, ca, id_planta, id_tipoProduto, unidade_medida,Sincronizado)
    VALUES
    (@id_cliente, @id_categoria, @nome, @descricao, @validadedias,
    @imagem1, @imagem2, @imagemdetalhe, @deleted, @codigo,
    @quantidademinima, @capacidade, @ca, @id_planta, @id_tipoProduto, @unidade_medida,@Sincronizado)
`;

  const params = {
    // Parâmetros que serão passados para a query SQL
    id_cliente: id_cliente,
    id_categoria: id_categoria,
    nome: nome,
    descricao: descricao,
    validadedias: validadedias,
    imagem1: imagem1,
    imagem2: imagem2,
    imagemdetalhe: imagemdetalhe,
    deleted: false,
    codigo: codigo,
    quantidademinima: 0,
    capacidade: 0,
    ca: "",
    id_planta: id_planta,
    id_tipoProduto: id_tipoProduto,
    unidade_medida: unidade_medida,
  };

  try {
    const files = request.files; // Acessa os arquivos enviados na requisição

    // Validação para garantir que o 'id_cliente' foi enviado
    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado"); // Retorna erro se não houver id_cliente
      return;
    }

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

    // Diretórios de upload com id_cliente antes da pasta principal
    const uploadPathPrincipal = path.join(
      __dirname,
      "../../uploads/produtos",
      id_cliente.toString(),
      "principal"
    );
    const uploadPathSecundario = path.join(
      __dirname,
      "../../uploads/produtos",
      id_cliente.toString(),
      "secundario"
    );
    const uploadPathInfoAdicional = path.join(
      __dirname,
      "../../uploads/produtos",
      id_cliente.toString(),
      "info"
    );

    // Cria os diretórios se eles não existirem
    await fs.mkdir(uploadPathPrincipal, { recursive: true });
    await fs.mkdir(uploadPathSecundario, { recursive: true });
    await fs.mkdir(uploadPathInfoAdicional, { recursive: true });

    let imagem1Path = "";
    let imagemdetalhePath = "";
    let imagem2Path = "";

    // Se o arquivo 'file_principal' for enviado, faz o upload e gera o caminho do arquivo
    if (files["file_principal"]) {
      const file = files["file_principal"][0];
      const nomeArquivoPrincipal = sanitizeFileName(imagem1); // Sanitiza o nome do arquivo principal
      imagem1Path = path.join(uploadPathPrincipal, nomeArquivoPrincipal);
      await fs.writeFile(imagem1Path, file.buffer); // Salva o arquivo no sistema de arquivos
    }

    // Se o arquivo 'file_secundario' for enviado, faz o upload e gera o caminho do arquivo
    if (files["file_secundario"]) {
      const file = files["file_secundario"][0];
      const nomeArquivoSecundario = sanitizeFileName(imagem2); // Sanitiza o nome do arquivo secundário
      imagem2Path = path.join(uploadPathSecundario, nomeArquivoSecundario);
      await fs.writeFile(imagem2Path, file.buffer); // Salva o arquivo no sistema de arquivos
    }

    // Se o arquivo 'file_info' for enviado, faz o upload e gera o caminho do arquivo
    if (files["file_info"]) {
      const file = files["file_info"][0];
      const nomeArquivoInfo = sanitizeFileName(imagemdetalhe); // Sanitiza o nome do arquivo de informações
      imagemdetalhePath = path.join(uploadPathInfoAdicional, nomeArquivoInfo);
      await fs.writeFile(imagemdetalhePath, file.buffer); // Salva o arquivo no sistema de arquivos
    }

    const requestSql = new sql.Request();
    requestSql.input("id_cliente", sql.Int, id_cliente);
    requestSql.input("id_categoria", sql.Int, id_categoria);
    requestSql.input("nome", sql.VarChar, nome);
    requestSql.input("descricao", sql.VarChar, descricao);
    requestSql.input("validadedias", sql.Int, validadedias);
    requestSql.input("imagem1", sql.VarChar, sanitizeFileName(imagem1));
    requestSql.input("imagem2", sql.VarChar, sanitizeFileName(imagem2)); // Imagem secundária única
    requestSql.input(
      "imagemdetalhe",
      sql.VarChar,
      sanitizeFileName(imagemdetalhe)
    );
    requestSql.input("deleted", sql.Bit, false);
    requestSql.input("Sincronizado", sql.Bit, 0);
    requestSql.input("codigo", sql.VarChar, codigo);
    requestSql.input("quantidademinima", sql.Int, 0);
    requestSql.input("capacidade", sql.Int, 0);
    requestSql.input("ca", sql.NVarChar, "");
    requestSql.input("id_planta", sql.Int, id_planta);
    requestSql.input("id_tipoProduto", sql.BigInt, id_tipoProduto);
    requestSql.input("unidade_medida", sql.VarChar, unidade_medida);

    const result = await requestSql.query(query);

    if (result.rowsAffected[0] > 0) {
      // logQuery('info', Usuário ${id_usuario} criou um novo Centro de Custo, 'sucesso', 'INSERT', id_cliente, id_usuario, query, params);
      response.status(201).json("Produto registrado com sucesso");
      // Retorna sucesso para o cliente
    } else {
      //logQuery('error', Usuário ${id_usuario} falhou ao criar Centro de Custo, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
      response.status(400).json("Erro ao registrar o Produto");
    }
  } catch (error) {
    console.error("Erro ao adicionar produto:", error.message); // Log de erro no console
    response.status(500).send("Erro ao adicionar produto!"); // Retorna um erro ao cliente
  }
}

/**
 * Função que processa o upload da primeira imagem do produto (imagem principal).
 * @param {Object} request - O objeto da requisição, que contém os arquivos e os dados do produto.
 * @param {Object} response - O objeto de resposta para enviar a resposta ao cliente.
 */
async function imagem1(request, response) {
  console.log(request.body); // Exibe os dados do corpo da requisição no console para fins de depuração.

  // Verifica se algum arquivo foi enviado na requisição.
  if (!request.files) {
    return response.status(400).send("Nenhum arquivo foi enviado."); // Retorna erro caso não haja arquivos.
  }
}

/**
 * Função que processa o upload da segunda imagem do produto.
 * @param {Object} request - O objeto da requisição, que contém os arquivos e os dados do produto.
 * @param {Object} response - O objeto de resposta para enviar a resposta ao cliente.
 */
async function imagem2(request, response) {
  console.log(request.body); // Exibe os dados do corpo da requisição no console para fins de depuração.

  // Verifica se algum arquivo foi enviado na requisição.
  if (!request.files) {
    return response.status(400).send("Nenhum arquivo foi enviado."); // Retorna erro caso não haja arquivos.
  }
}

/**
 * Função que processa o upload da imagem de detalhes do produto.
 * @param {Object} request - O objeto da requisição, que contém os arquivos e os dados do produto.
 * @param {Object} response - O objeto de resposta para enviar a resposta ao cliente.
 */
async function imagemdetalhe(request, response) {
  console.log(request.body); // Exibe os dados do corpo da requisição no console para fins de depuração.

  // Verifica se algum arquivo foi enviado na requisição.
  if (!request.files) {
    return response.status(400).send("Nenhum arquivo foi enviado."); // Retorna erro caso não haja arquivos.
  }
}

/**
 * Função que lista as plantas associadas a um cliente específico.
 * @param {Object} request - O objeto da requisição, que contém os dados do cliente.
 * @param {Object} response - O objeto de resposta para enviar a resposta ao cliente.
 */
async function listarPlanta(request, response) {
  try {
    let query = "SELECT DISTINCT id_planta FROM produtos WHERE 1 = 1"; // Consulta SQL para listar plantas distintas.

    // Verifica se o id_cliente foi fornecido na requisição.
    if (request.body.id_cliente) {
      query += ` AND id_cliente = '${request.body.id_cliente}'`; // Adiciona o filtro para o id_cliente na consulta.
      const result = await new sql.Request().query(query); // Executa a consulta SQL no banco de dados.
      response.status(200).json(result.recordset); // Retorna as plantas encontradas no banco de dados.
      return;
    }

    // Se o id_cliente não for fornecido, retorna erro 401 (não autorizado).
    response.status(401).json("ID do cliente não enviado");
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message); // Exibe erro no console caso algo falhe.
    response.status(500).send("Erro ao executar consulta"); // Retorna erro 500 ao cliente caso haja falha na consulta.
  }
}

/**
 * Função que deleta um produto do banco de dados, marcando-o como excluído.
 * @param {Object} request - O objeto da requisição, que contém os dados do produto a ser deletado.
 * @param {Object} response - O objeto de resposta para enviar a resposta ao cliente.
 */
async function deleteProduto(request, response) {
  let query = "UPDATE produtos SET deleted = 1 WHERE id_produto = @id_produto"; // Consulta SQL para marcar o produto como excluído.
  const { id_produto, id_cliente, id_usuario } = request.body; // Desestrutura os dados da requisição.
  const params = {
    id_produto: id_produto, // Parâmetro para a consulta SQL.
  };

  try {
    // Verifica se o id_produto foi fornecido.
    if (id_produto) {
      const sqlRequest = new sql.Request(); // Cria uma nova instância da requisição SQL.
      sqlRequest.input("id_produto", sql.Int, id_produto); // Adiciona o parâmetro id_produto à requisição.
      const result = await sqlRequest.query(query); // Executa a consulta SQL no banco de dados.

      // Verifica se a consulta afetou algum registro.
      if (result.rowsAffected[0] > 0) {
        // logWithOperation('info', `Produto ${id_produto} Deletado com sucesso`, `sucesso`, 'Delete Produto', id_cliente, id_usuario); // Log comentado de sucesso.
        return response.status(200).json(result.recordset); // Retorna a resposta com os resultados da consulta.
      } else {
        // logQuery('error', `Erro ao excluir: ${id_produto} não encontrado.`, 'erro', 'DELETE', id_cliente, id_usuario, query, params); // Log comentado de erro.
        return response
          .status(400)
          .send("Nenhuma alteração foi feita no centro de custo."); // Retorna erro caso nenhum produto tenha sido deletado.
      }
    } else {
      return response.status(401).json("ID do produto não foi enviado"); // Retorna erro caso o id_produto não tenha sido fornecido.
    }
  } catch (error) {
    console.error("Erro ao excluir:", error.message); // Exibe erro no console caso algo falhe.
    // logQuery('error', err.message, 'erro', 'DELETE', id_cliente, id_usuario, query, params); // Log comentado de erro.
    return response.status(500).send("Erro ao excluir"); // Retorna erro 500 ao cliente caso algo falhe.
  }
}

/**
 * Função que atualiza os dados de um produto no banco de dados.
 * @param {Object} request - O objeto da requisição, que contém os dados do produto a ser atualizado.
 * @param {Object} response - O objeto de resposta para enviar a resposta ao cliente.
 */
async function atualizarProduto(request, response) {
  const {
    id_usuario,
    id_produto,
    id_cliente,
    id_categoria,
    nome,
    descricao,
    validadedias,
    codigo,
    id_planta,
    id_tipoProduto,
    unidade_medida,
    imagem1,
    imagem2,
    imagemdetalhe,
  } = request.body; // Desestrutura os dados da requisição.

  // Consulta SQL para atualizar os dados de um produto no banco de dados.
  const query = `
    UPDATE produtos
    SET id_cliente = @id_cliente,
        id_categoria = @id_categoria,
        nome = @nome,
        descricao = @descricao,
        validadedias = @validadedias,
        imagem1 = @imagem1,
        imagem2 = @imagem2,
        imagemdetalhe = @imagemdetalhe,
        codigo = @codigo,
        id_planta = @id_planta,
        id_tipoProduto = @id_tipoProduto,
        unidade_medida = @unidade_medida
    WHERE id_produto = @id_produto
  `;

  // Parâmetros para a consulta SQL.
  const params = {
    id_cliente: id_cliente,
    id_categoria: id_categoria,
    nome: nome,
    descricao: descricao,
    validadedias: validadedias,
    imagem1: imagem1,
    imagem2: imagem2,
    imagemdetalhe: imagemdetalhe,
    codigo: codigo,
    id_planta: id_planta,
    id_tipoProduto: id_tipoProduto,
    unidade_medida: unidade_medida,
    id_produto: id_produto,
  };

  try {
    const files = request.files; // Acessa os arquivos enviados na requisição.

    // Verifica se o id_produto foi fornecido.
    if (!id_produto) {
      response.status(401).json("ID do produto não enviado"); // Retorna erro caso o id_produto não tenha sido enviado.
      return;
    }

    /**
     * Função para sanitizar os nomes dos arquivos (remover acentos e caracteres especiais).
     * @param {string} filename - O nome do arquivo a ser sanitizado.
     * @returns {string} O nome do arquivo sanitizado.
     */
    const sanitizeFileName = (filename) => {
      if (typeof filename === "string") {
        const parts = filename.split("."); // Divide o nome do arquivo e a extensão.
        const extension = parts.length > 1 ? `.${parts.pop()}` : ""; // Pega a extensão do arquivo.

        // Reconstroi o nome do arquivo sem a extensão, removendo acentos e caracteres especiais.
        const nameWithoutExtension = parts
          .join(".")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Remove acentos.
          .replace(/[^a-zA-Z0-9 _]/g, "-") // Substitui caracteres especiais por '-'.
          .replace(/ /g, "_"); // Substitui espaços por '_'.

        return `${nameWithoutExtension}${extension}`; // Retorna o nome sanitizado.
      } else {
        console.error("Filename is not a string:", filename); // Exibe erro caso o nome do arquivo não seja uma string.
        return "unknown_filename"; // Retorna um nome padrão se não for uma string.
      }
    };

    // Diretórios onde as imagens serão salvas.
    const uploadPathPrincipal = path.join(
      __dirname,
      "../../uploads/produtos",
      id_cliente.toString(),
      "principal"
    );
    const uploadPathSecundario = path.join(
      __dirname,
      "../../uploads/produtos",
      id_cliente.toString(),
      "secundario"
    );
    const uploadPathInfoAdicional = path.join(
      __dirname,
      "../../uploads/produtos",
      id_cliente.toString(),
      "info"
    );

    // Cria os diretórios de upload caso não existam.
    await fs.mkdir(uploadPathPrincipal, { recursive: true });
    await fs.mkdir(uploadPathSecundario, { recursive: true });
    await fs.mkdir(uploadPathInfoAdicional, { recursive: true });

    // Variáveis que armazenam os caminhos das imagens.
    let imagem1Path = imagem1;
    let imagemdetalhePath = imagemdetalhe;
    let imagem2Path = imagem2;

    // Verifica se um arquivo secundário foi enviado e salva no diretório correspondente.
    if (files[`file_secundario`]) {
      const file = files[`file_secundario`][0];
      const nomeArquivoSecundario = `${sanitizeFileName(imagem2)}`;
      const filePath = path.join(uploadPathSecundario, nomeArquivoSecundario);
      await fs.writeFile(filePath, file.buffer); // Salva o arquivo no sistema.
      imagem2Path = filePath; // Atualiza o caminho da imagem secundária.
    }

    // Verifica se um arquivo principal foi enviado e salva no diretório correspondente.
    if (files["file_principal"]) {
      const file = files["file_principal"][0];
      const nomeArquivoPrincipal = `${sanitizeFileName(imagem1)}`;
      imagem1Path = path.join(uploadPathPrincipal, nomeArquivoPrincipal);
      await fs.writeFile(imagem1Path, file.buffer); // Salva o arquivo no sistema.
    }

    // Verifica se um arquivo de detalhes foi enviado e salva no diretório correspondente.
    if (files["file_info"]) {
      const file = files["file_info"][0];
      const nomeArquivoInfo = `${sanitizeFileName(imagemdetalhe)}`;
      imagemdetalhePath = path.join(uploadPathInfoAdicional, nomeArquivoInfo);
      await fs.writeFile(imagemdetalhePath, file.buffer); // Salva o arquivo no sistema.
    }

    // Executa a consulta SQL para atualizar o produto no banco de dados.
    const requestSql = new sql.Request();
    requestSql.input("id_cliente", sql.Int, id_cliente);
    requestSql.input("id_categoria", sql.Int, id_categoria);
    requestSql.input("nome", sql.VarChar, nome);
    requestSql.input("descricao", sql.VarChar, descricao);
    requestSql.input("validadedias", sql.Int, validadedias);
    requestSql.input("imagem1", sql.VarChar, sanitizeFileName(imagem1));
    requestSql.input("imagem2", sql.VarChar, sanitizeFileName(imagem2));
    requestSql.input(
      "imagemdetalhe",
      sql.VarChar,
      sanitizeFileName(imagemdetalhe)
    );
    requestSql.input("codigo", sql.VarChar, codigo);
    requestSql.input("id_planta", sql.Int, id_planta);
    requestSql.input("id_tipoProduto", sql.BigInt, id_tipoProduto);
    requestSql.input("unidade_medida", sql.VarChar, unidade_medida);
    requestSql.input("id_produto", sql.Int, id_produto);

    const result = await requestSql.query(query); // Executa a consulta de atualização.

    // Verifica se houve sucesso na atualização do produto.
    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      // logQuery('info', `Produto ${id_produto} Deletado com sucesso`, 'sucesso', 'UPDATE', id_cliente, id_usuario, query, params); // Log comentado de sucesso.
      response.status(200).json("Produto atualizado com sucesso"); // Retorna sucesso ao cliente.
    } else {
      // logQuery('error', `${err.message}`, 'Falha', 'UPDATE', id_cliente, id_usuario, query, params); // Log comentado de erro.
      response.status(400).json("Erro ao atualizar o Produto"); // Retorna erro caso a atualização não tenha sido realizada.
    }
  } catch (error) {
    // logQuery('error', `${err.message}`, 'Falha', 'UPDATE', id_cliente, id_usuario, query, params); // Log comentado de erro.
    console.error("Erro ao executar consulta:", error.message); // Exibe erro no console caso algo falhe.
    response.status(500).send("Erro ao executar consulta"); // Retorna erro 500 ao cliente caso a consulta falhe.
  }
}

module.exports = {
  upload,
  imagem1,
  imagem2,
  imagemdetalhe,
  listarProdutos,
  adicionarProdutos,
  listarPlanta,
  deleteProduto,
  listarProdutosResumo,
  atualizarProduto,
};
