// =============================================================================
// supabaseClient.js — Cliente de Conexão com o Supabase
// =============================================================================
'use strict';

// ⚠️ ATENÇÃO: Substitua as credenciais abaixo pelas credenciais do seu projeto Supabase.
// Você encontra essas chaves em: Seu Projeto Supabase -> Settings (Engrenagem) -> API
const SUPABASE_URL = "https://szwefdyksxhpxhlfrtmq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_SP_gw0BGlcAB9xg95iUg4g_Hsq9is7B";

let supabaseClient = null;

if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.error("❌ Erro: O SDK do Supabase não foi carregado. Certifique-se de incluir a tag <script> do Supabase antes deste arquivo.");
}

// Expor globalmente para ser usado pelos demais arquivos JS
window.supabaseClient = supabaseClient;
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
