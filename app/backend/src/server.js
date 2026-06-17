// =============================================================================
// server.js — Servidor principal do Sistema de Chamados SEMJEL
// =============================================================================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const {
    PORT: SERVER_PORT,
    RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS,
    LOGIN_RATE_LIMIT_MAX,
    NODE_ENV
} = require('./config');

// Rotas
const authRoutes    = require('./routes/auth.routes');
const chamadosRoutes = require('./routes/chamados.routes');
const adminRoutes   = require('./routes/admin.routes');
const tecnicoRoutes = require('./routes/tecnico.routes');

const { database } = require('./database');

// Testar conexão com banco ao iniciar
(async () => {
    try {
        await database.get('SELECT 1 AS test');
        console.log('✅ Banco de dados conectado (PostgreSQL)');
    } catch (error) {
        console.error('❌ Erro no banco de dados:', error.message);
        process.exit(1);
    }
})();

const app = express();

// =============================================================================
// SEGURANÇA: Helmet
// =============================================================================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// =============================================================================
// CORS — Aberto para desenvolvimento, restrito em produção
// =============================================================================
const corsOptions = NODE_ENV === 'production'
    ? { origin: process.env.FRONTEND_URL || true, credentials: true }
    : { origin: '*' };

app.use(cors(corsOptions));

// =============================================================================
// Rate Limiting
// =============================================================================
const limiterGlobal = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_REQUESTS,
    message: { success: false, message: 'Muitas requisições. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
});

const limiterLogin = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: LOGIN_RATE_LIMIT_MAX,
    message: { success: false, message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/', limiterGlobal);
app.use('/api/auth/login', limiterLogin);

// =============================================================================
// Middlewares gerais
// =============================================================================
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// =============================================================================
// FRONTEND — Servir arquivos estáticos
// =============================================================================
const frontendPath = path.join(__dirname, '..', '..', 'frontend');
app.use(express.static(frontendPath));

app.get('/', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(frontendPath, 'dashboard.html')));
app.get('/novo-chamado', (req, res) => res.sendFile(path.join(frontendPath, 'novo-chamado.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(frontendPath, 'admin-dashboard.html')));

// =============================================================================
// API — Rotas
// =============================================================================
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'postgresql' });
});

app.use('/api/auth', authRoutes);
app.use('/api', chamadosRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tecnico', tecnicoRoutes);

// =============================================================================
// Tratamento global de erros
// =============================================================================
app.use((err, req, res, next) => {
    console.error('[ERRO GLOBAL]', err.message);
    res.status(500).json({ success: false, message: 'Erro interno do servidor. Tente novamente mais tarde.' });
});

// 404
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Recurso não encontrado' });
});

// =============================================================================
// Iniciar servidor
// =============================================================================
if (process.env.VERCEL !== '1') {
    const PORT = SERVER_PORT;
    app.listen(PORT, '0.0.0.0', () => {
        console.log('='.repeat(50));
        console.log(`🚀 Servidor SEMJEL: http://localhost:${PORT}`);
        console.log(`🗄️  Banco: PostgreSQL (Neon)`);
        console.log(`🔒 Segurança: Helmet + Rate-Limit ativos`);
        console.log(`🌐 Ambiente: ${NODE_ENV}`);
        console.log('='.repeat(50));
    });
}

module.exports = app;