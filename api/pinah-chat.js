// Vercel Serverless Function — Pinah Chat (assistente pessoal do Luciano)
// Endpoint POST /api/pinah-chat
// Recebe: { messages: [{role, content}], context: {compromissos, tarefas, receitas, despesas} }
// Retorna: SSE stream (text/event-stream) com chunks { text } e finalizador { done: true }
//
// Modelo: claude-sonnet-4-6 (Sonnet — Pinah real, não Haiku)
// NÃO mexer no /api/ask-cerebro.js — esse é a IA da Lê, mantém separado.

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';
const MAX_OUTPUT_TOKENS = 2048;
const MAX_MESSAGES_HISTORY = 20;

const SYSTEM_PROMPT = `Você é a Pinah, assistente pessoal do Luciano Peres — CEO da CAP em Porto Alegre, fundador do app Conta Comigo One.

Você não é uma IA genérica. Você é a Pinah: perspicaz, direta, calorosa sem ser efusiva. Conhece a rotina do Luciano porque recebe os dados reais dele (agenda, tarefas, finanças) a cada conversa.

REGRAS DE COMPORTAMENTO:
1. Responda em português brasileiro natural, tom de conversa — não de relatório.
2. Seja direta e concisa. Evite parágrafos longos sem necessidade.
3. Quando o Luciano perguntar sobre agenda, tarefas ou finanças, use os dados reais do contexto. Cite o que você vê: "você tem 3 compromissos hoje" em vez de "segundo seus dados...".
4. Você tem memória da conversa atual (histórico enviado a cada mensagem). Referencie o que ele disse antes quando relevante.
5. Se não tiver dados suficientes pra responder, diga claramente e sugira o que ele pode registrar.
6. Para perguntas gerais (que não são sobre os dados dele), responda com sua inteligência normal — você é o Sonnet, não apenas um leitor de notas.
7. Seja honesta quando algo no app estiver incompleto ou quando ele estiver adiando algo importante que você vê nos dados.
8. Nunca quebre o personagem. Você é a Pinah dele.`;

function formatarContexto(ctx) {
  if (!ctx) return '';

  const partes = [];
  const hoje = new Date().toISOString().slice(0, 10);

  if (Array.isArray(ctx.compromissos) && ctx.compromissos.length > 0) {
    const proximos = ctx.compromissos
      .filter(c => (c.data || '') >= hoje)
      .slice(0, 20)
      .map(c => `  • ${c.data || '?'} ${c.hora || ''} — ${c.nome || c.titulo || '?'} (${c.tipo || 'geral'})${c.valor ? ' R$' + c.valor : ''}`)
      .join('\n');
    if (proximos) partes.push('COMPROMISSOS PRÓXIMOS:\n' + proximos);
  }

  if (Array.isArray(ctx.tarefas) && ctx.tarefas.length > 0) {
    const abertas = ctx.tarefas
      .filter(t => t.status !== 'concluida')
      .slice(0, 20)
      .map(t => `  • [${t.prioridade || 'normal'}] ${t.nome || t.titulo || '?'} (${t.area || 'geral'})${t.prazo ? ' — prazo: ' + t.prazo : ''}`)
      .join('\n');
    if (abertas) partes.push('TAREFAS EM ABERTO:\n' + abertas);
  }

  if (Array.isArray(ctx.receitas) && ctx.receitas.length > 0) {
    const recentes = ctx.receitas
      .slice(-10)
      .map(r => `  • ${r.data || ''} +R$${r.valor || 0} ${r.descricao || ''}`)
      .join('\n');
    partes.push('RECEITAS RECENTES:\n' + recentes);
  }

  if (Array.isArray(ctx.despesas) && ctx.despesas.length > 0) {
    const recentes = ctx.despesas
      .slice(-10)
      .map(d => `  • ${d.data || ''} -R$${d.valor || 0} ${d.descricao || ''}`)
      .join('\n');
    partes.push('DESPESAS RECENTES:\n' + recentes);
  }

  return partes.length > 0
    ? '=== DADOS ATUAIS DO LUCIANO ===\n' + partes.join('\n\n') + '\n==='
    : '';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[pinah-chat] ANTHROPIC_API_KEY não configurada');
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

  const { messages, context } = body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages vazio.' });
    return;
  }

  // Limita histórico pra não estourar contexto
  const messagesLimitados = messages.slice(-MAX_MESSAGES_HISTORY);

  // Injeta contexto dos dados do usuário no início da primeira mensagem user
  const contextStr = formatarContexto(context);
  const messagesComCtx = messagesLimitados.map((m, i) => {
    if (i === 0 && m.role === 'user' && contextStr) {
      return { ...m, content: contextStr + '\n\n' + m.content };
    }
    return m;
  });

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // desativa buffer do nginx no Vercel

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
        stream: true,
        system: SYSTEM_PROMPT,
        messages: messagesComCtx
      })
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error('[pinah-chat] Anthropic erro:', anthropicResponse.status, errText);
      res.write(`data: ${JSON.stringify({ error: 'Erro temporário na IA. Tente em alguns segundos.' })}\n\n`);
      res.end();
      return;
    }

    // Repassa o stream Anthropic → cliente via SSE
    const reader = anthropicResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // guarda linha incompleta pra próxima iteração

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const event = JSON.parse(data);
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
          }
          if (event.type === 'message_stop') {
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          }
        } catch (e) {
          // ignora linha mal formada
        }
      }
    }

    res.end();

    console.log('[pinah-chat] OK — stream concluído');

  } catch (err) {
    console.error('[pinah-chat] Erro inesperado:', err);
    try {
      res.write(`data: ${JSON.stringify({ error: 'Erro interno. Tente em alguns segundos.' })}\n\n`);
      res.end();
    } catch (e) {}
  }
};
