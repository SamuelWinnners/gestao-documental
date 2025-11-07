// backend/check-tables.js
import pool from './database.js';

async function checkTables() {
  try {
    const [tables] = await pool.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.tables 
      WHERE table_schema = 'railway'
    `);
    
    console.log('📊 TABELAS EXISTENTES NO BANCO:');
    tables.forEach(table => {
      console.log('✅', table.TABLE_NAME);
    });

    if (tables.length === 0) {
      console.log('❌ Nenhuma tabela encontrada. Precisa importar o SQL.');
    } else {
      console.log(`🎉 ${tables.length} tabelas encontradas!`);
      
      // Verificar dados de exemplo
      const [empresas] = await pool.execute('SELECT COUNT(*) as total FROM empresas');
      const [documentos] = await pool.execute('SELECT COUNT(*) as total FROM documentos');
      
      console.log(`🏢 Empresas: ${empresas[0].total}`);
      console.log(`📄 Documentos: ${documentos[0].total}`);
    }

  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error.message);
  } finally {
    process.exit();
  }
}

checkTables();