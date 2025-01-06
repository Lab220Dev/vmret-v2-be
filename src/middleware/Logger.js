const { createLogger, format, transports } = require('winston');  // Importa funções necessárias do módulo winston para criação de logs.
const Transport = require('winston-transport');  // Importa a classe base `Transport` de winston para customização de transportes de logs.
const sql = require('mssql');  // Importa o módulo `mssql` para trabalhar com bancos de dados SQL Server.
 
// Define o formato do log utilizando winston `format.printf`.
// O formato do log exibe o timestamp, o nível de log, a mensagem e, opcionalmente, a query SQL.
const logFormat = format.printf(({ level, message, timestamp, query }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${query ? `Query: ${query}` : ''}`;  // Exibe "Query" somente se ela for fornecida.
});

// Classe personalizada que estende `Transport` de winston para logar diretamente no banco de dados SQL.
class SQLTransport extends Transport {
    /**
     * @param {Object} opts - Opções fornecidas ao construtor do transporte.
     * @param {number} opts.idCliente - ID do cliente para ser registrado no log.
     * @param {number} opts.idUsuario - ID do usuário para ser registrado no log.
     */
    constructor(opts) {
        super(opts);  // Chama o construtor da classe base `Transport` para inicializar o transporte.
        this.defaultIdCliente = opts.idCliente;  // Armazena o ID do cliente fornecido.
        this.defaultIdUsuario = opts.idUsuario;  // Armazena o ID do usuário fornecido.
    }

    /**
     * Função para logar informações no banco de dados SQL.
     *
     * @param {Object} info - Informações do log (mensagem, operação, resultado, etc.).
     * @param {Function} callback - Função callback que é chamada após o processo de log.
     */
    async log(info, callback) {
        // Desestrutura as propriedades de `info`, fornecendo valores padrão quando não presentes.
        const {
            message,
            timestamp,
            operacao,
            resultado,
            idCliente = this.defaultIdCliente,  // Usa o valor padrão do ID do cliente se não fornecido.
            idUsuario = this.defaultIdUsuario,  // Usa o valor padrão do ID do usuário se não fornecido.
            query  // Query SQL que será logada.
        } = info;

        // Verifica se a query foi fornecida. Se não, imprime erro no console e termina o processo.
        if (!query) {
            console.error('Erro: Query não fornecida para logging.');  // Loga o erro no console se não houver query.
            callback();  // Chama o callback para garantir que o fluxo continue.
            return;  // Interrompe a execução do código se a query não for fornecida.
        }

        // Cria uma nova transação SQL.
        const transaction = new sql.Transaction();
        let transactionStarted = false;  // Flag para rastrear se a transação foi iniciada corretamente.

        try {
            // Inicia a transação no banco de dados.
            await transaction.begin();
            transactionStarted = true;  // Marca a transação como iniciada.

            // Cria um novo request associado à transação SQL.
            const request = new sql.Request(transaction);

            // Define os parâmetros para o comando SQL.
            request.input('idCliente', sql.Int, idCliente);  // Passa o ID do cliente como parâmetro.
            request.input('idUsuario', sql.Int, idUsuario);  // Passa o ID do usuário como parâmetro.
            request.input('operacao', sql.NVarChar, operacao);  // Passa a operação realizada como parâmetro.
            request.input('resultado', sql.NVarChar, resultado);  // Passa o resultado da operação.
            request.input('Log_Web', sql.NVarChar, message);  // Passa a mensagem do log.
            request.input('timestamp', sql.DateTime, timestamp);  // Passa o timestamp da operação.
            request.input('Log_String', sql.NVarChar, query);  // Passa a query SQL.

            // Executa a consulta SQL para inserir os dados no banco de dados.
            await request.query(`
                INSERT INTO Log_Web (ID_Cliente, ID_Usuario, Operacao, Log_Web, Resultado, Dia, Log_String)
                VALUES (@idCliente, @idUsuario, @operacao, @Log_Web, @resultado, @timestamp, @Log_String)
            `);

            // Se a inserção foi bem-sucedida, realiza o commit da transação.
            await transaction.commit();  // Confirma a transação.

        } catch (err) {
            // Se houver erro durante a execução do SQL, realiza o rollback da transação.
            if (transactionStarted) {
                await transaction.rollback();  // Reverte qualquer alteração feita na transação.
            }
            // Loga o erro detalhado no console.
            console.error('Erro ao gravar log no banco de dados:', err.message);  // Exibe a mensagem de erro.
            console.error('Stack trace:', err.stack);  // Exibe o stack trace do erro para debugging.
        } finally {
            callback();  // Chama o callback independentemente do sucesso ou falha, para continuar o fluxo de execução.
        }
    }
}

// Cria um logger utilizando o `winston` com os transportes configurados.
const logger = createLogger({
    level: 'info',  // Define o nível mínimo de log para 'info'. Logs abaixo desse nível não serão registrados.
    format: format.combine(
        format.timestamp(),  // Adiciona o timestamp de quando o log foi gerado.
        logFormat  // Define o formato do log conforme definido anteriormente.
    ),
    transports: [
        new transports.Console(),  // Loga no console.
        new transports.File({ filename: 'logs/app.log' }),  // Loga em um arquivo de texto.
        new SQLTransport({ idCliente: 1, idUsuario: 1 })  // Loga diretamente no banco de dados usando a classe personalizada.
    ]
});

/**
 * Função que retorna a hora atual de São Paulo, levando em consideração o fuso horário (UTC-3).
 * 
 * @returns {string} - A data e hora em formato ISO 8601 (sem milissegundos) no fuso horário de São Paulo.
 */
function getSaoPauloTime() {
    const now = new Date();  // Obtém a data e hora atual no formato UTC.
    const saoPauloOffset = -3 * 60;  // Fuso horário de São Paulo é UTC-3 (em minutos).
    const localOffset = now.getTimezoneOffset();  // Obtém o offset do fuso horário local do servidor.

    // Ajusta a hora para o fuso horário de São Paulo.
    const saoPauloTime = new Date(now.getTime() + (saoPauloOffset - localOffset) * 60000);

    // Retorna a hora formatada em ISO 8601, removendo os milissegundos.
    return saoPauloTime.toISOString().slice(0, 19);  // Retira a parte dos milissegundos.
}

/**
 * Função de logging que registra uma operação no banco de dados ou no arquivo, com o resultado da operação.
 * 
 * @param {string} level - O nível do log (info, warn, error, etc.).
 * @param {string} message - A mensagem que será registrada no log.
 * @param {string} resultado - O resultado da operação (sucesso ou erro).
 * @param {string} operacao - A descrição da operação realizada.
 * @param {number} id_cliente - ID do cliente relacionado à operação.
 * @param {number} id_usuario - ID do usuário que realizou a operação.
 * @param {string} query - A query SQL executada durante a operação.
 */
function logWithOperation(level, message, resultado, operacao, id_cliente, id_usuario, query) {
    // Verifica se a query foi fornecida. Se não, imprime erro no console e interrompe o processo de log.
    if (!query) {
        console.error('Erro: Query não fornecida para logging.');  // Loga um erro no console se a query não estiver presente.
        return;  // Interrompe o processo de logging.
    }

    // Registra o log com os parâmetros fornecidos.
    logger.log({
        level,  // Define o nível do log (info, warn, etc.).
        message,  // Mensagem a ser logada.
        resultado,  // Resultado da operação.
        timestamp: getSaoPauloTime(),  // Timestamp da operação (hora de São Paulo).
        operacao,  // Descrição da operação.
        idCliente: id_cliente,  // ID do cliente.
        idUsuario: id_usuario,  // ID do usuário.
        query  // Query SQL executada.
    });
}

// Exporta o logger e a função de logging para uso em outros módulos.
module.exports = {
    logger,
    logWithOperation
};
