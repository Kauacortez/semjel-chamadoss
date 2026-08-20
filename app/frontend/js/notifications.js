// =============================================================================
// notifications.js — Sistema de Notificações Sonoras e Visuais (SEMJEL TI)
// Notificações Desktop (WhatsApp style), Som via Web Audio API e Toasts
// =============================================================================
'use strict';

let audioCtx = null;
let audioDesbloqueado = false;
let mensagensProcessadas = new Set();
let canalRealtimeSupabase = null;
let intervalPollingNotificacoes = null;
let ultimoTimestampChecagem = new Date(Date.now() - 30000).toISOString();

// ─── 1. Desbloqueio e Síntese de Som (Web Audio API) ─────────────────────────
function desbloquearAudio() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    audioDesbloqueado = true;
}

// Desbloquear áudio na primeira interação do usuário na página
['click', 'touchstart', 'keydown'].forEach(evt => {
    document.addEventListener(evt, () => desbloquearAudio(), { once: true });
});

function tocarSomNotificacao() {
    try {
        desbloquearAudio();
        if (!audioCtx) return;

        const agora = audioCtx.currentTime;

        // Primeiro tom: 587.33 Hz (D5)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, agora);
        gain1.gain.setValueAtTime(0.25, agora);
        gain1.gain.exponentialRampToValueAtTime(0.001, agora + 0.18);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(agora);
        osc1.stop(agora + 0.18);

        // Segundo tom: 880 Hz (A5) — mais agudo e agradável
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, agora + 0.09);
        gain2.gain.setValueAtTime(0.3, agora + 0.09);
        gain2.gain.exponentialRampToValueAtTime(0.001, agora + 0.38);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(agora + 0.09);
        osc2.stop(agora + 0.38);
    } catch (e) {
        console.warn('[NOTIFICAÇÃO ÁUDIO]', e);
    }
}

// ─── 2. Permissão e Notificação Nativa Desktop (Área de Trabalho) ────────────
async function solicitarPermissaoNotificacoes() {
    if (!('Notification' in window)) {
        console.warn('Este navegador não suporta notificações nativas da área de trabalho.');
        return 'unsupported';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    try {
        const permissao = await Notification.requestPermission();
        atualizarBotoesNotificacaoUI();
        if (permissao === 'granted') {
            tocarSomNotificacao();
            new Notification('SEMJEL TI — Notificações Ativadas! 🔔', {
                body: 'Você receberá avisos sonoros e visuais quando responderem aos seus chamados.',
                icon: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png'
            });
        }
        return permissao;
    } catch (err) {
        console.error('Erro ao solicitar permissão de notificações:', err);
        return Notification.permission;
    }
}

function dispararNotificacaoNativa(titulo, corpo, onClickCallback) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }

    try {
        const notif = new Notification(titulo, {
            body: corpo,
            icon: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png',
            tag: 'semjel-chat-' + Date.now(),
            renotify: true,
            silent: true // Usamos o nosso sintetizador Web Audio API customizado
        });

        notif.onclick = function (event) {
            event.preventDefault();
            window.focus();
            notif.close();
            if (typeof onClickCallback === 'function') {
                onClickCallback();
            }
        };
    } catch (e) {
        console.warn('[NOTIFICAÇÃO NATIVA FALHOU]', e);
    }
}

// ─── 3. Toast Flutuante Interno (Dentro do Site) ────────────────────────────
function criarContainerToastsSeNaoExistir() {
    let container = document.getElementById('semjelToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'semjelToastContainer';
        container.className = 'semjel-toast-container';
        document.body.appendChild(container);
    }
    return container;
}

function dispararToastInApp(titulo, autor, mensagem, onClickCallback) {
    const container = criarContainerToastsSeNaoExistir();

    const toast = document.createElement('div');
    toast.className = 'semjel-chat-toast';

    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-comment-dots"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${titulo}</div>
            <div class="toast-body"><strong>${autor}:</strong> ${escapeHTMLToast(mensagem)}</div>
            <div class="toast-action">
                <span class="toast-btn">Clique para abrir a conversa &rarr;</span>
            </div>
        </div>
        <button class="toast-close" title="Fechar">&times;</button>
    `;

    // Eventos
    const btnClose = toast.querySelector('.toast-close');
    btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        removerToast(toast);
    });

    toast.addEventListener('click', () => {
        removerToast(toast);
        if (typeof onClickCallback === 'function') {
            onClickCallback();
        }
    });

    container.appendChild(toast);

    // Auto remover após 7 segundos
    setTimeout(() => {
        removerToast(toast);
    }, 7000);
}

function removerToast(toastEl) {
    if (!toastEl || !toastEl.parentElement) return;
    toastEl.classList.add('fade-out');
    setTimeout(() => {
        if (toastEl.parentElement) {
            toastEl.remove();
        }
    }, 300);
}

function escapeHTMLToast(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ─── 4. Disparo Central de Notificações ──────────────────────────────────────
function emitirNotificacaoCompleta({ chamadoId, autorNome, mensagem, onClick }) {
    // 1. Toca o som característico
    tocarSomNotificacao();

    const titulo = `SEMJEL TI — Chamado #CH-${String(chamadoId).padStart(4, '0')}`;
    const corpo = `${autorNome}: ${mensagem}`;

    // 2. Notificação nativa da área de trabalho (estilo WhatsApp)
    dispararNotificacaoNativa(titulo, corpo, onClick);

    // 3. Notificação visual flutuante dentro do site
    dispararToastInApp(`Chamado #CH-${String(chamadoId).padStart(4, '0')}`, autorNome, mensagem, onClick);
}

// ─── 5. Atualização dos Botões de UI ─────────────────────────────────────────
function atualizarBotoesNotificacaoUI() {
    const btns = document.querySelectorAll('.btn-ativar-notificacoes');
    btns.forEach(btn => {
        if (!('Notification' in window)) {
            btn.style.display = 'none';
            return;
        }
        if (Notification.permission === 'granted') {
            btn.innerHTML = '<i class="fas fa-bell"></i> Notificações Ativas';
            btn.classList.add('granted');
            btn.title = 'Notificações sonoras e na área de trabalho estão ativadas';
        } else if (Notification.permission === 'denied') {
            btn.innerHTML = '<i class="fas fa-bell-slash"></i> Notificações Bloqueadas';
            btn.classList.add('denied');
            btn.title = 'As notificações estão bloqueadas nas configurações do seu navegador.';
        } else {
            btn.innerHTML = '<i class="fas fa-bell"></i> Ativar Notificações';
            btn.classList.remove('granted', 'denied');
            btn.title = 'Clique para ativar notificações sonoras e na área de trabalho quando houver novas mensagens.';
        }
    });
}

// ─── 6. Monitoramento de Mensagens em Tempo Real + Polling ───────────────────
function iniciarMonitoramentoNotificacoes(config) {
    const { userId, papel, onMensagemRecebida, onAbrirChamado } = config;
    const client = window.supabaseClient;
    if (!client || !userId) return;

    atualizarBotoesNotificacaoUI();

    // 1. Carregar IDs de mensagens existentes nos últimos minutos para não disparar alerta antigo
    client.from('mensagens_chamado')
        .select('id')
        .order('id', { ascending: false })
        .limit(40)
        .then(({ data }) => {
            if (data) {
                data.forEach(m => mensagensProcessadas.add(m.id));
            }
        }).catch(console.warn);

    // 2. Configurar Canal Realtime do Supabase
    try {
        if (canalRealtimeSupabase) {
            client.removeChannel(canalRealtimeSupabase);
        }

        canalRealtimeSupabase = client.channel('notificacoes-chat-global')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'mensagens_chamado' },
                payload => {
                    processarNovaMensagem(payload.new, config);
                }
            )
            .subscribe();
    } catch (e) {
        console.warn('[REALTIME NOTIFICAÇÃO]', e);
    }

    // 3. Polling resiliente a cada 6 segundos (garante funcionamento mesmo se Realtime desconectar)
    if (intervalPollingNotificacoes) {
        clearInterval(intervalPollingNotificacoes);
    }

    intervalPollingNotificacoes = setInterval(async () => {
        try {
            const { data: novasMensagens, error } = await client
                .from('mensagens_chamado')
                .select('*')
                .gt('criado_em', ultimoTimestampChecagem)
                .order('criado_em', { ascending: true });

            if (error) throw error;

            if (novasMensagens && novasMensagens.length > 0) {
                ultimoTimestampChecagem = novasMensagens[novasMensagens.length - 1].criado_em;
                novasMensagens.forEach(msg => processarNovaMensagem(msg, config));
            }
        } catch (err) {
            // Silencioso em caso de erro momentâneo de rede
        }
    }, 6000);
}

async function processarNovaMensagem(msg, config) {
    if (!msg || !msg.id || mensagensProcessadas.has(msg.id)) {
        return;
    }

    mensagensProcessadas.add(msg.id);

    // Se a mensagem foi enviada pelo próprio usuário logado, ignorar
    if (String(msg.usuario_id) === String(config.userId)) {
        return;
    }

    // Se for usuário comum, verificar se a mensagem pertence a um chamado dele
    if (config.papel === 'usuario') {
        const client = window.supabaseClient;
        try {
            const { data: ch } = await client
                .from('chamados')
                .select('id, usuario_id')
                .eq('id', msg.chamado_id)
                .single();

            if (!ch || String(ch.usuario_id) !== String(config.userId)) {
                return; // Não é um chamado deste usuário
            }
        } catch (e) {
            return;
        }
    }

    // Disparar o som e notificação
    emitirNotificacaoCompleta({
        chamadoId: msg.chamado_id,
        autorNome: msg.usuario_nome || 'Atendente TI',
        mensagem: msg.mensagem,
        onClick: () => {
            if (typeof config.onAbrirChamado === 'function') {
                config.onAbrirChamado(msg.chamado_id);
            }
        }
    });

    // Se houver callback de interface (ex: chat aberto naquele chamado), atualizar mensagens
    if (typeof config.onMensagemRecebida === 'function') {
        config.onMensagemRecebida(msg);
    }
}

// Expor para o escopo global
window.tocarSomNotificacao = tocarSomNotificacao;
window.solicitarPermissaoNotificacoes = solicitarPermissaoNotificacoes;
window.dispararNotificacaoNativa = dispararNotificacaoNativa;
window.dispararToastInApp = dispararToastInApp;
window.emitirNotificacaoCompleta = emitirNotificacaoCompleta;
window.iniciarMonitoramentoNotificacoes = iniciarMonitoramentoNotificacoes;
window.atualizarBotoesNotificacaoUI = atualizarBotoesNotificacaoUI;
