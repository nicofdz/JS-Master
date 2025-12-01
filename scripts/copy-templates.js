const fs = require('fs');
const path = require('path');

// Directorios
const sourceDir = path.join(process.cwd(), 'src', 'templates');
const targetDir = path.join(process.cwd(), '.next', 'server', 'templates');

// Función para copiar directorio recursivamente
function copyDir(src, dest) {
  // Crear directorio destino si no existe
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Leer contenido del directorio
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Si es directorio, copiar recursivamente
      copyDir(srcPath, destPath);
    } else {
      // Si es archivo, copiar
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copiado: ${entry.name}`);
    }
  }
}

console.log('Copiando plantillas...');
console.log(`Desde: ${sourceDir}`);
console.log(`Hacia: ${targetDir}`);

try {
  copyDir(sourceDir, targetDir);
  console.log('✅ Plantillas copiadas exitosamente');
} catch (error) {
  console.error('❌ Error copiando plantillas:', error);
  process.exit(1);
}

