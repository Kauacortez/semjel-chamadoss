// =============================================================================
// supabaseClient.js — Cliente de Conexão com o Supabase
// =============================================================================
'use strict';

// ⚠️ ATENÇÃO: Substitua as credenciais abaixo pelas credenciais do seu projeto Supabase.
// Você encontra essas chaves em: Seu Projeto Supabase -> Settings (Engrenagem) -> API
const SUPABASE_URL = "https://szwefdyksxhpxhlfrtmq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6d2VmZHlrc3hocHhobGZpdG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NTU4NDEsImV4cCI6MjA5NzMzMTg0MX0.jCCSlKn6N0gP_LyOMwQyx8WUfKWerTgjNiCMyv91DBw";

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
