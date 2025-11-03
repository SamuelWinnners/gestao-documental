const API_BASE = '/api';

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
            const response = await fetch('/api/health');
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
        const data = await this.apiRequest('/dashboard');
        
        return `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1 class="page-title">Dashboard</h1>
                <button class="btn btn-outline-primary" onclick="app.loadPage('dashboard')">
                    <i class="fas fa-sync-alt"></i> Atualizar
                </button>
            </div>

            <div class="row">
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card card-empresas h-100">
                        <div class="card-body dashboard-card">
                            <div class="text-primary">
                                <i class="fas fa-building fa-2x"></i>
                            </div>
                            <div class="number text-dark">${data.empresas || 0}</div>
                            <div class="title">Empresas Cadastradas</div>
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card card-documentos h-100">
                        <div class="card-body dashboard-card">
                            <div class="text-success">
                                <i class="fas fa-file-alt fa-2x"></i>
                            </div>
                            <div class="number text-dark">${data.documentos || 0}</div>
                            <div class="title">Documentos no Sistema</div>
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card card-vencidos h-100">
                        <div class="card-body dashboard-card">
                            <div class="text-danger">
                                <i class="fas fa-exclamation-triangle fa-2x"></i>
                            </div>
                            <div class="number text-dark">${data.vencidos || 0}</div>
                            <div class="title">Documentos Vencidos</div>
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="card card-proximos h-100">
                        <div class="card-body dashboard-card">
                            <div class="text-warning">
                                <i class="fas fa-clock fa-2x"></i>
                            </div>
                            <div class="number text-dark">${data.proximos || 0}</div>
                            <div class="title">Próximos do Vencimento</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row mt-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <i class="fas fa-clock me-2"></i>Documentos Próximos do Vencimento
                        </div>
                        <div class="card-body">
                            ${this.renderDocumentosProximosTable(data.proximosVencimentos || [])}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async renderEmpresas() {
        const empresas = await this.apiRequest('/empresas');
        
        return `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1 class="page-title">Empresas</h1>
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
                            <th>E-mail</th>
                            <th>Data Cadastro</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${empresas.map(empresa => `
                            <tr>
                                <td>${empresa.razao_social}</td>
                                <td>${empresa.cnpj}</td>
                                <td>${empresa.telefone}</td>
                                <td>${empresa.email}</td>
                                <td>${this.formatDate(empresa.created_at)}</td>
                                <td>
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-warning" onclick="app.editEmpresa(${empresa.id})" title="Editar">
                                            <i class="fas fa-edit"></i>
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

    async renderDocumentos() {
        try {
            const documentos = await this.apiRequest('/documentos');
            const empresas = await this.apiRequest('/empresas');
            const responsaveis = await this.apiRequest('/responsaveis');
            
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
                        ${this.renderFormularioDocumento(empresas, responsaveis)}
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
                                    <th>Documento</th>
                                    <th>Empresa</th>
                                    <th>Tipo</th>
                                    <th>Emissão</th>
                                    <th>Vencimento</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${documentos.map(doc => {
                                    const status = this.getDocumentStatus(doc);
                                    const statusClass = this.getDocumentStatusClass(status);
                                    const statusText = this.getDocumentStatusText(status);
                                    
                                    return `
                                        <tr>
                                            <td>
                                                <strong>${doc.nome}</strong>
                                                ${doc.observacoes ? `<br><small class="text-muted">${doc.observacoes.substring(0, 50)}${doc.observacoes.length > 50 ? '...' : ''}</small>` : ''}
                                            </td>
                                            <td>${doc.razao_social || 'N/A'}</td>
                                            <td><span class="badge bg-secondary">${doc.tipo}</span></td>
                                            <td>${this.formatDate(doc.data_emissao)}</td>
                                            <td>${this.formatDate(doc.data_vencimento)}</td>
                                            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                                            <td>
                                                <div class="btn-group btn-group-sm">
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

    renderFormularioDocumento(empresas, responsaveis) {
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
                                        <option value="">Selecione o tipo...</option>
                                        <option value="Alvará">Alvará</option>
                                        <option value="Licença">Licença</option>
                                        <option value="Certidão">Certidão</option>
                                        <option value="Contrato">Contrato</option>
                                        <option value="Declaração">Declaração</option>
                                        <option value="Outros">Outros</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label class="form-label required-field">Nome do Documento</label>
                                    <input type="text" class="form-control" id="nome" 
                                           placeholder="Ex: Alvará de Funcionamento" required>
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
    }

    async renderResponsaveis() {
        const responsaveis = await this.apiRequest('/responsaveis');
        
        return `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1 class="page-title">Responsáveis</h1>
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

    renderDocumentosProximosTable(documentos) {
        if (!documentos || documentos.length === 0) {
            return '<div class="text-center py-5"><i class="fas fa-check-circle fa-3x text-muted mb-3"></i><p class="text-muted">Nenhum documento próximo do vencimento</p></div>';
        }

        return `
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Documento</th>
                        <th>Empresa</th>
                        <th>Data Vencimento</th>
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
                                <td>${doc.nome}</td>
                                <td>${doc.empresa_nome || 'N/A'}</td>
                                <td>${this.formatDate(doc.data_vencimento)}</td>
                                <td><strong>${dias}</strong> dias</td>
                                <td><span class="status-badge ${statusClass}">Vencendo</span></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    // ========== MÉTODOS PARA DOCUMENTOS ==========

    // Navegação
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

    // Manipulação de arquivos
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

    // Formulário
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

    // Salvar documento (MÉTODO PRINCIPAL)
    async salvarDocumento(event) {
        event.preventDefault();
        console.log('=== INICIANDO SALVAMENTO DE DOCUMENTO ===');

        // Validar campos obrigatórios
        const camposObrigatorios = ['nome', 'tipo', 'empresa_id', 'responsavel_id', 'data_emissao', 'data_vencimento'];
        for (const campo of camposObrigatorios) {
            const elemento = document.getElementById(campo);
            if (!elemento.value.trim()) {
                this.mostrarMensagemDocumento(`Preencha o campo: ${elemento.previousElementSibling.textContent}`, 'error');
                elemento.focus();
                return;
            }
        }

        // Preparar dados
        const formData = new FormData();
        formData.append('nome', document.getElementById('nome').value);
        formData.append('tipo', document.getElementById('tipo').value);
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

    // Editar documento
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

    // Excluir documento
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

    // Download de documento
    async downloadDocumento(id) {
        try {
            window.open(`/api/documentos/${id}/download`, '_blank');
        } catch (error) {
            this.showAlert(`Erro ao baixar documento: ${error.message}`, 'danger');
        }
    }

    // Utilitários para documentos
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
        switch(status) {
            case 'valid': return 'status-valid';
            case 'expiring': return 'status-expiring';
            case 'expired': return 'status-expired';
            default: return 'status-valid';
        }
    }

    getDocumentStatusText(status) {
        switch(status) {
            case 'valid': return 'Válido';
            case 'expiring': return 'Vencendo';
            case 'expired': return 'Vencido';
            default: return 'Válido';
        }
    }

    // Modal Methods
    openEmpresaModal(empresa = null) {
        const title = empresa ? 'Editar Empresa' : 'Nova Empresa';
        const content = `
            <form id="empresaForm">
                <input type="hidden" id="empresaId" value="${empresa?.id || ''}">
                <div class="mb-3">
                    <label class="form-label">Razão Social *</label>
                    <input type="text" class="form-control" id="razaoSocial" value="${empresa?.razao_social || ''}" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Nome Fantasia</label>
                    <input type="text" class="form-control" id="nomeFantasia" value="${empresa?.nome_fantasia || ''}">
                </div>
                <div class="mb-3">
                    <label class="form-label">CNPJ *</label>
                    <input type="text" class="form-control" id="cnpj" value="${empresa?.cnpj || ''}" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Telefone *</label>
                    <input type="text" class="form-control" id="telefone" value="${empresa?.telefone || ''}" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">E-mail *</label>
                    <input type="email" class="form-control" id="email" value="${empresa?.email || ''}" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Endereço</label>
                    <textarea class="form-control" id="endereco" rows="2">${empresa?.endereco || ''}</textarea>
                </div>
            </form>
        `;

        this.showModal(title, content, () => this.saveEmpresa());
    }

    openResponsavelModal() {
        this.showModal('Novo Responsável', `
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i> Funcionalidade em desenvolvimento
            </div>
        `, () => {});
    }

    showModal(title, content, onSave) {
        const modalHtml = `
            <div class="modal fade" id="dynamicModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
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
                            <button type="button" class="btn btn-primary" id="modalSave">Salvar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modals-container').innerHTML = modalHtml;
        
        const modal = new bootstrap.Modal(document.getElementById('dynamicModal'));
        modal.show();

        document.getElementById('modalSave').onclick = onSave;

        document.getElementById('dynamicModal').addEventListener('hidden.bs.modal', () => {
            document.getElementById('modals-container').innerHTML = '';
        });
    }

    // API Methods
    async apiRequest(endpoint, options = {}) {
        const url = API_BASE + endpoint;
        console.log(`Fazendo requisição para: ${url}`);
        
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
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ${response.status}: ${errorText}`);
        }

        return await response.json();
    }

    // Utility Methods
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('pt-BR');
        } catch (error) {
            return 'Data inválida';
        }
    }

    calculateDiasRestantes(dataVencimento) {
        const vencimento = new Date(dataVencimento);
        const hoje = new Date();
        const diffTime = vencimento - hoje;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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

    // CRUD Methods
    async saveEmpresa() {
        const formData = {
            razao_social: document.getElementById('razaoSocial').value,
            nome_fantasia: document.getElementById('nomeFantasia').value,
            cnpj: document.getElementById('cnpj').value,
            telefone: document.getElementById('telefone').value,
            email: document.getElementById('email').value,
            endereco: document.getElementById('endereco').value
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
}

// Inicializar aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    console.log('🚀 Aplicação inicializada!');
});