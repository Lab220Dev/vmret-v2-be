const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: false 
    }
};

module.exports = async function () {
    try {
        await sql.connect(config);
        console.log("Conexão com o banco bem sucedida!");
    } catch (err) {
        console.error("Erro ao conectar com o Banco de Dados:", err.message);
    }
};
