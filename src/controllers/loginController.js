const sql = require('mssql');

const CryptoJS = require('crypto-js');
const jwt = require('jsonwebtoken');
const segredo = '%$&*656$4#%$3@@@__';
const opcoes = {
    expiresIn: '1h'
};

async function login(request, response) {
    try {
        const { email, senha } = request.body;
        if (!email || !senha) {
            response.status(400).json("E-mail e senha são obrigatórios");
            return;
        }
        const hashMD5 = CryptoJS.MD5(senha).toString();
        const query = `
        SELECT * FROM Usuarios
        WHERE email = @Email
          AND senha = @Senha`;
        const result = await new sql.Request()
            .input('Email', sql.VarChar, email)
            .input('Senha', sql.VarChar, hashMD5)
            .query(query)
        const Usuario = result.recordset[0];

        if (Usuario) {
            delete Usuario.senha;
            const token = jwt.sign({ Usuario }, segredo, opcoes);
            response.status(200).json({ token, Usuario });
        } else {
            response.status(401).json("E-mail ou senha inválidos");
        }

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