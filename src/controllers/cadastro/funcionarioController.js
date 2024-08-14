const sql = require('mssql');
const path = require('path');
const fs = require('fs').promises;
const { logQuery } = require('../../utils/logUtils');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const convertToBoolean = (value) => {
    return value === 'true';
};
async function listarFuncionarios(request, response) {
    try {
        let query = 'SELECT * FROM funcionarios WHERE 1 = 1';

        if (request.body.id_cliente) {
            query += ` AND id_cliente = '${request.body.id_cliente}'`;
        } else {
            response.status(401).json("id do cliente não enviado");
            return;
        }

        query += ' AND deleted = 0';

        const result = await new sql.Request().query(query);
        response.status(200).json(result.recordset);
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

async function adicionarFuncionarios(request, response) {
    const { id_setor, id_funcao,
        nome, matricula, biometria,
        RG, CPF, CTPS, id_planta,
        data_admissao, hora_inicial, hora_final,
        segunda, terca, quarta, quinta, sexta,
        sabado, domingo, ordem,
        id_centro_custo, status, senha, biometria2,
        email, face, foto, id_usuario } = request.body;
    let nomeFuncionario = '';
    const id_cliente = request.body.id_cliente;
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
        @biometria2, @email, @face)`;
    const params = {
        id_cliente: id_cliente,
        id_setor: id_setor,
        id_funcao: id_funcao,
        nome: nome,
        matricula: matricula,
        biometria: biometria,
        RG: RG,
        CPF: CPF,
        CTPS: CTPS,
        id_planta: id_planta,
        foto: nomeFuncionario,
        data_admissao: data_admissao,
        hora_inicial: hora_inicial,
        hora_final: hora_final,
        segunda: convertToBoolean(segunda),
        terca: convertToBoolean(terca),
        quarta: convertToBoolean(quarta),
        quinta: convertToBoolean(quinta),
        sexta: convertToBoolean(sexta),
        sabado: convertToBoolean(sabado),
        deleted: false,
        ordem: '',
        id_centro_custo: id_centro_custo,
        status: status,
        biometria2: biometria2,
        email: email,
        face: face
    };
    try {
        const files = request.files;
        const uploadPath = path.join(__dirname, '../uploads/funcionarios', id_cliente.toString());
        await fs.mkdir(uploadPath, { recursive: true });
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileExtension = path.extname(file.originalname);
            nomeFuncionario = `${foto}${fileExtension}`;
            const filePath = path.join(uploadPath, nomeFuncionario);
            await fs.writeFile(filePath, file.buffer);
        }
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
        request.input('foto', sql.VarChar, nomeFuncionario);
        request.input('data_admissao', sql.DateTime, data_admissao);
        request.input('hora_inicial', sql.Time, hora_inicial);
        request.input('hora_final', sql.Time, hora_final);
        request.input('segunda', sql.Bit, convertToBoolean(segunda));
        request.input('terca', sql.Bit, convertToBoolean(terca));
        request.input('quarta', sql.Bit, convertToBoolean(quarta));
        request.input('quinta', sql.Bit, convertToBoolean(quinta));
        request.input('sexta', sql.Bit, convertToBoolean(sexta));
        request.input('sabado', sql.Bit, convertToBoolean(sabado));
        request.input('domingo', sql.Bit, convertToBoolean(domingo));
        request.input('deleted', sql.Bit, false);
        request.input('ordem', sql.Int, '');
        request.input('id_centro_custo', sql.Int, id_centro_custo);
        request.input('status', sql.NVarChar, status);
        request.input('senha', sql.NVarChar, senha);
        request.input('biometria2', sql.NVarChar, biometria2);
        request.input('email', sql.VarChar, email);
        request.input('face', sql.VarChar, face);

        const result = await request.query(query);
        if (result.rowsAffected[0] > 0) {
            //logQuery('info', `Usuário ${id_usuario} criou um novo Centro de Custo`, 'sucesso', 'INSERT', id_cliente, id_usuario, query, params);
            response.status(201).send('Funcionário criado com sucesso!');
            return;
        } else {
            //logQuery('error', `Usuário ${id_usuario} falhou ao criar Centro de Custo`, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
            response.status(400).send('Falha ao criar o funcionario');
        }
    } catch (error) {
        const errorMessage = error.message.includes('Query não fornecida para logging')
            ? 'Erro crítico: Falha na operação'
            : `Erro ao adicionar Centro de Custo: ${error.message}`;
       // logQuery('error', errorMessage, 'falha', 'INSERT', id_cliente, id_usuario, query, params);
        console.error('Erro ao inserir funcionário:', error.message);
        response.status(500).send('Erro ao inserir funcionário');
        return;
    }
}
async function foto(request, response) {
    if (!request.files) {
        return response.status(400).send('Nenhum arquivo foi enviado.')
    }

    const { id_cliente } = request.body
    const foto = request.file

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

async function deleteFuncionario(request, response) {
    let query = "UPDATE funcionarios SET deleted = 1 WHERE id_funcionario = @id_funcionario";
    const { id_usuario, id_cliente, id_funcionario } = request.body;
    const params = {
        id_funcionario: id_funcionario
    };
    try {
        if (id_funcionario) {
            const sqlRequest = new sql.Request();
            sqlRequest.input('id_funcionario', sql.Int, id_funcionario);
            const result = await sqlRequest.query(query);
            if (result.rowsAffected[0] > 0) {
               // logQuery('info', `O usuário ${id_usuario} deletou o Centro de Custo ${ID_CentroCusto}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);
                response.status(200).json(result.recordset);
                return
            } else {
               // logQuery('error', `Erro ao excluir: ${id_funcionario} não encontrado.`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
                response.status(400).send('Nenhuma alteração foi feita no centro de custo.');
            }
        }
        response.status(401).json("id do funcionario não foi enviado");
    } catch (error) {
       //logQuery('error', `${error.message}`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
        console.error('Erro ao excluir:', error.message);
        response.status(500).send('Erro ao excluir');
    }
}

async function atualizarFuncionario(request, response) {
    const query = `
            UPDATE funcionarios
            SET id_setor = @id_setor, id_funcao = @id_funcao,
                nome = @nome, matricula = @matricula, biometria = @biometria,
                RG = @RG, CPF = @CPF, CTPS = @CTPS, id_planta = @id_planta,
                foto = @foto, data_admissao = @data_admissao, hora_inicial = @hora_inicial,
                hora_final = @hora_final, segunda = @segunda, terca = @terca,
                quarta = @quarta, quinta = @quinta, sexta = @sexta, sabado = @sabado,
                domingo = @domingo, ordem = @ordem, id_centro_custo = @id_centro_custo,
                status = @status, senha = @senha, biometria2 = @biometria2,
                email = @email, face = @face
            WHERE id_funcionario = @id_funcionario`;
    const {
        id_funcionario,
        id_setor, id_funcao,
        nome, matricula, biometria,
        RG, CPF, CTPS, id_planta,
        data_admissao, hora_inicial, hora_final,
        segunda, terca, quarta, quinta, sexta,
        sabado, domingo, ordem,
        id_centro_custo, status, senha, biometria2,
        email, face, foto, id_usuario
    } = request.body;
    let nomeFuncionario = foto;
    const id_cliente = request.body.id_cliente;
    const files = request.files;
    const params = {
        id_setor: id_setor,
        id_funcao: id_funcao,
        nome: nome,
        matricula: matricula,
        biometria: biometria,
        RG: RG,
        CPF: CPF,
        CTPS: CTPS,
        id_planta: id_planta,
        foto: nomeFuncionario,
        hora_inicial: hora_inicial,
        data_admissao: data_admissao,
        hora_final: hora_final,
        segunda: segunda,
        terca: terca,
        quarta: quarta,
        quinta: quinta,
        sexta: sexta,
        sabado: sabado,
        domingo: domingo,
        ordem: '',
        id_centro_custo: id_centro_custo,
        status: status,
        senha: senha,
        biometria2: biometria2,
        email: email,
        face: face,
        id_funcionario: id_funcionario
    };
    try {
        if (files && files.length > 0) {
            const file = files[0];
            const fileExtension = path.extname(file.originalname);
            nomeFuncionario = `${foto}${fileExtension}`;
            const uploadPath = path.join(__dirname, '../uploads/funcionarios', id_cliente.toString());
            await fs.mkdir(uploadPath, { recursive: true });
            const filePath = path.join(uploadPath, nomeFuncionario);
            await fs.writeFile(filePath, file.buffer);
        }
        request = new sql.Request();
        request.input('id_setor', sql.Int, id_setor);
        request.input('id_funcao', sql.Int, id_funcao);
        request.input('nome', sql.VarChar, nome);
        request.input('matricula', sql.VarChar, matricula);
        request.input('biometria', sql.NVarChar, biometria);
        request.input('RG', sql.VarChar, RG);
        request.input('CPF', sql.VarChar, CPF);
        request.input('CTPS', sql.VarChar, CTPS);
        request.input('id_planta', sql.Int, id_planta);
        request.input('foto', sql.VarChar, nomeFuncionario);
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
        request.input('ordem', sql.Int, '');
        request.input('id_centro_custo', sql.Int, id_centro_custo);
        request.input('status', sql.NVarChar, status);
        request.input('senha', sql.NVarChar, senha);
        request.input('biometria2', sql.NVarChar, biometria2);
        request.input('email', sql.VarChar, email);
        request.input('face', sql.VarChar, face);
        request.input('id_funcionario', sql.Int, id_funcionario);

        const result = await request.query(query);
        if (result.rowsAffected[0] > 0) {
          //  logQuery('info', `O usuário ${id_usuario} deletou o Centro de Custo ${ID_CentroCusto}`, 'sucesso', 'DELETE', id_cliente, id_usuario, query, params);
            response.status(200).json(result.recordset);
            return;
        } else {
            logQuery('error', `Erro ao excluir: ${ID_CentroCusto} não encontrado.`, 'erro', 'DELETE', id_cliente, id_usuario, query, params);
            response.status(400).send('Nenhuma alteração foi feita no centro de custo.');
        }
    } catch (error) {
        //logWithOperation('error', `O usuario ${id_usuario} Falhou ao atuaizar o cadastro do Funcionario ${id_funcionario}: ${err.message}`, 'Falha', 'Atualização Funcionario', id_cliente, id_usuario);
        console.error('Erro ao atualizar funcionário:', error.message);
        response.status(500).send('Erro ao atualizar funcionário');
    }
}
async function listarOperadores(request, response) {
    const { id_cliente } = request.body;
    try {
        if (!id_cliente) {
            return response.status(401).json("ID do cliente não enviado");
        }

        let query = 'SELECT * FROM Usuarios WHERE deleted = 0 AND role = \'Operador\' AND id_cliente = @id_cliente';
        const dbRequest = new sql.Request();
        dbRequest.input('id_cliente', sql.Int, id_cliente);

        const result = await dbRequest.query(query);
        response.status(200).json(result.recordset);
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

module.exports = {
    upload,
    foto,
    listarFuncionarios,
    adicionarFuncionarios,
    listarCentroCusto,
    listarSetorDiretoria,
    listarHierarquia,
    listarPlanta,
    atualizarFuncionario,
    deleteFuncionario,
    listarOperadores
};
