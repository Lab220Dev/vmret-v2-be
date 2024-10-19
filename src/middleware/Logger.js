const { createLogger, format, transports } = require('winston');
const Transport = require('winston-transport');
const sql = require('mssql'); 
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
            query
        } = info;

        if (!query) {
            console.error('Erro: Query não fornecida para logging.');
            callback();
            return;
        }

        const transaction = new sql.Transaction();
        let transactionStarted = false;

        try {
            // Inicia a transação
            await transaction.begin();
            transactionStarted = true;

            // Cria um novo request a partir da transação
            const request = new sql.Request(transaction);

            // Define os parâmetros
            request.input('idCliente', sql.Int, idCliente);
            request.input('idUsuario', sql.Int, idUsuario);
            request.input('operacao', sql.NVarChar, operacao);
            request.input('resultado', sql.NVarChar, resultado);
            request.input('Log_Web', sql.NVarChar, message);
            request.input('timestamp', sql.DateTime, timestamp);
            request.input('Log_String', sql.NVarChar, query);

            // Executa a inserção
            await request.query(`
                INSERT INTO Log_Web (ID_Cliente, ID_Usuario, Operacao, Log_Web, Resultado, Dia, Log_String)
                VALUES (@idCliente, @idUsuario, @operacao, @Log_Web, @resultado, @timestamp, @Log_String)
            `);

            // Confirma a transação
            await transaction.commit();  // Corrigido: usando transaction.commit()

        } catch (err) {
            if (transactionStarted) {
                // Reverte a transação em caso de erro
                await transaction.rollback();  // Corrigido: usando transaction.rollback()
            }
            console.error('Erro ao gravar log no banco de dados:', err.message);
            console.error('Stack trace:', err.stack);
        } finally {
            callback();
        }
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
function getSaoPauloTime() {
    // Obter a data atual em UTC
    const now = new Date();

    // Converter para o fuso horário de São Paulo (UTC-3)
    const saoPauloOffset = -3 * 60;  // São Paulo é UTC-3
    const localOffset = now.getTimezoneOffset();  // Obter o offset do servidor em minutos

    // Ajustar a diferença de fuso horário
    const saoPauloTime = new Date(now.getTime() + (saoPauloOffset - localOffset) * 60000);

    // Formatar como ISO 8601 (sem milissegundos)
    return saoPauloTime.toISOString().slice(0, 19);  // Retira a parte dos milissegundos
}
function logWithOperation(level, message, resultado, operacao, id_cliente, id_usuario, query) {
    if (!query) {
        console.error('Erro: Query não fornecida para logging.');
        return; // Interrompe o processo se a query não estiver disponível
    }

    logger.log({
        level,
        message,
        resultado,
        timestamp: getSaoPauloTime(),
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
