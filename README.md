📋 Sistema de Gestão Documental
Sistema completo para gerenciamento de documentos empresariais, controle de vencimentos e acompanhamento de andamentos.

🚀 Funcionalidades
📊 Dashboard
Visão geral do status dos documentos

Alertas de vencimento (próximos e vencidos)

Estatísticas em tempo real

Filtros avançados por status e empresa

🏢 Gestão de Empresas
Cadastro completo com consulta automática de CNPJ

Acessos municipais e estaduais com campos seguros

Regime tributário (Simples Nacional/Demais regimes)

Contatos e observações

📄 Gestão de Documentos
Controle de vencimentos com alertas automáticos

Upload de arquivos (PDF, JPG, PNG)

Tipos pré-definidos: Alvarás, Certidões, Licenças, TFF, etc.

Andamentos com histórico completo

👥 Responsáveis
Vinculação de responsáveis por empresa

Controle de funções e contatos

Acompanhamento de atividades

🛠️ Tecnologias
Backend
Node.js + Express

MySQL com mysql2

Multer para upload de arquivos

CORS para integração frontend/backend

dotenv para variáveis de ambiente

Frontend
HTML5 + CSS3 + JavaScript Vanilla

Bootstrap 5 para interface

Font Awesome para ícones

Chart.js para gráficos (planejado)

📦 Instalação e Configuração
Pré-requisitos
Node.js 18+

MySQL 5.7+

Git

1. Clone o repositório
bash
git clone https://github.com/seu-usuario/gestao-documental.git
cd gestao-documental
2. Instale as dependências
bash
npm install
3. Configure o banco de dados
bash
# Execute o script SQL
mysql -u root -p < backend/database.sql
4. Configure as variáveis de ambiente
Crie backend/.env:

env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=gestao_documental
PORT=3000
NODE_ENV=development
5. Execute o sistema
bash
# Desenvolvimento
npm run dev

# Produção
npm start
🌐 Deploy
Backend (Railway)
Conecte o repositório no Railway

Configure as variáveis de ambiente

Deploy automático

Frontend (Vercel)
Conecte a pasta frontend no Vercel

Configure a URL do backend

Deploy automático

🗂️ Estrutura do Projeto
text
gestao-documental/
├── backend/
│   ├── server.js          # Servidor principal
│   ├── database.js        # Conexão com MySQL
│   ├── database.sql       # Schema do banco
│   └── .env              # Variáveis de ambiente
├── frontend/
│   ├── index.html        # Aplicação SPA
│   ├── app.js           # Lógica do frontend
│   ├── style.css        # Estilos
│   └── vercel.json      # Config Vercel
├── uploads/
│   └── documentos/      # Arquivos uploadados
├── package.json
├── railway.toml
└── README.md
📋 Tipos de Documentos Suportados
📑 Alvarás
Alvará de Funcionamento

Alvará Sanitário

Alvará de Publicidade

Alvará Ambiental

AVCB

📜 Certidões Negativas
Federal, Estadual, Municipal

Trabalhista, FGTS

Concordata e Falência

🏭 TFF (Diversas Cidades)
Salvador, Lauro de Freitas, Camaçari

Dias D'Avila, Feira da Mata, Fortaleza

E muitas outras...

📝 Outros
Procurações Eletrônicas

Declarações (SIMEI, Faturamento)

Licenças Ambientais

TVL Salvador

🔐 Segurança
Senhas ocultas com toggle de visibilidade

Validação de CNPJ integrada

Upload seguro de arquivos

CORS configurado para domínios específicos

📊 Status dos Documentos
✅ Válido - Vencimento > 30 dias

⚠️ Vencendo - Vencimento ≤ 30 dias

❌ Vencido - Data passada

🔄 Em Andamento - Processo ativo

🤝 Contribuição
Fork o projeto

Crie uma branch para sua feature (git checkout -b feature/AmazingFeature)

Commit suas mudanças (git commit -m 'Add some AmazingFeature')

Push para a branch (git push origin feature/AmazingFeature)

Abra um Pull Request

📞 Suporte
Em caso de problemas:

Verifique os logs no console

Confirme as variáveis de ambiente

Teste a conexão com o banco de dados

Verifique as permissões de upload

📄 Licença
Este projeto está sob a licença MIT. Veja o arquivo LICENSE para detalhes.

🎯 Próximas Funcionalidades
Notificações por email

Relatórios PDF

Gráficos de analytics

Backup automático

API REST documentada

Desenvolvido com ❤️ para otimizar a gestão documental empresarial