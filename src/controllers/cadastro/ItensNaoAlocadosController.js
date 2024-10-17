const sql = require("mssql");
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Console } = require("console");
const { console } = require("inspector");

// Função para baixar e salvar uma imagem
async function baixarImagem(url, localPath) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
    });

    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(localPath);

        response.data.pipe(writer);

        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function recuperar(request, response) {
    const  id_cliente = request.body.id_cliente;
    let query = 'SELECT * FROM produtos WHERE id_cliente= @id_cliente and deleted = 0';

    if (!id_cliente) {
        response.status(401).json("ID do cliente não enviado");
    }
    try {
        const requestSql = new sql.Request();
        requestSql.input('id_cliente', sql.Int, id_cliente);
        const result = await requestSql.query(query);
        if (result.rowsAffected[0] > 0) {
            response.status(200).json(result.recordset);
        } else {
            response.status(404).json({ mensagem: "Nenhum produto registrado" });
        }
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

async function sincronizar(request, response) {
    const { id_cliente, id_usuario } = request.body;

    if (!id_cliente) {
        return response.status(401).json("ID do cliente não enviado");
    }

    let transaction;

    try {
        // Iniciando a transação
        transaction = new sql.Transaction();
        await transaction.begin();

        // Recuperar informações do cliente
        const clienteInfo = await recuperarClienteInfo(transaction, id_cliente);

        if (!clienteInfo) {
            await transaction.rollback();
            return response.status(404).json({ mensagem: "Nenhum dado encontrado para o cliente especificado" });
        }
        console.log(clienteInfo)
        const { ClienteID, UserID, Chave ,URL} = clienteInfo;

        // Obter token de acesso da API externa
        const accessToken = await obterAccessToken(ClienteID, UserID, Chave,URL);

        if (!accessToken) {
            await transaction.rollback();
            return response.status(500).json({ mensagem: 'Erro ao fazer login na API externa' });
        }

        // Obter produtos externos
        const produtosExternos = await obterProdutosExternos(accessToken,URL);

        if (!Array.isArray(produtosExternos) || produtosExternos.length === 0) {
            await transaction.rollback();
            return response.status(404).json("Nenhum produto registrado");
        }

        // Inserir ou atualizar produtos no banco de dados
        const produtosComStatus = await inserirOuAtualizarProdutos(transaction, produtosExternos, id_cliente);
        await transaction.commit();

        // Retornando os produtos inseridos
        response.status(200).json(produtosComStatus);

    } catch (error) {
        console.error('Erro ao sincronizar:', error.message);
        if (transaction) await transaction.rollback();
        response.status(500).json({ mensagem: 'Erro ao sincronizar', detalhes: error.message });
    }
}

// Função para recuperar informações do cliente
async function recuperarClienteInfo(transaction, id_cliente) {
    const query = `SELECT ClienteID, UserID, Chave,URL FROM DMs WHERE ID_Cliente = @id_cliente AND Deleted = 0`;
    const sqlRequest = new sql.Request(transaction);
    sqlRequest.input('id_cliente', sql.Int, id_cliente);
    const result = await sqlRequest.query(query);
    console.log(result)
    return result.recordset.length > 0 ? result.recordset[0] : null;
}

// Função para obter o token de acesso da API externa
async function obterAccessToken(ClienteID, UserID, Chave,URL) {
    try {
        console.log(`${URL}/api/Login`)
        const response = await axios.post(`${URL}/api/Login`, {
            UserID: UserID,
            AccessKey: Chave,
            IdCliente: ClienteID,
            tpReadFtp: 0
        });

        return response.status === 200 ? response.data.accessToken : null;
    } catch (error) {
        console.error('Erro ao obter token de acesso:', error.message);
        return null;
    }
}

// Função para obter produtos externos da API
async function obterProdutosExternos(accessToken,URL) {
    try {
        const response = await axios.get(`${URL}/api/VendingMachine/obterEpis`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('Erro ao obter produtos externos:', error.message);
        return null;
    }
}

// Função para determinar o tipo e ajustar o nome da imagem
function determinarTipoENomeImagem(imagemNome) {
    const prefixo = "Princ_";
    const extensao = path.extname(imagemNome); // Obtém a extensão do arquivo (.jpg, .png, etc.)
    const novoNome = `${prefixo}${path.basename(imagemNome, extensao)}${extensao}`; // Concatena o prefixo com o nome base e a extensão
    return novoNome;
}

// Função para inserir ou atualizar produtos no banco de dados
async function inserirOuAtualizarProdutos(transaction, produtosExternos, id_cliente) {
    const baseUrl = "https://mobsolucoesdigitais.blob.core.windows.net/mobcontrole/";
    const uploadPathPrincipal = path.join(__dirname, '../../uploads/produtos', id_cliente.toString(), 'principal');
    const produtosComStatus = [];

    // Cria o diretório se não existir
    if (!fs.existsSync(uploadPathPrincipal)) {
        fs.mkdirSync(uploadPathPrincipal, { recursive: true });
    }

    for (let produto of produtosExternos) {
        const imagemNova = produto.foto ? produto.foto.replace(baseUrl, "") : '';

        // Verifica se o produto já existe no banco de dados
        const checkProductRequest = new sql.Request(transaction);
        checkProductRequest.input('id_cliente', sql.Int, id_cliente);
        checkProductRequest.input('codigo', sql.Int, produto.codigo);

        const existingProduct = await checkProductRequest.query(`
            SELECT codigo, imagem1 FROM Produtos WHERE id_cliente = @id_cliente AND codigo = @codigo
        `);

        let status;

        if (existingProduct.recordset.length > 0) {
            const imagemAtual = existingProduct.recordset[0].imagem1;

            // Verifica se a imagem nova é diferente da imagem atual
            if (imagemNova !== imagemAtual) {
                const caminhoImagemLocal = path.join(uploadPathPrincipal, path.basename(imagemNova));

                // Baixa a imagem se for diferente
                if (produto.foto) {
                    try {
                        await baixarImagem(produto.foto, caminhoImagemLocal);
                        console.log(`Imagem atualizada e salva em: ${caminhoImagemLocal}`);
                    } catch (error) {
                        console.error(`Erro ao baixar a imagem: ${error.message}`);
                    }
                }

                const produtoRequest = new sql.Request(transaction);
                produtoRequest.input('id_cliente', sql.Int, id_cliente)
                    .input('codigo', sql.Int, produto.codigo)
                    .input('id_categoria', sql.Int, 1)
                    .input('nome', sql.VarChar, produto.nome)
                    .input('descricao', sql.VarChar, produto.descricao || '')
                    .input('ca', sql.VarChar, produto.ca || '')
                    .input('validadeDias', sql.Int, produto.diasUsoMinimo || 0)
                    .input('imagem1', sql.VarChar, path.basename(imagemNova)) // Atualiza para a nova imagem
                    .input('quantidadeMinima', sql.Int, produto.estoqueMinimo || 0)
                    .input('id_planta', sql.Int, produto.codigoPlantaEpi || null)
                    .input('unidade_medida', sql.VarChar, produto.unidademedida || '')
                    .input('deleted', sql.Bit, 0);

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
                `);
                status = 'atualizado';
            } else {
                // Se a imagem é a mesma, apenas atualiza outros campos
                const produtoRequest = new sql.Request(transaction);
                produtoRequest.input('id_cliente', sql.Int, id_cliente)
                    .input('codigo', sql.Int, produto.codigo)
                    .input('id_categoria', sql.Int, 1)
                    .input('nome', sql.VarChar, produto.nome)
                    .input('descricao', sql.VarChar, produto.descricao || '')
                    .input('ca', sql.VarChar, produto.ca || '')
                    .input('validadeDias', sql.Int, produto.diasUsoMinimo || 0)
                    .input('quantidadeMinima', sql.Int, produto.estoqueMinimo || 0)
                    .input('id_planta', sql.Int, produto.codigoPlantaEpi || null)
                    .input('unidade_medida', sql.VarChar, produto.unidademedida || '')
                    .input('deleted', sql.Bit, 0);

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
                `);
                status = 'atualizado';
            }
        } else {
            // Inserção de novo produto
            const caminhoImagemLocal = path.join(uploadPathPrincipal, path.basename(imagemNova));

            if (produto.foto) {
                try {
                    await baixarImagem(produto.foto, caminhoImagemLocal);
                    console.log(`Imagem baixada e salva em: ${caminhoImagemLocal}`);
                } catch (error) {
                    console.error(`Erro ao baixar a imagem: ${error.message}`);
                }
            }

            const produtoRequest = new sql.Request(transaction);
            produtoRequest.input('id_cliente', sql.Int, id_cliente)
                .input('codigo', sql.Int, produto.codigo)
                .input('id_categoria', sql.Int, 1)
                .input('nome', sql.VarChar, produto.nome)
                .input('descricao', sql.VarChar, produto.descricao || '')
                .input('ca', sql.VarChar, produto.ca || '')
                .input('validadeDias', sql.Int, produto.diasUsoMinimo || 0)
                .input('imagem1', sql.VarChar, path.basename(imagemNova))
                .input('quantidadeMinima', sql.Int, produto.estoqueMinimo || 0)
                .input('id_planta', sql.Int, produto.codigoPlantaEpi || null)
                .input('unidade_medida', sql.VarChar, produto.unidademedida || '')
                .input('deleted', sql.Bit, 0);

            await produtoRequest.query(`
                INSERT INTO Produtos (
                    id_cliente, codigo, nome, descricao, ca, validadeDias, imagem1, 
                    quantidadeMinima, id_categoria, id_planta, unidade_medida, deleted
                ) 
                VALUES (
                    @id_cliente, @codigo, @nome, @descricao, @ca, @validadeDias, @imagem1, 
                    @quantidadeMinima, @id_categoria, @id_planta, @unidade_medida, @deleted
                )
            `);
            status = 'adicionado';
        }

        // Adiciona o produto e seu status à lista
        produtosComStatus.push({ produto, status });
    }

    return produtosComStatus;
}


module.exports = {
    recuperar, sincronizar
}