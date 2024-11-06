const sql = require('mssql');
const { logQuery } = require('../../utils/logUtils');
async function listar(request, response) {
  try {
    const id_cliente = request.body.id_cliente;
    if (id_cliente) {
      const query =
        "SELECT *  FROM Funcao WHERE id_cliente = @id_cliente AND Deleted = 0";
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
async function listarSimples(request, response) {
  try {
    const id_cliente = request.body.id_cliente;
    if (id_cliente) {
      const query =
        "SELECT id_funcao,nome  FROM Funcao WHERE id_cliente = @id_cliente AND Deleted = 0";
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

  const query = `
    INSERT INTO Funcao
    (id_cliente, Codigo, nome, Deleted, id_centro_custo)
    VALUES (@id_cliente, @codigo, @nome, @deleted, @id_centro_custo);
  `;

  const params = {
    ID_Cliente: id_cliente,
    codigo: codigo,
    nome: nome,
    id_centro_custo: id_centro_custo,
    Deleted: false,
  };

  try {
    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado");
      return;
    }

    const sqlRequest = new sql.Request();
    sqlRequest.input('ID_Cliente', sql.Int, id_cliente);
    sqlRequest.input('codigo', sql.Int, codigo);
    sqlRequest.input('nome', sql.VarChar, nome);
    sqlRequest.input('id_centro_custo', sql.Int, id_centro_custo);
    sqlRequest.input('Deleted', sql.Bit, false);

    const result = await sqlRequest.query(query);

    if (result.rowsAffected[0] > 0) {
      //logQuery('info', `Usuário ${id_usuario} criou um novo Centro de Custo`, 'sucesso', 'INSERT', id_cliente, id_usuario, query, params);
      response.status(201).send('Centro do Custo criado com sucesso!');
    }else{
      //logQuery('error',  `Usuário ${id_usuario} falhou ao criar Centro de Custo`, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
      response.status(400).send('Falha ao criar o Centro do Custo');
    }
  } catch (error) {
     const errorMessage = error.message.includes('Query não fornecida para logging') 
      ? 'Erro crítico: Falha na operação'
      : `Erro ao adicionar Centro de Custo: ${error.message}`;
    //logQuery('error',  errorMessage, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
    console.error('Erro ao adicionar registro:', error.message);
    response.status(500).send('Erro ao adicionar registro');
  }
}


async function atualizar(request, response) {
  const { id_cliente, id_centro_custo, nome, id_funcao, codigo, id_usuario } = request.body;
  
  const query = `UPDATE Funcao
  SET 
  id_cliente = @id_cliente,
  id_centro_custo = @id_centro_custo,
  nome = @nome,
  codigo = @codigo
  WHERE id_funcao = @id_funcao`;

  const params = {
    id_cliente: id_cliente,
    id_centro_custo: id_centro_custo,
    nome: nome,
    codigo: codigo,
    id_funcao: id_funcao
  };

  try {
    if (!id_funcao) {
      response.status(400).json("ID da Função não enviado");
      return;
    }

    const sqlRequest = new sql.Request();
    sqlRequest.input('id_cliente', sql.Int, id_cliente);
    sqlRequest.input('id_centro_custo', sql.Int, id_centro_custo);
    sqlRequest.input('nome', sql.VarChar, nome);
    sqlRequest.input('codigo', sql.Int, codigo);
    sqlRequest.input('id_funcao', sql.Int, id_funcao);

    const result = await sqlRequest.query(query);

    if (result.rowsAffected[0] > 0) {
     // logQuery('info', `O usuário ${id_usuario} atualizou o Centro de Custo ${ID_CentroCusto}`, 'sucesso', 'UPDATE', id_cliente, id_usuario, query, params);
      response.status(200).send(' centro de custo atualizado com sucesso!');
      return;
    }else{
      //ogQuery('error', `Usuário ${id_usuario} tentou atualizar o Centro ${ID_CentroCusto}, mas sem sucesso.`, 'Falha', 'UPDATE', id_cliente, id_usuario, query, params);
      response.status(400).send('Falha ao atualizar o  centro de custo');
    }
  } catch (error) {
    //logQuery('error', `${error.message}`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
    console.error('Erro ao atualizar registro:', error.message);
    response.status(500).send('Erro ao atualizar registro');
  }
}


async function deleteFuncao(request, response) {
  const { id_funcao, id_cliente, id_usuario } = request.body;
  let query = "UPDATE Funcao SET deleted = 1 WHERE 1 = 1";
  const params = { id_funcao: id_funcao };

  try {
    // Verifica se o ID da função foi enviado
    if (!id_funcao) {
      return response.status(401).json("ID da função não foi enviado");
    }

    // Adiciona a condição ao query
    query += ` AND id_funcao = @id_funcao`;

    const sqlRequest = new sql.Request();
    sqlRequest.input('id_funcao', sql.Int, id_funcao);

    const result = await sqlRequest.query(query);

    if (result.rowsAffected[0] > 0) {
      logQuery('info', `O usuário ${id_usuario} deletou a função ${id_funcao}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);
      response.status(200).json({ message: "Função deletada com sucesso!" });
    } else {
      logQuery('error', `Erro ao excluir: Função ${id_funcao} não encontrada ou não deletada`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
      response.status(400).send('Nenhuma alteração foi feita na função.');
    }
  } catch (error) {
    logQuery('error', `Erro ao excluir função: ${error.message}`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
    console.error('Erro ao excluir:', error.message);
    response.status(500).send('Erro ao excluir');
  }
}


module.exports = {
  adicionar, listar, atualizar, deleteFuncao, listarSimples
};
