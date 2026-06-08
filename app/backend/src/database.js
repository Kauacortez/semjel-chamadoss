// =============================================================================
// database.js — Banco de dados PostgreSQL (Neon)
// Substitui o SQLite local por um banco de dados online persistente.
// Pool de conexões para suportar múltiplos acessos simultâneos.
// =============================================================================
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Pool de conexões com o PostgreSQL (Neon)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false  // Necessário para conexão com Neon/Render
    }
});

// Wrapper assíncrono compatível com a interface anterior (run/get/all)
const database = {
    // Executa INSERT, UPDATE, DELETE — retorna { id, changes }
    async run(sql, params = []) {
        const client = await pool.connect();
        try {
            const result = await client.query(sql, params);
            return {
                id: result.rows[0]?.id || null,
                changes: result.rowCount
            };
        } finally {
            client.release();
        }
    },

    // Busca uma única linha — equivale ao sqlite3 get()
    async get(sql, params = []) {
        const client = await pool.connect();
        try {
            const result = await client.query(sql, params);
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    },

    // Busca múltiplas linhas — equivale ao sqlite3 all()
    async all(sql, params = []) {
        const client = await pool.connect();
        try {
            const result = await client.query(sql, params);
            return result.rows || [];
        } finally {
            client.release();
        }
    }
};

// =============================================================================
// Criação das tabelas (idempotente — CREATE TABLE IF NOT EXISTS)
// =============================================================================
async function criarTabelas() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ── Tabela de Usuários ────────────────────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id         SERIAL PRIMARY KEY,
                nome       TEXT NOT NULL,
                email      TEXT UNIQUE NOT NULL,
                senha_hash TEXT NOT NULL,
                setor      TEXT DEFAULT 'TI',
                papel      TEXT DEFAULT 'usuario' CHECK(papel IN ('admin', 'usuario', 'tecnico')),
                ativo      BOOLEAN DEFAULT TRUE,
                criado_em  TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // ── Tabela de Chamados ────────────────────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS chamados (
                id                 SERIAL PRIMARY KEY,
                titulo             TEXT NOT NULL,
                descricao          TEXT NOT NULL,
                categoria          TEXT DEFAULT 'outros',
                prioridade         TEXT DEFAULT 'normal' CHECK(prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
                status             TEXT DEFAULT 'aberto' CHECK(status IN ('aberto', 'em_andamento', 'resolvido', 'fechado')),
                usuario_id         INTEGER NOT NULL REFERENCES usuarios(id),
                usuario_nome       TEXT NOT NULL,
                usuario_setor      TEXT NOT NULL,
                setor_solicitante  TEXT NOT NULL,
                telefone_contato   TEXT,
                tecnico_id         INTEGER REFERENCES usuarios(id),
                tecnico_nome       TEXT,
                prazo_sla          TIMESTAMPTZ,
                data_resolucao     TIMESTAMPTZ,
                data_abertura      TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // ── Tabela de Observações dos Técnicos ────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS observacoes_chamado (
                id          SERIAL PRIMARY KEY,
                chamado_id  INTEGER NOT NULL REFERENCES chamados(id),
                admin_id    INTEGER NOT NULL REFERENCES usuarios(id),
                admin_nome  TEXT NOT NULL,
                observacao  TEXT NOT NULL,
                criado_em   TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // ── Criar admin padrão (sem duplicar) ─────────────────────────────────
        const adminExiste = await client.query(
            "SELECT id FROM usuarios WHERE email = 'ti@semjel.gov.br'"
        );
        if (adminExiste.rows.length === 0) {
            const hash = await bcrypt.hash('semjel123', 10);
            await client.query(
                `INSERT INTO usuarios (nome, email, senha_hash, setor, papel)
                 VALUES ($1, $2, $3, $4, $5)`,
                ['Admin TI', 'ti@semjel.gov.br', hash, 'TI', 'admin']
            );
        }

        await client.query('COMMIT');
        console.log('✅ Banco de dados PostgreSQL inicializado com sucesso');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro ao inicializar banco de dados:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

// Inicializar tabelas ao carregar o módulo
criarTabelas().catch((err) => {
    console.error('❌ Falha crítica no banco de dados:', err.message);
    process.exit(1);
});

module.exports = { database, pool };