-- Ensure delivery confirmation activity has a valid phase_id and sequence

CREATE OR REPLACE FUNCTION public.update_po_status_on_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_seq INTEGER := 1;
  phase_id UUID;
BEGIN
  -- Find an existing phase for the project
  SELECT id
  INTO phase_id
  FROM public.project_phases
  WHERE project_id = NEW.project_id
  ORDER BY start_date NULLS FIRST, created_at
  LIMIT 1;

  -- If none exists, create a lightweight phase for logging
  IF phase_id IS NULL THEN
    INSERT INTO public.project_phases (
      project_id,
      phase_name,
      start_date,
      end_date,
      progress_percentage,
      status
    )
    VALUES (
      NEW.project_id,
      'Entrega',
      NEW.delivery_date,
      NEW.delivery_date,
      0,
      'pending'
    )
    RETURNING id INTO phase_id;
  END IF;

  -- Determine next activity sequence for the project
  SELECT COALESCE(MAX(sequence), 0) + 1
  INTO next_seq
  FROM public.project_activities
  WHERE project_id = NEW.project_id;

  -- Update purchase order status to 'delivered'
  UPDATE public.purchase_orders
  SET
    status = 'delivered',
    actual_delivery_date = NEW.delivery_date,
    updated_at = NOW()
  WHERE id = NEW.purchase_order_id;

  -- Log activity with required fields
  INSERT INTO public.project_activities (
    project_id,
    phase_id,
    sequence,
    name,
    activity_type,
    description,
    metadata
  ) VALUES (
    NEW.project_id,
    phase_id,
    next_seq,
    'Delivery confirmed',
    'delivery_confirmed',
    'Delivery confirmed for purchase order',
    jsonb_build_object(
      'delivery_confirmation_id', NEW.id,
      'purchase_order_id', NEW.purchase_order_id,
      'confirmed_by_user_id', NEW.confirmed_by_user_id,
      'delivery_date', NEW.delivery_date,
      'has_issues', NEW.has_issues
    )
  );

  RETURN NEW;
END;
$$;
