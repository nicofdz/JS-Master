-- Crear tabla para pagos diarios
-- Almacena los pagos realizados a trabajadores con contrato "por día"

CREATE TABLE IF NOT EXISTS public.daily_worker_payments (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  payment_month INTEGER NOT NULL CHECK (payment_month >= 1 AND payment_month <= 12),
  payment_year INTEGER NOT NULL CHECK (payment_year >= 2000),
  days_worked INTEGER NOT NULL DEFAULT 0,
  daily_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_date TIMESTAMP NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(worker_id, payment_month, payment_year)
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_daily_payments_worker ON public.daily_worker_payments(worker_id);
CREATE INDEX IF NOT EXISTS idx_daily_payments_period ON public.daily_worker_payments(payment_year, payment_month);

-- Agregar comentarios
COMMENT ON TABLE public.daily_worker_payments IS 'Registro de pagos realizados a trabajadores con contrato por día';
COMMENT ON COLUMN public.daily_worker_payments.payment_month IS 'Mes del período pagado (1-12)';
COMMENT ON COLUMN public.daily_worker_payments.payment_year IS 'Año del período pagado';
COMMENT ON COLUMN public.daily_worker_payments.days_worked IS 'Cantidad de días trabajados en el período';
COMMENT ON COLUMN public.daily_worker_payments.daily_rate IS 'Tarifa diaria al momento del pago';
COMMENT ON COLUMN public.daily_worker_payments.total_amount IS 'Monto total pagado (days_worked * daily_rate)';

