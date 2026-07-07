// =============================================================================
// auth.controller.js — Login e Registro de Usuários
// Atualizado para PostgreSQL (placeholders $1, $2, ...)
// =============================================================================
require('dotenv').config();
const { database } = require('../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');

async function login(req, res) {
    try {
        const { email, senha } = req.body;

        // ── Validação de input ─────────────────────────────────────────────
        if (!email || !senha) {
            return res.status(400).json({
                success: false,
                message: 'Email e senha são obrigatórios'
            });
        }

        const emailLimpo = email.trim().toLowerCase();

        // SEGURANÇA: Validar domínio institucional
        if (!emailLimpo.endsWith('@semjel.gov.br')) {
            return res.status(400).json({
                success: false,
                message: 'Use email institucional @semjel.gov.br'
            });
        }

        // SEGURANÇA: Limitar tamanho dos campos
        if (emailLimpo.length > 100 || senha.length > 128) {
            return res.status(400).json({ success: false, message: 'Dados inválidos' });
        }

        // ── Buscar usuário ─────────────────────────────────────────────────
        const usuario = await database.get(
            'SELECT * FROM usuarios WHERE email = $1',
            [emailLimpo]
        );

        // Se não existe, criar novo usuário automaticamente
        if (!usuario) {
            const parteNome = emailLimpo.split('@')[0];
            const nome = parteNome
                .replace(/[^a-zA-Z.]/g, '')
                .split('.')
                .map(p => p.charAt(0).toUpperCase() + p.slice(1))
                .join(' ');

            const senhaHash = await bcrypt.hash(senha, 10);

            const novoUsuario = await database.get(
                `INSERT INTO usuarios (nome, email, senha_hash, setor, papel)
                 VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, email, setor, papel`,
                [nome || 'Usuário SEMJEL', emailLimpo, senhaHash, 'A Definir', 'usuario']
            );

            const token = jwt.sign(
                {
                    id: novoUsuario.id,
                    email: novoUsuario.email,
                    papel: novoUsuario.papel,
                    nome: novoUsuario.nome,
                    setor: novoUsuario.setor
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            return res.json({
                success: true,
                token,
                user: {
                    id: novoUsuario.id,
                    nome: novoUsuario.nome,
                    email: novoUsuario.email,
                    setor: novoUsuario.setor,
                    papel: novoUsuario.papel
                }
            });
        }

        // ── Verificar se o usuário está ativo ──────────────────────────────
        if (!usuario.ativo) {
            return res.status(403).json({
                success: false,
                message: 'Conta desativada. Contate o setor de TI.'
            });
        }

        // ── Verificar senha ────────────────────────────────────────────────
        const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
        if (!senhaValida) {
            return res.status(401).json({
                success: false,
                message: 'Credenciais inválidas'
            });
        }

        // ── Registrar acesso ───────────────────────────────────────────────
        await database.run(
            'UPDATE usuarios SET ultimo_acesso = NOW(), total_acessos = COALESCE(total_acessos, 0) + 1 WHERE id = $1',
            [usuario.id]
        );

        // ── Gerar token JWT ────────────────────────────────────────────────
        const token = jwt.sign(
            {
                id: usuario.id,
                email: usuario.email,
                papel: usuario.papel,
                nome: usuario.nome,
                setor: usuario.setor
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({
            success: true,
            token,
            user: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                setor: usuario.setor,
                papel: usuario.papel
            }
        });


    } catch (error) {
        console.error('[AUTH] Erro no login:', error.message);
        res.status(500).json({ success: false, message: 'Erro interno. Tente novamente.' });
    }
}

module.exports = { login };