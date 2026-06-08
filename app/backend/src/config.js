// =============================================================================
// config.js — Configuração centralizada do servidor
// Carrega as variáveis de ambiente via dotenv
// =============================================================================
require('dotenv').config();

module.exports = {
    JWT_SECRET: process.env.JWT_SECRET || 'TROQUE-ESTA-CHAVE-EM-PRODUCAO',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
    PORT: process.env.PORT || 3000,
    DATABASE_URL: process.env.DATABASE_URL || '',
    NODE_ENV: process.env.NODE_ENV || 'development',
    RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,   // 15 minutos
    RATE_LIMIT_MAX_REQUESTS: 200,            // 200 requests por janela
    LOGIN_RATE_LIMIT_MAX: 10                 // 10 tentativas de login por janela
};