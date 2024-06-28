// src/app.js
const express = require("express");
const bodyParser = require('body-parser');
const app = express();
const dbConfig = require('./src/config/dbConfig');
const usuariosRoutes = require('./src/routes/usuarioRoutes');
const funcionarioRoutes = require('./src/routes/funcionarioRoutes');
const produtoRoutes = require('./src/routes/produtoRoutes');
const autenticarToken = require('./src/middleware/authMiddleware');

require('dotenv').config();

app.use(bodyParser.json());

// Conectar ao banco de dados
dbConfig().catch(err => {
    console.error("Erro ao conectar ao banco de dados:", err.message);
    process.exit(1); // Encerra o processo se houver erro na conexão
});

// Rotas de usuario
app.use('/usuarios', usuariosRoutes);

// Rotas de funcionarios
app.use('/funcionarios', autenticarToken, funcionarioRoutes);
// Rotas de produtos
app.use('/produtos', autenticarToken, produtoRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}...`);
});
