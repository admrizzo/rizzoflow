import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

/**
 * Gera um link seguro de primeiro acesso / redefinição de senha para um
 * usuário. Apenas administradores podem invocar. O link é gerado usando
 * o Supabase Admin API (`generateLink`) e nunca expõe a service_role no
 * frontend.
 *
 * Body:
 *  { email: string, type?: 'recovery' | 'invite', redirectTo?: string }
 *
 * Retorna: { action_link, expires_at, type }
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestId = crypto.randomUUID()
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Configuração ausente.', requestId }, 500)
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1. Auth obrigatório
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Sessão obrigatória.', requestId }, 401)
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requestingUser }, error: authError } =
      await supabaseAdmin.auth.getUser(token)
    if (authError || !requestingUser) {
      return json({ error: 'Sessão inválida.', requestId }, 401)
    }

    // 2. Apenas admin
    const { data: adminRow } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'admin')
      .maybeSingle()
    if (!adminRow) {
      console.warn(`[generate-access-link:${requestId}] Forbidden by ${requestingUser.id}`)
      return json({ error: 'Apenas administradores podem gerar links.', requestId }, 403)
    }

    // 3. Payload
    const body = await req.json().catch(() => ({}))
    const email: string | undefined = body.email?.trim().toLowerCase()
    const type: 'recovery' | 'invite' = body.type === 'invite' ? 'invite' : 'recovery'
    const requestOrigin = req.headers.get('origin')
    const siteUrl = Deno.env.get('SITE_URL') || 'https://seurizzo.com.br'
    const redirectTo: string =
      body.redirectTo ||
      (requestOrigin ? `${requestOrigin}/redefinir-senha` : `${siteUrl}/redefinir-senha`)

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'E-mail inválido.', requestId }, 400)
    }

    // 4. Verifica se o usuário existe
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers()
    const target = existing?.users?.find((u) => u.email?.toLowerCase() === email)
    if (!target) {
      return json(
        { error: 'Usuário não encontrado. Convide-o primeiro.', requestId },
        404,
      )
    }

    // 5. Gera o link via Admin API.
    //    Usamos 'recovery' por padrão porque funciona tanto para usuários
    //    que já definiram senha (esqueceu a senha) quanto para usuários
    //    convidados que ainda não acessaram (definir primeira senha).
    //    O tipo 'invite' fica disponível como opção explícita.
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type,
        email,
        options: { redirectTo },
      })

    if (linkError || !linkData?.properties?.action_link) {
      console.error(`[generate-access-link:${requestId}] generateLink failed: ${linkError?.message}`)
      return json(
        { error: linkError?.message || 'Falha ao gerar link.', requestId },
        500,
      )
    }

    console.log(`[generate-access-link:${requestId}] Link generated for ${email} (type=${type})`)

    return json(
      {
        success: true,
        type,
        action_link: linkData.properties.action_link,
        email_otp: linkData.properties.email_otp,
        expires_at: (linkData.properties as Record<string, unknown>)?.expires_at ?? null,
        requestId,
      },
      200,
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[generate-access-link] Unhandled: ${msg}`)
    return json({ error: msg }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
