// build.js - Script para criar o diretório public
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { copyFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function copyDirectory(src, dest) {
    if (!existsSync(dest)) {
        mkdirSync(dest, { recursive: true });
    }
    
    const items = readdirSync(src);
    
    for (const item of items) {
        const srcPath = join(src, item);
        const destPath = join(dest, item);
        
        if (statSync(srcPath).isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            copyFileSync(srcPath, destPath);
        }
    }
}

try {
    console.log('📦 Building project...');
    
    // Criar diretório public se não existir
    if (!existsSync('public')) {
        mkdirSync('public', { recursive: true });
    }
    
    // Copiar arquivos do frontend/public para public
    if (existsSync('frontend/public')) {
        copyDirectory('frontend/public', 'public');
        console.log('✅ Files copied to public directory');
    }
    
    console.log('🚀 Build completed successfully!');
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}