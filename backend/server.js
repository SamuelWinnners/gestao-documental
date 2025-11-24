import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { wakeUpDatabase } from './database.js';
import multer from 'multer';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// ✅ CONFIGURAÇÃO DE PATHS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('📁 Project Root:', projectRoot);
console.log('📁 Backend Dir:', __dirname);
console.log('🚀 Server starting at:', new Date().toISOString());

// ✅ INICIALIZAR APP
const app = express();

// =============================================
// CONFIGURAÇÃO DO UPLOAD
// =============================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadsDir = path.join(projectRoot, 'uploads/documentos');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo não permitido'));
        }
    }
});

// =============================================
// MIDDLEWARE GLOBAL
// =============================================
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://gestao-documental-gold.vercel.app',
        'https://gestao-documental.vercel.app',
        'https://gestao-documental-three.vercel.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());
app.use(express.static(path.join(projectRoot, 'frontend', 'public')));
app.use('/uploads', express.static(path.join(projectRoot, 'uploads')));

// Log de requisições
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// =============================================
// FUNÇÕES AUXILIARES
// =============================================

function validarCNPJ(cnpj) {
    cnpj = cnpj.replace(/[^\d]+/g, '');

    if (cnpj === '') return false;
    if (cnpj.length !== 14) return false;

    if (cnpj === "00000000000000" || cnpj === "11111111111111" || cnpj === "22222222222222" ||
        cnpj === "33333333333333" || cnpj === "44444444444444" || cnpj === "55555555555555" ||
        cnpj === "66666666666666" || cnpj === "77777777777777" || cnpj === "88888888888888" ||
        cnpj === "99999999999999")
        return false;

    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(0)) return false;

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }

    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(1)) return false;

    return true;
}

function formatarEndereco(data) {
    const parts = [];
    if (data.logradouro) parts.push(data.logradouro);
    if (data.numero) parts.push(data.numero);
    if (data.complemento) parts.push(data.complemento);
    if (data.bairro) parts.push(data.bairro);
    if (data.municipio) parts.push(data.municipio);
    if (data.uf) parts.push(data.uf);
    if (data.cep) parts.push(`CEP: ${data.cep}`);
    return parts.join(', ');
}

// ✅ HELPER - Query base de documentos
function getDocumentosSelectQuery(whereClause = '') {
    return `
        SELECT 
            d.*,
            e.razao_social,
            e.nome_fantasia,
            e.cnpj as empresa_cnpj,
            r.nome as responsavel_nome,
            r.funcao as responsavel_funcao,
            DATE(d.data_vencimento) as data_vencimento_date,
            CASE 
                WHEN DATE(d.data_vencimento) < CURDATE() THEN 'vencido'
                WHEN DATE(d.data_vencimento) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'proximo'
                ELSE 'valido'
            END as status
        FROM documentos d 
        LEFT JOIN empresas e ON d.empresa_id = e.id 
        LEFT JOIN responsaveis r ON d.responsavel_id = r.id 
        ${whereClause}
    `;
}

// ✅ HELPER - Estatísticas do dashboard
async function getEstatisticasDashboard() {
    const [[empresas]] = await pool.execute('SELECT COUNT(*) as total FROM empresas');
    const [[documentos]] = await pool.execute('SELECT COUNT(*) as total FROM documentos');
    const [[vencidos]] = await pool.execute(
        'SELECT COUNT(*) as total FROM documentos WHERE DATE(data_vencimento) < CURDATE()'
    );
    const [[proximos]] = await pool.execute(
        'SELECT COUNT(*) as total FROM documentos WHERE DATE(data_vencimento) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)'
    );
    const [[validos]] = await pool.execute(
        'SELECT COUNT(*) as total FROM documentos WHERE DATE(data_vencimento) > DATE_ADD(CURDATE(), INTERVAL 30 DAY)'
    );

    return {
        empresas: empresas.total,
        documentos: documentos.total,
        vencidos: vencidos.total,
        proximos: proximos.total,
        validos: validos.total
    };
}

// =============================================
// ROTAS - HEALTH CHECK
// =============================================
app.get('/api/health', async (req, res) => {
    let dbStatus = 'disconnected';
    let dbError = null;
    
    try {
        const conn = await pool.getConnection();
        await conn.ping();
        dbStatus = 'connected';
        conn.release();
    } catch (error) {
        dbError = error.message;
        console.error('❌ Banco desconectado no health check:', error.message);
    }

    res.json({
        status: 'OK',
        message: 'API está funcionando',
        timestamp: new Date().toISOString(),
        version: '1.0.2',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        database: {
            status: dbStatus,
            error: dbError,
            host: process.env.DB_HOST,
            database: process.env.MYSQL_DATABASE || process.env.DB_NAME,
            usingMySQLDatabase: !!process.env.MYSQL_DATABASE
        }
    });
});

// Rota de teste simples
app.get('/api/test', (req, res) => {
    res.json({
        message: 'Vercel está funcionando!',
        timestamp: new Date().toISOString(),
        routes: [
            'GET /api/health',
            'GET /api/test', 
            'GET /api/debug/wake-db',
            'POST /api/debug/wake-db',
            'GET /api/debug/tables',
            'GET /api/debug/users',
            'GET /api/setup/database',
            'POST /api/setup/database',
            'POST /api/auth/login'
        ]
    });
});

// =============================================
// ROTAS - DEBUG E INICIALIZAÇÃO
// =============================================
app.get('/api/debug/tables', async (req, res) => {
    try {
        console.log('🔍 Tentando listar tabelas...');
        const [tables] = await pool.execute('SHOW TABLES');
        console.log('✅ Tabelas listadas com sucesso');
        res.json({ tables, count: tables.length });
    } catch (error) {
        console.error('❌ Erro ao listar tabelas:', error);
        res.status(500).json({ 
            error: error.message,
            code: error.code,
            suggestion: 'O banco Railway pode estar em sleep. Tente novamente em alguns segundos.'
        });
    }
});

// Rota para acordar o banco Railway
app.post('/api/debug/wake-db', async (req, res) => {
    try {
        console.log('⏰ Tentando acordar o banco Railway...');
        
        // Tenta conectar várias vezes
        let connected = false;
        let attempts = 0;
        const maxAttempts = 5;
        
        while (!connected && attempts < maxAttempts) {
            attempts++;
            console.log(`🔄 Tentativa ${attempts}/${maxAttempts}...`);
            
            try {
                const conn = await pool.getConnection();
                await conn.execute('SELECT 1 as test');
                connected = true;
                conn.release();
                console.log('✅ Banco acordado com sucesso!');
            } catch (error) {
                console.log(`❌ Tentativa ${attempts} falhou:`, error.message);
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        }
        
        if (connected) {
            res.json({ 
                message: 'Banco Railway acordado com sucesso!',
                attempts,
                status: 'connected'
            });
        } else {
            res.status(500).json({ 
                error: 'Não foi possível acordar o banco Railway',
                attempts,
                status: 'failed'
            });
        }
    } catch (error) {
        console.error('❌ Erro ao acordar banco:', error);
        res.status(500).json({ error: error.message });
    }
});

// Versão GET da mesma rota para facilitar teste
app.get('/api/debug/wake-db', async (req, res) => {
    try {
        console.log('⏰ [GET] Tentando acordar o banco Railway...');
        
        let connected = false;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (!connected && attempts < maxAttempts) {
            attempts++;
            console.log(`🔄 Tentativa ${attempts}/${maxAttempts}...`);
            
            try {
                const conn = await pool.getConnection();
                await conn.execute('SELECT 1 as test');
                connected = true;
                conn.release();
                console.log('✅ Banco acordado com sucesso!');
            } catch (error) {
                console.log(`❌ Tentativa ${attempts} falhou:`, error.message);
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        
        res.json({ 
            message: connected ? 'Banco acordado!' : 'Falha ao acordar banco',
            attempts,
            status: connected ? 'connected' : 'failed',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Erro ao acordar banco:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/debug/users', async (req, res) => {
    try {
        // Verificar se a tabela usuarios existe
        const [tableCheck] = await pool.execute(`
            SELECT COUNT(*) as count FROM information_schema.tables 
            WHERE table_schema = DATABASE() AND table_name = 'usuarios'
        `);
        
        if (tableCheck[0].count === 0) {
            return res.json({ 
                error: 'Tabela usuarios não existe',
                solution: 'Execute POST /api/setup/database para criar as tabelas'
            });
        }

        const [users] = await pool.execute('SELECT id, nome, email, ativo FROM usuarios');
        res.json({ users, count: users.length });
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/setup/user', async (req, res) => {
    try {
        // Primeiro, criar a tabela usuarios se não existir
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                senha VARCHAR(255) NOT NULL,
                ativo BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Criar usuário admin padrão
        const [result] = await pool.execute(`
            INSERT IGNORE INTO usuarios (nome, email, senha, ativo, created_at) 
            VALUES (?, ?, ?, TRUE, NOW())
        `, ['Administrador', 'admin@admin.com', 'admin123']);
        
        res.json({ 
            message: 'Tabela e usuário criados com sucesso',
            insertId: result.insertId,
            affectedRows: result.affectedRows
        });
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para inicializar todas as tabelas
app.post('/api/setup/database', async (req, res) => {
    try {
        // Criar tabela usuarios
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                senha VARCHAR(255) NOT NULL,
                ativo BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Inserir usuário admin padrão
        await pool.execute(`
            INSERT IGNORE INTO usuarios (nome, email, senha, ativo) 
            VALUES ('Administrador', 'admin@admin.com', 'admin123', TRUE)
        `);

        // Verificar se outras tabelas já existem
        const [empresasCheck] = await pool.execute(`
            SELECT COUNT(*) as count FROM information_schema.tables 
            WHERE table_schema = DATABASE() AND table_name = 'empresas'
        `);

        let tablesCreated = ['usuarios'];
        
        if (empresasCheck[0].count === 0) {
            // Se não existir a tabela empresas, criar todas as outras
            const createTablesSQL = `
                CREATE TABLE IF NOT EXISTS empresas (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    razao_social VARCHAR(255) NOT NULL,
                    nome_fantasia VARCHAR(255),
                    cnpj VARCHAR(18) UNIQUE NOT NULL,
                    telefone VARCHAR(200) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    endereco TEXT,
                    login_municipal VARCHAR(100),
                    senha_municipal VARCHAR(100),
                    login_estadual VARCHAR(100),
                    senha_estadual VARCHAR(100),
                    simples_nacional BOOLEAN DEFAULT FALSE,
                    observacoes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `;
            await pool.execute(createTablesSQL);
            tablesCreated.push('empresas');
        }

        res.json({ 
            message: 'Banco de dados inicializado com sucesso',
            tablesCreated,
            adminUser: 'admin@admin.com / admin123'
        });
    } catch (error) {
        console.error('Erro ao inicializar banco:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

// Versão GET da rota de setup para facilitar teste
app.get('/api/setup/database', async (req, res) => {
    try {
        console.log('🔧 [GET] Inicializando banco de dados...');
        
        // Primeiro tenta acordar o banco
        let connected = false;
        let attempts = 0;
        const maxAttempts = 5;
        
        while (!connected && attempts < maxAttempts) {
            attempts++;
            console.log(`🔄 Tentativa de acordar banco ${attempts}/${maxAttempts}...`);
            
            try {
                const conn = await pool.getConnection();
                await conn.execute('SELECT 1');
                connected = true;
                conn.release();
                console.log('✅ Banco acordado!');
                break;
            } catch (error) {
                console.log(`❌ Tentativa ${attempts} falhou:`, error.message);
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        }
        
        if (!connected) {
            return res.status(500).json({ 
                error: 'Não foi possível acordar o banco Railway',
                attempts 
            });
        }
        
        // Agora cria as tabelas
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                senha VARCHAR(255) NOT NULL,
                ativo BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Inserir usuário admin
        const [result] = await pool.execute(`
            INSERT IGNORE INTO usuarios (nome, email, senha, ativo) 
            VALUES ('Administrador', 'admin@admin.com', 'admin123', TRUE)
        `);

        res.json({ 
            message: 'Banco inicializado com sucesso via GET',
            wakeAttempts: attempts,
            userCreated: result.affectedRows > 0,
            adminCredentials: 'admin@admin.com / admin123'
        });
    } catch (error) {
        console.error('❌ Erro ao inicializar banco:', error);
        res.status(500).json({ 
            error: error.message,
            suggestion: 'O banco Railway pode estar em sleep mode muito profundo'
        });
    }
});

// =============================================
// ROTAS - CONSULTA DE CNPJ
// =============================================
app.get('/api/consulta-cnpj/:cnpj', async (req, res) => {
    try {
        const { cnpj } = req.params;
        const cnpjLimpo = cnpj.replace(/\D/g, '');

        console.log(`Consultando CNPJ: ${cnpjLimpo}`);

        if (!validarCNPJ(cnpjLimpo)) {
            return res.status(400).json({ error: 'CNPJ inválido' });
        }

        const response = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error('Erro na consulta do CNPJ');
        }

        const data = await response.json();

        if (data.status === 'ERROR') {
            return res.status(400).json({
                error: data.message || 'CNPJ não encontrado ou inválido'
            });
        }

        const empresaData = {
            cnpj: data.cnpj,
            razao_social: data.nome,
            nome_fantasia: data.fantasia || data.nome,
            telefone: data.telefone || '',
            email: data.email || '',
            endereco: formatarEndereco(data)
        };

        console.log('Dados da empresa encontrados:', empresaData);
        res.json(empresaData);

    } catch (error) {
        console.error('Erro na consulta de CNPJ:', error);
        res.status(500).json({
            error: 'Erro ao consultar CNPJ',
            details: error.message
        });
    }
});

// =============================================
// ROTAS - CALENDÁRIO
// =============================================
// ✅ CORREÇÃO 1: Query do calendário (procure por '/api/calendario')
app.get('/api/calendario/:ano?/:mes?', async (req, res) => {
    try {
        let { ano, mes } = req.params;
        const hoje = new Date();
        ano = ano ? parseInt(ano) : hoje.getFullYear();
        mes = mes ? parseInt(mes) : hoje.getMonth() + 1;

        // ✅ USAR DATE() para comparação sem timezone
        const [documentos] = await pool.execute(`
            SELECT 
                d.id,
                d.nome,
                d.tipo,
                DATE(d.data_vencimento) as data_vencimento,
                DAY(DATE(d.data_vencimento)) as dia,
                DATEDIFF(DATE(d.data_vencimento), CURDATE()) as dias_restantes,
                CASE 
                    WHEN DATE(d.data_vencimento) < CURDATE() THEN 'vencido'
                    WHEN DATE(d.data_vencimento) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'proximo'
                    ELSE 'valido'
                END as status_vencimento,
                e.razao_social
            FROM documentos d
            LEFT JOIN empresas e ON d.empresa_id = e.id
            WHERE MONTH(DATE(d.data_vencimento)) = ? 
              AND YEAR(DATE(d.data_vencimento)) = ?
            ORDER BY DATE(d.data_vencimento) ASC
        `, [mes, ano]);

        const porDia = {};
        documentos.forEach(doc => {
            const dia = Number(doc.dia);
            if (!porDia[dia]) porDia[dia] = [];
            porDia[dia].push(doc);
        });

        res.json({
            ano: ano,
            mes: mes,
            documentosPorDia: porDia,
            total: documentos.length
        });
    } catch (error) {
        console.error('Erro calendário:', error);
        res.status(500).json({ error: 'Erro ao obter calendário' });
    }
});

// ✅ CORREÇÃO 2: Query de listagem de documentos
app.get('/api/documentos', async (req, res) => {
    try {
        const query = `
            SELECT 
                d.*,
                e.razao_social,
                e.nome_fantasia,
                e.cnpj as empresa_cnpj,
                r.nome as responsavel_nome,
                r.funcao as responsavel_funcao,
                DATE(d.data_vencimento) as data_vencimento,
                DATE(d.data_emissao) as data_emissao,
                DATEDIFF(DATE(d.data_vencimento), CURDATE()) as dias_restantes,
                CASE 
                    WHEN DATE(d.data_vencimento) < CURDATE() THEN 'vencido'
                    WHEN DATE(d.data_vencimento) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'proximo'
                    ELSE 'valido'
                END as status
            FROM documentos d 
            LEFT JOIN empresas e ON d.empresa_id = e.id 
            LEFT JOIN responsaveis r ON d.responsavel_id = r.id 
            ORDER BY d.data_vencimento ASC
        `;
        
        const [rows] = await pool.execute(query);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao listar documentos:', error);
        res.status(500).json({ error: 'Erro ao listar documentos' });
    }
});

// ✅ CORREÇÃO 3: Query de estatísticas do dashboard
app.get('/api/dashboard/estatisticas', async (req, res) => {
    try {
        const [[{ total_empresas }]] = await pool.execute('SELECT COUNT(*) as total_empresas FROM empresas');
        const [[{ total_documentos }]] = await pool.execute('SELECT COUNT(*) as total_documentos FROM documentos');
        
        const [[{ total_vencidos }]] = await pool.execute(
            'SELECT COUNT(*) as total_vencidos FROM documentos WHERE DATE(data_vencimento) < CURDATE()'
        );
        
        const [[{ total_proximos }]] = await pool.execute(
            'SELECT COUNT(*) as total_proximos FROM documentos WHERE DATE(data_vencimento) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)'
        );
        
        const [[{ total_validos }]] = await pool.execute(
            'SELECT COUNT(*) as total_validos FROM documentos WHERE DATE(data_vencimento) > DATE_ADD(CURDATE(), INTERVAL 30 DAY)'
        );

        // Documentos vencidos
        const [documentosVencidos] = await pool.execute(`
            SELECT d.*, e.razao_social as empresa_nome,
                   DATEDIFF(CURDATE(), DATE(d.data_vencimento)) as dias_atraso
            FROM documentos d
            LEFT JOIN empresas e ON d.empresa_id = e.id
            WHERE DATE(d.data_vencimento) < CURDATE()
            ORDER BY d.data_vencimento ASC
            LIMIT 10
        `);

        // Documentos próximos
        const [documentosProximos] = await pool.execute(`
            SELECT d.*, e.razao_social as empresa_nome,
                   DATEDIFF(DATE(d.data_vencimento), CURDATE()) as dias_restantes
            FROM documentos d
            LEFT JOIN empresas e ON d.empresa_id = e.id
            WHERE DATE(d.data_vencimento) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            ORDER BY d.data_vencimento ASC
            LIMIT 10
        `);

        // Próximos vencimentos
        const [proximosVencimentos] = await pool.execute(`
            SELECT d.*, e.razao_social as empresa_nome,
                   DATEDIFF(DATE(d.data_vencimento), CURDATE()) as dias_restantes
            FROM documentos d
            LEFT JOIN empresas e ON d.empresa_id = e.id
            WHERE DATE(d.data_vencimento) >= CURDATE()
            ORDER BY d.data_vencimento ASC
            LIMIT 20
        `);

        res.json({
            estatisticas: {
                empresas: total_empresas,
                documentos: total_documentos,
                vencidos: total_vencidos,
                proximos: total_proximos,
                validos: total_validos
            },
            documentosVencidos,
            documentosProximos,
            proximosVencimentos
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// =============================================
// ROTAS - EMPRESAS
// =============================================
app.get('/api/empresas', async (req, res) => {
    try {
        console.log('Buscando empresas...');
        const [rows] = await pool.execute('SELECT * FROM empresas ORDER BY created_at DESC');
        console.log(`Encontradas ${rows.length} empresas`);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao listar empresas:', error);
        res.status(500).json({ error: 'Erro ao listar empresas' });
    }
});

app.get('/api/empresas/:id', async (req, res) => {
    try {
        const empresaId = req.params.id;
        console.log(`Buscando empresa ID: ${empresaId}`);

        const [rows] = await pool.execute('SELECT * FROM empresas WHERE id = ?', [empresaId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Erro ao buscar empresa:', error);
        res.status(500).json({ error: 'Erro ao buscar empresa' });
    }
});

app.post('/api/empresas', async (req, res) => {
    try {
        console.log('=== CRIANDO EMPRESA ===');
        console.log('Body recebido:', req.body);

        const {
            razao_social, nome_fantasia, cnpj, telefone, email, endereco,
            login_municipal, senha_municipal, login_estadual, senha_estadual,
            simples_nacional, observacoes
        } = req.body;

        if (!razao_social || !cnpj || !telefone || !email) {
            return res.status(400).json({ error: 'Preencha todos os campos obrigatórios' });
        }

        if (!validarCNPJ(cnpj)) {
            return res.status(400).json({ error: 'CNPJ inválido' });
        }

        const [result] = await pool.execute(
            `INSERT INTO empresas 
            (razao_social, nome_fantasia, cnpj, telefone, email, endereco, 
             login_municipal, senha_municipal, login_estadual, senha_estadual, 
             simples_nacional, observacoes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                razao_social, nome_fantasia || null, cnpj, telefone, email,
                endereco || null, login_municipal || null, senha_municipal || null,
                login_estadual || null, senha_estadual || null,
                simples_nacional || false, observacoes || null
            ]
        );

        console.log('✅ EMPRESA CRIADA - ID:', result.insertId);
        res.status(201).json({
            id: result.insertId,
            message: 'Empresa criada com sucesso'
        });

    } catch (error) {
        console.error('❌ ERRO AO CRIAR EMPRESA:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'CNPJ já cadastrado' });
        }
        res.status(500).json({ error: 'Erro ao criar empresa' });
    }
});

app.put('/api/empresas/:id', async (req, res) => {
    try {
        const empresaId = req.params.id;
        const {
            razao_social, nome_fantasia, cnpj, telefone, email, endereco,
            login_municipal, senha_municipal, login_estadual, senha_estadual,
            simples_nacional, observacoes
        } = req.body;

        console.log(`Atualizando empresa ID: ${empresaId}`);

        const [result] = await pool.execute(
            `UPDATE empresas SET 
                razao_social = ?, nome_fantasia = ?, cnpj = ?, 
                telefone = ?, email = ?, endereco = ?,
                login_municipal = ?, senha_municipal = ?,
                login_estadual = ?, senha_estadual = ?,
                simples_nacional = ?, observacoes = ?
            WHERE id = ?`,
            [
                razao_social, nome_fantasia || null, cnpj, telefone, email,
                endereco || null, login_municipal || null, senha_municipal || null,
                login_estadual || null, senha_estadual || null,
                simples_nacional || false, observacoes || null, empresaId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }

        res.json({ message: 'Empresa atualizada com sucesso' });

    } catch (error) {
        console.error('Erro ao atualizar empresa:', error);
        res.status(500).json({ error: 'Erro ao atualizar empresa' });
    }
});

app.delete('/api/empresas/:id', async (req, res) => {
    try {
        const empresaId = req.params.id;
        console.log(`Excluindo empresa ID: ${empresaId}`);

        const [result] = await pool.execute('DELETE FROM empresas WHERE id = ?', [empresaId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }

        res.json({ message: 'Empresa excluída com sucesso' });

    } catch (error) {
        console.error('Erro ao excluir empresa:', error);
        res.status(500).json({ error: 'Erro ao excluir empresa' });
    }
});

// =============================================
// ROTAS - ALERTAS
// =============================================
app.get('/api/alertas', async (req, res) => {
    try {
        console.log('🔔 Buscando alertas');

        const [vencidos] = await pool.execute(`
            SELECT id, nome, tipo, data_vencimento 
            FROM documentos 
            WHERE data_vencimento < CURDATE()
        `);

        const [proximos] = await pool.execute(`
            SELECT id, nome, tipo, data_vencimento 
            FROM documentos 
            WHERE data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        `);

        res.json({
            vencidos: vencidos,
            proximos: proximos,
            totalVencidos: vencidos.length,
            totalProximos: proximos.length,
            totalAlertas: vencidos.length + proximos.length
        });

    } catch (error) {
        console.error('Erro ao buscar alertas:', error);
        res.status(500).json({ error: 'Erro ao buscar alertas' });
    }
});

// =============================================
// ROTAS - DOCUMENTOS
// =============================================
app.post('/api/documentos', upload.single('arquivo'), async (req, res) => {
    try {
        console.log('=== CRIANDO DOCUMENTO ===');
        console.log('Body recebido:', req.body);
        console.log('Arquivo:', req.file ? req.file.filename : 'Nenhum');

        const {
            nome, tipo, empresa_id, responsavel_id,
            data_emissao, data_vencimento, observacoes
        } = req.body;

        if (!nome || !tipo || !empresa_id || !responsavel_id || !data_emissao || !data_vencimento) {
            return res.status(400).json({ error: 'Preencha todos os campos obrigatórios' });
        }

        const [empresas] = await pool.execute('SELECT id FROM empresas WHERE id = ?', [empresa_id]);
        if (empresas.length === 0) {
            return res.status(400).json({ error: 'Empresa não encontrada' });
        }

        const [responsaveis] = await pool.execute('SELECT id FROM responsaveis WHERE id = ?', [responsavel_id]);
        if (responsaveis.length === 0) {
            return res.status(400).json({ error: 'Responsável não encontrado' });
        }

        const arquivoPath = req.file ? req.file.filename : null;

        const [result] = await pool.execute(
            `INSERT INTO documentos 
            (nome, tipo, empresa_id, responsavel_id, data_emissao, data_vencimento, observacoes, arquivo_path) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [nome, tipo, empresa_id, responsavel_id, data_emissao, data_vencimento, observacoes || null, arquivoPath]
        );

        console.log('✅ DOCUMENTO CRIADO - ID:', result.insertId);

        const [novoDocumento] = await pool.execute(`
            SELECT 
                d.*,
                e.razao_social, e.nome_fantasia,
                r.nome as responsavel_nome, r.funcao as responsavel_funcao
            FROM documentos d
            LEFT JOIN empresas e ON d.empresa_id = e.id
            LEFT JOIN responsaveis r ON d.responsavel_id = r.id
            WHERE d.id = ?
        `, [result.insertId]);

        res.status(201).json(novoDocumento[0]);

    } catch (error) {
        console.error('❌ ERRO AO CRIAR DOCUMENTO:', error);
        res.status(500).json({ error: 'Erro ao criar documento' });
    }
});

app.get('/api/documentos', async (req, res) => {
    try {
        console.log('Buscando documentos...');
        const query = `
            SELECT 
                d.*,
                e.razao_social,
                e.nome_fantasia,
                e.cnpj as empresa_cnpj,
                r.nome as responsavel_nome,
                r.funcao as responsavel_funcao,
                DATE(d.data_vencimento) as data_vencimento,
                DATE(d.data_emissao) as data_emissao,
                DATEDIFF(DATE(d.data_vencimento), CURDATE()) as dias_restantes,
                CASE 
                    WHEN DATE(d.data_vencimento) < CURDATE() THEN 'vencido'
                    WHEN DATE(d.data_vencimento) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'proximo'
                    ELSE 'valido'
                END as status
            FROM documentos d 
            LEFT JOIN empresas e ON d.empresa_id = e.id 
            LEFT JOIN responsaveis r ON d.responsavel_id = r.id 
            ORDER BY d.data_vencimento ASC
        `;
        
        const [rows] = await pool.execute(query);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao listar documentos:', error);
        res.status(500).json({ error: 'Erro ao listar documentos' });
    }
});

app.get('/api/documentos/filtros', async (req, res) => {
    try {
        const { status, search, empresa_id } = req.query;
        console.log('Filtrando documentos:', { status, search, empresa_id });

        let whereConditions = [];
        let queryParams = [];

        if (status === 'vencidos') {
            whereConditions.push('d.data_vencimento < CURDATE()');
        } else if (status === 'proximos') {
            whereConditions.push('d.data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)');
        } else if (status === 'validos') {
            whereConditions.push('d.data_vencimento > DATE_ADD(CURDATE(), INTERVAL 30 DAY)');
        }

        if (empresa_id) {
            whereConditions.push('d.empresa_id = ?');
            queryParams.push(empresa_id);
        }

        if (search) {
            whereConditions.push('(d.nome LIKE ? OR e.razao_social LIKE ? OR d.tipo LIKE ?)');
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')} ORDER BY d.data_vencimento ASC`
            : 'ORDER BY d.data_vencimento ASC';

        const query = getDocumentosSelectQuery(whereClause);
        const [rows] = await pool.execute(query, queryParams);
        console.log(`Encontrados ${rows.length} documentos com filtros`);
        res.json(rows);

    } catch (error) {
        console.error('Erro ao filtrar documentos:', error);
        res.status(500).json({ error: 'Erro ao filtrar documentos' });
    }
});

app.get('/api/documentos/:id', async (req, res) => {
    try {
        const documentoId = req.params.id;
        console.log(`Buscando documento ID: ${documentoId}`);

        const [rows] = await pool.execute(`
            SELECT 
                d.*,
                e.razao_social, e.nome_fantasia, e.cnpj as empresa_cnpj,
                e.telefone as empresa_telefone, e.email as empresa_email,
                e.endereco as empresa_endereco,
                r.nome as responsavel_nome, r.funcao as responsavel_funcao,
                r.email as responsavel_email, r.telefone as responsavel_telefone
            FROM documentos d 
            LEFT JOIN empresas e ON d.empresa_id = e.id 
            LEFT JOIN responsaveis r ON d.responsavel_id = r.id 
            WHERE d.id = ?
        `, [documentoId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error('Erro ao buscar documento:', error);
        res.status(500).json({ error: 'Erro ao buscar documento' });
    }
});

app.put('/api/documentos/:id', upload.single('arquivo'), async (req, res) => {
    try {
        const documentoId = req.params.id;
        const { nome, tipo, empresa_id, responsavel_id, data_emissao, data_vencimento, observacoes } = req.body;

        console.log(`Atualizando documento ID: ${documentoId}`);

        const [documentos] = await pool.execute('SELECT * FROM documentos WHERE id = ?', [documentoId]);

        if (documentos.length === 0) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }

        const arquivoPath = req.file ? req.file.filename : documentos[0].arquivo_path;

        await pool.execute(
            `UPDATE documentos SET 
            nome = ?, tipo = ?, empresa_id = ?, responsavel_id = ?, 
            data_emissao = ?, data_vencimento = ?, observacoes = ?, arquivo_path = ?
            WHERE id = ?`,
            [nome, tipo, empresa_id, responsavel_id, data_emissao, data_vencimento, observacoes || null, arquivoPath, documentoId]
        );

        res.json({ message: 'Documento atualizado com sucesso' });

    } catch (error) {
        console.error('Erro ao atualizar documento:', error);
        res.status(500).json({ error: 'Erro ao atualizar documento' });
    }
});

app.delete('/api/documentos/:id', async (req, res) => {
    try {
        const documentoId = req.params.id;
        console.log(`Excluindo documento ID: ${documentoId}`);

        const [documentos] = await pool.execute('SELECT arquivo_path FROM documentos WHERE id = ?', [documentoId]);

        if (documentos.length === 0) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }

        if (documentos[0].arquivo_path) {
            const filePath = path.join(projectRoot, 'uploads/documentos', documentos[0].arquivo_path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log('Arquivo excluído:', documentos[0].arquivo_path);
            }
        }

        const [result] = await pool.execute('DELETE FROM documentos WHERE id = ?', [documentoId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }

        res.json({ message: 'Documento excluído com sucesso' });

    } catch (error) {
        console.error('Erro ao excluir documento:', error);
        res.status(500).json({ error: 'Erro ao excluir documento' });
    }
});

app.get('/api/documentos/:id/download', async (req, res) => {
    try {
        const documentoId = req.params.id;

        const [documentos] = await pool.execute(
            'SELECT arquivo_path, nome FROM documentos WHERE id = ?',
            [documentoId]
        );

        if (documentos.length === 0 || !documentos[0].arquivo_path) {
            return res.status(404).json({ error: 'Arquivo não encontrado' });
        }

        const filePath = path.join(projectRoot, 'uploads/documentos', documentos[0].arquivo_path);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Arquivo não encontrado no servidor' });
        }

        const originalName = documentos[0].arquivo_path.split('-').slice(2).join('-');
        res.download(filePath, originalName || documentos[0].nome);

    } catch (error) {
        console.error('Erro ao fazer download:', error);
        res.status(500).json({ error: 'Erro ao fazer download' });
    }
});

// =============================================
// ROTAS - RESPONSÁVEIS
// =============================================
app.get('/api/responsaveis', async (req, res) => {
    try {
        console.log('Buscando responsáveis...');
        const [rows] = await pool.execute(`
            SELECT r.*, e.razao_social as empresa_nome 
            FROM responsaveis r 
            LEFT JOIN empresas e ON r.empresa_id = e.id 
            ORDER BY r.nome ASC
        `);
        console.log(`Encontrados ${rows.length} responsáveis`);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao listar responsáveis:', error);
        res.status(500).json({ error: 'Erro ao listar responsáveis' });
    }
});

app.get('/api/responsaveis/:id', async (req, res) => {
    try {
        const responsavelId = req.params.id;

        const [rows] = await pool.execute(`
            SELECT r.*, e.razao_social as empresa_nome 
            FROM responsaveis r 
            LEFT JOIN empresas e ON r.empresa_id = e.id 
            WHERE r.id = ?
        `, [responsavelId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Responsável não encontrado' });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error('Erro ao buscar responsável:', error);
        res.status(500).json({ error: 'Erro ao buscar responsável' });
    }
});

app.post('/api/responsaveis', async (req, res) => {
    try {
        console.log('=== CRIANDO RESPONSÁVEL ===');
        console.log('Dados recebidos:', req.body);

        const { nome, email, telefone, funcao, empresa_id } = req.body;

        if (!nome || !email || !telefone || !funcao || !empresa_id) {
            return res.status(400).json({ error: 'Preencha todos os campos obrigatórios' });
        }

        const [result] = await pool.execute(
            'INSERT INTO responsaveis (nome, email, telefone, funcao, empresa_id) VALUES (?, ?, ?, ?, ?)',
            [nome, email, telefone, funcao, empresa_id]
        );

        console.log('✅ RESPONSÁVEL CRIADO - ID:', result.insertId);
        res.status(201).json({
            id: result.insertId,
            message: 'Responsável criado com sucesso'
        });

    } catch (error) {
        console.error('❌ ERRO AO CRIAR RESPONSÁVEL:', error);
        res.status(500).json({ error: 'Erro ao criar responsável' });
    }
});

app.put('/api/responsaveis/:id', async (req, res) => {
    try {
        const responsavelId = req.params.id;
        const { nome, email, telefone, funcao, empresa_id } = req.body;

        console.log(`🎯 Atualizando responsável ID: ${responsavelId}`);

        if (!nome || !email || !telefone || !funcao || !empresa_id) {
            return res.status(400).json({ error: 'Preencha todos os campos obrigatórios' });
        }

        const [result] = await pool.execute(
            `UPDATE responsaveis SET 
                nome = ?, email = ?, telefone = ?, funcao = ?, empresa_id = ?
            WHERE id = ?`,
            [nome, email, telefone, funcao, empresa_id, responsavelId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Responsável não encontrado' });
        }

        res.json({ message: 'Responsável atualizado com sucesso' });

    } catch (error) {
        console.error('Erro ao atualizar responsável:', error);
        res.status(500).json({ error: 'Erro ao atualizar responsável' });
    }
});

app.delete('/api/responsaveis/:id', async (req, res) => {
    try {
        const responsavelId = req.params.id;

        const [documentos] = await pool.execute(
            'SELECT id FROM documentos WHERE responsavel_id = ?',
            [responsavelId]
        );

        if (documentos.length > 0) {
            return res.status(400).json({
                error: 'Não é possível excluir: existem documentos vinculados'
            });
        }

        const [result] = await pool.execute('DELETE FROM responsaveis WHERE id = ?', [responsavelId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Responsável não encontrado' });
        }

        res.json({ message: 'Responsável excluído com sucesso' });

    } catch (error) {
        console.error('Erro ao excluir responsável:', error);
        res.status(500).json({ error: 'Erro ao excluir responsável' });
    }
});

// =============================================
// ROTAS - ANDAMENTOS
// =============================================
app.get('/api/documentos/:id/andamentos', async (req, res) => {
    try {
        const documentoId = req.params.id;
        console.log(`Buscando andamentos do documento ID: ${documentoId}`);

        const [documentos] = await pool.execute('SELECT id FROM documentos WHERE id = ?', [documentoId]);
        if (documentos.length === 0) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }

        const [andamentos] = await pool.execute(`
            SELECT 
                da.*,
                r.nome as responsavel_nome,
                r.funcao as responsavel_funcao,
                DATE_FORMAT(da.data_criacao, '%d/%m/%Y %H:%i') as data_formatada
            FROM documento_andamentos da
            LEFT JOIN responsaveis r ON da.responsavel_id = r.id
            WHERE da.documento_id = ?
            ORDER BY da.data_criacao DESC
        `, [documentoId]);

        console.log(`Encontrados ${andamentos.length} andamentos`);
        res.json(andamentos);

    } catch (error) {
        console.error('Erro ao buscar andamentos:', error);
        res.status(500).json({ error: 'Erro ao buscar andamentos' });
    }
});

app.post('/api/documentos/:id/andamentos', async (req, res) => {
    try {
        const documentoId = req.params.id;
        const { responsavel_id, descricao, status } = req.body;

        console.log(`Adicionando andamento ao documento ID: ${documentoId}`);

        if (!responsavel_id || !descricao) {
            return res.status(400).json({ error: 'Responsável e descrição são obrigatórios' });
        }

        const [documentos] = await pool.execute('SELECT id FROM documentos WHERE id = ?', [documentoId]);
        if (documentos.length === 0) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }

        const [responsaveis] = await pool.execute('SELECT id FROM responsaveis WHERE id = ?', [responsavel_id]);
        if (responsaveis.length === 0) {
            return res.status(404).json({ error: 'Responsável não encontrado' });
        }

        const [result] = await pool.execute(
            'INSERT INTO documento_andamentos (documento_id, responsavel_id, descricao, status) VALUES (?, ?, ?, ?)',
            [documentoId, responsavel_id, descricao, status || 'em_andamento']
        );

        await pool.execute('UPDATE documentos SET status_geral = ? WHERE id = ?', [status, documentoId]);

        const [novoAndamento] = await pool.execute(`
            SELECT 
                da.*,
                r.nome as responsavel_nome,
                r.funcao as responsavel_funcao,
                DATE_FORMAT(da.data_criacao, '%d/%m/%Y %H:%i') as data_formatada
            FROM documento_andamentos da
            LEFT JOIN responsaveis r ON da.responsavel_id = r.id
            WHERE da.id = ?
        `, [result.insertId]);

        res.status(201).json(novoAndamento[0]);

    } catch (error) {
        console.error('Erro ao adicionar andamento:', error);
        res.status(500).json({ error: 'Erro ao adicionar andamento' });
    }
});

app.put('/api/documentos/:id/status', async (req, res) => {
    try {
        const documentoId = req.params.id;
        const { status_geral } = req.body;

        const [result] = await pool.execute(
            'UPDATE documentos SET status_geral = ? WHERE id = ?',
            [status_geral, documentoId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }

        res.json({ message: 'Status atualizado com sucesso' });

    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ error: 'Erro ao atualizar status' });
    }
});

// =============================================
// ROTAS - DASHBOARD
// =============================================
app.get('/api/dashboard', async (req, res) => {
    try {
        console.log('Buscando dados do dashboard...');

        const stats = await getEstatisticasDashboard();

        const [proximosVencimentos] = await pool.execute(`
            SELECT d.*, e.razao_social as empresa_nome 
            FROM documentos d 
            LEFT JOIN empresas e ON d.empresa_id = e.id 
            WHERE d.data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            ORDER BY d.data_vencimento ASC
            LIMIT 10
        `);

        res.json({ ...stats, proximosVencimentos });

    } catch (error) {
        console.error('Erro no dashboard:', error);
        res.status(500).json({ error: 'Erro ao obter dados do dashboard' });
    }
});

app.get('/api/dashboard/estatisticas', async (req, res) => {
    try {
        console.log('Buscando estatísticas detalhadas...');

        const stats = await getEstatisticasDashboard();

        const [documentosVencidos] = await pool.execute(`
            SELECT d.*, e.razao_social as empresa_nome 
            FROM documentos d 
            LEFT JOIN empresas e ON d.empresa_id = e.id 
            WHERE d.data_vencimento < CURDATE()
            ORDER BY d.data_vencimento ASC
            LIMIT 20
        `);

        const [documentosProximos] = await pool.execute(`
            SELECT d.*, e.razao_social as empresa_nome 
            FROM documentos d 
            LEFT JOIN empresas e ON d.empresa_id = e.id 
            WHERE d.data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            ORDER BY d.data_vencimento ASC
            LIMIT 20
        `);

        const [proximosVencimentos] = await pool.execute(`
            SELECT d.*, e.razao_social as empresa_nome 
            FROM documentos d 
            LEFT JOIN empresas e ON d.empresa_id = e.id 
            WHERE d.data_vencimento >= CURDATE()
            ORDER BY d.data_vencimento ASC
            LIMIT 20
        `);

        res.json({
            estatisticas: stats,
            documentosVencidos,
            documentosProximos,
            proximosVencimentos
        });

    } catch (error) {
        console.error('Erro nas estatísticas:', error);
        res.status(500).json({ error: 'Erro ao obter estatísticas' });
    }
});

// =============================================
// ROTA DE LOGIN
// =============================================
app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('🔐 Login attempt:', new Date().toISOString());
        console.log('📧 Request body:', req.body);
        
        const { email, senha } = req.body;

        if (!email || !senha) {
            console.log('❌ Missing email or password');
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }

        console.log('🔍 Searching user with email:', email);

        let usuarios;
        try {
            // Primeira tentativa de consulta
            [usuarios] = await pool.execute(
                'SELECT * FROM usuarios WHERE email = ? AND ativo = TRUE',
                [email]
            );
        } catch (dbError) {
            console.log('❌ Database connection failed, trying to wake up:', dbError.message);
            
            // Se falhar, tenta acordar o banco e refazer a consulta
            if (dbError.message.includes('Connection lost') || dbError.message.includes('server closed')) {
                console.log('🛌 Tentando acordar o banco Railway...');
                await wakeUpDatabase();
                
                // Segunda tentativa após acordar
                [usuarios] = await pool.execute(
                    'SELECT * FROM usuarios WHERE email = ? AND ativo = TRUE',
                    [email]
                );
            } else {
                throw dbError;
            }
        }

        console.log('👥 Found users:', usuarios.length);

        if (usuarios.length === 0) {
            console.log('❌ No user found or inactive');
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const usuario = usuarios[0];
        console.log('✅ User found:', { id: usuario.id, nome: usuario.nome, email: usuario.email });

        // Verificar senha (simplificado - em produção use bcrypt)
        if (senha !== 'admin123') { // Senha fixa para simplicidade
            console.log('❌ Invalid password');
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        console.log('✅ Password valid');

        // Criar token simples (em produção use JWT)
        const token = Buffer.from(`${usuario.id}:${Date.now()}`).toString('base64');

        console.log('🎟️ Token created successfully');

        res.json({
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            }
        });
    } catch (error) {
        console.error('💥 Login error:', error);
        console.error('📊 Error details:', {
            message: error.message,
            code: error.code,
            errno: error.errno
        });
        res.status(500).json({ 
            error: 'Erro ao realizar login',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Rota de logout
app.post('/api/auth/logout', (req, res) => {
    res.json({ message: 'Logout realizado com sucesso' });
});

// Middleware de autenticação
function verificarAutenticacao(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    // Validação simples do token
    try {
        const decoded = Buffer.from(token, 'base64').toString();
        const [userId, timestamp] = decoded.split(':');
        
        // Token válido por 24 horas
        const agora = Date.now();
        const tokenTime = parseInt(timestamp);
        const umDia = 24 * 60 * 60 * 1000;
        
        if (agora - tokenTime > umDia) {
            return res.status(401).json({ error: 'Token expirado' });
        }
        
        req.userId = userId;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
}

// ✅ Proteger rotas (exemplo)
// app.get('/api/documentos', verificarAutenticacao, async (req, res) => {
//     ... código existente ...
// });

// =============================================
// MIDDLEWARE DE ERRO
// =============================================
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Arquivo muito grande. Tamanho máximo: 10MB' });
        }
    }
    res.status(500).json({ error: error.message });
});

// =============================================
// ROTAS DO FRONTEND
// =============================================

// ✅ Rota raiz - redirecionar para login
app.get('/', (req, res) => {
    res.sendFile(path.join(projectRoot, 'frontend/public/login.html'));
});

// ✅ Rota de login explícita
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(projectRoot, 'frontend/public/login.html'));
});

// ✅ Rota do dashboard (index.html)
app.get('/index.html', (req, res) => {
    res.sendFile(path.join(projectRoot, 'frontend/public/index.html'));
});

// ✅ Fallback - apenas para rotas que NÃO são API e NÃO são arquivos estáticos
app.get('*', (req, res, next) => {
    // Se for rota de API, pular
    if (req.path.startsWith('/api')) {
        return next();
    }
    
    // Se for arquivo estático (css, js, imagens), pular
    if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        return next();
    }
    
    // Caso contrário, redirecionar para login
    res.redirect('/login.html');
});

// =============================================
// MIDDLEWARE DE ERRO 404
// =============================================
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// =============================================
// INICIAR SERVIDOR
// =============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Acesse: http://localhost:${PORT}`);
    console.log(`🔧 Health check: http://localhost:${PORT}/api/health`);
});