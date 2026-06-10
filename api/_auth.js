// Valida o Bearer token do Supabase chamando o endpoint /auth/v1/user.
// Retorna o objeto do usuário se válido, null caso contrário.
// URL e anon key são públicos (já estão no index.html).

const SUPABASE_PROJECT_URL = 'https://wpymqverwnuinlypwouw.supabase.co';
const SUPABASE_ANON_KEY    = 'sb_publishable_VpiFsrp91kQxgF_IFlZlgQ_dMs1y5yf';

async function validarToken(req) {
  const auth = (req.headers['authorization'] || '').trim();
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;

  try {
    const r = await fetch(`${SUPABASE_PROJECT_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY
      },
      signal: AbortSignal.timeout(5000)
    });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}

module.exports = { validarToken };
