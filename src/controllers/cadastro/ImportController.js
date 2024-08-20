const sql = require("mssql");
const { format } = require("date-fns");
const { logQuery } = require('../../utils/logUtils')

async function importacao(request, response) {
    const { tipo, dados } = req.body;

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
                return res.status(400).json({ message: 'Tipo de importação não suportado.' });
        }

        res.status(200).json({ message: 'Importação realizada com sucesso.' });
    } catch (error) {
        await logQuery(tipo, dados, error.message); // Log do erro
        res.status(500).json({ message: 'Erro na importação.', error: error.message });
    }
}

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

async function insertFuncao(dados) {
    try {
        const pool = await mssql.connect(dbConfig);
        const query = `INSERT INTO Funcao (Codigo, Nome) VALUES (@Codigo, @Nome)`;

        await pool.request()
            .input('Codigo', mssql.VarChar, dados.codigo)
            .input('Nome', mssql.VarChar, dados.nome)
            .query(query);

        pool.close();
    } catch (error) {
        throw error;
    }
}
module.exports = {
    importacao
  };