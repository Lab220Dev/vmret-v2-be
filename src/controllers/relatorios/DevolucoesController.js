const sql = require('mssql');
const { format } = require('date-fns');
const { logWithOperation } = require('../../middleware/Logger');

async function relatorio(request, response) {
    try {
        const { id_dm = '', id_funcionario = '', data_inicio, data_final, id_cliente,id_usuario } = request.body;

        if (!id_cliente) {
            return response.status(401).json("ID do cliente não enviado");
        }

        let query = `
            SELECT  
                dvi.*,
                f.nome,
                f.matricula,
                f.email
            FROM
                DM_Devolucao_Itens dvi
            LEFT JOIN
                funcionarios f ON dvi.id_funcionario = f.id_funcionario
            WHERE
                dvi.ID_Cliente = @id_cliente AND dvi.Sincronizado = 1
                
        `;

        let params = { id_cliente };

        if (id_dm) {
            query += ' AND ID_DM = @id_dm';
            params.id_dm = id_dm;
        }
        if (id_funcionario) {
            query += ' AND dvi.id_funcionario = @id_funcionario';
            params.id_funcionario = id_funcionario;
        }

        if (data_inicio && data_final) {
            query += ' AND dvi.Dia BETWEEN @data_inicio AND @data_final';
            params.data_inicio = new Date(data_inicio).toISOString();
            params.data_final = new Date(data_final).toISOString();

        } else if (data_inicio) {
            query += ' AND dvi.Dia >= @data_inicio';
            params.data_inicio = new Date(data_inicio).toISOString();
        } else if (data_final) {
            query += ' AND dvi.Dia <= @data_final';
            params.data_final = new Date(data_final).toISOString();
        }

        request = new sql.Request();
        request.input('id_cliente', sql.Int, id_cliente);
        if (params.id_dm) request.input('id_dm', sql.Int, id_dm);
        if (params.id_funcionario) request.input('id_funcionario', sql.Int, id_funcionario);
        if (params.data_inicio) request.input('data_inicio', sql.DateTime, params.data_inicio);
        if (params.data_final) request.input('data_final', sql.DateTime, params.data_final);
        const result = await request.query(query);
        const devolucaofiltradas = result.recordset.map(row => ({
            ID_Devolucao_Item: row.ID_Devolucao_Item,
            ID_DM: row.ID_DM,
            ID_Cliente: row.ID_Cliente,
            id_funcionario: row.id_funcionario,
            Porta: row.Porta,
            nome: row.nome,
            matricula: row.matricula,
            email: row.email,
            Dip: row.Dip,
            Dia: format(new Date(row.Dia), 'dd/MM/yyyy - HH:mm'),
            Andar: row.Andar,
            Posicao: row.Posicao,
            Mola: row.Mola,
            ProdutoID: row.ProdutoID,
            ProdutoNome: row.ProdutoNome,
            ProdutoSKU: row.ProdutoSKU,
            Quantidade: row.Quantidade,
            Retorno: row.Retorno
        }));
        return response.status(200).json(devolucaofiltradas);

    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}
module.exports = {
    relatorio
};
