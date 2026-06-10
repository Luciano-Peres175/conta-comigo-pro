// Vercel Serverless — Extração de conteúdo de URL para o Biblioteca da Pinah
// POST /api/extrair-url
// Body: { url: string }
// Return: { titulo, conteudo }

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const { validarToken } = require('./_auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Use POST.' }); return; }

  const usuario = await validarToken(req);
  if (!usuario) { res.status(401).json({ error: 'Não autorizado.' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'API não configurada.' }); return; }

  let body = req.body;
  if (typeof body === 'string') try { body = JSON.parse(body); } catch(e) {}
  const { url } = body || {};
  if (!url || !url.startsWith('http')) {
    res.status(400).json({ error: 'URL inválida.' }); return;
  }

  // 1. Busca o HTML da URL
  let textoLimpo = '';
  let paginaTitulo = '';
  try {
    const fetchResp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ContaComigo/1.0; +https://y-kappa-two-84.vercel.app)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
      },
      signal: AbortSignal.timeout(10000)
    });
    const html = await fetchResp.text();

    // Extrai título da página
    const tituloMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    paginaTitulo = tituloMatch ? tituloMatch[1].trim() : '';

    // Remove scripts, styles, nav, header, footer
    textoLimpo = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 10000);

  } catch (e) {
    console.error('[extrair-url] fetch erro:', e.message);
    res.status(400).json({ error: 'Não foi possível acessar esta URL. Verifique se ela é pública.' });
    return;
  }

  if (!textoLimpo || textoLimpo.length < 100) {
    res.status(400).json({ error: 'Conteúdo insuficiente na página. Tente copiar o texto manualmente.' });
    return;
  }

  // 2. Claude Haiku estrutura o conteúdo
  try {
    const claudeResp = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: `Você extrai conteúdo de artigos para um Biblioteca da Pinah profissional (área de saúde/negócios).

URL: ${url}
Título da página: ${paginaTitulo}

Texto extraído:
${textoLimpo}

Retorne APENAS um JSON válido (sem markdown, sem explicação):
{
  "titulo": "título descritivo e claro do artigo (máx 100 chars)",
  "conteudo": "resumo estruturado em markdown com bullet points dos pontos-chave (máx 500 palavras). Inclua **Fonte:** ${url} no início."
}`
        }]
      })
    });

    const claudeData = await claudeResp.json();
    const textoResposta = claudeData?.content?.[0]?.text || '';

    // Extrai JSON da resposta (pode vir com markdown)
    const jsonMatch = textoResposta.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      res.json(parsed);
    } else {
      res.json({
        titulo: paginaTitulo || 'Artigo importado',
        conteudo: `**Fonte:** ${url}\n\n${textoResposta}`
      });
    }

  } catch (e) {
    console.error('[extrair-url] claude erro:', e.message);
    // Fallback: retorna título + texto bruto
    res.json({
      titulo: paginaTitulo || 'Artigo importado',
      conteudo: `**Fonte:** ${url}\n\n${textoLimpo.slice(0, 2000)}`
    });
  }
};
