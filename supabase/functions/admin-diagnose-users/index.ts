import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

/**
 * Admin-only: diagnostica duplicidades e inconsistências entre
 * auth.users, profiles, user_roles e user_boards.
 *
 * NÃO altera nada — apenas retorna um relatório para o admin agir manualmente.
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
    if (!authHeader) return json({ error: 'Sessão obrigatória.', requestId }, 401)
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
      return json({ error: 'Apenas administradores podem diagnosticar usuários.', requestId }, 403)
    }

    // 3) Carrega tudo
    const [{ data: authList, error: authListErr }, profilesRes, rolesRes, boardsRes] =
      await Promise.all([
        supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
        supabaseAdmin.from('profiles').select('user_id, full_name, email'),
        supabaseAdmin.from('user_roles').select('user_id, role'),
        supabaseAdmin.from('user_boards').select('user_id, board_id'),
      ])

    if (authListErr) {
      return json({ error: `Falha ao listar auth.users: ${authListErr.message}`, requestId }, 500)
    }

    const authUsers = (authList?.users ?? []).map((u) => ({
      id: u.id,
      email: (u.email ?? '').toLowerCase(),
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    }))

    const profiles = (profilesRes.data ?? []) as Array<{
      user_id: string; full_name: string | null; email: string | null
    }>
    const roles = (rolesRes.data ?? []) as Array<{ user_id: string; role: string }>
    const boards = (boardsRes.data ?? []) as Array<{ user_id: string; board_id: string }>

    // 4) Duplicidades por e-mail (auth)
    const byEmail = new Map<string, typeof authUsers>()
    for (const u of authUsers) {
      if (!u.email) continue
      if (!byEmail.has(u.email)) byEmail.set(u.email, [])
      byEmail.get(u.email)!.push(u)
    }
    const duplicateEmails = Array.from(byEmail.entries())
      .filter(([, list]) => list.length > 1)
      .map(([email, list]) => ({
        email,
        count: list.length,
        users: list.map((u) => ({
          user_id: u.id,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
        })),
      }))

    // 5) Duplicidades por e-mail (profiles)
    const profilesByEmail = new Map<string, typeof profiles>()
    for (const p of profiles) {
      const key = (p.email ?? '').toLowerCase()
      if (!key) continue
      if (!profilesByEmail.has(key)) profilesByEmail.set(key, [])
      profilesByEmail.get(key)!.push(p)
    }
    const duplicateProfileEmails = Array.from(profilesByEmail.entries())
      .filter(([, list]) => list.length > 1)
      .map(([email, list]) => ({
        email,
        count: list.length,
        profiles: list.map((p) => ({ user_id: p.user_id, full_name: p.full_name })),
      }))

    // 6) Inconsistências
    const authIds = new Set(authUsers.map((u) => u.id))
    const profileIds = new Set(profiles.map((p) => p.user_id))

    const profilesWithoutAuth = profiles
      .filter((p) => !authIds.has(p.user_id))
      .map((p) => ({ user_id: p.user_id, full_name: p.full_name, email: p.email }))

    const authWithoutProfile = authUsers
      .filter((u) => !profileIds.has(u.id))
      .map((u) => ({ user_id: u.id, email: u.email }))

    const rolesWithoutProfile = roles
      .filter((r) => !profileIds.has(r.user_id))
      .map((r) => ({ user_id: r.user_id, role: r.role }))

    const boardsWithoutProfile = boards
      .filter((b) => !profileIds.has(b.user_id))
      .map((b) => ({ user_id: b.user_id, board_id: b.board_id }))

    // Múltiplas roles para o mesmo usuário (deveria ser 1 papel ativo)
    const rolesByUser = new Map<string, string[]>()
    for (const r of roles) {
      if (!rolesByUser.has(r.user_id)) rolesByUser.set(r.user_id, [])
      rolesByUser.get(r.user_id)!.push(r.role)
    }
    const multipleRoles = Array.from(rolesByUser.entries())
      .filter(([, rs]) => rs.length > 1)
      .map(([user_id, rs]) => ({ user_id, roles: rs }))

    const totalIssues =
      duplicateEmails.length +
      duplicateProfileEmails.length +
      profilesWithoutAuth.length +
      authWithoutProfile.length +
      rolesWithoutProfile.length +
      boardsWithoutProfile.length +
      multipleRoles.length

    return json({
      ok: true,
      requestId,
      generated_at: new Date().toISOString(),
      total_issues: totalIssues,
      summary: {
        auth_users: authUsers.length,
        profiles: profiles.length,
        roles: roles.length,
        boards: boards.length,
      },
      duplicate_emails: duplicateEmails,
      duplicate_profile_emails: duplicateProfileEmails,
      profiles_without_auth: profilesWithoutAuth,
      auth_without_profile: authWithoutProfile,
      roles_without_profile: rolesWithoutProfile,
      boards_without_profile: boardsWithoutProfile,
      multiple_roles: multipleRoles,
    }, 200)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[admin-diagnose-users:${requestId}] Unhandled: ${msg}`)
    return json({ error: msg, requestId }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}