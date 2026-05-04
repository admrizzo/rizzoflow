import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const CRM_ENDPOINT = "https://api.robustcrm.io/feeds/ext-6f64sf64f6eq46";

const ALLOWED_ROLES = new Set(["admin", "gestor", "administrativo"]);

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1) Validar sessão do chamador
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(
        { success: false, code: "no_session", error: "Sessão não encontrada. Faça login novamente." },
        401,
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return jsonResponse(
        { success: false, code: "invalid_session", error: "Sessão inválida ou expirada. Entre novamente." },
        401,
      );
    }

    const userId = claimsData.claims.sub as string;

    // 2) Cliente service-role para checagem de role e upsert
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 3) Validar role: admin / gestor / administrativo
    const { data: rolesRows, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (rolesError) {
      console.error("Roles lookup error:", rolesError);
      return jsonResponse(
        { success: false, code: "roles_error", error: "Não foi possível validar suas permissões." },
        500,
      );
    }

    const userRoles = (rolesRows ?? []).map((r) => r.role);
    const hasPermission = userRoles.some((r) => ALLOWED_ROLES.has(r));
    if (!hasPermission) {
      return jsonResponse(
        { success: false, code: "forbidden", error: "Você não tem permissão para sincronizar." },
        403,
      );
    }

    // Fetch from CRM
    let crmResponse: Response;
    try {
      crmResponse = await fetch(CRM_ENDPOINT);
    } catch (fetchErr) {
      console.error("CRM fetch failed:", fetchErr);
      return jsonResponse(
        { success: false, code: "crm_unreachable", error: "Não foi possível acessar o CRM agora." },
        502,
      );
    }
    if (!crmResponse.ok) {
      console.error("CRM API non-OK:", crmResponse.status);
      return jsonResponse(
        { success: false, code: "crm_error", error: `CRM respondeu com status ${crmResponse.status}.` },
        502,
      );
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
        const captador = item.captador || {};
        const captador_email = Array.isArray(captador.emails) ? captador.emails[0] : (captador.email || null);
        const telefones = Array.isArray(captador.telefones) ? captador.telefones : [];
        const wpp = telefones.find((t: any) => t.whatsapp || t.tipo === 'whatsapp');
        const captador_phone = wpp ? wpp.numero : (telefones[0]?.numero || null);

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
          captador_robust_id: captador.id ? String(captador.id) : null,
          captador_nome: captador.nome || null,
          captador_email: captador_email,
          captador_phone: captador_phone,
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

    return jsonResponse(
      {
        success: true,
        total_from_crm: items.length,
        upserted,
        errors,
      },
      200,
    );
  } catch (error) {
    console.error("Sync error:", error);
    return jsonResponse(
      {
        success: false,
        code: "unexpected_error",
        error: "Erro inesperado ao sincronizar. Tente novamente.",
      },
      500,
    );
  }
});
