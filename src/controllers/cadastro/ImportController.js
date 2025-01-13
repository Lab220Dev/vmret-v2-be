const sql = require("mssql");  // Importa o módulo 'mssql' para interagir com o banco de dados SQL Server.
const { logQuery } = require('../../utils/logUtils');  // Importa a função 'logQuery' para registrar logs de consultas realizadas.

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
    const { tipo, dados } = request.body;  // Desestrutura os dados do corpo da requisição: tipo (tipo de importação) e dados (dados a serem importados).

    try {
        switch (tipo.toLowerCase()) {  // Verifica o tipo de importação, tornando a verificação case-insensitive.
            case 'centro de custo':
            case 'cdc':
                await insertCentroDeCusto(dados, request.user);  // Chama a função para inserir dados de Centro de Custo, passando os dados e o usuário.
                break;
            case 'funcao':
                await insertFuncao(dados, request.user);  // Chama a função para inserir dados de Função.
                break;
            case 'setor':
                await insertSetor(dados, request.user);  // Chama a função para inserir dados de Setor.
                break;
            case 'produto':
                await insertProduto(dados, request.user);  // Chama a função para inserir dados de Produto.
                break;
            case 'itens do setor':
            case 'itens':
                await insertItensDoSetor(dados, request.user);  // Chama a função para inserir dados de Itens do Setor.
                break;
            case 'planta':
                await insertPlanta(dados, request.user);  // Chama a função para inserir dados de Planta.
                break;
            case 'funcionario':
            case 'funcionarios':
                await insertFuncionario(dados, request.user);  // Chama a função para inserir dados de Funcionário.
                break;
            default:
                return response.status(400).json({ message: 'Tipo de importação não suportado.' });  // Retorna erro caso o tipo não seja reconhecido.
        }

        // Após a inserção bem-sucedida, registra um log indicando o sucesso da importação.
        await logQuery('importacao', tipo, dados, 'Importação realizada com sucesso.');
        return response.status(200).json({ message: 'Importação realizada com sucesso.' });  // Retorna uma resposta de sucesso ao cliente.
    } catch (error) {
        // Caso ocorra um erro, registra um log indicando o erro ocorrido.
        await logQuery('importacao', tipo, dados, `Erro na importação: ${error.message}`);
        return response.status(500).json({ message: 'Erro na importação.', error: error.message });  // Retorna uma resposta de erro.
    }
}

// Função para inserir Centro de Custo
/**
 * Função para inserir dados de Centro de Custo no banco de dados.
 * 
 * @async
 * @function insertCentroDeCusto
 * @param {Array} dados - Dados do centro de custo a serem inseridos.
 * @param {Object} usuario - Informações do usuário que realizou a operação (para log).
 * @returns {void} - Nenhuma resposta é retornada diretamente.
 */
async function insertCentroDeCusto(dados, usuario) {
    const transaction = new sql.Transaction();  // Cria uma nova transação SQL para garantir a consistência dos dados.

    try {
        await transaction.begin();  // Inicia a transação.

        const request = new sql.Request(transaction);  // Cria uma requisição SQL dentro da transação.

        // Criação de uma tabela temporária para inserir múltiplos registros.
        const table = new sql.Table('CentroDeCusto');  // Define a tabela para inserção dos dados.
        table.columns.add('Codigo', sql.VarChar(50), { nullable: false });  // Adiciona a coluna 'Codigo' (não pode ser nulo).
        table.columns.add('Nome', sql.VarChar(255), { nullable: false });  // Adiciona a coluna 'Nome' (não pode ser nulo).

        dados.forEach(d => {  // Para cada item nos dados, adiciona uma nova linha na tabela temporária.
            table.rows.add(d.codigo, d.nome);
        });

        await request.bulk(table);  // Realiza a inserção em massa usando a tabela temporária.

        await transaction.commit();  // Se a inserção for bem-sucedida, confirma a transação.
        console.log('Transação de Centro de Custo concluída com sucesso');  // Log de sucesso.

        // await logQuery('insertCentroDeCusto', dados, 'Inserção realizada com sucesso.', 'success', usuario); // Log comentado.
    } catch (error) {
        await transaction.rollback();  // Se ocorrer erro, desfaz todas as operações realizadas na transação.
        // console.error('Erro na transação de Centro de Custo, todas as operações foram revertidas:', error.message); // Comentado.
        await logQuery('insertCentroDeCusto', dados, `Erro: ${error.message}`, 'error', usuario);  // Registra o erro no log.
        throw error;  // Lança o erro para que seja tratado na função principal.
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
    const transaction = new sql.Transaction();  // Cria uma nova transação SQL.

    try {
        await transaction.begin();  // Inicia a transação.

        const request = new sql.Request(transaction);  // Cria uma requisição SQL dentro da transação.
        const query = `INSERT INTO Funcao (Codigo, Nome) VALUES (@Codigo, @Nome)`;  // Define a consulta de inserção para a tabela 'Funcao'.

        for (const d of dados) {  // Para cada dado de função, executa a consulta.
            await request
                .input('Codigo', sql.VarChar, d.codigo)  // Adiciona o parâmetro 'Codigo'.
                .input('Nome', sql.VarChar, d.nome)  // Adiciona o parâmetro 'Nome'.
                .query(query);  // Executa a consulta de inserção.
        }

        await transaction.commit();  // Confirma a transação.
        console.log('Transação de Função concluída com sucesso');  // Log de sucesso.

        // await logQuery('insertFuncao', dados, 'Inserção realizada com sucesso.', 'success', usuario); // Log comentado.
    } catch (error) {
        await transaction.rollback();  // Se ocorrer erro, desfaz as operações realizadas na transação.
        console.error('Erro na transação de Função, todas as operações foram revertidas:', error.message);  // Log de erro.
        // await logQuery('insertFuncao', dados, `Erro: ${error.message}`, 'error', usuario); // Log comentado.
        throw error;  // Lança o erro para ser tratado na função principal.
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
        throw error;  // Lança o erro para ser tratado na função principal.
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
        throw error;  // Lança o erro para ser tratado na função principal.
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
async function insertItensDoSetor(dados, usuario) {
    // Implementar lógica similar às funções acima
    try {
        // Lógica de inserção
        // await logQuery('insertItensDoSetor', dados, 'Inserção realizada com sucesso.', 'success', usuario); // Log comentado.
    } catch (error) {
        // await logQuery('insertItensDoSetor', dados, `Erro: ${error.message}`, 'error', usuario); // Log comentado.
        throw error;  // Lança o erro para ser tratado na função principal.
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
        throw error;  // Lança o erro para ser tratado na função principal.
    }
}

// Função para inserir Funcionários
/**
 * Função para inserir dados de Funcionários no banco de dados.
 * 
 * @async
 * @function insertFuncionario
 * @param {Array} dados - Dados dos funcionários a serem inseridos.
 * @param {Object} usuario - Informações do usuário que realizou a operação (para log).
 * @returns {void} - Nenhuma resposta é retornada diretamente.
 */
async function insertFuncionario(dados, usuario) {
    const transaction = new sql.Transaction();  // Cria uma nova transação SQL.

    try {
        await transaction.begin();  // Inicia a transação.

        const request = new sql.Request(transaction);  // Cria uma requisição SQL dentro da transação.
        const query = `
            INSERT INTO Funcionario (
                Nome, Matricula, DataDeAdmissao, CPF, RG, CTPS, Email, ID_CentroCusto, id_planta, id_setor, id_funcao, Status,
                HoraInicial, HoraFinal, Segunda, Terca, Quarta, Quinta, Sexta, Sabado, Domingo
            ) VALUES (
                @Nome, @Matricula, @DataDeAdmissao, @CPF, @RG, @CTPS, @Email, @ID_CentroCusto, @id_planta, @id_setor, @id_funcao, @Status,
                @HoraInicial, @HoraFinal, @Segunda, @Terca, @Quarta, @Quinta, @Sexta, @Sabado, @Domingo
            )
        `;

        for (const d of dados) {  // Para cada funcionário nos dados, executa a consulta de inserção.
            try {
                const diasBooleanos = {
                    Segunda: validarBooleano(d.segunda),  // Converte valores "Sim"/"Não" para booleanos.
                    Terca: validarBooleano(d.terca),
                    Quarta: validarBooleano(d.quarta),
                    Quinta: validarBooleano(d.quinta),
                    Sexta: validarBooleano(d.sexta),
                    Sabado: validarBooleano(d.sabado),
                    Domingo: validarBooleano(d.domingo),
                };

                // Validação de IDs ou nomes para Centro de Custo, Planta, Setor e Função.
                const centroDeCustoId = await obterIdOuFalhar('Centro_Custos', 'ID_CentroCusto', 'Nome', d.centroDeCusto);
                const plantaId = await obterIdOuFalhar('Plantas', 'id_planta', 'Nome', d.planta);
                const setorId = await obterIdOuFalhar('Setores', 'id_setor', 'Nome', d.setor);
                const funcaoId = await obterIdOuFalhar('Funcao', 'id_funcao', 'Nome', d.funcao);

                if (!centroDeCustoId || !plantaId || !setorId || !funcaoId) {
                    throw new Error('Validação falhou para Centro de Custo, Planta, Setor ou Função');  // Erro se algum dos IDs não for encontrado.
                }

                await request
                    .input('Nome', sql.VarChar, d.Nome)
                    .input('Matricula', sql.VarChar, d.Matricula)
                    .input('DataDeAdmissao', sql.Date, d.DataDeAdmissao ? new Date(d.DataDeAdmissao) : null)
                    .input('CPF', sql.VarChar, d.CPF)
                    .input('RG', sql.VarChar, d.RG)
                    .input('CTPS', sql.VarChar, d.CTPS)
                    .input('Email', sql.VarChar, d.Email)
                    .input('ID_CentroCusto', sql.Int, centroDeCustoId)
                    .input('id_planta', sql.Int, plantaId)
                    .input('id_setor', sql.Int, setorId)
                    .input('id_funcao', sql.Int, funcaoId)
                    .input('Status', sql.VarChar, d.Status)
                    .input('HoraInicial', sql.Time, d.HoraInicial ? new Date(`1970-01-01T${d.HoraInicial}:00Z`) : null)
                    .input('HoraFinal', sql.Time, d.HoraFinal ? new Date(`1970-01-01T${d.HoraFinal}:00Z`) : null)
                    .input('Segunda', sql.Bit, diasBooleanos.Segunda)
                    .input('Terca', sql.Bit, diasBooleanos.Terca)
                    .input('Quarta', sql.Bit, diasBooleanos.Quarta)
                    .input('Quinta', sql.Bit, diasBooleanos.Quinta)
                    .input('Sexta', sql.Bit, diasBooleanos.Sexta)
                    .input('Sabado', sql.Bit, diasBooleanos.Sabado)
                    .input('Domingo', sql.Bit, diasBooleanos.Domingo)
                    .query(query);  // Executa a consulta para inserir o funcionário.
            } catch (itemError) {
                console.error(`Erro ao processar o funcionário ${d.Nome}: ${itemError.message}`);  // Log de erro.
                // await logQuery('insertFuncionario', d, `Erro: ${itemError.message}`, 'error', usuario); // Log comentado.
                throw itemError;  // Lança o erro se ocorrer.
            }
        }

        await transaction.commit();  // Confirma a transação se tudo estiver correto.
        console.log('Transação de Funcionários concluída com sucesso');  // Log de sucesso.
        // await logQuery('insertFuncionario', dados, 'Inserção realizada com sucesso.', 'success', usuario); // Log comentado.
    } catch (error) {
        await transaction.rollback();  // Se ocorrer erro, desfaz a transação.
        console.error('Erro na transação de Funcionários, todas as operações foram revertidas:', error.message);  // Log de erro.
        // await logQuery('insertFuncionario', dados, `Erro: ${error.message}`, 'error', usuario); // Log comentado.
        throw error;  // Lança o erro para ser tratado na função principal.
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
    const request = new sql.Request();  // Cria uma nova requisição SQL.

    let query, result;
    if (isNaN(valor)) {  // Se o valor não for número, assume-se que é um nome.
        query = `SELECT ${campoId} AS id FROM ${tabela} WHERE ${campoNome} = @valor`;  // Consulta para buscar o ID pelo nome.
        result = await request
            .input('valor', sql.VarChar, valor)
            .query(query);
    } else {  // Caso contrário, busca-se pelo ID diretamente.
        query = `SELECT ${campoId} AS id FROM ${tabela} WHERE ${campoId} = @valor`;  // Consulta para buscar pelo ID.
        result = await request
            .input('valor', sql.Int, parseInt(valor))
            .query(query);
    }

    if (result.recordset.length > 0) {  // Se a consulta retornar algum resultado.
        return result.recordset[0].id;  // Retorna o ID encontrado.
    } else {
        throw new Error(`Valor '${valor}' não encontrado em '${tabela}'`);  // Lança erro caso não encontre.
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
    if (typeof valor === 'boolean') {  // Se já for booleano, retorna o valor.
        return valor;
    } else if (typeof valor === 'string') {  // Se for string, valida "Sim"/"Não".
        const valorNormalizado = valor.trim().toLowerCase();
        if (valorNormalizado === "sim") {
            return true;
        } else if (valorNormalizado === "não" || valorNormalizado === "nao") {
            return false;
        }
    }
    throw new Error(`Valor inválido para campo booleano: ${valor}`);  // Lança erro se o valor não for válido.
}

// Exportação da função de importação
module.exports = {
    importacao  // Exporta a função principal para ser utilizada em outros módulos.
};