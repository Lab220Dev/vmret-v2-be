const sql = require("mssql");
const { logQuery } = require('../../utils/logUtils');

// Função principal de importação
async function importacao(request, response) {
    const { tipo, dados } = request.body;

    try {
        switch (tipo) {
            case 'centro de custo':
                await insertCentroDeCusto(dados);
                break;
            case 'funcao':
                await insertFuncao(dados);
                break;
            case 'setor':
                await insertSetor(dados);
                break;
            case 'produto':
                await insertProduto(dados);
                break;
            case 'itens do setor':
                await insertItensDoSetor(dados);
                break;
            case 'planta':
                await insertPlanta(dados);
                break;
            case 'funcionario':
                await insertFuncionario(dados);
                break;
            default:
                return response.status(400).json({ message: 'Tipo de importação não suportado.' });
        }

        response.status(200).json({ message: 'Importação realizada com sucesso.' });
    } catch (error) {
        await logQuery(tipo, dados, error.message); // Log do erro
        response.status(500).json({ message: 'Erro na importação.', error: error.message });
    }
}

// Função para inserir Centro de Custo
async function insertCentroDeCusto(dados) {
    const transaction = new sql.Transaction(); 

    try {
        await transaction.begin(); 

        const request = new sql.Request(transaction); 

        const values = dados.map(d => `('${d.codigo}', '${d.nome}')`).join(',');
        const query = `INSERT INTO CentroDeCusto (Codigo, Nome) VALUES ${values}`;

        await request.query(query); 

        await transaction.commit();
        console.log('Transação concluída com sucesso');
    } catch (error) {
        await transaction.rollback(); 
        console.error('Erro na transação, todas as operações foram revertidas:', error.message);
        throw error; 
    }
}

// Função para inserir Função
async function insertFuncao(dados) {
    const transaction = new sql.Transaction();

    try {
        await transaction.begin();

        const request = new sql.Request(transaction);
        const query = `INSERT INTO Funcao (Codigo, Nome) VALUES (@Codigo, @Nome)`;

        for (const d of dados) {  // Iterar sobre cada item de dados
            await request
                .input('Codigo', sql.VarChar, d.codigo)
                .input('Nome', sql.VarChar, d.nome)
                .query(query);
        }

        await transaction.commit();
        console.log('Transação concluída com sucesso');
    } catch (error) {
        await transaction.rollback();
        console.error('Erro na transação, todas as operações foram revertidas:', error.message);
        throw error;
    }
}

// Função para inserir Funcionario
async function importacao(request, response) {
    const { tipo, data } = request.body;

    try {
        switch (tipo) {
            case 'cdc':
                await insertCentroDeCusto(data);
                break;
            case 'funcao':
                await insertFuncao(data);
                break;
            case 'setor':
                await insertSetor(data);
                break;
            case 'produto':
                await insertProduto(data);
                break;
            case 'Itens':
                await insertItensDoSetor(data);
                break;
            case 'planta':
                await insertPlanta(data);
                break;
            case 'funcionarios':
                await insertFuncionario(data);
                break;
            default:
                return response.status(400).json({ message: 'Tipo de importação não suportado.' });
        }

        response.status(200).json({ message: 'Importação realizada com sucesso.' });
    } catch (error) {
       // await logQuery(tipo, data, error.message); // Log do erro
        response.status(500).json({ message: 'Erro na importação.', error: error.message });
    }
}

// Função para inserir Funcionario
async function insertFuncionario(dados) {
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
            // Validação e conversão de "Sim"/"Não" para booleanos
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
                .input('HoraInicial', sql.Time, d.HoraInicial ? new Date(d.HoraInicial) : null)
                .input('HoraFinal', sql.Time, d.HoraFinal ? new Date(d.HoraFinal) : null)
                .input('Segunda', sql.Bit, diasBooleanos.Segunda)
                .input('Terca', sql.Bit, diasBooleanos.Terca)
                .input('Quarta', sql.Bit, diasBooleanos.Quarta)
                .input('Quinta', sql.Bit, diasBooleanos.Quinta)
                .input('Sexta', sql.Bit, diasBooleanos.Sexta)
                .input('Sabado', sql.Bit, diasBooleanos.Sabado)
                .input('Domingo', sql.Bit, diasBooleanos.Domingo)
                .query(query);
        }

        await transaction.commit();
        console.log('Transação concluída com sucesso');
    } catch (error) {
        await transaction.rollback();
        console.error('Erro na transação, todas as operações foram revertidas:', error.message);
        throw error;
    }
}

async function obterIdOuFalhar(tabela, campoId, campoNome, valor) {
    const request = new sql.Request();

    let query, result;
    if (isNaN(valor)) { 
        query = `SELECT ${campoId} AS id FROM ${tabela} WHERE ${campoNome} = @valor`;
        result = await request
            .input('valor', sql.VarChar, valor)
            .query(query);
    } else { 
        query = `SELECT ${campoId} AS id FROM ${tabela} WHERE ${campoId} = @valor`;
        result = await request
            .input('valor', sql.Int, valor)
            .query(query);
    }

    if (result.recordset.length > 0) {
        return result.recordset[0].id;
    } else {
        throw new Error(`Valor '${valor}' não encontrado em '${tabela}'`);
    }
}

function validarBooleano(valor) {
    if (typeof valor === 'boolean') {
        return valor;
    } else if (valor === "Sim") {
        return true;
    } else if (valor === "Não") {
        return false;
    } else {
        throw new Error(`Valor inválido para campo booleano: ${valor}`);
    }
}
module.exports = {
    importacao
};
