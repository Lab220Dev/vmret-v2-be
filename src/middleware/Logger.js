const routeLogger = (shouldLog) => (req, res, next) => {
    if (shouldLog) {
        const start = Date.now();
        const { method, url, body } = req;
        const id_cliente = body.id_cliente || null;

        res.on('finish', async () => {
            const duration = Date.now() - start;
            const operacao = `Request ${method} ${url}`;
            const resultado = `Status: ${res.statusCode}, Duration: ${duration}ms`;
            await logOperation(id_cliente, null, operacao, resultado); // Adapte conforme necessário
        });
    }
    next();
};

const logOperation = async (idCliente, idUsuario, operacao, resultado) => {
    // Configuração do banco e inserção do log
    const { poolPromise } = require('./db'); // Ajuste conforme sua configuração
    const sql = require('mssql');

    const pool = await poolPromise;
    const request = pool.request();

    request.input('ID_Cliente', sql.Int, idCliente);
    request.input('ID_Usuario', sql.Int, idUsuario);
    request.input('Operacao', sql.NVarChar, operacao);
    request.input('Resultado', sql.NVarChar, resultado);
    request.input('Dia', sql.Date, new Date());

    try {
        await request.query(`
            INSERT INTO Log_Web (ID_Cliente, ID_Usuario, Operacao, Resultado, Dia)
            VALUES (@ID_Cliente, @ID_Usuario, @Operacao, @Resultado, @Dia)
        `);
    } catch (error) {
        console.error('Error logging operation:', error);
    }
};

module.exports = routeLogger;
