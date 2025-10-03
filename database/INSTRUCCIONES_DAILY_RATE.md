# 💰 Instrucciones para Agregar Tarifa Diaria a Trabajadores

## Pasos para ejecutar el script

1. **Abre Supabase**
   - Ve a tu proyecto en [supabase.com](https://supabase.com)

2. **Abre el SQL Editor**
   - En el menú lateral, haz clic en "SQL Editor"

3. **Ejecuta el script**
   - Abre el archivo `database/add-daily-rate-to-workers.sql`
   - Copia todo el contenido
   - Pégalo en el SQL Editor de Supabase
   - Haz clic en "Run" o presiona `Ctrl + Enter`

4. **Verifica la actualización**
   - Ve a "Table Editor" en el menú lateral
   - Abre la tabla `workers`
   - Deberías ver la nueva columna `daily_rate`

## ¿Qué hace este script?

- ✅ Agrega la columna `daily_rate` (DECIMAL) a la tabla `workers`
- ✅ Inicializa en 0 para trabajadores existentes con contrato "por día"
- ✅ Permite almacenar valores decimales (ej: 35000.50)

## Uso

Esta columna almacena el **pago diario** de un trabajador cuando su tipo de contrato es "por día". 

Por ejemplo:
- Si un trabajador gana $35,000 por día
- Y trabajó 22 días en el mes
- El total a pagar sería: $770,000

---

**¡Listo para usar!** 🚀



