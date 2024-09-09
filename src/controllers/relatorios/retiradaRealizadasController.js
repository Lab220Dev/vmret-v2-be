const sql = require('mssql');
const { format } = require('date-fns');
const { logWithOperation } = require('../../middleware/Logger');

async function relatorio(request, response) {
    try {
        const { id_dm = '', id_setor = '', id_planta = '', id_funcionario = '', data_inicio, data_final, id_cliente,id_usuario } = request.body;

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
                r.ID_Cliente = @id_cliente AND r.Sincronizado = 1
        `;

        let params = { id_cliente };

        if (id_dm) {
            query += ' AND r.ID_DM = @id_dm';
            params.id_dm = id_dm;
        }
        if (id_setor) {
            query += ' AND r.ID_Setor = @id_setor';
            params.id_setor = id_setor;
        }
        if (id_planta) {
            query += ' AND r.ID_Planta = @id_planta';
            params.id_planta = id_planta;
        }
        if (id_funcionario) {
            query += ' AND r.ID_Funcionario = @id_funcionario';
            params.id_funcionario = id_funcionario;
        }

        if (data_inicio && data_final) {
            query += ' AND r.Dia BETWEEN @data_inicio AND @data_final';
            params.data_inicio = new Date(data_inicio).toISOString();
            params.data_final = new Date(data_final).toISOString();

        } else if (data_inicio) {
            query += ' AND r.Dia >= @data_inicio';
            params.data_inicio = new Date(data_inicio).toISOString();
        } else if (data_final) {
            query += ' AND r.Dia <= @data_final';
            params.data_final = new Date(data_final).toISOString();
        }

        request = new sql.Request();
        request.input('id_cliente', sql.Int, params.id_cliente);
        if (params.id_dm) request.input('id_dm', sql.Int, id_dm.toString());
        if (params.id_setor) request.input('id_setor', sql.Int, params.id_setor);
        if (params.id_planta) request.input('id_planta', sql.Int, params.id_planta);
        if (params.id_funcionario) request.input('id_funcionario', sql.Int, params.id_funcionario);
        if (params.data_inicio) request.input('data_inicio', sql.DateTime, params.data_inicio);
        if (params.data_final) request.input('data_final', sql.DateTime, params.data_final);
        const result = await request.query(query);
        const retiradasfiltradas = result.recordset.map(row => ({
            ID_Retirada: row.ID_Retirada,
            ID_DM_Retirada: row.ID_DM_Retirada,
            ID_DM: row.ID_DM,
            ID_Cliente: row.ID_Cliente,
            ID_Funcionario: row.ID_Funcionario,
            Matricula: row.matricula,
            Nome: row.nome,
            Email: row.email,
            Dia: format(new Date(row.Dia), 'dd/MM/yyyy - HH:mm'),
            ProdutoID: row.ProdutoID,
            ProdutoNome: row.ProdutoNome,
            ProdutoSKU: row.ProdutoSKU,
            Quantidade: row.Quantidade,
        }));
       // logWithOperation('info', `O usuario ${id_usuario} Gerou um relatorio`, `sucesso`, 'Relatorio Retirada Realizada', id_cliente, id_usuario);
        return response.status(200).json(retiradasfiltradas);

    } catch (error) {
       // logWithOperation('error', `O usuario ${id_usuario} Falhou em gerar um relatorio: ${err.message}`, 'Falha', 'Relatorio Retirada Realizada', id_cliente, id_usuario);
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}
async function listarDM(request, response) {
    try {
      const id_cliente = request.body.id_cliente;
  
      if (!id_cliente) {
        response.status(401).json("ID do cliente não enviado");
        return;
      }
      const query =
        "SELECT  *  FROM DMS WHERE ID_Cliente = @id_cliente AND Deleted = 0";
  
      request = new sql.Request();
      request.input("id_cliente", sql.Int, id_cliente);
      const result = await request.query(query);
      const retiradasfiltradas = result.recordset.map(row => ({
        ID_DM: row.ID_DM,
        ID_Cliente: row.IDcliente,
        Identificacao: row.Identificacao,
        Numero: row.Numero
    }));
      response.status(200).json(retiradasfiltradas);
    } catch (error) {
      console.error("Erro ao executar consulta:", error.message);
      response.status(500).send("Erro ao executar consulta");
    }
  }
module.exports = {
    relatorio, listarDM
};
