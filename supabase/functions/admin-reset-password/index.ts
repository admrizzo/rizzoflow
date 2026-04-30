import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

/**
 * Admin-only: redefine a senha de um usuário interno.
 * Service Role nunca é exposta no frontend. Apenas admins logados podem chamar.
 *
 * Body:
 *  {
 *    user_id: string,            // alvo
 *    password: string,           // nova senha (>= 8 chars)
 *    must_change_password?: boolean  // se true, força troca no próximo login
 *  }
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const requestId = crypto.randomUUID()

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Configuração ausente.', requestId }, 500)
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1) Sessão obrigatória
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

    // 2) Apenas admin
    const { data: adminRow } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'admin')
      .maybeSingle()
    if (!adminRow) {
      return json({ error: 'Apenas administradores podem redefinir senhas.', requestId }, 403)
    }

    // 3) Payload
    const body = await req.json().catch(() => ({}))
    const userId: string | undefined = body.user_id
    const password: string | undefined = body.password
    const mustChange: boolean = !!body.must_change_password

    if (!userId || typeof userId !== 'string') {
      return json({ error: 'user_id é obrigatório.', requestId }, 400)
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      return json({ error: 'user_id inválido.', requestId }, 400)
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return json({ error: 'A senha deve ter no mínimo 8 caracteres.', requestId }, 400)
    }
    if (password.length > 72) {
      return json({ error: 'Senha muito longa (máx. 72 caracteres).', requestId }, 400)
    }

    // 4) Não permitir admin redefinir a própria senha por aqui
    //    (use o fluxo padrão de "alterar minha senha" para isso)
    if (userId === requestingUser.id) {
      return json({
        error: 'Use a opção "alterar minha senha" para sua própria conta.',
        requestId,
      }, 400)
    }

    // 5) Atualiza senha via Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
    })
    if (updateError) {
      console.error(`[admin-reset-password:${requestId}] update failed: ${updateError.message}`)
      return json({ error: updateError.message || 'Falha ao redefinir senha.', requestId }, 500)
    }

    // 6) Atualiza flag em profiles
    const { error: flagError } = await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: mustChange })
      .eq('user_id', userId)
    if (flagError) {
      console.warn(`[admin-reset-password:${requestId}] flag update warn: ${flagError.message}`)
      // Não falha a operação principal — senha já foi redefinida.
    }

    console.log(`[admin-reset-password:${requestId}] password reset for ${userId} (mustChange=${mustChange})`)

    return json({
      success: true,
      user_id: userId,
      must_change_password: mustChange,
      requestId,
    }, 200)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[admin-reset-password:${requestId}] Unhandled: ${msg}`)
    return json({ error: msg, requestId }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}