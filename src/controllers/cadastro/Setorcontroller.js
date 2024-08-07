const sql = require('mssql');

async function listar(request, response) {
  try {
    const id_cliente = request.body.id_cliente;
    if (id_cliente) {
      const query =
        "SELECT *  FROM Setores WHERE id_cliente = @id_cliente AND Deleted = 0";
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

async function listarItensSetor(request, response) {
    try {
      const id_cliente = request.body.id_cliente;
      if (id_cliente) {
        const query =
          "SELECT *  FROM Setores WHERE id_cliente = @id_cliente AND Deleted = 0";
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
    const { id_cliente, nome, codigo, id_centro_custo } = request.body;

    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado");
      return;
    }
    const query = `INSERT INTO Setores
        ( id_cliente, Codigo, nome, Deleted,id_centro_custo)
        VALUES(@id_cliente, @codigo,@nome,@deleted,@id_centro_custo );
      `;
    request = new sql.Request();
    request.input('ID_Cliente', sql.Int, id_cliente);
    request.input('codigo', sql.NVarChar, codigo);
    request.input('nome', sql.VarChar, nome);
    request.input('id_centro_custo', sql.Int, id_centro_custo);
    request.input('Deleted', sql.Bit, false);
    const result = await request.query(query);
    if (result) {
      response.status(201).send('Setor criado com sucesso!');
      return;
    }
    response.status(400).send('Falha ao criar o Setor');
  } catch (error) {
    console.error('Erro ao adicionar registro:', error.message);
    response.status(500).send('Erro ao adicionar registro');
  }
}
async function atualizar(request, response) {
  try {
    const { id_cliente, id_centro_custo, nome, id_setor, codigo } = request.body;

    if (!id_setor) {
      response.status(400).json("ID do Setor não enviado");
      return;
    }


    const query = `UPDATE Setores
    SET 
    id_cliente=@id_cliente,
    id_centro_custo=@id_centro_custo,
    nome=@nome,
    codigo=@codigo
    WHERE id_setor = @id_setor`;
    request = new sql.Request();
    request.input('ID_Cliente', sql.Int, id_cliente);
    request.input('codigo', sql.NVarChar, codigo);
    request.input('nome', sql.VarChar, nome);
    request.input('id_centro_custo', sql.Int, id_centro_custo);
    request.input('id_setor', sql.Int, id_setor);
    const result = await request.query(query);
    if (result) {
      response.status(200).send('Setor atualizado com sucesso!');
      return;
    }
    response.status(400).send('Falha ao atualizar o  Setor');
  } catch (error) {
    console.error('Erro ao atualizar registro:', error.message);
    response.status(500).send('Erro ao atualizar registro');
  }
}


async function deleteFuncao(request, response) {
  try {
    let query = "UPDATE Setores SET deleted = 1 WHERE 1 = 1";

    if (request.body.id_setor) {
      query += ` AND id_setor = '${request.body.id_setor}'`;
      const result = await new sql.Request().query(query);
      response.status(200).json(result.recordset);
      return;
    }
    response.status(401).json("ID do Setor não foi enviado");
  } catch (error) {
    console.error('Erro ao excluir:', error.message);
    response.status(500).send('Erro ao excluir');
  }
}

module.exports = {
  adicionar, listar, atualizar, deleteFuncao
};
