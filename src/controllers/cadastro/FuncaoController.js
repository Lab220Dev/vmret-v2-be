const sql = require('mssql');

const mockfuncao = [{ "id_centro_custo": 1, "nome": "265936583-0", "id_funcao": 10 },
  { "id_centro_custo": 2, "nome": "754835000-7", "id_funcao": 9 },
  { "id_centro_custo": 3, "nome": "753803720-9", "id_funcao": 8 },
  { "id_centro_custo": 4, "nome": "053642656-2", "id_funcao": 7 },
  { "id_centro_custo": 5, "nome": "761168639-9", "id_funcao": 6 },
  { "id_centro_custo": 6, "nome": "905085121-5", "id_funcao": 5 },
  { "id_centro_custo": 7, "nome": "287833697-6", "id_funcao": 4 },
  { "id_centro_custo": 8, "nome": "921291642-2", "id_funcao": 3 },
  { "id_centro_custo": 9, "nome": "269737784-0", "id_funcao": 2 },
  { "id_centro_custo": 10, "nome": "251320665-7", "id_funcao": 1 }];

async function listar(request, response) {
    try {
        if (request.body.id_cliente) {
            let result = mockfuncao
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
        const { id_centro_custo, nome } = request.body;

        if (!id_centro_custo || !nome) {
            response.status(400).json("Dados insuficientes");
            return;
        }
        const lastId = mockfuncao.length > 0 ? mockfuncao[mockfuncao.length - 1].id_funcao : 0;
        const newId = lastId + 1;
        mockData.push({  id_funcao: newId,id_centro_custo, nome });

        response.status(201).json("Registro adicionado com sucesso");
    } catch (error) {
        console.error('Erro ao adicionar registro:', error.message);
        response.status(500).send('Erro ao adicionar registro');
    }
}
async function atualizar(request, response) {
    try {
      const { id_centro_custo, nome,id_funcao } = request.body;

      if (!id_funcao) {
        response.status(400).json("ID do centro de custo não enviado");
        return;
      }
  

      const index = mockfuncao.findIndex(item => item.id_funcao === id_funcao);
  
      if (index !== -1) {
        // Atualizar o registro
        mockfuncao[index].nome = nome;
        mockfuncao[index].id_funcao = id_funcao;
        mockfuncao[index].id_centro_custo = id_centro_custo;
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
    adicionar, listar,atualizar
};
