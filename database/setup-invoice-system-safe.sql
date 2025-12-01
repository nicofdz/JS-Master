-- ============================================
-- CONFIGURACIÓN SEGURA DEL SISTEMA DE FACTURAS
-- ============================================
-- 
-- Este script maneja todos los posibles conflictos:
-- - Tablas existentes
-- - Triggers existentes  
-- - Políticas existentes
-- - Buckets existentes
--
-- IMPORTANTE: Ejecutar como administrador de Supabase
-- ============================================

-- PASO 1: Crear tablas de facturas (si no existen)
-- ============================================

-- Crear tabla de facturas
CREATE TABLE IF NOT EXISTS invoice_income (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  
  -- Datos del emisor
  issuer_name VARCHAR(255),
  issuer_rut VARCHAR(20),
  issuer_address TEXT,
  issuer_email VARCHAR(255),
  issuer_phone VARCHAR(50),
  
  -- Datos del cliente (SEÑOR(ES))
  client_name VARCHAR(255),
  client_rut VARCHAR(20),
  client_address TEXT,
  client_city VARCHAR(100),
  
  -- Datos de la factura
  invoice_number VARCHAR(100),
  issue_date DATE,
  sii_office VARCHAR(100),
  invoice_type VARCHAR(100),
  
  -- Detalles del servicio
  description TEXT,
  contract_number VARCHAR(100),
  contract_date DATE,
  payment_method VARCHAR(100),
  
  -- Montos
  net_amount DECIMAL(12,2),
  iva_percentage DECIMAL(5,2) DEFAULT 19.00,
  iva_amount DECIMAL(12,2),
  additional_tax DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2),
  
  -- Archivo y datos extraídos
  pdf_url TEXT,
  raw_text TEXT,
  parsed_data JSONB,
  
  -- Estado y control
  status VARCHAR(50) DEFAULT 'pending',
  is_processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP,
  
  -- Auditoría
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla de pagos a trabajadores
CREATE TABLE IF NOT EXISTS worker_payments (
  id SERIAL PRIMARY KEY,
  invoice_income_id INTEGER REFERENCES invoice_income(id) ON DELETE CASCADE,
  worker_id INTEGER REFERENCES workers(id),
  project_id INTEGER REFERENCES projects(id),
  
  -- Datos del pago
  amount DECIMAL(12,2),
  payment_date DATE,
  payment_method VARCHAR(100),
  description TEXT,
  
  -- Estado del pago
  status VARCHAR(50) DEFAULT 'pending',
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMP,
  
  -- Auditoría
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- PASO 2: Crear índices (si no existen)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_invoice_income_project_id ON invoice_income(project_id);
CREATE INDEX IF NOT EXISTS idx_invoice_income_client_rut ON invoice_income(client_rut);
CREATE INDEX IF NOT EXISTS idx_invoice_income_invoice_number ON invoice_income(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_income_issue_date ON invoice_income(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoice_income_status ON invoice_income(status);

CREATE INDEX IF NOT EXISTS idx_worker_payments_invoice_id ON worker_payments(invoice_income_id);
CREATE INDEX IF NOT EXISTS idx_worker_payments_worker_id ON worker_payments(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_payments_project_id ON worker_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_worker_payments_status ON worker_payments(status);

-- PASO 3: Crear función y triggers (manejo seguro)
-- ============================================

-- Crear o reemplazar función
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Eliminar triggers existentes si existen
DROP TRIGGER IF EXISTS update_invoice_income_updated_at ON invoice_income;
DROP TRIGGER IF EXISTS update_worker_payments_updated_at ON worker_payments;

-- Crear triggers
CREATE TRIGGER update_invoice_income_updated_at 
    BEFORE UPDATE ON invoice_income 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_worker_payments_updated_at 
    BEFORE UPDATE ON worker_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- PASO 4: Configurar bucket de storage (si no existe)
-- ============================================

-- Crear bucket para facturas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  true,
  52428800, -- 50MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- PASO 5: Configurar políticas de seguridad (manejo seguro)
-- ============================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload invoices" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own invoices" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own invoices" ON storage.objects;

-- Crear políticas
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'invoices');

CREATE POLICY "Authenticated users can upload invoices" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'invoices' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own invoices" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'invoices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own invoices" ON storage.objects
FOR DELETE USING (
  bucket_id = 'invoices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- PASO 6: Verificar configuración
-- ============================================

-- Verificar tablas
SELECT 
  'invoice_income' as tabla,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_income') 
    THEN '✅ Creada' 
    ELSE '❌ No existe' 
  END as estado
UNION ALL
SELECT 
  'worker_payments' as tabla,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'worker_payments') 
    THEN '✅ Creada' 
    ELSE '❌ No existe' 
  END as estado;

-- Verificar bucket
SELECT 
  'invoices' as bucket,
  CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'invoices') 
    THEN '✅ Creado' 
    ELSE '❌ No existe' 
  END as estado;

-- Verificar políticas
SELECT 
  policyname,
  '✅ Configurada' as estado
FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname IN (
    'Public Access',
    'Authenticated users can upload invoices',
    'Users can update own invoices',
    'Users can delete own invoices'
  );

-- Verificar triggers
SELECT 
  trigger_name,
  event_object_table,
  '✅ Configurado' as estado
FROM information_schema.triggers 
WHERE trigger_name IN (
  'update_invoice_income_updated_at',
  'update_worker_payments_updated_at'
);

-- Mensaje final
SELECT '🎉 Sistema de facturas configurado completamente y sin errores' as resultado;











<<<<<<< HEAD
=======

>>>>>>> 5b12c23a03c59a530b62e17c08f8d6ba5d623620
