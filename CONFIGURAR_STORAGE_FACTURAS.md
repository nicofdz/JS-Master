# 📁 Configuración de Storage para Facturas

## 🚨 **IMPORTANTE: Configuración Manual Requerida**

El storage bucket para facturas debe configurarse manualmente desde el dashboard de Supabase porque requiere permisos de administrador.

## 📋 **Pasos para Configurar:**

### 1. **Crear Bucket de Storage**

1. Ve al dashboard de Supabase
2. Navega a **Storage** en el menú lateral
3. Haz clic en **"New bucket"**
4. Configura:
   - **Name:** `invoices`
   - **Public bucket:** ✅ **SÍ** (marcado)
   - **File size limit:** `50 MB`
   - **Allowed MIME types:** `application/pdf`

### 2. **Configurar Políticas de Seguridad**

Ve a **Storage** → **Policies** y crea las siguientes políticas:

#### **Política 1: Lectura Pública**
```sql
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'invoices');
```

#### **Política 2: Subida de Archivos**
```sql
CREATE POLICY "Authenticated users can upload invoices" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'invoices' 
  AND auth.role() = 'authenticated'
);
```

#### **Política 3: Actualización de Archivos**
```sql
CREATE POLICY "Users can update own invoices" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'invoices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### **Política 4: Eliminación de Archivos**
```sql
CREATE POLICY "Users can delete own invoices" ON storage.objects
FOR DELETE USING (
  bucket_id = 'invoices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## ✅ **Verificación**

Una vez configurado, puedes verificar que funciona:

1. Ve a la página `/facturas` en tu aplicación
2. Intenta subir un PDF de factura
3. Debería procesarse sin errores

## 🔧 **Solución de Problemas**

### Error: "Bucket not found"
- Verifica que el bucket se llama exactamente `invoices`
- Asegúrate de que está marcado como público

### Error: "Permission denied"
- Verifica que las políticas están creadas correctamente
- Asegúrate de que el usuario está autenticado

### Error: "File too large"
- Verifica que el límite de archivo es 50MB
- El archivo PDF no debe superar este tamaño

## 📞 **Soporte**

Si tienes problemas con la configuración, revisa:
1. Los logs del dashboard de Supabase
2. La consola del navegador para errores
3. Que el bucket esté configurado correctamente

---

**¡Una vez configurado, el sistema de facturas funcionará perfectamente!** 🎉





