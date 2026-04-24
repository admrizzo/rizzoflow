import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const VALID_ROLES = ['admin', 'gestor', 'corretor', 'administrativo'] as const
type ValidRole = typeof VALID_ROLES[number]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestId = crypto.randomUUID()
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
    const missingSecrets = [
      !supabaseUrl ? 'SUPABASE_URL' : null,
      !serviceRoleKey ? 'SUPABASE_SERVICE_ROLE_KEY' : null,
      !anonKey ? 'SUPABASE_ANON_KEY ou SUPABASE_PUBLISHABLE_KEY' : null,
    ].filter(Boolean)

    if (missingSecrets.length > 0) {
      console.error(`[invite-user:${requestId}] Missing secrets: ${missingSecrets.join(', ')}`)
      return json({
        error: `Configuração ausente na função invite-user: ${missingSecrets.join(', ')}`,
        requestId,
      }, 500)
    }

    const supabaseAdmin = createClient(
      supabaseUrl!,
      serviceRoleKey!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Auth: precisa estar logado
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Sessão obrigatória para convidar usuários', requestId }, 401)
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !requestingUser) {
      console.error(`[invite-user:${requestId}] Invalid token: ${authError?.message ?? 'no user'}`)
      return json({ error: 'Sessão inválida. Entre novamente e tente de novo.', requestId }, 401)
    }

    // 2. Apenas admin pode convidar
    const { data: adminRow } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'admin')
      .maybeSingle()
    if (!adminRow) {
      console.warn(`[invite-user:${requestId}] Forbidden invite attempt by ${requestingUser.id}`)
      return json({ error: 'Apenas administradores podem convidar usuários', requestId }, 403)
    }

    // 3. Payload
    const body = await req.json().catch(() => ({}))
    const email: string | undefined = body.email?.trim().toLowerCase()
    const fullName: string | undefined = body.fullName?.trim()
    const role: ValidRole | undefined = body.role

    if (!email || !fullName || !role) {
      return json({ error: 'email, fullName e role são obrigatórios' }, 400)
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'E-mail inválido' }, 400)
    }
    if (!VALID_ROLES.includes(role)) {
      return json({ error: `Papel inválido. Use: ${VALID_ROLES.join(', ')}` }, 400)
    }

    // 4. Verifica se e-mail já existe
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers()
    const already = existing?.users?.find(u => u.email?.toLowerCase() === email)
    if (already) {
      return json({ error: 'Já existe um usuário com este e-mail' }, 409)
    }

    // 5. Convida via e-mail (Supabase manda link p/ definir senha)
    const redirectTo = body.redirectTo || `${new URL(req.url).origin}`
    const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: { full_name: fullName },
        redirectTo,
      }
    )

    if (inviteError || !invited?.user) {
      return json({ error: inviteError?.message || 'Falha ao convidar usuário' }, 500)
    }

    const newUserId = invited.user.id

    // 6. Garante profile (handle_new_user trigger geralmente já cria, mas garantimos)
    await supabaseAdmin
      .from('profiles')
      .upsert(
        { user_id: newUserId, full_name: fullName },
        { onConflict: 'user_id' }
      )

    // 7. Atribui role (chama RPC que valida admin novamente)
    const supabaseAsCaller = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { error: roleError } = await supabaseAsCaller.rpc('set_user_role', {
      _user_id: newUserId,
      _role: role,
    })
    if (roleError) {
      // Não reverte o convite — admin pode reatribuir papel pela UI
      return json({
        warning: `Usuário convidado mas houve erro ao atribuir papel: ${roleError.message}`,
        user_id: newUserId,
      }, 207)
    }

    return json({
      success: true,
      user_id: newUserId,
      email,
      role,
      message: 'Convite enviado por e-mail',
    }, 200)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return json({ error: msg }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}