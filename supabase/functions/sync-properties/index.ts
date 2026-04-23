import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const CRM_ENDPOINT = "https://api.robustcrm.io/feeds/ext-6f64sf64f6eq46";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch from CRM
    const crmResponse = await fetch(CRM_ENDPOINT);
    if (!crmResponse.ok) {
      throw new Error(`CRM API returned ${crmResponse.status}`);
    }

    const crmData = await crmResponse.json();
    const items = crmData?.data?.imoveis?.items || [];

    let upserted = 0;
    let errors = 0;

    // Process in batches of 50
    for (let i = 0; i < items.length; i += 50) {
      const batch = items.slice(i, i + 50);
      const rows = batch.map((item: any) => {
        const endereco = item.endereco || {};
        const taxas = item.taxas || {};
        const imgs = item.media?.imagens || [];
        const foto = imgs.length > 0 ? (imgs[0]?.url?.small || imgs[0]?.url?.full || null) : null;

        return {
          codigo_robust: item.id,
          titulo: item.titulo || null,
          tipo_imovel: item.tipo || null,
          finalidade: item.tipo_negociacao || null,
          logradouro: endereco.logradouro || null,
          bairro: endereco.bairro || null,
          cidade: endereco.cidade || null,
          estado: endereco.estado || null,
          cep: endereco.cep || null,
          numero: endereco.numero || null,
          complemento: endereco.complemento || null,
          valor_aluguel: item.valor_locacao?.valor || null,
          valor_venda: item.valor_venda?.valor || null,
          condominio: taxas.condominio?.valor || null,
          iptu: taxas.iptu?.valor || null,
          seguro_incendio: taxas.seguro_incendio || null,
          status_imovel: item.status ?? 1,
          foto_principal: foto,
          raw_data: item,
          last_synced_at: new Date().toISOString(),
        };
      });

      const { error } = await supabase
        .from("properties")
        .upsert(rows, { onConflict: "codigo_robust" });

      if (error) {
        console.error("Batch upsert error:", error);
        errors += batch.length;
      } else {
        upserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_from_crm: items.length,
        upserted,
        errors,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});