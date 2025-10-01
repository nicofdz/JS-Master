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

-- Crear índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_invoice_income_project_id ON invoice_income(project_id);
CREATE INDEX IF NOT EXISTS idx_invoice_income_client_rut ON invoice_income(client_rut);
CREATE INDEX IF NOT EXISTS idx_invoice_income_invoice_number ON invoice_income(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_income_issue_date ON invoice_income(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoice_income_status ON invoice_income(status);

-- Crear tabla de pagos a trabajadores basados en facturas
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

-- Crear índices para worker_payments
CREATE INDEX IF NOT EXISTS idx_worker_payments_invoice_id ON worker_payments(invoice_income_id);
CREATE INDEX IF NOT EXISTS idx_worker_payments_worker_id ON worker_payments(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_payments_project_id ON worker_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_worker_payments_status ON worker_payments(status);

-- Crear trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invoice_income_updated_at 
    BEFORE UPDATE ON invoice_income 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_worker_payments_updated_at 
    BEFORE UPDATE ON worker_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE invoice_income IS 'Tabla para almacenar facturas de ingresos con datos extraídos de PDFs';
COMMENT ON TABLE worker_payments IS 'Tabla para pagos a trabajadores basados en facturas de ingresos';

COMMENT ON COLUMN invoice_income.client_name IS 'Nombre del cliente (campo SEÑOR(ES) del PDF)';
COMMENT ON COLUMN invoice_income.net_amount IS 'Monto neto de la factura';
COMMENT ON COLUMN invoice_income.iva_amount IS 'Monto del IVA';
COMMENT ON COLUMN invoice_income.total_amount IS 'Total de la factura';
COMMENT ON COLUMN invoice_income.raw_text IS 'Texto completo extraído del PDF';
COMMENT ON COLUMN invoice_income.parsed_data IS 'Datos estructurados extraídos del PDF en formato JSON';







