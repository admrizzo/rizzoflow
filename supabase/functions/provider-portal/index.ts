import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const slug = url.searchParams.get('slug')

    if (!slug) {
      return new Response(JSON.stringify({ error: 'Slug é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. Find provider by slug
    const { data: provider, error: providerError } = await supabase
      .from('provider_registry')
      .select('id, name, phone, specialty, is_active, slug')
      .eq('slug', slug)
      .single()

    if (providerError || !provider) {
      return new Response(JSON.stringify({ error: 'Prestador não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!provider.is_active) {
      return new Response(JSON.stringify({ error: 'Prestador inativo' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Fetch all maintenance_providers for this provider, with card + column info
    const { data: services, error: servicesError } = await supabase
      .from('maintenance_providers')
      .select(`
        id,
        budget_status,
        budget_value,
        budget_sent_at,
        budget_received_at,
        agreed_value,
        is_selected,
        payment_status,
        payment_value,
        paid_at,
        service_completed_at,
        service_category,
        notes,
        completion_deadline,
        budget_deadline,
        created_at,
        updated_at,
        cards!inner(
          id,
          title,
          address,
          description,
          is_archived,
          board_id,
          column_id,
          card_number,
          superlogica_id
        )
      `)
      .eq('provider_name', provider.name)
      .eq('cards.is_archived', false)
      .order('created_at', { ascending: false })

    if (servicesError) {
      console.error('Error fetching services:', servicesError)
      return new Response(JSON.stringify({ error: 'Erro ao buscar serviços' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Get the board columns for the maintenance board
    const boardIds = [...new Set((services || []).map((s: any) => s.cards?.board_id).filter(Boolean))]
    
    let columns: any[] = []
    if (boardIds.length > 0) {
      const { data: cols } = await supabase
        .from('columns')
        .select('id, name, color, position, board_id')
        .in('board_id', boardIds)
        .order('position')
      columns = cols || []
    }

    // 4. Build response grouped by column
    const sanitizedServices = (services || []).map((s: any) => ({
      id: s.id,
      service_category: s.service_category,
      budget_status: s.budget_status,
      budget_value: s.budget_value,
      agreed_value: s.agreed_value,
      is_selected: s.is_selected,
      payment_status: s.payment_status,
      payment_value: s.payment_value,
      paid_at: s.paid_at,
      service_completed_at: s.service_completed_at,
      budget_sent_at: s.budget_sent_at,
      budget_received_at: s.budget_received_at,
      completion_deadline: s.completion_deadline,
      budget_deadline: s.budget_deadline,
      notes: s.notes,
      created_at: s.created_at,
      card_id: s.cards?.id || '',
      card_title: s.cards?.title || '',
      card_address: s.cards?.address || '',
      card_description: s.cards?.description || '',
      card_code: s.cards?.superlogica_id || (s.cards?.card_number ? String(s.cards.card_number) : ''),
      column_id: s.cards?.column_id || null,
    }))

    return new Response(JSON.stringify({
      provider: {
        name: provider.name,
        specialty: provider.specialty,
      },
      columns: columns.map(c => ({ id: c.id, name: c.name, color: c.color, position: c.position })),
      services: sanitizedServices,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Provider portal error:', error)
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
