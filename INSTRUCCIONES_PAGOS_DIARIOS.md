# 📋 Instrucciones para Configurar Pagos por Día

## ⚠️ IMPORTANTE: Ejecutar antes de usar la funcionalidad

Para que el sistema de pagos por día funcione correctamente, debes ejecutar el siguiente script SQL en tu base de datos de Supabase.

## 🚀 Pasos para ejecutar el setup

### Opción 1: Desde el Dashboard de Supabase (Recomendado)

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. En el menú lateral, selecciona **"SQL Editor"**
3. Haz clic en **"New query"**
4. Copia y pega el contenido del archivo: `database/setup-daily-payments-complete.sql`
5. Haz clic en **"Run"** o presiona `Ctrl + Enter`
6. Verifica que aparezcan los mensajes de éxito:
   - ✅ "Tabla daily_worker_payments creada exitosamente"
   - ✅ "Función update_income_tracking_payment creada exitosamente"
   - ✅ "Setup completado exitosamente!"

### Opción 2: Desde terminal (si tienes psql instalado)

```bash
# Conéctate a tu base de datos
psql "postgresql://[TU_CONNECTION_STRING]"

# Ejecuta el script
\i database/setup-daily-payments-complete.sql
```

## ✅ Verificación

Después de ejecutar el script, verifica que todo esté correcto:

1. En Supabase Dashboard, ve a **"Table Editor"**
2. Busca la tabla `daily_worker_payments`
3. Deberías ver las columnas:
   - id
   - worker_id
   - payment_month
   - payment_year
   - days_worked
   - daily_rate
   - total_amount
   - payment_date
   - notes
   - created_at
   - updated_at

## 🎯 Funcionalidades implementadas

### 1️⃣ Pagos por Día
- ✅ Visualización de trabajadores con contrato "por día"
- ✅ Cálculo automático de días trabajados por mes
- ✅ Registro de pagos mensuales
- ✅ Prevención de pagos duplicados (un pago por mes/año)
- ✅ Actualización automática de dinero disponible

### 2️⃣ Historial de Pagos
- ✅ Ver todos los pagos realizados a un trabajador
- ✅ Eliminar pagos (devuelve el dinero al disponible)
- ✅ Visualización de días trabajados y tarifa diaria

### 3️⃣ Integración con Income Tracking
- ✅ Los pagos se suman automáticamente a "Dinero Gastado en Pagos"
- ✅ Se restan automáticamente del "Dinero Disponible"
- ✅ Al eliminar un pago, el dinero vuelve al disponible

## 🔄 Flujo de trabajo

1. **Marcar asistencia** en la vista "Asistencia"
2. **Ver días trabajados** en "Pagos → Pago por Día"
3. **Pagar al trabajador** haciendo clic en "Pagar"
4. **Ver historial** con el botón de historial (icono de reloj)
5. **Eliminar pagos** si es necesario desde el historial

## 🐛 Solución de problemas

### Error: "relation does not exist"
- ✅ Ejecuta el script SQL `setup-daily-payments-complete.sql`

### No se actualiza el dinero disponible
- ✅ Verifica que la función `update_income_tracking_payment` exista
- ✅ Ejecuta: `SELECT * FROM pg_proc WHERE proname = 'update_income_tracking_payment';`

### El pago no se registra
- ✅ Verifica que el trabajador tenga días trabajados en el mes
- ✅ Verifica que no haya un pago previo para ese mes/año
- ✅ Revisa la consola del navegador para ver errores

## 📞 Soporte

Si tienes problemas, verifica:
1. Que ejecutaste el script SQL correctamente
2. Que tu usuario de Supabase tiene permisos de escritura
3. Que la conexión a Supabase está funcionando
4. Los logs en la consola del navegador (F12)


