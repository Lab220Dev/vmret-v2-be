const sql = require('mssql');


async function listar(request, response) {
    try {
      const id_cliente = request.body.id_cliente;
        if (id_cliente) {
          const query =
          "SELECT *  FROM Centro_Custos WHERE id_cliente = @id_cliente AND Deleted = 0";
          request = new sql.Request();
          request.input("id_cliente", sql.Int, id_cliente);
          const result = await request.query(query);
          response.status(200).json(result.recordset);
            return;
        }
        response.status(401).json("ID do cliente não enviado");
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

async function adicionar(request, response) {
    try {
        const {id_cliente,codigo, nome } = request.body;

        if (!id_cliente) {
          response.status(401).json("ID do cliente não enviado");
          return;
        }
        const query =`INSERT INTO Centro_Custos
          ( ID_Cliente, Codigo, Nome, Deleted)
          VALUES(@ID_Cliente, @codigo,@nome,@deleted);
        `;
        request = new sql.Request();
        request.input('ID_Cliente', sql.Int, id_cliente);
        request.input('codigo', sql.Int, codigo);
        request.input('nome', sql.VarChar,nome);
        request.input('Deleted', sql.Bit, false);
        const result = await request.query(query);
        if (result) {
            response.status(201).send('Centro do Custo criado com sucesso!');
            return;
        }
        response.status(400).send('Falha ao criar o Centro do Custo');
    } catch (error) {
        console.error('Erro ao adicionar registro:', error.message);
        response.status(500).send('Erro ao adicionar Centro de Custo');
    }
}

async function deleteCentro(request, response) {
  try {
      let query = "UPDATE Centro_Custos SET deleted = 1 WHERE 1 = 1";

      if (request.body.ID_CentroCusto) {
          query += ` AND ID_CentroCusto = '${request.body.ID_CentroCusto}'`;
          const result = await new sql.Request().query(query);
          response.status(200).json(result.recordset);
          return;
      }
      response.status(401).json("ID do centro não foi enviado");
  } catch (error) {
      console.error('Erro ao excluir:', error.message);
      response.status(500).send('Erro ao excluir');
  }
}

async function atualizar(request, response) {
    try {
      const { id_centro_custo, nome, Codigo } = request.body;

      if (!id_centro_custo) {
        response.status(400).json("ID do centro de custo não enviado");
        return;
      }
      const query =`UPDATE Centro_Custos
          SET ID_Cliente=@ID_Cliente, Codigo=@Codigo, Nome=@Nome, Deleted=@Deleted)
          WHERE ID_CentroCusto = @ID_CentroCusto`;
        request = new sql.Request();
        request.input('ID_Cliente', sql.VarChar, id_cliente);
        request.input('codigo', sql.Int, Codigo);
        request.input('nome', VarChar.Bit,nome);
        request.input('Deleted', sql.Bit, false);
        const result = await request.query(query);
        if (result) {
            response.status(200).send(' centro de custo atualizado com sucesso!');
            return;
        }
        response.status(400).send('Falha ao atualizar o  centro de custo');
    } catch (error) {
      console.error('Erro ao atualizar  centro de custo:', error.message);
      response.status(500).send('Erro ao atualizar  centro de custo');
    }
  }
module.exports = {
    adicionar, listar, deleteCentro, atualizar
};
