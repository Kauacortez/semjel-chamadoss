// =============================================================================
// middleware/auth.js — Middlewares de Autenticação e Autorização
// Inclui autorizarTecnico para papéis admin e tecnico
// =============================================================================
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

function autenticar(req, res, next) {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Acesso negado. Token não fornecido.' });
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token || token.length < 10) {
        return res.status(401).json({ success: false, message: 'Token inválido.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (!decoded.id || !decoded.email || !decoded.papel) {
            return res.status(401).json({ success: false, message: 'Token com payload inválido.' });
        }

        req.usuario = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Sessão expirada. Faça login novamente.' });
        }
        return res.status(401).json({ success: false, message: 'Token inválido ou expirado.' });
    }
}

// Somente administradores
function autorizarAdmin(req, res, next) {
    if (!req.usuario || req.usuario.papel !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Acesso restrito. Permissão de administrador necessária.'
        });
    }
    next();
}

// Administradores E técnicos
function autorizarTecnico(req, res, next) {
    if (!req.usuario || !['admin', 'tecnico'].includes(req.usuario.papel)) {
        return res.status(403).json({
            success: false,
            message: 'Acesso restrito. Permissão de técnico ou administrador necessária.'
        });
    }
    next();
}

module.exports = { autenticar, autorizarAdmin, autorizarTecnico };