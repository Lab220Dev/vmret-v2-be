const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    pool: {
        max: 10, // Número máximo de conexões simultâneas
        min: 0,  // Número mínimo de conexões mantidas
        idleTimeoutMillis: 30000 // Tempo máximo de inatividade antes de liberar a conexão
    },
    options: {
        encrypt: false, // Use true se estiver usando TLS
        useUTC: false,  // Usa o horário local
    }
};

// Cria uma variável global para armazenar o pool de conexões
let pool;

// Inicializa o pool de conexões
async function initializePool() {
    if (!pool) {
        try {
            pool = await sql.connect(config);
            console.log("Pool de conexão inicializado com sucesso.");
        } catch (err) {
            console.error("Erro ao inicializar o pool de conexão:", err.message);
            throw err;
        }
    }
    return pool;
}

// Exporta o módulo sql e a função de inicialização
module.exports = {
    sql,
    initializePool,
};
