-- =============================================================================
-- MIGRATION SCRIPT FOR ONLINE SUPABASE DATABASE
-- Cole e execute este script no SQL Editor do seu painel do Supabase
-- =============================================================================

-- 1. Adicionar colunas de rastreio de acesso na tabela usuarios
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMPTZ;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS total_acessos INTEGER DEFAULT 0;

-- 2. Criar tabela de mensagens do chat por chamado (se não existir)
CREATE TABLE IF NOT EXISTS public.mensagens_chamado (
    id           SERIAL PRIMARY KEY,
    chamado_id   INTEGER NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
    usuario_id   UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    usuario_nome TEXT NOT NULL,
    papel        TEXT NOT NULL,
    mensagem     TEXT NOT NULL,
    criado_em    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS (Row Level Security) para a tabela de mensagens
ALTER TABLE public.mensagens_chamado ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de acesso (Security Policies) para o chat
DROP POLICY IF EXISTS "Leitura de mensagens por usuários autorizados" ON public.mensagens_chamado;
CREATE POLICY "Leitura de mensagens por usuários autorizados" ON public.mensagens_chamado
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.chamados 
            WHERE id = chamado_id AND (usuario_id = auth.uid() OR public.is_admin_or_tecnico(auth.uid()))
        )
    );

DROP POLICY IF EXISTS "Envio de mensagens por usuários autorizados" ON public.mensagens_chamado;
CREATE POLICY "Envio de mensagens por usuários autorizados" ON public.mensagens_chamado
    FOR INSERT TO authenticated WITH CHECK (
        usuario_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.chamados 
            WHERE id = chamado_id AND (usuario_id = auth.uid() OR public.is_admin_or_tecnico(auth.uid()))
        )
    );
