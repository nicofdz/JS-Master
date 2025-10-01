# 📋 Instalación de Dependencias para Conversión PDF a Imagen

## 🎯 **Dependencias Necesarias:**

Para convertir PDF a imagen en el cliente, necesitas instalar:

```bash
npm install pdfjs-dist
npm install @types/pdfjs-dist --save-dev
```

## 🔧 **Configuración:**

1. **Instalar las dependencias:**
   ```bash
   npm install pdfjs-dist
   npm install @types/pdfjs-dist --save-dev
   ```

2. **Configurar webpack (si es necesario):**
   En `next.config.mjs`, agregar:
   ```javascript
   webpack: (config) => {
     config.resolve.alias.canvas = false;
     config.resolve.alias.encoding = false;
     return config;
   }
   ```

## 📝 **Nota Importante:**

La conversión de PDF a imagen en el cliente tiene limitaciones:
- Solo funciona con PDFs simples
- Puede ser lenta para archivos grandes
- Requiere que el PDF sea accesible públicamente

## 🚀 **Alternativa Recomendada:**

Para una implementación más robusta, considera:
1. **Backend API** que convierta PDF a imagen
2. **Servicio en la nube** como Cloudinary o AWS Lambda
3. **Servicio de terceros** especializado en conversión de documentos

## ✅ **Implementación Actual:**

Por ahora, el sistema usa la URL del PDF como fallback para la imagen, lo que permite:
- Subir PDFs correctamente
- Mostrar el modal de planos
- Descargar el PDF completo
- Preparar la estructura para conversión futura










