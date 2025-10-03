-- Función RPC para actualizar el income_tracking cuando se registra un pago
-- Suma el monto del pago al total_spent_on_payments

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

-- Agregar comentario
COMMENT ON FUNCTION update_income_tracking_payment(DECIMAL) IS 'Actualiza el income_tracking sumando el monto de un pago realizado';


