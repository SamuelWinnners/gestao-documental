// ============================================
// ELEMENTOS DO DOM
// ============================================
const loginForm = document.getElementById('loginForm');
const btnLogin = document.getElementById('btnLogin');
const alertContainer = document.getElementById('alertContainer');
const emailInput = document.getElementById('email');
const senhaInput = document.getElementById('senha');
const togglePassword = document.getElementById('togglePassword');

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function showAlert(message, type = 'danger') {
    const iconMap = {
        success: 'check-circle',
        danger: 'exclamation-circle',
        warning: 'exclamation-triangle'
    };

    alertContainer.innerHTML = `
        <div class="alert alert-${type}">
            <i class="fas fa-${iconMap[type]} me-2"></i>${message}
        </div>
    `;
}

function clearAlert() {
    alertContainer.innerHTML = '';
}

function setLoading(loading) {
    btnLogin.disabled = loading;
    btnLogin.innerHTML = loading 
        ? '<span class="spinner"></span>Entrando...'
        : '<i class="fas fa-sign-in-alt me-2"></i>Entrar';
}

// ============================================
// TOGGLE DE VISUALIZAÇÃO DA SENHA
// ============================================
togglePassword.addEventListener('click', () => {
    const type = senhaInput.type === 'password' ? 'text' : 'password';
    senhaInput.type = type;
    
    const icon = togglePassword.querySelector('i');
    if (type === 'password') {
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
        togglePassword.setAttribute('aria-label', 'Mostrar senha');
    } else {
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
        togglePassword.setAttribute('aria-label', 'Ocultar senha');
    }
});

// ============================================
// EVENTO DE SUBMIT DO FORMULÁRIO
// ============================================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const senha = senhaInput.value;

    // Validação básica
    if (!email || !senha) {
        showAlert('Preencha todos os campos', 'warning');
        return;
    }

    setLoading(true);
    clearAlert();

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();

        if (response.ok) {
            // ✅ USAR sessionStorage (expira ao fechar aba)
            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('usuario', JSON.stringify(data.usuario));
            
            showAlert('Login realizado com sucesso! Redirecionando...', 'success');
            
            // Redirecionar após 1 segundo
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            throw new Error(data.error || 'Credenciais inválidas');
        }
    } catch (error) {
        showAlert(error.message || 'Erro ao conectar com o servidor', 'danger');
        setLoading(false);
    }
});

// ============================================
// LIMPAR ALERTAS AO DIGITAR
// ============================================
emailInput.addEventListener('input', clearAlert);
senhaInput.addEventListener('input', clearAlert);

// ============================================
// VERIFICAR SE JÁ ESTÁ LOGADO
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    const token = sessionStorage.getItem('token');
    if (token) {
        window.location.href = '/';
    }
});