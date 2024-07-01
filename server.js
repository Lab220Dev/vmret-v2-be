const express = require("express");
const bodyParser = require('body-parser');
const app = express();
const dbConfig = require('./src/config/dbConfig');
const usuariosRoutes = require('./src/routes/usuarioRoutes');
const funcionarioRoutes = require('./src/routes/funcionarioRoutes');
const produtoRoutes = require('./src/routes/produtoRoutes');
const autenticarToken = require('./src/middleware/authMiddleware');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

app.use(bodyParser.json());

app.use(cors({
    origin: '*' 
}));

// Conectar ao banco de dados
dbConfig().catch(err => {
    console.error("Erro ao conectar ao banco de dados:", err.message);
    process.exit(1); // Encerra o processo se houver erro na conexão
});

// Servir arquivos estáticos do diretório 'dist'
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

// Rota para servir o arquivo HTML principal (index.html) do Vue
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// Rotas de usuario
app.use('/api/usuarios', usuariosRoutes);

// Rotas de funcionarios
app.use('/api/funcionarios', autenticarToken, funcionarioRoutes);

// Rotas de produtos
app.use('/api/produtos', autenticarToken, produtoRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}...`);
});
