const sql = require('mssql');
const { logQuery } = require('../../utils/logUtils');


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
    const { id_cliente, codigo, nome, id_usuario } = request.body;

    if (!id_cliente) {
      response.status(401).json("ID do cliente não enviado");
      return;
    }
    const query = `INSERT INTO Centro_Custos
              (ID_Cliente, Codigo, Nome, Deleted)
              VALUES (@ID_Cliente, @codigo, @nome, @deleted);`;

    request = new sql.Request();
    request.input('ID_Cliente', sql.Int, id_cliente);
    request.input('codigo', sql.Int, codigo);
    request.input('nome', sql.VarChar, nome);
    request.input('Deleted', sql.Bit, false);

    const result = await request.query(query);

    if (result) {
      logWithOperation('info', `O usuario ${id_usuario} Criou um Novo Centro de Custo`, 'sucesso', 'Centro de Custo', id_cliente, id_usuario, query);
      response.status(201).send('Centro do Custo criado com sucesso!');
      return;
    }
    response.status(400).send('Falha ao criar o Centro do Custo');
  } catch (error) {
    if (error.message.includes('Query não fornecida para logging')) {
      // Trata especificamente o caso onde a query não foi fornecida
      console.error('Erro crítico: ', error.message);
      response.status(500).send('Erro crítico: Falha na operação');
    } else {
      logWithOperation('error', `O usuario ${id_usuario} Falhou em criar um novo centro de custo: ${error.message}`, 'Falha', 'Centro de Custo', id_cliente, id_usuario);
      console.error('Erro ao adicionar registro:', error.message);
      response.status(500).send('Erro ao adicionar Centro de Custo');
    }
  }
}



async function deleteCentro(request, response) {
  const { id_usuario, id_cliente, ID_CentroCusto } = request.body;
  let query = "UPDATE Centro_Custos SET deleted = 1 WHERE ID_Centro_Custo = @ID_Centro_Custo";
  const params = {
    ID_CentroCusto: ID_CentroCusto
  };
  try {
    if (!ID_CentroCusto) {
      response.status(401).json("ID do centro não foi enviado");
      return;
    }

    const query = "UPDATE Centro_Custos SET deleted = 1 WHERE ID_CentroCusto = @ID_CentroCusto";

    const params = {
      ID_CentroCusto: ID_CentroCusto
    };

    const sqlRequest = new sql.Request();
    sqlRequest.input('ID_CentroCusto', sql.Int, ID_CentroCusto);

    const result = await sqlRequest.query(query);

    if (result.rowsAffected[0] > 0) {
      logQuery('info', `O usuário ${id_usuario} deletou o Centro de Custo ${ID_CentroCusto}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);
      response.status(200).json(result.recordset);
    } else {
      //throw new Error(`Erro ao excluir: ${ID_CentroCusto} não encontrado.`);
      logQuery('error',`Erro ao excluir: ${ID_CentroCusto} não encontrado.`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
      response.status(400).send('Nenhuma alteração foi feita no centro de custo.');
    }
  } catch (error) {
    logQuery('error', `${error.message}`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
    console.error('Erro ao excluir:', error.message);
    response.status(500).send('Erro ao excluir');
  }
}



async function atualizar(request, response) {
  try {
    const { ID_CentroCusto, Nome, Codigo, id_cliente, id_usuario } = request.body;

    if (!ID_CentroCusto) {
      response.status(400).json("ID do centro de custo não enviado");
      return;
    }

    const query = `UPDATE Centro_Custos
                   SET ID_Cliente = @ID_Cliente,
                       Codigo = @Codigo,
                       Nome = @Nome,
                       Deleted = @Deleted
                   WHERE ID_CentroCusto = @ID_CentroCusto`;

    const params = {
      ID_Cliente: id_cliente,
      Codigo: Codigo,
      Nome: Nome,
      Deleted: false,
      ID_CentroCusto: ID_CentroCusto
    };

    const sqlRequest = new sql.Request();
    sqlRequest.input('ID_Cliente', sql.Int, id_cliente);
    sqlRequest.input('Codigo', sql.Int, Codigo);
    sqlRequest.input('Nome', sql.VarChar, Nome);
    sqlRequest.input('Deleted', sql.Bit, false);
    sqlRequest.input('ID_CentroCusto', sql.Int, ID_CentroCusto);

    const result = await sqlRequest.query(query);

    if (result.rowsAffected[0] > 0) {
      logQuery('info', `O usuário ${id_usuario} atualizou o Centro de Custo ${ID_CentroCusto}`, 'sucesso', 'UPDATE', id_cliente, id_usuario, query, params);
      response.status(200).send('Centro de custo atualizado com sucesso!');
    } else {
      logQuery('error', `O usuário ${id_usuario} tentou atualizar o Centro de Custo ${ID_CentroCusto}, mas nenhuma linha foi alterada`, 'nenhuma alteração', 'Atualizar', id_cliente, id_usuario, query, params);
      response.status(400).send('Nenhuma alteração foi feita no centro de custo.');
    }
  } catch (error) {
    logQuery('error', ` ${error.message}`, 'erro técnico', 'Atualizar', id_cliente, id_usuario, query, params);
    console.error('Erro ao atualizar centro de custo:', error.message);
    response.status(500).send('Erro ao atualizar centro de custo');
  }
}

module.exports = {
  adicionar, listar, deleteCentro, atualizar
};
