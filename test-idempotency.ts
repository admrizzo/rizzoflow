import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testIdempotency() {
  const publicToken = '3757402d-82be-409f-9d37-7bf59df124b2';
  
  console.log('--- Testando Idempotência ---');

  // 1. Primeira chamada
  console.log('Chamada 1...');
  const { data: res1, error: err1 } = await supabase.rpc('finalize_public_proposal', { 
    _public_token: publicToken, 
    _payload: { client_name: 'Teste Idempotência' } 
  });
  
  if (err1) throw err1;
  console.log('Resultado 1:', res1);

  const cardId = res1.card_id;

  // 2. Segunda chamada
  console.log('\nChamada 2...');
  const { data: res2, error: err2 } = await supabase.rpc('finalize_public_proposal', { 
    _public_token: publicToken, 
    _payload: { client_name: 'Teste Idempotência' } 
  });
  
  if (err2) throw err2;
  console.log('Resultado 2:', res2);

  // Verificações
  console.log('\n--- Verificações ---');

  // a. Verificar logs de atividade
  const { data: logs } = await supabase
    .from('card_activity_logs')
    .select('id, event_type, created_at')
    .eq('card_id', cardId)
    .eq('event_type', 'proposal_submitted')
    .order('created_at', { ascending: false });

  console.log(`Logs de 'proposal_submitted': ${logs?.length || 0}`);
  if (logs && logs.length > 1) {
    const diff = new Date(logs[0].created_at).getTime() - new Date(logs[1].created_at).getTime();
    console.log(`Diferença entre logs: ${diff / 1000}s`);
  }

  // b. Verificar checklists
  const { data: checklists } = await supabase
    .from('checklists')
    .select('id, name')
    .eq('card_id', cardId);
  
  console.log(`Checklists totais: ${checklists?.length || 0}`);
  const names = checklists?.map(c => c.name);
  const uniqueNames = new Set(names);
  console.log('Checklists únicos:', uniqueNames.size === (names?.length || 0) ? 'OK' : 'DUPLICADOS!');

  console.log('\n--- Fim do Teste ---');
}

testIdempotency().catch(console.error);
