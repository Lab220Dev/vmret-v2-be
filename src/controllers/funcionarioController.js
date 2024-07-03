const sql = require('mssql');

async function listarFuncionarios(request, response) {
    try {
        let query = 'SELECT * FROM funcionarios WHERE 1 = 1';

        if (request.body.id_cliente) {
            query += ` AND id_cliente = '${request.body.id_cliente}'`;
            const result = await new sql.Request().query(query);
            response.status(200).json(result.recordset);
            return;
        }
        response.status(401).json("id do cliente não enviado");
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

async function adicionarFuncionarios(request, response) {
    try {
        const { id_cliente, id_setor, id_funcao,
            nome, matricula, biometria,
            RG, CPF, CTPS, id_planta, foto,
            data_admissao, hora_inicial, hora_final,
            segunda, terca, quarta, quinta, sexta,
            sabado, domingo, ordem,
            id_centro_custo, status, senha, biometria2,
            email, face } = request.body;
        const query = `INSERT INTO funcionarios
        ( id_cliente, id_setor, id_funcao, nome, matricula, 
         biometria, RG, CPF, CTPS, id_planta, foto, data_admissao, 
         hora_inicial, hora_final,
         segunda, terca, quarta, quinta, sexta, sabado, domingo, 
         deleted, ordem, id_centro_custo, status, senha, biometria2, email, face)
        VALUES ( @id_cliente, @id_setor, 
        @id_funcao, @nome, @matricula, @biometria, @RG,
        @CPF, @CTPS, @id_planta, @foto, @data_admissao, 
        @hora_inicial, @hora_final,
        @segunda, @terca, @quarta, @quinta, @sexta, @sabado, @domingo,
        @deleted, @ordem, @id_centro_custo, @status, @senha, 
        @biometria2, @email, @face)`
        request = new sql.Request();
        request.input('id_cliente', sql.Int, id_cliente);
        request.input('id_setor', sql.Int, id_setor);
        request.input('id_funcao', sql.Int, id_funcao);
        request.input('nome', sql.VarChar, nome);
        request.input('matricula', sql.VarChar, matricula);
        request.input('biometria', sql.NVarChar, biometria);
        request.input('RG', sql.VarChar, RG);
        request.input('CPF', sql.VarChar, CPF);
        request.input('CTPS', sql.VarChar, CTPS);
        request.input('id_planta', sql.Int, id_planta);
        request.input('foto', sql.VarChar, foto);
        request.input('data_admissao', sql.DateTime, data_admissao);
        request.input('hora_inicial', sql.Time, hora_inicial);
        request.input('hora_final', sql.Time, hora_final);
        request.input('segunda', sql.Bit, segunda);
        request.input('terca', sql.Bit, terca);
        request.input('quarta', sql.Bit, quarta);
        request.input('quinta', sql.Bit, quinta);
        request.input('sexta', sql.Bit, sexta);
        request.input('sabado', sql.Bit, sabado);
        request.input('domingo', sql.Bit, domingo);
        request.input('deleted', sql.Bit, false);
        request.input('ordem', sql.Int, ordem);
        request.input('id_centro_custo', sql.Int, id_centro_custo);
        request.input('status', sql.NVarChar, status);
        request.input('senha', sql.NVarChar, senha);
        request.input('biometria2', sql.NVarChar, biometria2);
        request.input('email', sql.VarChar, email);
        request.input('face', sql.VarChar, face);

        const result = await request.query(query);
        if (result) {
            response.status(201).send('Funcionário criado com sucesso!');
            return;
        }
        response.status(400).send('Falha ao criar o funcionario');
    } catch (error) {
        console.error('Erro ao inserir funcionário:', error.message);
        response.status(500).send('Erro ao inserir funcionário');
        return;
    }
}
async function listarCentroCusto(request, response) {
    try {

        let query = 'SELECT DISTINCT id_centro_custo FROM funcionarios WHERE 1 = 1';

        if (request.body.id_cliente) {
            query += ` AND id_cliente = '${request.body.id_cliente}'`;
            const result = await new sql.Request().query(query);
            response.status(200).json(result.recordset);
            return;
        }
        response.status(401).json("id do cliente não enviado");
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}
async function listarSetorDiretoria(request, response) {
    try {
        let query = 'SELECT DISTINCT id_setor FROM funcionarios WHERE 1 = 1';


        if (request.body.id_cliente) {
            query += ` AND id_cliente = '${request.body.id_cliente}'`;
            const result = await new sql.Request().query(query);
            response.status(200).json(result.recordset);
            return;
        }
        response.status(401).json("id do cliente não enviado");
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}
async function listarHierarquia(request, response) {
    try {
        let query = 'SELECT DISTINCT id_funcao FROM funcionarios WHERE 1 = 1';


        if (request.body.id_cliente) {
            query += ` AND id_cliente = '${request.body.id_cliente}'`;
            const result = await new sql.Request().query(query);
            response.status(200).json(result.recordset);
            return;
        }
        response.status(401).json("id do cliente não enviado");
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}
async function listarPlanta(request, response) {
    try {
        let query = 'SELECT DISTINCT id_planta FROM funcionarios WHERE 1 = 1';


        if (request.body.id_cliente) {
            query += ` AND id_cliente = '${request.body.id_cliente}'`;
            const result = await new sql.Request().query(query);
            response.status(200).json(result.recordset);
            return;
        }
        response.status(401).json("id do cliente não enviado");
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

module.exports = {
    listarFuncionarios,
    adicionarFuncionarios,
    listarCentroCusto,
    listarSetorDiretoria,
    listarHierarquia,
    listarPlanta
};
