const { createLogger, format, transports } = require('winston');
const Transport = require('winston-transport');
const sql = require('mssql'); // Certifique-se de que o módulo mssql está instalado
const { combine, timestamp } = format;
// Formatação customizada dos logs
const logFormat = format.printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

// Criando um transporte customizado para logar no banco de dados
class SQLTransport extends Transport {
    constructor(opts) {
        super(opts);
        this.defaultIdCliente = opts.idCliente; // Valores default se fornecidos
        this.defaultIdUsuario = opts.idUsuario; // Valores default se fornecidos
    }

    async log(info, callback) {
        // Desestruturação com valores padrão para evitar undefined
        const {
            message,
            timestamp,
            operacao,
            resultado,
            idCliente = this.defaultIdCliente,
            idUsuario = this.defaultIdUsuario
        } = info;

        try {
            const request = new sql.Request();
            // Usando parâmetros para evitar problemas de sintaxe
            await request.input('idCliente', sql.Int, idCliente);
            await request.input('idUsuario', sql.Int, idUsuario);
            await request.input('operacao', sql.NVarChar, operacao);
            await request.input('resultado', sql.NVarChar, resultado);
            await request.input('Log_Web', sql.NVarChar, message);
            await request.input('timestamp', sql.DateTime, timestamp);
            await request.query(`
                INSERT INTO Log_Web (ID_Cliente, ID_Usuario, Operacao,Log_Web, Resultado, Dia)
                VALUES (@idCliente, @idUsuario, @operacao,@Log_Web, @resultado, @timestamp)
            `);
        } catch (err) {
            console.error('Erro ao gravar log no banco de dados:', err);
        } 

        callback(); // Callback para finalizar o log
    }
}

// Criando o logger com transporte personalizado
const logger = createLogger({
    level: 'info',
    format: combine(
        timestamp(),
        logFormat
    ),
    transports: [
        new transports.Console(), // Log no console
        new transports.File({ filename: 'logs/app.log' }), // Log em arquivo
        new SQLTransport({ idCliente: 1, idUsuario: 1 }) // Exemplo de valores default
    ]
});


// Função para logar operações com informações adicionais
function logWithOperation(level, message,resultado, operacao, id_cliente, id_usuario) {
    logger.log({
        level: level,
        message: message,
        resultado:resultado,
        timestamp: new Date().toISOString(),
        operacao: operacao,
        idCliente: id_cliente,
        idUsuario: id_usuario
    });
}

module.exports = {
    logger,
    logWithOperation
};
