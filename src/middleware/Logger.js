const { createLogger, format, transports } = require('winston');
const Transport = require('winston-transport');
const sql = require('mssql'); // Inclua o módulo SQL se ainda não estiver incluído

const logFormat = format.printf(({ level, message, timestamp, query }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${query ? `Query: ${query}` : ''}`;
});

class SQLTransport extends Transport {
    constructor(opts) {
        super(opts);
        this.defaultIdCliente = opts.idCliente;
        this.defaultIdUsuario = opts.idUsuario;
    }

    async log(info, callback) {
        const {
            message,
            timestamp,
            operacao,
            resultado,
            idCliente = this.defaultIdCliente,
            idUsuario = this.defaultIdUsuario,
            query // Inclui a query
        } = info;

        if (!query) {
            console.error('Erro: Query não fornecida para logging.');
            callback(); // Finaliza o callback, mas não prossegue com o logging se a query não estiver presente
            return;
        }

        try {
            const request = new sql.Request();
            await request.input('idCliente', sql.Int, idCliente);
            await request.input('idUsuario', sql.Int, idUsuario);
            await request.input('operacao', sql.NVarChar, operacao);
            await request.input('resultado', sql.NVarChar, resultado);
            await request.input('Log_Web', sql.NVarChar, message);
            await request.input('timestamp', sql.DateTime, timestamp);
            await request.input('Log_String', sql.NVarChar, query); // Adiciona a query como input
            await request.query(`
                INSERT INTO Log_Web (ID_Cliente, ID_Usuario, Operacao, Log_Web, Resultado, Dia, Log_String)
                VALUES (@idCliente, @idUsuario, @operacao, @Log_Web, @resultado, @timestamp, @Log_String)
            `);
        } catch (err) {
            console.error('Erro ao gravar log no banco de dados:', err);
        }
        callback(); // Finaliza o callback após o logging
    }
}

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        logFormat
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: 'logs/app.log' }),
        new SQLTransport({ idCliente: 1, idUsuario: 1 })
    ]
});

function logWithOperation(level, message, resultado, operacao, id_cliente, id_usuario, query) {
    if (!query) {
        console.error('Erro: Query não fornecida para logging.');
        return; // Interrompe o processo se a query não estiver disponível
    }

    logger.log({
        level,
        message,
        resultado,
        timestamp: new Date().toISOString(),
        operacao,
        idCliente: id_cliente,
        idUsuario: id_usuario,
        query
    });
}

module.exports = {
    logger,
    logWithOperation
};
