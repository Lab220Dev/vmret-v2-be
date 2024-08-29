const sql = require("mssql");
const axios = require('axios');

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

        // Recuperando ClienteID, UserID e Chave da tabela DM
        const query = `SELECT ClienteID, UserID, Chave FROM DMs WHERE IDcliente = @id_cliente`;
        let sqlRequest = new sql.Request(transaction);
        sqlRequest.input('id_cliente', sql.Int, id_cliente);
        const result = await sqlRequest.query(query);

        if (result.recordset.length === 0) {
            await transaction.rollback();
            return response.status(404).json({ mensagem: "Nenhum dado encontrado para o cliente especificado" });
        }

        const { ClienteID, UserID, Chave } = result.recordset[0];

        // Fazendo chamada para a API de Login
        const loginResponse = await axios.post('https://api.mobsolucoesdigitais.com.br/api/Login', {
            UserID: UserID,
            AccessKey: Chave,
            IdCliente: ClienteID,
            tpReadFtp: 0
        });

        if (loginResponse.status !== 200) {
            await transaction.rollback();
            return response.status(loginResponse.status).json({ mensagem: 'Erro ao fazer login na API externa' });
        }

        const { accessToken } = loginResponse.data;

        // Fazendo chamada para obter os EPIs usando o access token no header
        const episResponse = await axios.get('https://api.mobsolucoesdigitais.com.br/api/VendingMachine/obterEpis', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        const produtosExternos = episResponse.data;

        if (!Array.isArray(produtosExternos) || produtosExternos.length === 0) {
            await transaction.rollback();
            return response.status(404).json("Nenhum produto registrado");
        }

        // Inserindo os produtos na tabela Produtos
        for (let produto of produtosExternos) {
            // Extraindo apenas a parte necessária da URL
            const baseUrl = "https://mobsolucoesdigitais.blob.core.windows.net/mobcontrole/";
            const imagem1 = produto.foto ? produto.foto.replace(baseUrl, "") : '';

            const produtoRequest = new sql.Request(transaction); // Nova instância para cada inserção
            produtoRequest.input('id_cliente', sql.Int, id_cliente)
                .input('codigo', sql.Int, produto.codigo)
                .input('id_categoria', sql.Int, 1)
                .input('nome', sql.VarChar, produto.nome)
                .input('descricao', sql.VarChar, produto.descricao || '')
                .input('ca', sql.VarChar, produto.ca || '')
                .input('validadeDias', sql.Int, produto.diasUsoMinimo || 0)
                .input('imagem1', sql.VarChar, imagem1)
                .input('quantidadeMinima', sql.Int, produto.estoqueMinimo || 0)                
                .input('id_planta', sql.Int, produto.codigoPlantaEpi || null)
                .input('unidade_medida', sql.VarChar, produto.unidademedida || '')
                .input('deleted', sql.Bit, 0);

            await produtoRequest.query(`
                INSERT INTO Produtos (
                    id_cliente, codigo, nome, descricao, ca, validadeDias, imagem1, 
                    quantidadeMinima,id_categoria,  id_planta, unidade_medida, deleted
                ) 
                VALUES (
                    @id_cliente, @codigo, @nome, @descricao, @ca, @validadeDias, @imagem1, 
                    @quantidadeMinima,@id_categoria, @id_planta, @unidade_medida, @deleted
                )
            `);
        }

        await transaction.commit();

        // Retornando os produtos inseridos
        response.status(200).json(produtosExternos);

    } catch (error) {
        console.error('Erro ao sincronizar:', error.message);
        if (transaction) await transaction.rollback();
        response.status(500).json({ mensagem: 'Erro ao sincronizar', detalhes: error.message });
    }
}

module.exports = {
    recuperar, sincronizar
}