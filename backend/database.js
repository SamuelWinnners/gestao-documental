import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ✅ OBTER CAMINHO CORRETO PARA O .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ CARREGAR .env DO DIRETÓRIO BACKEND
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🔧 Verificando variáveis de ambiente:');
console.log('DB_HOST:', process.env.DB_HOST || '❌ NÃO CONFIGURADO');
console.log('DB_USER:', process.env.DB_USER || '❌ NÃO CONFIGURADO');
console.log('DB_PORT:', process.env.DB_PORT || '❌ NÃO CONFIGURADO');
console.log('DB_NAME:', process.env.DB_NAME || '❌ NÃO CONFIGURADO');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Testando conexão
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Conectado ao banco de dados MySQL!');
    console.log('📊 Banco de dados:', process.env.DB_NAME);
    console.log('🏠 Host:', process.env.DB_HOST);
    console.log('👤 Usuário:', process.env.DB_USER);
    conn.release();
  } catch (err) {
    console.error('❌ Erro ao conectar no MySQL:', err.message);
    console.log('🔧 Detalhes da tentativa de conexão:');
    console.log('- Host:', process.env.DB_HOST);
    console.log('- Porta:', process.env.DB_PORT);
    console.log('- Usuário:', process.env.DB_USER);
    console.log('- Banco:', process.env.DB_NAME);
  }
})();

export default pool;