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

    // 7) Near-duplicates por e-mail (mesmo domínio + local-part muito parecida).
    //    Pega cenários como "guilherme.lacerda@x" vs "guilherme.larcerda@x"
    //    (typo de uma letra).
    function normalizeLocal(local: string): string {
      return local
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\+.*$/, '')
        .replace(/\./g, '')
    }
    function levenshtein(a: string, b: string): number {
      if (a === b) return 0
      const m = a.length, n = b.length
      if (Math.abs(m - n) > 2) return 99
      const dp: number[] = Array(n + 1).fill(0).map((_, i) => i)
      for (let i = 1; i <= m; i++) {
        let prev = i - 1
        dp[0] = i
        for (let j = 1; j <= n; j++) {
          const tmp = dp[j]
          dp[j] = a[i - 1] === b[j - 1]
            ? prev
            : 1 + Math.min(prev, dp[j], dp[j - 1])
          prev = tmp
        }
      }
      return dp[n]
    }

    type AuthLite = { id: string; email: string; created_at: string; last_sign_in_at: string | null }
    const byDomain = new Map<string, Array<{ u: AuthLite; norm: string; localRaw: string }>>()
    for (const u of authUsers) {
      const at = u.email.indexOf('@')
      if (at <= 0) continue
      const local = u.email.slice(0, at)
      const domain = u.email.slice(at + 1)
      const norm = normalizeLocal(local)
      if (!byDomain.has(domain)) byDomain.set(domain, [])
      byDomain.get(domain)!.push({ u, norm, localRaw: local })
    }
    const seenPairs = new Set<string>()
    const nearDuplicateEmails: Array<{
      domain: string
      distance: number
      users: Array<{ user_id: string; email: string; created_at: string; last_sign_in_at: string | null }>
    }> = []
    // Não reporta os que já são duplicidades exatas
    const exactDupKey = new Set(duplicateEmails.map((d) => d.email))
    for (const [domain, list] of byDomain.entries()) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j]
          if (a.u.email === b.u.email) continue
          if (exactDupKey.has(a.u.email) || exactDupKey.has(b.u.email)) continue
          // ignora variações triviais (a===b após normalizar = duplicidade lógica)
          const dist = levenshtein(a.norm, b.norm)
          // Considera "near-duplicate" quando:
          //  - normalizado é igual (ex.: ponto a mais), OU
          //  - distância de edição ≤ 1 e ambos têm pelo menos 4 chars
          if (
            (a.norm === b.norm) ||
            (dist <= 1 && Math.min(a.norm.length, b.norm.length) >= 4)
          ) {
            const key = [a.u.id, b.u.id].sort().join(':')
            if (seenPairs.has(key)) continue
            seenPairs.add(key)
            nearDuplicateEmails.push({
              domain,
              distance: dist,
              users: [a.u, b.u].map((u) => ({
                user_id: u.id,
                email: u.email,
                created_at: u.created_at,
                last_sign_in_at: u.last_sign_in_at,
              })),
            })
          }
        }
      }
    }

    // 8) Nomes duplicados (mesma pessoa em mais de uma conta)
    function normalizeName(n: string | null): string {
      if (!n) return ''
      return n
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    }
    const byName = new Map<string, typeof profiles>()
    for (const p of profiles) {
      const key = normalizeName(p.full_name)
      if (!key) continue
      if (!byName.has(key)) byName.set(key, [])
      byName.get(key)!.push(p)
    }
    const duplicateNames = Array.from(byName.entries())
      .filter(([, list]) => list.length > 1)
      .map(([name, list]) => ({
        name,
        count: list.length,
        profiles: list.map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
        })),
      }))

    // 9) Usuários com papel mas sem fluxo (admins não precisam — têm acesso total)
    const boardUserSet = new Set(boards.map((b) => b.user_id))
    const usersWithRoleNoBoard = roles
      .filter((r) => r.role !== 'admin' && !boardUserSet.has(r.user_id))
      .map((r) => {
        const profile = profiles.find((p) => p.user_id === r.user_id)
        const auth = authUsers.find((u) => u.id === r.user_id)
        return {
          user_id: r.user_id,
          role: r.role,
          full_name: profile?.full_name ?? null,
          email: profile?.email ?? auth?.email ?? null,
        }
      })

    // 10) Usuários sem papel
    const roleUserSet = new Set(roles.map((r) => r.user_id))
    const usersWithoutRole = authUsers
      .filter((u) => !roleUserSet.has(u.id))
      .map((u) => {
        const profile = profiles.find((p) => p.user_id === u.id)
        return {
          user_id: u.id,
          email: u.email,
          full_name: profile?.full_name ?? null,
        }
      })

    const totalIssues =
      duplicateEmails.length +
      duplicateProfileEmails.length +
      profilesWithoutAuth.length +
      authWithoutProfile.length +
      rolesWithoutProfile.length +
      boardsWithoutProfile.length +
      multipleRoles.length +
      nearDuplicateEmails.length +
      duplicateNames.length +
      usersWithRoleNoBoard.length +
      usersWithoutRole.length

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
      near_duplicate_emails: nearDuplicateEmails,
      duplicate_names: duplicateNames,
      profiles_without_auth: profilesWithoutAuth,
      auth_without_profile: authWithoutProfile,
      roles_without_profile: rolesWithoutProfile,
      boards_without_profile: boardsWithoutProfile,
      multiple_roles: multipleRoles,
      users_with_role_no_board: usersWithRoleNoBoard,
      users_without_role: usersWithoutRole,
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