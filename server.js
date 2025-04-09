
const express = require("express");
const bodyParser = require('body-parser');
const app = express();
const { initializePool } = require('./src/config/dbConfig');
const usuariosRoutes = require('./src/routes/cadastros/usuarioRoutes');
const funcionarioRoutes = require('./src/routes/cadastros/funcionarioRoutes');
const produtoRoutes = require('./src/routes/cadastros/produtoRoutes');
const loginRoutes = require('./src/routes/loginRoutes');
const apiKeyRoutes = require('./src/routes/apiKeyRoutes');
const imageRoutes = require('./src/routes/imageRoutes');
const videoRoutes = require('./src/routes/videoRoute');//trocar pelo correto no futuro
const CentroCustoRoutes = require('./src/routes/cadastros/CentroCustoRoutes');
const SetorRoutes = require('./src/routes/cadastros/SetorRoutes');
const funcaoRoutes = require('./src/routes/cadastros/funcaoRoutes');
const planasRoutes = require('./src/routes/cadastros/plantaRoutes');
const ClienteRoute = require('./src/routes/cadastros/ClienteRoutes');
const DMRoute = require('./src/routes/cadastros/DMRoutes');
const TermoRoutes = require('./src/routes/cadastros/TermoRoutes');
const HistoricoAbastecimentoRoute = require('./src/routes/relatorios/HistoricoAbastecimentooRoutes')
const UDMRoute = require('./src/routes/cadastros/UsuarioDMRoutes');
const ImportRoute = require('./src/routes/cadastros/ImportRoute');
// const ConsultaStatusRoutes = require('./src/routes/cadastros/ConsultaStatusRoutes');
const LiberacaoAvulsaRoutes = require ('./src/routes/relatorios/LiberacaoAvulsaRoutes')
const SDMRoutes = require('./src/routes/relatorios/SDMRoutes');
const LogRoutes = require('./src/routes/relatorios/LogRoutes');
const retiradaRealizadaRoute = require('./src/routes/relatorios/RetiradasRealizadasRoutes');
const DevolucaoRoutes = require('./src/routes/relatorios/DevolucaoRoutes');
const itemsMaisRetiradosRoutes = require('./src/routes/relatorios/itemsMaisRetiradosRoutes');
const FichasRoutes = require('./src/routes/relatorios/FichasRoutes');
const EstoqueDMRoutes = require('./src/routes/relatorios/EstoqueDMRoutes');
const ItensNaoAlocadosRoutes = require('./src/routes/cadastros/ItensNaoAlocadosRoutes');
const { autenticarToken, autorizarRoles } = require('./src/middleware/authMiddleware');
const DashboardRoutes = require('./src/routes/DashboardRoutes');
const nomadRoutes = require('./src/routes/evento/MonitoramentoRoutes');
const eventoRoutes = require('./src/routes/evento');
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
    origin: '*',  // Permite todas as origens
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // Mantém todos os métodos possíveis
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']  // Permite os cabeçalhos que você usa
  }));

app.options('*', cors());  
// Conectar ao banco de dados
(async () => {
    try {
        await initializePool(); // Inicializa o pool
        console.log("Conexão ao banco de dados pronta para uso!");
    } catch (err) {
        console.error("Erro ao conectar ao banco de dados:", err.message);
        process.exit(1); // Encerra o processo em caso de erro
    }
})();
//Rotas de Cadastro
// Rotas de usuario
app.use('/api/usuarios', autenticarToken, usuariosRoutes);

// Rotas de funcionarios
app.use('/api/funcionarios', autenticarToken, funcionarioRoutes);

// Rotas de produtos
app.use('/api/produtos', autenticarToken, produtoRoutes);

// Rotas de recuperação de Imagem
app.use('/api/image',imageRoutes);

// Rotas de recuperação de Video
app.use('/api/video',videoRoutes);
//Rotas de Evento
app.use('/api/evento',eventoRoutes);
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
app.use('/api/UDM', autenticarToken,autorizarRoles(['Master', 'Operador','Administrador']), UDMRoute);

// Rotas de Relatorio Status DMs
app.use('/api/SDM', autenticarToken,autorizarRoles(['Master', 'Operador']), SDMRoutes);

// Rotas de Relatorio Status DMs
app.use('/api/Log', autenticarToken,autorizarRoles(['Master', 'Operador','Administrador']), LogRoutes);

//Rotas de Relatorio Retirada
app.use('/api/relatorioRetiRe',autenticarToken,autorizarRoles(['Master', 'Operador']), retiradaRealizadaRoute);

//Rotas de Relatorio Retirada
app.use('/api/devolucoes',autenticarToken,autorizarRoles(['Master', 'Operador']), DevolucaoRoutes);

//Rotas de Relatorio Items mais Retirados Itens
app.use('/api/relatorioItems',autenticarToken,autorizarRoles(['Master', 'Operador']), itemsMaisRetiradosRoutes);

//Rotas de Relatório para Fichas Retiradas
app.use('/api/fichasretiradas',autenticarToken,autorizarRoles(['Master', 'Operador']), FichasRoutes);
//Rotas de Relatório para Fichas Retiradas
app.use('/api/naoalocados',autenticarToken,autorizarRoles(['Master', 'Operador']), ItensNaoAlocadosRoutes);

// //Rotas de Relatório para Fichas Avulsas
app.use('/api/liberacaoavulsa',autenticarToken, LiberacaoAvulsaRoutes);

// app.use('/api/consultastatus',autenticarToken, ConsultaStatusRoutes);

//Rotas de Relatorio Items mais Retirados
app.use('/api/Estoque', autenticarToken, autorizarRoles(['Master', 'Operador']), EstoqueDMRoutes);

//Rotas de Relatorio Historico Abastecimento
app.use('/api/HistoricoAbastecimento', autenticarToken, autorizarRoles(['Master', 'Operador']), HistoricoAbastecimentoRoute);

// Rotas de Texto
app.use('/api/termo',autenticarToken,autorizarRoles(['Master']), TermoRoutes);

// Rotas de Texto
app.use('/api/import',autenticarToken,autorizarRoles(['Master']), ImportRoute);

// Rotas de login
app.use('/api', loginRoutes);

app.use('/api/key',autenticarToken, apiKeyRoutes);

// Rotas de cliente para admin
app.use('/api/admin/cliente',autenticarToken, autorizarRoles(['Administrador','Master','Operador' ]), ClienteRoute);

app.use('/api/dashboard',autenticarToken, autorizarRoles(['Administrador','Master','Operador' ]), DashboardRoutes);

app.use('/api/nomad', nomadRoutes);

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
