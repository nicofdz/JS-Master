# Configuración de Supabase para Sistema de Control de Terminaciones

## 📋 Pasos para Configurar Supabase

### 1. Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto:
   - **Nombre**: `sistema-control-terminaciones`
   - **Región**: Selecciona la más cercana a tu ubicación
   - **Password**: Guarda la contraseña de la base de datos

### 2. Configurar Variables de Entorno

1. En tu proyecto de Supabase, ve a **Settings > API**
2. Copia las siguientes credenciales:
   - **URL**: `Project URL`
   - **ANON KEY**: `anon public`
   - **SERVICE_ROLE**: `service_role` (¡Mantén esto secreto!)

3. Actualiza tu archivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_project_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

### 3. Crear Esquema de Base de Datos

1. Ve a **SQL Editor** en tu proyecto Supabase
2. Copia y pega el contenido completo del archivo `database/schema.sql`
3. Ejecuta el script (botón **RUN**)
4. Verifica que no haya errores

### 4. Insertar Datos de Ejemplo

1. En el **SQL Editor**, crea una nueva consulta
2. Copia y pega el contenido del archivo `database/seed.sql`
3. Ejecuta el script
4. Verifica que los datos se hayan insertado correctamente

### 5. Verificar Configuración

1. Ve a **Table Editor** en Supabase
2. Deberías ver las siguientes tablas:
   - `user_profiles`
   - `projects`
   - `floors`
   - `apartments`
   - `activity_templates`
   - `apartment_activities`
   - `teams`
   - `progress_photos`
   - `activity_issues`

3. Ve a **Authentication > Users** para configurar usuarios (opcional para desarrollo)

### 6. Configurar Row Level Security (RLS)

El archivo `schema.sql` ya incluye las políticas RLS básicas. Para desarrollo, puedes:

1. Ir a **Authentication > Policies**
2. Revisar que las políticas estén activas
3. Para desarrollo local, puedes deshabilitar RLS temporalmente (no recomendado para producción)

### 7. Probar la Conexión

1. Reinicia tu servidor de desarrollo: `npm run dev`
2. Ve a la aplicación en `http://localhost:3000`
3. Usa el toggle "Cambiar a BD Real" en el dashboard
4. Si todo está configurado correctamente, deberías ver los datos reales

## 🔧 Solución de Problemas

### Error de Conexión
- Verifica que las variables de entorno estén correctas
- Asegúrate de que el archivo `.env.local` esté en la raíz del proyecto
- Reinicia el servidor después de cambiar variables de entorno

### Error de Permisos
- Verifica que RLS esté configurado correctamente
- Para desarrollo, puedes deshabilitar RLS temporalmente en las tablas

### Tablas No Encontradas
- Asegúrate de haber ejecutado el script `schema.sql` completamente
- Verifica que no haya errores en el SQL Editor

### Sin Datos
- Ejecuta el script `seed.sql` para insertar datos de ejemplo
- Verifica que los datos se hayan insertado en Table Editor

## 📊 Datos Incluidos

Después de ejecutar `seed.sql` tendrás:

- **5 Proyectos** de construcción
- **73 Pisos** distribuidos entre proyectos
- **292 Apartamentos** con diferentes tipos
- **15 Plantillas** de actividades
- **15 Equipos** de trabajo especializados
- **Miles de actividades** generadas automáticamente
- **Issues** de ejemplo para pruebas

## 🚀 Próximos Pasos

Una vez configurado Supabase:

1. Implementar autenticación (Sprint 2)
2. Crear formularios para CRUD (Sprint 3)
3. Añadir funcionalidad de fotos (Sprint 5)
4. Generar reportes (Sprint 6)

## 📞 Soporte

Si tienes problemas con la configuración:

1. Revisa la consola del navegador para errores
2. Verifica los logs de Supabase en el dashboard
3. Asegúrate de que todas las tablas estén creadas
4. Prueba la conexión con datos mock primero

