// =============================================================================
// auth.js — Autenticação SEMJEL
// SEGURANÇA:
//   - Nenhum login simulado / fallback sem validação real
//   - Papel do usuário salvo no localStorage para verificação local
//   - Redirect por papel no JWT
//   - Auto-fill de credenciais REMOVIDO de produção
// =============================================================================
'use strict';

const API_URL = window.location.protocol === 'file:'
    ? 'http://localhost:3000/api'
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? `http://${window.location.hostname}:${window.location.port || 3000}/api`
        : '/api';

document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const senhaInput = document.getElementById('senha');
    const togglePwd = document.getElementById('togglePassword');
    const messageBox = document.getElementById('messageBox');
    const messageText = document.getElementById('messageText');
    const messageIcon = document.getElementById('messageIcon');

    // Verificar se já está logado e redirecionar pelo papel
    checkLoginStatus();

    // Mostrar/ocultar senha
    if (togglePwd) {
        togglePwd.addEventListener('click', function () {
            const type = senhaInput.getAttribute('type') === 'password' ? 'text' : 'password';
            senhaInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    // Submissão do formulário
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const email = emailInput.value.trim().toLowerCase();
            const senha = senhaInput.value;

            if (!email || !senha) {
                showMessage('Preencha todos os campos.', 'error');
                return;
            }

            const submitBtn = loginForm.querySelector('.login-btn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Autenticando...';
            submitBtn.disabled = true;

            try {
                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, senha })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Salvar sessão (incluindo papel para verificação local)
                    localStorage.setItem('semjel_token', data.token);
                    localStorage.setItem('semjel_logged_in', 'true');
                    localStorage.setItem('semjel_user_email', data.user.email);
                    localStorage.setItem('semjel_user_name', data.user.nome);
                    localStorage.setItem('semjel_user_id', String(data.user.id));
                    localStorage.setItem('semjel_user_papel', data.user.papel);

                    showMessage('Login realizado! Redirecionando...', 'success');

                    // SEGURANÇA: Redirecionar pelo papel retornado pelo servidor
                    setTimeout(() => {
                        if (data.user.papel === 'admin') {
                            window.location.href = 'admin-dashboard.html';
                        } else {
                            window.location.href = 'dashboard.html';
                        }
                    }, 1200);

                } else {
                    showMessage(data.message || 'Credenciais inválidas.', 'error');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }

            } catch {
                showMessage('Servidor indisponível. Verifique a conexão.', 'error');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Verificar status de login e redirecionar pelo papel
    function checkLoginStatus() {
        const isLoggedIn = localStorage.getItem('semjel_logged_in');
        const papel = localStorage.getItem('semjel_user_papel');
        const page = window.location.pathname;

        // Já logado na página de login → redirecionar para destino certo
        if (isLoggedIn === 'true' && (page.endsWith('index.html') || page.endsWith('/'))) {
            window.location.href = papel === 'admin' ? 'admin-dashboard.html' : 'dashboard.html';
        }
    }

    // Função para mostrar mensagens
    function showMessage(text, type = 'info') {
        messageText.textContent = text;

        // Ícone baseado no tipo
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        messageIcon.className = icons[type] || icons.info;
        messageIcon.style.color = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        }[type];

        // Mostrar caixa
        messageBox.classList.remove('hidden');

        // Auto-esconder após 5 segundos
        setTimeout(() => {
            messageBox.classList.add('hidden');
        }, 5000);
    }

    // (login simulado e auto-fill removidos por segurança)
});

// Logout global
function logout() {
    if (confirm('Deseja realmente sair do sistema?')) {
        ['semjel_token', 'semjel_logged_in', 'semjel_user_email',
            'semjel_user_name', 'semjel_user_id', 'semjel_user_papel'].forEach(k => {
                localStorage.removeItem(k);
            });
        window.location.replace('index.html');
    }
}