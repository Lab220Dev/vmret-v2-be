
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
const SetorRoutes = require('./src/routes/cadastros/SetorRoutes');
const funcaoRoutes = require('./src/routes/cadastros/funcaoRoutes');
const planasRoutes = require('./src/routes/cadastros/plantaRoutes');
const ClienteRoute = require('./src/routes/cadastros/ClienteRoutes');
const DMRoute = require('./src/routes/cadastros/DMRoutes');
const UDMRoute = require('./src/routes/cadastros/UsuarioDMRoutes');
const SDMRoutes = require('./src/routes/relatorios/SDMRoutes');
const retiradaRealizadaRoute = require('./src/routes/relatorios/RetiradasRealizadasRoutes');
const itemsMaisRetiradosRoutes = require('./src/routes/relatorios/itemsMaisRetiradosRoutes');
const FichasRoutes = require('./src/routes/relatorios/FichasRoutes');
const EstoqueDMRoutes = require('./src/routes/relatorios/EstoqueDMRoutes');
const autenticarToken = require('./src/middleware/authMiddleware');
const history = require('connect-history-api-fallback');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { gerarPDF } = require("./src/controllers/relatorios/FichasController");
require('dotenv').config();

app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

app.use(history({
    disableDotRule: true,
    verbose: false,
    rewrites: [
        { from: /^\/api\/.*$/, to: (context) => context.parsedUrl.pathname },
        { from: /^\/uploads\/.*$/, to: (context) => context.parsedUrl.pathname }
    ]
}));
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

// Rotas de Centro de Custo
app.use('/api/Setor', autenticarToken, SetorRoutes);

// Rotas de Função
app.use('/api/funcao', autenticarToken, funcaoRoutes);

// Rotas de Plantas
app.use('/api/plantas', autenticarToken, planasRoutes);

// Rotas de DMs
app.use('/api/DM', autenticarToken, DMRoute);

// Rotas de Usuarios DMs
app.use('/api/UDM', autenticarToken, UDMRoute);

// Rotas de Relatorio Status DMs
app.use('/api/SDM', autenticarToken, SDMRoutes);

//Rotas de Relatorio Retirada
app.use('/api/relatorioRetiRe',autenticarToken, retiradaRealizadaRoute);

//Rotas de Relatorio Items mais Retirados Itens
app.use('/api/relatorioItems',autenticarToken, itemsMaisRetiradosRoutes);

app.use('/api/fichasRetiradas',autenticarToken, FichasRoutes);

// APP.use ('/api/gerarPDF.php', autenticarToken)


//Rotas de Relatorio Items mais Retirados
app.use('/api/Estoque',autenticarToken, EstoqueDMRoutes);



// Rotas de login
app.use('/api', loginRoutes);

// Rotas de cliente para admin
app.use('/api/admin/cliente', ClienteRoute);


app.get('*', (req, res) => {
    const accept = req.headers.accept || '';
    if (accept.includes('text/html')) {
        res.sendFile(path.join(distPath, 'index.html'));
    } else {
        res.status(404).send('Not Found');
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}...`);
});
