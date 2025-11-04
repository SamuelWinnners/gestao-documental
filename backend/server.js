// backend/server.js
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

// ✅ MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Log de requisições
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// ✅ FUNÇÃO DE VALIDAÇÃO DE CNPJ
function validarCNPJ(cnpj) {
    cnpj = cnpj.replace(/[^\d]+/g, '');

    if (cnpj === '') return false;
    if (cnpj.length !== 14) return false;

    // Elimina CNPJs invalidos conhecidos
    if (cnpj === "00000000000000" ||
        cnpj === "11111111111111" ||
        cnpj === "22222222222222" ||
        cnpj === "33333333333333" ||
        cnpj === "44444444444444" ||
        cnpj === "55555555555555" ||
        cnpj === "66666666666666" ||
        cnpj === "77777777777777" ||
        cnpj === "88888888888888" ||
        cnpj === "99999999999999")
        return false;

    // Valida DVs
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

// ✅ FUNÇÃO PARA FORMATAR ENDEREÇO
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

// ✅ ROTAS DA API

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'API está funcionando',
        timestamp: new Date().toISOString()
    });
});

// ✅ CONSULTA DE CNPJ
app.get('/api/consulta-cnpj/:cnpj', async (req, res) => {
    try {
        const { cnpj } = req.params;
        
        // Limpar o CNPJ (remover caracteres não numéricos)
        const cnpjLimpo = cnpj.replace(/\D/g, '');
        
        console.log(`Consultando CNPJ: ${cnpjLimpo}`);
        
        // Validar CNPJ
        if (!validarCNPJ(cnpjLimpo)) {
            return res.status(400).json({ error: 'CNPJ inválido' });
        }
        
        // Fazer requisição para a API da Receita WS
        const response = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro na consulta do CNPJ');
        }
        
        const data = await response.json();
        
        // Verificar se a consulta foi bem sucedida
        if (data.status === 'ERROR') {
            return res.status(400).json({ 
                error: data.message || 'CNPJ não encontrado ou inválido' 
            });
        }
        
        // Formatar os dados para nosso sistema
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

// ✅ ROTAS DE EMPRESAS
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
        console.log('=== TENTANDO CRIAR EMPRESA ===');
        console.log('Body recebido:', req.body);

        const { razao_social, nome_fantasia, cnpj, telefone, email, endereco } = req.body;

        // Validação dos campos obrigatórios
        if (!razao_social || !cnpj || !telefone || !email) {
            console.log('Campos obrigatórios faltando:', {
                razao_social: !!razao_social,
                cnpj: !!cnpj,
                telefone: !!telefone,
                email: !!email
            });
            return res.status(400).json({ 
                error: 'Preencha todos os campos obrigatórios'
            });
        }

        // Validar CNPJ
        if (!validarCNPJ(cnpj)) {
            return res.status(400).json({ error: 'CNPJ inválido' });
        }
        
        console.log('Inserindo no banco de dados...');
        const [result] = await pool.execute(
            'INSERT INTO empresas (razao_social, nome_fantasia, cnpj, telefone, email, endereco) VALUES (?, ?, ?, ?, ?, ?)',
            [razao_social, nome_fantasia || null, cnpj, telefone, email, endereco || null]
        );
        
        console.log('✅ EMPRESA CRIADA COM SUCESSO - ID:', result.insertId);
        res.status(201).json({ 
            id: result.insertId, 
            message: 'Empresa criada com sucesso'
        });

    } catch (error) {
        console.error('❌ ERRO AO CRIAR EMPRESA:', error);
        console.error('Stack trace:', error.stack);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'CNPJ já cadastrado' });
        }
        if (error.code === 'ER_DATA_TOO_LONG') {
            return res.status(400).json({ error: 'Dados muito longos para algum campo' });
        }
        
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
});

app.put('/api/empresas/:id', async (req, res) => {
    try {
        const empresaId = req.params.id;
        const { razao_social, nome_fantasia, cnpj, telefone, email, endereco } = req.body;
        
        console.log(`Atualizando empresa ID: ${empresaId}`, req.body);
        
        const [result] = await pool.execute(
            `UPDATE empresas SET 
                razao_social = ?, nome_fantasia = ?, cnpj = ?, 
                telefone = ?, email = ?, endereco = ?
            WHERE id = ?`,
            [razao_social, nome_fantasia || null, cnpj, telefone, email, endereco || null, empresaId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }
        
        console.log('Empresa atualizada com sucesso');
        res.json({ message: 'Empresa atualizada com sucesso' });
        
    } catch (error) {
        console.error('Erro ao atualizar empresa:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'CNPJ já cadastrado' });
        }
        res.status(500).json({ error: 'Erro ao atualizar empresa' });
    }
});

app.delete('/api/empresas/:id', async (req, res) => {
    try {
        const empresaId = req.params.id;
        console.log(`Excluindo empresa ID: ${empresaId}`);
        
        const [result] = await pool.execute(
            'DELETE FROM empresas WHERE id = ?',
            [empresaId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }
        
        console.log('Empresa excluída com sucesso');
        res.json({ message: 'Empresa excluída com sucesso' });
        
    } catch (error) {
        console.error('Erro ao excluir empresa:', error);
        res.status(500).json({ error: 'Erro ao excluir empresa' });
    }
});

app.get('/api/empresas/:id', async (req, res) => {
    try {
        const empresaId = req.params.id;
        console.log(`Buscando empresa ID: ${empresaId}`);
        
        const [rows] = await pool.execute(
            'SELECT * FROM empresas WHERE id = ?',
            [empresaId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Erro ao buscar empresa:', error);
        res.status(500).json({ error: 'Erro ao buscar empresa' });
    }
});

// ✅ ROTAS DE DOCUMENTOS
app.post('/api/documentos', upload.single('arquivo'), async (req, res) => {
    try {
        console.log('=== TENTANDO CRIAR DOCUMENTO ===');
        console.log('Body recebido:', req.body);
        console.log('Arquivo recebido:', req.file ? req.file.filename : 'Nenhum arquivo');

        const { 
            nome, 
            tipo, 
            empresa_id, 
            responsavel_id, 
            data_emissao, 
            data_vencimento, 
            observacoes 
        } = req.body;

        // Validação dos campos obrigatórios
        if (!nome || !tipo || !empresa_id || !responsavel_id || !data_emissao || !data_vencimento) {
            console.log('Campos obrigatórios faltando:', {
                nome: !!nome, tipo: !!tipo, empresa_id: !!empresa_id,
                responsavel_id: !!responsavel_id, data_emissao: !!data_emissao,
                data_vencimento: !!data_vencimento
            });
            return res.status(400).json({ 
                error: 'Preencha todos os campos obrigatórios'
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
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: error.message 
        });
    }
});

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

// ✅ NOVAS ROTAS PARA FILTROS DO DASHBOARD
app.get('/api/documentos/filtros', async (req, res) => {
    try {
        const { status, search, empresa_id } = req.query;
        console.log('Filtrando documentos:', { status, search, empresa_id });

        let whereConditions = [];
        let queryParams = [];

        // Filtro por status
        if (status === 'vencidos') {
            whereConditions.push('d.data_vencimento < CURDATE()');
        } else if (status === 'proximos') {
            whereConditions.push('d.data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)');
        } else if (status === 'validos') {
            whereConditions.push('d.data_vencimento > DATE_ADD(CURDATE(), INTERVAL 30 DAY)');
        }

        // Filtro por empresa
        if (empresa_id) {
            whereConditions.push('d.empresa_id = ?');
            queryParams.push(empresa_id);
        }

        // Filtro por pesquisa
        if (search) {
            whereConditions.push('(d.nome LIKE ? OR e.razao_social LIKE ? OR d.tipo LIKE ?)');
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        const whereClause = whereConditions.length > 0 
            ? `WHERE ${whereConditions.join(' AND ')}` 
            : '';

        const query = `
            SELECT 
                d.*,
                e.razao_social,
                e.nome_fantasia,
                e.cnpj as empresa_cnpj,
                r.nome as responsavel_nome,
                r.funcao as responsavel_funcao,
                CASE 
                    WHEN d.data_vencimento < CURDATE() THEN 'vencido'
                    WHEN d.data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'proximo'
                    ELSE 'valido'
                END as status
            FROM documentos d 
            LEFT JOIN empresas e ON d.empresa_id = e.id 
            LEFT JOIN responsaveis r ON d.responsavel_id = r.id 
            ${whereClause}
            ORDER BY d.data_vencimento ASC
        `;

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

// ✅ DASHBOARD
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

// ✅ ROTA PARA ESTATÍSTICAS DETALHADAS
app.get('/api/dashboard/estatisticas', async (req, res) => {
    try {
        console.log('Buscando estatísticas detalhadas...');
        
        const [[totalEmpresas]] = await pool.execute('SELECT COUNT(*) as total FROM empresas');
        const [[totalDocumentos]] = await pool.execute('SELECT COUNT(*) as total FROM documentos');
        const [[vencidosCount]] = await pool.execute('SELECT COUNT(*) as total FROM documentos WHERE data_vencimento < CURDATE()');
        const [[proximosCount]] = await pool.execute('SELECT COUNT(*) as total FROM documentos WHERE data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)');
        const [[validosCount]] = await pool.execute('SELECT COUNT(*) as total FROM documentos WHERE data_vencimento > DATE_ADD(CURDATE(), INTERVAL 30 DAY)');

        // Documentos vencidos
        const [documentosVencidos] = await pool.execute(`
            SELECT d.*, e.razao_social as empresa_nome 
            FROM documentos d 
            LEFT JOIN empresas e ON d.empresa_id = e.id 
            WHERE d.data_vencimento < CURDATE()
            ORDER BY d.data_vencimento ASC
            LIMIT 20
        `);

        // Documentos próximos do vencimento
        const [documentosProximos] = await pool.execute(`
            SELECT d.*, e.razao_social as empresa_nome 
            FROM documentos d 
            LEFT JOIN empresas e ON d.empresa_id = e.id 
            WHERE d.data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            ORDER BY d.data_vencimento ASC
            LIMIT 20
        `);

        // Próximos vencimentos (todos para gráfico)
        const [proximosVencimentos] = await pool.execute(`
            SELECT d.*, e.razao_social as empresa_nome 
            FROM documentos d 
            LEFT JOIN empresas e ON d.empresa_id = e.id 
            WHERE d.data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            ORDER BY d.data_vencimento ASC
        `);

        const data = {
            estatisticas: {
                empresas: totalEmpresas.total,
                documentos: totalDocumentos.total,
                vencidos: vencidosCount.total,
                proximos: proximosCount.total,
                validos: validosCount.total
            },
            documentosVencidos,
            documentosProximos,
            proximosVencimentos
        };

        console.log('Estatísticas detalhadas:', data.estatisticas);
        res.json(data);
    } catch (error) {
        console.error('Erro nas estatísticas:', error);
        res.status(500).json({ error: 'Erro ao obter estatísticas' });
    }
});

// ✅ RESPONSÁVEIS
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

// ✅ SERVIR FRONTEND
app.get('/', (req, res) => {
    console.log('Servindo frontend...');
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Rota catch-all para SPA
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ✅ MIDDLEWARE DE ERRO
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