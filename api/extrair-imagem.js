// Vercel Serverless — OCR e extração de imagem via Claude Vision
// POST /api/extrair-imagem
// Body: { base64: string, mimeType: string }
// Return: { titulo, conteudo }

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6'; // Sonnet para melhor OCR em documentos

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Use POST.' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'API não configurada.' }); return; }

  let body = req.body;
  if (typeof body === 'string') try { body = JSON.parse(body); } catch(e) {}
  const { base64, mimeType } = body || {};

  if (!base64 || !mimeType) {
    res.status(400).json({ error: 'base64 e mimeType são obrigatórios.' }); return;
  }

  // Valida mimeType suportado pelo Claude
  const mimesSuportados = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const mimeNormalizado = mimeType.toLowerCase().replace('image/jpg','image/jpeg');
  if (!mimesSuportados.includes(mimeNormalizado)) {
    res.status(400).json({ error: `Formato de imagem não suportado: ${mimeType}. Use JPG, PNG ou WebP.` });
    return;
  }

  // Limita tamanho (base64 de 5MB = ~6.7M chars)
  if (base64.length > 7_000_000) {
    res.status(400).json({ error: 'Imagem muito grande. Reduza para menos de 5MB.' });
    return;
  }

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
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeNormalizado,
                data: base64
              }
            },
            {
              type: 'text',
              text: `Analise esta imagem e extraia o conteúdo de forma útil para um Biblioteca da Pinah profissional.

REGRAS:
- Se for documento, receita médica, laudo, exame, prescrição, relatório, nota fiscal: transcreva o texto completo com fidelidade
- Se for slide, quadro, diagrama: estruture o conteúdo em tópicos
- Se for foto de página de livro ou artigo: transcreva o trecho visível
- Se for foto genérica ou ilustração: descreva detalhadamente o que vê

Retorne APENAS um JSON válido:
{
  "titulo": "título descritivo (máx 100 chars)",
  "conteudo": "conteúdo transcrito/extraído em markdown (sem limite de tamanho — seja completo)"
}`
            }
          ]
        }]
      })
    });

    const claudeData = await claudeResp.json();

    if (!claudeResp.ok) {
      console.error('[extrair-imagem] Claude erro:', claudeData);
      res.status(500).json({ error: 'Erro ao processar a imagem. Tente novamente.' });
      return;
    }

    const textoResposta = claudeData?.content?.[0]?.text || '';

    // Extrai JSON
    const jsonMatch = textoResposta.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      res.json(parsed);
    } else {
      res.json({
        titulo: 'Conteúdo extraído da imagem',
        conteudo: textoResposta
      });
    }

  } catch (e) {
    console.error('[extrair-imagem] erro:', e.message);
    res.status(500).json({ error: 'Erro interno ao processar a imagem.' });
  }
};
