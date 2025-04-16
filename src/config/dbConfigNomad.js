const sql = require('mssql');
const { ConnectionPool } = require('mssql');
require('dotenv').config();

const configSecundario = {
    user: process.env.DB_USER_NOMAD,
    password: process.env.DB_PASSWORD_NOMAD,
    server: process.env.DB_SERVER_NOMAD,
    database: process.env.DB_DATABASE_NOMAD,
    pool: {
        max: 5,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: false,
    }
};

let poolSecundario;

async function getPoolNomad() {
    if (!poolSecundario || !poolSecundario.connected) {
        try {
            poolSecundario = new ConnectionPool(configSecundario);
            await poolSecundario.connect();
            console.log("Conexão com banco de dados Nomad estabelecida.");
        } catch (err) {
            console.error("Erro na conexão com o banco Nomad:", err.message);
            throw err;
        }
    }
    return poolSecundario;
}

module.exports = {
    getPoolNomad
};