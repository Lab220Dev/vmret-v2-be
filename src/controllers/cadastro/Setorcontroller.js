const { logQuery } = require('../../utils/logUtils');
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
  const { id_cliente, nome, codigo, id_centro_custo, id_usuario } = request.body;
  const query = `INSERT INTO Setores
        ( id_cliente, Codigo, nome, Deleted,id_centro_custo)
        VALUES(@id_cliente, @codigo,@nome,@deleted,@id_centro_custo );
      `;
  const params = {
    id_cliente: id_cliente,
    codigo: codigo,
    nome: nome,
    id_centro_custo: id_centro_custo,
    Deleted: false
  };
  try {
    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado");
      return;
    }

    request = new sql.Request();
    request.input('ID_Cliente', sql.Int, id_cliente);
    request.input('codigo', sql.NVarChar, codigo);
    request.input('nome', sql.VarChar, nome);
    request.input('id_centro_custo', sql.Int, id_centro_custo);
    request.input('Deleted', sql.Bit, false);
    const result = await request.query(query);
    if (result.rowsAffected[0] > 0) {
      logQuery('info', `O usuário ${id_usuario} deletou o Centro de Custo ${ID_CentroCusto}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);

      response.status(201).send('Setor criado com sucesso!');
      return;
    } else {
      logQuery('info', `O usuário ${id_usuario} deletou o Centro de Custo ${ID_CentroCusto}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);

      response.status(400).send('Falha ao criar o Setor');
    }
  } catch (error) {
    console.error('Erro ao adicionar registro:', error.message);
    response.status(500).send('Erro ao adicionar registro');
  }
}
async function atualizar(request, response) {
  const { id_cliente, id_centro_custo, nome, id_setor, codigo, id_usuario } = request.body;
  const query = `UPDATE Setores
  SET 
  id_cliente=@id_cliente,
  id_centro_custo=@id_centro_custo,
  nome=@nome,
  codigo=@codigo
  WHERE id_setor = @id_setor`;
  const params = {
    id_cliente: id_cliente,
    id_centro_custo: id_centro_custo,
    nome: nome,
    codigo: codigo,
    id_setor: id_setor
  };
  try {
    if (!id_setor) {
      response.status(400).json("ID do Setor não enviado");
      return;
    }

    request = new sql.Request();
    request.input('ID_Cliente', sql.Int, id_cliente);
    request.input('codigo', sql.NVarChar, codigo);
    request.input('nome', sql.VarChar, nome);
    request.input('id_centro_custo', sql.Int, id_centro_custo);
    request.input('id_setor', sql.Int, id_setor);
    const result = await request.query(query);
    if (result.rowsAffected[0] > 0) {
      logQuery('info', `Usuário ${id_usuario} criou um novo Centro de Custo`, 'sucesso', 'INSERT', id_cliente, id_usuario, query, params);
      response.status(200).send('Setor atualizado com sucesso!');
      return;
    } else {
      logQuery('error', `Usuário ${id_usuario} falhou ao criar Centro de Custo`, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
      response.status(400).send('Falha ao atualizar o  Setor');
    }
  } catch (error) {
    const errorMessage = error.message.includes('Query não fornecida para logging')
      ? 'Erro crítico: Falha na operação'
      : `Erro ao adicionar Centro de Custo: ${error.message}`;
    logQuery('error', errorMessage, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
    console.error('Erro ao atualizar registro:', error.message);
    response.status(500).send('Erro ao atualizar registro');
  }
}

async function deleteFuncao(request, response) {
  let query = "UPDATE Setores SET deleted = 1 WHERE id_setor = @id_setor";
  const id_setor = request.body.id_setor;
  const id_cliente = request.body.id_cliente;
  const id_usuario = request.body.id_usuario;
  const params = {
    id_setor: id_setor
  };
  try {
    if (id_setor) {
      const sqlRequest = new sql.Request();
      sqlRequest.input('id_setor', sql.Int, id_setor);
      const result = await sqlRequest.query(query);
      if (result.rowsAffected[0] > 0) {
        logQuery('info', `O usuário ${id_usuario} deletou o Centro de Custo ${id_setor}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);
        response.status(200).json(result.recordset);
      } else {
         logQuery('error', `Erro ao excluir: ${id_setor} não encontrado.`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
        response.status(400).send('Nenhuma alteração foi feita no centro de custo.');
      }
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
