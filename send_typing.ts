import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const conversationId = '9f00993d-74da-415e-9880-b82f3d3b0fd0';

const channel = supabase.channel(`typing:${conversationId}`);
channel.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: '2bf1e8d5-ceb5-4d51-92bd-035fc83f303a',
        userName: 'Usuário Teste'
      }
    }).then(() => {
      console.log('Typing event sent');
      process.exit(0);
    });
  }
});
