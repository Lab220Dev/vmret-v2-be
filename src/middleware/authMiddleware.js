const jwt = require('jsonwebtoken');
const segredo = '%$&*656$4#%$3@@@__';

// Simulação de armazenamento de API keys e associação com clientes
const apiKeys = {
    'minha-api-key-secreta-123': { id_cliente: 57, nome: 'Luvata' },
    'outra-api-key-secreta-456': { id_cliente: 2, nome: 'Cliente2' }
};

function autenticarToken(request, response, next) {
    const token = request.headers['authorization'];
    const apiKey = request.headers['x-api-key'];

    if (!token && !apiKey) {
        return response.status(401).json({ mensagem: "Token ou API key não fornecido" });
    }

    if (token) {
        jwt.verify(token.split(' ')[1], segredo, (err, decoded) => {
            if (err) {
                return response.status(401).json({ mensagem: "Token inválido" });
            }
            request.usuario = decoded.usuario;
            request.roles = decoded.roles;
            next();
        });
    } else if (apiKey) {
        console.log("API key recebida:", apiKey);
        const user = apiKeys[apiKey];

        if (!user) {
            console.log("API key inválida:", apiKey);
            return response.status(401).json({ mensagem: "API key inválida" });
        }

        request.body.id_cliente = user.id_cliente;
        request.body.id_usuario = 0;
        next();
    }
};
function autorizarRoles(rolesPermitidas) {
    return (req, res, next) => {
        if (!req.roles || !rolesPermitidas.some(role => req.roles.includes(role))) {
            return res.status(403).json({ mensagem: "Acesso negado" });
        }
        next();
    };
}
module.exports = {
    autenticarToken,
    autorizarRoles
};
