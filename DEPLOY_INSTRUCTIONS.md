# Instrucciones de Deploy en Vercel

## Variables de Entorno Requeridas

Para que la aplicación funcione correctamente en Vercel, necesitas configurar las siguientes variables de entorno:

### 1. Variables de Supabase
- `NEXT_PUBLIC_SUPABASE_URL`: La URL de tu proyecto de Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: La clave anónima de tu proyecto de Supabase

### 2. Configuración en Vercel

1. **Conectar el repositorio a Vercel:**
   - Ve a [vercel.com](https://vercel.com)
   - Inicia sesión con tu cuenta de GitHub
   - Haz clic en "New Project"
   - Importa tu repositorio de GitHub

2. **Configurar las variables de entorno:**
   - En el dashboard de Vercel, ve a tu proyecto
   - Ve a "Settings" → "Environment Variables"
   - Agrega las siguientes variables (sin usar secrets):
     - **Name:** `NEXT_PUBLIC_SUPABASE_URL`
     - **Value:** `https://yypydgzcavbeubppzsvh.supabase.co`
     - **Environment:** Production, Preview, Development (marcar todas)
     
     - **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - **Value:** `tu_clave_anonima_de_supabase_aqui`
     - **Environment:** Production, Preview, Development (marcar todas)

3. **Configuración del build:**
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

### 3. Configuración de la base de datos

Asegúrate de que tu base de datos de Supabase esté configurada correctamente:

1. **Ejecutar los scripts SQL:**
   - Ve a tu dashboard de Supabase
   - Ve a "SQL Editor"
   - Ejecuta el script `database/setup-daily-payments-complete.sql`

2. **Configurar políticas RLS:**
   - Asegúrate de que las políticas de Row Level Security estén configuradas
   - Verifica que los usuarios puedan acceder a las tablas necesarias

### 4. Deploy

Una vez configuradas las variables de entorno:

1. Haz clic en "Deploy" en Vercel
2. Espera a que se complete el build
3. Tu aplicación estará disponible en la URL proporcionada por Vercel

### 5. Solución de errores comunes

**Error: "Environment Variable references Secret which does not exist"**
- **Causa:** Vercel está buscando secrets que no existen
- **Solución:** 
  1. Ve a "Settings" → "Environment Variables"
  2. Asegúrate de que las variables estén configuradas como **Environment Variables** (no como Secrets)
  3. No uses el símbolo `@` en los nombres de las variables
  4. Las variables deben ser:
     - `NEXT_PUBLIC_SUPABASE_URL` (sin @)
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (sin @)

**Error: "Function Runtimes must have a valid version"**
- **Causa:** Configuración de runtime inválida en vercel.json
- **Solución:** 
  1. El archivo vercel.json ha sido simplificado
  2. Vercel detectará automáticamente que es Next.js
  3. No necesitas configuración manual de runtime para Next.js

**Error: "supabaseKey is required"**
- **Causa:** Variables de entorno de Supabase no configuradas o incorrectas
- **Solución:** 
  1. Verifica que las variables estén configuradas en Vercel:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  2. Asegúrate de que estén marcadas para todos los entornos (Production, Preview, Development)
  3. No uses `SUPABASE_SERVICE_ROLE_KEY` en el código (ya corregido)

**Error: "405 Method Not Allowed" al generar contratos**
- **Causa:** API route no maneja correctamente los métodos HTTP
- **Solución:** 
  1. El archivo `src/app/api/contracts/generate/route.ts` ha sido actualizado
  2. Ahora maneja tanto GET como POST correctamente
  3. Se agregó logging para debug de plantillas
  4. Verifica que las plantillas estén en `src/templates/contracts/`

**Error: "Método GET no permitido" al generar contratos**
- **Causa:** La petición se está haciendo como GET en lugar de POST
- **Solución:** 
  1. Se agregó logging detallado en el componente y API
  2. El GET ahora devuelve información útil en lugar de error
  3. Revisa la consola del navegador para ver los logs de debug
  4. Verifica que la petición se esté haciendo con método POST

**Error: "405 con contenido HTML" en Vercel**
- **Causa:** Problema de routing en Vercel con API routes
- **Solución:** 
  1. Se agregó configuración específica para Vercel (`runtime: 'nodejs'`)
  2. Se agregó `dynamic: 'force-dynamic'` para evitar cache
  3. Se creó archivo de configuración `route.config.js`
  4. Se mejoró el manejo de errores con headers explícitos
  5. Se cambió a importación dinámica de dependencias

**Error: "Plantilla de contrato no encontrada" (404)**
- **Causa:** Las plantillas .docx no se incluyen en el build de Vercel
- **Solución:** 
  1. Se creó script `scripts/copy-templates.js` para copiar plantillas después del build
  2. Se actualizó `package.json` para ejecutar el script: `next build && node scripts/copy-templates.js`
  3. Se actualizó la API para buscar plantillas en `.next/server/templates/`
  4. Las plantillas ahora se copian automáticamente al build

### 6. Verificación post-deploy

Después del deploy, verifica que:

1. La aplicación carga correctamente
2. Puedes iniciar sesión
3. Las funcionalidades principales funcionan
4. La conexión con Supabase está activa

## Notas importantes

- Las variables de entorno que empiezan con `NEXT_PUBLIC_` son públicas y se incluyen en el bundle del cliente
- Asegúrate de que tu base de datos de Supabase esté configurada correctamente
- El archivo `vercel.json` ya está configurado para el deploy automático
