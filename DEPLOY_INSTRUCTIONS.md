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
   - Agrega las siguientes variables:
     - `NEXT_PUBLIC_SUPABASE_URL` = `https://yypydgzcavbeubppzsvh.supabase.co`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `tu_clave_anonima_de_supabase`

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

### 5. Verificación post-deploy

Después del deploy, verifica que:

1. La aplicación carga correctamente
2. Puedes iniciar sesión
3. Las funcionalidades principales funcionan
4. La conexión con Supabase está activa

## Notas importantes

- Las variables de entorno que empiezan con `NEXT_PUBLIC_` son públicas y se incluyen en el bundle del cliente
- Asegúrate de que tu base de datos de Supabase esté configurada correctamente
- El archivo `vercel.json` ya está configurado para el deploy automático
