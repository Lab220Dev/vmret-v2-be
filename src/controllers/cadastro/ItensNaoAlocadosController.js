const sql = require("mssql"); // Importa o módulo 'mssql' para interagir com o banco de dados SQL Server.
const axios = require("axios"); // Importa o módulo 'axios' para fazer requisições HTTP.
const fs = require("fs"); // Importa o módulo 'fs' para interagir com o sistema de arquivos (salvar arquivos).
const path = require("path"); // Importa o módulo 'path' para manipulação de caminhos de arquivos.
const { Console } = require("console"); // Importa a classe 'Console' do módulo 'console' para criar objetos de log personalizados.
const { console } = require("inspector"); // Importa o objeto 'console' do módulo 'inspector' (não está sendo usado no código).

// Função para baixar e salvar uma imagem a partir de uma URL
/**
 * Baixa uma imagem de uma URL e a salva no caminho especificado.
 *
 * @async
 * @function baixarImagem
 * @param {string} url - A URL de onde a imagem será baixada.
 * @param {string} localPath - O caminho local onde a imagem será salva.
 * @returns {Promise} Retorna uma promessa que é resolvida quando a imagem é salva com sucesso.
 */
async function baixarImagem(url, localPath) {
  const response = await axios({
    url,
    method: "GET", // Faz uma requisição GET para baixar o arquivo.
    responseType: "stream", // Define o tipo de resposta como um stream de dados (para lidar com arquivos grandes).
  });

  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(localPath); // Cria um stream de escrita para salvar a imagem no local especificado.

    response.data.pipe(writer); // Passa os dados da imagem para o stream de escrita, salvando-a no arquivo.

    writer.on("finish", resolve); // Quando a imagem for salva, resolve a promessa.
    writer.on("error", reject); // Se ocorrer um erro durante o salvamento, rejeita a promessa.
  });
}

// Função para recuperar os produtos de um cliente específico
/**
 * Recupera todos os produtos de um cliente específico a partir do banco de dados.
 *
 * @async
 * @function recuperar
 * @param {Object} request - O objeto de requisição contendo os dados enviados.
 * @param {Object} response - O objeto de resposta utilizado para enviar a resposta ao cliente.
 * @returns {void} Retorna uma resposta HTTP com os produtos ou mensagem de erro.
 */
async function recuperar(request, response) {
  const id_cliente = request.body.id_cliente; // Obtém o ID do cliente enviado no corpo da requisição.
  let query =
    "SELECT * FROM produtos WHERE id_cliente= @id_cliente and deleted = 0"; // Query SQL para recuperar os produtos não excluídos do cliente.

  if (!id_cliente) {
    response.status(401).json("ID do cliente não enviado"); // Se não houver ID de cliente, retorna erro 401.
  }
  try {
    const requestSql = new sql.Request(); // Cria uma nova requisição SQL.
    requestSql.input("id_cliente", sql.Int, id_cliente); // Adiciona o parâmetro 'id_cliente' à requisição SQL.
    const result = await requestSql.query(query); // Executa a query no banco de dados.

    if (result.rowsAffected[0] > 0) {
      response.status(200).json(result.recordset); // Se produtos forem encontrados, retorna uma resposta com status 200 e os produtos.
    } else {
      response.status(404).json({ mensagem: "Nenhum produto registrado" }); // Se nenhum produto for encontrado, retorna erro 404.
    }
  } catch (error) {
    console.error("Erro ao executar consulta:", error.message); // Loga o erro caso ocorra.
    response.status(500).send("Erro ao executar consulta"); // Retorna erro 500 se a consulta falhar.
  }
}

// Função para sincronizar produtos com uma API externa
/**
 * Sincroniza os produtos de um cliente com uma API externa e atualiza no banco de dados.
 *
 * @async
 * @function sincronizar
 * @param {Object} request - O objeto de requisição contendo os dados enviados.
 * @param {Object} response - O objeto de resposta utilizado para enviar a resposta ao cliente.
 * @returns {void} Retorna uma resposta HTTP com o status de sincronização.
 */
async function sincronizar(request, response) {
  const { id_cliente, id_usuario } = request.body; // Desestrutura os dados de id_cliente e id_usuario do corpo da requisição.

  if (!id_cliente) {
    return response.status(401).json("ID do cliente não enviado"); // Se o ID do cliente não for enviado, retorna erro 401.
  }

  let transaction;

  try {
    // Iniciando a transação SQL
    transaction = new sql.Transaction();
    await transaction.begin(); // Inicia a transação no banco de dados.

    // Recupera as informações do cliente
    const clienteInfos = await recuperarClienteInfo(transaction, id_cliente);

    if (!Array.isArray(clienteInfos) || clienteInfos.length === 0) {
      await transaction.rollback(); // Se não encontrar informações do cliente, reverte a transação.
      return response.status(404).json({
        mensagem: "Nenhum dado encontrado para o cliente especificado", // Retorna erro 404 se não houver dados do cliente.
      });
    }

    const produtosComStatusPorCliente = []; // Lista para armazenar os status dos produtos de cada cliente.

    // Processa as informações de cada cliente encontrado
    for (const clienteInfo of clienteInfos) {
      const { ClienteID, UserID, ChaveAPI, URL } = clienteInfo; // Desestrutura os dados do cliente.

      // Obtém o token de acesso da API externa
      const accessToken = await obterAccessToken(
        ClienteID,
        UserID,
        ChaveAPI,
        URL
      );
      if (!accessToken) {
        console.warn(
          `Erro ao fazer login na API externa para o ClienteID: ${ClienteID}` // Log de aviso se o login falhar.
        );
        continue; // Pula para o próximo cliente caso o login falhe.
      }

      // Recupera os produtos da API externa
      const produtosExternos = await obterProdutosExternos(accessToken, URL);
      if (!Array.isArray(produtosExternos) || produtosExternos.length === 0) {
        console.warn(
          `Nenhum produto registrado para o ClienteID: ${ClienteID}` // Log de aviso se não houver produtos para sincronizar.
        );
        continue; // Pula para o próximo cliente caso não haja produtos.
      }

      // Insere ou atualiza os produtos no banco de dados
      const produtosComStatus = await inserirOuAtualizarProdutos(
        transaction,
        produtosExternos,
        id_cliente
      );
      produtosComStatusPorCliente.push({ ClienteID, produtosComStatus }); // Adiciona o status dos produtos para o cliente.
    }

    await transaction.commit(); // Confirma a transação se tudo ocorrer corretamente.

    // Retorna os produtos inseridos/atualizados para todos os clientes.
    response.status(200).json(produtosComStatusPorCliente);
  } catch (error) {
    console.error("Erro ao sincronizar:", error.message); // Log de erro se algo falhar.
    if (transaction) await transaction.rollback(); // Reverte a transação em caso de erro.
    response
      .status(500)
      .json({ mensagem: "Erro ao sincronizar", detalhes: error.message }); // Retorna erro 500 com detalhes.
  }
}

// Função para recuperar informações do cliente a partir do banco de dados
/**
 * Recupera informações do cliente a partir do banco de dados, como ClienteID, UserID, etc.
 *
 * @async
 * @function recuperarClienteInfo
 * @param {Object} transaction - A transação SQL para ser usada nas consultas.
 * @param {number} id_cliente - O ID do cliente a ser pesquisado.
 * @returns {Promise<Array>} Retorna uma lista de informações do cliente.
 */
async function recuperarClienteInfo(transaction, id_cliente) {
  const query = `SELECT ClienteID, UserID, ChaveAPI, URL FROM DMs WHERE ID_Cliente = @id_cliente AND Deleted = 0`;
  const sqlRequest = new sql.Request(transaction); // Cria uma requisição SQL utilizando a transação.
  sqlRequest.input("id_cliente", sql.Int, id_cliente); // Adiciona o parâmetro 'id_cliente' à consulta SQL.
  const result = await sqlRequest.query(query); // Executa a consulta no banco de dados.
  console.log(result); // Loga o resultado da consulta.
  return result.recordset.length > 0 ? result.recordset : null; // Retorna os dados do cliente, ou null se não houver resultados.
}

// Função para obter o token de acesso da API externa
/**
 * Obtém o token de acesso para autenticação na API externa.
 *
 * @async
 * @function obterAccessToken
 * @param {number} ClienteID - O ID do cliente.
 * @param {number} UserID - O ID do usuário para autenticação.
 * @param {string} Chaveapi - A chave de API para autenticação.
 * @param {string} URL - A URL da API externa.
 * @returns {string|null} Retorna o token de acesso ou null em caso de falha.
 */
async function obterAccessToken(ClienteID, UserID, Chaveapi, URL) {
  try {
    console.log(`${URL}/api/Login`); // Loga a URL de login da API externa.
    const response = await axios.post(`${URL}/api/Login`, {
      // Faz uma requisição POST para obter o token.
      UserID: UserID,
      AccessKey: Chaveapi,
      IdCliente: ClienteID,
      tpReadFtp: 0,
    });

    return response.status === 200 ? response.data.accessToken : null; // Retorna o token de acesso se a resposta for bem-sucedida.
  } catch (error) {
    console.error("Erro ao obter token de acesso:", error.message); // Loga o erro caso a requisição falhe.
    return null; // Retorna null em caso de erro.
  }
}

// Função para obter os produtos da API externa
/**
 * Obtém a lista de produtos da API externa.
 *
 * @async
 * @function obterProdutosExternos
 * @param {string} accessToken - O token de acesso para autenticação na API.
 * @param {string} URL - A URL da API externa.
 * @returns {Array|null} Retorna a lista de produtos ou null em caso de erro.
 */
async function obterProdutosExternos(accessToken, URL) {
  try {
    const response = await axios.get(`${URL}/api/VendingMachine/obterEpis`, {
      // Faz uma requisição GET para obter os produtos.
      headers: {
        Authorization: `Bearer ${accessToken}`, // Adiciona o token de acesso no cabeçalho da requisição.
      },
    });

    return response.data; // Retorna os dados da resposta (produtos).
  } catch (error) {
    console.error("Erro ao obter produtos externos:", error.message); // Loga o erro caso a requisição falhe.
    return null; // Retorna null em caso de erro.
  }
}

// Função para inserir ou atualizar produtos no banco de dados
/**
 * Insere ou atualiza produtos no banco de dados.
 *
 * @async
 * @function inserirOuAtualizarProdutos
 * @param {Object} transaction - A transação SQL para ser usada nas consultas.
 * @param {Array} produtosExternos - Lista de produtos externos a serem inseridos ou atualizados.
 * @param {number} id_cliente - O ID do cliente para associar os produtos.
 * @returns {Array} Retorna uma lista com os produtos e o status de inserção/atualização.
 */
async function inserirOuAtualizarProdutos(
  transaction,
  produtosExternos,
  id_cliente
) {
  const baseUrl =
    "https://mobsolucoesdigitais.blob.core.windows.net/mobcontrole/"; // URL base para os arquivos de imagem.
  const uploadPathPrincipal = path.join(
    __dirname,
    "../../uploads/produtos",
    id_cliente.toString(),
    "principal"
  ); // Caminho onde as imagens dos produtos serão salvas.

  const produtosComStatus = []; // Lista para armazenar os produtos e seu status (adicionado, atualizado).

  // Cria o diretório de upload se ele não existir.
  if (!fs.existsSync(uploadPathPrincipal)) {
    fs.mkdirSync(uploadPathPrincipal, { recursive: true }); // Cria diretórios recursivamente.
  }

  // Loop para processar cada produto externo
  for (let produto of produtosExternos) {
    const imagemNova = produto.foto ? produto.foto.replace(baseUrl, "") : ""; // Obtém a imagem nova (sem o URL base).

    // Verifica se o produto já existe no banco de dados
    const checkProductRequest = new sql.Request(transaction);
    checkProductRequest.input("id_cliente", sql.Int, id_cliente);
    checkProductRequest.input("codigo", sql.VarChar, produto.codigo);

    const existingProduct = await checkProductRequest.query(`
            SELECT codigo, imagem1 FROM Produtos WHERE id_cliente = @id_cliente AND codigo = @codigo
        `); // Verifica se o produto já existe.

    let status;

    if (existingProduct.recordset.length > 0) {
      // Se o produto já existir no banco.
      const imagemAtual = existingProduct.recordset[0].imagem1; // Obtém a imagem atual do banco.

      // Se a imagem nova for diferente da imagem atual
      if (imagemNova !== imagemAtual) {
        const caminhoImagemLocal = path.join(
          uploadPathPrincipal,
          path.basename(imagemNova)
        ); // Caminho para salvar a nova imagem localmente.

        // Se a imagem nova estiver presente, baixa e salva.
        if (produto.foto) {
          try {
            await baixarImagem(produto.foto, caminhoImagemLocal);
            console.log(`Imagem atualizada e salva em: ${caminhoImagemLocal}`); // Loga o caminho onde a imagem foi salva.
          } catch (error) {
            console.error(`Erro ao baixar a imagem: ${error.message}`); // Loga o erro caso o download da imagem falhe.
          }
        }

        const produtoRequest = new sql.Request(transaction);
        produtoRequest
          .input("id_cliente", sql.Int, id_cliente)
          .input("codigo", sql.VarChar, produto.codigo)
          .input("id_categoria", sql.Int, 1)
          .input("nome", sql.VarChar, produto.nome)
          .input("descricao", sql.VarChar, produto.descricao || "")
          .input("ca", sql.NVarChar, produto.ca || "")
          .input("validadeDias", sql.Int, produto.diasUsoMinimo || 0)
          .input("imagem1", sql.VarChar, path.basename(imagemNova)) // Atualiza a imagem no banco.
          .input("quantidadeMinima", sql.Int, produto.estoqueMinimo || 0)
          .input("id_planta", sql.Int, produto.codigoPlantaEpi || null)
          .input("unidade_medida", sql.VarChar, produto.unidademedida || "")
          .input("deleted", sql.Bit, 0);

        await produtoRequest.query(`
                    UPDATE Produtos
                    SET nome = @nome,
                        descricao = @descricao,
                        ca = @ca,
                        validadeDias = @validadeDias,
                        imagem1 = @imagem1,
                        quantidadeMinima = @quantidadeMinima,
                        id_categoria = @id_categoria,
                        id_planta = @id_planta,
                        unidade_medida = @unidade_medida,
                        deleted = @deleted
                    WHERE id_cliente = @id_cliente AND codigo = @codigo
                `); // Atualiza os dados do produto no banco.

        status = "atualizado"; // Marca o status como atualizado.
      } else {
        // Se a imagem é a mesma, apenas atualiza os outros campos.
        const produtoRequest = new sql.Request(transaction);
        produtoRequest
          .input("id_cliente", sql.Int, id_cliente)
          .input("codigo", sql.VarChar, produto.codigo)
          .input("id_categoria", sql.Int, 1)
          .input("nome", sql.VarChar, produto.nome)
          .input("descricao", sql.VarChar, produto.descricao || "")
          .input("ca", sql.NVarChar, produto.ca || "")
          .input("validadeDias", sql.Int, produto.diasUsoMinimo || 0)
          .input("quantidadeMinima", sql.Int, produto.estoqueMinimo || 0)
          .input("id_planta", sql.Int, produto.codigoPlantaEpi || null)
          .input("unidade_medida", sql.VarChar, produto.unidademedida || "")
          .input("deleted", sql.Bit, 0);

        await produtoRequest.query(`
                    UPDATE Produtos
                    SET nome = @nome,
                        descricao = @descricao,
                        ca = @ca,
                        validadeDias = @validadeDias,
                        quantidadeMinima = @quantidadeMinima,
                        id_categoria = @id_categoria,
                        id_planta = @id_planta,
                        unidade_medida = @unidade_medida,
                        deleted = @deleted
                    WHERE id_cliente = @id_cliente AND codigo = @codigo
                `); // Atualiza os dados do produto no banco (sem mudar a imagem).

        status = "atualizado"; // Marca o status como atualizado.
      }
    } else {
      // Se o produto não existir, insere um novo produto no banco.
      const caminhoImagemLocal = path.join(
        uploadPathPrincipal,
        path.basename(imagemNova)
      ); // Caminho onde a nova imagem será salva.

      if (produto.foto) {
        try {
          await baixarImagem(produto.foto, caminhoImagemLocal); // Baixa e salva a nova imagem.
          console.log(`Imagem baixada e salva em: ${caminhoImagemLocal}`);
        } catch (error) {
          console.error(`Erro ao baixar a imagem: ${error.message}`); // Log de erro caso falhe ao baixar a imagem.
        }
      }

      const produtoRequest = new sql.Request(transaction);
      produtoRequest
        .input("id_cliente", sql.Int, id_cliente)
        .input("codigo", sql.VarChar, produto.codigo)
        .input("id_categoria", sql.Int, 1)
        .input("nome", sql.VarChar, produto.nome)
        .input("descricao", sql.VarChar, produto.descricao || "")
        .input("ca", sql.NVarChar, produto.ca || "")
        .input("validadeDias", sql.Int, produto.diasUsoMinimo || 0)
        .input("imagem1", sql.VarChar, path.basename(imagemNova))
        .input("quantidadeMinima", sql.Int, produto.estoqueMinimo || 0)
        .input("id_planta", sql.Int, produto.codigoPlantaEpi || null)
        .input("unidade_medida", sql.VarChar, produto.unidademedida || "")
        .input("deleted", sql.Bit, 0);

      await produtoRequest.query(`
                INSERT INTO Produtos (
                    id_cliente, codigo, nome, descricao, ca, validadeDias, imagem1, 
                    quantidadeMinima, id_categoria, id_planta, unidade_medida, deleted
                ) 
                VALUES (
                    @id_cliente, @codigo, @nome, @descricao, @ca, @validadeDias, @imagem1, 
                    @quantidadeMinima, @id_categoria, @id_planta, @unidade_medida, @deleted
                )
            `); // Insere o novo produto no banco de dados.

      status = "adicionado"; // Marca o status como adicionado.
    }

    produtosComStatus.push({ produto, status }); // Adiciona o produto e seu status à lista de produtos.
  }

  return produtosComStatus; // Retorna a lista de produtos com seus respectivos status.
}

// Função para determinar o tipo e ajustar o nome da imagem
/**
 * Determina o tipo e ajusta o nome da imagem.
 *
 * @param {string} imagemNome - O nome da imagem a ser ajustado.
 * @returns {string} Retorna o novo nome da imagem com prefixo "Princ_".
 */
function determinarTipoENomeImagem(imagemNome) {
  const prefixo = "Princ_"; // Prefixo para o nome da imagem.
  const extensao = path.extname(imagemNome); // Obtém a extensão do arquivo (.jpg, .png, etc.).
  const novoNome = `${prefixo}${path.basename(
    imagemNome,
    extensao
  )}${extensao}`; // Concatena o prefixo com o nome base e a extensão.
  return novoNome; // Retorna o novo nome da imagem.
}

module.exports = {
  recuperar,
  sincronizar,
};
