📋 Sistema de Gestão Documental
Sistema completo para gestão de documentos empresariais com controle de vencimentos, empresas e responsáveis.

🚀 Funcionalidades
📊 Dashboard
Visão geral do sistema com estatísticas

Filtros avançados por status, empresa e pesquisa

Alertas de documentos próximos do vencimento

Cards informativos com métricas importantes

🏢 Gestão de Empresas
Cadastro completo com CNPJ, razão social, nome fantasia

Consulta automática de CNPJ via Receita WS

Campos de acesso municipal e estadual (login/senha)

Regime tributário (Simples Nacional vs Demais)

Olhinho para senhas 👁️ com opção de mostrar/ocultar

Detalhes completos com visualização segura de senhas

📄 Gestão de Documentos
Cadastro completo com tipo, datas de emissão/vencimento

Upload de arquivos (PDF, JPG, PNG) até 10MB

Controle de vencimentos com alertas automáticos

Filtros por status (Vencidos, Próximos, Válidos)

Download de arquivos

Associação com empresas e responsáveis

👥 Gestão de Responsáveis
Cadastro de responsáveis por empresa

Contato completo (nome, email, telefone, função)

Associação com documentos

🛠️ Tecnologias Utilizadas
Backend
Node.js com Express

MySQL com mysql2/promise

Multer para upload de arquivos

CORS para comunicação frontend/backend

Frontend
HTML5 semântico

CSS3 com variáveis e design responsivo

JavaScript ES6+ com classes

Bootstrap 5 para componentes UI

Font Awesome para ícones

📋 Pré-requisitos
Node.js 16+

MySQL 8.0+

Navegador moderno

🚀 Instalação e Configuração
1. Clone o repositório
bash
git clone <url-do-repositorio>
cd gestao-documental
2. Configuração do Banco de Dados
bash
# Execute o script SQL no MySQL
mysql -u root -p < database.sql
3. Configuração do Backend
bash
cd backend
npm install

# Configure as variáveis de ambiente no database.js
# Edite: host, user, password conforme seu MySQL
4. Execução do Sistema
bash
# Desenvolvimento (backend)
npm run dev

# Produção
npm start
O sistema estará disponível em: http://localhost:3000

🗄️ Estrutura do Banco de Dados
Tabelas Principais
empresas - Dados das empresas com campos de acesso

documentos - Documentos com controle de vencimento

responsaveis - Responsáveis por empresa

categorias_documentos - Categorias de documentos (opcional)

alertas_vencimento - Sistema de alertas (opcional)

Views Úteis
vw_documentos_proximos_vencimento - Documentos próximos do vencimento

vw_dashboard_estatisticas - Estatísticas para dashboard

vw_empresas_completas - Empresas com contagem de documentos

📁 Estrutura do Projeto
text
gestao-documental/
├── backend/
│   ├── server.js          # Servidor principal
│   ├── database.js        # Configuração do banco
│   └── package.json       # Dependências
├── frontend/
│   ├── index.html         # Página principal
│   ├── app.js             # Aplicação frontend
│   ├── style.css          # Estilos
│   └── uploads/           # Arquivos uploadados
├── database.sql           # Script do banco
└── README.md             # Este arquivo
🔧 Configurações Importantes
Variáveis de Ambiente (database.js)
javascript
const pool = mysql.createPool({
    host: 'localhost',      // Servidor MySQL
    user: 'root',           // Usuário MySQL
    password: 'sua_senha',  // Senha MySQL
    database: 'gestao_documental',
    // ... outras configurações
});
Upload de Arquivos
Formatos permitidos: PDF, JPG, JPEG, PNG

Tamanho máximo: 10MB

Local de armazenamento: frontend/uploads/documentos/

🎯 Como Usar
1. Cadastro de Empresas
Acesse "Empresas" no menu

Clique em "Nova Empresa"

Use a consulta de CNPJ para preenchimento automático

Preencha os dados de acesso municipal/estadual

Selecione o regime tributário

2. Cadastro de Documentos
Acesse "Documentos" no menu

Clique em "Novo Documento"

Selecione empresa e responsável

Informe datas de emissão e vencimento

Faça upload do arquivo (opcional)

3. Monitoramento no Dashboard
Acesse o "Dashboard"

Use os filtros para encontrar documentos específicos

Veja alertas de vencimentos próximos

Acompanhe as estatísticas do sistema

🔒 Segurança
Senhas ocultas por padrão nos formulários

Visualização controlada de senhas com timeout automático

Upload seguro com validação de tipos e tamanhos

Consulta CNPJ com validação completa

CORS configurado para comunicação segura

🐛 Solução de Problemas
Problemas Comuns
Conexão com banco falha

Verifique credenciais no database.js

Confirme se o MySQL está rodando

Upload de arquivos não funciona

Verifique permissões da pasta uploads/

Confirme tamanho e tipo do arquivo

Consulta CNPJ não retorna dados

Verifique conexão com internet

Confirme se o CNPJ é válido

Filtros do dashboard não funcionam

Verifique console do navegador para erros

Confirme se há documentos cadastrados

Logs e Debug
Backend: Logs no terminal onde o servidor está rodando

Frontend: Console do navegador (F12)

📞 Suporte
Em caso de problemas:

Verifique os logs do sistema

Confirme os pré-requisitos

Consulte esta documentação

Entre em contato com o administrador

🔄 Próximas Atualizações
Relatórios em PDF

Notificações por email

Backup automático

API REST completa

Múltiplos usuários

Dashboard com gráficos

📄 Licença
Este projeto é para uso interno. Desenvolvido para gestão documental empresarial.
