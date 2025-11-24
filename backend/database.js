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
console.log('MYSQL_DATABASE:', process.env.MYSQL_DATABASE || '❌ NÃO CONFIGURADO');
console.log('📊 Banco a ser usado:', process.env.MYSQL_DATABASE || process.env.DB_NAME);

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.MYSQL_DATABASE || process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ssl: {
    rejectUnauthorized: false
  }
});

// Testando conexão com retry e auto-wake
async function testConnection(retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔄 Tentativa de conexão ${i + 1}/${retries}...`);
      const conn = await pool.getConnection();
      
      // Teste mais robusto
      await conn.execute('SELECT 1 as health_check');
      
      console.log('✅ Conectado ao banco de dados MySQL!');
      console.log('📊 Banco de dados:', process.env.DB_NAME);
      console.log('🏠 Host:', process.env.DB_HOST);
      console.log('👤 Usuário:', process.env.DB_USER);
      conn.release();
      return true;
    } catch (err) {
      console.error(`❌ Tentativa ${i + 1} falhou:`, err.message);
      
      if (err.message.includes('Connection lost') || err.message.includes('server closed')) {
        console.log('🛌 Banco parece estar em sleep mode. Tentando acordar...');
      }
      
      if (i === retries - 1) {
        console.error('💥 Falha definitiva na conexão com o banco!');
        console.log('🔧 Detalhes da tentativa de conexão:');
        console.log('- Host:', process.env.DB_HOST);
        console.log('- Porta:', process.env.DB_PORT);
        console.log('- Usuário:', process.env.DB_USER);
        console.log('- Banco:', process.env.DB_NAME);
        console.log('⚠️  O banco Railway pode estar em sleep. Ele acordará na primeira requisição.');
        return false;
      }
      
      // Aguarda progressivamente mais tempo (2s, 4s, 6s, 8s, 10s)
      const waitTime = (i + 1) * 2000;
      console.log(`⏳ Aguardando ${waitTime/1000}s antes da próxima tentativa...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// Função para acordar o banco sob demanda
export async function wakeUpDatabase() {
  console.log('⏰ Acordando banco Railway...');
  return await testConnection(3);
}

testConnection();

export default pool;