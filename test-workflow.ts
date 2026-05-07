import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testWorkflow() {
  console.log('--- Testando Fluxo Completo ---');

  // 1. Criar um link de teste
  const { data: link, error: linkErr } = await supabase
    .from('proposal_links')
    .insert({
      codigo_robust: 'TEST-FLOW',
      status: 'pending'
    })
    .select()
    .single();

  if (linkErr) throw linkErr;
  console.log('Link criado:', link.id);

  // 2. Criar um card em "Cadastro iniciado"
  const { data: board } = await supabase.from('boards').select('id').ilike('name', '%Locação%').single();
  const { data: col } = await supabase.from('columns').select('id').eq('board_id', board.id).ilike('name', '%Cadastro iniciado%').single();
  const { data: destCol } = await supabase.from('columns').select('id').eq('board_id', board.id).ilike('name', '%Documentação enviada%').single();

  const { data: card, error: cardErr } = await supabase
    .from('cards')
    .insert({
      title: 'Card de Teste Fluxo',
      board_id: board.id,
      column_id: col.id,
      proposal_link_id: link.id
    })
    .select()
    .single();

  if (cardErr) throw cardErr;
  console.log('Card criado em:', col.id);

  // 3. Finalizar proposta
  console.log('Finalizando proposta...');
  const { data: res, error: resErr } = await supabase.rpc('finalize_public_proposal', {
    _public_token: link.public_token,
    _payload: { client_name: 'Cliente Teste Workflow' }
  });

  if (resErr) throw resErr;
  console.log('Resultado RPC:', res);

  // 4. Verificar coluna final
  const { data: finalCard } = await supabase
    .from('cards')
    .select('column_id, proposal_submitted_at')
    .eq('id', card.id)
    .single();

  console.log('Coluna final:', finalCard.column_id === destCol.id ? 'OK (Documentação enviada)' : 'ERRO (Continuou em ' + finalCard.column_id + ')');
  console.log('Submitted at:', finalCard.proposal_submitted_at ? 'OK' : 'ERRO (Nulo)');

  // 5. Verificar checklists
  const { data: checklists } = await supabase
    .from('checklists')
    .select('name')
    .eq('card_id', card.id);
  
  console.log('Checklists aplicados:', checklists.length);
  const hasStageChecklist = checklists.some(c => c.name === 'Cadastro iniciado');
  console.log('Checklist "Cadastro iniciado" presente?', hasStageChecklist ? 'Sim' : 'Não');

  console.log('--- Fim do Teste ---');
}

testWorkflow().catch(console.error);
