-- =============================================================================
-- SQL SETUP SCRIPT - SEMJEL CHAMADOS (SUPABASE)
-- Execute este script no SQL Editor do seu painel do Supabase.
-- =============================================================================

-- Habilitar a extensão UUID se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. LIMPAR ESTRUTURA EXISTENTE (SE HOUVER) ─────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.is_admin_or_tecnico(uuid);
DROP TABLE IF EXISTS public.observacoes_chamado;
DROP TABLE IF EXISTS public.chamados;
DROP TABLE IF EXISTS public.usuarios;

-- ── 2. TABELA DE USUÁRIOS ─────────────────────────────────────────────────────
-- Vinculada diretamente à tabela de autenticação do Supabase (auth.users)
CREATE TABLE public.usuarios (
    id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome       TEXT NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    setor      TEXT DEFAULT 'A Definir',
    papel      TEXT DEFAULT 'usuario' CHECK(papel IN ('admin', 'usuario', 'tecnico')),
    ativo      BOOLEAN DEFAULT TRUE,
    criado_em  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. TABELA DE CHAMADOS ─────────────────────────────────────────────────────
CREATE TABLE public.chamados (
    id                 SERIAL PRIMARY KEY,
    titulo             TEXT NOT NULL,
    descricao          TEXT NOT NULL,
    categoria          TEXT DEFAULT 'outros',
    prioridade         TEXT DEFAULT 'normal' CHECK(prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
    status             TEXT DEFAULT 'aberto' CHECK(status IN ('aberto', 'em_andamento', 'resolvido', 'fechado')),
    usuario_id         UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    usuario_nome       TEXT NOT NULL,
    usuario_setor      TEXT NOT NULL,
    setor_solicitante  TEXT NOT NULL,
    telefone_contato   TEXT,
    tecnico_id         UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    tecnico_nome       TEXT,
    prazo_sla          TIMESTAMPTZ,
    data_resolucao     TIMESTAMPTZ,
    data_abertura      TIMESTAMPTZ DEFAULT NOW(),
    anexo_url          TEXT
);

-- ── 4. TABELA DE OBSERVAÇÕES DOS CHAMADOS ────────────────────────────────────
CREATE TABLE public.observacoes_chamado (
    id          SERIAL PRIMARY KEY,
    chamado_id  INTEGER NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
    admin_id    UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    admin_nome  TEXT NOT NULL,
    observacao  TEXT NOT NULL,
    criado_em   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. FUNÇÕES AUXILIARES E TRIGGERS ─────────────────────────────────────────

-- Função para verificar se um usuário é Admin ou Técnico
CREATE OR REPLACE FUNCTION public.is_admin_or_tecnico(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = user_uuid AND papel IN ('admin', 'tecnico') AND ativo = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para sincronizar novos usuários do Supabase Auth com a tabela pública usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  nome_usuario TEXT;
  setor_usuario TEXT;
  papel_usuario TEXT;
BEGIN
  -- Extrair dados do metadata do Supabase Auth ou do email
  nome_usuario := coalesce(
    new.raw_user_meta_data->>'nome', 
    initcap(split_part(new.email, '@', 1))
  );
  setor_usuario := coalesce(new.raw_user_meta_data->>'setor', 'A Definir');
  
  -- Se for o primeiro usuário do banco, dar cargo de admin, senão usuario
  IF NOT EXISTS (SELECT 1 FROM public.usuarios) OR new.email = 'ti@semjel.gov.br' THEN
    papel_usuario := 'admin';
  ELSE
    papel_usuario := coalesce(new.raw_user_meta_data->>'papel', 'usuario');
  END IF;

  INSERT INTO public.usuarios (id, nome, email, setor, papel, ativo)
  VALUES (
    new.id,
    nome_usuario,
    new.email,
    setor_usuario,
    papel_usuario,
    true
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar o trigger de criação automática de usuário
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 6. ROW LEVEL SECURITY (RLS) POLICIES ──────────────────────────────────────

-- Ativar RLS nas tabelas
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observacoes_chamado ENABLE ROW LEVEL SECURITY;

-- Políticas para: usuarios
CREATE POLICY "Permitir leitura de usuários autenticados" ON public.usuarios
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir atualização do próprio usuário" ON public.usuarios
    FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Admin tem controle total sobre os usuários" ON public.usuarios
    FOR ALL TO authenticated USING (
      EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND papel = 'admin')
    );

-- Políticas para: chamados
CREATE POLICY "Leitura de chamados (proprietário ou técnico/admin)" ON public.chamados
    FOR SELECT TO authenticated USING (
      usuario_id = auth.uid() OR public.is_admin_or_tecnico(auth.uid())
    );

CREATE POLICY "Qualquer usuário logado pode criar chamados" ON public.chamados
    FOR INSERT TO authenticated WITH CHECK (
      usuario_id = auth.uid()
    );

CREATE POLICY "Edição de chamados (somente técnico/admin)" ON public.chamados
    FOR UPDATE TO authenticated USING (
      public.is_admin_or_tecnico(auth.uid())
    );

CREATE POLICY "Deleção de chamados (somente admin)" ON public.chamados
    FOR DELETE TO authenticated USING (
      EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND papel = 'admin')
    );

-- Políticas para: observacoes_chamado
CREATE POLICY "Leitura de observações por usuários do chamado ou técnicos" ON public.observacoes_chamado
    FOR SELECT TO authenticated USING (
      EXISTS (
        SELECT 1 FROM public.chamados 
        WHERE id = chamado_id AND (usuario_id = auth.uid() OR public.is_admin_or_tecnico(auth.uid()))
      )
    );

CREATE POLICY "Criação de observações por técnicos e admins" ON public.observacoes_chamado
    FOR INSERT TO authenticated WITH CHECK (
      public.is_admin_or_tecnico(auth.uid()) AND admin_id = auth.uid()
    );

-- ── 7. CRIAR USUÁRIO ADMIN PADRÃO (INSTRUÇÕES) ────────────────────────────────
-- Nota: Para criar o admin padrão, basta se registrar na interface do sistema 
-- usando o e-mail 'ti@semjel.gov.br' ou criar uma conta pelo painel do Supabase
-- (Auth -> Add User) com as seguintes propriedades no metadata:
--   { "nome": "Admin TI", "setor": "TI", "papel": "admin" }
