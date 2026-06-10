// Controle de cota diária e registro de consumo de API
// Usa Supabase REST API com service_role_key — bypassa RLS, nunca expõe ao cliente
// Não depende do SDK do Supabase — pure fetch

const SUPABASE_URL = 'https://wpymqverwnuinlypwouw.supabase.co';

/** ISO timestamp do início do dia atual no fuso America/Sao_Paulo */
function inicioDiaBrasilia() {
  const agora = new Date();
  // toLocaleDateString('en-CA') retorna 'YYYY-MM-DD' — formato ISO sem biblioteca externa
  const spData = agora.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  return new Date(spData + 'T00:00:00-03:00').toISOString();
}

/** GET autenticado na REST API do Supabase */
async function supaGet(path, serviceKey) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': 'Bearer ' + serviceKey
    },
    signal: AbortSignal.timeout(5000)
  });
  return r;
}

/** POST autenticado — fire-and-forget friendly */
async function supaInsert(table, row, serviceKey) {
  return fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': 'Bearer ' + serviceKey,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(row),
    signal: AbortSignal.timeout(5000)
  });
}

/**
 * Verifica se o usuário pode fazer uma chamada paga hoje.
 * Fail-open: qualquer erro interno deixa a chamada passar.
 * @returns {{ permitido: boolean, isento?: boolean, msg?: string }}
 */
async function verificarCota(userId, serviceKey) {
  if (!serviceKey) {
    console.warn('[quota] SUPABASE_SERVICE_ROLE_KEY ausente — fail-open');
    return { permitido: true };
  }
  try {
    // 1. Controle individual do usuário (isento? quota_override?)
    const ctrlResp = await supaGet(
      `quota_controle?user_id=eq.${userId}&select=isento,quota_override`,
      serviceKey
    );
    const ctrlRows = ctrlResp.ok ? await ctrlResp.json() : [];
    const ctrl = Array.isArray(ctrlRows) ? ctrlRows[0] : null;

    if (ctrl && ctrl.isento) return { permitido: true, isento: true };

    // 2. Limite aplicável: override individual > padrão global > fallback hardcoded
    let limite = 50;
    if (ctrl && ctrl.quota_override !== null && ctrl.quota_override !== undefined) {
      limite = ctrl.quota_override;
    } else {
      const cfgResp = await supaGet(
        'app_config?key=eq.quota_diaria_padrao&select=value',
        serviceKey
      );
      if (cfgResp.ok) {
        const cfgRows = await cfgResp.json();
        const cfg = Array.isArray(cfgRows) ? cfgRows[0] : null;
        if (cfg && cfg.value) {
          const n = parseInt(cfg.value, 10);
          if (!isNaN(n) && n > 0) limite = n;
        }
      }
    }

    // 3. Conta chamadas de hoje (cada linha = 1 mensagem do usuário)
    const inicio = inicioDiaBrasilia();
    const countResp = await supaGet(
      `consumo_api?user_id=eq.${userId}&criado_em=gte.${encodeURIComponent(inicio)}&select=id`,
      serviceKey
    );
    let usoHoje = 0;
    if (countResp.ok) {
      const rows = await countResp.json();
      usoHoje = Array.isArray(rows) ? rows.length : 0;
    }

    if (usoHoje >= limite) {
      return {
        permitido: false,
        msg: `Você atingiu seu limite de ${limite} chamadas de IA por hoje. Amanhã tem mais! 💙`
      };
    }
    return { permitido: true, isento: false };

  } catch (e) {
    console.error('[quota] verificarCota — fail-open:', e.message);
    return { permitido: true };
  }
}

/**
 * Grava uma linha de consumo. Fire-and-forget — não bloqueia a resposta.
 * Erros são apenas logados, nunca propagados.
 */
async function registrarConsumo(userId, endpoint, modelo, inputTokens, outputTokens, serviceKey) {
  if (!serviceKey) return;
  try {
    const r = await supaInsert('consumo_api', {
      user_id:       userId,
      endpoint:      endpoint,
      modelo:        modelo,
      input_tokens:  inputTokens  || 0,
      output_tokens: outputTokens || 0
    }, serviceKey);
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      console.error('[quota] registrarConsumo HTTP', r.status, txt);
    }
  } catch (e) {
    console.error('[quota] registrarConsumo erro:', e.message);
  }
}

module.exports = { verificarCota, registrarConsumo };
