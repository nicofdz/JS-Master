# 📋 Explicación de Campos en la Vista de Pagos

## 🎯 **Campos en la Vista `worker_payment_summary`:**

### **1. Costos Pendientes (`pending_payment`)**
- **Qué representa:** Pago al trabajador para tareas pendientes/en progreso
- **Campo de BD:** `apartment_tasks.worker_payment`
- **Tareas incluidas:** `pending`, `in_progress`
- **Propósito:** Salario pendiente del trabajador por tareas en curso

### **2. Por Pagar (`uncompleted_payment`)**
- **Qué representa:** Pago al trabajador por tareas completadas no pagadas
- **Campo de BD:** `apartment_tasks.worker_payment`
- **Tareas incluidas:** `completed` y `is_paid = FALSE`
- **Propósito:** Dinero que se debe pagar al trabajador

### **3. Total Pagado (`total_paid`)**
- **Qué representa:** Suma total de pagos realizados al trabajador
- **Campo de BD:** `worker_payment_history.total_amount`
- **Propósito:** Historial de pagos ya realizados

## 🔍 **Diferencias Clave:**

| Campo | Costos Pendientes | Por Pagar | Total Pagado |
|-------|------------------|-----------|--------------|
| **Qué es** | Pago al Trabajador | Pago al Trabajador | Pagos Realizados |
| **Cuándo** | Tareas pendientes/en progreso | Tareas completadas no pagadas | Historial de pagos |
| **Para qué** | Salario pendiente | Salario del trabajador | Control de pagos |

## ✅ **Lógica Correcta:**

### **Costos Pendientes:**
```sql
-- Pago al trabajador para tareas pendientes/en progreso
SUM(CASE WHEN at.status IN ('pending', 'in_progress') THEN at.worker_payment ELSE 0 END)
```

### **Por Pagar:**
```sql
-- Pago al trabajador para tareas completadas no pagadas
SUM(CASE WHEN at.status = 'completed' AND (at.is_paid = FALSE OR at.is_paid IS NULL) THEN at.worker_payment ELSE 0 END)
```

## 🎯 **Resultado Esperado:**

- ✅ **Costos Pendientes:** Muestra el salario pendiente del trabajador
- ✅ **Por Pagar:** Muestra el salario pendiente del trabajador
- ✅ **Total Pagado:** Muestra el historial de pagos realizados

## 🔍 **Verificación:**
Después de ejecutar `database/fix-payment-view-logic.sql`, verifica que:
- Los "Costos Pendientes" muestren valores de salarios pendientes
- Los "Por Pagar" muestren valores de salarios pendientes
- Los campos tengan sentido según el contexto de cada trabajador
