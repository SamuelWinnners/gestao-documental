// frontend/app.js

// ✅ URL para PRODUÇÃO - SEU BACKEND NO VERCEL
const API_BASE = 'https://gestao-documental-backend.vercel.app/api';
class App {
    constructor() {
        this.currentPage = 'dashboard';
        this.documentoAtual = null;
        this.arquivoSelecionado = null;
        this.init();
    }

    init() {
        this.testConnection();
        this.bindEvents();
        this.loadPage('dashboard');
    }

    async testConnection() {
        try {
            console.log('Testando conexão com o servidor...');
            const response = await fetch(`${API_BASE}/health`); // <-- aqui
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

    bindEvents() {
        // Navegação do sidebar
        document.addEventListener('click', (e) => {
            if (e.target.closest('.sidebar-nav .nav-link')) {
                e.preventDefault();
                const link = e.target.closest('.nav-link');
                this.setActiveLink(link);

                const page = link.getAttribute('data-page');
                this.loadPage(page);
            }
        });
    }

    setActiveLink(activeLink) {
        document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
            link.classList.remove('active');
        });
        activeLink.classList.add('active');
    }

    async loadPage(page) {
        this.currentPage = page;
        console.log(`Carregando página: ${page}`);

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
                default:
                    content = '<div class="alert alert-warning">Página não encontrada</div>';
            }

            document.getElementById('page-content').innerHTML = content;
            this.initializePageEvents(page);

        } catch (error) {
            console.error('Erro ao carregar página:', error);
            document.getElementById('page-content').innerHTML = `
                <div class="alert alert-danger">
                    <h4>Erro ao carregar a página</h4>
                    <p><strong>${error.message}</strong></p>
                    <p>Verifique se:</p>
                    <ul>
                        <li>O servidor backend está rodando</li>
                        <li>O banco de dados foi importado</li>
                        <li>Não há erros no console do navegador</li>
                    </ul>
                    <button class="btn btn-sm btn-outline-primary" onclick="app.loadPage('${page}')">
                        Tentar Novamente
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="app.testConnection()">
                        Testar Conexão
                    </button>
                </div>
            `;
        }
    }

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
    // No método renderTabelaDocumentosDashboard:
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


    // ✅ MÉTODOS PARA EMPRESAS
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

    // ✅ MÉTODO openEmpresaModal ATUALIZADO
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

    // ✅ MÉTODO PARA ESCAPAR HTML (segurança)
    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
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

    // ✅ MÉTODOS PARA DOCUMENTOS
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
    // ✅ MÉTODO COMPLETO PARA RENDERIZAR LISTA DE DOCUMENTOS
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
        const vencimento = new Date(dataVencimento);
        const hoje = new Date();
        // Resetar horas para comparar apenas datas
        hoje.setHours(0, 0, 0, 0);
        vencimento.setHours(0, 0, 0, 0);

        const diffTime = vencimento - hoje;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    getStatusBadgeClass(status) {
        const classes = {
            'pendente': 'bg-warning',
            'em_andamento': 'bg-info',
            'concluido': 'bg-success',
            'cancelado': 'bg-danger',
            'valid': 'bg-success',
            'expiring': 'bg-warning',
            'expired': 'bg-danger'
        };
        return classes[status] || 'bg-secondary';
    }

    getStatusText(status) {
        const texts = {
            'pendente': 'Pendente',
            'em_andamento': 'Em Andamento',
            'concluido': 'Concluído',
            'cancelado': 'Cancelado',
            'valid': 'Válido',
            'expiring': 'Vencendo',
            'expired': 'Vencido'
        };
        return texts[status] || status;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            return 'Data inválida';
        }
    }

    formatCNPJ(cnpj) {
        if (!cnpj) return 'N/A';
        return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
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

    // ✅ MÉTODOS PARA RESPONSÁVEIS
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
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    openResponsavelModal() {
        this.showModal('Novo Responsável', `
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i> Funcionalidade em desenvolvimento
            </div>
        `, () => { });
    }

    // ✅ MÉTODOS AUXILIARES
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
        const vencimento = new Date(dataVencimento);
        const hoje = new Date();
        const diffTime = vencimento - hoje;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('pt-BR');
        } catch (error) {
            return 'Data inválida';
        }
    }

    formatCNPJ(cnpj) {
        if (!cnpj) return 'N/A';
        return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }

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

    // ✅ MÉTODOS GERAIS
    // ✅ MÉTODO SHOWMODAL ATUALIZADO
    showModal(title, content, onSave, size = 'modal-lg') {
        const modalHtml = `
        <div class="modal fade" id="dynamicModal" tabindex="-1">
            <div class="modal-dialog ${size}">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        ${onSave ? `<button type="button" class="btn btn-primary" id="modalSave">Salvar</button>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;

        document.getElementById('modals-container').innerHTML = modalHtml;

        const modal = new bootstrap.Modal(document.getElementById('dynamicModal'));
        modal.show();

        if (onSave) {
            document.getElementById('modalSave').onclick = onSave;
        }

        document.getElementById('dynamicModal').addEventListener('hidden.bs.modal', () => {
            document.getElementById('modals-container').innerHTML = '';
        });
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
}

// Inicializar aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    console.log('🚀 Aplicação inicializada!');
});