# Instrucciones: Agregar Tipo de Contrato a Trabajadores

## 📋 Descripción
Se agregó un nuevo campo `contract_type` a la tabla `workers` para registrar si un trabajador cobra **"Por Día"** o **"A Trato"**.

## 🗄️ Cambios en la Base de Datos

### Script a ejecutar en Supabase:
Ejecuta el archivo: **`add-contract-type-to-workers.sql`**

Este script:
1. Agrega la columna `contract_type` a la tabla `workers`
2. Establece `'por_dia'` como valor por defecto
3. Actualiza todos los trabajadores existentes a `'por_dia'`

## 🚀 Cómo ejecutar el script

1. Ve a tu proyecto en [Supabase](https://app.supabase.com)
2. Abre el **SQL Editor**
3. Copia y pega el contenido de `add-contract-type-to-workers.sql`
4. Click en **Run** o presiona `Ctrl/Cmd + Enter`
5. Verifica que el script se ejecutó correctamente (debe decir "Success")

## ✅ Verificación

Para verificar que el campo se agregó correctamente, ejecuta:

```sql
SELECT full_name, contract_type 
FROM public.workers 
LIMIT 5;
```

Deberías ver el campo `contract_type` con valor `'por_dia'` en todos los trabajadores.

## 🎨 Cambios en la Interfaz

### Formulario de Trabajador:
- ✅ Nuevo campo "Tipo de Contrato" en la sección "Información Básica"
- ✅ Opciones: "Por Día" y "A Trato"
- ✅ Aparece tanto al crear como al editar trabajadores

### Lista de Trabajadores:
- ✅ Nueva columna "Tipo de Contrato" en la tabla
- ✅ Badge morado para "A Trato"
- ✅ Badge azul para "Por Día"

## 📝 Valores Posibles

- `por_dia`: Trabajador cobra por día trabajado
- `a_trato`: Trabajador cobra por tarea/trabajo completado

---

**Fecha de creación:** Octubre 2025
**Autor:** Sistema JS Master




