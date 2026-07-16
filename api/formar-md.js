// Vercel Serverless Function — Formar o Pinah.md da pessoa
// Endpoint POST /api/formar-md
// Recebe: { respostas: [{ r, t }], livre?: string }
// Retorna: { md }  — o retrato de identidade em markdown, já salvo no perfil
//
// Chamado UMA vez por pessoa, no fim da entrevista de entrada (onboarding).
// Pega as respostas cruas da entrevista e pede pro Sonnet sintetizar um retrato
// em texto corrido — não uma lista de etiquetas. Esse .md vira o bio_pinah do
// perfil, que a Pinah lê no system prompt de toda conversa (api/pinah-chat.js).
//
// Modelo: claude-sonnet-4-6 — o MESMO da Pinah no chat. O system prompt dela diz
// "Você roda em cima do Claude Sonnet 4.6"; quem escreve o retrato é a mesma
// cabeça que depois vai conversar com a pessoa.
//
// COTA: de propósito NÃO passa por verificarCota. Pessoa nova precisa conseguir
// entrar no app mesmo que a cota do dia esteja estourada — barrar o onboarding
// tranca a pessoa do lado de fora. O consumo é registrado normalmente.

const { validarToken } = require('./_auth');
const { registrarConsumo } = require('./_quota');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const SUPABASE_URL      = 'https://wpymqverwnuinlypwouw.supabase.co';
const MODEL             = 'claude-sonnet-4-6';
const MAX_OUTPUT_TOKENS = 3000;

/* ─── System prompt: como escrever o retrato ────────────────────── */
const SYSTEM_MD = `Você escreve o "Pinah.md" de uma pessoa: o retrato de identidade que a Pinah (assistente pessoal do app Conta Comigo One) vai ler antes de cada conversa pra saber com quem está falando.

O QUE VOCÊ RECEBE
As respostas cruas de uma entrevista de boas-vindas. A pessoa respondeu do jeito dela — às vezes com uma palavra, às vezes com um parágrafo inteiro. Pode ter resposta vaga, irônica ou em branco.

O QUE VOCÊ ESCREVE
Um retrato em TEXTO CORRIDO, em português brasileiro, na terceira pessoa, entre 200 e 450 palavras. Markdown simples: um "# " com o nome da pessoa e no máximo 3 ou 4 seções "## ". Nada de tabelas.

Escreva pra ser LIDO por uma IA que precisa agir bem, não pra ser bonito. Cada frase tem que mudar alguma coisa em como a Pinah fala ou no que ela oferece.

REGRAS DURAS
1. NÃO devolva uma lista de etiquetas. "Profissão: advogado. Tom: informal." é exatamente o que NÃO queremos — isso o app já tinha. Ligue os pontos: o que a profissão dela implica na rotina, o que a dor declarada revela sobre a prioridade, como o tom escolhido deve mudar o jeito da Pinah falar.
2. NÃO invente fato nenhum. Se a pessoa não contou, não existe. Não deduza estado civil, idade, cidade, renda, religião nem diagnóstico. Inferir intenção a partir do que foi dito é OK ("quem guarda tudo na cabeça provavelmente vai valorizar lembrete") — inventar biografia não é.
3. Quando a pessoa não respondeu algo, diga isso em uma linha ("Não contou o que ocupa o coração — a Pinah descobre no uso") em vez de preencher com genérico.
4. Preserve as palavras da própria pessoa quando forem marcantes: se ela escreveu "tô afogado em papel", isso vale mais que "tem dificuldade com documentos". Cite entre aspas.
5. Termine com uma seção "## Como falar com ela" com 3 a 5 orientações CONCRETAS de tom, tratamento e o que evitar — derivadas do que ela disse, não do manual genérico de chatbot.
6. Sem puxação de saco, sem "que jornada incrível". Escreva seco e afetuoso, como quem anota sobre um amigo.

Devolva SÓ o markdown. Sem preâmbulo, sem "aqui está", sem cercar em crases.`;

/* ─── Monta o texto das respostas pro modelo ────────────────────── */
function formatarRespostas(respostas, livre) {
  const linhas = [];
  if (Array.isArray(respostas)) {
    respostas.forEach(function (item) {
      if (!item) return;
      const rotulo = String(item.r || '').trim();
      const texto  = String(item.t || '').trim();
      if (!rotulo && !texto) return;
      linhas.push('- ' + (rotulo || 'Resposta') + ': ' + (texto || '(não respondeu)'));
    });
  }
  let out = linhas.length
    ? 'RESPOSTAS DA ENTREVISTA:\n' + linhas.join('\n')
    : 'RESPOSTAS DA ENTREVISTA:\n(a pessoa não respondeu quase nada — escreva um retrato curto e honesto sobre isso)';

  const extra = String(livre == null ? '' : livre).trim();
  if (extra) {
    out += '\n\nO QUE ELA QUIS ACRESCENTAR POR CONTA PRÓPRIA (pergunta aberta no fim — peso alto, foi ela quem escolheu contar):\n' + extra;
  }
  return out;
}

/* ─── Salva o .md no perfil (service role — bypassa RLS) ────────── */
async function salvarNoPerfil(userId, md, serviceKey) {
  if (!serviceKey) {
    console.warn('[formar-md] SUPABASE_SERVICE_ROLE_KEY ausente — .md não salvo no perfil');
    return false;
  }
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': 'Bearer ' + serviceKey,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ bio_pinah: md, onboarded: true }),
        signal: AbortSignal.timeout(5000)
      }
    );
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      console.error('[formar-md] PATCH profiles falhou:', r.status, txt);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[formar-md] erro ao salvar perfil:', e.message);
    return false;
  }
}

/* ─── Handler ───────────────────────────────────────────────────── */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Use POST.' }); return; }

  const usuario = await validarToken(req);
  if (!usuario) { res.status(401).json({ error: 'Não autorizado.' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[formar-md] ANTHROPIC_API_KEY não configurada');
    res.status(500).json({ error: 'API não configurada. Avise o administrador.' });
    return;
  }

  let body;
  try {
    body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
  } catch (e) {
    res.status(400).json({ error: 'JSON inválido.' });
    return;
  }

  const { respostas, livre } = body || {};
  const temResposta = (Array.isArray(respostas) && respostas.length > 0) ||
                      (livre && String(livre).trim());
  if (!temResposta) {
    res.status(400).json({ error: 'Sem respostas pra formar o caderninho.' });
    return;
  }

  const srvKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: SYSTEM_MD,
        messages: [{ role: 'user', content: formatarRespostas(respostas, livre) }]
      })
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error('[formar-md] Anthropic erro:', anthropicResponse.status, errText);
      res.status(502).json({ error: 'Não consegui montar seu caderninho agora. Tenta de novo em alguns segundos.' });
      return;
    }

    const data = await anthropicResponse.json();

    // Segurança: o modelo pode recusar (stop_reason 'refusal') — content vem vazio.
    // Ler content[0].text sem checar quebraria o onboarding com um TypeError.
    if (data.stop_reason === 'refusal') {
      console.error('[formar-md] recusa do modelo:', JSON.stringify(data.stop_details || {}));
      res.status(502).json({ error: 'Não consegui montar seu caderninho com essas respostas. Tenta reescrever.' });
      return;
    }

    const bloco = Array.isArray(data.content)
      ? data.content.find(function (b) { return b && b.type === 'text'; })
      : null;
    const md = bloco && bloco.text ? String(bloco.text).trim() : '';

    if (!md) {
      console.error('[formar-md] resposta sem texto:', JSON.stringify(data).slice(0, 400));
      res.status(502).json({ error: 'Não consegui montar seu caderninho agora. Tenta de novo.' });
      return;
    }

    const salvo = await salvarNoPerfil(usuario.id, md, srvKey);

    const inputTokens  = (data.usage && data.usage.input_tokens)  || 0;
    const outputTokens = (data.usage && data.usage.output_tokens) || 0;
    registrarConsumo(usuario.id, 'formar-md', MODEL, inputTokens, outputTokens, srvKey)
      .catch(e => console.error('[formar-md] quota log err:', e));

    console.log('[formar-md] OK', { userId: usuario.id, salvo, inputTokens, outputTokens });
    res.status(200).json({ md: md, salvo: salvo });

  } catch (err) {
    console.error('[formar-md] Erro inesperado:', err);
    res.status(500).json({ error: 'Erro interno. Tenta de novo em alguns segundos.' });
  }
};
