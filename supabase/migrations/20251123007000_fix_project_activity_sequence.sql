-- Ensure delivery confirmation trigger sets sequence when inserting project_activities

CREATE OR REPLACE FUNCTION public.update_po_status_on_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_seq INTEGER := 1;
BEGIN
  -- Determine next sequence for the project's activities
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

  -- Log activity with a valid sequence
  INSERT INTO public.project_activities (
    project_id,
    sequence,
    name,
    activity_type,
    description,
    metadata
  ) VALUES (
    NEW.project_id,
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
