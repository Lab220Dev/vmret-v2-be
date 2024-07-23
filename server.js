
const express = require("express");
const bodyParser = require('body-parser');
const app = express();
const dbConfig = require('./src/config/dbConfig');
const usuariosRoutes = require('./src/routes/cadastros/usuarioRoutes');
const funcionarioRoutes = require('./src/routes/cadastros/funcionarioRoutes');
const produtoRoutes = require('./src/routes/cadastros/produtoRoutes');
const loginRoutes = require('./src/routes/loginRoutes');
const imageRoutes = require('./src/routes/imageRoutes');
const CentroCustoRoutes = require('./src/routes/cadastros/CentroCustoRoutes');
const funcaoRoutes = require('./src/routes/cadastros/funcaoRoutes');
const planasRoutes = require('./src/routes/cadastros/plantaRoutes');
const retiradaRealizadaRoute = require('./src/routes/relatorios/RetiradasRealizadasRoutes');
const autenticarToken = require('./src/middleware/authMiddleware');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cors({
    origin: '*'
}));

// Conectar ao banco de dados
dbConfig().catch(err => {
    console.error("Erro ao conectar ao banco de dados:", err.message);
    process.exit(1); // Encerra o processo se houver erro na conexão
});
//Rotas de Cadastro
// Rotas de usuario
app.use('/api/usuarios', autenticarToken, usuariosRoutes);

// Rotas de funcionarios
app.use('/api/funcionarios', autenticarToken, funcionarioRoutes);

// Rotas de produtos
app.use('/api/produtos', autenticarToken, produtoRoutes);

// Rotas de recuperação de Imagem
app.use('/api/image', autenticarToken,imageRoutes);

// Rotas de Centro de Custo
app.use('/api/cdc', autenticarToken, CentroCustoRoutes);

// Rotas de Função
app.use('/api/funcao', autenticarToken, funcaoRoutes);

// Rotas de Plantas
app.use('/api/plantas', autenticarToken, planasRoutes);

//Rotas de Relatorio
app.use('/api/relatorioRetiRe',autenticarToken, retiradaRealizadaRoute);
// Rotas de login
app.use('/api', loginRoutes);



const distPath = path.resolve(__dirname, 'dist');

app.use(express.static(distPath));

app.get('/', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}...`);
});
