const sql = require('mssql');//Importa o módulo `mssql` para interagir com bancos de dados Microsoft SQL Server.
require('dotenv').config();//Importa e configura as variáveis de ambiente a partir do arquivo `.env`, permitindo o acesso

/**
 * Configuração do banco de dados, utilizando as variáveis de ambiente carregadas do arquivo `.env`.
 * A configuração inclui informações como usuário, senha, servidor e banco de dados, além de 
 * configurações de pool de conexões e opções de criptografia.
 * 
 * @constant {Object} config
 * @property {string} user - Nome de usuário para autenticação no banco de dados.
 * @property {string} password - Senha do usuário para autenticação.
 * @property {string} server - Endereço do servidor do banco de dados.
 * @property {string} database - Nome do banco de dados a ser acessado.
 * @property {Object} pool - Configurações do pool de conexões.
 * @property {number} pool.max - Número máximo de conexões simultâneas permitidas.
 * @property {number} pool.min - Número mínimo de conexões mantidas no pool.
 * @property {number} pool.idleTimeoutMillis - Tempo máximo em milissegundos antes de liberar conexões ociosas.
 * @property {Object} options - Opções adicionais de configuração.
 * @property {boolean} options.encrypt - Define se a conexão deve ser criptografada.
 */
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
        encrypt: false,  
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
