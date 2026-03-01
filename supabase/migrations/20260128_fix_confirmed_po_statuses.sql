-- Fix PO statuses for already confirmed deliveries
-- This handles cases where the status didn't update to 'fulfilled' correctly

UPDATE public.purchase_orders po
SET status = 'fulfilled'
FROM public.delivery_confirmations dc
WHERE po.id = dc.purchase_order_id
AND po.status IN ('sent', 'in_transit', 'acknowledged')
AND (dc.checklist->>'delivery_status' = 'full' OR dc.checklist->>'delivery_status' IS NULL);

UPDATE public.purchase_orders po
SET status = 'partially_delivered'
FROM public.delivery_confirmations dc
WHERE po.id = dc.purchase_order_id
AND po.status IN ('sent', 'in_transit', 'acknowledged')
AND dc.checklist->>'delivery_status' = 'partial';
