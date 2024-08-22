const apiKeys = {
    'minha-api-key-secreta-123': { id_cliente: 57, nome: 'Luvata' },
    'outra-api-key-secreta-456': { id_cliente: 2, nome: 'Cliente2' }
};

async function recuperar(request, response) {
    try {
        const { id_cliente } = request.body;
        const apiKey = Object.keys(apiKeys).find(key => apiKeys[key].id_cliente === id_cliente);

        if (apiKey) {
            return response.json({ apiKey });
        } else {
            return response.status(404).json({ mensagem: 'API key não encontrada para o cliente especificado' });
        }

    } catch (error) {
        console.error('Erro ao executar consulta:', error.message);
        response.status(500).send('Erro ao executar consulta');
    }
}

module.exports = {
    recuperar
};
