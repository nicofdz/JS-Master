# Arreglar Error: "value too long for type character varying(20)"

## 🔴 Problema

El campo `apartment_number` en la tabla `apartments` está limitado a 20 caracteres, pero estás intentando crear un apartamento con un nombre más largo.

## ✅ Solución

Ejecuta este script SQL para aumentar el límite a 100 caracteres:

### Desde Supabase Dashboard:

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Click en **"SQL Editor"**
3. Click en **"+ New query"**
4. Copia y pega:

```sql
-- Aumentar el límite de apartment_number
ALTER TABLE public.apartments 
ALTER COLUMN apartment_number TYPE VARCHAR(100);

-- Verificar
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'apartments' 
AND column_name = 'apartment_number';
```

5. Click en **"Run"**
6. Deberías ver que `character_maximum_length` ahora es 100 ✅

## 🎯 Después de ejecutar

- Intenta crear el apartamento de nuevo
- Ahora debería funcionar sin problemas
- Puedes usar nombres de hasta 100 caracteres

## 📝 Nota

Este cambio no afecta los apartamentos que ya existen, solo permite nombres más largos en el futuro.

