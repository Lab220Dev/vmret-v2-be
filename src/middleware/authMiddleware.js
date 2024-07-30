const jwt = require('jsonwebtoken');
const segredo = '%$&*656$4#%$3@@@__';

function autenticarToken(request, response, next) {
    const token = request.headers['authorization'];

    if (!token) {
        return response.status(401).json({ mensagem: "Token não fornecido" });
    }

    jwt.verify(token.split(' ')[1], segredo, (err, decoded) => {
        if (err) {
            return response.status(401).json({ mensagem: "Token inválido" });
        }
        request.usuario = decoded.usuario;
        next();
    });
}

module.exports = autenticarToken;
