// Vercel Serverless Function — Conta Comigo AI Pro
// Endpoint POST /api/ask-cerebro
// Recebe: { question: string, notes: array }
// Retorna: { answer: string } ou { error: string }
//
// API key NUNCA exposta ao cliente — vem da env var ANTHROPIC_API_KEY
// configurada no painel do Vercel (Project Settings → Environment Variables).

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

// Cap de tokens para limitar custo por requisicao
const MAX_OUTPUT_TOKENS = 1024;
// Limite de notas que mandamos como contexto (evita estourar contexto se vault crescer muito)
const MAX_NOTAS_CONTEXTO = 30;

const SYSTEM_PROMPT = `Voce e a IA assistente do Conta Comigo AI Pro, conectada ao Segundo Cerebro de uma profissional autonoma de saude (fonoaudiologa).

Voce tem acesso completo as notas profissionais dela, organizadas em 5 categorias:
- Cases Clinicos (atendimentos com paciente)
- Protocolos (procedimentos padronizados)
- Artigos (resumos de leituras cientificas)
- Tecnicas (tecnicas e exercicios usados)
- Palestras (roteiros e ideias para apresentacoes)

REGRAS DE RESPOSTA:
1. Responda APENAS com base nas notas fornecidas. Nao invente, nao especule, nao traga informacao externa.
2. Se a pergunta for sobre algo nao documentado, diga claramente "Nao encontrei isso nas suas notas" e sugira que ela registre o caso/tecnica.
3. Cite explicitamente quando referenciar uma nota especifica (ex: "No Caso M.S. de 24/03..." ou "No protocolo de Avaliacao inicial...").
4. Linguagem tecnica mas acessivel, em portugues brasileiro do dia-a-dia clinico (sem jargao de pesquisa).
5. Se identificar padroes interessantes entre multiplas notas, destaque-os como insight pratico.
6. Se a pergunta for um pedido de opiniao, de uma analise critica fundamentada nos dados das notas dela.
7. Mantenha respostas em ate 4 paragrafos curtos. Use **negrito** para termos-chave. Nao use markdown complexo.
8. NUNCA quebre o personagem — voce e a IA dela, nao um chatbot generico.

Quando relevante, ao final da resposta sugira uma acao concreta (ex: "Talvez valesse criar uma nota de tecnica sobre isso" ou "Considere abrir uma palestra sobre esse tema").`;

function formatarNotas(notas) {
  if (!Array.isArray(notas) || notas.length === 0) {
    return '(nenhuma nota registrada ainda)';
  }
  // Limita a quantidade de notas mandadas como contexto para nao estourar tokens
  const notasUsadas = notas.slice(0, MAX_NOTAS_CONTEXTO);
  return notasUsadas.map(n => {
    const data = (n.data || n.dataModificacao || '').slice(0, 10);
    const cat = n.categoria || 'sem-categoria';
    const tags = Array.isArray(n.tags) && n.tags.length ? ' [' + n.tags.join(', ') + ']' : '';
    const paciente = n.paciente ? ' | Paciente: ' + n.paciente : '';
    const conteudo = String(n.conteudo || '').slice(0, 1500);
    return `═══════════════════════════════════════
[${cat.toUpperCase()}] ${n.titulo || '(sem titulo)'}${paciente}
Data: ${data}${tags}

${conteudo}`;
  }).join('\n\n');
}

module.exports = async (req, res) => {
  // CORS basico (mesmo dominio, mas seguro deixar liberado)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Metodo nao permitido. Use POST.' });
    return;
  }

  // Validacao da API key (env var)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[ask-cerebro] ANTHROPIC_API_KEY nao configurada no Vercel');
    res.status(500).json({ error: 'API nao configurada. Avise o administrador.' });
    return;
  }

  // Parse do body
  let body;
  try {
    body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
  } catch (e) {
    res.status(400).json({ error: 'Body invalido (JSON malformado).' });
    return;
  }

  const { question, notes } = body || {};

  if (!question || typeof question !== 'string' || question.trim().length < 3) {
    res.status(400).json({ error: 'Pergunta vazia ou muito curta.' });
    return;
  }

  if (question.length > 500) {
    res.status(400).json({ error: 'Pergunta muito longa. Limite de 500 caracteres.' });
    return;
  }

  // Monta o prompt do usuario com as notas como contexto
  const notasFormatadas = formatarNotas(notes);
  const userMessage = `NOTAS DO MEU SEGUNDO CEREBRO:
${notasFormatadas}

═══════════════════════════════════════

MINHA PERGUNTA:
${question.trim()}`;

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
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: userMessage }
        ]
      })
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error('[ask-cerebro] Anthropic API erro:', anthropicResponse.status, errText);
      // Nao expomos detalhes internos ao cliente
      res.status(502).json({
        error: 'Erro temporario na IA. Tente em alguns segundos.'
      });
      return;
    }

    const data = await anthropicResponse.json();
    const content = data && data.content && data.content[0] && data.content[0].text;

    if (!content) {
      res.status(502).json({ error: 'Resposta vazia da IA. Tente reformular a pergunta.' });
      return;
    }

    // Log basico para acompanhamento (Vercel logs)
    console.log('[ask-cerebro] OK', {
      tokensInput: data.usage && data.usage.input_tokens,
      tokensOutput: data.usage && data.usage.output_tokens,
      notasCount: Array.isArray(notes) ? notes.length : 0,
      perguntaLen: question.length
    });

    res.status(200).json({
      answer: content,
      usage: data.usage || null
    });
  } catch (err) {
    console.error('[ask-cerebro] Erro inesperado:', err);
    res.status(500).json({ error: 'Erro interno. Tente em alguns segundos.' });
  }
};
