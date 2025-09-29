# 📋 Instrucciones para Preparar la Plantilla de Contrato

## ✅ **Variables que debes incluir en tu plantilla Word:**

### **Datos del Trabajador:**
- `{{nombre_trabajador}}` - Nombre completo del trabajador
- `{{rut_trabajador}}` - RUT del trabajador
- `{{direccion}}` - Dirección del trabajador
- `{{telefono}}` - Teléfono/celular
- `{{correo}}` - Correo electrónico
- `{{ciudad}}` - Ciudad de procedencia
- `{{nacionalidad}}` - Nacionalidad
- `{{estado}}` - Estado civil
- `{{fecha_nacimiento}}` - Fecha de nacimiento
- `{{prevision}}` - Previsión (AFP)
- `{{salud}}` - Sistema de salud

### **Datos del Trabajo:**
- `{{cargo}}` - Cargo/posición del trabajador
- `{{nombre_obra}}` - Nombre del proyecto/obra
- `{{fecha_inicio}}` - Fecha de inicio del contrato
- `{{fecha_termino}}` - Fecha de término del contrato

## 🔧 **Cómo preparar tu plantilla:**

1. **Abre tu plantilla original** `ContratoTemplate.docx`
2. **Reemplaza los datos específicos** con las variables entre llaves dobles
3. **Mantén todo el formato original** (fuentes, espaciado, colores, etc.)
4. **Guarda el archivo** en `src/templates/contracts/ContratoTemplate.docx`

## 📝 **Ejemplo de reemplazo:**

**Antes:**
```
Don(a) : Juan Pérez González
C.N.I. : 12.345.678-9
Domicilio : Av. Principal 123, Santiago
```

**Después:**
```
Don(a) : {{nombre_trabajador}}
C.N.I. : {{rut_trabajador}}
Domicilio : {{direccion}}
```

## ⚠️ **Importante:**
- Usa **exactamente** el formato `{{variable}}` (con llaves dobles)
- **No cambies** el formato visual de tu plantilla
- **Mantén** todos los estilos, fuentes y espaciado originales
- El sistema reemplazará automáticamente las variables con los datos reales

## 🎯 **Resultado:**
Tu contrato generado tendrá **exactamente el mismo formato** que tu plantilla original, pero con los datos reales del trabajador y proyecto seleccionados.
