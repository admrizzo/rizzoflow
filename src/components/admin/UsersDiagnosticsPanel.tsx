import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  RefreshCw,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiagnoseResponse {
  ok: true;
  generated_at: string;
  total_issues: number;
  summary: { auth_users: number; profiles: number; roles: number; boards: number };
  duplicate_emails: Array<{ email: string; count: number; users: Array<{ user_id: string; created_at: string; last_sign_in_at: string | null }> }>;
  duplicate_profile_emails: Array<{ email: string; count: number; profiles: Array<{ user_id: string; full_name: string | null }> }>;
  profiles_without_auth: Array<{ user_id: string; full_name: string | null; email: string | null }>;
  auth_without_profile: Array<{ user_id: string; email: string }>;
  roles_without_profile: Array<{ user_id: string; role: string }>;
  boards_without_profile: Array<{ user_id: string; board_id: string }>;
  multiple_roles: Array<{ user_id: string; roles: string[] }>;
}

/**
 * Painel somente-leitura. Detecta inconsistências e duplicidades de usuários
 * para que o admin resolva manualmente. Não executa ações destrutivas.
 */
export function UsersDiagnosticsPanel() {
  const [open, setOpen] = useState(false);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['admin-users-diagnostics'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-diagnose-users', {
        body: {},
      });
      if (error) throw new Error(error.message);
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as DiagnoseResponse;
    },
    staleTime: 60_000,
    retry: 0,
  });

  const totalIssues = data?.total_issues ?? 0;
  const hasIssues = totalIssues > 0;

  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        error && 'border-destructive/30 bg-destructive/5',
        !error && hasIssues && 'border-amber-300 bg-amber-50',
        !error && !hasIssues && data && 'border-emerald-200 bg-emerald-50',
        !data && !error && 'border-border bg-muted/20'
      )}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {error ? (
              <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
            ) : hasIssues ? (
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            ) : data ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium leading-tight">
                Diagnóstico de usuários
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {isLoading
                  ? 'Verificando inconsistências…'
                  : error
                    ? 'Não foi possível executar o diagnóstico.'
                    : hasIssues
                      ? `${totalIssues} ${totalIssues === 1 ? 'problema encontrado' : 'problemas encontrados'} — revisão manual recomendada.`
                      : data
                        ? 'Nenhuma inconsistência detectada.'
                        : 'Clique em verificar para iniciar.'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span className="sr-only">Atualizar</span>
            </Button>
            <CollapsibleTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 px-2">
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform',
                    open && 'rotate-180'
                  )}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent className="mt-3 space-y-3 text-xs">
          {error && (
            <div className="text-destructive">
              {(error as Error).message}
            </div>
          )}

          {data && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <SummaryItem label="Auth" value={data.summary.auth_users} />
                <SummaryItem label="Perfis" value={data.summary.profiles} />
                <SummaryItem label="Papéis" value={data.summary.roles} />
                <SummaryItem label="Acessos a fluxo" value={data.summary.boards} />
              </div>

              <Section
                title="E-mails duplicados em contas de acesso"
                count={data.duplicate_emails.length}
                description="Mais de uma conta de login compartilha o mesmo e-mail. Defina qual manter e remova as demais manualmente."
              >
                {data.duplicate_emails.map((dup) => (
                  <div key={dup.email} className="rounded border bg-background p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono">{dup.email}</span>
                      <Badge variant="outline">{dup.count} contas</Badge>
                    </div>
                    <ul className="mt-1 space-y-0.5 text-muted-foreground">
                      {dup.users.map((u) => (
                        <li key={u.user_id}>
                          • <span className="font-mono">{u.user_id.slice(0, 8)}…</span>{' '}
                          criada em {new Date(u.created_at).toLocaleDateString('pt-BR')}
                          {u.last_sign_in_at
                            ? ` · último acesso ${new Date(u.last_sign_in_at).toLocaleDateString('pt-BR')}`
                            : ' · nunca acessou'}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </Section>

              <Section
                title="E-mails duplicados em perfis"
                count={data.duplicate_profile_emails.length}
                description="Há mais de um perfil com o mesmo e-mail. Pode indicar registros legados sem conta de acesso."
              >
                {data.duplicate_profile_emails.map((dup) => (
                  <div key={dup.email} className="rounded border bg-background p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono">{dup.email}</span>
                      <Badge variant="outline">{dup.count} perfis</Badge>
                    </div>
                    <ul className="mt-1 space-y-0.5 text-muted-foreground">
                      {dup.profiles.map((p) => (
                        <li key={p.user_id}>
                          • {p.full_name ?? '(sem nome)'} ·{' '}
                          <span className="font-mono">{p.user_id.slice(0, 8)}…</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </Section>

              <Section
                title="Perfis sem conta de acesso"
                count={data.profiles_without_auth.length}
                description="O usuário aparece em perfis mas não consegue logar. Geralmente exige reconvite ou remoção."
              >
                {data.profiles_without_auth.map((p) => (
                  <div key={p.user_id} className="rounded border bg-background p-2">
                    {p.full_name ?? '(sem nome)'} · {p.email ?? '(sem e-mail)'} ·{' '}
                    <span className="font-mono">{p.user_id.slice(0, 8)}…</span>
                  </div>
                ))}
              </Section>

              <Section
                title="Contas de acesso sem perfil"
                count={data.auth_without_profile.length}
                description="Usuário consegue logar mas não tem perfil — não aparece corretamente nas listas."
              >
                {data.auth_without_profile.map((u) => (
                  <div key={u.user_id} className="rounded border bg-background p-2">
                    {u.email} ·{' '}
                    <span className="font-mono">{u.user_id.slice(0, 8)}…</span>
                  </div>
                ))}
              </Section>

              <Section
                title="Papéis órfãos"
                count={data.roles_without_profile.length}
                description="Existem papéis atribuídos a IDs que não têm perfil associado."
              >
                {data.roles_without_profile.map((r) => (
                  <div key={`${r.user_id}-${r.role}`} className="rounded border bg-background p-2">
                    <span className="font-mono">{r.user_id.slice(0, 8)}…</span> → {r.role}
                  </div>
                ))}
              </Section>

              <Section
                title="Acessos a fluxo órfãos"
                count={data.boards_without_profile.length}
                description="Vínculos com fluxos para IDs sem perfil correspondente."
              >
                {data.boards_without_profile.map((b, i) => (
                  <div key={i} className="rounded border bg-background p-2">
                    <span className="font-mono">{b.user_id.slice(0, 8)}…</span> →{' '}
                    fluxo <span className="font-mono">{b.board_id.slice(0, 8)}…</span>
                  </div>
                ))}
              </Section>

              <Section
                title="Usuários com múltiplos papéis"
                count={data.multiple_roles.length}
                description="Cada usuário deveria ter apenas um papel ativo. Ajuste pela aba acima."
              >
                {data.multiple_roles.map((m) => (
                  <div key={m.user_id} className="rounded border bg-background p-2">
                    <span className="font-mono">{m.user_id.slice(0, 8)}…</span>:{' '}
                    {m.roles.join(', ')}
                  </div>
                ))}
              </Section>

              {data.generated_at && (
                <div className="text-[10px] text-muted-foreground">
                  Atualizado em {new Date(data.generated_at).toLocaleString('pt-BR')}
                </div>
              )}
            </>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border bg-background p-2 text-center">
      <div className="text-base font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function Section({
  title,
  count,
  description,
  children,
}: {
  title: string;
  count: number;
  description: string;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="text-[10px]">{count}</Badge>
        <span className="font-semibold">{title}</span>
      </div>
      <p className="text-muted-foreground">{description}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}