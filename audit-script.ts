import { createClient } from '@supabase/supabase-client'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function runAudit() {
  console.log('--- Iniciando Auditoria Rizzo Flow ---');

  // 1. Cards em "Cadastro iniciado" com proposal_submitted_at preenchido
  const { data: stuckCards, error: stuckError } = await supabase
    .from('cards')
    .select('id, title, proposal_submitted_at, column:columns(name)')
    .not('proposal_submitted_at', 'is', null)

  if (stuckError) console.error('Erro ao buscar cards presos:', stuckError);
  else {
    const reallyStuck = stuckCards?.filter((c: any) => c.column?.name?.toLowerCase().includes('cadastro iniciado')) || [];
    console.log(`\n[1] Cards presos em "Cadastro iniciado" (${reallyStuck.length}):`);
    reallyStuck.forEach((c: any) => console.log(`- ID: ${c.id} | Título: ${c.title} | Enviado em: ${c.proposal_submitted_at}`));
  }

  // 2. proposal_correction_requests pendentes com documentos já recebidos
  const { data: pendingCorrections, error: correctionError } = await supabase
    .from('proposal_correction_requests')
    .select('id, proposal_link_id, status, docs:proposal_documents(id)')
    .eq('status', 'pending');

  if (correctionError) console.error('Erro ao buscar correções pendentes:', correctionError);
  else {
    const inconsistents = pendingCorrections?.filter((p: any) => p.docs && p.docs.length > 0) || [];
    console.log(`\n[2] Correções pendentes com documentos vinculados (${inconsistents.length}):`);
    inconsistents.forEach((p: any) => console.log(`- ID: ${p.id} | Link ID: ${p.proposal_link_id}`));
  }

  // 3. Documentos possivelmente duplicados
  const { data: allDocs, error: docError } = await supabase
    .from('proposal_documents')
    .select('id, proposal_link_id, party_id, category, original_file_name, file_size');

  if (docError) console.error('Erro ao buscar documentos:', docError);
  else {
    const duplicatesMap = new Map();
    allDocs?.forEach((d: any) => {
      const key = `${d.proposal_link_id}-${d.party_id}-${d.category}-${d.original_file_name}-${d.file_size}`;
      if (!duplicatesMap.has(key)) duplicatesMap.set(key, []);
      duplicatesMap.get(key).push(d.id);
    });

    const duplicates = Array.from(duplicatesMap.entries()).filter(([_, ids]: [any, any]) => ids.length > 1);
    console.log(`\n[3] Possíveis documentos duplicados (mesmo arquivo no mesmo contexto) (${duplicates.length} grupos):`);
    duplicates.forEach(([key, ids]) => console.log(`- Chave: ${key} | IDs: ${ids.join(', ')}`));
  }

  console.log('\n--- Auditoria Finalizada ---');
}

runAudit();
