const sql = require('mssql');

const mockData = [{ "id_centro_custo": 1, "nome": "265936583-0"},
{ "id_centro_custo": 2, "nome": "754835000-7" },
{ "id_centro_custo": 3, "nome": "753803720-9"},
{ "id_centro_custo": 4, "nome": "053642656-2" },
{ "id_centro_custo": 5, "nome": "761168639-9" },
{ "id_centro_custo": 6, "nome": "905085121-5"},
{ "id_centro_custo": 7, "nome": "287833697-6" },
{ "id_centro_custo": 8, "nome": "921291642-2" },
{ "id_centro_custo": 9, "nome": "269737784-0"},
{ "id_centro_custo": 10, "nome": "251320665-7"}];

async function listar(request, response) {
    try {
        if (request.body.id_cliente) {
            let result = mockData
            response.status(200).json(result);
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
        const { codigo, nome } = request.body;

        if (!codigo || !nome) {
            response.status(400).json("Dados insuficientes");
            return;
        }
        const lastId = mockData.length > 0 ? mockData[mockData.length - 1].id_centro_custo : 0;
        const newId = lastId + 1;
        mockData.push({  id_centro_custo: newId,codigo, nome });

        response.status(201).json("Registro adicionado com sucesso");
    } catch (error) {
        console.error('Erro ao adicionar registro:', error.message);
        response.status(500).send('Erro ao adicionar registro');
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
      const { id_centro_custo, nome } = request.body;

      if (!id_centro_custo) {
        response.status(400).json("ID do centro de custo não enviado");
        return;
      }
      const index = mockData.findIndex(item => item.id_centro_custo === id_centro_custo);
  
      if (index !== -1) {
        // Atualizar o registro
        mockData[index].nome = nome;
        mockData[index].id_centro_custo = id_centro_custo;
        response.status(200).json("Registro atualizado com sucesso");
      } else {
        response.status(404).json("Registro não encontrado");
      }
    } catch (error) {
      console.error('Erro ao atualizar registro:', error.message);
      response.status(500).send('Erro ao atualizar registro');
    }
  }
module.exports = {
    adicionar, listar, deleteCentro, atualizar
};
