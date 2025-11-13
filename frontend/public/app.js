// frontend/app.js

// ✅ URL para PRODUÇÃO - SEU BACKEND NO VERCEL
// ✅ URL para desenvolvimento vs produção
const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : 'https://gestao-documental-production.up.railway.app/api';

// ✅ CSS PARA CALENDÁRIO
const calendarioCSS = `
<style id="calendario-css">
.calendario-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    background-color: #dee2e6;
    border: 1px solid #dee2e6;
}

.calendario-dia {
    background: white;
    min-height: 100px;
    padding: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 2px solid transparent;
}

.calendario-dia:hover {
    background: #f8f9fa;
    border-color: #007bff;
}

.calendario-dia.hoje {
    background: #e7f3ff;
    border-color: #007bff;
}

.calendario-dia.com-vencimentos {
    background: #ffe6e6;
    border-color: #dc3545;
}

.calendario-dia.com-proximos {
    background: #fff3cd;
    border-color: #ffc107;
}

.calendario-dia.com-documentos {
    background: #f8f9fa;
}

.dia-numero {
    font-weight: bold;
    margin-bottom: 4px;
}

.documentos-info {
    font-size: 0.75rem;
}

.indicadores-status {
    display: flex;
    gap: 2px;
    margin-top: 2px;
}

.indicador-vencido, .indicador-proximo, .indicador-normal {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: inline-block;
}

.indicador-vencido {
    background-color: #dc3545;
}

.indicador-proximo {
    background-color: #ffc107;
}

.indicador-normal {
    background-color: #28a745;
}

.calendario-header {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    background: #343a40;
    color: white;
    font-weight: bold;
}

.calendario-dia-header {
    padding: 8px;
    text-align: center;
    font-size: 0.875rem;
}

.calendario-dia.vazio {
    background: #f8f9fa;
    cursor: default;
}

.calendario-dia.vazio:hover {
    background: #f8f9fa;
    border-color: transparent;
}

/* Cards de documentos no modal */
.documentos-dia .card {
    transition: transform 0.2s ease;
}

.documentos-dia .card:hover {
    transform: translateY(-2px);
}
</style>
`;

// ✅ INJETAR CSS NO HEAD
function injetarCSSCalendario() {
    if (!document.getElementById('calendario-css')) {
        const style = document.createElement('style');
        style.id = 'calendario-css';
        style.textContent = calendarioCSS;
        document.head.appendChild(style);
    }
}

// ============================
// ✅ CLASSE DE AUTENTICAÇÃO
// ============================
class Auth {
    constructor() {
        this.token = localStorage.getItem('token');
        this.usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        this.checkAuth();
    }

    checkAuth() {
        if (!this.token) {
            this.redirectToLogin();
        }
    }

    redirectToLogin() {
        window.location.href = '/login.html';
    }

    async login(email, senha) {
        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao fazer login');
            }

            const data = await response.json();
            
            // Salvar token e usuário
            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', JSON.stringify(data.usuario));
            
            this.token = data.token;
            this.usuario = data.usuario;

            return data;
        } catch (error) {
            throw error;
        }
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        this.token = null;
        this.usuario = {};
        this.redirectToLogin();
    }

    getToken() {
        return this.token;
    }

    getUsuario() {
        return this.usuario;
    }

    isLogado() {
        return !!this.token;
    }
}

class App {
    constructor() {
        this.currentPage = 'dashboard';
        this.documentoAtual = null;
        this.arquivoSelecionado = null;
        this.alertas = { totalAlertas: 0 };
        this.calendarioAtual = null;
        this.init();
    }

    init() {
        this.testConnection();
        this.bindEvents();
        this.loadPage('dashboard');
        this.inicializarMenuMobile();
        

        setTimeout(() => {
            this.notificacoesSimples();
        }, 2000);
    }

    // ✅ SISTEMA SIMPLES DE NOTIFICAÇÕES
    async notificacoesSimples() {
        try {
            console.log('🔔 Verificando alertas...');
            const response = await fetch('/api/alertas');
            const alertas = await response.json();
            console.log('📊 Alertas:', alertas.totalAlertas);

            if (alertas.totalAlertas > 0) {
                this.mostrarNotificacao(alertas);
            }
        } catch (error) {
            console.log('Erro alertas:', error);
        }
    }

    // ✅ FALLBACK - ALERTA NA TELA
    mostrarAlertaTela(alertas, motivo) {
        console.log('📱 MOSTRANDO ALERTA NA TELA - Motivo:', motivo);

        let mensagem = '';
        let tipo = 'info';

        if (alertas.totalVencidos > 0 && alertas.totalProximos > 0) {
            mensagem = `🚨 ${alertas.totalVencidos} DOCUMENTOS VENCIDOS + ${alertas.totalProximos} PRÓXIMOS DO VENCIMENTO`;
            tipo = 'danger';
        } else if (alertas.totalVencidos > 0) {
            mensagem = `🚨 ${alertas.totalVencidos} DOCUMENTO(S) VENCIDO(S) - ATENÇÃO URGENTE`;
            tipo = 'danger';
        } else if (alertas.totalProximos > 0) {
            mensagem = `⚠️ ${alertas.totalProximos} documento(s) próximo(s) do vencimento`;
            tipo = 'warning';
        } else {
            return; // Não mostrar se não há alertas
        }

        // Adicionar link para documentos
        mensagem += ` - <a href="javascript:app.loadPage('documentos')" class="alert-link">Ver Documentos</a>`;
        this.showAlert(mensagem, tipo);

        // Manter o alerta por mais tempo
        setTimeout(() => {
            const alerts = document.querySelectorAll('.alert');
            alerts.forEach(alert => {
                if (alert.textContent.includes('DOCUMENTOS')) {
                    const bsAlert = new bootstrap.Alert(alert);
                    // Não fechar automaticamente - deixar usuário fechar
                }
            });
        }, 100);
    }

    // ✅ MÉTODO ATUALIZADO
    mostrarNotificacao(alertas) {
        console.log('🔔 MOSTRAR NOTIFICAÇÃO - Status permissão:', Notification.permission);

        // Verificar se o navegador suporta
        if (!("Notification" in window)) {
            console.log('❌ Navegador não suporta notificações');
            this.mostrarAlertaTela(alertas, 'navegador_nao_suporta');
            return;
        }

        // Se já tem permissão
        if (Notification.permission === "granted") {
            console.log('✅ PERMISSÃO CONCEDIDA - Criando notificação...');
            this.criarNoti(alertas);
        }
        // Se precisa pedir permissão
        else if (Notification.permission === "default") {
            console.log('🔄 PEDINDO PERMISSÃO...');
            Notification.requestPermission().then(permissao => {
                console.log('📋 RESPOSTA PERMISSÃO:', permissao);
                if (permissao === "granted") {
                    console.log('✅ PERMISSÃO OBTIDA - Criando notificação...');
                    this.criarNoti(alertas);
                } else {
                    console.log('❌ PERMISSÃO NEGADA - Mostrando alerta na tela');
                    this.mostrarAlertaTela(alertas, 'permissao_negada');
                }
            });
        } else {
            console.log('❌ PERMISSÃO BLOQUEADA - Mostrando alerta na tela');
            this.mostrarAlertaTela(alertas, 'permissao_bloqueada');
        }
    }

    // ✅ MÉTODO CORRIGIDO - SEM ACTIONS
    criarNoti(alertas) {
        let mensagem = '';
        let isUrgent = false;

        if (alertas.totalVencidos > 0 && alertas.totalProximos > 0) {
            mensagem = `${alertas.totalVencidos} vencidos + ${alertas.totalProximos} próximos`;
            isUrgent = true;
        } else if (alertas.totalVencidos > 0) {
            mensagem = `${alertas.totalVencidos} documento(s) VENCIDO(S)`;
            isUrgent = true;
        } else {
            mensagem = `${alertas.totalProximos} documento(s) próximo(s)`;
        }

        // ✅ CONFIGURAÇÃO SIMPLES SEM ACTIONS
        const options = {
            body: mensagem,
            icon: "/icon.png",
            tag: "gestao-documental-alertas",
            requireInteraction: isUrgent, // ⭐ Permanece se for urgente
            silent: false,
            badge: "/icon.png"
        };

        // ⭐ Para alertas urgentes, adicionar vibração (se suportado)
        if (isUrgent && 'vibrate' in navigator) {
            options.vibrate = [200, 100, 200];
        }

        console.log('📨 CRIANDO NOTIFICAÇÃO:', options);

        try {
            const notificacao = new Notification("📋 Gestão Documental", options);

            notificacao.onclick = () => {
                console.log('👆 NOTIFICAÇÃO CLICADA - Abrindo documentos...');
                window.focus();
                this.loadPage('documentos');
                notificacao.close();
            };

            // ⏰ Fechar após mais tempo apenas se não for urgente
            if (!isUrgent) {
                setTimeout(() => {
                    console.log('⏰ FECHANDO NOTIFICAÇÃO NÃO URGENTE');
                    notificacao.close();
                }, 10000);
            } else {
                console.log('🚨 NOTIFICAÇÃO URGENTE - Permanece até interação');
            }

            return notificacao;

        } catch (error) {
            console.error('❌ ERRO AO CRIAR NOTIFICAÇÃO:', error);
            // Fallback: mostrar alerta na tela
            this.mostrarAlertaTela(alertas, 'erro_notificacao');
        }
    }

    // ✅ TESTAR CONEXÃO COM SERVIDOR
    async testConnection() {
        try {
            console.log('Testando conexão com o servidor...');
            const response = await fetch(`${API_BASE}/health`);
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Conexão com servidor OK:', data);
            } else {
                console.error('❌ Servidor respondeu com erro:', response.status);
            }
        } catch (error) {
            console.error('❌ Não foi possível conectar com o servidor:', error);
            this.showAlert('Não foi possível conectar com o servidor. Verifique se o backend está rodando.', 'danger');
        }
    }

    // ✅ EVENTOS MOBILE COMPACTOS
    bindEvents() {
        // Navegação do sidebar
        document.addEventListener('click', (e) => {
            if (e.target.closest('.sidebar-nav .nav-link')) {
                e.preventDefault();
                const link = e.target.closest('.nav-link');

                // ✅ Fechar menu no mobile
                if (window.innerWidth <= 768) {
                    this.toggleMenuMobile();
                }

                const page = link.getAttribute('data-page');
                this.loadPage(page);
            }
        });

        // ✅ Fechar menu ao clicar fora (mobile)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 &&
                !e.target.closest('.sidebar') &&
                !e.target.closest('#menuToggle') &&
                !e.target.closest('.navbar')) {
                document.querySelector('.sidebar')?.classList.remove('mobile-open');
            }
        });

        // Remover mobile-open automaticamente ao redimensionar acima de 768px
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                document.querySelector('.sidebar')?.classList.remove('mobile-open');
                const mt = document.getElementById('menuToggle');
                if (mt) mt.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // ✅ INICIALIZAR MENU MOBILE
    inicializarMenuMobile() {
        if (!document.getElementById('menuToggle')) {
            // Tenta localizar o container da navbar de forma mais flexível
            let navbarContainer = document.querySelector('.navbar .container-fluid') || document.querySelector('.navbar') || document.querySelector('header');
            if (!navbarContainer) {
                console.warn('Navbar não encontrada para inserir botão de menu mobile');
                return;
            }

            const menuToggle = document.createElement('button');
            menuToggle.id = 'menuToggle';
            menuToggle.type = 'button';
            menuToggle.className = 'navbar-toggler d-md-none';
            menuToggle.setAttribute('aria-label', 'Abrir menu lateral');
            menuToggle.setAttribute('aria-expanded', 'false');
            menuToggle.setAttribute('aria-controls', 'sidebar');
            menuToggle.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';

            // usar event listener e stopPropagation para evitar fechamento imediato
            menuToggle.addEventListener('click', (ev) => {
                ev.stopPropagation();
                console.log('menuToggle clicado');
                this.toggleMenuMobile();
            });

            // Acessibilidade: abrir com Enter / Space
            menuToggle.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    ev.stopPropagation();
                    this.toggleMenuMobile();
                }
            });

            // Inserir no início do container (prepend)
            navbarContainer.prepend(menuToggle);
            console.log('menuToggle criado e inserido no DOM');
        }
    }

    // ✅ TOGGLE MENU MOBILE
    toggleMenuMobile() {
        const sidebar = document.querySelector('.sidebar');
        const btn = document.getElementById('menuToggle');

        if (!sidebar) {
            console.warn('Sidebar não encontrada ao tentar abrir/fechar menu mobile');
            return;
        }

        sidebar.classList.toggle('mobile-open');
        const isOpen = sidebar.classList.contains('mobile-open');

        // Atualizar atributo aria-expanded do botão (se existir)
        if (btn) {
            btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }

        console.log('toggleMenuMobile chamado — aberto:', isOpen);
    }

    // ============================
    // ✅ SISTEMA DE CALENDÁRIO MELHORADO
    // ============================

    // ✅ RENDERIZAR CALENDÁRIO PRINCIPAL
    async renderCalendario() {
        try {
            const hoje = new Date();
            const ano = hoje.getFullYear();
            const mes = hoje.getMonth() + 1;
            return await this.renderCalendarioComDados(ano, mes);
        } catch (error) {
            return this.renderError('calendário', error);
        }
    }

    // ✅ RENDERIZAR CALENDÁRIO COM DADOS ESPECÍFICOS
    async renderCalendarioComDados(ano, mes) {
        try {
            console.log(`📅 Carregando calendário: ${mes}/${ano}`);
            const calendario = await this.apiRequest(`/calendario/${ano}/${mes}`);

            // Salvar estado atual
            this.calendarioAtual = { ano: calendario.ano, mes: calendario.mes };

            return `
            <div class="calendario-container">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1 class="page-title">
                        <i class="fas fa-calendar-alt me-2"></i>Calendário
                    </h1>
                    <div class="btn-group">
                        <button class="btn btn-outline-primary" onclick="app.navegarMesAnterior()">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button class="btn btn-outline-secondary" style="min-width: 180px;">
                            <strong>${this.getNomeMes(calendario.mes)} ${calendario.ano}</strong>
                        </button>
                        <button class="btn btn-outline-primary" onclick="app.navegarProximoMes()">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>

                <div class="row mb-3">
                    <div class="col-md-6">
                        <div class="card bg-light">
                            <div class="card-body py-2">
                                <small>
                                    <i class="fas fa-file-alt me-1"></i>
                                    <strong>${calendario.total}</strong> documento(s) em ${this.getNomeMes(calendario.mes)}
                                </small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6 text-end">
                        <button class="btn btn-sm btn-primary" onclick="app.irParaMesAtual()">
                            <i class="fas fa-calendar-day"></i> Hoje
                        </button>
                    </div>
                </div>

                <div class="card">
                    <div class="card-body p-0">
                        ${this.renderCalendarioGrid(calendario)}
                    </div>
                </div>

                <!-- Navegação Rápida -->
                <div class="mt-4">
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0">
                                <i class="fas fa-bolt me-2"></i>Navegação Rápida
                            </h6>
                        </div>
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label">Mês</label>
                                    <select class="form-select" id="selectMes" onchange="app.irParaMes(this.value)">
                                        ${Array.from({ length: 12 }, (_, i) => `
                                            <option value="${i + 1}" ${calendario.mes === i + 1 ? 'selected' : ''}>
                                                ${this.getNomeMes(i + 1)}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Ano</label>
                                    <select class="form-select" id="selectAno" onchange="app.irParaAno(this.value)">
                                        ${this.renderOpcoesAno(calendario.ano)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        } catch (error) {
            console.error('❌ Erro no calendário:', error);
            return `
            <div class="alert alert-danger">
                <h4>Erro ao carregar calendário</h4>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="app.loadPage('calendario')">
                    Tentar Novamente
                </button>
            </div>
        `;
        }
    }

    // ✅ RENDERIZAR OPÇÕES DE ANO (MAIS ANOS)
    renderOpcoesAno(anoAtual) {
        const anoBase = new Date().getFullYear();
        // Mostrar 10 anos para trás e 5 anos para frente
        const anos = Array.from({ length: 16 }, (_, i) => anoBase - 10 + i);

        return anos.map(ano => `
            <option value="${ano}" ${anoAtual === ano ? 'selected' : ''}>
                ${ano}
            </option>
        `).join('');
    }

    // ✅ RENDERIZAR GRID DO CALENDÁRIO MELHORADO
    renderCalendarioGrid(calendario) {
        const hoje = new Date();
        const ano = calendario.ano;
        const mes = calendario.mes - 1;

        const primeiroDia = new Date(ano, mes, 1);
        const ultimoDia = new Date(ano, mes + 1, 0);
        const diasNoMes = ultimoDia.getDate();
        const primeiroDiaSemana = primeiroDia.getDay();

        let html = `
        <div class="calendario-header">
            <div class="calendario-dia-header">Dom</div>
            <div class="calendario-dia-header">Seg</div>
            <div class="calendario-dia-header">Ter</div>
            <div class="calendario-dia-header">Qua</div>
            <div class="calendario-dia-header">Qui</div>
            <div class="calendario-dia-header">Sex</div>
            <div class="calendario-dia-header">Sáb</div>
        </div>
        <div class="calendario-grid">
    `;

        // Dias vazios no início
        for (let i = 0; i < primeiroDiaSemana; i++) {
            html += '<div class="calendario-dia vazio"></div>';
        }

        // Dias do mês
        for (let dia = 1; dia <= diasNoMes; dia++) {
            const documentos = calendario.documentosPorDia[dia] || [];
            const isHoje = dia === hoje.getDate() &&
                mes === hoje.getMonth() &&
                ano === hoje.getFullYear();

            let classe = 'calendario-dia';
            if (isHoje) classe += ' hoje';
            if (documentos.length > 0) classe += ' com-documentos';

            // Verificar se há documentos vencidos
            const documentosVencidos = documentos.filter(doc => this.isDocumentoVencido(doc));
            const documentosProximos = documentos.filter(doc => this.isDocumentoProximo(doc));

            if (documentosVencidos.length > 0) {
                classe += ' com-vencimentos';
            } else if (documentosProximos.length > 0) {
                classe += ' com-proximos';
            }

            html += `
            <div class="${classe}" onclick="app.verDetalhesDia(${dia}, ${calendario.mes}, ${calendario.ano})">
                <div class="dia-numero">${dia}</div>
                ${documentos.length > 0 ? `
                    <div class="documentos-info">
                        <small>${documentos.length} doc(s)</small>
                        <div class="indicadores-status">
                            ${documentosVencidos.length > 0 ? '<span class="indicador-vencido" title="Documentos vencidos"></span>' : ''}
                            ${documentosProximos.length > 0 ? '<span class="indicador-proximo" title="Documentos próximos"></span>' : ''}
                            ${documentos.length > documentosVencidos.length + documentosProximos.length ? '<span class="indicador-normal" title="Documentos em dia"></span>' : ''}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        }

        html += '</div>';
        return html;
    }

    // ✅ VER DETALHES DO DIA - MELHORADO
    async verDetalhesDia(dia, mes, ano) {
        try {
            const dataFormatada = `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${ano}`;
            const dataISO = `${ano}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;

            console.log(`📋 Carregando detalhes do dia: ${dataISO}`);

            // Buscar documentos do dia específico
            const [documentos] = await Promise.all([
                this.apiRequest('/documentos').then(docs =>
                    docs.filter(doc => {
                        // ✅ CORRIGIDO: Usar apenas a parte da data (YYYY-MM-DD)
                        const vencimentoData = doc.data_vencimento.split('T')[0];
                        return vencimentoData === dataISO;
                    })
                )
            ]);

            console.log(`📄 Encontrados ${documentos.length} documento(s) para ${dataISO}`);

            let content = `
            <div class="detalhe-dia-container">
                <!-- Cabeçalho com data -->
                <div class="alert alert-info mb-4">
                    <h5 class="mb-0">
                        <i class="fas fa-calendar-day me-2"></i>
                        <strong>${this.getNomeMes(mes)} de ${ano}</strong> - Dia ${dia}
                    </h5>
                </div>
        `;

            if (documentos.length === 0) {
                content += `
                <div class="text-center py-5">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">Nenhum documento para esta data</h5>
                    <p class="text-muted">Não há documentos vencendo em ${dataFormatada}.</p>
                </div>
            `;
            } else {
                content += `<div class="row g-3" id="documentos-dia-container">`;

                // Carregar todos os andamentos em paralelo
                for (const doc of documentos) {
                    let andamentos = [];
                    try {
                        andamentos = await this.apiRequest(`/documentos/${doc.id}/andamentos`);
                    } catch (error) {
                        console.log(`Erro ao carregar andamentos do doc ${doc.id}:`, error);
                    }

                    const ultimoAndamento = andamentos.length > 0 ? andamentos[0] : null;
                    const diasRestantes = this.calculateDiasRestantes(doc.data_vencimento);
                    const statusClass = diasRestantes < 0 ? 'danger' : diasRestantes <= 30 ? 'warning' : 'success';

                    content += `
                    <div class="col-12">
                        <div class="card border-${statusClass} shadow-sm">
                            <div class="card-header bg-${statusClass} text-white d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-0">
                                        <i class="fas fa-file-alt me-2"></i>
                                        ${this.escapeHtml(doc.nome)}
                                    </h6>
                                </div>
                                <span class="badge bg-light text-dark">${doc.tipo}</span>
                            </div>
                            <div class="card-body">
                                <!-- Informações do Documento -->
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <p class="mb-2">
                                            <strong><i class="fas fa-building me-2"></i>Empresa:</strong><br>
                                            <span class="ms-4">${this.escapeHtml(doc.razao_social || 'N/A')}</span>
                                        </p>
                                        <p class="mb-2">
                                            <strong><i class="fas fa-calendar-check me-2"></i>Data Emissão:</strong><br>
                                            <span class="ms-4">${this.formatDate(doc.data_emissao)}</span>
                                        </p>
                                    </div>
                                    <div class="col-md-6">
                                        <p class="mb-2">
                                            <strong><i class="fas fa-calendar-times me-2"></i>Data Vencimento:</strong><br>
                                            <span class="ms-4 text-${statusClass}">${this.formatDate(doc.data_vencimento)}</span>
                                        </p>
                                        <p class="mb-0">
                                            <strong><i class="fas fa-hourglass-half me-2"></i>Status:</strong><br>
                                            <span class="ms-4 badge bg-${statusClass}">
                                                ${diasRestantes < 0 ? `Vencido há ${Math.abs(diasRestantes)} dias` : `${diasRestantes} dias restantes`}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <!-- Observações do Documento -->
                                ${doc.observacoes ? `
                                    <div class="alert alert-light mb-3">
                                        <strong><i class="fas fa-sticky-note me-2"></i>Observações:</strong>
                                        <p class="mb-0 mt-2">${this.escapeHtml(doc.observacoes)}</p>
                                    </div>
                                ` : ''}

                                <!-- Histórico de Andamentos -->
                                <div class="mt-4 pt-3 border-top">
                                    <h6 class="mb-3">
                                        <i class="fas fa-history me-2"></i>
                                        Últimos Andamentos
                                        <span class="badge bg-info ms-2">${andamentos.length}</span>
                                    </h6>

                                    ${andamentos.length === 0 ? `
                                        <div class="alert alert-secondary mb-0">
                                            <i class="fas fa-info-circle me-2"></i>
                                            Nenhum andamento registrado ainda
                                        </div>
                                    ` : `
                                        <div class="andamentos-timeline">
                                            ${andamentos.slice(0, 3).map((andamento, index) => `
                                                <div class="andamento-item mb-3 pb-3 ${index < andamentos.length - 1 ? 'border-bottom' : ''}">
                                                    <div class="d-flex justify-content-between align-items-start mb-2">
                                                        <div>
                                                            <strong class="d-block">
                                                                <i class="fas fa-user-circle me-1"></i>
                                                                ${this.escapeHtml(andamento.responsavel_nome || 'Responsável')}
                                                            </strong>
                                                            <small class="text-muted">
                                                                ${this.escapeHtml(andamento.responsavel_funcao || 'Função')}
                                                            </small>
                                                        </div>
                                                        <span class="badge ${this.getStatusBadgeClass(andamento.status)}">
                                                            ${this.getStatusText(andamento.status)}
                                                        </span>
                                                    </div>
                                                    <p class="mb-2 small text-muted">
                                                        <i class="fas fa-clock me-1"></i>
                                                        ${andamento.data_formatada || this.formatDate(andamento.data_criacao)}
                                                    </p>
                                                    <p class="mb-0 alert alert-light py-2 px-3">
                                                        ${this.escapeHtml(andamento.descricao)}
                                                    </p>
                                                </div>
                                            `).join('')}
                                            
                                            ${andamentos.length > 3 ? `
                                                <button class="btn btn-sm btn-outline-primary w-100 mt-2" 
                                                        onclick="app.visualizarDocumento(${doc.id})">
                                                    <i class="fas fa-expand me-1"></i>
                                                    Ver todos os andamentos (${andamentos.length} total)
                                                </button>
                                            ` : ''}
                                        </div>
                                    `}
                                </div>

                                <!-- Botões de Ação -->
                                <div class="mt-4 pt-3 border-top">
                                    <div class="d-grid gap-2">
                                        <button class="btn btn-primary" onclick="app.visualizarDocumento(${doc.id})">
                                            <i class="fas fa-eye me-1"></i> Ver Detalhes Completos
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                }

                content += `</div>`;
            }

            content += `
                <!-- Resumo Geral -->
                <div class="mt-4">
                    <div class="card bg-light">
                        <div class="card-body py-3">
                            <div class="row text-center g-3">
                                <div class="col-6 col-md-3">
                                    <h5 class="text-primary mb-1">${documentos.length}</h5>
                                    <small class="text-muted">Total de Documentos</small>
                                </div>
                                <div class="col-6 col-md-3">
                                    <h5 class="text-danger mb-1">${documentos.filter(d => this.calculateDiasRestantes(d.data_vencimento) < 0).length}</h5>
                                    <small class="text-muted">Vencidos</small>
                                </div>
                                <div class="col-6 col-md-3">
                                    <h5 class="text-warning mb-1">${documentos.filter(d => {
                const dias = this.calculateDiasRestantes(d.data_vencimento);
                return dias >= 0 && dias <= 30;
            }).length}</h5>
                                    <small class="text-muted">Próximos</small>
                                </div>
                                <div class="col-6 col-md-3">
                                    <h5 class="text-success mb-1">${documentos.filter(d => this.calculateDiasRestantes(d.data_vencimento) > 30).length}</h5>
                                    <small class="text-muted">Em Dia</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

            this.showModal(`Documentos do dia ${dataFormatada}`, content, null, 'modal-xl');

        } catch (error) {
            console.error('❌ Erro ao carregar detalhes do dia:', error);
            this.showAlert('Erro ao carregar documentos do dia: ' + error.message, 'danger');
        }
    }


    // ✅ RENDERIZAR CARD DE DOCUMENTO INDIVIDUAL
    async renderCardDocumento(documento, status) {
        // Buscar andamentos do documento
        let andamentos = [];
        try {
            andamentos = await this.apiRequest(`/documentos/${documento.id}/andamentos`);
        } catch (error) {
            console.log('Não foi possível carregar andamentos:', error);
        }

        const ultimoAndamento = andamentos.length > 0 ? andamentos[0] : null;
        const diasRestantes = this.calculateDiasRestantes(documento.data_vencimento);

        const statusClass = {
            'vencido': 'border-danger',
            'proximo': 'border-warning',
            'normal': 'border-success'
        }[status] || 'border-secondary';

        const statusIcon = {
            'vencido': 'fa-exclamation-triangle text-danger',
            'proximo': 'fa-clock text-warning',
            'normal': 'fa-check-circle text-success'
        }[status] || 'fa-file-alt';

        return `
        <div class="col-md-6">
            <div class="card h-100 ${statusClass}">
                <div class="card-header py-2 d-flex justify-content-between align-items-center">
                    <div>
                        <i class="fas ${statusIcon} me-2"></i>
                        <strong class="small">${documento.tipo}</strong>
                    </div>
                    <span class="badge ${this.getStatusBadgeClass(documento.status_geral || 'pendente')}">
                        ${this.getStatusText(documento.status_geral || 'pendente')}
                    </span>
                </div>
                <div class="card-body">
                    <h6 class="card-title">${documento.nome}</h6>
                    <div class="mb-2">
                        <small class="text-muted">
                            <i class="fas fa-building me-1"></i>
                            ${documento.razao_social || 'N/A'}
                        </small>
                    </div>
                    <div class="mb-2">
                        <small class="text-muted">
                            <i class="fas fa-calendar me-1"></i>
                            Vencimento: ${this.formatDate(documento.data_vencimento)}
                        </small>
                    </div>
                    <div class="mb-2">
                        <small class="${diasRestantes < 0 ? 'text-danger' : diasRestantes <= 30 ? 'text-warning' : 'text-success'}">
                            <i class="fas fa-hourglass-half me-1"></i>
                            ${diasRestantes < 0 ? `Vencido há ${Math.abs(diasRestantes)} dias` : `${diasRestantes} dias restantes`}
                        </small>
                    </div>
                    
                    ${ultimoAndamento ? `
                    <div class="mt-3 p-2 bg-light rounded">
                        <small class="text-muted d-block">
                            <strong>Último andamento:</strong>
                        </small>
                        <small class="d-block">
                            ${this.escapeHtml(ultimoAndamento.descricao)}
                        </small>
                        <small class="text-muted d-block mt-1">
                            <i class="fas fa-user me-1"></i>
                            ${ultimoAndamento.responsavel_nome} - 
                            ${this.formatDate(ultimoAndamento.data_criacao)}
                        </small>
                    </div>
                    ` : ''}

                    ${documento.observacoes ? `
                    <div class="mt-2">
                        <small class="text-muted">
                            <strong>Observações:</strong> ${this.escapeHtml(documento.observacoes)}
                        </small>
                    </div>
                    ` : ''}
                </div>
                <div class="card-footer bg-transparent py-2">
                    <div class="btn-group w-100">
                        <button class="btn btn-sm btn-outline-primary" onclick="app.visualizarDocumento(${documento.id})">
                            <i class="fas fa-history"></i> Andamentos
                        </button>
                        ${documento.arquivo_path ? `
                        <button class="btn btn-sm btn-outline-success" onclick="app.downloadDocumento(${documento.id})">
                            <i class="fas fa-download"></i>
                        </button>
                        ` : ''}
                        <button class="btn btn-sm btn-outline-info" onclick="app.editarDocumento(${documento.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    // ✅ MÉTODOS AUXILIARES PARA VERIFICAÇÃO DE STATUS
    isDocumentoVencido(documento) {
        const vencimento = new Date(documento.data_vencimento.split('T')[0]);
        const hoje = new Date();

        // Converter para UTC (só data, sem horário)
        const vencimentoUTC = new Date(Date.UTC(vencimento.getUTCFullYear(), vencimento.getUTCMonth(), vencimento.getUTCDate()));
        const hojeUTC = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));

        return vencimentoUTC < hojeUTC;
    }
    isDocumentoProximo(documento) {
        const vencimento = new Date(documento.data_vencimento.split('T')[0]);
        const hoje = new Date();

        // Converter para UTC (só data, sem horário)
        const vencimentoUTC = new Date(Date.UTC(vencimento.getUTCFullYear(), vencimento.getUTCMonth(), vencimento.getUTCDate()));
        const hojeUTC = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));

        const diffTime = vencimentoUTC - hojeUTC;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays >= 0 && diffDays <= 30;
    }

    // ✅ FUNÇÕES AUXILIARES DO CALENDÁRIO
    getNomeMes(mes) {
        const meses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        return meses[mes - 1] || 'Mês Inválido';
    }

    getDataAtual() {
        const hoje = new Date();
        return {
            ano: hoje.getFullYear(),
            mes: hoje.getMonth() + 1
        };
    }

    // ✅ NAVEGAÇÃO DO CALENDÁRIO
    async navegarMesAnterior() {
        try {
            let { ano, mes } = this.calendarioAtual || this.getDataAtual();
            mes--;
            if (mes < 1) {
                mes = 12;
                ano--;
            }
            console.log(`◀️ Navegando para: ${mes}/${ano}`);
            await this.atualizarCalendario(ano, mes);
        } catch (error) {
            console.error('❌ Erro navegação anterior:', error);
        }
    }

    async navegarProximoMes() {
        try {
            let { ano, mes } = this.calendarioAtual || this.getDataAtual();
            mes++;
            if (mes > 12) {
                mes = 1;
                ano++;
            }
            console.log(`▶️ Navegando para: ${mes}/${ano}`);
            await this.atualizarCalendario(ano, mes);
        } catch (error) {
            console.error('❌ Erro navegação próximo:', error);
        }
    }

    async irParaMesAtual() {
        try {
            const { ano, mes } = this.getDataAtual();
            console.log(`🗓️ Indo para mês atual: ${mes}/${ano}`);
            await this.atualizarCalendario(ano, mes);
        } catch (error) {
            console.error('❌ Erro mês atual:', error);
        }
    }

    async irParaMes(novoMes) {
        try {
            const { ano } = this.calendarioAtual || this.getDataAtual();
            console.log(`📅 Indo para mês: ${novoMes}/${ano}`);
            await this.atualizarCalendario(ano, parseInt(novoMes));
        } catch (error) {
            console.error('❌ Erro ir para mês:', error);
        }
    }

    async irParaAno(novoAno) {
        try {
            const { mes } = this.calendarioAtual || this.getDataAtual();
            console.log(`📅 Indo para ano: ${mes}/${novoAno}`);
            await this.atualizarCalendario(parseInt(novoAno), mes);
        } catch (error) {
            console.error('❌ Erro ir para ano:', error);
        }
    }

    // ✅ ATUALIZAR CALENDÁRIO
    async atualizarCalendario(ano, mes) {
        try {
            console.log(`🔄 Atualizando calendário para: ${mes}/${ano}`);

            // Mostrar loading
            const pageContent = document.getElementById('page-content');
            if (pageContent) {
                pageContent.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Carregando...</span>
                    </div>
                    <p class="mt-2">Carregando calendário...</p>
                </div>
            `;
            }

            // Carregar novo calendário
            const novoCalendario = await this.renderCalendarioComDados(ano, mes);

            if (pageContent) {
                pageContent.innerHTML = novoCalendario;
            }

            console.log('✅ Calendário atualizado com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao atualizar calendário:', error);
            this.showAlert('Erro ao carregar calendário: ' + error.message, 'danger');
        }
    }

    // ============================
    // ✅ SISTEMA DE NAVEGAÇÃO
    // ============================

    // ✅ MÉTODO LOADPAGE CORRIGIDO
    async loadPage(page) {
        this.currentPage = page;
        console.log(`Carregando página: ${page}`);

        // ✅ CORREÇÃO: Atualizar menu ativo primeiro
        this.setActiveMenu(page);

        // Mostrar loading
        document.getElementById('page-content').innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Carregando...</span>
            </div>
            <p class="mt-2">Carregando ${page}...</p>
        </div>
    `;

        try {
            let content = '';

            switch (page) {
                case 'dashboard':
                    content = await this.renderDashboard();
                    break;
                case 'empresas':
                    content = await this.renderEmpresas();
                    break;
                case 'documentos':
                    content = await this.renderDocumentos();
                    break;
                case 'responsaveis':
                    content = await this.renderResponsaveis();
                    break;
                case 'calendario':
                    content = await this.renderCalendario();
                    break;
                default:
                    content = '<div class="alert alert-warning">Página não encontrada</div>';
            }

            document.getElementById('page-content').innerHTML = content;
        } catch (error) {
            console.error('Erro ao carregar página:', error);
            document.getElementById('page-content').innerHTML = `
            <div class="alert alert-danger">
                <h4>Erro ao carregar a página</h4>
                <p><strong>${error.message}</strong></p>
                <button class="btn btn-sm btn-outline-primary" onclick="app.loadPage('${page}')">
                    Tentar Novamente
                </button>
            </div>
        `;
        }
    }

    // ✅ MÉTODO PARA ATIVAR MENU CORRETO
    setActiveMenu(page) {
        // Remover active de todos os links
        document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Adicionar active no link correto
        const activeLink = document.querySelector(`[data-page="${page}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            console.log(`✅ Menu ativado: ${page}`);
        } else {
            console.warn(`❌ Link do menu não encontrado: ${page}`);
        }
    }

    // ============================
    // ✅ DASHBOARD
    // ============================

    async renderDashboard() {
        try {
            const data = await this.apiRequest('/dashboard/estatisticas');
            const empresas = await this.apiRequest('/empresas');

            return `
                <div class="dashboard-container">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h1 class="page-title">
                            <i class="fas fa-tachometer-alt me-2"></i>Dashboard
                        </h1>
                        <button class="btn btn-outline-primary" onclick="app.loadPage('dashboard')">
                            <i class="fas fa-sync-alt"></i> Atualizar
                        </button>
                    </div>

                    <!-- Cards de Estatísticas -->
                    <div class="row">
                        <div class="col-xl-2 col-md-4 col-6 mb-4">
                            <div class="card card-empresas h-100">
                                <div class="card-body dashboard-card">
                                    <div class="text-primary">
                                        <i class="fas fa-building fa-2x"></i>
                                    </div>
                                    <div class="number text-dark">${data.estatisticas.empresas || 0}</div>
                                    <div class="title">Empresas</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-2 col-md-4 col-6 mb-4">
                            <div class="card card-documentos h-100">
                                <div class="card-body dashboard-card">
                                    <div class="text-success">
                                        <i class="fas fa-file-alt fa-2x"></i>
                                    </div>
                                    <div class="number text-dark">${data.estatisticas.documentos || 0}</div>
                                    <div class="title">Total Docs</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-2 col-md-4 col-6 mb-4">
                            <div class="card card-vencidos h-100">
                                <div class="card-body dashboard-card">
                                    <div class="text-danger">
                                        <i class="fas fa-exclamation-triangle fa-2x"></i>
                                    </div>
                                    <div class="number text-dark">${data.estatisticas.vencidos || 0}</div>
                                    <div class="title">Vencidos</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-2 col-md-4 col-6 mb-4">
                            <div class="card card-proximos h-100">
                                <div class="card-body dashboard-card">
                                    <div class="text-warning">
                                        <i class="fas fa-clock fa-2x"></i>
                                    </div>
                                    <div class="number text-dark">${data.estatisticas.proximos || 0}</div>
                                    <div class="title">Próximos</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-2 col-md-4 col-6 mb-4">
                            <div class="card card-validos h-100">
                                <div class="card-body dashboard-card">
                                    <div class="text-success">
                                        <i class="fas fa-check-circle fa-2x"></i>
                                    </div>
                                    <div class="number text-dark">${data.estatisticas.validos || 0}</div>
                                    <div class="title">Válidos</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-2 col-md-4 col-6 mb-4">
                            <div class="card card-alerta h-100">
                                <div class="card-body dashboard-card">
                                    <div class="text-info">
                                        <i class="fas fa-bell fa-2x"></i>
                                    </div>
                                    <div class="number text-dark">${(data.estatisticas.vencidos || 0) + (data.estatisticas.proximos || 0)}</div>
                                    <div class="title">Alertas</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filtros e Pesquisa -->
                    <div class="card mb-4">
                        <div class="card-header">
                            <i class="fas fa-filter me-2"></i>Filtros e Pesquisa
                        </div>
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <label class="form-label">Status do Documento</label>
                                    <select class="form-select" id="filtroStatus" onchange="app.aplicarFiltrosDashboard()">
                                        <option value="">Todos os documentos</option>
                                        <option value="vencidos">Documentos Vencidos</option>
                                        <option value="proximos">Próximos do Vencimento</option>
                                        <option value="validos">Documentos Válidos</option>
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">Filtrar por Empresa</label>
                                    <select class="form-select" id="filtroEmpresa" onchange="app.aplicarFiltrosDashboard()">
                                        <option value="">Todas as empresas</option>
                                        ${empresas.map(empresa => `
                                            <option value="${empresa.id}">${empresa.razao_social}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">Pesquisar</label>
                                    <div class="input-group">
                                        <input type="text" class="form-control" id="pesquisaDashboard" 
                                               placeholder="Nome, tipo ou empresa..." 
                                               onkeyup="app.aplicarFiltrosDashboard()">
                                        <button class="btn btn-outline-secondary" type="button" onclick="app.limparFiltrosDashboard()">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Resultados dos Filtros -->
                    <div id="resultadosDashboard">
                        ${this.renderResultadosDashboard(data)}
                    </div>

                    <!-- Documentos Próximos do Vencimento -->
                    <div class="row mt-4">
                        <div class="col-lg-6">
                            <div class="card">
                                <div class="card-header bg-warning text-white">
                                    <i class="fas fa-clock me-2"></i>Documentos Próximos do Vencimento
                                    <span class="badge bg-light text-dark ms-2">${data.documentosProximos.length}</span>
                                </div>
                                <div class="card-body">
                                    ${this.renderDocumentosProximosTable(data.documentosProximos)}
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="card">
                                <div class="card-header bg-danger text-white">
                                    <i class="fas fa-exclamation-triangle me-2"></i>Documentos Vencidos
                                    <span class="badge bg-light text-dark ms-2">${data.documentosVencidos.length}</span>
                                </div>
                                <div class="card-body">
                                    ${this.renderDocumentosVencidosTable(data.documentosVencidos)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            return `
                <div class="alert alert-danger">
                    <h4>Erro ao carregar dashboard</h4>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="app.loadPage('dashboard')">
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
    }

    renderResultadosDashboard(data) {
        const totalDocumentos = data.estatisticas.documentos || 0;

        if (totalDocumentos === 0) {
            return `
            <div class="card">
                <div class="card-body text-center py-5">
                    <i class="fas fa-file-alt fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">Nenhum documento cadastrado</h4>
                    <p class="text-muted">Comece cadastrando seu primeiro documento</p>
                    <button class="btn btn-primary" onclick="app.loadPage('documentos')">
                        <i class="fas fa-plus"></i> Ir para Documentos
                    </button>
                </div>
            </div>
        `;
        }

        return `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">
                    <i class="fas fa-list me-2"></i>Documentos
                    <span class="badge bg-primary ms-2" id="totalDocumentosFiltrados">${totalDocumentos}</span>
                </h5>
                <div class="btn-group">
                    <button class="btn btn-outline-primary btn-sm" onclick="app.exportarDocumentos()">
                        <i class="fas fa-download"></i> Exportar
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div id="tabelaDocumentosDashboard">
                    ${this.renderTabelaDocumentosDashboard(data.proximosVencimentos || [])}
                </div>
            </div>
        </div>
    `;
    }

    // ✅ RENDERIZAR TABELA DE DOCUMENTOS NO DASHBOARD
    renderTabelaDocumentosDashboard(documentos) {
        if (!documentos || documentos.length === 0) {
            return `
            <div class="text-center py-4">
                <i class="fas fa-search fa-2x text-muted mb-2"></i>
                <p class="text-muted">Nenhum documento encontrado com os filtros aplicados</p>
                <button class="btn btn-outline-primary btn-sm" onclick="app.limparFiltrosDashboard()">
                    <i class="fas fa-times"></i> Limpar Filtros
                </button>
            </div>
        `;
        }

        return `
        <div class="table-responsive">
            <table class="table table-hover table-sm">
                <thead>
                    <tr>
                        <th>Tipo</th>
                        <th>Descrição</th>
                        <th>Empresa</th>
                        <th>Emissão</th>
                        <th>Vencimento</th>
                        <th>Status</th>
                        <th>Dias</th>
                    </tr>
                </thead>
                <tbody>
                    ${documentos.map(doc => {
            const status = this.getDocumentStatus(doc);
            const statusClass = this.getDocumentStatusClass(status);
            const statusText = this.getDocumentStatusText(status);
            const dias = this.calculateDiasRestantes(doc.data_vencimento);

            return `
                            <tr class="${status === 'expired' ? 'table-danger' : status === 'expiring' ? 'table-warning' : ''}">
                                <td>
                                    <span class="badge bg-secondary">${doc.tipo}</span>
                                </td>
                                <td>
                                    <strong>${doc.nome}</strong>
                                    ${doc.observacoes ? `<br><small class="text-muted">${doc.observacoes.substring(0, 30)}${doc.observacoes.length > 30 ? '...' : ''}</small>` : ''}
                                </td>
                                <td>${doc.empresa_nome || doc.razao_social || 'N/A'}</td>
                                <td>${this.formatDate(doc.data_emissao)}</td>
                                <td>${this.formatDate(doc.data_vencimento)}</td>
                                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                                <td>
                                    <span class="badge ${dias < 0 ? 'bg-danger' : dias <= 30 ? 'bg-warning' : 'bg-success'}">
                                        ${dias < 0 ? 'Vencido' : `${dias}d`}
                                    </span>
                                </td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
        </div>
    `;
    }

    renderDocumentosProximosTable(documentos) {
        if (!documentos || documentos.length === 0) {
            return '<div class="text-center py-4"><i class="fas fa-check-circle fa-2x text-muted mb-2"></i><p class="text-muted">Nenhum documento próximo do vencimento</p></div>';
        }

        return `
            <div class="table-responsive">
                <table class="table table-hover table-sm">
                    <thead>
                        <tr>
                            <th>Documento</th>
                            <th>Empresa</th>
                            <th>Vencimento</th>
                            <th>Dias Restantes</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${documentos.map(doc => {
            const dias = this.calculateDiasRestantes(doc.data_vencimento);
            const statusClass = this.getDocumentStatusClass('expiring');
            return `
                                <tr>
                                    <td>
                                        <strong>${doc.nome}</strong>
                                        <br><small class="text-muted">${doc.tipo}</small>
                                    </td>
                                    <td>${doc.empresa_nome || 'N/A'}</td>
                                    <td>${this.formatDate(doc.data_vencimento)}</td>
                                    <td><strong>${dias}</strong> dias</td>
                                    <td><span class="status-badge ${statusClass}">Vencendo</span></td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderDocumentosVencidosTable(documentos) {
        if (!documentos || documentos.length === 0) {
            return '<div class="text-center py-4"><i class="fas fa-check-circle fa-2x text-muted mb-2"></i><p class="text-muted">Nenhum documento vencido</p></div>';
        }

        return `
            <div class="table-responsive">
                <table class="table table-hover table-sm">
                    <thead>
                        <tr>
                            <th>Documento</th>
                            <th>Empresa</th>
                            <th>Vencimento</th>
                            <th>Dias</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${documentos.map(doc => {
            const dias = this.calculateDiasRestantes(doc.data_vencimento);
            return `
                                <tr class="table-danger">
                                    <td>
                                        <strong>${doc.nome}</strong>
                                        <br><small class="text-muted">${doc.tipo}</small>
                                    </td>
                                    <td>${doc.empresa_nome || 'N/A'}</td>
                                    <td>${this.formatDate(doc.data_vencimento)}</td>
                                    <td><strong class="text-danger">${Math.abs(dias)} dias atrás</strong></td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // ✅ MÉTODOS PARA FILTROS DO DASHBOARD
    async aplicarFiltrosDashboard() {
        try {
            const status = document.getElementById('filtroStatus')?.value || '';
            const empresaId = document.getElementById('filtroEmpresa')?.value || '';
            const search = document.getElementById('pesquisaDashboard')?.value || '';

            const params = new URLSearchParams();
            if (status) params.append('status', status);
            if (empresaId) params.append('empresa_id', empresaId);
            if (search) params.append('search', search);

            const documentos = await this.apiRequest(`/documentos/filtros?${params}`);

            // ✅ ATUALIZAÇÃO SEGURA - Verificar se elementos existem
            const resultadosDiv = document.getElementById('resultadosDashboard');
            if (resultadosDiv) {
                resultadosDiv.innerHTML = this.renderResultadosComFiltros(documentos);
            }
        } catch (error) {
            console.error('Erro ao aplicar filtros:', error);
            this.showAlert('Erro ao aplicar filtros: ' + error.message, 'danger');
        }
    }

    // ✅ NOVO MÉTODO AUXILIAR
    renderResultadosComFiltros(documentos) {
        return `
    <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
                <i class="fas fa-filter me-2"></i>Documentos Filtrados
                <span class="badge bg-primary ms-2">${documentos.length}</span>
            </h5>
            <div class="btn-group">
                <button class="btn btn-outline-primary btn-sm" onclick="app.limparFiltrosDashboard()">
                    <i class="fas fa-times"></i> Limpar Filtros
                </button>
            </div>
        </div>
        <div class="card-body">
            ${this.renderTabelaDocumentosDashboard(documentos)}
        </div>
    </div>
    `;
    }

    limparFiltrosDashboard() {
        // Limpar campos de filtro
        document.getElementById('filtroStatus').value = '';
        document.getElementById('filtroEmpresa').value = '';
        document.getElementById('pesquisaDashboard').value = '';

        // Recarregar o dashboard completo
        this.loadPage('dashboard');
    }

    exportarDocumentos() {
        this.showAlert('Funcionalidade de exportação em desenvolvimento', 'info');
    }

    // ============================
    // ✅ GESTÃO DE DOCUMENTOS
    // ============================

    // ✅ MÉTODO ADICIONAR ANDAMENTO CORRIGIDO
    async adicionarAndamento(event, documentoId) {
        event.preventDefault();

        console.log(`🟡 ADICIONANDO ANDAMENTO PARA DOCUMENTO ${documentoId}`);

        // Capturar dados do formulário
        const responsavel_id = document.getElementById('andamento_responsavel').value;
        const descricao = document.getElementById('andamento_descricao').value;
        const status = document.getElementById('andamento_status').value;

        console.log('📝 DADOS DO FORMULÁRIO:', { responsavel_id, descricao, status });

        // Validação
        if (!responsavel_id || !descricao.trim()) {
            this.showAlert('Preencha todos os campos obrigatórios', 'warning');
            return;
        }

        try {
            // Mostrar loading
            const btnSalvar = document.querySelector('#formAndamento button[type="submit"]');
            const originalText = btnSalvar.innerHTML;
            btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            btnSalvar.disabled = true;

            console.log('🔄 ENVIANDO PARA API...');

            // Fazer requisição para API
            const response = await fetch(`/api/documentos/${documentoId}/andamentos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    responsavel_id: parseInt(responsavel_id),
                    descricao: descricao.trim(),
                    status: status
                })
            });

            console.log('📊 RESPOSTA DA API - Status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Erro ${response.status}`);
            }

            const resultado = await response.json();
            console.log('✅ ANDAMENTO CRIADO COM SUCESSO:', resultado);

            this.showAlert('Andamento registrado com sucesso!', 'success');

            // ✅ CORREÇÃO: Fechar modal ANTES de recarregar
            const modalElement = document.getElementById('dynamicModal');
            if (modalElement) {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                    console.log('✅ Modal fechado');

                    // ✅ AGUARDAR o modal fechar completamente antes de recarregar
                    modalElement.addEventListener('hidden.bs.modal', () => {
                        console.log('🔄 Modal completamente fechado, recarregando página...');
                        // Recarregar a página de documentos
                        setTimeout(() => {
                            this.loadPage('documentos');
                        }, 300);
                    });
                } else {
                    // Fallback se não conseguir pegar a instância do modal
                    console.log('⚠️ Não conseguiu pegar instância do modal, recarregando diretamente...');
                    setTimeout(() => {
                        this.loadPage('documentos');
                    }, 500);
                }
            } else {
                // Fallback se o modal não existir
                console.log('⚠️ Modal não encontrado, recarregando diretamente...');
                setTimeout(() => {
                    this.loadPage('documentos');
                }, 500);
            }
        } catch (error) {
            console.error('❌ ERRO AO ADICIONAR ANDAMENTO:', error);
            this.showAlert(`Erro: ${error.message}`, 'danger');

            // Restaurar botão
            const btnSalvar = document.querySelector('#formAndamento button[type="submit"]');
            if (btnSalvar) {
                btnSalvar.innerHTML = '<i class="fas fa-save"></i> Registrar Andamento';
                btnSalvar.disabled = false;
            }
        }
    }

    // ✅ MÉTODO CORRIGIDO PARA VISUALIZAR DOCUMENTO
    async visualizarDocumento(id) {
        try {
            console.log(`🔍 Carregando detalhes do documento ID: ${id}`);

            // Fazer todas as requisições em paralelo
            const [documento, responsaveis, andamentos] = await Promise.all([
                this.apiRequest(`/documentos/${id}`).catch(error => {
                    console.error('Erro ao carregar documento:', error);
                    throw new Error('Não foi possível carregar os dados do documento');
                }),
                this.apiRequest('/responsaveis').catch(error => {
                    console.error('Erro ao carregar responsáveis:', error);
                    return [];
                }),
                this.apiRequest(`/documentos/${id}/andamentos`).catch(error => {
                    console.error('Erro ao carregar andamentos:', error);
                    return []; // Retorna array vazio se der erro, não quebra a aplicação
                })
            ]);

            console.log('✅ Dados carregados:', {
                documento: documento.nome,
                responsaveis: responsaveis.length,
                andamentos: andamentos.length
            });

            const content = `
        <div class="documento-detalhes">
            <!-- Cabeçalho do Documento -->
            <div class="card mb-4">
                <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">
                        <i class="fas fa-file-alt me-2"></i>${this.escapeHtml(documento.nome)}
                    </h5>
                    <span class="badge bg-light text-dark">${this.escapeHtml(documento.tipo)}</span>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Empresa:</strong> ${this.escapeHtml(documento.razao_social)}</p>
                            <p><strong>CNPJ:</strong> ${this.formatCNPJ(documento.empresa_cnpj)}</p>
                            <p><strong>Data Emissão:</strong> ${this.formatDate(documento.data_emissao)}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Vencimento:</strong> ${this.formatDate(documento.data_vencimento)}</p>
                            <p><strong>Status Geral:</strong> 
                                <span class="badge ${this.getStatusBadgeClass(documento.status_geral || 'pendente')}">
                                    ${this.getStatusText(documento.status_geral || 'pendente')}
                                </span>
                            </p>
                            ${documento.arquivo_path ? `
                                <button class="btn btn-success btn-sm" onclick="app.downloadDocumento(${documento.id})">
                                    <i class="fas fa-download"></i> Baixar Arquivo
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    ${documento.observacoes ? `
                        <div class="mt-3">
                            <strong>Observações:</strong>
                            <p class="mb-0">${this.escapeHtml(documento.observacoes)}</p>
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Seção de Andamentos -->
            <div class="row">
                <div class="col-lg-8">
                    <!-- Lista de Andamentos -->
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">
                                <i class="fas fa-history me-2"></i>Histórico de Andamentos
                                <span class="badge bg-primary ms-2">${andamentos.length}</span>
                            </h6>
                            <small class="text-muted">Total: ${andamentos.length} registros</small>
                        </div>
                        <div class="card-body">
                            ${andamentos.length === 0 ?
                    '<div class="text-center py-4"><i class="fas fa-inbox fa-2x text-muted mb-2"></i><p class="text-muted">Nenhum andamento registrado</p></div>' :
                    this.renderListaAndamentos(andamentos)
                }
                        </div>
                    </div>
                </div>
                
                <div class="col-lg-4">
                    <!-- Formulário para Novo Andamento -->
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0">
                                <i class="fas fa-plus-circle me-2"></i>Novo Andamento
                            </h6>
                        </div>
                        <div class="card-body">
                            <form id="formAndamento" onsubmit="app.adicionarAndamento(event, ${documento.id})">
                                <div class="mb-3">
                                    <label class="form-label">Responsável *</label>
                                    <select class="form-select" id="andamento_responsavel" required>
                                        <option value="">Selecione o responsável...</option>
                                        ${responsaveis.map(resp => `
                                            <option value="${resp.id}">
                                                ${this.escapeHtml(resp.nome)} - ${this.escapeHtml(resp.funcao)}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Status</label>
                                    <select class="form-select" id="andamento_status">
                                        <option value="pendente">Pendente</option>
                                        <option value="em_andamento" selected>Em Andamento</option>
                                        <option value="concluido">Concluído</option>
                                        <option value="cancelado">Cancelado</option>
                                    </select>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Descrição do Andamento *</label>
                                    <textarea class="form-control" id="andamento_descricao" 
                                              rows="4" placeholder="Descreva o andamento desta demanda..." 
                                              required></textarea>
                                </div>
                                
                                <div class="d-grid gap-2">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-save"></i> Registrar Andamento
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

            this.showModal(`Detalhes do Documento - ${this.escapeHtml(documento.nome)}`, content, null, 'modal-xl');
        } catch (error) {
            console.error('❌ Erro ao carregar detalhes do documento:', error);
            this.showAlert(`Erro ao carregar detalhes: ${error.message}`, 'danger');
        }
    }

    // ✅ MÉTODO PARA ESCAPAR HTML (SEGURANÇA)
    escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // ✅ MÉTODO CORRIGIDO PARA RENDERIZAR ANDAMENTOS
    renderListaAndamentos(andamentos) {
        return `
        <div class="andamentos-list">
            ${andamentos.map(andamento => `
                <div class="andamento-item mb-3 p-3 border rounded ${andamento.status}">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <strong class="d-block">${andamento.responsavel_nome}</strong>
                            <small class="text-muted">${andamento.responsavel_funcao}</small>
                        </div>
                        <div class="text-end">
                            <small class="text-muted d-block">${andamento.data_formatada || this.formatDate(andamento.data_criacao)}</small>
                            <span class="badge ${this.getStatusBadgeClass(andamento.status)}">
                                ${this.getStatusText(andamento.status)}
                            </span>
                        </div>
                    </div>
                    <p class="mb-0">${this.escapeHtml(andamento.descricao)}</p>
                </div>
            `).join('')}
        </div>
        
        <style>
            .andamento-item {
                background: #f8f9fa;
                border-left: 4px solid #007bff !important;
            }
            .andamento-item.pendente {
                border-left-color: #ffc107 !important;
            }
            .andamento-item.em_andamento {
                border-left-color: #17a2b8 !important;
            }
            .andamento-item.concluido {
                border-left-color: #28a745 !important;
            }
            .andamento-item.cancelado {
                border-left-color: #dc3545 !important;
            }
        </style>
    `;
    }

    // ✅ MÉTODO ATUALIZAR STATUS CORRIGIDO
    async atualizarStatusDocumento(documentoId, status) {
        try {
            await this.apiRequest(`/documentos/${documentoId}/status`, {
                method: 'PUT',
                body: { status_geral: status }
            });

            this.showAlert(`Status atualizado para: ${this.getStatusText(status)}`, 'success');

            // Fechar modal e recarregar a lista de documentos
            bootstrap.Modal.getInstance(document.getElementById('dynamicModal')).hide();

            setTimeout(() => {
                this.loadPage('documentos');
            }, 500);
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            this.showAlert(`Erro ao atualizar status: ${error.message}`, 'danger');
        }
    }

    // ✅ MÉTODOS AUXILIARES
    getStatusBadgeClass(status) {
        const classes = {
            'pendente': 'bg-warning',
            'em_andamento': 'bg-info',
            'concluido': 'bg-success',
            'cancelado': 'bg-danger'
        };
        return classes[status] || 'bg-secondary';
    }

    getStatusText(status) {
        const texts = {
            'pendente': 'Pendente',
            'em_andamento': 'Em Andamento',
            'concluido': 'Concluído',
            'cancelado': 'Cancelado'
        };
        return texts[status] || status;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Data inválida';
        }
    }

    // ============================
    // ✅ GESTÃO DE EMPRESAS
    // ============================

    async renderEmpresas() {
        try {
            const empresas = await this.apiRequest('/empresas');

            return `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1 class="page-title">
                        <i class="fas fa-building me-2"></i>Empresas
                    </h1>
                    <button class="btn btn-primary" onclick="app.openEmpresaModal()">
                        <i class="fas fa-plus"></i> Nova Empresa
                    </button>
                </div>

                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <span>Lista de Empresas</span>
                        <span class="badge bg-primary">${empresas.length} empresas</span>
                    </div>
                    <div class="card-body">
                        ${empresas.length === 0 ?
                    '<div class="text-center py-5"><i class="fas fa-building fa-3x text-muted mb-3"></i><p class="text-muted">Nenhuma empresa cadastrada</p><button class="btn btn-primary mt-2" onclick="app.openEmpresaModal()">Cadastrar Primeira Empresa</button></div>' :
                    this.renderEmpresasTable(empresas)
                }
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
            return `
                <div class="alert alert-danger">
                    <h4>Erro ao carregar empresas</h4>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="app.loadPage('empresas')">
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
    }

    renderEmpresasTable(empresas) {
        return `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Razão Social</th>
                            <th>CNPJ</th>
                            <th>Telefone</th>
                            <th>Regime</th>
                            <th>Data Cadastro</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${empresas.map(empresa => `
                            <tr>
                                <td>
                                    <strong>${empresa.razao_social}</strong>
                                    ${empresa.nome_fantasia ? `<br><small class="text-muted">${empresa.nome_fantasia}</small>` : ''}
                                </td>
                                <td>${this.formatCNPJ(empresa.cnpj)}</td>
                                <td>${empresa.telefone}</td>
                                <td>
                                    <span class="badge ${empresa.simples_nacional ? 'bg-success' : 'bg-info'}">
                                        ${empresa.simples_nacional ? 'Simples Nacional' : 'Demais Regimes'}
                                    </span>
                                </td>
                                <td>${this.formatDate(empresa.created_at)}</td>
                                <td>
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-warning" onclick="app.editEmpresa(${empresa.id})" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-outline-info" onclick="app.viewEmpresa(${empresa.id})" title="Ver Detalhes">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn btn-outline-danger" onclick="app.deleteEmpresa(${empresa.id})" title="Excluir">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // ✅ MÉTODO openEmpresaModal ATUALIZADO COM OLHINHO
    openEmpresaModal(empresa = null) {
        const title = empresa ? 'Editar Empresa' : 'Nova Empresa';
        const isSimplesNacional = empresa ? (empresa.simples_nacional ? 'checked' : '') : 'checked';

        const content = `
        <form id="empresaForm">
            <input type="hidden" id="empresaId" value="${empresa?.id || ''}">
            
            <!-- Seção de Consulta CNPJ (apenas para novo cadastro) -->
            ${!empresa ? `
            <div class="mb-4 p-3 bg-light rounded">
                <h6><i class="fas fa-search me-2"></i>Consulta por CNPJ</h6>
                <div class="row g-2">
                    <div class="col-md-8">
                        <input type="text" 
                               class="form-control" 
                               id="cnpjConsulta" 
                               placeholder="Digite o CNPJ (apenas números)"
                               maxlength="18">
                    </div>
                    <div class="col-md-4">
                        <button type="button" 
                                class="btn btn-outline-primary w-100" 
                                onclick="app.consultarCNPJ()"
                                id="btnConsultarCNPJ">
                            <i class="fas fa-search me-1"></i> Consultar
                        </button>
                    </div>
                </div>
                <div class="mt-2">
                    <small class="text-muted">
                        Digite o CNPJ e clique em consultar para preencher os dados automaticamente
                    </small>
                </div>
                <div id="cnpjConsultaStatus" class="mt-2"></div>
            </div>
            ` : ''}
            
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label required-field">CNPJ *</label>
                        <input type="text" 
                               class="form-control" 
                               id="cnpj" 
                               value="${empresa?.cnpj || ''}" 
                               required
                               oninput="app.formatarCNPJ(this)">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label required-field">Razão Social *</label>
                        <input type="text" 
                               class="form-control" 
                               id="razaoSocial" 
                               value="${empresa?.razao_social || ''}" 
                               required>
                    </div>
                </div>
            </div>

            <div class="mb-3">
                <label class="form-label">Nome Fantasia</label>
                <input type="text" 
                       class="form-control" 
                       id="nomeFantasia" 
                       value="${empresa?.nome_fantasia || ''}">
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label required-field">Telefone *</label>
                        <input type="text" 
                               class="form-control" 
                               id="telefone" 
                               value="${empresa?.telefone || ''}" 
                               required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label required-field">E-mail *</label>
                        <input type="email" 
                               class="form-control" 
                               id="email" 
                               value="${empresa?.email || ''}" 
                               required>
                    </div>
                </div>
            </div>

            <!-- NOVOS CAMPOS ADICIONADOS COM OLHINHO -->
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Login Municipal</label>
                        <input type="text" 
                               class="form-control" 
                               id="loginMunicipal" 
                               value="${empresa?.login_municipal || ''}"
                               placeholder="Login para acesso ao sistema municipal">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Senha Municipal</label>
                        <div class="password-container">
                            <input type="password" 
                                   class="form-control" 
                                   id="senhaMunicipal" 
                                   value="${empresa?.senha_municipal || ''}"
                                   placeholder="Senha para acesso ao sistema municipal">
                            <button type="button" class="password-toggle" onclick="app.togglePassword('senhaMunicipal')">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Login Estadual</label>
                        <input type="text" 
                               class="form-control" 
                               id="loginEstadual" 
                               value="${empresa?.login_estadual || ''}"
                               placeholder="Login para acesso ao sistema estadual">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Senha Estadual</label>
                        <div class="password-container">
                            <input type="password" 
                                   class="form-control" 
                                   id="senhaEstadual" 
                                   value="${empresa?.senha_estadual || ''}"
                                   placeholder="Senha para acesso ao sistema estadual">
                            <button type="button" class="password-toggle" onclick="app.togglePassword('senhaEstadual')">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- REGIME TRIBUTÁRIO -->
            <div class="mb-3">
                <label class="form-label">Regime Tributário</label>
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="simplesNacional" 
                           id="simplesNacionalSim" value="true" ${isSimplesNacional}>
                    <label class="form-check-label" for="simplesNacionalSim">
                        Simples Nacional
                    </label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="simplesNacional" 
                           id="simplesNacionalNao" value="false" ${empresa && !empresa.simples_nacional ? 'checked' : ''}>
                    <label class="form-check-label" for="simplesNacionalNao">
                        Demais Regimes (Lucro Presumido/Real)
                    </label>
                </div>
            </div>

            <div class="mb-3">
                <label class="form-label">Observações</label>
                <textarea class="form-control" 
                          id="observacoes" 
                          rows="3"
                          placeholder="Observações adicionais sobre a empresa">${empresa?.observacoes || ''}</textarea>
            </div>

            <div class="mb-3">
                <label class="form-label">Endereço</label>
                <textarea class="form-control" 
                          id="endereco" 
                          rows="2">${empresa?.endereco || ''}</textarea>
            </div>
        </form>
    `;

        this.showModal(title, content, () => this.saveEmpresa());

        // Adicionar máscara ao CNPJ de consulta se for um novo cadastro
        if (!empresa) {
            setTimeout(() => {
                const cnpjConsulta = document.getElementById('cnpjConsulta');
                if (cnpjConsulta) {
                    cnpjConsulta.addEventListener('input', function (e) {
                        app.formatarCNPJConsulta(e.target);
                    });
                }
            }, 100);
        }
    }

    // ✅ MÉTODO PARA MOSTRAR/OCULTAR SENHA
    togglePassword(fieldId) {
        const passwordField = document.getElementById(fieldId);
        const toggleButton = passwordField.nextElementSibling;
        const icon = toggleButton.querySelector('i');

        if (passwordField.type === 'password') {
            // Mostrar senha
            passwordField.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash', 'password-visible');
            toggleButton.setAttribute('title', 'Ocultar senha');
        } else {
            // Ocultar senha
            passwordField.type = 'password';
            icon.classList.remove('fa-eye-slash', 'password-visible');
            icon.classList.add('fa-eye');
            toggleButton.setAttribute('title', 'Mostrar senha');
        }
    }

    // ✅ MÉTODO saveEmpresa ATUALIZADO
    async saveEmpresa() {
        const simplesNacional = document.querySelector('input[name="simplesNacional"]:checked')?.value === 'true';

        const formData = {
            razao_social: document.getElementById('razaoSocial').value,
            nome_fantasia: document.getElementById('nomeFantasia').value,
            cnpj: document.getElementById('cnpj').value.replace(/\D/g, ''),
            telefone: document.getElementById('telefone').value.substring(0, 50),
            email: document.getElementById('email').value,
            endereco: document.getElementById('endereco').value,
            login_municipal: document.getElementById('loginMunicipal').value,
            senha_municipal: document.getElementById('senhaMunicipal').value,
            login_estadual: document.getElementById('loginEstadual').value,
            senha_estadual: document.getElementById('senhaEstadual').value,
            simples_nacional: simplesNacional,
            observacoes: document.getElementById('observacoes').value
        };

        const id = document.getElementById('empresaId').value;

        try {
            if (id) {
                await this.apiRequest(`/empresas/${id}`, {
                    method: 'PUT',
                    body: formData
                });
                this.showAlert('Empresa atualizada com sucesso!', 'success');
            } else {
                await this.apiRequest('/empresas', {
                    method: 'POST',
                    body: formData
                });
                this.showAlert('Empresa criada com sucesso!', 'success');
            }

            bootstrap.Modal.getInstance(document.getElementById('dynamicModal')).hide();
            this.loadPage('empresas');
        } catch (error) {
            this.showAlert(`Erro ao salvar empresa: ${error.message}`, 'danger');
        }
    }

    async editEmpresa(id) {
        try {
            const empresa = await this.apiRequest(`/empresas/${id}`);
            this.openEmpresaModal(empresa);
        } catch (error) {
            this.showAlert(`Erro ao carregar empresa: ${error.message}`, 'danger');
        }
    }

    // ✅ MÉTODO viewEmpresa ATUALIZADO
    async viewEmpresa(id) {
        try {
            const empresa = await this.apiRequest(`/empresas/${id}`);

            const content = `
            <div class="empresa-details">
                <div class="row">
                    <div class="col-md-6">
                        <h6>Informações Básicas</h6>
                        <p><strong>Razão Social:</strong> ${empresa.razao_social}</p>
                        <p><strong>Nome Fantasia:</strong> ${empresa.nome_fantasia || 'Não informado'}</p>
                        <p><strong>CNPJ:</strong> ${this.formatCNPJ(empresa.cnpj)}</p>
                        <p><strong>Regime Tributário:</strong> 
                            <span class="badge ${empresa.simples_nacional ? 'bg-success' : 'bg-info'}">
                                ${empresa.simples_nacional ? 'Simples Nacional' : 'Demais Regimes'}
                            </span>
                        </p>
                    </div>
                    <div class="col-md-6">
                        <h6>Contato</h6>
                        <p><strong>Telefone:</strong> ${empresa.telefone}</p>
                        <p><strong>E-mail:</strong> ${empresa.email}</p>
                        <p><strong>Endereço:</strong> ${empresa.endereco || 'Não informado'}</p>
                    </div>
                </div>
                
                <div class="row mt-3">
                    <div class="col-md-6">
                        <h6>Acessos Municipais</h6>
                        <p><strong>Login:</strong> ${empresa.login_municipal || 'Não informado'}</p>
                        <p>
                            <strong>Senha:</strong> 
                            <span id="senhaMunicipalView">${empresa.senha_municipal ? '••••••••' : 'Não informada'}</span>
                            ${empresa.senha_municipal ? `
                                <button type="button" class="btn btn-sm btn-outline-secondary ms-2" onclick="app.toggleViewPassword('senhaMunicipalView', '${this.escapeHtml(empresa.senha_municipal)}')">
                                    <i class="fas fa-eye"></i> Mostrar
                                </button>
                            ` : ''}
                        </p>
                    </div>
                    <div class="col-md-6">
                        <h6>Acessos Estaduais</h6>
                        <p><strong>Login:</strong> ${empresa.login_estadual || 'Não informado'}</p>
                        <p>
                            <strong>Senha:</strong> 
                            <span id="senhaEstadualView">${empresa.senha_estadual ? '••••••••' : 'Não informada'}</span>
                            ${empresa.senha_estadual ? `
                                <button type="button" class="btn btn-sm btn-outline-secondary ms-2" onclick="app.toggleViewPassword('senhaEstadualView', '${this.escapeHtml(empresa.senha_estadual)}')">
                                    <i class="fas fa-eye"></i> Mostrar
                                </button>
                            ` : ''}
                        </p>
                    </div>
                </div>
                
                ${empresa.observacoes ? `
                <div class="row mt-3">
                    <div class="col-12">
                        <h6>Observações</h6>
                        <p>${empresa.observacoes}</p>
                    </div>
                </div>
                ` : ''}
            </div>
        `;

            this.showModal('Detalhes da Empresa', content, null);
        } catch (error) {
            this.showAlert(`Erro ao carregar detalhes: ${error.message}`, 'danger');
        }
    }

    // ✅ MÉTODO PARA MOSTRAR/OCULTAR SENHA NA VISUALIZAÇÃO
    toggleViewPassword(elementId, realPassword) {
        const element = document.getElementById(elementId);
        const button = element.nextElementSibling;
        const icon = button.querySelector('i');

        if (element.textContent === '••••••••') {
            // Mostrar senha real
            element.textContent = realPassword;
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
            button.innerHTML = '<i class="fas fa-eye-slash"></i> Ocultar';
            button.classList.add('btn-warning');
            button.classList.remove('btn-outline-secondary');

            // Ocultar automaticamente após 10 segundos por segurança
            setTimeout(() => {
                if (element.textContent === realPassword) {
                    element.textContent = '••••••••';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                    button.innerHTML = '<i class="fas fa-eye"></i> Mostrar';
                    button.classList.remove('btn-warning');
                    button.classList.add('btn-outline-secondary');
                }
            }, 10000);
        } else {
            // Ocultar senha
            element.textContent = '••••••••';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
            button.innerHTML = '<i class="fas fa-eye"></i> Mostrar';
            button.classList.remove('btn-warning');
            button.classList.add('btn-outline-secondary');
        }
    }

    // ✅ MÉTODO PARA COPIAR SENHA PARA ÁREA DE TRANSFERÊNCIA
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showAlert('Senha copiada para a área de transferência!', 'success');
        } catch (error) {
            console.error('Erro ao copiar senha:', error);
            this.showAlert('Erro ao copiar senha', 'danger');
        }
    }

    async deleteEmpresa(id) {
        if (confirm('Tem certeza que deseja excluir esta empresa?')) {
            try {
                await this.apiRequest(`/empresas/${id}`, { method: 'DELETE' });
                this.showAlert('Empresa excluída com sucesso!', 'success');
                this.loadPage('empresas');
            } catch (error) {
                this.showAlert(`Erro ao excluir empresa: ${error.message}`, 'danger');
            }
        }
    }

    // ============================
    // ✅ GESTÃO DE DOCUMENTOS
    // ============================

    async renderDocumentos() {
        try {
            const documentos = await this.apiRequest('/documentos');

            return `
                <div class="documentos-module">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h1 class="page-title">
                            <i class="fas fa-file-alt me-2"></i>Gestão de Documentos
                        </h1>
                        <button class="btn btn-primary" onclick="app.abrirFormularioNovoDocumento()">
                            <i class="fas fa-plus"></i> Novo Documento
                        </button>
                    </div>

                    <!-- Lista de Documentos -->
                    <div id="lista-documentos">
                        ${this.renderListaDocumentos(documentos)}
                    </div>

                    <!-- Formulário de Documento (inicialmente oculto) -->
                    <div id="formulario-documento" style="display: none;">
                        ${await this.renderFormularioDocumento()}
                    </div>
                </div>
            `;
        } catch (error) {
            return `
                <div class="alert alert-danger">
                    <h4>Erro ao carregar documentos</h4>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="app.loadPage('documentos')">
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
    }

    // ✅ MÉTODO PARA LIMPAR FORMULÁRIO DE ANDAMENTO
    limparFormularioAndamento() {
        const form = document.getElementById('formAndamento');
        if (form) {
            form.reset();
        }
    }

    // ✅ MÉTODO RENDERLISTADOCUMENTOS ATUALIZADO
    renderListaDocumentos(documentos) {
        if (documentos.length === 0) {
            return `
            <div class="card">
                <div class="card-body text-center py-5">
                    <i class="fas fa-file-alt fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">Nenhum documento cadastrado</h4>
                    <p class="text-muted">Comece cadastrando seu primeiro documento</p>
                    <button class="btn btn-primary" onclick="app.abrirFormularioNovoDocumento()">
                        <i class="fas fa-plus"></i> Cadastrar Primeiro Documento
                    </button>
                </div>
            </div>
        `;
        }

        return `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">Documentos Cadastrados</h5>
                <span class="badge bg-primary">${documentos.length} documentos</span>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Descrição/Número</th>
                                <th>Empresa</th>
                                <th>Emissão</th>
                                <th>Vencimento</th>
                                <th>Status</th>
                                <th>Dias</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${documentos.map(doc => {
            const statusVencimento = this.getDocumentStatus(doc);
            const statusGeral = doc.status_geral || 'pendente';
            const diasRestantes = this.calculateDiasRestantes(doc.data_vencimento);

            return `
                                    <tr class="${statusVencimento === 'expired' ? 'table-danger' : statusVencimento === 'expiring' ? 'table-warning' : ''}">
                                        <td>
                                            <span class="badge bg-primary">${doc.tipo}</span>
                                        </td>
                                        <td>
                                            <strong>${doc.nome}</strong>
                                            ${doc.observacoes ? `<br><small class="text-muted">${doc.observacoes.substring(0, 50)}${doc.observacoes.length > 50 ? '...' : ''}</small>` : ''}
                                        </td>
                                        <td>${doc.razao_social || 'N/A'}</td>
                                        <td>${this.formatDate(doc.data_emissao)}</td>
                                        <td>${this.formatDate(doc.data_vencimento)}</td>
                                        <td>
                                            <span class="badge ${this.getStatusBadgeClass(statusGeral)}">
                                                ${this.getStatusText(statusGeral)}
                                            </span>
                                        </td>
                                        <td>
                                            <span class="badge ${diasRestantes < 0 ? 'bg-danger' : diasRestantes <= 30 ? 'bg-warning' : 'bg-success'}">
                                                ${diasRestantes < 0 ? 'Vencido' : `${diasRestantes}d`}
                                            </span>
                                        </td>
                                        <td>
                                            <div class="btn-group btn-group-sm">
                                                <button class="btn btn-outline-info" onclick="app.visualizarDocumento(${doc.id})" title="Ver Andamentos">
                                                    <i class="fas fa-history"></i>
                                                </button>
                                                ${doc.arquivo_path ? `
                                                    <button class="btn btn-outline-success" onclick="app.downloadDocumento(${doc.id})" title="Download">
                                                        <i class="fas fa-download"></i>
                                                    </button>
                                                ` : ''}
                                                <button class="btn btn-outline-primary" onclick="app.editarDocumento(${doc.id})" title="Editar">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn btn-outline-danger" onclick="app.excluirDocumento(${doc.id})" title="Excluir">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
        }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    }

    // ✅ MÉTODOS AUXILIARES PARA O RENDERLISTADOCUMENTOS
    getDocumentStatus(documento) {
        const vencimento = new Date(documento.data_vencimento);
        const hoje = new Date();
        const diffTime = vencimento - hoje;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'expired';
        if (diffDays <= 30) return 'expiring';
        return 'valid';
    }

    getDocumentStatusClass(status) {
        switch (status) {
            case 'valid': return 'status-valid';
            case 'expiring': return 'status-expiring';
            case 'expired': return 'status-expired';
            default: return 'status-valid';
        }
    }

    getDocumentStatusText(status) {
        switch (status) {
            case 'valid': return 'Válido';
            case 'expiring': return 'Vencendo';
            case 'expired': return 'Vencido';
            default: return 'Válido';
        }
    }

    calculateDiasRestantes(dataVencimento) {
        if (!dataVencimento) return 0;

        // ✅ CORRIGIDO: Usar apenas a data (YYYY-MM-DD) sem timezone
        const dataVencimentoStr = dataVencimento.split('T')[0]; // Pega apenas YYYY-MM-DD
        const [ano, mes, dia] = dataVencimentoStr.split('-');

        // Criar data em UTC sem ajustes de timezone
        const vencimento = new Date(Date.UTC(parseInt(ano), parseInt(mes) - 1, parseInt(dia)));
        const hoje = new Date();

        // Converter "hoje" para UTC também (só a parte de data)
        const hojeUTC = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));

        // Calcular diferença
        const diffTime = vencimento - hojeUTC;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        console.log(`📅 Data vencimento: ${dataVencimentoStr}, Hoje (UTC): ${hojeUTC.toISOString().split('T')[0]}, Dias restantes: ${diffDays}`);

        return diffDays;
    }
    // No método renderFormularioDocumento, substitua a parte do tipo:
    async renderFormularioDocumento() {
        try {
            const empresas = await this.apiRequest('/empresas');
            const responsaveis = await this.apiRequest('/responsaveis');

            return `
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0" id="titulo-formulario">Cadastrar Novo Documento</h5>
                    <button class="btn btn-outline-secondary btn-sm" onclick="app.voltarParaLista()">
                        <i class="fas fa-arrow-left"></i> Voltar para Lista
                    </button>
                </div>
                <div class="card-body">
                    <form id="formDocumento" onsubmit="app.salvarDocumento(event)">
                        <input type="hidden" id="documentoId">
                        
                        <!-- Mensagens de status -->
                        <div id="mensagemStatus"></div>

                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label class="form-label required-field">Tipo de Documento</label>
                                    <select class="form-select" id="tipo" required>
                                        <option value="">Selecione o tipo de documento...</option>
                                        <optgroup label="ALVARÁ">
                                            <option value="ALVARÁ DE FUNCIONAMENTO">ALVARÁ DE FUNCIONAMENTO</option>
                                            <option value="ALVARÁ SANITÁRIO">ALVARÁ SANITÁRIO</option>
                                            <option value="ALVARÁ DE PUBLICIDADE">ALVARÁ DE PUBLICIDADE</option>
                                            <option value="ALVARÁ AMBIENTAL">ALVARÁ AMBIENTAL</option>
                                            <option value="AVCB">AVCB</option>
                                        </optgroup>
                                        <optgroup label="TVL">
                                        <option value="TVL">TVL SALVADOR</option>
                                        </optgroup>
                                        <optgroup label="PROCURAÇÕES ELETRÔNICAS">
                                        <option value="PROCURAÇÃO ELETRÔNICA FEDERAL">PROCURAÇÃO ELETRÔNICA FEDERAL</option>
                                        <option value="PROCURAÇÃO ELETRÔNICA ESTADUAL">PROCURAÇÃO ELETRÔNICA ESTADUAL</option>
                                        </optgroup>
                                        <optgroup label="CERTIDÕES NEGATIVAS DE DÉBITOS">
                                            <option value="CERTIDÃO FEDERAL">CERTIDÃO FEDERAL</option>
                                            <option value="CERTIDÃO ESTADUAL">CERTIDÃO ESTADUAL</option>
                                            <option value="CERTIDÃO MUNICIPAL">CERTIDÃO MUNICIPAL</option>
                                            <option value="CERTIDÃO TRABALHISTA">CERTIDÃO TRABALHISTA</option>
                                            <option value="CERTIDÃO FGTS">CERTIDÃO FGTS</option>
                                            <option value="CERTIDÃO CONCORDATA E FALÊNCIA">CERTIDÃO CONCORDATA E FALÊNCIA</option>
                                        </optgroup>
                                        <optgroup label="TFF">
                                            <option value="TFF - LAURO DE FREITAS">TFF - LAURO DE FREITAS</option>
                                            <option value="TFF - SALVADOR">TFF - SALVADOR</option>
                                            <option value="TFF - CAMAÇARI">TFF - CAMAÇARI</option>
                                            <option value="TFF - DIAS D'AVILA">TFF - DIAS D'AVILA</option>
                                            <option value="TFF - FEIRA DA MATA">TFF - FEIRA DA MATA</option>
                                            <option value="TFF - FORTALEZA">TFF - FORTALEZA</option>
                                            <option value="TFF - ILHÉUS">TFF - ILHÉUS</option>
                                            <option value="TFF - ITINGA DO MARANHÃO">TFF - ITINGA DO MARANHÃO</option>
                                            <option value="TFF - MARAU">TFF - MARAU</option>
                                            <option value="TFF - VÁRZEA GRANDE">TFF - VÁRZEA GRANDE</option>
                                            <option value="TFF - CONCEIÇÃO DO JACUÍPE">TFF - CONCEIÇÃO DO JACUÍPE</option>
                                            <option value="TFF - CUIABÁ">TFF - CUIABÁ</option>
                                            <option value="TFF - MUCUGÊ">TFF - MUCUGÊ</option>
                                            <option value="TFF - RECIFE">TFF - RECIFE</option>
                                            <option value="TFF - NATAL">TFF - NATAL</option>
                                            <option value="TFF - PIRITIBA">TFF - PIRITIBA</option>
                                            <option value="TFF - SIMÕES FILHO">TFF - SIMÕES FILHO</option>
                                            <option value="TFF - CANDEIAS">TFF - CANDEIAS</option>
                                            <option value="TFF - ITABUNA">TFF - ITABUNA</option>
                                        </optgroup>
                                        <optgroup label="DECLARAÇÕES">
                                        <option value="DECLARAÇÃO SIMEI (MEI)">DECLARAÇÃO SIMEI (MEI)</option>
                                        <option value="DECLARAÇÃO DE FATURAMENTO CAMAÇARI">DECLARAÇÃO DE FATURAMENTO CAMAÇARI</option>
                                        <option value="DECLARAÇÃO DE FATURAMENTO DIAS D'AVILA">DECLARAÇÃO DE FATURAMENTO DIAS D'AVILA</option>
                                        </optgroup>
                                        <option value="OUTROS">OUTROS</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label class="form-label required-field">Descrição/Número</label>
                                    <input type="text" class="form-control" id="nome" 
                                           placeholder="Ex: Número do documento, descrição específica..." required>
                                </div>
                            </div>
                        </div>

                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label class="form-label required-field">Empresa</label>
                                    <select class="form-select" id="empresa_id" required>
                                        <option value="">Selecione a empresa...</option>
                                        ${empresas.map(empresa => `
                                            <option value="${empresa.id}">
                                                ${empresa.razao_social} 
                                                ${empresa.nome_fantasia ? `- ${empresa.nome_fantasia}` : ''}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label class="form-label required-field">Responsável</label>
                                    <select class="form-select" id="responsavel_id" required>
                                        <option value="">Selecione o responsável...</option>
                                        ${responsaveis.map(resp => `
                                            <option value="${resp.id}">
                                                ${resp.nome} - ${resp.funcao}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label class="form-label required-field">Data de Emissão</label>
                                    <input type="date" class="form-control" id="data_emissao" required>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label class="form-label required-field">Data de Vencimento</label>
                                    <input type="date" class="form-control" id="data_vencimento" required>
                                </div>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Observações</label>
                            <textarea class="form-control" id="observacoes" rows="3" 
                                      placeholder="Adicione observações sobre este documento..."></textarea>
                        </div>

                        <div class="mb-4">
                            <label class="form-label">Anexar Arquivo</label>
                            <div class="file-upload" onclick="document.getElementById('arquivo').click()">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <p>Clique para selecionar o arquivo</p>
                                <p class="small text-muted">Formatos: PDF, JPG, PNG (Máx. 10MB)</p>
                                <input type="file" id="arquivo" style="display: none;" 
                                       accept=".pdf,.jpg,.jpeg,.png" onchange="app.handleFileSelect(this.files)">
                            </div>
                            <div id="infoArquivo" class="file-info"></div>
                        </div>

                        <div class="d-flex gap-2">
                            <button type="submit" class="btn btn-primary" id="btnSalvar">
                                <i class="fas fa-save"></i> Salvar Documento
                            </button>
                            <button type="button" class="btn btn-outline-secondary" onclick="app.voltarParaLista()">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        } catch (error) {
            return `
            <div class="alert alert-danger">
                <h4>Erro ao carregar formulário</h4>
                <p>${error.message}</p>
            </div>
        `;
        }
    }

    abrirFormularioNovoDocumento() {
        document.getElementById('lista-documentos').style.display = 'none';
        document.getElementById('formulario-documento').style.display = 'block';
        this.limparFormularioDocumento();
    }

    voltarParaLista() {
        document.getElementById('formulario-documento').style.display = 'none';
        document.getElementById('lista-documentos').style.display = 'block';
        this.limparFormularioDocumento();
    }

    limparFormularioDocumento() {
        document.getElementById('formDocumento').reset();
        document.getElementById('documentoId').value = '';
        document.getElementById('titulo-formulario').textContent = 'Cadastrar Novo Documento';
        document.getElementById('infoArquivo').className = 'file-info';
        document.getElementById('infoArquivo').innerHTML = '';
        this.arquivoSelecionado = null;
        this.documentoAtual = null;
        this.limparMensagemDocumento();
    }

    handleFileSelect(files) {
        const file = files[0];
        if (!file) return;

        // Validar tipo de arquivo
        const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!tiposPermitidos.includes(file.type)) {
            this.mostrarMensagemDocumento('Tipo de arquivo não permitido. Use PDF, JPG ou PNG.', 'error');
            return;
        }

        // Validar tamanho (10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.mostrarMensagemDocumento('Arquivo muito grande. Tamanho máximo: 10MB.', 'error');
            return;
        }

        this.arquivoSelecionado = file;

        // Mostrar info do arquivo
        const infoArquivo = document.getElementById('infoArquivo');
        infoArquivo.innerHTML = `
            <strong>Arquivo selecionado:</strong> ${file.name}<br>
            <small>Tamanho: ${(file.size / 1024 / 1024).toFixed(2)} MB</small>
        `;
        infoArquivo.className = 'file-info show';
    }

    async salvarDocumento(event) {
        event.preventDefault();
        console.log('=== INICIANDO SALVAMENTO DE DOCUMENTO ===');

        // Validar campos obrigatórios - AGORA SÓ TIPO E DESCRIÇÃO
        const camposObrigatorios = ['tipo', 'nome', 'empresa_id', 'responsavel_id', 'data_emissao', 'data_vencimento'];
        for (const campo of camposObrigatorios) {
            const elemento = document.getElementById(campo);
            if (!elemento.value.trim()) {
                this.mostrarMensagemDocumento(`Preencha o campo: ${elemento.previousElementSibling.textContent}`, 'error');
                elemento.focus();
                return;
            }
        }

        // Preparar dados - AGORA SÓ TEMOS 'tipo' E 'nome' (descrição)
        const formData = new FormData();
        formData.append('nome', document.getElementById('nome').value); // Agora é a descrição/número
        formData.append('tipo', document.getElementById('tipo').value); // Tipo selecionado
        formData.append('empresa_id', document.getElementById('empresa_id').value);
        formData.append('responsavel_id', document.getElementById('responsavel_id').value);
        formData.append('data_emissao', document.getElementById('data_emissao').value);
        formData.append('data_vencimento', document.getElementById('data_vencimento').value);
        formData.append('observacoes', document.getElementById('observacoes').value);

        // Adicionar arquivo se existir
        if (this.arquivoSelecionado) {
            formData.append('arquivo', this.arquivoSelecionado);
        }

        const documentoId = document.getElementById('documentoId').value;
        const isEdicao = !!documentoId;

        try {
            // Mostrar loading
            const btnSalvar = document.getElementById('btnSalvar');
            const originalText = btnSalvar.innerHTML;
            btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            btnSalvar.disabled = true;

            let response;
            if (isEdicao) {
                response = await fetch(`/api/documentos/${documentoId}`, {
                    method: 'PUT',
                    body: formData
                });
            } else {
                response = await fetch('/api/documentos', {
                    method: 'POST',
                    body: formData
                });
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao salvar documento');
            }

            // Sucesso
            this.mostrarMensagemDocumento(
                `Documento ${isEdicao ? 'atualizado' : 'criado'} com sucesso!`,
                'success'
            );

            // Recarregar lista após 1 segundo
            setTimeout(() => {
                this.loadPage('documentos');
            }, 1000);
        } catch (error) {
            console.error('Erro ao salvar documento:', error);
            this.mostrarMensagemDocumento(error.message, 'error');
        } finally {
            // Restaurar botão
            const btnSalvar = document.getElementById('btnSalvar');
            btnSalvar.innerHTML = '<i class="fas fa-save"></i> Salvar Documento';
            btnSalvar.disabled = false;
        }
    }

    async editarDocumento(id) {
        try {
            const documento = await this.apiRequest(`/documentos/${id}`);
            this.documentoAtual = documento;

            // Preencher formulário
            document.getElementById('documentoId').value = documento.id;
            document.getElementById('nome').value = documento.nome;
            document.getElementById('tipo').value = documento.tipo;
            document.getElementById('empresa_id').value = documento.empresa_id;
            document.getElementById('responsavel_id').value = documento.responsavel_id;
            document.getElementById('data_emissao').value = documento.data_emissao;
            document.getElementById('data_vencimento').value = documento.data_vencimento;
            document.getElementById('observacoes').value = documento.observacoes || '';

            document.getElementById('titulo-formulario').textContent = 'Editar Documento';

            // Mostrar info do arquivo atual se existir
            if (documento.arquivo_path) {
                const infoArquivo = document.getElementById('infoArquivo');
                const nomeArquivo = documento.arquivo_path.split('-').slice(2).join('-');
                infoArquivo.innerHTML = `
                    <strong>Arquivo atual:</strong> ${nomeArquivo}<br>
                    <small>Selecione um novo arquivo para substituir</small>
                `;
                infoArquivo.className = 'file-info show';
            }

            // Mostrar formulário
            this.abrirFormularioNovoDocumento();
        } catch (error) {
            this.mostrarMensagemDocumento(`Erro ao carregar documento: ${error.message}`, 'error');
        }
    }

    async excluirDocumento(id) {
        if (!confirm('Tem certeza que deseja excluir este documento?')) {
            return;
        }

        try {
            await this.apiRequest(`/documentos/${id}`, { method: 'DELETE' });
            this.showAlert('Documento excluído com sucesso!', 'success');
            this.loadPage('documentos');
        } catch (error) {
            this.showAlert(`Erro ao excluir documento: ${error.message}`, 'danger');
        }
    }

    async downloadDocumento(id) {
        try {
            window.open(`/api/documentos/${id}/download`, '_blank');
        } catch (error) {
            this.showAlert(`Erro ao baixar documento: ${error.message}`, 'danger');
        }
    }

    mostrarMensagemDocumento(mensagem, tipo) {
        const div = document.getElementById('mensagemStatus');
        div.className = `alert alert-${tipo === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
        div.innerHTML = `
            ${mensagem}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
    }

    limparMensagemDocumento() {
        const div = document.getElementById('mensagemStatus');
        div.className = '';
        div.innerHTML = '';
    }

    // ============================
    // ✅ GESTÃO DE RESPONSÁVEIS
    // ============================

    // ✅ MÉTODO COMPLETO PARA MODAL DE RESPONSÁVEIS
    async openResponsavelModal(responsavel = null) {
        try {
            console.log('Abrindo modal de responsável:', responsavel);

            // Buscar empresas para o select
            const empresas = await this.apiRequest('/empresas');

            const title = responsavel ? 'Editar Responsável' : 'Novo Responsável';
            const isEdicao = !!responsavel;

            console.log('Modo:', isEdicao ? 'Edição' : 'Cadastro');
            console.log('Dados do responsável:', responsavel);
            console.log('Empresas disponíveis:', empresas.length);

            const content = `
            <form id="responsavelForm">
                <input type="hidden" id="responsavelId" value="${responsavel?.id || ''}">
                
                <div class="mb-3">
                    <label class="form-label">Nome Completo *</label>
                    <input type="text" class="form-control" id="responsavelNome" 
                           value="${responsavel?.nome || ''}" 
                           placeholder="Digite o nome completo" required>
                </div>

                <div class="mb-3">
                    <label class="form-label">E-mail *</label>
                    <input type="email" class="form-control" id="responsavelEmail" 
                           value="${responsavel?.email || ''}" 
                           placeholder="email@empresa.com" required>
                </div>

                <div class="mb-3">
                    <label class="form-label">Telefone *</label>
                    <input type="text" class="form-control" id="responsavelTelefone" 
                           value="${responsavel?.telefone || ''}" 
                           placeholder="(11) 99999-9999" required>
                </div>

                <div class="mb-3">
                    <label class="form-label">Função *</label>
                    <select class="form-select" id="responsavelFuncao" required>
                        <option value="">Selecione a função...</option>
                        <option value="Fiscal" ${responsavel?.funcao === 'Fiscal' ? 'selected' : ''}>Fiscal</option>
                        <option value="Contábil" ${responsavel?.funcao === 'Contábil' ? 'selected' : ''}>Contábil</option>
                        <option value="Departamento Pessoal" ${responsavel?.funcao === 'Departamento Pessoal' ? 'selected' : ''}>Departamento Pessoal</option>
                        <option value="Administrativo" ${responsavel?.funcao === 'Administrativo' ? 'selected' : ''}>Administrativo</option>
                        <option value="Jurídico" ${responsavel?.funcao === 'Jurídico' ? 'selected' : ''}>Jurídico</option>
                    </select>
                </div>

                <div class="mb-3">
                    <label class="form-label">Empresa *</label>
                    <select class="form-select" id="responsavelEmpresaId" required>
                        <option value="">Selecione a empresa...</option>
                        ${empresas.map(empresa => `
                            <option value="${empresa.id}" ${responsavel?.empresa_id == empresa.id ? 'selected' : ''}>
                                ${empresa.razao_social} 
                                ${empresa.nome_fantasia ? `- ${empresa.nome_fantasia}` : ''}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div class="mb-3">
                    <label class="form-label">Observações</label>
                    <textarea class="form-control" id="responsavelObservacoes" rows="3" 
                              placeholder="Informações adicionais sobre o responsável">${responsavel?.observacoes || ''}</textarea>
                </div>
            </form>
        `;

            this.showModal(title, content, () => this.saveResponsavel());

            console.log('Modal aberto com sucesso');
        } catch (error) {
            console.error('Erro ao abrir modal de responsável:', error);
            this.showAlert('Erro ao carregar dados do responsável: ' + error.message, 'danger');
        }
    }

    // ✅ MÉTODO CORRIGIDO PARA SALVAR RESPONSÁVEL
    async saveResponsavel() {
        try {
            console.log('🟡 INICIANDO saveResponsavel...');

            // Capturar dados do formulário
            const responsavelId = document.getElementById('responsavelId')?.value || '';
            const nome = document.getElementById('responsavelNome')?.value || '';
            const email = document.getElementById('responsavelEmail')?.value || '';
            const telefone = document.getElementById('responsavelTelefone')?.value || '';
            const funcao = document.getElementById('responsavelFuncao')?.value || '';
            const empresa_id = document.getElementById('responsavelEmpresaId')?.value || '';

            console.log('📝 Dados capturados do formulário:', {
                responsavelId,
                nome,
                email,
                telefone,
                funcao,
                empresa_id
            });

            // Validação dos campos obrigatórios
            const camposObrigatorios = { nome, email, telefone, funcao, empresa_id };
            for (const [campo, valor] of Object.entries(camposObrigatorios)) {
                if (!valor.trim()) {
                    const mensagem = `Preencha o campo: ${campo}`;
                    console.log(`❌ ${mensagem}`);
                    this.showAlert(mensagem, 'warning');
                    return;
                }
            }

            const formData = {
                nome: nome.trim(),
                email: email.trim(),
                telefone: telefone.trim(),
                funcao: funcao,
                empresa_id: parseInt(empresa_id)
                // Removido observacoes
            };

            console.log('📤 Dados que serão enviados para API:', formData);

            const isEdicao = !!responsavelId;
            const url = isEdicao ? `/responsaveis/${responsavelId}` : '/responsaveis';
            const method = isEdicao ? 'PUT' : 'POST';

            console.log(`🔄 Fazendo requisição: ${method} ${url}`);

            const response = await this.apiRequest(url, {
                method: method,
                body: formData
            });

            console.log('✅ Resposta da API:', response);

            this.showAlert(
                `Responsável ${isEdicao ? 'atualizado' : 'criado'} com sucesso!`,
                'success'
            );

            // Fechar modal e recarregar
            const modal = bootstrap.Modal.getInstance(document.getElementById('dynamicModal'));
            if (modal) modal.hide();

            setTimeout(() => {
                this.loadPage('responsaveis');
            }, 1000);
        } catch (error) {
            console.error('❌ ERRO DETALHADO no saveResponsavel:', error);
            this.showAlert(`Erro ao salvar responsável: ${error.message}`, 'danger');
        }
    }

    // ✅ MÉTODO PARA FORMATAR TELEFONE
    formatarTelefone(input) {
        let value = input.value.replace(/\D/g, '');

        if (value.length <= 11) {
            if (value.length <= 2) {
                value = value.replace(/(\d{0,2})/, '($1');
            } else if (value.length <= 6) {
                value = value.replace(/(\d{2})(\d{0,4})/, '($1) $2');
            } else if (value.length <= 10) {
                value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
            } else {
                value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            }
        }

        input.value = value;
    }

    async renderResponsaveis() {
        try {
            const responsaveis = await this.apiRequest('/responsaveis');

            return `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1 class="page-title">
                        <i class="fas fa-users me-2"></i>Responsáveis
                    </h1>
                    <button class="btn btn-primary" onclick="app.openResponsavelModal()">
                        <i class="fas fa-plus"></i> Novo Responsável
                    </button>
                </div>

                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <span>Lista de Responsáveis</span>
                        <span class="badge bg-primary">${responsaveis.length} responsáveis</span>
                    </div>
                    <div class="card-body">
                        ${responsaveis.length === 0 ?
                    '<div class="text-center py-5"><i class="fas fa-users fa-3x text-muted mb-3"></i><p class="text-muted">Nenhum responsável cadastrado</p></div>' :
                    this.renderResponsaveisTable(responsaveis)
                }
                    </div>
                </div>
            `;
        } catch (error) {
            return `
                <div class="alert alert-danger">
                    <h4>Erro ao carregar responsáveis</h4>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="app.loadPage('responsaveis')">
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
    }

    renderResponsaveisTable(responsaveis) {
        return `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>E-mail</th>
                        <th>Telefone</th>
                        <th>Função</th>
                        <th>Empresa</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${responsaveis.map(resp => `
                        <tr>
                            <td>${resp.nome}</td>
                            <td>${resp.email}</td>
                            <td>${resp.telefone}</td>
                            <td><span class="badge bg-secondary">${resp.funcao}</span></td>
                            <td>${resp.empresa_nome || 'N/A'}</td>
                            <td>
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-outline-warning" onclick="app.editarResponsavel(${resp.id})" title="Editar">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-outline-danger" onclick="app.excluirResponsavel(${resp.id})" title="Excluir">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    }

    // ✅ MÉTODO PARA EDITAR RESPONSÁVEL
    async editarResponsavel(id) {
        try {
            console.log(`Editando responsável ID: ${id}`);

            // Buscar dados do responsável
            const responsavel = await this.apiRequest(`/responsaveis/${id}`);
            console.log('Dados do responsável:', responsavel);

            // Abrir modal de edição
            await this.openResponsavelModal(responsavel);
        } catch (error) {
            console.error('Erro ao carregar responsável para edição:', error);
            this.showAlert(`Erro ao carregar responsável: ${error.message}`, 'danger');
        }
    }

    // ✅ MÉTODO PARA EXCLUIR RESPONSÁVEL
    async excluirResponsavel(id) {
        try {
            console.log(`Tentando excluir responsável ID: ${id}`);

            if (!confirm('Tem certeza que deseja excluir este responsável?')) {
                return;
            }

            // Buscar dados do responsável para confirmar
            const responsavel = await this.apiRequest(`/responsaveis/${id}`);

            if (!confirm(`Confirmar exclusão do responsável: ${responsavel.nome}?`)) {
                return;
            }

            await this.apiRequest(`/responsaveis/${id}`, { method: 'DELETE' });
            this.showAlert('Responsável excluído com sucesso!', 'success');

            // Recarregar a lista
            this.loadPage('responsaveis');
        } catch (error) {
            console.error('Erro ao excluir responsável:', error);

            if (error.message.includes('documentos vinculados')) {
                this.showAlert('Não é possível excluir: existem documentos vinculados a este responsável', 'warning');
            } else {
                this.showAlert(`Erro ao excluir responsável: ${error.message}`, 'danger');
            }
        }
    }

    // ============================
    // ✅ CONSULTA CNPJ
    // ============================

    // ✅ MÉTODOS PARA CONSULTA CNPJ
    async consultarCNPJ() {
        const cnpjInput = document.getElementById('cnpjConsulta');
        const cnpj = cnpjInput.value.replace(/\D/g, '');
        const statusDiv = document.getElementById('cnpjConsultaStatus');
        const btnConsultar = document.getElementById('btnConsultarCNPJ');

        // Validação básica do CNPJ
        if (cnpj.length !== 14) {
            statusDiv.innerHTML = `
                <div class="alert alert-warning alert-sm">
                    <i class="fas fa-exclamation-triangle"></i> CNPJ deve ter 14 dígitos
                </div>
            `;
            return;
        }

        try {
            // Mostrar loading
            btnConsultar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Consultando...';
            btnConsultar.disabled = true;
            statusDiv.innerHTML = `
                <div class="alert alert-info alert-sm">
                    <i class="fas fa-sync fa-spin"></i> Consultando CNPJ na Receita Federal...
                </div>
            `;

            console.log(`Consultando CNPJ: ${cnpj}`);

            const response = await fetch(`/api/consulta-cnpj/${cnpj}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro na consulta');
            }

            // Preencher os campos com os dados da consulta
            this.preencherDadosEmpresa(data);

            statusDiv.innerHTML = `
                <div class="alert alert-success alert-sm">
                    <i class="fas fa-check-circle"></i> Dados da empresa carregados com sucesso!
                </div>
            `;

            // Focar no próximo campo
            document.getElementById('telefone').focus();
        } catch (error) {
            console.error('Erro na consulta de CNPJ:', error);
            statusDiv.innerHTML = `
                <div class="alert alert-danger alert-sm">
                    <i class="fas fa-times-circle"></i> ${error.message}
                </div>
            `;
        } finally {
            // Restaurar botão
            btnConsultar.innerHTML = '<i class="fas fa-search me-1"></i> Consultar';
            btnConsultar.disabled = false;
        }
    }

    preencherDadosEmpresa(data) {
        // Limitar o telefone para 50 caracteres
        const telefoneLimitado = data.telefone ? data.telefone.substring(0, 50) : '';

        document.getElementById('cnpj').value = data.cnpj || '';
        document.getElementById('razaoSocial').value = data.razao_social || '';
        document.getElementById('nomeFantasia').value = data.nome_fantasia || '';
        document.getElementById('telefone').value = telefoneLimitado;
        document.getElementById('email').value = data.email || '';
        document.getElementById('endereco').value = data.endereco || '';
    }

    formatarCNPJ(input) {
        let value = input.value.replace(/\D/g, '');

        if (value.length <= 14) {
            value = value.replace(/(\d{2})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1/$2');
            value = value.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
        }

        input.value = value;
    }

    formatarCNPJConsulta(input) {
        let value = input.value.replace(/\D/g, '');

        if (value.length <= 14) {
            value = value.replace(/(\d{2})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1/$2');
            value = value.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
        }

        input.value = value;
    }

    // ============================
    // ✅ MÉTODOS GERAIS
    // ============================

    // ✅ MÉTODO SHOWMODAL ATUALIZADO
    showModal(title, content, onSave, size = 'modal-lg') {
        try {
            // Limpar backdrop e modais anteriores
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
            const oldModals = document.querySelectorAll('.modal.fade');
            oldModals.forEach(modal => {
                const bsInstance = bootstrap.Modal.getInstance(modal);
                if (bsInstance) bsInstance.dispose();
                modal.remove();
            });

            // Resetar body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';

            // Criar novo modal
            const modalHTML = `
            <div class="modal fade" id="dynamicModal" tabindex="-1" aria-labelledby="modalTitle" aria-hidden="true">
                <div class="modal-dialog ${size} modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="modalTitle">${this.escapeHtml(title)}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                        </div>
                        <div class="modal-body">
                            ${content}
                        </div>
                        <div class="modal-footer">
                            ${onSave ? `
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="fas fa-times me-1"></i> Cancelar
                                </button>
                                <button type="button" class="btn btn-primary" id="modalSaveBtn">
                                    <i class="fas fa-save me-1"></i> Salvar
                                </button>
                            ` : `
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="fas fa-times me-1"></i> Fechar
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);
            const modalElement = document.getElementById('dynamicModal');

            // Evento de limpeza
            const cleanupModal = () => {
                // Remover listeners
                if (saveBtn) {
                    saveBtn.removeEventListener('click', onSave);
                }

                // Remover elemento
                modalElement.remove();

                // Limpar backdrop
                document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());

                // Resetar estilos do body
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';

                console.log('✅ Modal limpo com sucesso');
            };

            modalElement.addEventListener('hidden.bs.modal', cleanupModal, { once: true });

            // Adicionar save listener
            if (onSave) {
                const saveBtn = document.getElementById('modalSaveBtn');
                saveBtn.addEventListener('click', async () => {
                    await onSave();
                    // Não fechar automático, deixar o onSave decidir
                });
            }

            // Mostrar modal
            const bsModal = new bootstrap.Modal(modalElement, {
                backdrop: 'static',
                keyboard: false
            });
            bsModal.show();

        } catch (error) {
            console.error('❌ Erro ao criar modal:', error);
            this.showAlert('Erro ao abrir modal: ' + error.message, 'danger');
        }
    }

    // ✅ MÉTODO APIREQUEST MELHORADO
    async apiRequest(endpoint, options = {}) {
        const url = API_BASE + endpoint;
        console.log(`Fazendo requisição para: ${url}`);

        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            };

            if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
                config.body = JSON.stringify(config.body);
            }

            const response = await fetch(url, config);

            // Verificar se a resposta é JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Resposta não é JSON:', text.substring(0, 200));

                // Se for erro 404, pode ser que a rota não exista
                if (response.status === 404) {
                    throw new Error(`Rota não encontrada: ${url}`);
                }

                throw new Error(`Resposta inválida do servidor: ${response.status}`);
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Erro ${response.status}: ${data.message || 'Erro desconhecido'}`);
            }

            return data;
        } catch (error) {
            console.error(`Erro na requisição para ${url}:`, error);

            // Melhorar mensagem de erro para o usuário
            if (error.message.includes('Rota não encontrada')) {
                throw new Error('Funcionalidade não disponível no servidor. Verifique se o backend está atualizado.');
            } else if (error.message.includes('Failed to fetch')) {
                throw new Error('Não foi possível conectar com o servidor. Verifique se o backend está rodando.');
            }

            throw error;
        }
    }

    showAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.querySelector('.content-area').prepend(alert);

        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }

    initializePageEvents(page) {
        console.log(`Eventos inicializados para: ${page}`);
    }

    // ✅ MÉTODO DE TESTE (OPCIONAL)
    testarNotificacao() {
        console.log('🧪 TESTANDO NOTIFICAÇÃO...');

        const alertasTeste = {
            totalAlertas: 3,
            totalVencidos: 1,
            totalProximos: 2
        };

        this.mostrarNotificacao(alertasTeste);
    }

    // ✅ MÉTODO AUXILIAR PARA FORMATAR CNPJ
    formatCNPJ(cnpj) {
        if (!cnpj) return 'N/A';
        return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }

    // ✅ MÉTODO PARA RENDERIZAR ERRO
    renderError(module, error) {
        return `
            <div class="alert alert-danger">
                <h4>Erro ao carregar ${module}</h4>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="app.loadPage('${module}')">
                    Tentar Novamente
                </button>
            </div>
        `;
    }
}

// Inicializar aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    console.log('🚀 Aplicação inicializada!');
});