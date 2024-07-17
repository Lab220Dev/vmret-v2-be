const sql = require('mssql');

const CryptoJS = require('crypto-js');
const jwt = require('jsonwebtoken');
const segredo = '%$&*656$4#%$3@@@__';
const opcoes = {
    expiresIn: '1h'
};

async function login(request, response) {
    try {
        let query = 'SELECT * FROM Usuarios WHERE 1 = 1';

        if (request.body.email) {
            query += ` AND email = '${request.body.email}'`;
        }
        if (request.body.senha) {
            let hashMD5 = CryptoJS.MD5(request.body.senha).toString();
            query += ` AND senha = '${hashMD5}'`;
            const result = await new sql.Request().query(query);
            let Usuario = result.recordset;
            delete Usuario[0].senha;
            const token = jwt.sign({ Usuario }, segredo, opcoes);
            response.status(200).json({ token, Usuario });
            return;
        }
        response.status(401).json("E-mail ou senha inválidos");
    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

async function logout(request, response) {
    response.status(200).json({ message: 'Logoff bem-sucedido' });
}

module.exports = {
    login,
    logout
};