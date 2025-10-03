-- Setup completo para el sistema de pagos por día
-- Ejecutar este script en orden

-- 1. Crear tabla para pagos diarios
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

-- 2. Crear índices
CREATE INDEX IF NOT EXISTS idx_daily_payments_worker ON public.daily_worker_payments(worker_id);
CREATE INDEX IF NOT EXISTS idx_daily_payments_period ON public.daily_worker_payments(payment_year, payment_month);

-- 3. Agregar comentarios
COMMENT ON TABLE public.daily_worker_payments IS 'Registro de pagos realizados a trabajadores con contrato por día';
COMMENT ON COLUMN public.daily_worker_payments.payment_month IS 'Mes del período pagado (1-12)';
COMMENT ON COLUMN public.daily_worker_payments.payment_year IS 'Año del período pagado';
COMMENT ON COLUMN public.daily_worker_payments.days_worked IS 'Cantidad de días trabajados en el período';
COMMENT ON COLUMN public.daily_worker_payments.daily_rate IS 'Tarifa diaria al momento del pago';
COMMENT ON COLUMN public.daily_worker_payments.total_amount IS 'Monto total pagado (days_worked * daily_rate)';

-- 4. Crear o reemplazar función RPC para actualizar income_tracking
CREATE OR REPLACE FUNCTION update_income_tracking_payment(p_amount DECIMAL)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Actualizar el income_tracking (id=1 es el único registro)
  UPDATE public.income_tracking
  SET 
    total_spent_on_payments = COALESCE(total_spent_on_payments, 0) + p_amount,
    updated_at = NOW()
  WHERE id = 1;
  
  -- Si no existe el registro, crearlo
  IF NOT FOUND THEN
    INSERT INTO public.income_tracking (
      id,
      total_income,
      total_net,
      total_iva,
      processed_invoices_count,
      total_spent_on_payments,
      created_at,
      updated_at
    ) VALUES (
      1,
      0,
      0,
      0,
      0,
      p_amount,
      NOW(),
      NOW()
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION update_income_tracking_payment(DECIMAL) IS 'Actualiza el income_tracking sumando o restando el monto de un pago (usar valor negativo para restar)';

-- 5. Crear función para triggers (actualiza income_tracking cuando cambian datos)
CREATE OR REPLACE FUNCTION update_income_tracking()
RETURNS TRIGGER AS $$
BEGIN
  -- Llamar a la función que recalcula todo
  PERFORM refresh_income_tracking_complete();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 6. Actualizar refresh_income_tracking_complete para incluir pagos por día
CREATE OR REPLACE FUNCTION refresh_income_tracking_complete()
RETURNS VOID AS $$
BEGIN
  UPDATE public.income_tracking 
  SET 
    total_income = (
      SELECT COALESCE(SUM(total_amount), 0) 
      FROM public.invoice_income 
      WHERE status = 'processed'
    ),
    total_net = (
      SELECT COALESCE(SUM(net_amount), 0) 
      FROM public.invoice_income 
      WHERE status = 'processed'
    ),
    total_iva = (
      SELECT COALESCE(SUM(iva_amount), 0) 
      FROM public.invoice_income 
      WHERE status = 'processed'
    ),
    processed_invoices_count = (
      SELECT COUNT(*) 
      FROM public.invoice_income 
      WHERE status = 'processed'
    ),
    -- Suma pagos a trato + pagos por día
    total_spent_on_payments = (
      SELECT COALESCE(SUM(total_paid), 0) 
      FROM public.worker_payment_summary
    ) + (
      SELECT COALESCE(SUM(total_amount), 0) 
      FROM public.daily_worker_payments
    ),
    updated_at = NOW()
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql;

-- 7. Crear triggers para actualizar automáticamente cuando cambien pagos por día
DROP TRIGGER IF EXISTS trigger_update_income_on_daily_payment_insert ON public.daily_worker_payments;
CREATE TRIGGER trigger_update_income_on_daily_payment_insert
  AFTER INSERT ON public.daily_worker_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_income_tracking();

DROP TRIGGER IF EXISTS trigger_update_income_on_daily_payment_delete ON public.daily_worker_payments;
CREATE TRIGGER trigger_update_income_on_daily_payment_delete
  AFTER DELETE ON public.daily_worker_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_income_tracking();

-- 8. Actualizar datos actuales
SELECT refresh_income_tracking_complete();

-- 9. Verificar que todo se creó correctamente
DO $$
BEGIN
  -- Verificar tabla
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_worker_payments') THEN
    RAISE NOTICE 'Tabla daily_worker_payments creada exitosamente';
  ELSE
    RAISE EXCEPTION 'Error: No se pudo crear la tabla daily_worker_payments';
  END IF;
  
  -- Verificar función update_income_tracking_payment
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_income_tracking_payment') THEN
    RAISE NOTICE 'Función update_income_tracking_payment creada exitosamente';
  ELSE
    RAISE EXCEPTION 'Error: No se pudo crear la función update_income_tracking_payment';
  END IF;
  
  -- Verificar función refresh_income_tracking_complete
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'refresh_income_tracking_complete') THEN
    RAISE NOTICE 'Función refresh_income_tracking_complete actualizada exitosamente';
  ELSE
    RAISE WARNING 'Advertencia: Función refresh_income_tracking_complete no existe (puede que ya exista de antes)';
  END IF;
  
  -- Verificar triggers
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_income_on_daily_payment_insert') THEN
    RAISE NOTICE 'Triggers para pagos por día creados exitosamente';
  ELSE
    RAISE WARNING 'Advertencia: Triggers para pagos por día no se crearon';
  END IF;
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ Setup completado exitosamente!';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Ahora los pagos por día se restarán del dinero disponible';
END $$;

