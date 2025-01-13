const jwt = require('jsonwebtoken'); // Importa o módulo `jsonwebtoken` para manipulação de tokens JWT.
const sql = require('mssql'); // Importa o módulo `mssql` para execução de consultas SQL.
const segredo = '%$&*656$4#%$3@@@__'; // Define a chave secreta para verificar o token JWT.

/**
 * Middleware que autentica o token JWT ou API key presente nos cabeçalhos da requisição.
 * 
 * @param {Object} request - Objeto de requisição HTTP, contendo os cabeçalhos com o token ou a API key.
 * @param {Object} response - Objeto de resposta HTTP que será utilizado para retornar o status e a mensagem de erro ou sucesso.
 * @param {Function} next - Função que chama o próximo middleware ou controller, caso a autenticação seja bem-sucedida.
 * @returns {Promise<void>} - Retorna uma resposta de erro ou chama o próximo middleware.
 */
async function autenticarToken(request, response, next) {
    // Recupera o token de autorização ou a chave da API dos cabeçalhos da requisição.
    const token = request.headers['authorization'];
    const apiKey = request.headers['x-api-key'];

    // Verifica se nem o token nem a API key foram fornecidos.
    if (!token && !apiKey) {
        // Caso nenhum dos dois valores seja fornecido, retorna erro 401 (Não autorizado).
        return response.status(401).json({ mensagem: "Token ou API key não fornecido" });
    }

    // Caso o token seja fornecido nos cabeçalhos da requisição.
    if (token) {
        // Verifica e decodifica o token JWT. O token vem no formato "Bearer <token>", então é necessário dividir.
        jwt.verify(token.split(' ')[1], segredo, (err, decoded) => {
            // Se ocorrer um erro de validação (token inválido, expirado, etc.), retorna erro 401.
            if (err) {
                return response.status(401).json({ mensagem: "Token inválido" });
            }
            // Caso o token seja válido, armazena as informações do usuário e papéis no objeto `request`.
            request.usuario = decoded.usuario;
            request.roles = decoded.roles;

            // Chama o próximo middleware ou controlador, já com as informações do usuário.
            next();
        });
    } else if (apiKey) {
        // Caso a API key seja fornecida e não o token JWT.
        try {
            // Consulta o banco de dados para verificar se a API key fornecida é válida.
            const query = 'SELECT id_cliente FROM API_KEY WHERE api_key = @api_key';
            const sqlRequest = new sql.Request();
            sqlRequest.input('api_key', sql.VarChar, apiKey);

            // Executa a consulta SQL para verificar a API key.
            const result = await sqlRequest.query(query);

            // Verifica se a API key existe no banco de dados.
            if (result.recordset.length > 0) {
                // Se a API key for válida, recupera o id_cliente e o armazena no corpo da requisição.
                const id_cliente = result.recordset[0].id_cliente;
                request.body.id_cliente = id_cliente; // Associa o ID do cliente à requisição.

                // Marca a requisição como autenticada via API key.
                request.apiKeyAuthenticated = true;
                request.body.id_usuario = 0; // Associa id_usuario como 0, pois estamos utilizando a API key.

                // Chama o próximo middleware ou controlador.
                next();
            } else {
                // Caso a API key não seja encontrada no banco de dados, retorna erro 401.
                return response.status(401).json({ mensagem: "API key inválida" });
            }
        } catch (error) {
            // Caso ocorra um erro durante a execução da consulta SQL, retorna erro 500.
            console.error('Erro ao validar API key:', error.message);
            return response.status(500).json({ mensagem: "Erro interno ao validar API key" });
        }
    }
};

/**
 * Middleware que autoriza o acesso com base nos papéis (roles) permitidos.
 * 
 * @param {Array} rolesPermitidas - Array de papéis de usuário permitidos a acessar o recurso.
 * @returns {Function} - Retorna uma função middleware que autoriza o acesso se o usuário tiver a role permitida.
 */
function autorizarRoles(rolesPermitidas) {
    return (req, res, next) => {
        // Se a requisição foi autenticada via API key, permite o acesso sem verificar os papéis.
        if (req.apiKeyAuthenticated) {
            return next(); // Permite que o processo continue.
        }

        // Se o usuário não tem papéis ou não tem um dos papéis permitidos, retorna erro 403 (Acesso negado).
        if (!req.roles || !rolesPermitidas.some(role => req.roles.includes(role))) {
            return res.status(403).json({ mensagem: "Acesso negado" });
        }

        // Caso o usuário tenha um dos papéis permitidos, chama o próximo middleware ou controlador.
        next();
    };
}

// Exporta as funções de autenticação e autorização para uso em outros arquivos.
module.exports = {
    autenticarToken,
    autorizarRoles
};
