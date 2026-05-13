// Vercel Serverless Function — Pinah Chat (assistente pessoal do Luciano)
// Endpoint POST /api/pinah-chat
// Recebe: { messages: [{role, content}], context: {compromissos, tarefas, receitas, despesas} }
// Retorna: SSE stream (text/event-stream) com:
//   { text }           — chunk de texto da Pinah
//   { tool, input }    — ferramenta chamada (criar_compromisso | criar_tarefa | registrar_transacao)
//   { done: true }     — fim da resposta
//
// Modelo: claude-sonnet-4-6 (Sonnet — Pinah real, não Haiku)
// NÃO mexer no /api/ask-cerebro.js — esse é a IA da Lê, mantém separado.

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';
const MAX_OUTPUT_TOKENS = 2048;
const MAX_MESSAGES_HISTORY = 20;

/* ─── Ferramentas (Tool Use) ─────────────────────────────────────── */
const TOOLS = [
  {
    name: 'criar_compromisso',
    description: 'Cria um compromisso/agendamento na agenda do usuário. Use quando o usuário mencionar nome + data + hora de um compromisso, atendimento, reunião ou consulta.',
    input_schema: {
      type: 'object',
      properties: {
        nome:    { type: 'string',  description: 'Nome do cliente ou descrição do compromisso' },
        data:    { type: 'string',  description: 'Data no formato YYYY-MM-DD. Calcule datas relativas como "amanhã", "sexta".' },
        hora:    { type: 'string',  description: 'Hora no formato HH:MM (24h)' },
        tipo:    { type: 'string',  description: 'Categoria: atendimento, reunião, consulta, pessoal, outro. Infira pelo contexto.' },
        duracao: { type: 'number',  description: 'Duração em minutos. Padrão: 60.' },
        valor:   { type: 'number',  description: 'Valor em reais, se mencionado. Omitir se não houver.' }
      },
      required: ['nome', 'data', 'hora']
    }
  },
  {
    name: 'criar_tarefa',
    description: 'Cria uma tarefa no kanban de tarefas do usuário. Use quando o usuário pedir para registrar, lembrar ou fazer algo sem horário específico.',
    input_schema: {
      type: 'object',
      properties: {
        titulo:     { type: 'string', description: 'Título claro e objetivo da tarefa' },
        area:       { type: 'string', description: 'Área/coluna: Pessoal, CAP, Saúde, ou outra existente. Infira pelo contexto.' },
        prioridade: { type: 'string', enum: ['alta', 'normal', 'baixa'], description: 'Prioridade da tarefa' },
        prazo:      { type: 'string', description: 'Data prazo no formato YYYY-MM-DD, se mencionado' }
      },
      required: ['titulo']
    }
  },
  {
    name: 'registrar_transacao',
    description: 'Registra uma receita ou despesa no financeiro do usuário.',
    input_schema: {
      type: 'object',
      properties: {
        tipo:      { type: 'string', enum: ['receita', 'despesa'], description: 'Se é entrada ou saída de dinheiro' },
        valor:     { type: 'number', description: 'Valor em reais (número positivo)' },
        descricao: { type: 'string', description: 'Descrição da transação' },
        data:      { type: 'string', description: 'Data no formato YYYY-MM-DD. Padrão: hoje.' },
        categoria: { type: 'string', description: 'Categoria: atendimento, consulta, aluguel, alimentação, transporte, etc.' }
      },
      required: ['tipo', 'valor', 'descricao']
    }
  }
];

/* ─── System Prompt ──────────────────────────────────────────────── */
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
8. Nunca quebre o personagem. Você é a Pinah dele.

QUANDO USAR AS FERRAMENTAS:
- criar_compromisso: usuário menciona nome + data + hora → use a ferramenta E confirme no texto: "✓ Compromisso criado: Beatriz, amanhã às 15h"
- criar_tarefa: usuário quer registrar algo pra fazer sem horário → use a ferramenta E confirme: "✓ Tarefa criada: Ligar pro INPI"
- registrar_transacao: usuário menciona valor recebido ou pago → use a ferramenta E confirme: "✓ Receita registrada: R$280"
- Consultas/resumos de dados: responda diretamente usando o contexto — sem ferramenta
- Em caso de dúvida sobre tipo (compromisso vs tarefa), pergunte antes de criar
- Sempre calcule datas relativas corretamente: hoje = ${new Date().toISOString().slice(0,10)}`;

/* ─── Formatar contexto ──────────────────────────────────────────── */
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
      .map(t => `  • [${t.prioridade || 'normal'}] ${t.titulo || t.nome || '?'} (${t.area || 'geral'})${t.prazo ? ' — prazo: ' + t.prazo : ''}`)
      .join('\n');
    if (abertas) partes.push('TAREFAS EM ABERTO:\n' + abertas);
  }

  if (Array.isArray(ctx.receitas) && ctx.receitas.length > 0) {
    const recentes = ctx.receitas
      .slice(-10)
      .map(r => `  • ${r.data || ''} +R$${r.valor || 0} ${r.descricao || r.nome || ''}`)
      .join('\n');
    partes.push('RECEITAS RECENTES:\n' + recentes);
  }

  if (Array.isArray(ctx.despesas) && ctx.despesas.length > 0) {
    const recentes = ctx.despesas
      .slice(-10)
      .map(d => `  • ${d.data || ''} -R$${d.valor || 0} ${d.descricao || d.nome || ''}`)
      .join('\n');
    partes.push('DESPESAS RECENTES:\n' + recentes);
  }

  return partes.length > 0
    ? '=== DADOS ATUAIS DO LUCIANO ===\n' + partes.join('\n\n') + '\n==='
    : '';
}

/* ─── Handler principal ──────────────────────────────────────────── */
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
        tools: TOOLS,
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
    // Suporta blocos text e tool_use simultaneamente
    const reader = anthropicResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentBlock = null; // { type, name, id, inputBuffer }

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

          // Início de um bloco de conteúdo (text ou tool_use)
          if (event.type === 'content_block_start') {
            currentBlock = { ...event.content_block, inputBuffer: '' };
          }

          // Delta: texto ou input parcial de ferramenta
          if (event.type === 'content_block_delta') {
            if (event.delta?.type === 'text_delta' && currentBlock?.type === 'text') {
              res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
            }
            if (event.delta?.type === 'input_json_delta' && currentBlock?.type === 'tool_use') {
              currentBlock.inputBuffer += event.delta.partial_json || '';
            }
          }

          // Fim de bloco — emite a ferramenta completa se for tool_use
          if (event.type === 'content_block_stop') {
            if (currentBlock?.type === 'tool_use') {
              try {
                const input = JSON.parse(currentBlock.inputBuffer || '{}');
                res.write(`data: ${JSON.stringify({ tool: currentBlock.name, input })}\n\n`);
                console.log('[pinah-chat] tool_use:', currentBlock.name, JSON.stringify(input));
              } catch (parseErr) {
                console.error('[pinah-chat] Erro ao parsear tool input:', parseErr, currentBlock.inputBuffer);
              }
            }
            currentBlock = null;
          }

          // Fim da mensagem inteira
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
