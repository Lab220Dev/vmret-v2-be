const sql = require("mssql");
const { logQuery } = require('../../utils/logUtils');

// Função principal de importação
async function importacao(request, response) {
    const { tipo, dados } = request.body;

    try {
        switch (tipo.toLowerCase()) { // Tornar a verificação case-insensitive
            case 'centro de custo':
            case 'cdc':
                await insertCentroDeCusto(dados, request.user); // Passar informações do usuário para logs
                break;
            case 'funcao':
                await insertFuncao(dados, request.user);
                break;
            case 'setor':
                await insertSetor(dados, request.user);
                break;
            case 'produto':
                await insertProduto(dados, request.user);
                break;
            case 'itens do setor':
            case 'itens':
                await insertItensDoSetor(dados, request.user);
                break;
            case 'planta':
                await insertPlanta(dados, request.user);
                break;
            case 'funcionario':
            case 'funcionarios':
                await insertFuncionario(dados, request.user);
                break;
            default:
                return response.status(400).json({ message: 'Tipo de importação não suportado.' });
        }

        await logQuery('importacao', tipo, dados, 'Importação realizada com sucesso.');
        return response.status(200).json({ message: 'Importação realizada com sucesso.' });
    } catch (error) {
        await logQuery('importacao', tipo, dados, `Erro na importação: ${error.message}`);
        return response.status(500).json({ message: 'Erro na importação.', error: error.message });
    }
}

// Função para inserir Centro de Custo
async function insertCentroDeCusto(dados, usuario) {
    const transaction = new sql.Transaction();

    try {
        await transaction.begin();

        const request = new sql.Request(transaction);

        // Inserção em lote utilizando tabelas temporárias
        const table = new sql.Table('CentroDeCusto');
        table.columns.add('Codigo', sql.VarChar(50), { nullable: false });
        table.columns.add('Nome', sql.VarChar(255), { nullable: false });

        dados.forEach(d => {
            table.rows.add(d.codigo, d.nome);
        });

        await request.bulk(table);

        await transaction.commit();
        console.log('Transação de Centro de Custo concluída com sucesso');
       // await logQuery('insertCentroDeCusto', dados, 'Inserção realizada com sucesso.', 'success', usuario);
    } catch (error) {
        await transaction.rollback();
       // console.error('Erro na transação de Centro de Custo, todas as operações foram revertidas:', error.message);
        await logQuery('insertCentroDeCusto', dados, `Erro: ${error.message}`, 'error', usuario);
        throw error;
    }
}

// Função para inserir Função
async function insertFuncao(dados, usuario) {
    const transaction = new sql.Transaction();

    try {
        await transaction.begin();

        const request = new sql.Request(transaction);
        const query = `INSERT INTO Funcao (Codigo, Nome) VALUES (@Codigo, @Nome)`;

        for (const d of dados) {
            await request
                .input('Codigo', sql.VarChar, d.codigo)
                .input('Nome', sql.VarChar, d.nome)
                .query(query);
        }

        await transaction.commit();
        console.log('Transação de Função concluída com sucesso');
       // await logQuery('insertFuncao', dados, 'Inserção realizada com sucesso.', 'success', usuario);
    } catch (error) {
        await transaction.rollback();
        console.error('Erro na transação de Função, todas as operações foram revertidas:', error.message);
        //await logQuery('insertFuncao', dados, `Erro: ${error.message}`, 'error', usuario);
        throw error;
    }
}

// Função placeholder para inserir Setor
async function insertSetor(dados, usuario) {
    // Implementar lógica similar às funções acima
    // Exemplo de implementação pode ser fornecido se necessário
    try {
        // Lógica de inserção
        //await logQuery('insertSetor', dados, 'Inserção realizada com sucesso.', 'success', usuario);
    } catch (error) {
       // await logQuery('insertSetor', dados, `Erro: ${error.message}`, 'error', usuario);
        throw error;
    }
}

// Função placeholder para inserir Produto
async function insertProduto(dados, usuario) {
    // Implementar lógica similar às funções acima
    try {
        // Lógica de inserção
       // await logQuery('insertProduto', dados, 'Inserção realizada com sucesso.', 'success', usuario);
    } catch (error) {
       // await logQuery('insertProduto', dados, `Erro: ${error.message}`, 'error', usuario);
        throw error;
    }
}

// Função placeholder para inserir Itens do Setor
async function insertItensDoSetor(dados, usuario) {
    // Implementar lógica similar às funções acima
    try {
        // Lógica de inserção
       // await logQuery('insertItensDoSetor', dados, 'Inserção realizada com sucesso.', 'success', usuario);
    } catch (error) {
       // await logQuery('insertItensDoSetor', dados, `Erro: ${error.message}`, 'error', usuario);
        throw error;
    }
}

// Função placeholder para inserir Planta
async function insertPlanta(dados, usuario) {
    // Implementar lógica similar às funções acima
    try {
        // Lógica de inserção
      //  await logQuery('insertPlanta', dados, 'Inserção realizada com sucesso.', 'success', usuario);
    } catch (error) {
      //  await logQuery('insertPlanta', dados, `Erro: ${error.message}`, 'error', usuario);
        throw error;
    }
}

// Função para inserir Funcionários
async function insertFuncionario(dados, usuario) {
    const transaction = new sql.Transaction();

    try {
        await transaction.begin();

        const request = new sql.Request(transaction);
        const query = `
            INSERT INTO Funcionario (
                Nome, Matricula, DataDeAdmissao, CPF, RG, CTPS, Email, ID_CentroCusto, id_planta, id_setor, id_funcao, Status,
                HoraInicial, HoraFinal, Segunda, Terca, Quarta, Quinta, Sexta, Sabado, Domingo
            ) VALUES (
                @Nome, @Matricula, @DataDeAdmissao, @CPF, @RG, @CTPS, @Email, @ID_CentroCusto, @id_planta, @id_setor, @id_funcao, @Status,
                @HoraInicial, @HoraFinal, @Segunda, @Terca, @Quarta, @Quinta, @Sexta, @Sabado, @Domingo
            )
        `;

        for (const d of dados) {
            try {
                const diasBooleanos = {
                    Segunda: validarBooleano(d.segunda),
                    Terca: validarBooleano(d.terca),
                    Quarta: validarBooleano(d.quarta),
                    Quinta: validarBooleano(d.quinta),
                    Sexta: validarBooleano(d.sexta),
                    Sabado: validarBooleano(d.sabado),
                    Domingo: validarBooleano(d.domingo),
                };

                // Validação de IDs ou nomes
                const centroDeCustoId = await obterIdOuFalhar('Centro_Custos', 'ID_CentroCusto', 'Nome', d.centroDeCusto);
                const plantaId = await obterIdOuFalhar('Plantas', 'id_planta', 'Nome', d.planta);
                const setorId = await obterIdOuFalhar('Setores', 'id_setor', 'Nome', d.setor);
                const funcaoId = await obterIdOuFalhar('Funcao', 'id_funcao', 'Nome', d.funcao);

                if (!centroDeCustoId || !plantaId || !setorId || !funcaoId) {
                    throw new Error('Validação falhou para Centro de Custo, Planta, Setor ou Função');
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
                    .query(query);
            } catch (itemError) {
                console.error(`Erro ao processar o funcionário ${d.Nome}: ${itemError.message}`);
               // await logQuery('insertFuncionario', d, `Erro: ${itemError.message}`, 'error', usuario);
                // Decida se deseja continuar ou interromper a transação em caso de erro
                // Aqui, escolhi interromper a transação para garantir a integridade dos dados
                throw itemError;
            }
        }

        await transaction.commit();
        console.log('Transação de Funcionários concluída com sucesso');
        //await logQuery('insertFuncionario', dados, 'Inserção realizada com sucesso.', 'success', usuario);
    } catch (error) {
        await transaction.rollback();
        console.error('Erro na transação de Funcionários, todas as operações foram revertidas:', error.message);
       // await logQuery('insertFuncionario', dados, `Erro: ${error.message}`, 'error', usuario);
        throw error;
    }
}

// Função para obter o ID a partir de um nome ou lançar erro se não encontrado
async function obterIdOuFalhar(tabela, campoId, campoNome, valor) {
    const request = new sql.Request();

    let query, result;
    if (isNaN(valor)) { // Se não é número, presume-se que é nome
        query = `SELECT ${campoId} AS id FROM ${tabela} WHERE ${campoNome} = @valor`;
        result = await request
            .input('valor', sql.VarChar, valor)
            .query(query);
    } else { // Caso contrário, usa o próprio ID
        query = `SELECT ${campoId} AS id FROM ${tabela} WHERE ${campoId} = @valor`;
        result = await request
            .input('valor', sql.Int, parseInt(valor))
            .query(query);
    }

    if (result.recordset.length > 0) {
        return result.recordset[0].id;
    } else {
        throw new Error(`Valor '${valor}' não encontrado em '${tabela}'`);
    }
}

// Função para validar "Sim"/"Não" para booleanos
function validarBooleano(valor) {
    if (typeof valor === 'boolean') {
        return valor;
    } else if (typeof valor === 'string') {
        const valorNormalizado = valor.trim().toLowerCase();
        if (valorNormalizado === "sim") {
            return true;
        } else if (valorNormalizado === "não" || valorNormalizado === "nao") {
            return false;
        }
    }
    throw new Error(`Valor inválido para campo booleano: ${valor}`);
}

module.exports = {
    importacao
};
