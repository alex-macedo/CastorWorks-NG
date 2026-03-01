// Story 4.6: process-delivery-confirmation Edge Function
// Epic 4: Delivery Confirmation & Payment Processing
//
// This function processes delivery confirmations from site supervisors,
// creating delivery records, uploading photos, and updating PO status.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { authenticateRequest, createServiceRoleClient, verifyProjectAccess } from '../_shared/authorization.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeliveryItem {
  item_description: string
  ordered_quantity: number
  received_quantity: number
  damaged_quantity?: number
  notes?: string
}

interface PhotoData {
  photo_url: string
  photo_storage_path: string
  caption?: string
  file_size_bytes?: number
  mime_type?: string
  width?: number
  height?: number
}

interface RequestBody {
  purchase_order_id: string
  confirmed_by_user_id: string
  delivery_date: string // ISO date string
  delivery_items: DeliveryItem[]
  photos: PhotoData[]
  signature_data_url: string // base64 data URL
  checklist?: Record<string, boolean | string>
  has_issues?: boolean
  issues_description?: string
  notes?: string
  gps_latitude?: number
  gps_longitude?: number
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Authenticate user
    const { user } = await authenticateRequest(req)
    
    // Create Supabase client with service role
    const supabaseClient = createServiceRoleClient()

    // Parse request body
    const body: RequestBody = await req.json()

    // Validate required fields
    if (!body.purchase_order_id || !body.confirmed_by_user_id || !body.delivery_date ||
        !body.signature_data_url || !body.delivery_items || body.delivery_items.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          code: 'MISSING_FIELDS',
          details: 'purchase_order_id, confirmed_by_user_id, delivery_date, signature_data_url, and delivery_items are required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // =================================================================
    // 2. Fetch Purchase Order and verify access
    // =================================================================
    const { data: purchaseOrder, error: poError } = await supabaseClient
      .from('purchase_orders')
      .select('id, project_id, purchase_order_number, status, metadata')
      .eq('id', body.purchase_order_id)
      .single()

    if (poError || !purchaseOrder) {
      return new Response(
        JSON.stringify({
          error: 'Purchase order not found',
          code: 'PO_NOT_FOUND',
          details: poError?.message
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify user has access to the project
    try {
      await verifyProjectAccess(user.id, purchaseOrder.project_id, supabaseClient)
    } catch (authError: any) {
      return new Response(
        JSON.stringify({
          error: 'Access denied',
          details: authError.message
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Processing delivery confirmation:', {
      purchase_order_id: body.purchase_order_id,
      confirmed_by: body.confirmed_by_user_id,
      delivery_date: body.delivery_date,
      items_count: body.delivery_items.length,
      photos_count: body.photos.length
    })

    // Check if delivery already exists for this PO
    const { data: existingDelivery, error: _checkError } = await supabaseClient
      .from('delivery_confirmations')
      .select('id')
      .eq('purchase_order_id', body.purchase_order_id)
      .maybeSingle()

    if (existingDelivery) {
      return new Response(
        JSON.stringify({
          error: 'Delivery confirmation already exists for this purchase order',
          code: 'DELIVERY_EXISTS',
          delivery_confirmation_id: existingDelivery.id
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // =================================================================
    // 3. Determine Delivery Status
    // =================================================================
    // Calculate if delivery is full, partial, or rejected based on quantities
    let deliveryStatus = 'full'
    let totalOrdered = 0
    let totalReceived = 0
    let totalDamaged = 0

    for (const item of body.delivery_items) {
      totalOrdered += item.ordered_quantity
      totalReceived += item.received_quantity
      totalDamaged += item.damaged_quantity || 0

      // If any item has less received than ordered, it's partial
      if (item.received_quantity < item.ordered_quantity) {
        deliveryStatus = 'partial'
      }
    }

    // If nothing was received, it's rejected
    if (totalReceived === 0) {
      deliveryStatus = 'rejected'
    }

    // =================================================================
    // 4. Build Checklist Object
    // =================================================================
    const checklist = {
      delivery_status: deliveryStatus,
      total_ordered: totalOrdered,
      total_received: totalReceived,
      total_damaged: totalDamaged,
      items: body.delivery_items,
      ...(body.checklist || {})
    }

    // =================================================================
    // 5. Create Delivery Confirmation Record
    // =================================================================
    const { data: deliveryConfirmation, error: dcError } = await supabaseClient
      .from('delivery_confirmations')
      .insert({
        purchase_order_id: body.purchase_order_id,
        project_id: purchaseOrder.project_id,
        confirmed_by_user_id: body.confirmed_by_user_id,
        delivery_date: body.delivery_date,
        signature_data_url: body.signature_data_url,
        checklist: checklist,
        has_issues: body.has_issues || false,
        issues_description: body.issues_description || null,
        notes: body.notes || null,
        verification_status: 'pending',
        metadata: {
          delivery_status: deliveryStatus,
          gps_latitude: body.gps_latitude,
          gps_longitude: body.gps_longitude,
          confirmed_at: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (dcError || !deliveryConfirmation) {
      console.error('Error creating delivery confirmation:', dcError)
      return new Response(
        JSON.stringify({
          error: 'Failed to create delivery confirmation',
          code: 'DB_ERROR',
          details: dcError?.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Delivery confirmation created:', deliveryConfirmation.id)

    // =================================================================
    // 6. Create Delivery Photos Records
    // =================================================================
    if (body.photos && body.photos.length > 0) {
      const photoRecords = body.photos.map((photo, index) => ({
        delivery_confirmation_id: deliveryConfirmation.id,
        photo_url: photo.photo_url,
        photo_storage_path: photo.photo_storage_path,
        caption: photo.caption || null,
        file_size_bytes: photo.file_size_bytes || null,
        mime_type: photo.mime_type || 'image/jpeg',
        width: photo.width || null,
        height: photo.height || null,
        sort_order: index
      }))

      const { error: photosError } = await supabaseClient
        .from('delivery_photos')
        .insert(photoRecords)

      if (photosError) {
        console.error('Error creating delivery photos (non-critical):', photosError)
        // Continue even if photos fail - the confirmation is already created
      } else {
        console.log(`${photoRecords.length} photos linked to delivery confirmation`)
      }
    }

    // =================================================================
    // 7. Update Purchase Order Status
    // =================================================================
    let poStatus = purchaseOrder.status
    let poMetadata = {}

    if (deliveryStatus === 'full') {
      poStatus = 'delivered'
      poMetadata = {
        delivery_confirmation_id: deliveryConfirmation.id,
        delivered_at: new Date().toISOString()
      }
    } else if (deliveryStatus === 'partial') {
      poStatus = 'partially_delivered'
      poMetadata = {
        partial_delivery_id: deliveryConfirmation.id,
        delivery_percentage: Math.round((totalReceived / totalOrdered) * 100)
      }
    } else if (deliveryStatus === 'rejected') {
      poStatus = 'delivery_rejected'
      poMetadata = {
        rejection_reason: body.issues_description || 'Delivery rejected by supervisor'
      }
    }

    const { error: poUpdateError } = await supabaseClient
      .from('purchase_orders')
      .update({
        status: poStatus,
        metadata: {
          ...(purchaseOrder.metadata || {}),
          ...poMetadata
        }
      })
      .eq('id', body.purchase_order_id)

    if (poUpdateError) {
      console.error('Error updating PO status (non-critical):', poUpdateError)
    } else {
      console.log(`PO status updated to: ${poStatus}`)
    }

    // =================================================================
    // 8. Return Success Response
    // =================================================================
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Delivery confirmation processed successfully',
        delivery_confirmation_id: deliveryConfirmation.id,
        delivery_status: deliveryStatus,
        purchase_order_id: body.purchase_order_id,
        photos_count: body.photos.length,
        summary: {
          total_ordered: totalOrdered,
          total_received: totalReceived,
          total_damaged: totalDamaged,
          delivery_percentage: Math.round((totalReceived / totalOrdered) * 100)
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('Unexpected error in process-delivery-confirmation:', error)
    
    const statusCode = error.message === 'Unauthorized' ? 401 : 
                     error.message.includes('Access denied') ? 403 : 500

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : 'Unknown error',
        code: error.message === 'Unauthorized' ? 'UNAUTHORIZED' : 'SERVER_ERROR'
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
