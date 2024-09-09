const jwt = require('jsonwebtoken');
const sql = require('mssql');
const segredo = '%$&*656$4#%$3@@@__';


async function autenticarToken(request, response, next) {
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
         try {
            const query = 'SELECT id_cliente FROM API_KEY WHERE api_key = @api_key';
            const sqlRequest = new sql.Request();
            sqlRequest.input('api_key', sql.VarChar, apiKey);

            const result = await sqlRequest.query(query);

            if (result.recordset.length > 0) {
                const id_cliente = result.recordset[0].id_cliente;
                request.body.id_cliente = id_cliente;
                request.apiKeyAuthenticated = true;
                request.body.id_usuario = 0; 
                next();
            } else {
                return response.status(401).json({ mensagem: "API key inválida" });
            }
        } catch (error) {
            console.error('Erro ao validar API key:', error.message);
            return response.status(500).json({ mensagem: "Erro interno ao validar API key" });
        }
    }
};
function autorizarRoles(rolesPermitidas) {
    return (req, res, next) => {
        if (req.apiKeyAuthenticated) {
            return next(); 
        }
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
