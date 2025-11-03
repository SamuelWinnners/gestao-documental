import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './database.js';
import multer from 'multer';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ✅ CONFIGURAÇÃO DO UPLOAD
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadsDir = path.join(__dirname, '../uploads/documentos');
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

// ✅ MIDDLEWARE CORRIGIDO
// IMPORTANTE: Para FormData com multer, NÃO usar express.json() ou express.urlencoded()
app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Log de requisições
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Content-Type:', req.headers['content-type']);
    next();
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'API está funcionando',
        timestamp: new Date().toISOString()
    });
});

// ✅ ROTA POST CORRIGIDA PARA DOCUMENTOS
app.post('/api/documentos', upload.single('arquivo'), async (req, res) => {
    try {
        console.log('=== TENTANDO CRIAR DOCUMENTO ===');
        console.log('Body recebido:', req.body);
        console.log('Arquivo recebido:', req.file ? req.file.filename : 'Nenhum arquivo');

        // Para FormData, os campos vêm como strings no req.body
        const { 
            nome, 
            tipo, 
            empresa_id, 
            responsavel_id, 
            data_emissao, 
            data_vencimento, 
            observacoes 
        } = req.body;

        // Debug detalhado
        console.log('Campos recebidos:', {
            nome: nome,
            tipo: tipo,
            empresa_id: empresa_id,
            responsavel_id: responsavel_id,
            data_emissao: data_emissao,
            data_vencimento: data_vencimento,
            observacoes: observacoes
        });

        // Validação dos campos obrigatórios
        if (!nome || !tipo || !empresa_id || !responsavel_id || !data_emissao || !data_vencimento) {
            console.log('Campos obrigatórios faltando:', {
                nome: !!nome, tipo: !!tipo, empresa_id: !!empresa_id,
                responsavel_id: !!responsavel_id, data_emissao: !!data_emissao,
                data_vencimento: !!data_vencimento
            });
            return res.status(400).json({ 
                error: 'Preencha todos os campos obrigatórios',
                missing: {
                    nome: !nome,
                    tipo: !tipo,
                    empresa_id: !empresa_id,
                    responsavel_id: !responsavel_id,
                    data_emissao: !data_emissao,
                    data_vencimento: !data_vencimento
                }
            });
        }

        // Verificar se empresa existe
        const [empresas] = await pool.execute(
            'SELECT id, razao_social FROM empresas WHERE id = ?',
            [empresa_id]
        );
        if (empresas.length === 0) {
            return res.status(400).json({ error: 'Empresa não encontrada' });
        }

        // Verificar se responsável existe
        const [responsaveis] = await pool.execute(
            'SELECT id, nome FROM responsaveis WHERE id = ?',
            [responsavel_id]
        );
        if (responsaveis.length === 0) {
            return res.status(400).json({ error: 'Responsável não encontrado' });
        }

        // Inserir documento
        const arquivoPath = req.file ? req.file.filename : null;
        
        const [result] = await pool.execute(
            `INSERT INTO documentos 
            (nome, tipo, empresa_id, responsavel_id, data_emissao, data_vencimento, observacoes, arquivo_path) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [nome, tipo, empresa_id, responsavel_id, data_emissao, data_vencimento, observacoes || null, arquivoPath]
        );

        console.log('✅ DOCUMENTO CRIADO COM SUCESSO - ID:', result.insertId);

        // Buscar documento criado para retornar
        const [novoDocumento] = await pool.execute(`
            SELECT 
                d.*,
                e.razao_social,
                e.nome_fantasia,
                r.nome as responsavel_nome,
                r.funcao as responsavel_funcao
            FROM documentos d
            LEFT JOIN empresas e ON d.empresa_id = e.id
            LEFT JOIN responsaveis r ON d.responsavel_id = r.id
            WHERE d.id = ?
        `, [result.insertId]);

        res.status(201).json(novoDocumento[0]);

    } catch (error) {
        console.error('❌ ERRO AO CRIAR DOCUMENTO:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: error.message 
        });
    }
});

// ✅ ADICIONE express.json() APENAS para rotas que não usam upload
// Rotas que não usam upload podem usar express.json()
app.use(express.json());

// ... mantenha o restante das suas rotas GET, PUT, DELETE, etc. ...

// GET /api/documentos - Listar todos os documentos
app.get('/api/documentos', async (req, res) => {
    try {
        console.log('Buscando documentos...');
        const [rows] = await pool.execute(`
            SELECT 
                d.*,
                e.razao_social,
                e.nome_fantasia,
                e.cnpj as empresa_cnpj,
                r.nome as responsavel_nome,
                r.funcao as responsavel_funcao
            FROM documentos d 
            LEFT JOIN empresas e ON d.empresa_id = e.id 
            LEFT JOIN responsaveis r ON d.responsavel_id = r.id 
            ORDER BY d.data_vencimento ASC
        `);
        console.log(`Encontrados ${rows.length} documentos`);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao listar documentos:', error);
        res.status(500).json({ error: 'Erro ao listar documentos' });
    }
});

// GET /api/documentos/:id - Buscar documento por ID
app.get('/api/documentos/:id', async (req, res) => {
    try {
        const documentoId = req.params.id;
        console.log(`Buscando documento ID: ${documentoId}`);
        
        const [rows] = await pool.execute(`
            SELECT 
                d.*,
                e.razao_social,
                e.nome_fantasia,
                e.cnpj as empresa_cnpj,
                e.telefone as empresa_telefone,
                e.email as empresa_email,
                e.endereco as empresa_endereco,
                r.nome as responsavel_nome,
                r.funcao as responsavel_funcao,
                r.email as responsavel_email,
                r.telefone as responsavel_telefone
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

// PUT /api/documentos/:id - Atualizar documento (também usa upload)
app.put('/api/documentos/:id', upload.single('arquivo'), async (req, res) => {
    try {
        const documentoId = req.params.id;
        console.log(`Atualizando documento ID: ${documentoId}`, req.body);
        
        const { 
            nome, 
            tipo, 
            empresa_id, 
            responsavel_id, 
            data_emissao, 
            data_vencimento, 
            observacoes 
        } = req.body;
        
        // Buscar documento atual
        const [documentos] = await pool.execute(
            'SELECT * FROM documentos WHERE id = ?',
            [documentoId]
        );
        
        if (documentos.length === 0) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }
        
        const documentoAtual = documentos[0];
        
        // Atualizar documento
        const arquivoPath = req.file ? req.file.filename : documentoAtual.arquivo_path;
        
        await pool.execute(
            `UPDATE documentos SET 
            nome = ?, tipo = ?, empresa_id = ?, responsavel_id = ?, 
            data_emissao = ?, data_vencimento = ?, observacoes = ?, arquivo_path = ?
            WHERE id = ?`,
            [nome, tipo, empresa_id, responsavel_id, data_emissao, data_vencimento, observacoes || null, arquivoPath, documentoId]
        );
        
        console.log('Documento atualizado com sucesso');
        res.json({ message: 'Documento atualizado com sucesso', id: documentoId });
        
    } catch (error) {
        console.error('Erro ao atualizar documento:', error);
        res.status(500).json({ error: 'Erro ao atualizar documento' });
    }
});

// DELETE /api/documentos/:id - Excluir documento
app.delete('/api/documentos/:id', async (req, res) => {
    try {
        const documentoId = req.params.id;
        console.log(`Excluindo documento ID: ${documentoId}`);
        
        // Buscar documento para verificar se tem arquivo
        const [documentos] = await pool.execute(
            'SELECT arquivo_path FROM documentos WHERE id = ?',
            [documentoId]
        );
        
        if (documentos.length === 0) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }
        
        // Excluir arquivo físico se existir
        if (documentos[0].arquivo_path) {
            const filePath = path.join(__dirname, '../uploads/documentos', documentos[0].arquivo_path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log('Arquivo físico excluído:', documentos[0].arquivo_path);
            }
        }
        
        const [result] = await pool.execute(
            'DELETE FROM documentos WHERE id = ?',
            [documentoId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Documento não encontrado' });
        }
        
        console.log('Documento excluído com sucesso');
        res.json({ message: 'Documento excluído com sucesso' });
        
    } catch (error) {
        console.error('Erro ao excluir documento:', error);
        res.status(500).json({ error: 'Erro ao excluir documento' });
    }
});

// GET /api/documentos/:id/download - Download de arquivo
app.get('/api/documentos/:id/download', async (req, res) => {
    try {
        const documentoId = req.params.id;
        console.log(`Download solicitado para documento ID: ${documentoId}`);
        
        const [documentos] = await pool.execute(
            'SELECT arquivo_path, nome FROM documentos WHERE id = ?',
            [documentoId]
        );
        
        if (documentos.length === 0 || !documentos[0].arquivo_path) {
            return res.status(404).json({ error: 'Arquivo não encontrado' });
        }
        
        const documento = documentos[0];
        const filePath = path.join(__dirname, '../uploads/documentos', documento.arquivo_path);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Arquivo não encontrado no servidor' });
        }
        
        // Configurar headers para download
        const originalName = documento.arquivo_path.split('-').slice(2).join('-');
        res.download(filePath, originalName || documento.nome + path.extname(documento.arquivo_path));
        
    } catch (error) {
        console.error('Erro ao fazer download:', error);
        res.status(500).json({ error: 'Erro ao fazer download' });
    }
});

// ROTAS EXISTENTES (mantenha as que você já tem)

// Empresas
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

app.post('/api/empresas', async (req, res) => {
    try {
        console.log('Criando empresa:', req.body);
        const { razao_social, nome_fantasia, cnpj, telefone, email, endereco } = req.body;
        
        const [result] = await pool.execute(
            'INSERT INTO empresas (razao_social, nome_fantasia, cnpj, telefone, email, endereco) VALUES (?, ?, ?, ?, ?, ?)',
            [razao_social, nome_fantasia || null, cnpj, telefone, email, endereco || null]
        );
        
        console.log('Empresa criada com ID:', result.insertId);
        res.status(201).json({ id: result.insertId, message: 'Empresa criada com sucesso' });
    } catch (error) {
        console.error('Erro ao criar empresa:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'CNPJ já cadastrado' });
        }
        res.status(500).json({ error: 'Erro ao criar empresa' });
    }
});

// Dashboard
app.get('/api/dashboard', async (req, res) => {
    try {
        console.log('Buscando dados do dashboard...');
        
        const [[empresasCount]] = await pool.execute('SELECT COUNT(*) as total FROM empresas');
        const [[documentosCount]] = await pool.execute('SELECT COUNT(*) as total FROM documentos');
        const [[vencidosCount]] = await pool.execute('SELECT COUNT(*) as total FROM documentos WHERE data_vencimento < CURDATE()');
        const [[proximosCount]] = await pool.execute('SELECT COUNT(*) as total FROM documentos WHERE data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)');
        
        const [proximosVencimentos] = await pool.execute(`
            SELECT d.*, e.razao_social as empresa_nome 
            FROM documentos d 
            LEFT JOIN empresas e ON d.empresa_id = e.id 
            WHERE d.data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            ORDER BY d.data_vencimento ASC
            LIMIT 10
        `);

        const data = {
            empresas: empresasCount.total,
            documentos: documentosCount.total,
            vencidos: vencidosCount.total,
            proximos: proximosCount.total,
            proximosVencimentos
        };

        console.log('Dados do dashboard:', data);
        res.json(data);
    } catch (error) {
        console.error('Erro no dashboard:', error);
        res.status(500).json({ error: 'Erro ao obter dados do dashboard' });
    }
});

// Responsáveis
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

// Servir o frontend
app.get('/', (req, res) => {
    console.log('Servindo frontend...');
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Rota catch-all para SPA
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Middleware de tratamento de erro para upload
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Arquivo muito grande. Tamanho máximo: 10MB' });
        }
    }
    res.status(500).json({ error: error.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Acesse: http://localhost:${PORT}`);
    console.log(`🔧 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📁 Uploads: http://localhost:${PORT}/uploads/documentos/`);
});