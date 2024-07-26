const sql = require('mssql');
const { format } = require('date-fns');

async function relatorio(request, response) {
    try {
        const { id_dm = '', id_setor = '', id_planta = '', id_funcionario = '', data_inicial, data_final, id_cliente } = request.body;

        if (!id_cliente) {
            return response.status(401).json("ID do cliente não enviado");
        }

        let query = `
            SELECT  
                r.ID_Retirada,
                r.ID_DM_Retirada,
                r.ID_DM,
                r.ID_Cliente,
                r.ID_Funcionario,
                r.Forma_Autenticacao,
                r.Autenticacao,
                r.Dia,
                r.Deleted,
                r.Sincronizado,
                ri.ID_Retirada_Item,
                ri.Transacao,
                ri.Porta,
                ri.DIP,
                ri.Andar,
                ri.Posicao,
                ri.Mola,
                ri.ProdutoID,
                ri.ProdutoNome,
                ri.ProdutoSKU,
                ri.Quantidade,
                ri.Retorno,
                f.matricula,
                f.nome,
                f.email
            FROM
                Retiradas r
            INNER JOIN
                retirada_itens ri ON r.ID_DM_Retirada = ri.id_retirada
            LEFT JOIN
                funcionarios f ON r.ID_Funcionario = f.id_funcionario
            WHERE
                r.ID_Cliente = @id_cliente
        `;

        let params = { id_cliente };

        if (id_dm) {
            query += ' AND r.ID_DM = @id_dm';
            params.id_dm = id_dm;
        }
        // if (id_setor) {
        //     query += ' AND r.ID_Setor = @id_setor';
        //     params.id_setor = id_setor;
        // }
        // if (id_planta) {
        //     query += ' AND r.ID_Planta = @id_planta';
        //     params.id_planta = id_planta;
        // }
        if (id_funcionario) {
            query += ' AND r.ID_Funcionario = @id_funcionario';
            params.id_funcionario = id_funcionario;
        }
        if (data_inicial && data_final) {
            query += ' AND r.Dia BETWEEN @data_inicial AND @data_final';
            params.data_inicial = data_inicial;
            params.data_final = data_final;
        }

        request = new sql.Request();
        request.input('id_cliente', sql.Int, params.id_cliente);
        if (params.id_dm) request.input('id_dm', sql.VarChar, id_dm.toString());
        // if (params.id_setor) request.input('id_setor', sql.VarChar, params.id_setor);
        // if (params.id_planta) request.input('id_planta', sql.VarChar, params.id_planta);
        if (params.id_funcionario) request.input('id_funcionario', sql.VarChar, params.id_funcionario);
        if (params.data_inicial) request.input('data_inicial', sql.DateTime, params.data_inicial);
        if (params.data_final) request.input('data_final', sql.DateTime, params.data_final);

        const result = await request.query(query);
        console.log(result);
        const retiradasfiltradas = result.recordset.map(row => ({
            ID_Retirada: row.ID_Retirada,
            ID_DM_Retirada: row.ID_DM_Retirada,
            ID_DM: row.ID_DM,
            ID_Cliente: row.ID_Cliente,
            ID_Funcionario: row.ID_Funcionario,
            Matricula: row.matricula,
            Nome: row.nome,
            Email: row.email,
            Dia:  format(new Date(row.Dia), 'dd/MM/yyyy - HH:mm'),
            ProdutoID: row.ProdutoID,
            ProdutoNome: row.ProdutoNome,
            ProdutoSKU: row.ProdutoSKU,
            Quantidade: row.Quantidade,
        }));

        return response.status(200).json(retiradasfiltradas);

    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}
async function listarDM(request, response) {
    try {
        const { id_cliente } = request.query;

        if (!id_cliente) {
            response.status(401).json("ID do cliente não enviado");
            return;
        }
        const query = 'SELECT DISTINCT id_dm FROM Retiradas WHERE id_cliente = @id_cliente';

        request = new sql.Request();
        request.input('id_cliente', sql.Int, id_cliente);
        const result = await request.query(query);


        response.status(200).json(result.recordset);
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}
module.exports = {
    relatorio,listarDM
};
