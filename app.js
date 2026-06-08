  /* ════════════════════════════════════════════════════════════════
     AUTENTICAÇÃO — Login / Cadastro via Supabase
     ════════════════════════════════════════════════════════════════
     Cada conta é isolada. Família (Luciano/Catia/Lê) e Amigas (Claudinha/Babi/+1).
  */

  // Sessao do usuario logado (preenchida em authCheck)
  window.authUser = null;
  window.authProfile = null;

  /* ════════════════════════════════════════════════════════════════
     MULTI-TENANT — isola dados de cada conta no localStorage
     ════════════════════════════════════════════════════════════════
     Toda chave de dados do usuário (compromissos, tarefas, receitas, etc)
     passa por oneU() que adiciona prefixo "u_<user_id>_". Antes do auth
     terminar (ou se o user deslogar), o prefixo cai pra "u_anon_" — o que
     mantém os dados isolados mas evita exposição cruzada.
  */
  function oneU(key) {
    var uid = (window.authUser && window.authUser.id) ? window.authUser.id : 'anon';
    return 'u_' + uid + '_' + key;
  }
  window.oneU = oneU;

  function authTrocarTab(tab) {
    const tabLogin  = document.getElementById('auth-tab-login');
    const tabSignup = document.getElementById('auth-tab-signup');
    const formLogin  = document.getElementById('auth-form-login');
    const formSignup = document.getElementById('auth-form-signup');
    const subtitle   = document.getElementById('auth-subtitle');
    if (tab === 'login') {
      tabLogin.style.cssText  = 'flex:1;padding:10px;background:none;border:none;border-bottom:2px solid #7FA88E;color:#7FA88E;font-weight:600;font-size:14px;cursor:pointer';
      tabSignup.style.cssText = 'flex:1;padding:10px;background:none;border:none;border-bottom:2px solid transparent;color:#888;font-weight:500;font-size:14px;cursor:pointer';
      formLogin.style.display  = '';
      formSignup.style.display = 'none';
      if (subtitle) subtitle.textContent = 'Entre na sua conta';
    } else {
      tabSignup.style.cssText = 'flex:1;padding:10px;background:none;border:none;border-bottom:2px solid #7FA88E;color:#7FA88E;font-weight:600;font-size:14px;cursor:pointer';
      tabLogin.style.cssText  = 'flex:1;padding:10px;background:none;border:none;border-bottom:2px solid transparent;color:#888;font-weight:500;font-size:14px;cursor:pointer';
      formLogin.style.display  = 'none';
      formSignup.style.display = '';
      if (subtitle) subtitle.textContent = 'Criar sua conta no Conta Comigo Pro';
    }
    authMostrarMsg('', 'limpar');
  }

  function authMarcarGrupo(grupo) {
    const fam = document.getElementById('auth-grupo-familia-label');
    const ami = document.getElementById('auth-grupo-amigas-label');
    if (grupo === 'familia') {
      fam.style.cssText = 'flex:1;padding:10px;border:2px solid #7FA88E;background:#EDE3F4;border-radius:8px;cursor:pointer;text-align:center;font-size:13px;font-weight:600;color:#7FA88E';
      ami.style.cssText = 'flex:1;padding:10px;border:2px solid #e6e0ed;border-radius:8px;cursor:pointer;text-align:center;font-size:13px;font-weight:500';
    } else {
      ami.style.cssText = 'flex:1;padding:10px;border:2px solid #7FA88E;background:#EDE3F4;border-radius:8px;cursor:pointer;text-align:center;font-size:13px;font-weight:600;color:#7FA88E';
      fam.style.cssText = 'flex:1;padding:10px;border:2px solid #e6e0ed;border-radius:8px;cursor:pointer;text-align:center;font-size:13px;font-weight:500';
    }
  }

  function authMostrarMsg(texto, tipo) {
    const el = document.getElementById('auth-msg');
    if (!el) return;
    if (tipo === 'limpar' || !texto) {
      el.style.display = 'none';
      el.textContent = '';
      return;
    }
    if (tipo === 'erro') {
      el.style.cssText = 'margin-top:14px;padding:10px;border-radius:8px;font-size:13px;display:block;background:#FCE4E4;color:#A82424;border:1px solid #F5B5B5';
    } else {
      el.style.cssText = 'margin-top:14px;padding:10px;border-radius:8px;font-size:13px;display:block;background:#E4F5E4;color:#2E7D32;border:1px solid #A5D6A7';
    }
    el.textContent = texto;
  }

  // ── Allowlist de acesso ───────────────────────────────────────────
  // Apenas estes e-mails podem criar conta. Nome e grupo são pré-definidos.
  const USUARIOS_PERMITIDOS = {
    'luciano.peres@assessoriacap.com': { nome: 'Luciano',  grupo: 'admin'   },
    'catia.peres@assessoriacap.com':   { nome: 'Cátia',    grupo: 'familia' },
    'letikurtz@gmail.com':             { nome: 'Letícia',  grupo: 'fono'    }
  };

  async function authCadastrar() {
    if (!window.supa) { authMostrarMsg('Sistema ainda carregando, aguarde 2 segundos e tente de novo.', 'erro'); return; }
    const email = document.getElementById('auth-signup-email').value.trim().toLowerCase();
    const senha = document.getElementById('auth-signup-senha').value;
    if (!email || !senha) { authMostrarMsg('Preencha e-mail e senha.', 'erro'); return; }
    if (senha.length < 6) { authMostrarMsg('A senha precisa ter pelo menos 6 caracteres.', 'erro'); return; }

    // Verifica allowlist
    const config = USUARIOS_PERMITIDOS[email];
    if (!config) {
      authMostrarMsg('Este e-mail não está autorizado. Entre em contato com Luciano para receber acesso.', 'erro');
      return;
    }

    authMostrarMsg('Criando conta...', 'sucesso');

    const { data, error } = await window.supa.auth.signUp({ email, password: senha });
    if (error) { authMostrarMsg('Erro: ' + error.message, 'erro'); return; }
    if (!data.user) { authMostrarMsg('Erro inesperado. Tente novamente.', 'erro'); return; }

    // Cria entrada em profiles com nome e grupo pré-configurados
    const { error: errProfile } = await window.supa.from('profiles').insert({
      id: data.user.id, nome: config.nome, grupo: config.grupo, onboarded: false
    });
    if (errProfile) {
      console.error('[profiles] erro:', errProfile);
      authMostrarMsg('Conta criada, mas houve um problema no perfil. Avisa o Luciano.', 'erro');
      return;
    }

    authMostrarMsg('Conta criada! Entrando...', 'sucesso');
    setTimeout(() => authCheck(), 600);
  }

  async function authEntrar() {
    if (!window.supa) { authMostrarMsg('Sistema ainda carregando, aguarde 2 segundos e tente de novo.', 'erro'); return; }
    const email = document.getElementById('auth-login-email').value.trim().toLowerCase();
    const senha = document.getElementById('auth-login-senha').value;
    if (!email || !senha) { authMostrarMsg('Preencha e-mail e senha.', 'erro'); return; }

    authMostrarMsg('Entrando...', 'sucesso');

    const { error } = await window.supa.auth.signInWithPassword({ email, password: senha });
    if (error) { authMostrarMsg('E-mail ou senha incorretos.', 'erro'); return; }

    authMostrarMsg('Bem-vindo(a)!', 'sucesso');
    setTimeout(() => authCheck(), 400);
  }

  async function authSair() {
    console.log('[authSair] início — window.supa =', !!window.supa);
    if (!confirm('Sair da sua conta?')) return;
    // Tenta signOut via API do Supabase (caminho preferido)
    try {
      if (window.supa && window.supa.auth && typeof window.supa.auth.signOut === 'function') {
        await window.supa.auth.signOut();
        console.log('[authSair] signOut OK');
      } else {
        console.warn('[authSair] window.supa indisponível, vou limpar manualmente');
      }
    } catch (e) {
      console.warn('[authSair] signOut lançou exceção, vou limpar manualmente:', e);
    }
    // Limpa as chaves de session do Supabase no localStorage (fallback robusto)
    try {
      Object.keys(localStorage).filter(function(k){ return k.indexOf('sb-') === 0; }).forEach(function(k){
        localStorage.removeItem(k);
      });
    } catch (e) {}
    window.authUser    = null;
    window.authProfile = null;
    location.reload();
  }
  // Expõe no window pra ser chamado de qualquer escopo (HTML onclick + console)
  window.authSair = authSair;

  async function authCheck() {
    // ── Modo demo local (file://) — sem Supabase ──────────────────
    if (location.protocol === 'file:') {
      window.authUser    = { id: 'demo', email: 'demo@local' };
      window.authProfile = { id: 'demo', nome: 'Letícia Kurtz', grupo: 'familia' };
      esconderTelaAuth();
      return;
    }

    // Espera o cliente Supabase estar pronto
    let tentativas = 0;
    while (!window.supa && tentativas < 30) { await new Promise(r => setTimeout(r, 100)); tentativas++; }
    if (!window.supa) {
      console.error('[auth] Supabase nao carregou');
      mostrarTelaAuth();
      return;
    }

    const { data: { session } } = await window.supa.auth.getSession();
    if (!session) { mostrarTelaAuth(); return; }

    window.authUser = session.user;

    // Busca perfil (inclui campos do onboarding: onboarded + bio_pinah)
    const { data: profile } = await window.supa
      .from('profiles')
      .select('id, nome, grupo, onboarded, bio_pinah')
      .eq('id', session.user.id)
      .single();
    window.authProfile = profile || null;

    esconderTelaAuth();
  }

  function mostrarTelaAuth() {
    const a = document.getElementById('auth-screen');
    if (a) { a.style.display = 'block'; a.style.zIndex = '10000'; }
    const app = document.getElementById('app');
    if (app) app.style.display = 'none';
    const mh = document.getElementById('mobile-header');
    if (mh) mh.style.display = 'none';
    const bn = document.getElementById('bottom-nav');
    if (bn) bn.style.display = 'none';
    /* Esconde screen-one enquanto auth está ativa */
    const so = document.getElementById('screen-one');
    if (so) so.classList.remove('active');
  }

  async function esconderTelaAuth() {
    const a = document.getElementById('auth-screen');
    if (a) a.style.display = 'none';
    const app = document.getElementById('app');
    if (app) app.style.display = '';
    const mh = document.getElementById('mobile-header');
    if (mh) mh.style.display = '';
    const bn = document.getElementById('bottom-nav');
    if (bn) bn.style.display = '';
    /* Atualiza nome no rodape da sidebar */
    if (window.authProfile && window.authProfile.nome) {
      const userBadges = document.querySelectorAll('.user-nome-display');
      userBadges.forEach(el => el.textContent = window.authProfile.nome);
    }
    /* Atualiza card da sidebar (avatar + nome + tag) conforme grupo */
    customizarCardSidebar();

    /* PRIMEIRO LOGIN: se onboarded ainda não foi marcado true no perfil,
       desvia pro onboarding (Pinah se apresenta + 4 perguntas + tour de 4 cards).
       Quando o onboarding terminar, ele mesmo dispara activateOne() + renders.
       Tolerância: se a coluna `onboarded` ainda não existir no Supabase (não criada),
       authProfile.onboarded vem undefined — nesse caso seguimos o fluxo normal. */
    if (window.authProfile && window.authProfile.onboarded === false) {
      if (typeof window.oneOnboardingStart === 'function') {
        window.oneOnboardingStart();
        return;
      }
    }

    /* Supabase sync: puxa todos os dados do usuário antes de renderizar */
    if (typeof supaSync === 'function') {
      try { await supaSync(); } catch(e) { console.warn('[esconderTelaAuth] supaSync falhou:', e); }
    }

    /* Migração 1x: sobe contas locais órfãs pro Supabase (a tabela contas
       acabou de existir no servidor). Sem isso, contas criadas antes desta
       versão ficariam só no localStorage e nunca apareceriam em outros devices. */
    if (typeof _oneFinMigrarContasParaSupa === 'function') {
      try { await _oneFinMigrarContasParaSupa(); } catch(e) { console.warn('[esconderTelaAuth] migração contas falhou:', e); }
    }

    /* Backfill 1x: sobe os vínculos (contaId/faturaMesAno/status/parcelas) e as
       fixas completas pro servidor, agora que o schema tem as colunas. */
    if (typeof _oneFinBackfillVinculosParaSupa === 'function') {
      try { await _oneFinBackfillVinculosParaSupa(); } catch(e) { console.warn('[esconderTelaAuth] backfill vínculos falhou:', e); }
    }

    /* Multi-tenant: agora que sabemos quem é o user, inicializa demo (se primeira vez)
       e re-renderiza tudo lendo das chaves prefixadas. */
    if (typeof maybeInit === 'function') maybeInit();
    if (typeof renderDataHoje === 'function') renderDataHoje();
    if (typeof renderCardFinanceiro === 'function') renderCardFinanceiro();
    if (typeof renderCardAgenda === 'function') renderCardAgenda();
    if (typeof renderLancamentos === 'function') renderLancamentos();
    if (typeof renderAgendaHome === 'function') renderAgendaHome();
    if (typeof renderAgendaSemanal === 'function') renderAgendaSemanal();
    if (typeof renderCerebro === 'function') renderCerebro();
    /* Re-ativa screen-one com dados do usuário logado (semeia demo, renderiza tudo) */
    if (typeof window.activateOne === 'function') window.activateOne();
    if (typeof renderOneAgendaPainel  === 'function') renderOneAgendaPainel();
    if (typeof renderOneTarefasPainel === 'function') renderOneTarefasPainel();
    if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
    /* Pós-login → screen-one é o home */
    if (typeof go === 'function') go('one');
  }

  function customizarCardSidebar() {
    const avatar = document.getElementById('sidebar-avatar');
    const nomeEl = document.getElementById('sidebar-nome');
    const tagEl  = document.getElementById('sidebar-tag');
    if (!avatar || !nomeEl || !tagEl || !window.authProfile) return;

    const grupo = window.authProfile.grupo;
    const nome  = window.authProfile.nome || '';

    let iniciais, nomeCompleto, tag;
    if (grupo === 'familia') {
      // Familia: card fixo Leticia Kurtz / Fonoaudiologa (e o Luciano/Catia/Le sabem que e o app dela)
      iniciais = 'LK';
      nomeCompleto = 'Letícia Kurtz';
      tag = 'Fonoaudióloga';
    } else {
      // Amigas: nome da pessoa + tag "Beta Próxima"
      iniciais = nome.split(' ').filter(Boolean).slice(0,2).map(s => s[0]).join('').toUpperCase() || '??';
      nomeCompleto = nome || 'Beta';
      tag = 'Beta Próxima';
    }
    avatar.textContent = iniciais;
    nomeEl.textContent = nomeCompleto;
    tagEl.textContent  = tag;

    // Card de identidade na sidebar esquerda (tela base): avatar + nome + profissão
    const contaAvatar = document.getElementById('one-desk-conta-avatar');
    const contaNome   = document.getElementById('one-desk-conta-nome');
    const contaTag    = document.getElementById('one-desk-conta-tag');
    if (contaAvatar) contaAvatar.textContent = iniciais;
    if (contaNome)   contaNome.textContent   = nomeCompleto;
    if (contaTag)    contaTag.textContent    = tag;

    // Badge das iniciais sobre o avatar central da Pinah no topbar mobile (tela base)
    const mobBadge = document.getElementById('one-mob-pinah-badge');
    if (mobBadge) mobBadge.textContent = iniciais;

    // Esconde funcoes de demo da Le pra quem nao e Familia
    aplicarVisibilidadePorGrupo(grupo);
  }

  function aplicarVisibilidadePorGrupo(grupo) {
    const ehFamilia = (grupo === 'familia');
    const ehAdmin   = (grupo === 'admin');
    // Botoes que carregam dados-demo da Le — so Familia ve
    ['btn-carregar-demo', 'btn-resetar-com-demo', 'btn-resetar-demo'].forEach(function(id) {
      const el = document.getElementById(id);
      if (el) el.style.display = ehFamilia ? '' : 'none';
    });
    // Botao de zerar financeiro — so admin ve
    const btnZerar = document.getElementById('btn-zerar-financeiro');
    if (btnZerar) btnZerar.style.display = ehAdmin ? '' : 'none';
  }

  // Bloqueio de seguranca: mesmo que alguem chame as funcoes pelo console, nao executa pra Amigas
  function souFamilia() {
    return window.authProfile && window.authProfile.grupo === 'familia';
  }

  // Dispara verificacao de auth ao carregar a pagina
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(authCheck, 200);
  });

  /* ── Reconhecimento de voz (Web Speech API) ────────────────────
   * Helper reutilizavel. Funciona em Safari (Mac/iPhone) e Chrome.
   * Estados callback: 'listening' | 'processing' | 'result' | 'error' | 'unsupported'
   * Uso:
   *   iniciarReconhecimentoVoz({
   *     onStateChange: (estado) => { ... },
   *     onResult: (textoFinal) => { ... },
   *     onError: (motivo) => { ... }
   *   });
   *   // retorna controle: { stop: function }
   */
  function iniciarReconhecimentoVoz(opts) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      if (opts.onStateChange) opts.onStateChange('unsupported');
      if (opts.onError) opts.onError('Seu navegador nao suporta reconhecimento de voz. Use Safari ou Chrome.');
      return { stop: () => {} };
    }

    const recognition = new SR();
    recognition.lang = 'pt-BR';
    recognition.continuous = (opts.continuous === true); // true = grava até o user parar manualmente
    recognition.interimResults = true;  // resultados parciais durante a fala
    recognition.maxAlternatives = 1;

    let textoFinal = '';
    let cancelado = false;

    recognition.onstart = () => {
      if (opts.onStateChange) opts.onStateChange('listening');
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t + ' ';
        else interim += t;
      }
      if (final) textoFinal += final;
      // Mostra resultado parcial enquanto fala
      if (opts.onPartial) opts.onPartial((textoFinal + interim).trim());
    };

    recognition.onerror = (event) => {
      if (cancelado) return;
      let mensagem = 'Erro ao reconhecer audio.';
      if (event.error === 'no-speech') mensagem = 'Nao ouvi nada. Tenta de novo falando mais perto do microfone.';
      else if (event.error === 'audio-capture') mensagem = 'Microfone nao disponivel. Verifique as permissoes.';
      else if (event.error === 'not-allowed') mensagem = 'Permissao de microfone negada. Habilite nas configuracoes do navegador.';
      else if (event.error === 'network') mensagem = 'Sem conexao para processar o audio.';
      if (opts.onError) opts.onError(mensagem);
      if (opts.onStateChange) opts.onStateChange('error');
    };

    recognition.onend = () => {
      if (cancelado) return;
      if (opts.onStateChange) opts.onStateChange('processing');
      const texto = textoFinal.trim();
      // Sempre chama onResult — mesmo vazio; o caller usa o campo como fallback
      if (opts.onResult) opts.onResult(texto);
      if (opts.onStateChange) opts.onStateChange('result');
    };

    try {
      recognition.start();
    } catch (e) {
      if (opts.onError) opts.onError('Nao foi possivel iniciar o microfone: ' + e.message);
      if (opts.onStateChange) opts.onStateChange('error');
    }

    return {
      // stop() → para e envia (não seta cancelado)
      stop: () => {
        try { recognition.stop(); } catch (e) {}
      },
      // cancel() → para e descarta (seta cancelado)
      cancel: () => {
        cancelado = true;
        try { recognition.stop(); } catch (e) {}
      }
    };
  }
  // Expõe pro escopo global (usada por oneVoz que vive fora do IIFE)
  window.iniciarReconhecimentoVoz = iniciarReconhecimentoVoz;

  // Expõe toast para uso fora do IIFE (pinahEnviar global precisa mostrar confirmações)
  window.toast = toast;

  // Expõe funções de re-render para os executores da Pinah (pinahCriar* vive fora do IIFE)
  // Usadas após a Pinah escrever no localStorage para atualizar painéis imediatamente
  window._pinahRerender = {
    agenda:    function() {
      if (typeof renderCardAgenda     === 'function') renderCardAgenda();
      if (typeof renderOneAgendaPainel === 'function') renderOneAgendaPainel();
      if (typeof renderAgendaHome     === 'function') renderAgendaHome();
      /* Mobile: a Pinah Agente opera dentro do carrossel mobile, então
         o re-render precisa atingir as telas mobile também (senão a ação
         salva mas a tela não muda). */
      if (typeof renderOneAgenda         === 'function') renderOneAgenda();
      if (typeof renderOneAgendaPainelMob === 'function') renderOneAgendaPainelMob();
    },
    tarefas:   function() {
      if (typeof renderOneTarefasPainel === 'function') renderOneTarefasPainel();
      if (typeof renderOneDeskTarefas   === 'function') renderOneDeskTarefas();
      if (typeof renderOneTarefasMobile === 'function') renderOneTarefasMobile();
    },
    financeiro: function() {
      if (typeof renderCardFinanceiro    === 'function') renderCardFinanceiro();
      if (typeof renderLancamentos       === 'function') renderLancamentos();
      if (typeof renderListaReceitas     === 'function') renderListaReceitas();
      if (typeof renderDespesas          === 'function') renderDespesas();
      if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
      if (typeof renderOneFinanceiro       === 'function') renderOneFinanceiro();
    }
  };

  /* ── Lucide — render icones (idempotente, com retry se lib ainda nao carregou) ── */
  function renderIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      try { window.lucide.createIcons(); } catch (e) { console.warn('[Lucide] erro:', e); }
    } else if (!window.__lucideRetryScheduled) {
      // Lib ainda nao carregou — agendar retries em 100ms, 300ms, 800ms, 2s
      window.__lucideRetryScheduled = true;
      [100, 300, 800, 2000].forEach(delay => {
        setTimeout(() => {
          if (window.lucide && typeof window.lucide.createIcons === 'function') {
            try { window.lucide.createIcons(); } catch (e) {}
          }
        }, delay);
      });
    }
  }

  /* ── Utilitários ────────────────────────────────────────────── */

  /**
   * Toast com suporte a acao (botao Desfazer).
   * - msg: texto a mostrar
   * - tipo: 'success' | 'error' | undefined
   * - opcoes: { actionText, onAction, duration } (opcional)
   *   Se actionText for definido, exibe um botao clicavel.
   *   onAction e chamado se o usuario clicar antes do timeout.
   */
  function toast(msg, tipo, opcoes) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast' + (tipo ? ' ' + tipo : '');

    const duration = (opcoes && opcoes.duration) || 3100;

    if (opcoes && opcoes.actionText && typeof opcoes.onAction === 'function') {
      // Toast com acao: usa innerHTML para inserir botao
      el.innerHTML = '<span class="toast-msg"></span>' +
        '<button class="toast-action" type="button">' + opcoes.actionText + '</button>';
      el.querySelector('.toast-msg').textContent = msg;
      const btn = el.querySelector('.toast-action');
      let consumed = false;
      btn.addEventListener('click', function() {
        if (consumed) return;
        consumed = true;
        try { opcoes.onAction(); } catch (e) { console.warn('[toast] onAction err:', e); }
        el.remove();
      });
    } else {
      el.textContent = msg;
    }

    container.appendChild(el);
    // Fade-out programatico antes de remover
    setTimeout(() => { if (el.parentNode) el.classList.add('fade-out'); }, Math.max(0, duration - 220));
    setTimeout(() => { if (el.parentNode) el.remove(); }, duration);
  }

  function parseValor(v) {
    if (typeof v === 'number') return v;
    const s = String(v).trim().replace(/\s/g, '');
    if (!s) return 0;
    const commas = (s.match(/,/g) || []).length;
    const dots   = (s.match(/\./g) || []).length;
    let normalized;
    if (commas === 0 && dots === 0) {
      // "300" → 300, "1500" → 1500
      normalized = s;
    } else if (commas >= 1 && dots >= 1) {
      // "3.830,40" → comma é decimal, ponto é milhar
      normalized = s.replace(/\./g, '').replace(',', '.');
    } else if (commas === 1 && dots === 0) {
      // "3830,40" ou "1500,00" → vírgula é decimal
      normalized = s.replace(',', '.');
    } else if (dots === 1 && commas === 0) {
      // "3830.40" (decimal) ou "1.500" (milhar)
      const afterDot = s.split('.')[1] || '';
      normalized = afterDot.length === 3 ? s.replace('.', '') : s;
    } else {
      // múltiplos pontos: "1.000.000" → milhar
      normalized = s.replace(/\./g, '').replace(',', '.');
    }
    return parseFloat(normalized) || 0;
  }

  function updateMobileSaveBar(tela) {
    const bar = document.getElementById('mobile-save-bar');
    const btn = document.getElementById('mobile-save-btn');
    if (!bar || !btn) return;
    if (tela === 'receitas') {
      btn.textContent = 'Salvar Receita';
      btn.className   = 'btn-primary';
      btn.onclick     = salvarReceita;
      bar.classList.add('visivel');
    } else if (tela === 'despesas') {
      btn.textContent = 'Salvar Despesa';
      btn.className   = 'btn-primary';
      btn.onclick     = salvarDespesa;
      bar.classList.add('visivel');
    } else {
      bar.classList.remove('visivel');
    }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  }
  function hojeISO() {
    return toDateStr(new Date());
  }
  /* Resumo do card Financeiro (sidebar direita do desktop) — saldo do mês (receitas pagas - despesas pagas),
     despesas pendentes do mês e receitas pendentes do mês. Adicionado em 22/05/2026. */
  function renderResumoFinanceiroCard() {
    try {
      var elS = document.getElementById('one-desk-fin-saldo');
      var elD = document.getElementById('one-desk-fin-despesas');
      var elR = document.getElementById('one-desk-fin-receitas');
      if (!elS && !elD && !elR) return;
      var receitas = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]');
      var despesas = JSON.parse(localStorage.getItem(oneU('despesas')) || '[]');
      var now = new Date();
      var ano = now.getFullYear();
      var mes = now.getMonth();
      function noMes(item) {
        if (!item || !item.data) return false;
        var p = String(item.data).split('-');
        if (p.length !== 3) return false;
        return parseInt(p[0]) === ano && (parseInt(p[1]) - 1) === mes;
      }
      function soma(arr) {
        return arr.reduce(function(s, x){ return s + (Number(x.valor) || 0); }, 0);
      }
      var recPagas = receitas.filter(function(r){ return noMes(r) && r.status === 'Pago'; });
      var despPagas = despesas.filter(function(d){ return noMes(d) && d.status === 'Pago'; });
      var saldo = soma(recPagas) - soma(despPagas);
      var despPend = despesas.filter(function(d){ return noMes(d) && d.status === 'Pendente'; });
      var recPend = receitas.filter(function(r){ return noMes(r) && r.status === 'Pendente'; });
      var totalDespPend = soma(despPend);
      var totalRecPend = soma(recPend);
      if (elS) {
        elS.textContent = (typeof brl === 'function') ? brl(saldo) : ('R$ ' + saldo.toFixed(2).replace('.', ','));
        elS.classList.toggle('negativo', saldo < 0);
      }
      if (elD) elD.textContent = (typeof brl === 'function') ? brl(totalDespPend) : ('R$ ' + totalDespPend.toFixed(2).replace('.', ','));
      if (elR) elR.textContent = (typeof brl === 'function') ? brl(totalRecPend) : ('R$ ' + totalRecPend.toFixed(2).replace('.', ','));
    } catch(e) {
      console.error('renderResumoFinanceiroCard erro:', e);
    }
  }
  window.renderResumoFinanceiroCard = renderResumoFinanceiroCard;

  /* Resumo do card Tarefas (sidebar direita do desktop) — conta tarefas abertas
     por prioridade (alta/normal/baixa) e atualiza os 3 spans. Adicionado em 22/05/2026. */
  function renderResumoTarefasCard() {
    try {
      var elA = document.getElementById('one-desk-tarefas-alta');
      var elN = document.getElementById('one-desk-tarefas-normal');
      var elB = document.getElementById('one-desk-tarefas-baixa');
      if (!elA && !elN && !elB) return;
      var tarefas = JSON.parse(localStorage.getItem(oneU('tarefas')) || '[]');
      var cA = 0, cN = 0, cB = 0;
      tarefas.forEach(function(t) {
        if (!t) return;
        // Considera "aberta" se não tem flag concluida e o status não é 'concluida' (compatibilidade entre dois schemas)
        if (t.concluida === true) return;
        var status = String(t.status || '').toLowerCase();
        if (status === 'concluida' || status === 'concluído') return;
        var p = String(t.prioridade || 'normal').toLowerCase();
        if (p === 'alta') cA++;
        else if (p === 'baixa') cB++;
        else cN++; // normal (default)
      });
      if (elA) elA.textContent = cA;
      if (elN) elN.textContent = cN;
      if (elB) elB.textContent = cB;
    } catch(e) {
      console.error('renderResumoTarefasCard erro:', e);
    }
  }
  window.renderResumoTarefasCard = renderResumoTarefasCard;

  /* Resumo do card Agenda (sidebar direita do desktop) — conta compromissos
     de hoje e dos próximos 7 dias e atualiza os 2 spans. Adicionado em 22/05/2026. */
  function renderResumoAgendaCard() {
    try {
      var elH = document.getElementById('one-desk-agenda-hoje');
      var elS = document.getElementById('one-desk-agenda-semana');
      if (!elH && !elS) return; // card nem está no DOM, pula
      var compromissos = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]');
      var hoje = new Date(); hoje.setHours(0,0,0,0);
      var fim = new Date(hoje); fim.setDate(hoje.getDate() + 6); fim.setHours(23,59,59,999);
      var hojeMs = hoje.getTime();
      var fimMs = fim.getTime();
      var cH = 0, cS = 0;
      compromissos.forEach(function(c) {
        if (!c || !c.data) return;
        var p = String(c.data).split('-');
        if (p.length !== 3) return;
        var d = new Date(parseInt(p[0]), parseInt(p[1])-1, parseInt(p[2]));
        d.setHours(0,0,0,0);
        var ms = d.getTime();
        if (ms === hojeMs) cH++;
        if (ms >= hojeMs && ms <= fimMs) cS++;
      });
      if (elH) elH.textContent = cH;
      if (elS) elS.textContent = cS;
    } catch(e) {
      console.error('renderResumoAgendaCard erro:', e);
    }
  }
  window.renderResumoAgendaCard = renderResumoAgendaCard;

  function atualizarHome() {
    renderCardFinanceiro();
    renderCardAgenda();
    renderLancamentos();
    renderAgendaHome();
    renderResumoAgendaCard();
    renderResumoTarefasCard();
    renderResumoFinanceiroCard();
    renderIcons();
  }

  /* ── Inicialização de dados ─────────────────────────────────── */
  // FIXAS_DEFAULT zerado em 17/05/2026: app entra em fase de uso real,
  // novos users começam sem lançamentos demo.
  const FIXAS_DEFAULT = [];

  /* Migração one-shot: copia dados legados (sem prefixo) pra chave do user atual.
     Roda só uma vez por user (flag migrated_legacy_v1). Remove a chave legada
     pra não migrar pra outro user que logue depois no mesmo navegador. */
  function migrarDadosLegado() {
    if (!window.authUser || !window.authUser.id) return;
    if (localStorage.getItem(oneU('migrated_legacy_v1'))) return;
    var chaves = ['compromissos','tarefas','tarefas_areas','receitas','despesas','despesasFixas','receitasFixas','categorias_receita','categorias_despesa','notas_cerebro','usuario','ccp_imposto_pct','ccp_forma_pagamento','ccp_ia_uso','ccp_initialized','one_init','contas'];
    var migrou = 0;
    chaves.forEach(function(k){
      var legado = localStorage.getItem(k);
      if (legado && !localStorage.getItem(oneU(k))) {
        localStorage.setItem(oneU(k), legado);
        localStorage.removeItem(k);
        migrou++;
      }
    });
    localStorage.setItem(oneU('migrated_legacy_v1'), '1');
    if (migrou > 0) console.log('[multi-tenant] migrou ' + migrou + ' chaves legadas pra user ' + window.authUser.id);
  }

  // Extrai áreas únicas de uma lista de tarefas — usado no seed inicial
  // pra que a lista de áreas case com as tarefas demo desde a abertura 1.
  function _areasDeTarefas(lista) {
    var out = [];
    (lista || []).forEach(function(t){
      if (t && t.area && out.indexOf(t.area) === -1) out.push(t.area);
    });
    return out;
  }

  function maybeInit() {
    // Multi-tenant: só inicializa demo quando o user real estiver logado
    // (evita criar dados na chave "u_anon_*" enquanto o auth não termina)
    if (!window.authUser || !window.authUser.id) return;
    // Migra dados antigos (sem prefixo) ANTES de seedar demo
    migrarDadosLegado();
    const primeiraVez = !localStorage.getItem(oneU('ccp_initialized'));
    if (primeiraVez) {
      // Seed por grupo — cada perfil recebe dados adequados ao seu contexto.
      const grupo = (window.authProfile && window.authProfile.grupo) || 'admin';

      // Seed financeiro zerado em 17/05/2026: app entra em fase de uso real,
      // lançamentos demo removidos pra que cada user cadastre os reais dele.
      // Compromissos, notas e tarefas demo mantidas porque ajudam a entender
      // o app na primeira abertura.
      if (grupo === 'admin') {
        // Luciano — fonoaudiologia (compromissos e notas demo)
        localStorage.setItem(oneU('receitas'),      JSON.stringify([]));
        localStorage.setItem(oneU('despesas'),      JSON.stringify([]));
        localStorage.setItem(oneU('compromissos'),  JSON.stringify(getCompromissosDemo()));
        localStorage.setItem(oneU('notas_cerebro'), JSON.stringify(getNotasDemo()));
        localStorage.setItem(oneU('tarefas'),       JSON.stringify([]));

      } else if (grupo === 'familia') {
        // Cátia — Conta Comigo Pinah: agenda + tarefas + notas reais do pet
        localStorage.setItem(oneU('receitas'),      JSON.stringify([]));
        localStorage.setItem(oneU('despesas'),      JSON.stringify([]));
        localStorage.setItem(oneU('compromissos'),  JSON.stringify(getCompromissosPinah()));
        var tarefasFam = getTarefasPinah();
        localStorage.setItem(oneU('tarefas'),       JSON.stringify(tarefasFam));
        // Áreas únicas das tarefas demo — sem isso o seed não renderiza.
        localStorage.setItem(oneU('tarefas_areas'), JSON.stringify(_areasDeTarefas(tarefasFam)));
        localStorage.setItem(oneU('notas_cerebro'), JSON.stringify(getNotasPinah()));

      } else if (grupo === 'fono') {
        // Letícia — fonoaudióloga: agenda + tarefas + 9 artigos reais do vault
        localStorage.setItem(oneU('receitas'),      JSON.stringify([]));
        localStorage.setItem(oneU('despesas'),      JSON.stringify([]));
        localStorage.setItem(oneU('compromissos'),  JSON.stringify(getCompromissosFono()));
        var tarefasFono = getTarefasFono();
        localStorage.setItem(oneU('tarefas'),       JSON.stringify(tarefasFono));
        localStorage.setItem(oneU('tarefas_areas'), JSON.stringify(_areasDeTarefas(tarefasFono)));
        localStorage.setItem(oneU('notas_cerebro'), JSON.stringify(getNotasFono()));

      } else {
        // Grupo desconhecido — zero
        localStorage.setItem(oneU('receitas'),      JSON.stringify([]));
        localStorage.setItem(oneU('despesas'),      JSON.stringify([]));
        localStorage.setItem(oneU('compromissos'),  JSON.stringify([]));
        localStorage.setItem(oneU('notas_cerebro'), JSON.stringify([]));
        localStorage.setItem(oneU('tarefas'),       JSON.stringify([]));
      }
      localStorage.setItem(oneU('despesasFixas'), JSON.stringify(FIXAS_DEFAULT));
      localStorage.setItem(oneU('ccp_initialized'), '1');
    }
    // Garante array de notas mesmo em app inicializado antes de existir
    if (!localStorage.getItem(oneU('notas_cerebro'))) {
      localStorage.setItem(oneU('notas_cerebro'), JSON.stringify([]));
    }
    // Antes existia um "garante fixas" que re-semeava FIXAS_DEFAULT toda vez que
    // a lista de fixas ficasse vazia. Foi removido em 17/05/2026: o usuário precisa
    // poder zerar fixas de propósito (uso real) sem o app re-popular demo sozinho.
  }

  /* ── Navegação ──────────────────────────────────────────────── */
  const TELAS = ['home', 'agenda', 'receitas', 'despesas', 'historico', 'cerebro', 'pinah','one'];

  function go(tela) {
    closeDrawer();

    TELAS.forEach(t => {
      document.getElementById('screen-' + t)?.classList.toggle('active', t === tela);
    });

    TELAS.forEach(t => {
      document.getElementById('nav-' + t)?.classList.toggle('active', t === tela);
    });

    ['home', 'agenda', 'receitas', 'despesas'].forEach(t => {
      document.getElementById('bn-' + t)?.classList.toggle('active', t === tela);
    });

    history.replaceState(null, '', '#' + tela);

    updateMobileSaveBar(tela);

    if (tela === 'receitas')  renderListaReceitas();
    if (tela === 'despesas')  { renderDespesasFixas(); renderListaDespesas(); }
    if (tela === 'agenda')    renderAgendaSemanal();
    if (tela === 'historico') { populaSelectMes(); renderHistorico(); }
    if (tela === 'cerebro')   renderCerebro();
    renderIcons();
  }

  /* ── Drawer mobile ──────────────────────────────────────────── */
  function toggleDrawer() {
    const isOpen = document.getElementById('sidebar').classList.contains('drawer-open');
    isOpen ? closeDrawer() : openDrawer();
  }
  window.toggleDrawer = toggleDrawer;

  function openDrawer() {
    document.getElementById('sidebar').classList.add('drawer-open');
    document.getElementById('drawer-overlay').classList.add('open');
    var h = document.getElementById('hamburger');
    if (h) h.classList.add('open');
  }
  window.openDrawer = openDrawer;

  function closeDrawer() {
    document.getElementById('sidebar').classList.remove('drawer-open');
    document.getElementById('drawer-overlay').classList.remove('open');
    var h = document.getElementById('hamburger');
    if (h) h.classList.remove('open');
  }
  window.closeDrawer = closeDrawer;

  /* ── Data de hoje ───────────────────────────────────────────── */
  function renderDataHoje() {
    const el = document.getElementById('data-hoje');
    if (!el) return;
    el.textContent = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  /* ── Helpers ────────────────────────────────────────────────── */
  function brl(v) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  /* ── Biblioteca da Pinah — categorias e estado ──────────────────── */
  const CEREBRO_CATEGORIAS = [
    { id: 'casos',      nome: 'Cases Clínicos', icone: 'clipboard-list', cor: '#7FA88E' },
    { id: 'protocolos', nome: 'Protocolos',     icone: 'pin',            cor: '#7B9BC8' },
    { id: 'artigos',    nome: 'Artigos',        icone: 'newspaper',      cor: '#7EC8B8' },
    { id: 'tecnicas',   nome: 'Técnicas',       icone: 'lightbulb',      cor: '#E8C4A0' },
    { id: 'palestras',  nome: 'Palestras',      icone: 'mic',            cor: '#E8B4D4' }
  ];
  let cerebroFiltroCategoria = null; // null = todas
  let cerebroFiltroBusca = '';

  function getNotas() {
    return JSON.parse(localStorage.getItem(oneU('notas_cerebro')) || '[]');
  }
  function setNotas(arr) {
    localStorage.setItem(oneU('notas_cerebro'), JSON.stringify(arr));
  }
  function getCategoria(id) {
    return CEREBRO_CATEGORIAS.find(c => c.id === id) || CEREBRO_CATEGORIAS[0];
  }

  /**
   * 10 notas demo curadas — Fonoaudiologia (amamentação, frênulo, desenvolvimento).
   * Pacientes anonimizados (iniciais fictícias). Conteúdo em PT-BR no estilo profissional.
   * IDs prefixados 'demo-' para permitir identificação.
   */
  function getNotasDemo() {
    // Datas espalhadas entre fev/2026 e abr/2026 para parecer histórico real
    const d = (offset) => new Date(Date.now() - offset * 24 * 60 * 60 * 1000).toISOString();
    return [
      // ── 3 CASES CLÍNICOS ──
      {
        id: 'demo-caso-ms',
        titulo: 'Caso M.S. — 6 meses, dificuldade de pega após uso de bico',
        categoria: 'casos',
        paciente: 'M.S. (6 meses)',
        tags: ['amamentacao', 'pega-incorreta', 'bico-artificial'],
        conteudo: 'Bebê de 6 meses encaminhado pela pediatra. Mãe relata uso intensivo de bico desde a 3ª semana. Queixa: bebê morde o mamilo, mãe com fissuras recorrentes.\n\nAvaliação: postura de língua plana adequada, mas movimentação mandibular alterada. Boca pouco aberta na pega. Sucção curta e ineficiente.\n\nConduta: 4 sessões de reorganização do padrão de sucção. Suspensão progressiva do bico. Orientação à mãe sobre posicionamento (rugby para mama esquerda).\n\nResultado: 3ª sessão já mostrou pega ampla. Mãe sem dor na 4ª. Caso fechado em 1 mês. Sucesso.',
        data: d(35), dataModificacao: d(35)
      },
      {
        id: 'demo-caso-lb',
        titulo: 'Caso L.B. — 4 meses, fissura palatina pós-cirurgia',
        categoria: 'casos',
        paciente: 'L.B. (4 meses)',
        tags: ['fissura-palatina', 'pos-cirurgico', 'transicao-alimentar'],
        conteudo: 'Bebê com fissura palatina unilateral, pós-correção cirúrgica há 2 semanas. Mãe ansiosa, alimentação via copinho desde o nascimento.\n\nAvaliação inicial: tonicidade orofacial reduzida. Reflexo de sucção presente mas desorganizado. Selamento oral parcial.\n\nProtocolo: estimulação intra-oral progressiva, exercícios de vedamento labial, transição gradual copinho → seio com placa palatina removível.\n\nEvolução em 8 semanas: amamentação parcial estabelecida (40% das mamadas). Família satisfeita. Continua acompanhamento mensal.',
        data: d(21), dataModificacao: d(21)
      },
      {
        id: 'demo-caso-ak',
        titulo: 'Caso A.K. — 8 meses, recusa de transição para sólidos',
        categoria: 'casos',
        paciente: 'A.K. (8 meses)',
        tags: ['transicao-alimentar', 'introducao-alimentar', 'recusa'],
        conteudo: 'Bebê de 8 meses com recusa total de pastoso e sólido. Aceita apenas leite materno. Pediatra preocupada com peso.\n\nHistórico: introdução alimentar tardia (iniciada aos 7 meses). Família tentou várias texturas sem sucesso. Bebê chora ao ver colher.\n\nAvaliação: hiper-reatividade oral. Reflexo de gag muito anteriorizado. Aversão a texturas.\n\nConduta: 6 sessões de dessensibilização oral, brincadeiras com texturas (sem alimento), depois introdução gradual com colher de silicone macio.\n\nResultado: aceita 4 colheres de fruta na 4ª sessão. Mãe filmou primeiro pastoso aceito — momento de muita emoção. Continua progredindo.',
        data: d(10), dataModificacao: d(10)
      },

      // ── 2 PROTOCOLOS ──
      {
        id: 'demo-prot-amamentacao',
        titulo: 'Protocolo: Avaliação inicial de amamentação',
        categoria: 'protocolos',
        paciente: '',
        tags: ['protocolo', 'avaliacao', 'primeira-consulta'],
        conteudo: 'Roteiro padrão para primeira consulta de amamentação (aproximadamente 60 min):\n\n1. ANAMNESE (15 min)\n- Tipo de parto, peso ao nascer, idade gestacional\n- Tempo de amamentação atual, queixas da mãe\n- Uso de bicos, mamadeiras, complementação\n- Dor ao amamentar (de 0 a 10)\n- Histórico clínico do bebê e da mãe\n\n2. AVALIAÇÃO ANATÔMICA (10 min)\n- Frênulo lingual e labial (Protocolo Bristol)\n- Conformação de palato e mamilo\n- Tônus muscular orofacial\n\n3. OBSERVAÇÃO DA MAMADA (20 min)\n- Posicionamento da díade (UNICEF)\n- Pega: boca aberta, lábios evertidos, queixo na mama\n- Sucção: ritmo, profundidade, deglutição audível\n- Sinais de fadiga, esforço de bochecha\n\n4. DEVOLUTIVA (15 min)\n- Achados clínicos\n- Conduta proposta\n- Quantidade de sessões estimada\n- Materiais educativos\n\n5. ENTREGA: relatório por WhatsApp em 24h.',
        data: d(56), dataModificacao: d(56)
      },
      {
        id: 'demo-prot-frenotomia',
        titulo: 'Protocolo: Orientação pré e pós-frenotomia',
        categoria: 'protocolos',
        paciente: '',
        tags: ['frenotomia', 'protocolo', 'pre-cirurgico', 'pos-cirurgico'],
        conteudo: 'Aplicado em conjunto com a dentista pediátrica do consultório.\n\nPRÉ-CIRÚRGICO (consulta única, 30 min)\n- Confirmação da indicação (Protocolo Bristol modificado)\n- Foto/vídeo da pega antes\n- Orientação à mãe sobre o procedimento (cirurgia leve, anestesia tópica)\n- Expectativas realistas: pega pode melhorar em horas, mas em alguns casos leva semanas\n\nPÓS-CIRÚRGICO IMEDIATO (mesmo dia, 15 min após o procedimento)\n- Mamada supervisionada logo após (a Lê entra na sala)\n- Posicionamento facilitado (rugby ou cavaleiro)\n- Ajuste fino de pega — bebê em geral retorna ao seio em 3-5 minutos\n\nACOMPANHAMENTO\n- Sessão D+3: avaliar cicatrização e ajustar pega\n- Sessão D+10: confirmar evolução, observar se há reaprendizado\n- Exercícios de mobilidade lingual diária pela mãe (3x/dia)\n\nIndicadores de sucesso: pega ampla, mãe sem dor em 7 dias, ganho de peso adequado em 2 semanas.',
        data: d(48), dataModificacao: d(48)
      },

      // ── 2 ARTIGOS (resumos curados dos artigos do vault) ──
      {
        id: 'demo-art-snn',
        titulo: 'Sucção não-nutritiva e desempenho na mamada (Medeiros et al., 2019)',
        categoria: 'artigos',
        paciente: '',
        tags: ['artigo', 'snn', 'mamada', 'pesquisa'],
        conteudo: 'Estudo descritivo com 50 díades mãe-RN, comparando avaliação de sucção não-nutritiva (SNN) com desempenho na mamada.\n\nPRINCIPAIS ACHADOS:\n- Movimentação mandibular alterada na SNN se correlaciona com:\n  · "boca do bebê pouco aberta" (p=0,005)\n  · "esforço de bochecha durante mamada" (p<0,001)\n  · "bebê com pescoço/tronco torcidos" (p=0,041)\n  · "mama apoiada com dedos na aréola" (p=0,041)\n\nCONCLUSÃO: Avaliar SNN antes da mamada pode predizer dificuldades. Útil como triagem rápida na primeira consulta.\n\nAPLICAÇÃO NO CONSULTÓRIO: incluir avaliação de SNN no protocolo inicial. Bebês com mandíbula alterada precisam de mais tempo de orientação postural.\n\nFonte: Rev. Bras. Saúde Mater. Infant., Recife, 19(3), 2019. doi: 10.1590/1806-93042019000300008',
        data: d(70), dataModificacao: d(70)
      },
      {
        id: 'demo-art-frenulo',
        titulo: 'Frênulo lingual e aleitamento — estudo descritivo (SciELO)',
        categoria: 'artigos',
        paciente: '',
        tags: ['artigo', 'frenulo', 'aleitamento', 'pesquisa'],
        conteudo: 'Estudo descritivo sobre alterações do frênulo lingual e impacto no aleitamento materno exclusivo.\n\nPRINCIPAIS PONTOS:\n- Anquiloglossia presente em ~5% dos RNs avaliados\n- Frênulo curto/anterior aumenta significativamente o risco de:\n  · Pega superficial e dor mamária persistente\n  · Ganho de peso insuficiente nas primeiras semanas\n  · Desmame precoce (antes de 3 meses)\n- Protocolo Bristol é instrumento confiável para triagem clínica\n- Frenotomia precoce (até 3 semanas) tem melhores resultados\n\nIMPLICAÇÕES PRÁTICAS:\n- Avaliar frênulo em TODA primeira consulta de amamentação\n- Trabalho em conjunto com dentista pediátrica é diferencial\n- Orientação pós-cirúrgica imediata é tão importante quanto a cirurgia\n\nFonte: Audiology - Communication Research / SciELO, 2021',
        data: d(63), dataModificacao: d(63)
      },

      // ── 2 TÉCNICAS ──
      {
        id: 'demo-tec-posicionamento',
        titulo: 'Técnica: Posicionamento para pega correta — passo a passo',
        categoria: 'tecnicas',
        paciente: '',
        tags: ['tecnica', 'posicionamento', 'pega', 'orientacao-mae'],
        conteudo: 'Passo a passo que ensino para toda mãe na primeira consulta:\n\n1. MÃE confortável: costas apoiadas, ombros relaxados. Almofada no colo se sentada.\n\n2. BEBÊ alinhado: orelha-ombro-quadril em linha reta. Não pode ter torção do tronco.\n\n3. BARRIGA com BARRIGA: corpo do bebê totalmente voltado para o da mãe.\n\n4. NARIZ na altura do MAMILO: se mais alto, bebê levanta cabeça. Se mais baixo, perde a pega.\n\n5. ESPERAR boca BEM aberta antes de aproximar (estimular com mamilo no lábio inferior).\n\n6. APROXIMAR rápido: queixo toca primeiro, mamilo aponta para o céu da boca.\n\n7. CONFIRMAR pega:\n   - Queixo encostado na mama\n   - Lábio inferior virado para fora\n   - Aréola mais visível por cima\n   - Sucção lenta e profunda, com pausas\n   - Sem dor para a mãe\n\nDICA FINAL: se doer, retirar com cuidado (dedo na comissura) e reiniciar. Não é dor "de costume" — é sinal de pega errada.',
        data: d(28), dataModificacao: d(28)
      },
      {
        id: 'demo-tec-estimulacao',
        titulo: 'Técnica: Estimulação oral em RN com Apgar baixo',
        categoria: 'tecnicas',
        paciente: '',
        tags: ['tecnica', 'recem-nascido', 'apgar', 'uti-neonatal'],
        conteudo: 'Sequência usada em UTI Neonatal e em consultas precoces (até 1ª semana de vida).\n\nINDICAÇÃO: RN com prontidão oral reduzida, prematuros tardios, Apgar 5min < 7.\n\nMATERIAL: dedo enluvado (látex hipoalergênico), seringa pequena (se necessário oferecer leite materno ordenhado).\n\nSEQUÊNCIA (5-7 minutos por sessão, 3x/dia):\n\n1. ESTÍMULO PERIORAL (1 min)\n   - Toque suave na bochecha, lábios, queixo\n   - Observa busca direcionada\n\n2. ESTÍMULO LABIAL (1 min)\n   - Pressão alternada superior/inferior\n   - Estimula reflexo de busca\n\n3. ESTÍMULO INTRA-ORAL (2-3 min)\n   - Dedo enluvado, palma para baixo\n   - Pressão suave no palato duro\n   - Observa canolamento de língua e ondulação\n\n4. SUCÇÃO NÃO-NUTRITIVA (2 min)\n   - Bebê suga o dedo\n   - Avaliar ritmo, pausas, força\n   - Cronometrar 1 minuto e contar bursts\n\n5. TRANSIÇÃO PARA MAMA (quando RN organizado)\n   - Após 30 segundos de SNN organizada, transferir para mama\n   - Mãe presente, posicionamento rugby\n\nCRITÉRIOS DE ALTA: 5 dias consecutivos com pega ampla, ganho de peso > 20g/dia, sem suplementação.',
        data: d(42), dataModificacao: d(42)
      },

      // ── 1 PALESTRA ──
      {
        id: 'demo-pal-50-cases',
        titulo: 'Roteiro de palestra: O que aprendi em 50 atendimentos de amamentação',
        categoria: 'palestras',
        paciente: '',
        tags: ['palestra', 'roteiro', 'experiencia-clinica'],
        conteudo: 'Roteiro para palestra de 30 minutos em conselho regional. Audiência: fonoaudiólogas iniciantes + pediatras parceiras.\n\nESTRUTURA:\n\n1. ABERTURA (3 min)\n   - Quem sou eu, formação, área de atuação\n   - "50 atendimentos depois, o que mudou na minha cabeça"\n\n2. TOP 3 CAUSAS DE DOR NA MAMA — não é o que eu pensava (8 min)\n   - Pega errada: 60% dos casos (esperado)\n   - Frênulo + posicionamento errado: 25% (era subestimado)\n   - Mama ingurgitada por horários rígidos: 15% (subestimado também)\n   - Cases ilustrativos\n\n3. O QUE NINGUÉM ENSINOU NA FACULDADE (10 min)\n   - Mãe vem mais ansiosa que o bebê — atender a mãe primeiro\n   - 80% dos casos resolve em 2-3 sessões\n   - Trabalhar com dentista pediátrica vira diferencial\n   - WhatsApp pós-consulta sustenta o aprendizado\n   - Vídeo da mãe filmando a próxima mamada vale mais que 1h de orientação\n\n4. O QUE EU MUDARIA SE COMEÇASSE HOJE (5 min)\n   - Investir em consultoria à beira do leito\n   - Construir rede com pediatras (não com mães)\n   - Documentar TODOS os casos (Biblioteca da Pinah)\n\n5. PERGUNTAS (4 min)\n\nDADOS A INCLUIR: estatísticas dos meus 50 cases, gráficos simples, fotos com autorização.',
        data: d(7), dataModificacao: d(7)
      }
    ];
  }

  /**
   * Demos de RECEITAS — coerentes com os cases das notas (M.S., L.B., A.K.).
   * Datas espalhadas no MES corrente do dispositivo.
   */
  function getReceitasDemo() {
    const now = new Date();
    const ano = now.getFullYear();
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const d = (dia) => ano + '-' + mes + '-' + String(dia).padStart(2, '0');
    return [
      { id: 'demo-rec-1', data: d(3),  nome: 'Maria S. (M.S.)',  tipo: 'Atendimento', valor: 280, formaPagamento: 'Pix',      status: 'Pago',     categoria: 'Atendimento' },
      { id: 'demo-rec-2', data: d(5),  nome: 'Leonardo B. (L.B.)', tipo: 'Avaliação',   valor: 350, formaPagamento: 'Pix',      status: 'Pago',     categoria: 'Avaliação' },
      { id: 'demo-rec-3', data: d(8),  nome: 'Maria S. (M.S.)',  tipo: 'Atendimento', valor: 280, formaPagamento: 'Pix',      status: 'Pago',     categoria: 'Atendimento' },
      { id: 'demo-rec-4', data: d(10), nome: 'Ana K. (A.K.)',    tipo: 'Atendimento', valor: 280, formaPagamento: 'Cartão de débito', status: 'Pago', categoria: 'Atendimento' },
      { id: 'demo-rec-5', data: d(12), nome: 'Leonardo B. (L.B.)', tipo: 'Atendimento', valor: 280, formaPagamento: 'Pix',     status: 'Pago',     categoria: 'Atendimento' },
      { id: 'demo-rec-6', data: d(15), nome: 'Maria S. (M.S.)',  tipo: 'Atendimento', valor: 280, formaPagamento: 'Pix',      status: 'Pago',     categoria: 'Atendimento' },
      { id: 'demo-rec-7', data: d(17), nome: 'Beatriz N.',         tipo: 'Avaliação',   valor: 350, formaPagamento: 'Pix',      status: 'Pago',     categoria: 'Avaliação' },
      { id: 'demo-rec-8', data: d(20), nome: 'Ana K. (A.K.)',    tipo: 'Atendimento', valor: 280, formaPagamento: 'Pix',      status: 'Pago',     categoria: 'Atendimento' },
      { id: 'demo-rec-9', data: d(22), nome: 'Beatriz N.',         tipo: 'Atendimento', valor: 280, formaPagamento: 'Pix',      status: 'Pendente', categoria: 'Atendimento' },
      { id: 'demo-rec-10',data: d(25), nome: 'Maria S. (M.S.)',  tipo: 'Atendimento', valor: 280, formaPagamento: 'Pix',      status: 'Pago',     categoria: 'Atendimento' }
    ];
  }

  /**
   * Demos de DESPESAS variáveis (não fixas — fixas já têm DEFAULT).
   * Datas no mês corrente.
   */
  function getDespesasDemo() {
    const now = new Date();
    const ano = now.getFullYear();
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const d = (dia) => ano + '-' + mes + '-' + String(dia).padStart(2, '0');
    return [
      { id: 'demo-desp-1', data: d(7),  descricao: 'Curso de aleitamento materno', categoria: 'Capacitação',      valor: 450, status: 'Pago' },
      { id: 'demo-desp-2', data: d(14), descricao: 'Livro técnico — Disfagia',     categoria: 'Material Estudo',  valor: 180, status: 'Pago' },
      { id: 'demo-desp-3', data: d(21), descricao: 'Manutenção do equipamento',    categoria: 'Equipamentos',     valor: 220, status: 'Pago' }
    ];
  }

  /**
   * Demos de COMPROMISSOS — alguns no passado (realizados) e outros futuros.
   * Coerentes com os cases das notas.
   */
  function getCompromissosDemo() {
    const now = new Date();
    const ano = now.getFullYear();
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const d = (dia) => ano + '-' + mes + '-' + String(dia).padStart(2, '0');
    const hoje = now.getDate();
    return [
      // Já realizados (passados, com receita lançada)
      { id: 'demo-comp-1', data: d(Math.max(1, hoje - 4)), hora: '09:00', nome: 'Maria S. (M.S.)', tipo: 'Atendimento', valor: 280, status: 'Confirmado', realizado: true, duracao: 45 },
      { id: 'demo-comp-2', data: d(Math.max(1, hoje - 2)), hora: '14:00', nome: 'Ana K. (A.K.)',   tipo: 'Atendimento', valor: 280, status: 'Confirmado', realizado: true, duracao: 45 },
      // Hoje (não realizados ainda)
      { id: 'demo-comp-3', data: d(hoje), hora: '10:00', nome: 'Leonardo B. (L.B.)', tipo: 'Atendimento', valor: 280, status: 'Pendente', duracao: 45 },
      { id: 'demo-comp-4', data: d(hoje), hora: '15:30', nome: 'Beatriz N.',         tipo: 'Atendimento', valor: 280, status: 'Pendente', duracao: 45 },
      // Próximos dias
      { id: 'demo-comp-5', data: d(Math.min(28, hoje + 1)), hora: '09:00', nome: 'Maria S. (M.S.)', tipo: 'Atendimento', valor: 280, status: 'Pendente', duracao: 45 },
      { id: 'demo-comp-6', data: d(Math.min(28, hoje + 3)), hora: '11:00', nome: 'Reunião com pediatra parceira', tipo: 'Compromisso Profissional', valor: 0, status: 'Pendente', duracao: 60 }
    ];
  }

  /* ─── Seed data: Cátia — Conta Comigo Pinah ────────────────────────
     Dados reais da Pinah Tereza (pet), extraídos do vault Obsidian.
     Cátia é a tutora que acompanha consultas veterinárias.
  ─────────────────────────────────────────────────────────────────── */

  function getCompromissosPinah() {
    const hoje = new Date();
    const ano  = hoje.getFullYear();
    const add  = (dias) => {
      const d = new Date(hoje); d.setDate(hoje.getDate() + dias);
      return d.toISOString().slice(0,10);
    };
    return [
      // Retorno Dra. Keylla — 25 dias após 30/04/2026
      { id: 'pinah-comp-1', data: '2026-05-25', hora: '10:00', nome: 'Retorno Dra. Keylla — feridas perivulvares (Pinah)', tipo: 'consulta', valor: 280, status: 'Confirmado', duracao: 40 },
      // Cytopoint próximo — ciclo 6 semanas (última: 30/09/2025)
      { id: 'pinah-comp-2', data: '2026-06-09', hora: '09:00', nome: 'Cytopoint 30mg — Dra. Keylla (Pet Home 24h)', tipo: 'consulta', valor: 700, status: 'Confirmado', duracao: 30 },
      // ITAE vacina mensal
      { id: 'pinah-comp-3', data: add(17), hora: '09:30', nome: 'ITAE — vacina manutenção mensal (Pinah)', tipo: 'consulta', valor: 0, status: 'Pendente', duracao: 20 },
      // Creche — próxima sexta (banho)
      { id: 'pinah-comp-4', data: add((5 - hoje.getDay() + 7) % 7 || 7), hora: '08:00', nome: 'Creche Confraria dos Bichos — dia inteiro + banho (sexta)', tipo: 'pessoal', valor: 0, status: 'Confirmado', duracao: 480 },
    ];
  }

  function getDespesasPinah() {
    return [
      { id: 'pinah-desp-1', data: '2026-04-30', descricao: 'Consulta Dra. Keylla — feridas perivulvares',       categoria: 'Veterinário',   valor: 280,     status: 'Pago' },
      { id: 'pinah-desp-2', data: '2026-04-30', descricao: 'Lenços clorexidina 3% manipulados (40 unidades)',    categoria: 'Medicamentos',  valor: 65,      status: 'Pago' },
      { id: 'pinah-desp-3', data: '2026-04-28', descricao: 'Cytopoint 30mg — aplicação',                         categoria: 'Veterinário',   valor: 700,     status: 'Pago' },
      { id: 'pinah-desp-4', data: '2026-04-28', descricao: 'ITAE vacina manutenção — abril',                     categoria: 'Veterinário',   valor: 180,     status: 'Pago' },
      { id: 'pinah-desp-5', data: '2025-03-23', descricao: 'Coleira Seresto antipulgas (Amazon)',                 categoria: 'Preventivos',   valor: 159,     status: 'Pago' },
      { id: 'pinah-desp-6', data: '2024-01-25', descricao: 'ITAE TECSA — imunoterapia anual (kit completo)',     categoria: 'Veterinário',   valor: 2017.02, status: 'Pago' },
    ];
  }

  function getTarefasPinah() {
    return [
      { id: 'pinah-tar-1', titulo: 'Lenços clorexidina 3% — 12/12h por 14 dias (até ~14/05)', area: 'Saúde Pinah', prioridade: 'alta',   prazo: '2026-05-14', status: 'aberta' },
      { id: 'pinah-tar-2', titulo: 'Pomada Advantan — 2x/semana após os primeiros 7 dias',    area: 'Saúde Pinah', prioridade: 'normal', prazo: '',           status: 'aberta' },
      { id: 'pinah-tar-3', titulo: 'Banho Oat care — semanal (Pinah)',                         area: 'Saúde Pinah', prioridade: 'normal', prazo: '',           status: 'aberta' },
      { id: 'pinah-tar-4', titulo: 'Limpeza otológica da Pinah — 1-2x/semana',                area: 'Saúde Pinah', prioridade: 'normal', prazo: '',           status: 'aberta' },
      { id: 'pinah-tar-5', titulo: 'Cortavance spray — 1-2x/sem periabial e patas',           area: 'Saúde Pinah', prioridade: 'normal', prazo: '',           status: 'aberta' },
      { id: 'pinah-tar-6', titulo: 'Repor Hidrapet Ômega e Aliv Pet 150mg',                   area: 'Saúde Pinah', prioridade: 'alta',   prazo: '2026-05-20', status: 'aberta' },
    ];
  }

  /* Notas do Biblioteca da Pinah da Pinah — histórico veterinário real */
  function getNotasPinah() {
    const d = (s) => new Date(s).toISOString();
    return [
      {
        id: 'pinah-nota-perfil',
        titulo: 'Pinah Tereza — Perfil Completo',
        categoria: 'casos',
        tags: ['pinah','perfil','dados-gerais'],
        conteudo: '**Pinah Tereza** (também: Pinah Ventura nas clínicas)\n- Nascida: 24/05/2020 — adotada no Morro Santa Tereza, POA\n- 5 anos, SRD, fêmea, preta, 11,85 kg (set/2025)\n- Tutores: Letícia (mãe), Luciano (vô Terezo), Cátia (vó Tereza)\n\n**Diagnósticos ativos:**\n- Dermatite atópica (desde ~2023)\n- Alergia a ácaros: *D. farinae* e *D. pteronyssinus*\n- Alergia alimentar: frango e suíno — dieta natural caseira\n- Ansiedade (Fluoxetina diária)\n\n**Cirurgia:** Patela direita (luxação medial) — pós-op estável (RX jun/2025)\n\n**Creche:** Confraria dos Bichos — 3x/semana; sexta = dia inteiro + banho',
        data: d('2026-04-30'), dataModificacao: d('2026-04-30')
      },
      {
        id: 'pinah-nota-tratamentos',
        titulo: 'Tratamentos em Curso — Pinah',
        categoria: 'protocolos',
        tags: ['pinah','tratamento','cytopoint','itae','fluoxetina'],
        conteudo: '**ITAE — Imunoterapia alérgeno-específica**\n- Vacina depot subcutânea, manutenção mensal\n- Lote atual (desde jun/2025): *D. farinae* 50% + *D. pteronyssinus* 50%\n- Fornecedor: TECSA Laboratórios\n\n**Cytopoint 30mg** (anti-IL31)\n- Frequência: a cada 6 semanas\n- Última aplicação: 28/04/2026 → próxima ~09/06/2026\n\n**Fluoxetina** — ansiolítico diário (dose a confirmar)\n\n**Dieta natural caseira** (Dra. Camila Monteiro / Nutri.In)\n- 493 kcal/dia — base: carne bovina + fígado bovino\n- Sem frango, sem suíno\n- Ingredientes: abobrinha, arroz parboilizado, batata doce, azeite, chuchu, vagem, Food Dog Basic, manjericão, psyllium',
        data: d('2026-04-30'), dataModificacao: d('2026-04-30')
      },
      {
        id: 'pinah-nota-keylla-abr26',
        titulo: 'Consulta Dra. Keylla — Feridas Perivulvares (30/04/2026)',
        categoria: 'casos',
        tags: ['pinah','dermato','vulva','dobras','keylla'],
        conteudo: '**Achados:** Lesões crostosas ao redor da vulva. Hipótese: problema de DOBRAS (não relacionado à dermatite atópica). Áreas ressequidas no abdômen. Citologia coletada.\n\n**Conduta — tópico perivulvar:**\n- Lenços clorexidina 3% manipulados — 12/12h por 14 dias (até ~14/05)\n- Pomada Advantan/mometasona 1mg/g — 24/24h por 7 dias → depois 2x/sem\n- Hidratante tópico (Oat care / Hidrapet / Phisoderme) — 1-2x/sem\n\n**Manter:**\n- Cytopoint 45/45 dias\n- Cortavance 1-2x/sem periabial e patas\n- Banho Oat care semanal\n- Limpeza otológica 1-2x/sem\n\n**Retorno:** 25 dias após → ~25/05/2026\nAcompanhantes: Cátia + Luciano',
        data: d('2026-04-30'), dataModificacao: d('2026-04-30')
      },
      {
        id: 'pinah-nota-dermato-historico',
        titulo: 'Histórico Dermato — Dra. Letícia Baretta (2023–2025)',
        categoria: 'casos',
        tags: ['pinah','dermato','historico','baretta'],
        conteudo: '**Dra. Letícia Baretta** — CRMV RS 12839 — Pet Home 24h, Chácara das Pedras\n\n**Set/2023:** 1ª consulta — Malassezia +++, dieta exclusão Royal Canin, Cytopoint 30mg\n**Out/2023:** Nódulo MPE (histiocitoma) → CAAF → Axys Análises\n**Nov/2023:** Surto bacteriano abdômen → cultura → *Staphylococcus intermedius*\n  - Sensível: Ciprofloxacina, Doxiciclina, Enrofloxacina...\n  - Resistente: Gentamicina, Trimetoprim-Sulfa\n**Dez/2023:** Teste alérgico sorológico → ácaros confirmados\n**Jan/2024:** Início ITAE (D. farinae + D. pteronyssinus + Tyrophagus)\n**Fev/2024:** Dieta natural caseira — Dra. Camila Monteiro\n**Set/2025:** Citologia dorso/dobra caudal: cocos + → Cytopoint + Aliv Pet + sprays\n**Out/2025:** Piora pontual → Prednisolona 5mg curto (5 dias)\n\n*Dra. Letícia em licença maternidade → substituída pela Dra. Keylla*',
        data: d('2026-04-30'), dataModificacao: d('2026-04-30')
      },
      {
        id: 'pinah-nota-profissionais',
        titulo: 'Profissionais e Clínicas da Pinah',
        categoria: 'protocolos',
        tags: ['pinah','profissionais','contatos','veterinarios'],
        conteudo: '**Dra. Keylla** — Dermatologia Veterinária (substitui Dra. Letícia em licença)\n\n**Dra. Letícia Baretta** — CRMV RS 12839\n- (51) 99329-7253 / 99659-3769 | leticiabarettavet@gmail.com\n- Pet Home 24h, Rua Araponga 437, Chácara das Pedras\n\n**Dra. Camila Monteiro** — Nutrição Veterinária / Nutri.In — CRMV RS 13503\n- (51) 99361-1232 | vetnutricamilamonteiro@gmail.com\n\n**Confraria dos Bichos** — Creche 3x/sem | sexta = banho + dia inteiro\n\n**TECSA Laboratórios** — CNPJ 01.648.667/0003-20 (fornecedor ITAE)\n\nCadastro clínicas: Catia Elaine Costa Ventura (CPF 503.445.790-34)',
        data: d('2026-04-30'), dataModificacao: d('2026-04-30')
      },
    ];
  }

  /* ─── Seed data: Letícia — fonoaudióloga autônoma ───────────────────
     Pacientes identificados por iniciais (privacidade).
  ─────────────────────────────────────────────────────────────────── */

  /* Notas do Biblioteca da Pinah da Letícia — artigos reais do vault Obsidian */
  function getNotasFono() {
    const d = (s) => new Date(s).toISOString();
    return [
      // ── AMAMENTAÇÃO ──
      {
        id: 'fono-art-amam-1',
        titulo: 'A amamentação sob a perspectiva do fonoaudiólogo',
        categoria: 'artigos',
        tags: ['amamentacao','sucção','desenvolvimento-oral','ofa'],
        conteudo: '**Fonte:** Instituto PENSI / Equipe Fonoaudiologia Hospital Infantil Sabará\n**Link:** https://institutopensi.org.br/amamentacao-fonoaudiologia\n\n**Pontos-chave:**\n- Amamentação promove padrão correto de respiração nasal e postura de língua\n- Sucção no peito desenvolve mobilidade, tônus, força e postura dos órgãos fonoarticulatórios (OFA)\n- Benefícios se estendem à mastigação, deglutição e articulação dos sons da fala\n- Crianças amamentadas têm menor incidência de hábitos de sucção não-nutritivos\n- Desmame precoce pode romper o desenvolvimento motor-oral adequado\n- OMS/MS/SBP recomendam: amamentação exclusiva até 6 meses, complementada até 2 anos ou mais\n\n**Aplicação clínica:** Observação cuidadosa da mamada é o primeiro passo — fono deve orientar técnica, posicionamento e pega nas primeiras horas pós-nascimento.',
        data: d('2026-04-26'), dataModificacao: d('2026-04-26')
      },
      {
        id: 'fono-art-amam-2',
        titulo: 'Sucção não-nutritiva em RN a termo e desempenho da mamada',
        categoria: 'artigos',
        tags: ['amamentacao','sucção-não-nutritiva','rn','mandibula'],
        conteudo: '**Fonte:** Medeiros AMC et al. — Rev. Bras. Saúde Mater. Infant. (2019)\n**DOI:** dx.doi.org/10.1590/1806-93042019000300008\n\n**Objetivo:** Investigar o padrão de sucção de RN a termo na SNN e sua relação com o desempenho na mamada.\n\n**Metodologia:** 50 díades mãe/RN — instrumentos: avaliação SNN + Protocolo UNICEF de observação da mamada.\n\n**Resultados principais:**\n- Alterações na movimentação de mandíbula na SNN associadas a: boca pouco aberta (p=0,005), esforço de bochecha (p<0,001), mama apoiada com dedos na aréola (p=0,041)\n- Postura e movimentação de língua: sem diferenças significativas\n- Todas as 50 díades apresentaram pelo menos uma dificuldade durante a mamada\n\n**Conclusão:** SNN é estratégia útil para predizer dificuldades na mamada. Mandíbula inadequada impacta pega, sucção e posicionamento.\n\n**Aplicação clínica:** Avaliar SNN nas primeiras horas pós-parto. Focar na movimentação mandibular como marcador de risco para dificuldades de amamentação.',
        data: d('2026-04-26'), dataModificacao: d('2026-04-26')
      },
      {
        id: 'fono-art-amam-3',
        titulo: 'Frênulo lingual e aleitamento materno — SciELO',
        categoria: 'artigos',
        tags: ['amamentacao','frenulo','aleitamento','rn'],
        conteudo: '**Fonte:** SciELO — Audiol Commun Res\n**Link:** https://www.scielo.br/j/acr/a/YtZ9Fjn7YvzVDspLtm34JSh/?lang=pt\n\n**Foco:** Relação entre frênulo lingual e desempenho do aleitamento materno em recém-nascidos.\n\n**Pontos-chave:**\n- Leite materno é o alimento mais adequado para todo RN\n- Frênulo lingual restrito interfere na mobilidade da língua durante a sucção\n- Impacto direto na pega, formação do vedamento e extração eficiente do leite\n- Diagnóstico precoce do frênulo é fundamental para o sucesso do aleitamento\n- Fono é o profissional habilitado para avaliar e intervir — "teste da linguinha" (triagem neonatal)\n\n**Aplicação clínica:** Incluir avaliação do frênulo na triagem neonatal fonoaudiológica. Intervenção precoce preserva o aleitamento materno.',
        data: d('2026-04-26'), dataModificacao: d('2026-04-26')
      },
      // ── FRÊNULO ──
      {
        id: 'fono-art-fren-1',
        titulo: 'Frênulo lingual e aleitamento materno: estudo descritivo',
        categoria: 'artigos',
        tags: ['frenulo','aleitamento','rn','anquiloglossia'],
        conteudo: '**Fonte:** SciELO — Audiol Commun Res\n**Link:** https://www.scielo.br/j/acr/a/YtZ9Fjn7YvzVDspLtm34JSh/?lang=pt\n\n**Anquiloglossia (língua presa):**\n- Frênulo lingual curto/fixo limita movimentos da língua necessários para sucção eficaz\n- Sintomas na mãe: dor mamilar, fissuras, mastite — levam ao desmame precoce\n- Sintomas no bebê: pega inadequada, ganho de peso lento, fadiga durante mamadas\n\n**Diagnóstico:** Ferramentas como BTAT (Bristol Tongue Assessment Tool) e protocolo MBGR\n\n**Tratamento:** Frenotomia — procedimento simples, realizado pelo fono ou médico habilitado com laser ou tesoura\n\n**Aplicação clínica:** Não esperar a criança crescer para intervir. Resultado do aleitamento materno é o principal indicador de necessidade cirúrgica no período neonatal.',
        data: d('2026-04-26'), dataModificacao: d('2026-04-26')
      },
      {
        id: 'fono-art-fren-2',
        titulo: 'Protocolo de avaliação do frênulo da língua em bebês — USP',
        categoria: 'protocolos',
        tags: ['frenulo','protocolo','avaliacao','bebe','usp'],
        conteudo: '**Fonte:** Repositório USP\n**Link:** https://repositorio.usp.br/item/002407561\n\n**Protocolo de avaliação padronizado para frênulo lingual em bebês:**\n- Avaliação anatômica: comprimento, ponto de inserção na gengiva e língua, elasticidade\n- Avaliação funcional: elevação de língua, lateralização, protrusão, canolamento\n- Observação da mamada: pega, vedamento, sucção, extração de leite\n- Critérios de encaminhamento para frenotomia\n\n**Etapas do protocolo:**\n1. Histórico clínico e queixas da mãe\n2. Inspeção intraoral\n3. Avaliação da SNN\n4. Observação direta da mamada\n5. Decisão clínica compartilhada\n\n**Importância:** Uniformiza a avaliação, reduz subjetividade e melhora rastreamento precoce.',
        data: d('2026-04-26'), dataModificacao: d('2026-04-26')
      },
      {
        id: 'fono-art-fren-3',
        titulo: 'Alterações no frênulo lingual e impactos no aleitamento materno — UFC',
        categoria: 'artigos',
        tags: ['frenulo','aleitamento','impacto','anquiloglossia'],
        conteudo: '**Fonte:** Repositório UFC\n**Link:** https://repositorio.ufc.br/handle/riufc/79153\n\n**Impactos da anquiloglossia no aleitamento materno:**\n- Dificuldade de pega e manutenção no seio\n- Dor mamilar persistente — principal causa de desmame precoce\n- Sucção ineficaz → estimulação insuficiente → redução da produção de leite\n- Consequências para o bebê: ganho ponderal lento, refluxo, gases\n\n**Aspectos clínicos:**\n- Nem todo frênulo visível é restritivo — avaliação funcional é mandatória\n- Frenotomia tem evidência de melhora imediata na mamada\n- Importância da atuação fonoaudiológica pré e pós-procedimento\n\n**Aplicação clínica:** Documentar queixas maternas detalhadamente. Frenotomia sem acompanhamento fono pré/pós tem menor taxa de sucesso.',
        data: d('2026-04-26'), dataModificacao: d('2026-04-26')
      },
      // ── DESENVOLVIMENTO DA FALA ──
      {
        id: 'fono-art-dev-1',
        titulo: 'Desenvolvimento da fala: marcos e quando intervir',
        categoria: 'artigos',
        tags: ['desenvolvimento','fala','marcos','tea','linguagem'],
        conteudo: '**Fonte:** Genial Care\n**Link:** https://genialcare.com.br/blog/desenvolvimento-da-fala/\n\n**Marcos do desenvolvimento da fala:**\n- 0-3 meses: choro diferenciado, reação a sons, vocalizações\n- 4-6 meses: balbucios, lalação, reação ao nome\n- 7-12 meses: sílabas (ma-ma, pa-pa), gestos, primeiras palavras\n- 12-18 meses: 5-20 palavras, compreende comandos simples\n- 18-24 meses: 50+ palavras, começa combinar 2 palavras\n- 2-3 anos: frases de 2-3 palavras, vocabulário em expansão rápida\n- 3-4 anos: frases completas, conversação, 75% inteligível para estranhos\n\n**Sinais de alerta — quando encaminhar:**\n- Sem sorriso social aos 3 meses\n- Sem balbucios aos 6 meses\n- Sem palavras aos 12 meses\n- Sem combinação de 2 palavras aos 24 meses\n- Perda de habilidades já adquiridas (regressão)',
        data: d('2026-04-26'), dataModificacao: d('2026-04-26')
      },
      {
        id: 'fono-art-dev-2',
        titulo: 'Primeiras palavras: quando a criança começa a falar?',
        categoria: 'artigos',
        tags: ['desenvolvimento','primeiras-palavras','estimulacao','linguagem'],
        conteudo: '**Fonte:** Einstein / Vida Saudável\n**Link:** https://www.einstein.br/n/vida-saudavel/primeiras-palavras-quando-a-crianca-comeca-a-falar-como-e-possivel-estimular\n\n**Desenvolvimento esperado:**\n- 2-3 meses: primeiros sons e vogais\n- 6 meses: balbucios com consoantes (ba, da, ga)\n- 8-10 meses: imitação de sons do ambiente\n- 12 meses: primeiras palavras com significado\n- 18 meses: até 50 palavras; vocabulário explosivo se inicia\n\n**Como estimular em casa:**\n- Conversar com o bebê desde o nascimento — tom caloroso, pausas para "resposta"\n- Nomear objetos e ações durante rotina diária\n- Ler livros com imagens desde os primeiros meses\n- Reduzir telas — não substituem interação humana\n- Música e cantigas de roda\n\n**Papel da família:** Estímulo nos primeiros 3 anos é determinante — período crítico de desenvolvimento neural da linguagem.',
        data: d('2026-04-26'), dataModificacao: d('2026-04-26')
      },
      {
        id: 'fono-art-dev-3',
        titulo: 'Estimulando as primeiras palavras do bebê',
        categoria: 'artigos',
        tags: ['desenvolvimento','estimulacao','primeiras-palavras','pronuncia'],
        conteudo: '**Fonte:** Pampers\n**Link:** https://www.pampers.com.br/crianca-pequena/desenvolvimento/artigo/pronuncia-ajudando-a-falar-corretamente\n\n**Estratégias de estimulação da fala:**\n- "Motherese" (linguagem materna): tom mais agudo, fala mais lenta, exagerada — bebê presta mais atenção\n- Expansão: criança diz "água" → adulto responde "você quer água? Está com sede?"\n- Modelagem sem correção direta: não corrija, remodele naturalmente\n- Esperar a vez: criar pausas naturais na conversa\n- Brincadeiras de imitação e jogos de turnos\n\n**Pronúncia normal vs. preocupante:**\n- Trocas de sons até 5-6 anos podem ser normais dependendo do som\n- Rotacismo (troca do R) e sigmatismo (troca do S) são comuns — avaliar após os 5 anos\n- Gagueira fluente aos 2-3 anos é normal — gagueira persistente após 4 anos requer avaliação\n\n**Quando procurar fono:** Não entender 50% da fala da criança após 2 anos, ou 75% após 3 anos.',
        data: d('2026-04-26'), dataModificacao: d('2026-04-26')
      },
    ];
  }

  function getCompromissosFono() {
    const hoje = new Date();
    const add  = (dias) => {
      const d = new Date(hoje); d.setDate(hoje.getDate() + dias);
      return d.toISOString().slice(0,10);
    };
    const h = hoje.getDate();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2,'0');
    const dm = (dia) => ano + '-' + mes + '-' + String(dia).padStart(2,'0');
    return [
      { id: 'fono-comp-1',  data: add(0),  hora: '08:00', nome: 'A.L. — Atendimento',         tipo: 'atendimento',  valor: 180, status: 'Confirmado', duracao: 45 },
      { id: 'fono-comp-2',  data: add(0),  hora: '09:00', nome: 'P.C. — Atendimento',         tipo: 'atendimento',  valor: 180, status: 'Confirmado', duracao: 45 },
      { id: 'fono-comp-3',  data: add(1),  hora: '08:30', nome: 'B.A. — Avaliação',           tipo: 'avaliação',    valor: 220, status: 'Confirmado', duracao: 60 },
      { id: 'fono-comp-4',  data: add(1),  hora: '14:00', nome: 'L.F. — Atendimento',         tipo: 'atendimento',  valor: 180, status: 'Confirmado', duracao: 45 },
      { id: 'fono-comp-5',  data: add(2),  hora: '09:00', nome: 'G.S. — Atendimento',         tipo: 'atendimento',  valor: 180, status: 'Pendente',   duracao: 45 },
      { id: 'fono-comp-6',  data: add(2),  hora: '10:00', nome: 'M.C. — Retorno (gratuito)',  tipo: 'retorno',      valor: 0,   status: 'Pendente',   duracao: 30 },
      { id: 'fono-comp-7',  data: add(6),  hora: '09:30', nome: 'I.S. — Atendimento',         tipo: 'atendimento',  valor: 180, status: 'Pendente',   duracao: 45 },
      { id: 'fono-comp-8',  data: add(7),  hora: '10:00', nome: 'T.O. — Atendimento',         tipo: 'atendimento',  valor: 180, status: 'Pendente',   duracao: 45 },
      { id: 'fono-comp-9',  data: add(8),  hora: '08:00', nome: 'A.L. — Atendimento',         tipo: 'atendimento',  valor: 180, status: 'Pendente',   duracao: 45 },
      { id: 'fono-comp-10', data: add(9),  hora: '14:00', nome: 'R.M. — Avaliação',           tipo: 'avaliação',    valor: 220, status: 'Pendente',   duracao: 60 },
      { id: 'fono-comp-11', data: add(13), hora: '09:00', nome: 'P.C. — Atendimento',         tipo: 'atendimento',  valor: 180, status: 'Pendente',   duracao: 45 },
      { id: 'fono-comp-12', data: add(14), hora: '10:00', nome: 'B.A. — Retorno',             tipo: 'retorno',      valor: 180, status: 'Pendente',   duracao: 30 },
    ];
  }

  function getReceitasFono() {
    const hoje = new Date();
    const ano  = hoje.getFullYear();
    const mes  = String(hoje.getMonth() + 1).padStart(2,'0');
    const d    = (dia) => ano + '-' + mes + '-' + String(dia).padStart(2,'0');
    return [
      { id: 'fono-rec-1',  data: d(2),  nome: 'G.S. — Atendimento',  tipo: 'Atendimento', valor: 180, formaPagamento: 'Pix', status: 'Pago', categoria: 'Atendimento' },
      { id: 'fono-rec-2',  data: d(2),  nome: 'I.S. — Atendimento',  tipo: 'Atendimento', valor: 180, formaPagamento: 'Pix', status: 'Pago', categoria: 'Atendimento' },
      { id: 'fono-rec-3',  data: d(5),  nome: 'T.O. — Atendimento',  tipo: 'Atendimento', valor: 180, formaPagamento: 'Pix', status: 'Pago', categoria: 'Atendimento' },
      { id: 'fono-rec-4',  data: d(5),  nome: 'L.F. — Atendimento',  tipo: 'Atendimento', valor: 180, formaPagamento: 'Cartão de débito', status: 'Pago', categoria: 'Atendimento' },
      { id: 'fono-rec-5',  data: d(7),  nome: 'A.L. — Avaliação',    tipo: 'Avaliação',   valor: 220, formaPagamento: 'Pix', status: 'Pago', categoria: 'Avaliação'   },
      { id: 'fono-rec-6',  data: d(7),  nome: 'R.M. — Atendimento',  tipo: 'Atendimento', valor: 180, formaPagamento: 'Pix', status: 'Pago', categoria: 'Atendimento' },
      { id: 'fono-rec-7',  data: d(9),  nome: 'P.C. — Atendimento',  tipo: 'Atendimento', valor: 180, formaPagamento: 'Pix', status: 'Pago', categoria: 'Atendimento' },
      { id: 'fono-rec-8',  data: d(12), nome: 'B.A. — Avaliação',    tipo: 'Avaliação',   valor: 220, formaPagamento: 'Pix', status: 'Pago', categoria: 'Avaliação'   },
      { id: 'fono-rec-9',  data: d(12), nome: 'G.S. — Atendimento',  tipo: 'Atendimento', valor: 180, formaPagamento: 'Pix', status: 'Pendente', categoria: 'Atendimento' },
    ];
  }

  function getDespesasFono() {
    const hoje = new Date();
    const ano  = hoje.getFullYear();
    const mes  = String(hoje.getMonth() + 1).padStart(2,'0');
    const d    = (dia) => ano + '-' + mes + '-' + String(dia).padStart(2,'0');
    return [
      { id: 'fono-desp-1', data: d(5),  descricao: 'Aluguel consultório',          categoria: 'Fixos',      valor: 1200, status: 'Pago' },
      { id: 'fono-desp-2', data: d(7),  descricao: 'Materiais clínicos — maio',    categoria: 'Material',   valor: 85,   status: 'Pago' },
      { id: 'fono-desp-3', data: d(1),  descricao: 'Plataforma Conta Comigo Pro',  categoria: 'Tecnologia', valor: 50,   status: 'Pago' },
      { id: 'fono-desp-4', data: d(10), descricao: 'Anuidade CFFa — parcelamento', categoria: 'Conselho',   valor: 95,   status: 'Pago' },
    ];
  }

  function getTarefasFono() {
    return [
      { id: 'fono-tar-1', titulo: 'Enviar relatório mensal da família de A.L.', area: 'Clínica', prioridade: 'alta',   prazo: '2026-05-20', status: 'aberta' },
      { id: 'fono-tar-2', titulo: 'Renovar anuidade CFFa',                       area: 'Admin',   prioridade: 'alta',   prazo: '2026-06-30', status: 'aberta' },
      { id: 'fono-tar-3', titulo: 'Preparar plano terapêutico — A.L.',           area: 'Clínica', prioridade: 'normal', prazo: '',           status: 'aberta' },
      { id: 'fono-tar-4', titulo: 'Confirmar agendamentos da próxima semana',    area: 'Admin',   prioridade: 'normal', prazo: '',           status: 'aberta' },
    ];
  }

  /**
   * Helper: une arrays de demo com dados existentes, evitando duplicar por ID.
   * Retorna { adicionadas: number, total: number }.
   */
  function _mesclarDemo(chave, demos) {
    const atuais = JSON.parse(localStorage.getItem(chave) || '[]');
    const idsExistentes = new Set(atuais.map(x => x.id));
    const novas = demos.filter(x => !idsExistentes.has(x.id));
    if (novas.length) {
      localStorage.setItem(chave, JSON.stringify([...atuais, ...novas]));
    }
    return { adicionadas: novas.length };
  }

  /** Carrega TUDO demo (notas + receitas + despesas + compromissos), sem duplicar. */
  function carregarDemo() {
    if (!souFamilia()) { toast('Esta opção é exclusiva para a Família.', 'error'); return; }
    const r1 = _mesclarDemo(oneU('notas_cerebro'), getNotasDemo());
    const r2 = _mesclarDemo(oneU('receitas'),     getReceitasDemo());
    const r3 = _mesclarDemo(oneU('despesas'),     getDespesasDemo());
    const r4 = _mesclarDemo(oneU('compromissos'), getCompromissosDemo());
    const totalAdicionado = r1.adicionadas + r2.adicionadas + r3.adicionadas + r4.adicionadas;
    if (!totalAdicionado) {
      toast('Os exemplos já estão todos carregados.', null, { duration: 2400 });
      return;
    }
    fecharConfig();
    renderCerebro();
    if (typeof renderListaReceitas === 'function') renderListaReceitas();
    if (typeof renderListaDespesas === 'function') renderListaDespesas();
    if (typeof renderAgendaSemanal === 'function') renderAgendaSemanal();
    atualizarHome();
    toast(totalAdicionado + ' itens de exemplo carregados (notas + receitas + despesas + agenda).', 'success', { duration: 3500 });
  }

  /** Apaga TUDO e recarrega TODOS os exemplos demo (notas + receitas + despesas + compromissos). */
  function resetarComDemo() {
    if (!souFamilia()) { toast('Esta opção é exclusiva para a Família.', 'error'); return; }
    if (!confirm('Isso vai APAGAR TODOS os dados atuais e carregar apenas os exemplos demo:\n\n• 10 notas no Biblioteca da Pinah\n• 10 receitas de exemplo\n• 3 despesas variáveis\n• 6 compromissos (passados, hoje e futuros)\n\nContinuar?')) return;
    setNotas(getNotasDemo());
    localStorage.setItem(oneU('receitas'),     JSON.stringify(getReceitasDemo()));
    localStorage.setItem(oneU('despesas'),     JSON.stringify(getDespesasDemo()));
    localStorage.setItem(oneU('compromissos'), JSON.stringify(getCompromissosDemo()));
    fecharConfig();
    renderCerebro();
    if (typeof renderListaReceitas === 'function') renderListaReceitas();
    if (typeof renderListaDespesas === 'function') renderListaDespesas();
    if (typeof renderAgendaSemanal === 'function') renderAgendaSemanal();
    atualizarHome();
    toast('Resetado com exemplos completos (notas + finanças + agenda).', 'success', { duration: 3500 });
  }

  /** Apaga TUDO inclusive despesas fixas — deixa zerado de verdade. */
  function limparTudo() {
    if (!confirm('Isso vai APAGAR TODOS os dados do app:\n\n• Todas as notas do Biblioteca da Pinah\n• Todas as receitas\n• Todas as despesas\n• Todas as despesas fixas\n• Todos os compromissos\n\nApenas as configurações (forma de pagamento, % imposto) serão mantidas.\n\nEsta ação NÃO PODE ser desfeita. Continuar?')) return;
    if (!confirm('Tem certeza? Esta é sua última chance.')) return;
    setNotas([]);
    localStorage.setItem(oneU('receitas'),     JSON.stringify([]));
    localStorage.setItem(oneU('despesas'),     JSON.stringify([]));
    localStorage.setItem(oneU('despesasFixas'), JSON.stringify([]));
    localStorage.setItem(oneU('compromissos'), JSON.stringify([]));
    fecharConfig();
    renderCerebro();
    if (typeof renderListaReceitas === 'function') renderListaReceitas();
    if (typeof renderListaDespesas === 'function') renderListaDespesas();
    if (typeof renderDespesasFixas === 'function') renderDespesasFixas();
    if (typeof renderAgendaSemanal === 'function') renderAgendaSemanal();
    atualizarHome();
    toast('Todos os dados foram apagados. Comece do zero.', 'success', { duration: 4000 });
  }

  /* ── Configuracoes do app — % imposto + forma de pagamento ─── */
  const FORMAS_PAGAMENTO = ['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Transferência'];

  function getImpostoPct() {
    const v = parseFloat(localStorage.getItem(oneU('ccp_imposto_pct')));
    return (isFinite(v) && v >= 0 && v <= 100) ? v : 6;
  }
  function getFormaPagamentoDefault() {
    const v = localStorage.getItem(oneU('ccp_forma_pagamento'));
    return FORMAS_PAGAMENTO.includes(v) ? v : 'Pix';
  }
  function editarImpostoPct() {
    abrirConfig(); // agora redireciona para o modal unificado
  }

  function abrirConfig() {
    const m = document.getElementById('modal-config');
    if (!m) return;
    document.getElementById('cfg-imposto').value = String(getImpostoPct()).replace('.', ',');
    document.getElementById('cfg-forma').value = getFormaPagamentoDefault();
    m.style.display = 'flex';
    renderIcons();
  }
  window.abrirConfig = abrirConfig;
  function fecharConfig() {
    const m = document.getElementById('modal-config');
    if (m) m.style.display = 'none';
  }
  window.fecharConfig = fecharConfig;
  function salvarConfig() {
    const impStr = document.getElementById('cfg-imposto').value;
    const imp = parseFloat(String(impStr).replace(',', '.'));
    if (!isFinite(imp) || imp < 0 || imp > 100) {
      toast('% de imposto inválido. Digite um número entre 0 e 100.', 'error');
      return;
    }
    const forma = document.getElementById('cfg-forma').value;
    if (!FORMAS_PAGAMENTO.includes(forma)) {
      toast('Forma de pagamento inválida.', 'error');
      return;
    }
    localStorage.setItem(oneU('ccp_imposto_pct'), String(imp));
    localStorage.setItem(oneU('ccp_forma_pagamento'), forma);
    fecharConfig();
    atualizarHome();
    toast('Configurações salvas. Confirme o imposto sempre com seu contador.', 'success', { duration: 3500 });
  }
  window.salvarConfig = salvarConfig;

  function mesNome() {
    return new Date().toLocaleDateString('pt-BR', { month: 'long' });
  }

  function semanaLimites(offset) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diaSemana = hoje.getDay();
    const diffToMon = diaSemana === 0 ? -6 : 1 - diaSemana;
    const ini = new Date(hoje);
    ini.setDate(hoje.getDate() + diffToMon + (offset || 0) * 7);
    const fim = new Date(ini);
    fim.setDate(ini.getDate() + 6);
    return { ini, fim };
  }

  /* ── Card Financeiro ─────────────────────────────────────────── */
  function renderCardFinanceiro() {
    const now  = new Date();
    const ano  = now.getFullYear();
    const mes  = now.getMonth();

    const receitas     = JSON.parse(localStorage.getItem(oneU('receitas'))      || '[]');
    const despesas     = JSON.parse(localStorage.getItem(oneU('despesas'))      || '[]');
    const compromissos = JSON.parse(localStorage.getItem(oneU('compromissos'))  || '[]');

    const deMes = item => {
      const d = new Date(item.data + 'T00:00:00');
      return d.getFullYear() === ano && d.getMonth() === mes;
    };

    const totalEntrou = receitas
      .filter(r => deMes(r) && r.status === 'Pago')
      .reduce((s, r) => s + (Number(r.valor) || 0), 0);

    const totalSaiu = despesas
      .filter(d => deMes(d))
      .reduce((s, d) => s + (Number(d.valor) || 0), 0);

    const saldo = totalEntrou - totalSaiu;

    const totalPendente = receitas
      .filter(r => deMes(r) && r.status === 'Pendente')
      .reduce((s, r) => s + (Number(r.valor) || 0), 0);

    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const totalPrevisao = compromissos
      .filter(c => new Date(c.data + 'T00:00:00') >= hoje && Number(c.valor) > 0)
      .reduce((s, c) => s + (Number(c.valor) || 0), 0);

    document.getElementById('fin-titulo').textContent = 'Você já fez em ' + mesNome();

    const elSaldo = document.getElementById('fin-saldo');
    elSaldo.textContent = brl(saldo);
    elSaldo.className   = 'hc-saldo ' + (saldo >= 0 ? 'positivo' : 'negativo');

    document.getElementById('fin-entrou').textContent  = '↑ Entrou ' + brl(totalEntrou);
    document.getElementById('fin-saiu').textContent    = '↓ Saiu '   + brl(totalSaiu);
    document.getElementById('fin-pendente').textContent = brl(totalPendente);
    document.getElementById('fin-previsao').textContent = brl(totalPrevisao);
    const impPct = getImpostoPct();
    document.getElementById('fin-imposto-pct').textContent = String(impPct).replace('.', ',');
    document.getElementById('fin-imposto').textContent  = brl(totalEntrou * (impPct / 100));

    // Bloco HOJE — valores do dia atual
    const hojeStr = toDateStr(new Date());
    const recHoje = receitas.filter(r => r.data === hojeStr && r.status === 'Pago');
    const valHoje = recHoje.reduce((s, r) => s + (Number(r.valor) || 0), 0);
    const atendHoje = compromissos.filter(c => c.data === hojeStr && (!c.tipo || c.tipo === 'Atendimento')).length;
    document.getElementById('fin-hoje-valor').textContent = '+' + brl(valHoje);
    document.getElementById('fin-hoje-atend').textContent = atendHoje + (atendHoje === 1 ? ' atendimento' : ' atendimentos');
  }

  /* ── Card Agenda ─────────────────────────────────────────────── */
  function renderCardAgenda() {
    const compromissos = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]');

    const { ini: iniAt, fim: fimAt } = semanaLimites(0);
    const { ini: iniAn, fim: fimAn } = semanaLimites(-1);

    const emRange = (ini, fim) => c => {
      const d = new Date(c.data + 'T00:00:00');
      return d >= ini && d <= fim;
    };

    const semAtual    = compromissos.filter(emRange(iniAt, fimAt)).length;
    const semAnterior = compromissos.filter(emRange(iniAn, fimAn)).length;
    const ocupacao    = Math.min(100, Math.round((semAtual / 40) * 100));

    document.getElementById('ag-semana').textContent   = semAtual;
    document.getElementById('ag-anterior').textContent = semAnterior + ' atendimento' + (semAnterior !== 1 ? 's' : '');

    const elOcup = document.getElementById('ag-ocupacao');
    elOcup.innerHTML = ocupacao + '%' +
      ' <small id="ag-slots" style="font-size:10px;font-weight:400;opacity:.7"> de 40 slots</small>';

    // Bloco HOJE — atendimentos e valor previsto do dia
    const hojeStr = toDateStr(new Date());
    const compHoje = compromissos.filter(c => c.data === hojeStr);
    const atendHoje = compHoje.filter(c => !c.tipo || c.tipo === 'Atendimento').length;
    const valorPrevHoje = compHoje
      .filter(c => Number(c.valor) > 0)
      .reduce((s, c) => s + (Number(c.valor) || 0), 0);
    document.getElementById('ag-hoje-atend').textContent = atendHoje + (atendHoje === 1 ? ' atendimento' : ' atendimentos');
    document.getElementById('ag-hoje-valor').innerHTML = '<i data-lucide="wallet"></i>' + brl(valorPrevHoje) + ' previstos';

    // Footer — previsao de receita do mes (compromissos do mes corrente com valor)
    const now = new Date();
    const ano = now.getFullYear();
    const mes = now.getMonth();
    const prevMes = compromissos
      .filter(c => {
        const d = new Date(c.data + 'T00:00:00');
        return d.getFullYear() === ano && d.getMonth() === mes && Number(c.valor) > 0;
      })
      .reduce((s, c) => s + (Number(c.valor) || 0), 0);
    document.getElementById('ag-prev-mes').textContent = brl(prevMes);
  }

  /* ── Lançamentos recentes ────────────────────────────────────── */
  function avatarColor(cat) {
    const map = {
      'Receita':'#7EC8B8', 'Consulta':'#7FA88E', 'Alimentação':'#E8C4D4',
      'Transporte':'#7AB8D4', 'Saúde':'#E87A7A', 'Fixo':'#C9A8D8', 'Despesa':'#E87A7A'
    };
    if (map[cat]) return map[cat];
    const pal = ['#7FA88E','#7EC8B8','#7AB8D4','#E8C4D4','#C9A8D8','#F0B860'];
    let h = 0;
    for (const c of (cat || '')) h = (h * 31 + c.charCodeAt(0)) % pal.length;
    return pal[h];
  }

  function escHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function renderLancamentos() {
    const now = new Date();
    const ano = now.getFullYear();
    const mes = now.getMonth();
    const primeiroMes = `${ano}-${String(mes + 1).padStart(2,'0')}-01`;

    const receitas      = JSON.parse(localStorage.getItem(oneU('receitas'))      || '[]');
    const despesas      = JSON.parse(localStorage.getItem(oneU('despesas'))      || '[]');
    const despesasFixas = JSON.parse(localStorage.getItem(oneU('despesasFixas')) || '[]');
    const receitasFixas = JSON.parse(localStorage.getItem(oneU('receitasFixas')) || '[]');

    const deMes = item => {
      if (!item.data) return true;
      const d = new Date(item.data + 'T00:00:00');
      return d.getFullYear() === ano && d.getMonth() === mes;
    };

    /* Fixa só aparece no mês se "inicio" (YYYY-MM) é menor ou igual ao mês atual */
    const fixaAtiva = (f) => {
      if (!f.inicio) return true;
      const [iAno, iMes] = String(f.inicio).split('-').map(Number);
      if (!iAno || !iMes) return true;
      return (ano > iAno) || (ano === iAno && mes >= (iMes - 1));
    };

    /* Data computada da fixa pra este mês (usando o diaDoMes) */
    const dataFixaNoMes = (f) => {
      const dia = Math.min(Math.max(parseInt(f.diaDoMes, 10) || 1, 1), 28);
      return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    };

    const items = [];

    receitas.filter(deMes).forEach(r => items.push({
      nome: r.descricao || r.nome || 'Receita',
      categoria: r.categoria || 'Receita',
      data: r.data || primeiroMes,
      valor: Number(r.valor) || 0,
      tipo: 'receita',
      status: r.status || 'Pago'
    }));

    despesas.filter(deMes).forEach(d => items.push({
      nome: d.descricao || d.nome || 'Despesa',
      categoria: d.categoria || 'Despesa',
      data: d.data || primeiroMes,
      valor: Number(d.valor) || 0,
      tipo: 'despesa',
      status: d.status || 'Pago'
    }));

    despesasFixas.filter(fixaAtiva).forEach(df => items.push({
      nome: df.descricao || df.nome || 'Despesa Fixa',
      categoria: df.categoria || 'Fixo',
      data: dataFixaNoMes(df),
      valor: Number(df.valor) || 0,
      tipo: 'despesa',
      status: 'Fixo'
    }));

    receitasFixas.filter(fixaAtiva).forEach(rf => items.push({
      nome: rf.descricao || rf.nome || 'Receita Fixa',
      categoria: rf.categoria || 'Fixo',
      data: dataFixaNoMes(rf),
      valor: Number(rf.valor) || 0,
      tipo: 'receita',
      status: 'Fixo'
    }));

    items.sort((a, b) => b.data.localeCompare(a.data));

    const el = document.getElementById('lista-lancamentos');
    if (!el) return;

    const recent = items.slice(0, 5);

    if (recent.length === 0) {
      el.innerHTML = '<div class="lanc-vazio">Nenhum lançamento este mês</div>';
      return;
    }

    el.innerHTML = recent.map(item => {
      const iniciais = escHtml((item.nome || '??').substring(0, 2).toUpperCase());
      const cor      = avatarColor(item.categoria);
      const dataFmt  = new Date(item.data + 'T00:00:00')
        .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const tagClass = item.status === 'Fixo' ? 'tag-fixo'
                     : item.status === 'Pendente' ? 'tag-pendente' : 'tag-pago';
      const sinal      = item.tipo === 'receita' ? '+ ' : '- ';
      const valorClass = item.tipo === 'receita' ? 'receita' : 'despesa';

      return `<div class="lanc-item">
        <div class="lanc-avatar" style="background:${cor}">${iniciais}</div>
        <div class="lanc-info">
          <div class="lanc-nome">${escHtml(item.nome)}</div>
          <div class="lanc-meta">
            <span class="lanc-cat">${escHtml(item.categoria)}</span>
            <span class="lanc-data">· ${dataFmt}</span>
            <span class="lanc-tag ${tagClass}">${escHtml(item.status)}</span>
          </div>
        </div>
        <div class="lanc-valor ${valorClass}">${sinal}${brl(item.valor)}</div>
      </div>`;
    }).join('');
  }

  /* ── Agenda home ─────────────────────────────────────────────── */
  let agendaDiaSelecionado = null;

  function toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function corBarraTipo(tipo) {
    if (!tipo) return '#7FA88E';
    const t = tipo.toLowerCase();
    if (t.includes('profissional')) return '#7B9BC8';
    if (t.includes('pessoal'))      return '#999';
    return '#7FA88E'; // Atendimento (padrão)
  }

  function badgeClass(status) {
    if (!status) return 'badge-pendente';
    const s = status.toLowerCase();
    if (s.includes('confirm')) return 'badge-confirmado';
    if (s.includes('aguard') || s.includes('espera')) return 'badge-aguardando';
    if (s.includes('cancel')) return 'badge-cancelado';
    return 'badge-pendente';
  }

  function renderAgendaDia(dateStr) {
    const compromissos = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]');
    const doDia = compromissos
      .filter(c => c.data === dateStr)
      .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));

    // Atualiza subtítulo com data formatada
    const tituloEl = document.getElementById('agenda-dia-titulo');
    if (tituloEl) {
      const hojeStr = toDateStr(new Date());
      if (dateStr === hojeStr) {
        tituloEl.textContent = 'Hoje';
      } else {
        const d = new Date(dateStr + 'T00:00:00');
        tituloEl.textContent = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
      }
    }

    const el = document.getElementById('lista-compromissos-hoje');
    if (!el) return;

    if (doDia.length === 0) {
      el.innerHTML = '<div class="lanc-vazio">Nenhum compromisso neste dia</div>';
      return;
    }

    el.innerHTML = '<div class="home-comp-list">' + doDia.map(c => {
      const cor     = corBarraTipo(c.tipo);
      const bg      = cor === '#7FA88E' ? '#E8D5F5' :
                      cor === '#7B9BC8' ? '#D5E8F5' : '#EBEBEB';
      const txtCor  = cor === '#999' ? '#555' : cor;
      const hora    = escHtml(c.hora || '--:--');
      const nome    = escHtml(c.descricao || c.nome || c.paciente || 'Compromisso');
      const tipo    = escHtml(c.tipo || 'Atendimento');
      const valStr  = (c.tipo === 'Atendimento' && Number(c.valor) > 0)
        ? ` · ${brl(c.valor)}` : '';

      return `<div class="home-comp-card" style="background:${bg};border-color:${cor};color:${txtCor}">
        <div class="home-comp-card-top">
          <span class="home-comp-hora">${hora}</span>
          <span class="home-comp-nome">${nome}</span>
        </div>
        <div class="home-comp-tipo">${tipo}${escHtml(valStr)}</div>
      </div>`;
    }).join('') + '</div>';
    renderIcons();
  }

  function renderMiniAgenda() {
    const compromissos = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]');
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const hojeStr = toDateStr(hoje);

    // Domingo da semana atual
    const dom = new Date(hoje);
    dom.setDate(hoje.getDate() - hoje.getDay());

    const NOMES = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const grid = document.getElementById('mini-agenda-grid');
    if (!grid) return;

    grid.innerHTML = NOMES.map((nome, i) => {
      const d = new Date(dom);
      d.setDate(dom.getDate() + i);
      const dateStr  = toDateStr(d);
      const isHoje   = dateStr === hojeStr;
      const doDia    = compromissos.filter(c => c.data === dateStr);

      const classes = ['mini-dia', isHoje ? 'hoje' : ''].filter(Boolean).join(' ');

      const dots = doDia.slice(0, 3).map(c =>
        `<div class="mini-dot" style="background:${corBarraTipo(c.tipo)}"></div>`
      ).join('') || '<div style="height:7px"></div>';

      return `<div class="${classes}" onclick="irParaAgendaDia('${dateStr}')">
        <div class="mini-dia-nome">${nome}</div>
        <div class="mini-dia-num">${d.getDate()}</div>
        <div class="mini-dia-dots">${dots}</div>
      </div>`;
    }).join('');
  }

  function irParaAgendaDia(dateStr) {
    // Calcula o offset de semana para exibir a semana que contém dateStr
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const domHoje = new Date(hoje);
    domHoje.setDate(hoje.getDate() - hoje.getDay());
    const domAlvo = new Date(dateStr + 'T00:00:00');
    domAlvo.setDate(domAlvo.getDate() - domAlvo.getDay());
    const diffMs = domAlvo - domHoje;
    agSemanaOffset = Math.round(diffMs / (7 * 24 * 3600 * 1000));
    go('agenda');
  }

  function renderHomeAgendaHoje() {
    const el = document.getElementById('home-agenda-hoje');
    if (!el) return;
    const compromissos = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]');
    const hojeStr = toDateStr(new Date());
    const doDia = compromissos
      .filter(c => c.data === hojeStr)
      .sort((a,b) => (a.hora||'').localeCompare(b.hora||''));
    if (!doDia.length) {
      el.innerHTML = '<div class="lanc-vazio">Nenhum compromisso hoje</div>';
      return;
    }
    const atend = doDia.filter(c => !c.tipo || c.tipo === 'Atendimento').length;
    const prof  = doDia.filter(c => c.tipo === 'Compromisso Profissional').length;
    const pess  = doDia.filter(c => c.tipo === 'Compromisso Pessoal').length;

    // Resumo de contagens (mantido)
    const sumario = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:6px 12px 10px">
      <div style="background:#F0E8F8;border-radius:8px;padding:10px 4px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:#7FA88E;line-height:1">${atend}</div>
        <div style="font-size:9px;color:#7FA88E;font-weight:600;margin-top:4px;line-height:1.2">Atendimentos</div>
      </div>
      <div style="background:#E8F0F8;border-radius:8px;padding:10px 4px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:#7B9BC8;line-height:1">${prof}</div>
        <div style="font-size:9px;color:#7B9BC8;font-weight:600;margin-top:4px;line-height:1.2">Profissionais</div>
      </div>
      <div style="background:#F0F0F0;border-radius:8px;padding:10px 4px;text-align:center">
        <div style="font-size:22px;font-weight:700;color:#888;line-height:1">${pess}</div>
        <div style="font-size:9px;color:#888;font-weight:600;margin-top:4px;line-height:1.2">Pessoais</div>
      </div>
    </div>`;

    // Lista detalhada com botao de acao para atendimentos
    const itens = doDia.map(c => {
      const isAtend = !c.tipo || c.tipo === 'Atendimento';
      const cor = corBarraTipo(c.tipo);
      const realizado = !!c.realizado;
      const valor = Number(c.valor) || 0;

      // Botao "Realizado" so aparece em atendimentos nao realizados
      let acao = '';
      if (isAtend && !realizado) {
        const valorTxt = valor > 0 ? ' +' + brl(valor) : '';
        acao = `<button class="btn-realizado" onclick="marcarRealizado('${c.id}')" title="Marcar como realizado">
          <i data-lucide="check"></i><span>Realizado${valorTxt}</span>
        </button>`;
      } else if (realizado) {
        const valorTxt = valor > 0 ? ' · +' + brl(valor) : '';
        acao = `<span class="badge-realizado"><i data-lucide="check-circle-2"></i>Recebido${valorTxt}</span>`;
      } else if (valor > 0) {
        acao = `<span style="font-size:11px;color:#4CAF50;font-weight:600">${brl(valor)}</span>`;
      }

      const bgItem = realizado ? '#EAF7E8' : '#fff';
      const borderItem = realizado ? '1px solid #C5E2C0' : '1px solid #f0eef3';

      return `<div class="home-agenda-item" style="background:${bgItem};border:${borderItem};border-left:3px solid ${cor};border-radius:8px;padding:8px 10px;display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <div style="flex-shrink:0;font-size:11px;font-weight:700;color:#666;min-width:42px">${escHtml(c.hora||'--:--')}</div>
        <div style="flex:1;min-width:0;font-size:12px;font-weight:500;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(c.nome||c.descricao||'Compromisso')}</div>
        ${acao}
      </div>`;
    }).join('');

    el.innerHTML = sumario +
      `<div style="padding:0 12px 12px">${itens}</div>`;
    renderIcons();
  }

  function renderHomeAgendaSemana() {
    const el = document.getElementById('home-agenda-semana');
    if (!el) return;
    const compromissos = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]');
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const hojeStr = toDateStr(hoje);
    const dom = new Date(hoje);
    dom.setDate(hoje.getDate() - hoje.getDay());

    const NOMES = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];

    const colunas = NOMES.map((nome, i) => {
      const d = new Date(dom); d.setDate(dom.getDate() + i);
      const ds = toDateStr(d);
      const isHoje = ds === hojeStr;
      const doDia = compromissos
        .filter(c => c.data === ds)
        .sort((a,b) => (a.hora||'').localeCompare(b.hora||''));

      // Totais do dia: atendimentos + valor previsto
      const atendDia = doDia.filter(c => !c.tipo || c.tipo === 'Atendimento').length;
      const valorDia = doDia
        .filter(c => Number(c.valor) > 0)
        .reduce((s, c) => s + (Number(c.valor) || 0), 0);

      const headerBg  = isHoje ? '#F0E8F8' : '#fff';
      const headerBor = isHoje ? '1.5px solid #7FA88E' : '1px solid #eee';
      const numColor  = isHoje ? '#7FA88E' : '#333';
      const nomColor  = isHoje ? '#7FA88E' : '#aaa';

      const miniCards = doDia.map(c => {
        const cor   = corBarraTipo(c.tipo);
        const bg    = cor === '#7FA88E' ? '#F0E8F8' : cor === '#7B9BC8' ? '#E8F0F8' : '#F0F0F0';
        const borda = cor === '#7FA88E' ? '#7FA88E' : cor === '#7B9BC8' ? '#7B9BC8' : '#999999';
        const txt   = cor === '#999' ? '#555' : cor;
        return `<div style="background:${bg};border-left:3px solid ${borda};border-radius:4px;padding:4px 5px;color:${txt};min-width:0">
          <div style="font-size:9px;font-weight:700;opacity:.72;white-space:nowrap">${escHtml(c.hora||'--:--')}</div>
          <div style="font-size:9px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(c.nome||c.descricao||'Compromisso')}</div>
        </div>`;
      }).join('');

      // Resumo do dia (rodape da coluna): qtd + valor — agenda = dinheiro
      const resumoDia = (atendDia > 0 || valorDia > 0)
        ? `<div style="padding:4px 4px 6px;border-top:1px solid #eee;text-align:center">
            <div style="font-size:10px;font-weight:700;color:${numColor};line-height:1.2">${atendDia} atend.</div>
            <div style="font-size:9px;font-weight:600;color:#4CAF50;margin-top:1px;line-height:1">${brl(valorDia)}</div>
          </div>`
        : '';

      return `<div style="background:#fff;border-radius:8px;border:${headerBor};overflow:hidden;min-width:0;display:flex;flex-direction:column">
        <div style="padding:5px 4px;text-align:center;background:${headerBg};border-bottom:${headerBor}">
          <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${nomColor}">${nome}</div>
          <div style="font-size:13px;font-weight:700;color:${numColor};line-height:1.3">${d.getDate()}</div>
        </div>
        <div style="padding:4px;display:flex;flex-direction:column;gap:3px;flex:1">${miniCards}</div>
        ${resumoDia}
      </div>`;
    }).join('');

    el.innerHTML = `<div style="overflow-x:auto;padding:4px 8px 14px">
      <div style="display:grid;grid-template-columns:repeat(7,minmax(76px,1fr));gap:4px">
        ${colunas}
      </div>
    </div>`;
    renderIcons();
  }

  function renderAgendaHome() {
    renderHomeAgendaHoje();
    renderHomeAgendaSemana();
    renderPinahWeek();
    renderPinahGreeting();
  }

  // ── Home Pinah v4 ───────────────────────────────────────────────
  function renderPinahWeek() {
    const el = document.getElementById('pinah-week');
    if (!el) return;
    const compromissos = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]');
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const hojeStr = toDateStr(hoje);
    const seg = new Date(hoje);
    const dow = hoje.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    seg.setDate(hoje.getDate() + diff);

    const NOMES = ['seg','ter','qua','qui','sex','sáb','dom'];
    const NUM_SLOTS = 6;

    function slotIdx(hora) {
      if (!hora) return -1;
      const h = parseInt(String(hora).split(':')[0], 10);
      if (isNaN(h)) return -1;
      if (h < 7)  return 0;
      if (h < 10) return 1;
      if (h < 13) return 2;
      if (h < 16) return 3;
      if (h < 19) return 4;
      return 5;
    }

    const html = NOMES.map((nome, i) => {
      const d = new Date(seg); d.setDate(seg.getDate() + i);
      const ds = toDateStr(d);
      const isHoje = ds === hojeStr;
      const isWeekend = i >= 5;
      const doDia = compromissos.filter(c => c.data === ds);
      const slots = new Array(NUM_SLOTS).fill(false);
      doDia.forEach(c => { const k = slotIdx(c.hora); if (k >= 0) slots[k] = true; });
      const cls = ['pinah-day' + (isHoje ? ' today' : '') + (isWeekend ? ' weekend' : '')];
      const slotsHtml = slots.map(s => '<span class="pinah-slot' + (s ? ' has' : '') + '"></span>').join('');
      return '<div class="' + cls.join(' ') + '">' +
        '<span class="name">' + nome + '</span>' +
        '<span class="num">' + d.getDate() + '</span>' +
        '<div class="slots">' + slotsHtml + '</div>' +
        '</div>';
    }).join('');
    el.innerHTML = html;
  }

  function renderPinahGreeting() {
    const dias = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
    const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const hoje = new Date();
    const elData = document.getElementById('data-hoje');
    if (elData) elData.textContent = dias[hoje.getDay()] + ' · ' + hoje.getDate() + ' de ' + meses[hoje.getMonth()];
    const elMes = document.getElementById('pinah-mes-label');
    if (elMes) elMes.textContent = meses[hoje.getMonth()];
    const elH = document.getElementById('pinah-greeting-h');
    if (elH) {
      const h = hoje.getHours();
      const saudacao = h < 12 ? 'Bom dia' : (h < 18 ? 'Boa tarde' : 'Boa noite');
      let nome = 'Luciano';
      try { const u = JSON.parse(localStorage.getItem(oneU('usuario')) || '{}'); if (u && u.nome) nome = String(u.nome).split(' ')[0]; } catch(_) {}
      elH.textContent = saudacao + ', ' + nome;
    }
  }

  function abrirMenuPinah()   { alert('Menu lateral Pinah — em breve.'); }
  function abrirTelaPinah()   { go('pinah'); renderPinahTopo(); }
  function abrirConfigPinah() { abrirConfig(); }

  function renderPinahTopo() {
    const el = document.getElementById('psc-topo-text');
    if (!el) return;
    const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const agora = new Date();
    const hh = String(agora.getHours()).padStart(2,'0');
    const mm = String(agora.getMinutes()).padStart(2,'0');
    let nome = 'Luciano';
    try { const u = JSON.parse(localStorage.getItem(oneU('usuario'))||'{}'); if(u&&u.nome) nome=String(u.nome).split(' ')[0]; } catch(_) {}
    el.textContent = nome + ', são ' + hh + ':' + mm + ', dia ' + agora.getDate() + ' de ' + meses[agora.getMonth()] + ' de ' + agora.getFullYear();
  }

  function pinahEnviar() {
    const input = document.getElementById('psc-input');
    if (!input || !input.value.trim()) return;
    input.value = '';
    input.style.height = 'auto';
    /* stub — integração com IA em sessão futura */
  }
  function pinahAnexar() { /* stub — em breve */ }
  function pinahVoz()    { /* stub — em breve */ }

  /* ── RECEITAS ─────────────────────────────────────────────────── */
  let editandoReceitaId = null;

  function salvarReceita() {
    const data  = document.getElementById('r-data').value;
    const nome  = document.getElementById('r-nome').value.trim();
    const tipo  = document.getElementById('r-tipo').value;
    const valor = parseValor(document.getElementById('r-valor').value);
    const forma = document.getElementById('r-pagamento').value;
    const status = document.getElementById('r-status').value;
    if (!data || !nome) {
      toast('Preencha data e nome do paciente.', 'error');
      return;
    }
    const lista = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]');
    if (editandoReceitaId) {
      const idx = lista.findIndex(r => r.id === editandoReceitaId);
      if (idx >= 0) {
        lista[idx] = { ...lista[idx], data, nome, tipo, valor, formaPagamento: forma, status, categoria: tipo };
      }
      localStorage.setItem(oneU('receitas'), JSON.stringify(lista));
      if (idx >= 0 && typeof supaUpsert === 'function') supaUpsert('receitas', lista[idx]);
      cancelarEdicaoReceita();
      renderListaReceitas();
      atualizarHome();
      toast('Receita atualizada!', 'success');
      return;
    }
    const novaReceita = { id: crypto.randomUUID(), data, nome, tipo, valor, formaPagamento: forma, status, categoria: tipo };
    lista.push(novaReceita);
    localStorage.setItem(oneU('receitas'), JSON.stringify(lista));
    if (typeof supaUpsert === 'function') supaUpsert('receitas', novaReceita);
    document.getElementById('r-nome').value  = '';
    document.getElementById('r-valor').value = '';
    renderListaReceitas();
    atualizarHome();
    toast('Receita salva com sucesso!', 'success');
  }

  function editarReceita(id) {
    const lista = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]');
    const r = lista.find(x => x.id === id);
    if (!r) return;
    editandoReceitaId = id;
    document.getElementById('r-data').value = r.data || '';
    document.getElementById('r-nome').value = r.nome || '';
    document.getElementById('r-tipo').value = r.tipo || 'Avaliação';
    document.getElementById('r-valor').value = String(r.valor || '').replace('.', ',');
    document.getElementById('r-pagamento').value = r.formaPagamento || 'Pix';
    document.getElementById('r-status').value = r.status || 'Pago';
    const btn = document.querySelector('#screen-receitas .btn-salvar-inline');
    if (btn) btn.textContent = 'Atualizar Receita';
    let aviso = document.getElementById('r-edit-aviso');
    if (!aviso) {
      aviso = document.createElement('div');
      aviso.id = 'r-edit-aviso';
      aviso.style.cssText = 'background:#FFF8E1;border:1px solid #F5C842;color:#7A5A00;padding:8px 12px;border-radius:8px;font-size:12px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:10px';
      aviso.innerHTML = '<span>✏️ Editando receita existente</span><button onclick="cancelarEdicaoReceita()" style="background:none;border:1px solid #B8860B;color:#7A5A00;padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600">Cancelar</button>';
      const cardBody = document.querySelector('#screen-receitas .form-card .card-body');
      if (cardBody) cardBody.insertBefore(aviso, cardBody.firstChild);
    }
    aviso.style.display = 'flex';
    document.getElementById('screen-receitas').scrollTop = 0;
    document.getElementById('r-nome').focus();
    document.getElementById('r-data').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function cancelarEdicaoReceita() {
    editandoReceitaId = null;
    document.getElementById('r-nome').value = '';
    document.getElementById('r-valor').value = '';
    const btn = document.querySelector('#screen-receitas .btn-salvar-inline');
    if (btn) btn.textContent = 'Salvar Receita';
    const aviso = document.getElementById('r-edit-aviso');
    if (aviso) aviso.style.display = 'none';
  }

  function excluirReceita(id) {
    if (!confirm('Excluir esta receita?')) return;
    localStorage.setItem(oneU('receitas'), JSON.stringify(
      JSON.parse(localStorage.getItem(oneU('receitas')) || '[]').filter(r => r.id !== id)
    ));
    if (typeof supaDelete === 'function') supaDelete('receitas', id);
    if (editandoReceitaId === id) cancelarEdicaoReceita();
    renderListaReceitas();
    atualizarHome();
  }

  function renderListaReceitas() {
    const now = new Date(), ano = now.getFullYear(), mes = now.getMonth();
    const receitas = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]');
    const doMes = receitas
      .filter(r => { const d = new Date(r.data + 'T00:00:00'); return d.getFullYear() === ano && d.getMonth() === mes; })
      .sort((a,b) => b.data.localeCompare(a.data));
    const total = doMes.reduce((s,r) => s + (Number(r.valor)||0), 0);
    document.getElementById('rec-lista-titulo').textContent =
      'Receitas — ' + now.toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
    document.getElementById('rec-lista-total').textContent = brl(total);
    const el = document.getElementById('lista-receitas');
    if (!el) return;
    if (!doMes.length) { el.innerHTML = '<div class="lanc-vazio">Nenhuma receita este mês</div>'; return; }
    el.innerHTML = doMes.map(r => {
      const df = new Date(r.data+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
      const tc = r.status === 'Pendente' ? 'tag-pendente' : 'tag-pago';
      return `<div class="list-item">
        <div class="list-item-info">
          <div class="list-item-nome">${escHtml(r.nome)}</div>
          <div class="list-item-meta">${escHtml(r.tipo)} · ${escHtml(r.formaPagamento)} · ${df}
            <span class="lanc-tag ${tc}" style="margin-left:4px">${escHtml(r.status)}</span>
          </div>
        </div>
        <div class="list-item-val val-receita">${brl(r.valor)}</div>
        <button class="btn-icon" onclick="editarReceita('${r.id}')" title="Editar"><i data-lucide="pencil"></i></button>
        <button class="btn-icon del" onclick="excluirReceita('${r.id}')" title="Excluir"><i data-lucide="trash-2"></i></button>
      </div>`;
    }).join('');
    renderIcons();
  }

  /* ── DESPESAS ──────────────────────────────────────────────────── */
  function abrirFormNovaFixa() {
    document.getElementById('form-nova-fixa').style.display = 'block';
    document.getElementById('nf-descricao').focus();
  }
  function fecharFormNovaFixa() {
    document.getElementById('form-nova-fixa').style.display = 'none';
    ['nf-descricao','nf-categoria','nf-valor'].forEach(id =>
      { const el = document.getElementById(id); if (el) el.value = ''; }
    );
  }
  function salvarNovaFixa() {
    const desc = document.getElementById('nf-descricao').value.trim();
    const cat  = document.getElementById('nf-categoria').value.trim() || 'Outros';
    const val  = parseValor(document.getElementById('nf-valor').value);
    if (!desc || !val) { toast('Preencha descrição e valor.', 'error'); return; }
    const lista = JSON.parse(localStorage.getItem(oneU('despesasFixas')) || '[]');
    const novaFixa = { id: crypto.randomUUID(), descricao: desc, categoria: cat, valor: val };
    lista.push(novaFixa);
    localStorage.setItem(oneU('despesasFixas'), JSON.stringify(lista));
    if (typeof supaUpsert === 'function') supaUpsert('despesas_fixas', novaFixa);
    fecharFormNovaFixa();
    renderDespesasFixas();
    atualizarHome();
  }
  function excluirDespesaFixa(id) {
    if (!confirm('Excluir esta despesa fixa?')) return;
    localStorage.setItem(oneU('despesasFixas'), JSON.stringify(
      JSON.parse(localStorage.getItem(oneU('despesasFixas')) || '[]').filter(d => d.id !== id)
    ));
    if (typeof supaDelete === 'function') supaDelete('despesas_fixas', id);
    renderDespesasFixas();
    atualizarHome();
  }
  function toggleEditarFixa(id) {
    const el = document.getElementById('edit-fixa-' + id);
    if (!el) return;
    const aberto = el.classList.contains('aberto');
    document.querySelectorAll('.edit-inline.aberto').forEach(e => e.classList.remove('aberto'));
    if (!aberto) el.classList.add('aberto');
  }
  function salvarEdicaoFixa(id) {
    const lista = JSON.parse(localStorage.getItem(oneU('despesasFixas')) || '[]');
    const idx = lista.findIndex(d => d.id === id);
    if (idx < 0) return;
    const desc = document.getElementById('ef-desc-'+id).value.trim();
    const cat  = document.getElementById('ef-cat-'+id).value.trim();
    const val  = parseValor(document.getElementById('ef-val-'+id).value);
    if (!desc || !val) { toast('Preencha os campos.', 'error'); return; }
    lista[idx] = { ...lista[idx], descricao: desc, categoria: cat, valor: val };
    localStorage.setItem(oneU('despesasFixas'), JSON.stringify(lista));
    if (typeof supaUpsert === 'function') supaUpsert('despesas_fixas', lista[idx]);
    renderDespesasFixas();
    atualizarHome();
  }
  function renderDespesasFixas() {
    const lista = JSON.parse(localStorage.getItem(oneU('despesasFixas')) || '[]');
    const total = lista.reduce((s,d) => s + (Number(d.valor)||0), 0);
    const elTotal = document.getElementById('total-fixo');
    if (elTotal) elTotal.textContent = brl(total);
    const el = document.getElementById('lista-despesas-fixas');
    if (!el) return;
    if (!lista.length) { el.innerHTML = '<div class="lanc-vazio">Nenhuma despesa fixa cadastrada</div>'; return; }
    el.innerHTML = lista.map(d => `
      <div class="list-item" style="flex-direction:column;align-items:stretch;gap:0;padding:10px 18px">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="list-item-info">
            <div class="list-item-nome">${escHtml(d.descricao)}</div>
            <div class="list-item-meta">${escHtml(d.categoria)}</div>
          </div>
          <div class="list-item-val val-despesa">${brl(d.valor)}</div>
          <button class="btn-icon" onclick="toggleEditarFixa('${d.id}')" title="Editar"><i data-lucide="pencil"></i></button>
          <button class="btn-icon del" onclick="excluirDespesaFixa('${d.id}')" title="Excluir"><i data-lucide="trash-2"></i></button>
        </div>
        <div class="edit-inline" id="edit-fixa-${d.id}">
          <input id="ef-desc-${d.id}" value="${escHtml(d.descricao)}" placeholder="Descrição">
          <input id="ef-cat-${d.id}"  value="${escHtml(d.categoria)}"  placeholder="Categoria">
          <input id="ef-val-${d.id}"  type="text" inputmode="decimal" value="${String(d.valor).replace('.', ',')}" placeholder="Valor">
          <button class="btn-primary" style="font-size:12px;padding:5px 12px;flex:0" onclick="salvarEdicaoFixa('${d.id}')">Salvar</button>
        </div>
      </div>`).join('');
    renderIcons();
  }
  let editandoDespesaId = null;

  function salvarDespesa() {
    const data  = document.getElementById('d-data').value;
    const desc  = document.getElementById('d-descricao').value.trim();
    const cat   = document.getElementById('d-categoria').value;
    const valor = parseValor(document.getElementById('d-valor').value);
    if (!data || !desc || !valor) {
      toast('Preencha todos os campos.', 'error');
      return;
    }
    const lista = JSON.parse(localStorage.getItem(oneU('despesas')) || '[]');
    if (editandoDespesaId) {
      const idx = lista.findIndex(d => d.id === editandoDespesaId);
      if (idx >= 0) {
        lista[idx] = { ...lista[idx], data, descricao: desc, nome: desc, categoria: cat, valor };
      }
      localStorage.setItem(oneU('despesas'), JSON.stringify(lista));
      if (idx >= 0 && typeof supaUpsert === 'function') supaUpsert('despesas', lista[idx]);
      cancelarEdicaoDespesa();
      renderListaDespesas();
      atualizarHome();
      toast('Despesa atualizada!', 'success');
      return;
    }
    const novaDespesa = { id: crypto.randomUUID(), data, descricao: desc, nome: desc, categoria: cat, valor };
    lista.push(novaDespesa);
    localStorage.setItem(oneU('despesas'), JSON.stringify(lista));
    if (typeof supaUpsert === 'function') supaUpsert('despesas', novaDespesa);
    document.getElementById('d-descricao').value = '';
    document.getElementById('d-valor').value = '';
    renderListaDespesas();
    atualizarHome();
    toast('Despesa salva com sucesso!', 'success');
  }

  function editarDespesa(id) {
    const lista = JSON.parse(localStorage.getItem(oneU('despesas')) || '[]');
    const d = lista.find(x => x.id === id);
    if (!d) return;
    editandoDespesaId = id;
    document.getElementById('d-data').value = d.data || '';
    document.getElementById('d-descricao').value = d.descricao || d.nome || '';
    document.getElementById('d-categoria').value = d.categoria || 'Outros';
    document.getElementById('d-valor').value = String(d.valor || '').replace('.', ',');
    const btn = document.querySelector('#screen-despesas .btn-salvar-inline');
    if (btn) btn.textContent = 'Atualizar Despesa';
    let aviso = document.getElementById('d-edit-aviso');
    if (!aviso) {
      aviso = document.createElement('div');
      aviso.id = 'd-edit-aviso';
      aviso.style.cssText = 'background:#FFF8E1;border:1px solid #F5C842;color:#7A5A00;padding:8px 12px;border-radius:8px;font-size:12px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:10px';
      aviso.innerHTML = '<span>✏️ Editando despesa existente</span><button onclick="cancelarEdicaoDespesa()" style="background:none;border:1px solid #B8860B;color:#7A5A00;padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600">Cancelar</button>';
      const cardBody = document.querySelector('#screen-despesas .form-card .card-body');
      if (cardBody) cardBody.insertBefore(aviso, cardBody.firstChild);
    }
    aviso.style.display = 'flex';
    document.getElementById('screen-despesas').scrollTop = 0;
    document.getElementById('d-descricao').focus();
    document.getElementById('d-data').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function cancelarEdicaoDespesa() {
    editandoDespesaId = null;
    document.getElementById('d-descricao').value = '';
    document.getElementById('d-valor').value = '';
    const btn = document.querySelector('#screen-despesas .btn-salvar-inline');
    if (btn) btn.textContent = 'Salvar Despesa';
    const aviso = document.getElementById('d-edit-aviso');
    if (aviso) aviso.style.display = 'none';
  }

  function excluirDespesa(id) {
    if (!confirm('Excluir esta despesa?')) return;
    localStorage.setItem(oneU('despesas'), JSON.stringify(
      JSON.parse(localStorage.getItem(oneU('despesas')) || '[]').filter(d => d.id !== id)
    ));
    if (typeof supaDelete === 'function') supaDelete('despesas', id);
    if (editandoDespesaId === id) cancelarEdicaoDespesa();
    renderListaDespesas();
    atualizarHome();
  }
  function renderListaDespesas() {
    const now = new Date(), ano = now.getFullYear(), mes = now.getMonth();
    const despesas = JSON.parse(localStorage.getItem(oneU('despesas')) || '[]');
    const doMes = despesas
      .filter(d => { const dt = new Date(d.data+'T00:00:00'); return dt.getFullYear()===ano && dt.getMonth()===mes; })
      .sort((a,b) => b.data.localeCompare(a.data));
    const total = doMes.reduce((s,d) => s + (Number(d.valor)||0), 0);
    document.getElementById('desp-lista-titulo').textContent =
      'Variáveis — ' + now.toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
    document.getElementById('desp-lista-total').textContent = brl(total);
    const el = document.getElementById('lista-despesas');
    if (!el) return;
    if (!doMes.length) { el.innerHTML = '<div class="lanc-vazio">Nenhuma despesa variável este mês</div>'; return; }
    el.innerHTML = doMes.map(d => {
      const df = new Date(d.data+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
      return `<div class="list-item">
        <div class="list-item-info">
          <div class="list-item-nome">${escHtml(d.descricao)}</div>
          <div class="list-item-meta">${escHtml(d.categoria)} · ${df}</div>
        </div>
        <div class="list-item-val val-despesa">- ${brl(d.valor)}</div>
        <button class="btn-icon" onclick="editarDespesa('${d.id}')" title="Editar"><i data-lucide="pencil"></i></button>
        <button class="btn-icon del" onclick="excluirDespesa('${d.id}')" title="Excluir"><i data-lucide="trash-2"></i></button>
      </div>`;
    }).join('');
    renderIcons();
  }

  /* ── AGENDA (tela completa) ────────────────────────────────────── */
  let calAno = new Date().getFullYear(), calMes = new Date().getMonth(), calDiaSel = null;

  function calNavegar(delta) {
    calMes += delta;
    if (calMes < 0)  { calMes = 11; calAno--; }
    if (calMes > 11) { calMes = 0;  calAno++; }
    renderCalendario();
  }
  function renderCalendario() {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const hojeStr = toDateStr(hoje);
    const compromissos = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]');
    const nomeMes = new Date(calAno, calMes, 1)
      .toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
    const elTit = document.getElementById('cal-mes-titulo');
    if (elTit) elTit.textContent = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
    const primeiroDia = new Date(calAno, calMes, 1).getDay();
    const diasNoMes   = new Date(calAno, calMes + 1, 0).getDate();
    const comDot = new Set(
      compromissos
        .filter(c => { const d = new Date(c.data+'T00:00:00'); return d.getFullYear()===calAno && d.getMonth()===calMes; })
        .map(c => c.data)
    );
    const grid = document.getElementById('cal-grid');
    if (!grid) return;
    let html = '';
    for (let i = 0; i < primeiroDia; i++) html += '<div class="cal-day vazio"></div>';
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const ds = `${calAno}-${String(calMes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
      const isH = ds === hojeStr, isS = ds === calDiaSel, hasD = comDot.has(ds);
      const cls = ['cal-day', isH?'hoje':'', isS&&!isH?'selecionado':''].filter(Boolean).join(' ');
      html += `<div class="${cls}" onclick="selecionarDiaCal('${ds}')">
        <span class="cal-day-num">${dia}</span>
        ${hasD ? '<div class="cal-day-dot"></div>' : ''}
      </div>`;
    }
    grid.innerHTML = html;
  }
  function selecionarDiaCal(ds) {
    calDiaSel = ds;
    renderCalendario();
    renderListaDiaAgenda(ds);
  }
  function renderListaDiaAgenda(ds) {
    const compromissos = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]');
    const doDia = compromissos.filter(c => c.data === ds)
      .sort((a,b) => (a.hora||'').localeCompare(b.hora||''));
    const d = new Date(ds+'T00:00:00');
    const titulo = d.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' });
    const elTit = document.getElementById('cal-dia-titulo');
    if (elTit) elTit.textContent = titulo;
    const el = document.getElementById('lista-agenda-dia');
    if (!el) return;
    if (!doDia.length) { el.innerHTML = '<div class="lanc-vazio">Nenhum compromisso neste dia</div>'; return; }
    el.innerHTML = doDia.map(c => {
      const cor = corBarraTipo(c.tipo), bc = badgeClass(c.status);
      const valorTxt = (c.tipo === 'Atendimento' && Number(c.valor) > 0)
        ? `<span style="font-size:11px;font-weight:700;color:#7E57C2;margin-left:4px">${brl(c.valor)}</span>` : '';
      const rlzBtn = c.realizado ? '' :
        `<button class="btn-icon" onclick="marcarRealizado('${c.id}')" title="Marcar realizado"><i data-lucide="check-circle-2"></i></button>`;
      return `<div class="comp-item">
        <div class="comp-barra" style="background:${cor}"></div>
        <div class="comp-hora">${escHtml(c.hora||'--:--')}</div>
        <div class="comp-info">
          <div class="comp-nome">${escHtml(c.nome||c.descricao||'Compromisso')}</div>
          <div class="comp-tipo">${escHtml(c.tipo||'Atendimento')}${c.duracao?' · '+c.duracao+' min':''}${valorTxt}</div>
        </div>
        <span class="comp-badge ${bc}">${escHtml(c.status||'Pendente')}</span>
        ${rlzBtn}
        <button class="btn-icon" onclick="editarCompromisso('${c.id}')" title="Editar"><i data-lucide="pencil"></i></button>
        <button class="btn-icon del" onclick="excluirCompromisso('${c.id}')" title="Excluir"><i data-lucide="trash-2"></i></button>
      </div>`;
    }).join('');
    renderIcons();
  }
  let editandoCompromissoId = null;

  function salvarCompromisso() {
    const data   = document.getElementById('c-data').value;
    const hora   = document.getElementById('c-hora').value;
    const nome   = document.getElementById('c-nome').value.trim();
    const tipo   = document.getElementById('c-tipo').value;
    const dur    = Number(document.getElementById('c-duracao').value);
    const valor  = parseValor(document.getElementById('c-valor').value);
    const status = document.getElementById('c-status').value;
    if (!data || !nome) { toast('Preencha data e nome.', 'error'); return; }
    const lista = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]');
    if (editandoCompromissoId) {
      const idx = lista.findIndex(c => c.id === editandoCompromissoId);
      if (idx >= 0) {
        lista[idx] = { ...lista[idx], data, hora, nome, descricao: nome, tipo, duracao: dur, valor, status };
        supaUpsert('compromissos', lista[idx]);
      }
      localStorage.setItem(oneU('compromissos'), JSON.stringify(lista));
      editandoCompromissoId = null;
      fecharModalNovoComp();
      renderAgendaSemanal();
      if (typeof renderCalendario === 'function') renderCalendario();
      if (calDiaSel && typeof renderListaDiaAgenda === 'function') renderListaDiaAgenda(calDiaSel);
      atualizarHome();
      toast('Compromisso atualizado!', 'success');
      return;
    }
    const novoComp = { id: crypto.randomUUID(), data, hora, nome, descricao: nome, tipo, duracao: dur, valor, status, realizado: false };
    lista.push(novoComp);
    localStorage.setItem(oneU('compromissos'), JSON.stringify(lista));
    supaUpsert('compromissos', novoComp);
    document.getElementById('c-nome').value  = '';
    document.getElementById('c-valor').value = '';
    document.getElementById('c-hora').value  = '';
    fecharModalNovoComp();
    renderAgendaSemanal();
    if (typeof renderCalendario === 'function') renderCalendario();
    if (calDiaSel && typeof renderListaDiaAgenda === 'function') renderListaDiaAgenda(calDiaSel);
    atualizarHome();
    toast('Compromisso salvo!', 'success');
  }

  function editarCompromisso(id) {
    const lista = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]');
    const c = lista.find(x => x.id === id);
    if (!c) return;
    editandoCompromissoId = id;
    document.getElementById('c-data').value = c.data || '';
    document.getElementById('c-hora').value = c.hora || '';
    document.getElementById('c-nome').value = c.nome || c.descricao || '';
    document.getElementById('c-tipo').value = c.tipo || 'Atendimento';
    document.getElementById('c-duracao').value = String(c.duracao || 45);
    document.getElementById('c-valor').value = c.valor ? String(c.valor).replace('.', ',') : '';
    document.getElementById('c-status').value = c.status || 'Confirmado';
    const tit = document.getElementById('modal-comp-titulo');
    if (tit) tit.textContent = 'Editar Compromisso';
    const btn = document.getElementById('modal-comp-btn-salvar');
    if (btn) btn.textContent = 'Atualizar Compromisso';
    abrirModalNovoComp();
  }

  function excluirCompromisso(id) {
    if (!confirm('Excluir este compromisso?')) return;
    localStorage.setItem(oneU('compromissos'), JSON.stringify(
      JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]').filter(c => c.id !== id)
    ));
    supaDelete('compromissos', id);
    if (editandoCompromissoId === id) {
      editandoCompromissoId = null;
      fecharModalNovoComp();
    }
    renderAgendaSemanal();
    if (typeof renderCalendario === 'function') renderCalendario();
    if (calDiaSel && typeof renderListaDiaAgenda === 'function') renderListaDiaAgenda(calDiaSel);
    atualizarHome();
  }
  /* ── Biblioteca da Pinah — Modal "Perguntar a IA" ────────────────── */
  // 50/dia durante fase de teste interno (Luciano + Le + Barbara).
  // Para beta amplo (10+ usuarias), reduzir para 5-10.
  const IA_LIMITE_DIA = 50;
  const IA_SUGESTOES = [
    'Resuma meus 3 cases mais recentes',
    'Sobre o que tenho mais material para palestrar?',
    'Que técnicas usei para problemas de pega?',
    'Quais protocolos eu já criei?',
    'Tem algum padrão entre meus cases?'
  ];

  /**
   * 6 atalhos avancados — perguntas pre-formuladas com persona/objetivo claro.
   * Click → preenche o textarea com a pergunta e dispara a consulta automaticamente.
   */
  const IA_ATALHOS = [
    {
      id: 'laudo',
      classe: 'ia-atalho-laudo',
      icone: 'file-text',
      titulo: 'Gerar laudo',
      pergunta: 'Crie um rascunho de laudo profissional para o caso mais recente que tenho registrado. Estrutura: Identificação (paciente, idade), Queixa, Avaliação, Conduta, Evolução, Conclusão. Use linguagem clínica formal mas acessível.'
    },
    {
      id: 'post',
      classe: 'ia-atalho-post',
      icone: 'instagram',
      titulo: 'Post Instagram',
      pergunta: 'Escolha um tema dos meus cases ou protocolos e crie um post para Instagram (3 parágrafos curtos, linguagem acessível para o público leigo, sem identificar pacientes). Inclua hashtags relevantes.'
    },
    {
      id: 'palestra',
      classe: 'ia-atalho-palestra',
      icone: 'mic',
      titulo: 'Tema palestra',
      pergunta: 'Olhe meus cases, protocolos e técnicas. Sugira 3 temas potentes para uma palestra de 30 minutos, com base no que TENHO MAIS MATERIAL registrado. Para cada tema, indique quais notas usar.'
    },
    {
      id: 'lacunas',
      classe: 'ia-atalho-lacunas',
      icone: 'search-x',
      titulo: 'Detectar lacunas',
      pergunta: 'Analise meus cases e protocolos. Identifique 2-3 áreas importantes que provavelmente atendo na prática mas ainda não tenho material registrado. Sugira o que valeria documentar.'
    },
    {
      id: 'resumo',
      classe: 'ia-atalho-resumo',
      icone: 'calendar-clock',
      titulo: 'Resumo do mês',
      pergunta: 'Faça um resumo dos cases e protocolos que tenho registrados nos últimos 30 dias. Destaque temas recorrentes, técnicas mais usadas e qualquer padrão clínico que perceber.'
    },
    {
      id: 'conexoes',
      classe: 'ia-atalho-conexoes',
      icone: 'git-merge',
      titulo: 'Conexões',
      pergunta: 'Encontre conexões entre meus cases, protocolos e técnicas. Quais notas se relacionam entre si? Aponte 2-3 pares ou trios que se complementam e explique o porquê.'
    }
  ];

  function executarAtalhoIA(atalhoId) {
    const a = IA_ATALHOS.find(x => x.id === atalhoId);
    if (!a) return;
    const inp = document.getElementById('ia-input');
    if (inp) {
      inp.value = a.pergunta;
      atualizarCharCountIA();
    }
    // Dispara a pergunta automaticamente
    perguntarIA();
  }

  function getIAUsoHoje() {
    const hojeStr = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(oneU('ccp_ia_uso'));
    let obj = {};
    try { obj = raw ? JSON.parse(raw) : {}; } catch (e) { obj = {}; }
    return obj[hojeStr] || 0;
  }
  function incrementarIAUso() {
    const hojeStr = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(oneU('ccp_ia_uso'));
    let obj = {};
    try { obj = raw ? JSON.parse(raw) : {}; } catch (e) { obj = {}; }
    obj[hojeStr] = (obj[hojeStr] || 0) + 1;
    // Limpa entradas antigas (>7 dias) para nao poluir localStorage
    const corte = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    Object.keys(obj).forEach(k => { if (k < corte) delete obj[k]; });
    localStorage.setItem(oneU('ccp_ia_uso'), JSON.stringify(obj));
  }
  function atualizarRestantesIA() {
    const usados = getIAUsoHoje();
    const restantes = Math.max(0, IA_LIMITE_DIA - usados);

    // Texto dentro do modal
    const el = document.getElementById('ia-restantes');
    if (el) {
      el.textContent = restantes + ' de ' + IA_LIMITE_DIA + ' perguntas restantes hoje';
      if (restantes === 0) el.style.color = '#C62828';
    }

    // Contador inline no botao da tela do SC + cor adaptativa
    const btn = document.getElementById('btn-ia-sc');
    const cnt = document.getElementById('btn-ia-contador');
    if (cnt) cnt.textContent = restantes + '/' + IA_LIMITE_DIA;
    if (btn) {
      btn.classList.remove('contador-aviso', 'contador-atencao');
      if (restantes <= 3) btn.classList.add('contador-atencao');
      else if (restantes <= 10) btn.classList.add('contador-aviso');
    }

    // Pill no header da Biblioteca (padrão TaskAreas)
    const pillIA = document.getElementById('one-cer-pill-ia');
    if (pillIA) pillIA.textContent = restantes + '/' + IA_LIMITE_DIA + ' IA';

    return restantes;
  }

  function abrirModalIA() {
    const m = document.getElementById('modal-ia');
    if (!m) return;
    // Reset visual
    document.getElementById('ia-pergunta-area').style.display = 'block';
    document.getElementById('ia-loading').style.display = 'none';
    document.getElementById('ia-resposta-area').style.display = 'none';
    document.getElementById('ia-erro-area').style.display = 'none';
    document.getElementById('ia-input').value = '';
    document.getElementById('ia-char-count').textContent = '0 / 500';
    // Atalhos avancados (botoes coloridos com acoes especificas)
    const atalhosEl = document.getElementById('ia-atalhos');
    if (atalhosEl) {
      atalhosEl.innerHTML = IA_ATALHOS.map(a =>
        `<button class="ia-atalho ${a.classe}" onclick="executarAtalhoIA('${a.id}')" title="${escHtml(a.pergunta)}">
          <span class="ia-atalho-icon"><i data-lucide="${a.icone}"></i></span>
          <span class="ia-atalho-titulo">${escHtml(a.titulo)}</span>
        </button>`
      ).join('');
    }
    // Sugestoes (re-renderizadas a cada abertura caso queira variar no futuro)
    const sugEl = document.getElementById('ia-sugestoes');
    if (sugEl) {
      sugEl.innerHTML = IA_SUGESTOES.map(s =>
        `<button class="ia-sugestao" onclick="usarSugestaoIA(this.textContent)">${escHtml(s)}</button>`
      ).join('');
    }
    // Atualiza contador de uso
    const restantes = atualizarRestantesIA();
    const btn = document.getElementById('ia-btn-perguntar');
    if (btn) btn.disabled = restantes === 0;
    m.style.display = 'flex';
    setTimeout(() => document.getElementById('ia-input').focus(), 50);
    renderIcons();
  }
  function fecharModalIA() {
    const m = document.getElementById('modal-ia');
    if (m) m.style.display = 'none';
  }
  function usarSugestaoIA(texto) {
    const inp = document.getElementById('ia-input');
    if (inp) {
      inp.value = texto;
      inp.focus();
      atualizarCharCountIA();
    }
  }
  function atualizarCharCountIA() {
    const inp = document.getElementById('ia-input');
    const cnt = document.getElementById('ia-char-count');
    if (inp && cnt) cnt.textContent = inp.value.length + ' / 500';
  }

  /* ── Microfone do modal Perguntar a IA ──────────────────────── */
  let __micIAControle = null;
  function toggleMicIA() {
    const btn = document.getElementById('ia-btn-mic');
    const inp = document.getElementById('ia-input');
    const status = document.getElementById('ia-mic-status');
    if (!btn || !inp || !status) return;

    // Se ja esta gravando, parar
    if (__micIAControle) {
      __micIAControle.stop();
      __micIAControle = null;
      btn.classList.remove('mic-listening', 'mic-processing');
      status.style.display = 'none';
      return;
    }

    // Iniciar reconhecimento
    __micIAControle = iniciarReconhecimentoVoz({
      onStateChange: (estado) => {
        btn.classList.remove('mic-listening', 'mic-processing');
        if (estado === 'listening') {
          btn.classList.add('mic-listening');
          status.style.display = 'block';
          status.style.color = '#C62828';
          status.textContent = '🔴 Ouvindo... clique de novo para parar';
        } else if (estado === 'processing') {
          btn.classList.add('mic-processing');
          status.style.display = 'block';
          status.style.color = '#A06200';
          status.textContent = '⚙️ Processando audio...';
        } else if (estado === 'result' || estado === 'error') {
          btn.classList.remove('mic-listening', 'mic-processing');
        } else if (estado === 'unsupported') {
          btn.disabled = true;
        }
      },
      onPartial: (texto) => {
        // Resultado parcial enquanto fala — mostra no campo em tempo real
        inp.value = texto;
        atualizarCharCountIA();
      },
      onResult: (texto) => {
        inp.value = texto;
        atualizarCharCountIA();
        __micIAControle = null;
        setTimeout(() => { status.style.display = 'none'; }, 1200);
        inp.focus();
      },
      onError: (msg) => {
        __micIAControle = null;
        status.style.display = 'block';
        status.style.color = '#C62828';
        status.textContent = '⚠️ ' + msg;
        setTimeout(() => { status.style.display = 'none'; }, 4000);
      }
    });
  }
  function resetarPerguntaIA() {
    document.getElementById('ia-pergunta-area').style.display = 'block';
    document.getElementById('ia-loading').style.display = 'none';
    document.getElementById('ia-resposta-area').style.display = 'none';
    document.getElementById('ia-erro-area').style.display = 'none';
    document.getElementById('ia-input').value = '';
    atualizarCharCountIA();
    atualizarRestantesIA();
    setTimeout(() => document.getElementById('ia-input').focus(), 50);
  }

  async function perguntarIA() {
    const inp = document.getElementById('ia-input');
    const pergunta = (inp ? inp.value : '').trim();
    if (pergunta.length < 3) {
      toast('Digite uma pergunta com pelo menos 3 caracteres.', 'error');
      return;
    }
    // Rate limit
    if (getIAUsoHoje() >= IA_LIMITE_DIA) {
      toast('Voce atingiu o limite de ' + IA_LIMITE_DIA + ' perguntas por dia. Volta amanha.', 'error', { duration: 4000 });
      return;
    }
    // Coleta notas (todas, ate 30 — limite no backend tambem)
    const notas = getNotas();
    // Mostra loading
    document.getElementById('ia-pergunta-area').style.display = 'none';
    document.getElementById('ia-loading').style.display = 'block';
    document.getElementById('ia-resposta-area').style.display = 'none';
    document.getElementById('ia-erro-area').style.display = 'none';

    try {
      const resp = await fetch('/api/ask-cerebro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: pergunta, notes: notas })
      });
      const data = await resp.json();

      if (!resp.ok || data.error) {
        throw new Error(data.error || 'Erro inesperado');
      }
      if (!data.answer) {
        throw new Error('Resposta vazia da IA');
      }

      // Sucesso — incrementa uso, mostra resposta
      incrementarIAUso();
      document.getElementById('ia-pergunta-eco').textContent = pergunta;
      // Renderizacao simples de **negrito** -> <strong>
      const html = escHtml(data.answer)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      document.getElementById('ia-resposta-texto').innerHTML = html;
      document.getElementById('ia-loading').style.display = 'none';
      document.getElementById('ia-resposta-area').style.display = 'block';
      renderIcons();
      atualizarRestantesIA();
    } catch (err) {
      console.error('[perguntarIA]', err);
      const msgErro = String(err && err.message || 'Erro desconhecido');
      let msgUser = msgErro;
      // Mensagens amigaveis para casos comuns
      if (msgErro.includes('configurada') || msgErro.includes('500')) {
        msgUser = 'A API ainda nao esta configurada no servidor. Avise o administrador (Luciano) para adicionar a ANTHROPIC_API_KEY no Vercel.';
      } else if (msgErro.includes('temporario') || msgErro.includes('502')) {
        msgUser = 'A IA esta temporariamente indisponivel. Tente em alguns segundos.';
      } else if (msgErro.includes('Failed to fetch') || msgErro.includes('NetworkError')) {
        msgUser = 'Sem conexao com o servidor. Verifique sua internet.';
      }
      document.getElementById('ia-erro-texto').textContent = msgUser;
      document.getElementById('ia-loading').style.display = 'none';
      document.getElementById('ia-erro-area').style.display = 'block';
      renderIcons();
    }
  }

  /* ── Microfone do modal Nova Nota (ditar conteudo) ─────────── */
  let __micNotaControle = null;
  let __micNotaTextoBase = ''; // texto que ja existia antes de comecar a ditar
  function toggleMicNota() {
    const btn = document.getElementById('nota-btn-mic');
    const inp = document.getElementById('nota-input-conteudo');
    const status = document.getElementById('nota-mic-status');
    if (!btn || !inp || !status) return;

    if (__micNotaControle) {
      __micNotaControle.stop();
      __micNotaControle = null;
      btn.classList.remove('mic-listening', 'mic-processing');
      status.style.display = 'none';
      return;
    }

    // Salva o que ja estava digitado para apendar a transcricao no fim
    __micNotaTextoBase = inp.value;
    const separador = __micNotaTextoBase && !__micNotaTextoBase.endsWith('\n') ? '\n\n' : '';

    __micNotaControle = iniciarReconhecimentoVoz({
      onStateChange: (estado) => {
        btn.classList.remove('mic-listening', 'mic-processing');
        if (estado === 'listening') {
          btn.classList.add('mic-listening');
          status.style.display = 'block';
          status.style.color = '#C62828';
          status.textContent = '🔴 Gravando... fale claramente. Clique de novo para parar.';
        } else if (estado === 'processing') {
          btn.classList.add('mic-processing');
          status.style.display = 'block';
          status.style.color = '#A06200';
          status.textContent = '⚙️ Processando audio...';
        } else if (estado === 'unsupported') {
          btn.disabled = true;
        }
      },
      onPartial: (texto) => {
        inp.value = __micNotaTextoBase + separador + texto;
      },
      onResult: (texto) => {
        inp.value = (__micNotaTextoBase + separador + texto).trim();
        __micNotaControle = null;
        setTimeout(() => { status.style.display = 'none'; }, 1500);
        inp.focus();
      },
      onError: (msg) => {
        __micNotaControle = null;
        status.style.display = 'block';
        status.style.color = '#C62828';
        status.textContent = '⚠️ ' + msg;
        setTimeout(() => { status.style.display = 'none'; }, 4000);
      }
    });
  }

  /* ── Biblioteca da Pinah — Modal Nova/Editar Nota ────────────────── */
  function abrirModalNota(id) {
    const m = document.getElementById('modal-nota');
    if (!m) return;
    const tituloModal = document.getElementById('nota-titulo-modal');
    const btnExcluir = document.getElementById('nota-btn-excluir');

    if (id) {
      // Modo edicao
      const nota = getNotas().find(n => n.id === id);
      if (!nota) { toast('Nota não encontrada.', 'error'); return; }
      document.getElementById('nota-id').value = nota.id;
      document.getElementById('nota-input-titulo').value = nota.titulo || '';
      document.getElementById('nota-input-categoria').value = nota.categoria || 'casos';
      document.getElementById('nota-input-paciente').value = nota.paciente || '';
      document.getElementById('nota-input-conteudo').value = nota.conteudo || '';
      document.getElementById('nota-input-tags').value = (Array.isArray(nota.tags) ? nota.tags.join(', ') : '');
      tituloModal.innerHTML = '<i data-lucide="brain"></i>Editar Nota';
      btnExcluir.style.display = 'inline-block';
    } else {
      // Modo novo
      document.getElementById('nota-id').value = '';
      document.getElementById('nota-input-titulo').value = '';
      document.getElementById('nota-input-categoria').value = cerebroFiltroCategoria || 'casos';
      document.getElementById('nota-input-paciente').value = '';
      document.getElementById('nota-input-conteudo').value = '';
      document.getElementById('nota-input-tags').value = '';
      tituloModal.innerHTML = '<i data-lucide="brain"></i>Nova Nota';
      btnExcluir.style.display = 'none';
    }
    m.style.display = 'flex';
    setTimeout(() => document.getElementById('nota-input-titulo').focus(), 50);
    renderIcons();
  }
  function fecharModalNota() {
    const m = document.getElementById('modal-nota');
    if (m) m.style.display = 'none';
  }

  function salvarNota() {
    const id = document.getElementById('nota-id').value || crypto.randomUUID();
    const titulo = document.getElementById('nota-input-titulo').value.trim();
    const categoria = document.getElementById('nota-input-categoria').value;
    const paciente = document.getElementById('nota-input-paciente').value.trim();
    const conteudo = document.getElementById('nota-input-conteudo').value.trim();
    const tagsStr = document.getElementById('nota-input-tags').value.trim();

    if (!titulo) { toast('Preencha o título da nota.', 'error'); return; }
    if (!conteudo) { toast('Preencha o conteúdo da nota.', 'error'); return; }
    if (!CEREBRO_CATEGORIAS.find(c => c.id === categoria)) {
      toast('Categoria inválida.', 'error'); return;
    }

    const tags = tagsStr
      ? tagsStr.split(',').map(t => t.trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean)
      : [];

    const notas = getNotas();
    const idx = notas.findIndex(n => n.id === id);
    const agora = new Date().toISOString();

    if (idx >= 0) {
      // Edicao
      notas[idx] = { ...notas[idx], titulo, categoria, paciente, conteudo, tags, dataModificacao: agora };
      setNotas(notas);
      supaUpsert('notas_cerebro', notas[idx]);
      fecharModalNota();
      renderCerebro();
      toast('Nota atualizada.', 'success');
    } else {
      // Nova
      const novaNota = { id, titulo, categoria, paciente, conteudo, tags, data: agora, criadoEm: agora, dataModificacao: agora };
      notas.push(novaNota);
      setNotas(notas);
      supaUpsert('notas_cerebro', novaNota);
      fecharModalNota();
      renderCerebro();
      toast('Nota criada com sucesso.', 'success');
    }
  }

  function excluirNotaDoModal() {
    const id = document.getElementById('nota-id').value;
    if (!id) return;
    fecharModalNota();
    excluirNota(id);
  }

  function excluirNota(id) {
    const notas = getNotas();
    const nota = notas.find(n => n.id === id);
    if (!nota) return;
    // Snapshot para desfazer
    const snapshot = { ...nota };
    setNotas(notas.filter(n => n.id !== id));
    supaDelete('notas_cerebro', id);
    renderCerebro();
    toast(
      'Nota "' + (nota.titulo || 'sem título').slice(0, 40) + '" excluída',
      null,
      {
        actionText: 'Desfazer',
        onAction: () => {
          const arr = getNotas();
          arr.push(snapshot);
          setNotas(arr);
          supaUpsert('notas_cerebro', snapshot);
          renderCerebro();
          toast('Nota restaurada.', 'success', { duration: 2400 });
        },
        duration: 5000
      }
    );
  }

  /* ── Biblioteca da Pinah — Render principal ──────────────────────── */
  function setBuscaCerebro(v) {
    cerebroFiltroBusca = String(v || '').toLowerCase().trim();
    renderCerebro();
  }
  function setCategoriaFiltro(catId) {
    // toggle: clicar de novo na mesma desfaz
    cerebroFiltroCategoria = (cerebroFiltroCategoria === catId) ? null : catId;
    renderCerebro();
  }
  function limparFiltros() {
    cerebroFiltroCategoria = null;
    cerebroFiltroBusca = '';
    const buscaEl = document.getElementById('cerebro-busca');
    if (buscaEl) buscaEl.value = '';
    const buscaMobEl = document.getElementById('cerebro-busca-mob');
    if (buscaMobEl) buscaMobEl.value = '';
    renderCerebro();
  }

  function notaMatchBusca(n, q) {
    if (!q) return true;
    const haystack = [
      n.titulo, n.conteudo, n.paciente,
      ...(Array.isArray(n.tags) ? n.tags : [])
    ].map(s => String(s||'').toLowerCase()).join(' ');
    return haystack.includes(q);
  }

  function renderCerebro() {
    const notas = getNotas();

    // 0) Pill total no header
    const pillTotal = document.getElementById('one-cer-pill-total');
    if (pillTotal) pillTotal.textContent = notas.length + ' ' + (notas.length === 1 ? 'nota' : 'notas');

    // 1) Tabs de categorias (padrão TaskAreas): "Todas" + 5 categorias com contagem
    const grid = document.getElementById('cerebro-categorias-grid');
    if (grid) {
      const totalAtiva = cerebroFiltroCategoria === null;
      let html = `<button class="one-tar-filter cerebro-cat-tab${totalAtiva ? ' active' : ''}" onclick="setCategoriaFiltro(null)">Todas <span class="cerebro-cat-tab-count">${notas.length}</span></button>`;
      html += CEREBRO_CATEGORIAS.map(cat => {
        const count = notas.filter(n => n.categoria === cat.id).length;
        const ativa = cerebroFiltroCategoria === cat.id;
        const styleAtiva = ativa ? 'background:'+cat.cor+';border-color:'+cat.cor+';color:#fff;' : '';
        return `<button class="one-tar-filter cerebro-cat-tab${ativa ? ' active' : ''}" onclick="setCategoriaFiltro('${cat.id}')" style="${styleAtiva}">
          <span class="cerebro-cat-tab-dot" style="background:${cat.cor}"></span>${escHtml(cat.nome)} <span class="cerebro-cat-tab-count">${count}</span>
        </button>`;
      }).join('');
      grid.innerHTML = html;
    }

    // 2) Filtros ativos (chips)
    const filtrosEl = document.getElementById('cerebro-filtros-ativos');
    if (filtrosEl) {
      const chips = [];
      if (cerebroFiltroCategoria) {
        const c = getCategoria(cerebroFiltroCategoria);
        chips.push(`<span style="background:${c.cor}22;color:${c.cor};padding:4px 10px;border-radius:12px;font-weight:700">Categoria: ${c.nome}</span>`);
      }
      if (cerebroFiltroBusca) {
        chips.push(`<span style="background:#eee;color:#555;padding:4px 10px;border-radius:12px;font-weight:600">Busca: "${escHtml(cerebroFiltroBusca)}"</span>`);
      }
      if (chips.length) {
        filtrosEl.hidden = false;
        filtrosEl.innerHTML = chips.join('') +
          '<button onclick="limparFiltros()" style="background:none;border:none;color:#7FA88E;font-size:12px;font-weight:700;cursor:pointer;text-decoration:underline;margin-left:6px">Limpar</button>';
      } else {
        filtrosEl.hidden = true;
        filtrosEl.innerHTML = '';
      }
    }

    // 3) Lista de notas filtrada
    const conteudoEl = document.getElementById('cerebro-conteudo');
    if (conteudoEl) {
      const notas = getNotas()
        .filter(n => !cerebroFiltroCategoria || n.categoria === cerebroFiltroCategoria)
        .filter(n => notaMatchBusca(n, cerebroFiltroBusca))
        .sort((a, b) => (b.dataModificacao || b.data || '').localeCompare(a.dataModificacao || a.data || ''));

      if (!notas.length) {
        // Empty state — adapta texto se ha filtro
        const filtroAtivo = cerebroFiltroCategoria || cerebroFiltroBusca;
        const titulo = filtroAtivo ? 'Nenhuma anotação encontrada' : 'Nenhuma anotação ainda';
        const desc = filtroAtivo
          ? 'Tente ajustar a busca ou limpar o filtro.'
          : 'Suas anotações clínicas aparecerão aqui. Comece registrando um caso ou protocolo.';
        conteudoEl.innerHTML = `<div class="cerebro-empty">
          <div style="margin-bottom:14px"><i data-lucide="pen-line" class="icon-xl"></i></div>
          <p style="font-size:15px;font-weight:600;color:var(--texto);margin-bottom:8px">${titulo}</p>
          <p style="font-size:13px;color:var(--texto-muted);max-width:380px;margin:0 auto;line-height:1.6">${desc}</p>
          ${!filtroAtivo ? '<button class="btn-primary" style="margin-top:16px" onclick="abrirModalNota()">+ Criar primeira nota</button>' : ''}
        </div>`;
      } else {
        conteudoEl.innerHTML = '<div class="nota-lista">' +
          notas.map(n => renderNotaCard(n)).join('') + '</div>';
      }
    }

    // Atualiza contador inline no botao "Perguntar a IA"
    atualizarRestantesIA();

    // Espelha tudo pro slide Biblioteca mobile (5o slide do carrossel)
    _espelhoCerebroMobile();

    renderIcons();
  }

  /**
   * Espelha pro slide Biblioteca mobile (5o slide do carrossel) o que
   * renderCerebro acabou de pintar no desktop. Estrategia low-touch:
   * a logica desktop continua intocada; aqui so copiamos innerHTML e
   * textContent pros containers gemeos com sufixo "-mob".
   */
  function _espelhoCerebroMobile() {
    const pares = [
      ['one-cer-pill-total',       'one-cer-pill-total-mob',       'text'],
      ['one-cer-pill-ia',          'one-cer-pill-ia-mob',          'text'],
      ['cerebro-categorias-grid',  'cerebro-categorias-grid-mob',  'html'],
      ['cerebro-conteudo',         'cerebro-conteudo-mob',         'html']
    ];
    pares.forEach(function(p) {
      const src = document.getElementById(p[0]);
      const dst = document.getElementById(p[1]);
      if (!src || !dst) return;
      if (p[2] === 'text') dst.textContent = src.textContent;
      else dst.innerHTML = src.innerHTML;
    });
    // Filtros ativos: espelha innerHTML E estado hidden
    const filtSrc = document.getElementById('cerebro-filtros-ativos');
    const filtDst = document.getElementById('cerebro-filtros-ativos-mob');
    if (filtSrc && filtDst) {
      filtDst.innerHTML = filtSrc.innerHTML;
      filtDst.hidden = filtSrc.hidden;
    }
  }

  function renderNotaCard(n) {
    const cat = getCategoria(n.categoria);
    const dataStr = (n.dataModificacao || n.data || '').slice(0, 10).split('-').reverse().join('/');
    const snippet = String(n.conteudo || '').replace(/\s+/g, ' ').slice(0, 220);
    const tagsHtml = (Array.isArray(n.tags) && n.tags.length)
      ? '<div class="nota-card-tags">' + n.tags.slice(0, 4).map(t => '<span class="nota-tag">#' + escHtml(t) + '</span>').join('') + '</div>'
      : '';
    const pacHtml = n.paciente ? ' · ' + escHtml(n.paciente) : '';
    return `<div class="nota-card" onclick="abrirModalNota('${n.id}')">
      <div class="nota-card-stripe" style="background:${cat.cor}"></div>
      <div class="nota-card-body">
        <div class="nota-card-titulo">${escHtml(n.titulo || '(sem título)')}</div>
        ${snippet ? '<div class="nota-card-snippet">' + escHtml(snippet) + (n.conteudo && n.conteudo.length > 220 ? '...' : '') + '</div>' : ''}
        ${tagsHtml}
        <div class="nota-card-meta">
          <span>${dataStr}${pacHtml}</span>
          <span class="nota-card-meta-cat">· ${escHtml(cat.nome)}</span>
        </div>
      </div>
    </div>`;
  }

  /**
   * 1-toque puro: marca compromisso como realizado E (se valor > 0) cria receita.
   * Toast com botao "Desfazer" por 5s — se clicar, restaura tudo (receita removida + status).
   */
  function marcarRealizado(id) {
    const lista = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]');
    const idx = lista.findIndex(c => c.id === id);
    if (idx < 0) return;
    const comp = lista[idx];
    if (comp.realizado) {
      toast('Este atendimento já está marcado como realizado.', null, { duration: 2400 });
      return;
    }

    // Snapshot para desfazer
    const snapshot = { compIdx: idx, compAntes: { ...comp }, recCriadaId: null };

    // 1) Cria receita se valor > 0
    if (Number(comp.valor) > 0) {
      const recs = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]');
      const novaRec = {
        id: crypto.randomUUID(),
        data: comp.data,
        nome: comp.nome,
        tipo: comp.tipo === 'Atendimento' ? 'Consulta' : (comp.tipo || 'Consulta'),
        valor: Number(comp.valor),
        formaPagamento: getFormaPagamentoDefault(),
        status: 'Pago',
        categoria: comp.tipo || 'Atendimento'
      };
      recs.push(novaRec);
      localStorage.setItem(oneU('receitas'), JSON.stringify(recs));
      snapshot.recCriadaId = novaRec.id;
    }

    // 2) Atualiza compromisso
    lista[idx] = { ...comp, status: 'Confirmado', realizado: true };
    localStorage.setItem(oneU('compromissos'), JSON.stringify(lista));

    // 3) Atualiza UI
    renderAgendaSemanal();
    atualizarHome();

    // 4) Toast com Desfazer
    const valorStr = Number(comp.valor) > 0 ? ' — receita +' + brl(comp.valor) + ' lançada' : '';
    toast(
      (comp.nome || 'Atendimento') + ' confirmado' + valorStr,
      'success',
      {
        actionText: 'Desfazer',
        onAction: () => desfazerRealizado(snapshot),
        duration: 5000
      }
    );
  }

  /** Desfaz a operação do 1-toque: remove receita criada e restaura compromisso. */
  function desfazerRealizado(snapshot) {
    if (!snapshot) return;
    // Restaura compromisso
    const lista = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]');
    const idx = lista.findIndex(c => c.id === snapshot.compAntes.id);
    if (idx >= 0) {
      lista[idx] = snapshot.compAntes;
      localStorage.setItem(oneU('compromissos'), JSON.stringify(lista));
    }
    // Remove receita criada (se houve)
    if (snapshot.recCriadaId) {
      const recs = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]')
        .filter(r => r.id !== snapshot.recCriadaId);
      localStorage.setItem(oneU('receitas'), JSON.stringify(recs));
    }
    renderAgendaSemanal();
    atualizarHome();
    toast('Operação desfeita.', null, { duration: 2400 });
  }

  /* ── HISTÓRICO ─────────────────────────────────────────────────── */
  let histFiltro = 'todos';

  /**
   * Gera PDF do relatório do mês selecionado (para enviar ao contador).
   * Usa jsPDF + autotable (carregados via CDN).
   * Download direto do arquivo, sem depender do Cmd+P do navegador.
   */
  function gerarRelatorioPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      toast('Biblioteca de PDF ainda carregando. Aguarde 2 segundos e tenta de novo.', 'error', { duration: 3500 });
      return;
    }

    // Pega o mes selecionado no filtro
    const sel = document.getElementById('hist-mes-sel');
    if (!sel || !sel.value) {
      toast('Selecione um mês primeiro.', 'error');
      return;
    }
    const [ano, mes] = sel.value.split('-').map(Number); // mes 1-12
    const mesIdx = mes - 1;

    const receitas = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]')
      .filter(r => {
        const d = new Date(r.data + 'T00:00:00');
        return d.getFullYear() === ano && d.getMonth() === mesIdx;
      })
      .sort((a, b) => (a.data || '').localeCompare(b.data || ''));

    const despesasAvulsas = JSON.parse(localStorage.getItem(oneU('despesas')) || '[]')
      .filter(d => {
        const dd = new Date(d.data + 'T00:00:00');
        return dd.getFullYear() === ano && dd.getMonth() === mesIdx;
      })
      .sort((a, b) => (a.data || '').localeCompare(b.data || ''));

    // Despesas fixas — aparecem como lançamentos automáticos do dia 1 do mês
    const primeiroDiaStr = ano + '-' + String(mes).padStart(2,'0') + '-01';
    const despesasFixas = JSON.parse(localStorage.getItem(oneU('despesasFixas')) || '[]')
      .map(df => ({
        data: primeiroDiaStr,
        descricao: df.descricao || df.nome || 'Despesa Fixa',
        categoria: df.categoria || 'Fixo',
        valor: Number(df.valor) || 0,
        fixa: true
      }));

    // Combina (fixas primeiro, avulsas em seguida) e ordena por data
    const despesas = [...despesasFixas, ...despesasAvulsas].sort((a, b) =>
      (a.data || '').localeCompare(b.data || '')
    );

    if (!receitas.length && !despesas.length) {
      toast('Nada lançado neste mês para gerar relatório.', 'error', { duration: 3500 });
      return;
    }

    const totalReceita = receitas.reduce((s, r) => s + (Number(r.valor) || 0), 0);
    const totalDespesa = despesas.reduce((s, d) => s + (Number(d.valor) || 0), 0);
    const resultado = totalReceita - totalDespesa;
    const impPct = getImpostoPct();
    const impostoEst = totalReceita * (impPct / 100);

    const nomesMeses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                        'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const periodo = nomesMeses[mesIdx] + ' / ' + ano;

    // Inicializa PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margemX = 15;
    let y = 18;

    // ── Cabeçalho ─────────────────────────────────────────────────
    doc.setFillColor(155, 114, 176); // lilás
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTA COMIGO AI PRO', margemX, 13);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Relatório mensal para contador', margemX, 19);
    doc.text('Período: ' + periodo, margemX, 24);

    // Data de geração no canto direito
    const agora = new Date();
    const dataStr = agora.toLocaleDateString('pt-BR') + ' ' +
                    agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    doc.setFontSize(8);
    doc.text('Gerado em ' + dataStr, 210 - margemX, 24, { align: 'right' });

    // ── Resumo financeiro ─────────────────────────────────────────
    y = 38;
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo financeiro', margemX, y);
    y += 6;

    doc.autoTable({
      startY: y,
      theme: 'plain',
      styles: { fontSize: 11, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 65 }, 1: { halign: 'right', cellWidth: 40 } },
      body: [
        ['Receitas (' + receitas.length + ' lançamentos)', brl(totalReceita)],
        ['Despesas (' + despesas.length + ' lançamentos)', brl(totalDespesa)],
        ['Resultado líquido', { content: brl(resultado), styles: { fontStyle: 'bold', textColor: resultado >= 0 ? [29, 158, 117] : [200, 90, 90] } }],
        ['Imposto estimado (' + impPct + '%)', brl(impostoEst)]
      ]
    });
    y = doc.lastAutoTable.finalY + 8;

    // ── Tabela de receitas ────────────────────────────────────────
    if (receitas.length) {
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50, 50, 50);
      doc.text('Receitas', margemX, y);
      y += 4;

      const linhasRec = receitas.map(r => [
        new Date(r.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        r.nome || '-',
        r.tipo || r.categoria || '-',
        r.formaPagamento || '-',
        r.status || 'Pago',
        brl(r.valor || 0)
      ]);
      // Linha de total
      linhasRec.push([
        { content: 'TOTAL', colSpan: 5, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: brl(totalReceita), styles: { fontStyle: 'bold' } }
      ]);

      doc.autoTable({
        startY: y,
        head: [['Data', 'Paciente', 'Tipo', 'Forma pagto.', 'Status', 'Valor']],
        body: linhasRec,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [76, 175, 80], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 5: { halign: 'right' } }
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // ── Tabela de despesas ────────────────────────────────────────
    if (despesas.length) {
      // Quebra de página se faltar espaço
      if (y > 240) { doc.addPage(); y = 20; }

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50, 50, 50);
      doc.text('Despesas', margemX, y);
      y += 4;

      const linhasDesp = despesas.map(d => [
        new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        d.descricao || d.nome || '-',
        d.categoria || '-',
        d.fixa ? 'Fixa' : 'Variável',
        brl(d.valor || 0)
      ]);
      linhasDesp.push([
        { content: 'TOTAL', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: brl(totalDespesa), styles: { fontStyle: 'bold' } }
      ]);

      doc.autoTable({
        startY: y,
        head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
        body: linhasDesp,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [229, 115, 115], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 4: { halign: 'right' } }
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // ── Aviso final ───────────────────────────────────────────────
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'italic');
    const aviso = 'Aviso: o imposto exibido é uma ESTIMATIVA com base no % de ' + impPct + '% configurado pelo profissional. ' +
                  'Confirme sempre os cálculos com seu contador. Este relatório é um auxiliar de apuração, não substitui declaração fiscal.';
    const avisoLinhas = doc.splitTextToSize(aviso, 180);
    doc.text(avisoLinhas, margemX, y);

    // Salvar arquivo
    const nomeArquivo = 'relatorio_contador_' + ano + '-' + String(mes).padStart(2,'0') + '.pdf';
    doc.save(nomeArquivo);
    toast('PDF gerado com sucesso: ' + nomeArquivo, 'success', { duration: 3500 });
  }

  function populaSelectMes() {
    const sel = document.getElementById('hist-mes-sel');
    if (!sel || sel.options.length) return;
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const lbl = d.toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = lbl.charAt(0).toUpperCase() + lbl.slice(1);
      if (i === 0) opt.selected = true;
      sel.appendChild(opt);
    }
  }
  function filtrarHist(tipo) {
    histFiltro = tipo;
    ['todos','receitas','despesas'].forEach(t =>
      document.getElementById('filt-'+t)?.classList.toggle('ativo', t === tipo)
    );
    renderHistorico();
  }
  function renderHistorico() {
    const sel = document.getElementById('hist-mes-sel');
    if (!sel) return;
    const [ano, mes] = sel.value.split('-').map(Number);
    const primeiroMes = `${ano}-${String(mes).padStart(2,'0')}-01`;
    const receitas      = JSON.parse(localStorage.getItem(oneU('receitas'))      || '[]');
    const despesas      = JSON.parse(localStorage.getItem(oneU('despesas'))      || '[]');
    const despesasFixas = JSON.parse(localStorage.getItem(oneU('despesasFixas')) || '[]');
    const deMes = item => {
      if (!item.data) return true;
      const d = new Date(item.data+'T00:00:00');
      return d.getFullYear() === ano && d.getMonth() === mes - 1;
    };
    const items = [];
    if (histFiltro !== 'despesas') {
      receitas.filter(deMes).forEach(r => items.push({
        id: r.id, tipo:'receita', nome: r.nome, categoria: r.tipo||r.categoria,
        data: r.data, valor: Number(r.valor)||0, status: r.status
      }));
    }
    if (histFiltro !== 'receitas') {
      despesas.filter(deMes).forEach(d => items.push({
        id: d.id, tipo:'despesa', nome: d.descricao, categoria: d.categoria,
        data: d.data, valor: Number(d.valor)||0, status:'Pago'
      }));
      despesasFixas.forEach(df => items.push({
        id: df.id, tipo:'despesa', nome: df.descricao, categoria: df.categoria||'Fixo',
        data: primeiroMes, valor: Number(df.valor)||0, status:'Fixo'
      }));
    }
    items.sort((a,b) => (b.data||'').localeCompare(a.data||''));
    const totRec  = items.filter(i => i.tipo==='receita').reduce((s,i) => s+i.valor, 0);
    const totDesp = items.filter(i => i.tipo==='despesa').reduce((s,i) => s+i.valor, 0);
    const saldo   = totRec - totDesp;
    document.getElementById('hist-total-rec').textContent  = brl(totRec);
    document.getElementById('hist-total-desp').textContent = brl(totDesp);
    const elS = document.getElementById('hist-total-saldo');
    elS.textContent = brl(saldo);
    elS.className   = 'hist-total-val ' + (saldo >= 0 ? 'val-receita' : 'val-despesa');
    const el = document.getElementById('lista-historico');
    if (!el) return;
    if (!items.length) { el.innerHTML = '<div class="lanc-vazio">Nenhum lançamento neste período</div>'; return; }
    el.innerHTML = items.map(item => {
      const df  = new Date(item.data+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
      const cor = avatarColor(item.categoria);
      const ini = (item.nome||'??').substring(0,2).toUpperCase();
      const sinal = item.tipo==='receita' ? '+ ' : '- ';
      const vc = item.tipo==='receita' ? 'val-receita' : 'val-despesa';
      const tc = item.status==='Fixo' ? 'tag-fixo' : item.status==='Pendente' ? 'tag-pendente' : 'tag-pago';
      const podeEditar = item.status !== 'Fixo';
      const edit = podeEditar
        ? `<button class="btn-icon" onclick="editarItemHist('${item.id}','${item.tipo}')" title="Editar"><i data-lucide="pencil"></i></button>` : '';
      const del = podeEditar
        ? `<button class="btn-icon del" onclick="excluirItemHist('${item.id}','${item.tipo}')" title="Excluir"><i data-lucide="trash-2"></i></button>` : '';
      return `<div class="list-item">
        <div class="lanc-avatar" style="background:${cor};width:32px;height:32px;font-size:11px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;font-weight:700">${escHtml(ini)}</div>
        <div class="list-item-info">
          <div class="list-item-nome">${escHtml(item.nome)}</div>
          <div class="list-item-meta">${escHtml(item.categoria)} · ${df}
            <span class="lanc-tag ${tc}" style="margin-left:4px">${escHtml(item.status)}</span>
          </div>
        </div>
        <div class="list-item-val ${vc}">${sinal}${brl(item.valor)}</div>
        ${edit}
        ${del}
      </div>`;
    }).join('');
    renderIcons();
  }
  function editarItemHist(id, tipo) {
    if (tipo === 'receita') {
      go('receitas');
      setTimeout(() => editarReceita(id), 50);
    } else if (tipo === 'despesa') {
      go('despesas');
      setTimeout(() => editarDespesa(id), 50);
    }
  }
  function excluirItemHist(id, tipo) {
    if (!confirm('Excluir este lançamento?')) return;
    const key = tipo === 'receita' ? 'receitas' : 'despesas';
    localStorage.setItem(key, JSON.stringify(
      JSON.parse(localStorage.getItem(key) || '[]').filter(i => i.id !== id)
    ));
    renderHistorico();
    atualizarHome();
  }

  /* ── Agenda: mostrar/ocultar campo valor por tipo ─────────────── */
  function toggleValorAgenda() {
    const tipo  = document.getElementById('c-tipo')?.value || '';
    const grupo = document.getElementById('c-valor-group');
    if (grupo) grupo.style.display = tipo === 'Atendimento' ? '' : 'none';
  }

  /* ── Agenda semanal ─────────────────────────────────────────────── */
  let agSemanaOffset = 0;

  function agNavegar(delta) {
    agSemanaOffset += delta;
    renderAgendaSemanal();
  }

  function renderAgendaSemanal() {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const hojeStr = toDateStr(hoje);
    const compromissos = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]');

    const dom = new Date(hoje);
    dom.setDate(hoje.getDate() - hoje.getDay() + agSemanaOffset * 7);
    const fim = new Date(dom); fim.setDate(dom.getDate() + 6);

    const lbl = document.getElementById('ag-semana-label');
    if (lbl) lbl.textContent =
      dom.toLocaleDateString('pt-BR', {day:'numeric', month:'short'}) + ' – ' +
      fim.toLocaleDateString('pt-BR', {day:'numeric', month:'short', year:'numeric'});

    const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const grid = document.getElementById('agenda-grid-semanal');
    if (!grid) return;

    grid.innerHTML = DIAS.map((nome, i) => {
      const d = new Date(dom);
      d.setDate(dom.getDate() + i);
      const ds = toDateStr(d);
      const isHoje = ds === hojeStr;
      const doDia = compromissos
        .filter(c => c.data === ds)
        .sort((a,b) => (a.hora||'').localeCompare(b.hora||''));

      const cards = doDia.map(c => {
        const cor = corBarraTipo(c.tipo);
        const realizado = !!c.realizado;
        // Se realizado, sobrepoe estilos com tom verde
        const bg  = realizado
          ? '#EAF7E8'
          : (cor === '#7FA88E' ? '#E8D5F5' :
             cor === '#7B9BC8' ? '#D5E8F5' : '#EBEBEB');
        const borderColor = realizado ? '#4CAF50' : cor;
        const txtCor = realizado ? '#2E7D32' : (cor === '#999' ? '#555' : cor);
        const valorTxt = (c.tipo === 'Atendimento' && Number(c.valor) > 0)
          ? `<div class="agenda-comp-tipo" style="font-weight:700;opacity:1">${realizado ? '+' : ''}${brl(c.valor)}</div>` : '';
        const checkBadge = realizado
          ? `<div style="position:absolute;top:6px;right:6px;background:#4CAF50;color:#fff;border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center" title="Atendimento realizado">
              <i data-lucide="check" style="width:11px;height:11px;stroke-width:3"></i>
            </div>` : '';
        return `<div class="agenda-comp-card" style="background:${bg};border-color:${borderColor};color:${txtCor};position:relative">
          ${checkBadge}
          <div class="agenda-comp-hora">${escHtml(c.hora||'--:--')}</div>
          <div class="agenda-comp-nome">${escHtml(c.nome||c.descricao||'Compromisso')}</div>
          <div class="agenda-comp-tipo">${escHtml(c.tipo||'Atendimento')}</div>
          ${valorTxt}
        </div>`;
      }).join('');

      return `<div class="agenda-col-dia${isHoje?' hoje-col':''}">
        <div class="agenda-col-header">
          <div class="agenda-col-nome">${nome}</div>
          <div class="agenda-col-num">${d.getDate()}</div>
        </div>
        <div class="agenda-col-body">${cards}</div>
      </div>`;
    }).join('');
    renderIcons();
  }

  function abrirModalNovoComp() {
    const m = document.getElementById('modal-novo-comp');
    if (m) { m.style.display = 'flex'; toggleValorAgenda(); }
    renderIcons();
  }
  function fecharModalNovoComp() {
    const m = document.getElementById('modal-novo-comp');
    if (m) m.style.display = 'none';
    // Reseta modo edicao quando fecha
    editandoCompromissoId = null;
    const tit = document.getElementById('modal-comp-titulo');
    if (tit) tit.textContent = 'Novo Compromisso';
    const btn = document.getElementById('modal-comp-btn-salvar');
    if (btn) btn.textContent = 'Salvar Compromisso';
  }

  /* ── Modal Em breve ────────────────────────────────────────────── */
  function abrirModalEmBreve(nome) {
    document.getElementById('modal-em-breve-titulo').textContent = nome;
    const modal = document.getElementById('modal-em-breve');
    modal.style.display = 'flex';
    closeDrawer();
    renderIcons();
  }

  function fecharModalEmBreve() {
    document.getElementById('modal-em-breve').style.display = 'none';
  }

  document.addEventListener('click', function(e) {
    const modal = document.getElementById('modal-em-breve');
    if (e.target === modal) fecharModalEmBreve();
  });

  /* ── Storytelling ──────────────────────────────────────────────── */
  function abrirStory() {
    document.getElementById('story-screen').classList.add('aberto');
    closeDrawer();
    renderIcons();
  }
  function fecharStory() {
    document.getElementById('story-screen').classList.remove('aberto');
  }

  /* ── Reset demo ────────────────────────────────────────────────── */
  function resetarDados() {
    if (!souFamilia()) { toast('Esta opção é exclusiva para a Família.', 'error'); return; }
    if (!confirm('Resetar todos os dados para o estado inicial de demonstração?\n\nEsta ação apaga tudo que foi cadastrado.')) return;
    // Multi-tenant: limpa só as chaves DESTE usuário (preserva auth do Supabase e dados de outros usuários)
    var uid = (window.authUser && window.authUser.id) ? window.authUser.id : 'anon';
    var prefixo = 'u_' + uid + '_';
    var chavesPraRemover = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(prefixo) === 0) chavesPraRemover.push(k);
    }
    chavesPraRemover.forEach(function(k){ localStorage.removeItem(k); });
    closeDrawer();
    location.reload();
  }

  /* ── Boot ───────────────────────────────────────────────────── */
  function boot() {
    maybeInit();
    const hoje = hojeISO();
    ['r-data','d-data','c-data'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = hoje;
    });
    renderDataHoje();
    renderCardFinanceiro();
    renderCardAgenda();
    renderLancamentos();
    renderAgendaHome();
    renderAgendaSemanal();
    renderCerebro();
    toggleValorAgenda();
    const hash = location.hash.replace('#', '');
    if (hash === 'one') { go('one'); }
    else if (TELAS.includes(hash)) go(hash);
    // Render dos icones Lucide — espera pequeno tick caso a lib carregue depois
    renderIcons();
    setTimeout(renderIcons, 80);
    setTimeout(renderIcons, 400);
  }

  // O script Lucide tem `defer`. Garantimos boot apos DOM carregado.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

/* =====================================================
   SCREEN ONE — Chat | Agenda | Financeiro
   ===================================================== */
function renderOneGreeting() {
  var el = document.getElementById('one-greeting-text');
  if (!el) return;
  var now = new Date();
  var dias = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
  var meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  var hh = String(now.getHours()).padStart(2,'0');
  var mm = String(now.getMinutes()).padStart(2,'0');
  el.textContent = 'Luciano, ' + hh + ':' + mm + ' · ' + dias[now.getDay()] + ', ' + now.getDate() + ' de ' + meses[now.getMonth()];
}

/* ── Pinah Chat — estado e helpers ──────────────────────────
 * pinahHistory: histórico de mensagens enviado ao endpoint a cada turno.
 * pinahAddBubble: cria bolha no DOM e retorna o elemento (pra streaming).
 * pinahRenderText: markdown mínimo (bold, italic, quebras).
 * pinahGetContext: serializa dados do user do localStorage.
 * pinahEnviar: orquestra envio + stream SSE.
 */
var pinahHistory = [];
var __pinahMicControle = null;

function pinahRenderText(texto) {
  return String(texto)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function pinahAddBubble(role, texto) {
  var msgs = document.getElementById('pinah-msgs');
  if (!msgs) return null;

  var bubble = document.createElement('div');
  bubble.className = 'pinah-bubble pinah-bubble-' + role;
  if (texto) bubble.innerHTML = pinahRenderText(texto);

  if (role === 'pinah') {
    var wrap = document.createElement('div');
    wrap.className = 'pinah-bubble-wrap';
    var avatar = document.createElement('img');
    avatar.src = 'assets/icons/pinah-avatar.png';
    avatar.className = 'pinah-bubble-avatar';
    avatar.alt = 'Pinah';
    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    msgs.appendChild(wrap);
  } else {
    msgs.appendChild(bubble);
  }

  msgs.scrollTop = msgs.scrollHeight;
  return bubble;
}

function pinahGetContext() {
  if (!window.authUser) return {};
  var id = window.authUser.id || 'anon';
  function get(k) {
    try { return JSON.parse(localStorage.getItem('u_' + id + '_' + k) || '[]'); }
    catch (e) { return []; }
  }
  // Lê áreas existentes do kanban de tarefas — Pinah precisa saber quais
  // estão disponíveis pra atribuir corretamente (tarefa precisa de área).
  var areasTarefas = [];
  try {
    var raw = localStorage.getItem('u_' + id + '_tarefas_areas');
    if (raw) areasTarefas = JSON.parse(raw) || [];
  } catch (e) {}
  return {
    compromissos: get('compromissos'),
    tarefas:      get('tarefas'),
    areas_tarefas: areasTarefas,
    receitas:     get('receitas'),
    despesas:     get('despesas'),
    notas_cerebro: get('notas_cerebro').slice(-50).map(function(n) {
      return {
        id:        n.id,
        titulo:    n.titulo,
        categoria: n.categoria,
        tags:      n.tags,
        criadoEm:  n.criadoEm,
        /* Preview expandido pra 600 chars: dá mais base pra Pinah decidir se
           precisa abrir a nota inteira via ler_nota. 200 era curto demais
           pra PDFs longos e a Pinah respondia vago. */
        preview:   String(n.conteudo || '').slice(0, 600)
      };
    })
  };
}

function pinahLimpar() {
  pinahHistory = [];
  var msgs    = document.getElementById('pinah-msgs');
  var welcome = document.getElementById('pinah-welcome');
  var clearRow = document.getElementById('pinah-clear-row');
  if (msgs)    { msgs.innerHTML = ''; msgs.hidden = true; }
  if (welcome) welcome.hidden = false;
  if (clearRow) clearRow.hidden = true;
}

/* ─── Executores de ferramentas da Pinah ─────────────────────────────
   Chamados quando o backend emite { tool, input } no stream SSE.
   Escrevem no localStorage e disparam re-render dos painéis afetados.
   ──────────────────────────────────────────────────────────────────── */

function pinahExecutarTool(nome, input) {
  console.log('[Pinah] executar tool:', nome, input);
  switch (nome) {
    case 'criar_compromisso':   pinahCriarCompromisso(input);   break;
    case 'criar_tarefa':        pinahCriarTarefa(input);        break;
    case 'registrar_transacao': pinahRegistrarTransacao(input); break;
    case 'criar_nota':          pinahCriarNota(input);          break;
    /* Tools de leitura: não modificam estado, só consultam.
       O resultado é retornado pra pinahEnviar via pinahExecutarToolLeitura(). */
    case 'buscar_nota':         break; // tratado em pinahEnviar via pinahExecutarToolLeitura
    case 'ler_nota':            break;
    default: console.warn('[Pinah] tool desconhecida:', nome);
  }
}

/* ─── Tools de LEITURA — retornam dados pra Pinah usar na resposta ─────
   (P028) Estas tools não escrevem nada. São consultadas pelo pinahEnviar
   pra montar um tool_result que volta pra Pinah numa segunda chamada,
   permitindo que ela responda com base nas notas encontradas.
   ──────────────────────────────────────────────────────────────────── */

function pinahExecutarToolLeitura(nome, input) {
  switch (nome) {
    case 'buscar_nota': return pinahBuscarNotaLocal(input.termo || '', input.max || 3);
    case 'ler_nota':    return pinahLerNotaLocal(input.identificador || '');
    default: return { erro: 'tool de leitura desconhecida: ' + nome };
  }
}

function pinahBuscarNotaLocal(termo, max) {
  var notas = _pinahGetSet('notas_cerebro').get();
  var t = String(termo || '').toLowerCase().trim();
  if (!t) return { encontradas: 0, notas: [], aviso: 'Termo de busca vazio.' };

  var bate = notas.filter(function(n) {
    var titulo    = String(n.titulo    || '').toLowerCase();
    var conteudo  = String(n.conteudo  || '').toLowerCase();
    var categoria = String(n.categoria || '').toLowerCase();
    var tags      = (Array.isArray(n.tags) ? n.tags : []).join(' ').toLowerCase();
    return titulo.indexOf(t) !== -1
        || conteudo.indexOf(t) !== -1
        || categoria.indexOf(t) !== -1
        || tags.indexOf(t) !== -1;
  });

  /* Ordena por data desc (mais recente primeiro) e limita */
  bate.sort(function(a, b) { return String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')); });
  var top = bate.slice(0, Math.max(1, Math.min(max || 3, 10)));

  return {
    encontradas: bate.length,
    retornadas:  top.length,
    notas: top.map(function(n) {
      return {
        id:        n.id,
        titulo:    n.titulo,
        categoria: n.categoria,
        tags:      n.tags,
        criadoEm:  n.criadoEm,
        conteudo:  String(n.conteudo || '')
      };
    })
  };
}

function pinahLerNotaLocal(identificador) {
  var notas = _pinahGetSet('notas_cerebro').get();
  var ident = String(identificador || '').toLowerCase().trim();
  if (!ident) return { erro: 'Identificador vazio.' };

  /* Tenta por id exato primeiro */
  var nota = notas.find(function(n) { return String(n.id || '').toLowerCase() === ident; });
  /* Se não achou, tenta trecho do título (case-insensitive) */
  if (!nota) {
    nota = notas.find(function(n) {
      return String(n.titulo || '').toLowerCase().indexOf(ident) !== -1;
    });
  }
  if (!nota) return { erro: 'Nota não encontrada com identificador: ' + identificador };

  return {
    id:        nota.id,
    titulo:    nota.titulo,
    categoria: nota.categoria,
    tags:      nota.tags,
    criadoEm:  nota.criadoEm,
    conteudo:  String(nota.conteudo || '')
  };
}

/* Fix A + B (16/05/2026):
   Quando a Pinah dispara uma tool, o stream SSE normalmente encerra logo após —
   então o texto que ela ia escrever fica cortado ("Salvando já!" em vez de
   "✓ Nota salva: [título]"). Esta função injeta uma bolha visível de confirmação
   no chat (Fix A) e registra uma memória implícita no pinahHistory (Fix B) pra
   que a Pinah lembre nas próximas mensagens o que ela já salvou. */
/* Detecta o contexto de tela ativa. Retorna 'agenda', 'tarefas', etc., ou
   null se o chat está visível (ou nenhum painel detectado).
   Usado pra: (a) filtrar tools no backend; (b) decidir entre balão fugaz
   e fallback pro chat principal.
   Mobile (< 900px): olha o slide ativo do carrossel.
   Desktop: olha o painel data-panel visível dentro do main. */
function pinahDetectarContexto() {
  if (window.innerWidth < 900) {
    var wrap = document.getElementById('one-screens-wrap');
    if (wrap && wrap.offsetWidth) {
      var idx = Math.round(wrap.scrollLeft / wrap.offsetWidth);
      var mapaMob = ['chat', 'agenda', 'financeiro', 'tarefas', 'biblioteca'];
      var ctxMob = mapaMob[idx];
      return (ctxMob && ctxMob !== 'chat') ? ctxMob : null;
    }
    return null;
  }
  var chatPanel = document.querySelector('.one-desktop-main > [data-panel="chat"]:not([hidden])');
  if (chatPanel) return null;
  var paineis = ['agenda', 'tarefas', 'financeiro', 'biblioteca', 'fiscal'];
  for (var i = 0; i < paineis.length; i++) {
    if (document.querySelector('.one-desktop-main > [data-panel="' + paineis[i] + '"]:not([hidden])')) {
      return paineis[i];
    }
  }
  return null;
}

/* Mostra um balão fugaz com texto curto. Some em 4s.
   Desktop: usa #one-pinah-balao (à direita do prompt).
   Mobile:  usa #one-pinah-balao-mob (em cima do prompt fixo). */
function pinahMostrarBalao(html) {
  var ehMobile = window.innerWidth < 900;
  var balao = document.getElementById(ehMobile ? 'one-pinah-balao-mob' : 'one-pinah-balao');
  var span  = document.getElementById(ehMobile ? 'one-pinah-balao-mob-texto' : 'one-pinah-balao-texto');
  if (!balao || !span) return;
  span.innerHTML = html;
  balao.hidden = false;
  balao.classList.remove('saindo');
  // Reinicia animação de entrada
  balao.style.animation = 'none';
  // eslint-disable-next-line no-unused-expressions
  balao.offsetHeight;
  balao.style.animation = '';
  if (balao._timer) clearTimeout(balao._timer);
  balao._timer = setTimeout(function() {
    balao.classList.add('saindo');
    setTimeout(function() {
      balao.hidden = true;
      balao.classList.remove('saindo');
    }, 350);
  }, 4000);
}

function pinahFeedbackTool(nome, input, ctx) {
  ctx = ctx || {};

  /* (P028) Tools de LEITURA não geram bolha de "✅ feito" — a resposta real
     da Pinah vem na segunda chamada (com base no tool_result). Só
     mostramos um indicador discreto de "estou procurando". */
  if (nome === 'buscar_nota' || nome === 'ler_nota') {
    var msg = nome === 'buscar_nota'
      ? '🔍 Procurando: *' + (input.termo || '') + '*'
      : '📖 Lendo: *' + (input.identificador || '') + '*';
    if (ctx.emChat) {
      pinahAddBubble('pinah', msg);
    } else if (ctx.isMobile && ctx.msgsMob) {
      var b = document.createElement('div');
      b.className = 'chat-bubble pinah-bubble';
      b.innerHTML = pinahRenderText(msg);
      ctx.msgsMob.appendChild(b);
      ctx.msgsMob.scrollTop = ctx.msgsMob.scrollHeight;
    }
    return;
  }

  function brl(v) { return 'R$ ' + (Number(v)||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'); }
  function dataBR(iso) {
    if (!iso || iso.length < 10) return iso || '';
    var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0];
  }

  var visivel = '';   // texto que aparece na bolha (markdown leve)
  var memoria = '';   // texto que entra no pinahHistory (limpo, sem markdown)
  switch (nome) {
    case 'criar_nota':
      var titN = input.titulo || 'Nota';
      visivel = '✅ Salvei a nota **' + titN + '** no Biblioteca da Pinah.';
      memoria = 'Salvei a nota "' + titN + '" no Biblioteca da Pinah.' + (input.categoria ? ' Categoria: ' + input.categoria + '.' : '');
      break;
    case 'criar_compromisso':
      var partes = [];
      if (input.nome) partes.push(input.nome);
      if (input.data) partes.push(dataBR(input.data));
      if (input.hora) partes.push('às ' + input.hora);
      var labelC = partes.join(' · ');
      visivel = '✅ Compromisso marcado: **' + labelC + '**.';
      memoria = 'Criei compromisso: ' + labelC + (input.tipo ? ' (' + input.tipo + ')' : '') + '.';
      break;
    case 'criar_tarefa':
      var titT = input.titulo || 'Tarefa';
      visivel = '✅ Tarefa criada: **' + titT + '**' + (input.area ? ' (' + input.area + ')' : '') + '.';
      memoria = 'Criei tarefa: "' + titT + '"' + (input.area ? ' na área ' + input.area : '') + (input.prioridade ? ', prioridade ' + input.prioridade : '') + '.';
      break;
    case 'registrar_transacao':
      var rotulo = input.tipo === 'receita' ? 'Receita' : 'Despesa';
      visivel = '✅ ' + rotulo + ' registrada: **' + brl(input.valor) + '** — ' + (input.descricao || '');
      memoria = rotulo + ' registrada: ' + brl(input.valor) + ' (' + (input.descricao || '') + ')' + (input.categoria ? ', categoria ' + input.categoria : '') + '.';
      break;
    default: return;
  }

  /* Fix A — bolha visual no chat.
     Ordem: chat desktop > funcionalidade (balão fugaz, mobile ou desktop) >
            chat mobile aberto > toast genérico. Prioriza o balão fugaz
            quando o usuário está dentro de uma funcionalidade, mesmo no mobile. */
  if (ctx.emChat) {
    pinahAddBubble('pinah', visivel);
  } else if (pinahDetectarContexto()) {
    /* Dentro de uma funcionalidade (Agenda/Tarefas/etc): balão fugaz
       (desktop = à direita do prompt; mobile = acima do prompt fixo). */
    pinahMostrarBalao(pinahRenderText(visivel));
  } else if (ctx.isMobile && ctx.msgsMob) {
    /* Mobile no slide chat: bolha no histórico do chat mobile. */
    var b = document.createElement('div');
    b.className = 'chat-bubble pinah-bubble';
    b.innerHTML = pinahRenderText(visivel);
    ctx.msgsMob.appendChild(b);
    ctx.msgsMob.scrollTop = ctx.msgsMob.scrollHeight;
  } else if (typeof window.toast === 'function') {
    /* Fallback (sem contexto identificado): toast tradicional */
    window.toast(visivel.replace(/\*\*/g, ''), null, { duration: 5000 });
  }

  /* Fix B — memória implícita no histórico (Pinah "lembra" o que salvou) */
  if (typeof pinahHistory !== 'undefined' && Array.isArray(pinahHistory)) {
    pinahHistory.push({ role: 'assistant', content: '(' + memoria + ')' });
  }
}

function pinahCriarNota(input) {
  var store = _pinahGetSet('notas_cerebro');
  var lista = store.get();
  var novo = {
    id:        (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
    titulo:    input.titulo    || 'Nota importada',
    conteudo:  input.conteudo  || '',
    categoria: input.categoria || 'artigos',
    tags:      Array.isArray(input.tags) ? input.tags : [],
    criadoEm:  new Date().toISOString(),
    dataModificacao: new Date().toISOString()
  };
  lista.push(novo);
  store.set(lista);
  supaUpsert('notas_cerebro', novo);
  // Re-render do Biblioteca da Pinah se estiver visível
  if (typeof renderCerebro === 'function') renderCerebro();
  if (typeof renderNotasCerebro === 'function') renderNotasCerebro();
}

function _pinahGetSet(chave) {
  // Helper: lê/escreve chave do usuário atual
  var uid = (window.authUser && window.authUser.id) ? window.authUser.id : 'anon';
  var prefixo = 'u_' + uid + '_';
  return {
    get: function() {
      try { return JSON.parse(localStorage.getItem(prefixo + chave) || '[]'); }
      catch(e) { return []; }
    },
    set: function(v) {
      localStorage.setItem(prefixo + chave, JSON.stringify(v));
    }
  };
}

/* ═══════════════════════════════════════════════════════════════════
   CAMADA SUPABASE — sincronização local-first
   Estratégia: localStorage imediato → async push/pull Supabase
   ═══════════════════════════════════════════════════════════════════ */

const SUPA_TABLES = {
  receitas:       'receitas',
  despesas:       'despesas',
  despesas_fixas: 'despesas_fixas',
  receitas_fixas: 'receitas_fixas',
  compromissos:   'compromissos',
  tarefas:        'tarefas',
  notas_cerebro:  'notas',
  contas:         'contas'
};

/* Aliases de localKey: o app usa camelCase no localStorage (despesasFixas,
   receitasFixas), mas SUPA_TABLES usa snake_case (despesas_fixas). Sem essa
   normalização, supaUpsert/supaDelete com a key camelCase nunca acham a
   tabela e o save da fixa cai em silêncio. */
const SUPA_ALIAS = {
  despesasFixas: 'despesas_fixas',
  receitasFixas: 'receitas_fixas'   // tabela ainda não criada no Supa — fica como "sem alvo"
};
function _supaNormalizeKey(localKey) {
  return SUPA_ALIAS[localKey] || localKey;
}

/* supaSync itera as chaves de SUPA_TABLES (snake_case) e usa a mesma string
   como sufixo do localStorage. As fixas, porém, vivem em camelCase no app
   (despesasFixas/receitasFixas). Sem traduzir, o pull gravaria/leria em
   u_<id>_despesas_fixas (snake) — chave que o resto do app nunca toca, então
   as fixas vindas do servidor ficavam invisíveis. */
const SUPA_LOCAL_KEY = {
  despesas_fixas: 'despesasFixas',
  receitas_fixas: 'receitasFixas'
};
function _supaLocalKey(localKey) {
  return SUPA_LOCAL_KEY[localKey] || localKey;
}

/* Mapeia item localStorage → row Supabase */
function _supaMapToRow(localKey, item, userId) {
  var base = { user_id: userId };
  switch (localKey) {
    case 'receitas':
      return Object.assign(base, {
        id:              item.id,
        nome:            item.nome || item.descricao || '',
        valor:           item.valor || 0,
        data:            item.data || new Date().toISOString().slice(0,10),
        categoria:       item.categoria || '',
        tipo:            item.tipo || 'receita',
        status:          item.status || 'pendente',
        forma_pagamento: item.forma_pagamento || item.formaPagamento || '',
        conta_id:        item.contaId || null
      });
    case 'despesas':
      return Object.assign(base, {
        id:             item.id,
        descricao:      item.descricao || item.nome || '',
        valor:          item.valor || 0,
        data:           item.data || new Date().toISOString().slice(0,10),
        categoria:      item.categoria || '',
        conta_id:       item.contaId || null,
        fatura_mes_ano: item.faturaMesAno || null,
        status:         item.status || null,
        lote_id:        item.loteId || null,
        parcela_atual:  item.parcelaAtual || null,
        parcelas_total: item.parcelasTotal || null,
        recorrencia:    item.recorrencia || null
      });
    case 'compromissos':
      return Object.assign(base, {
        id:        item.id,
        nome:      item.nome || item.descricao || '',
        descricao: item.descricao || item.nome || '',
        data:      item.data || '',
        hora:      item.hora || '',
        tipo:      item.tipo || 'atendimento',
        duracao:   item.duracao || 60,
        valor:     item.valor || null,
        status:    item.status || 'agendado',
        realizado: item.realizado || false
      });
    case 'tarefas':
      return Object.assign(base, {
        id:         item.id,
        titulo:     item.titulo || item.nome || '',
        area:       item.area || null,
        prioridade: (item.prioridade || 'normal').toLowerCase(),
        prazo:      item.prazo || item.data || null,
        status:     item.concluida ? 'concluida' : (item.status || 'aberta')
      });
    case 'notas_cerebro':
      return Object.assign(base, {
        id:         item.id,
        titulo:     item.titulo || '',
        conteudo:   item.conteudo || '',
        categoria:  item.categoria || 'outros',
        paciente:   item.paciente || '',
        tags:       Array.isArray(item.tags) ? item.tags : [],
        created_at: item.criadoEm || item.data || new Date().toISOString(),
        updated_at: item.dataModificacao || new Date().toISOString()
      });
    case 'despesas_fixas':
      return Object.assign(base, {
        id:            item.id,
        descricao:     item.descricao || '',
        categoria:     item.categoria || 'Outros',
        valor:         Number(item.valor) || 0,
        nome:          item.nome || '',
        dia_do_mes:    item.diaDoMes || null,
        inicio:        item.inicio || null,
        fim:           item.fim || null,
        meses_pulados: Array.isArray(item.mesesPulados) ? item.mesesPulados : [],
        conta_id:      item.contaId || null,
        pago_por_mes:  (item.pagoPorMes && typeof item.pagoPorMes === 'object') ? item.pagoPorMes : {},
        valor_por_mes: (item.valorPorMes && typeof item.valorPorMes === 'object') ? item.valorPorMes : {}
      });
    case 'receitas_fixas':
      return Object.assign(base, {
        id:            item.id,
        descricao:     item.descricao || '',
        categoria:     item.categoria || 'Outros',
        valor:         Number(item.valor) || 0,
        nome:          item.nome || '',
        dia_do_mes:    item.diaDoMes || null,
        inicio:        item.inicio || null,
        fim:           item.fim || null,
        meses_pulados: Array.isArray(item.mesesPulados) ? item.mesesPulados : [],
        conta_id:      item.contaId || null,
        pago_por_mes:  (item.pagoPorMes && typeof item.pagoPorMes === 'object') ? item.pagoPorMes : {},
        valor_por_mes: (item.valorPorMes && typeof item.valorPorMes === 'object') ? item.valorPorMes : {}
      });
    case 'contas':
      return Object.assign(base, {
        id:                     item.id,
        nome:                   item.nome || '',
        tipo:                   item.tipo || 'banco',
        icone:                  item.icone || '',
        cor:                    item.cor || '',
        saldo_inicial:          Number(item.saldoInicial) || 0,
        dia_fechamento:         item.diaFechamento || null,
        dia_vencimento:         item.diaVencimento || null,
        saldo:                  Number(item.saldo) || 0,
        faturas_pagas:          Array.isArray(item.faturasPagas) ? item.faturasPagas : [],
        faturas_pagas_detalhe: (item.faturasPagasDetalhe && typeof item.faturasPagasDetalhe === 'object') ? item.faturasPagasDetalhe : {},
        meses_fechados:         Array.isArray(item.mesesFechados) ? item.mesesFechados : []
      });
    default:
      return Object.assign(base, item);
  }
}

/* Mapeia row Supabase → item localStorage */
function _supaMapFromRow(localKey, row) {
  switch (localKey) {
    case 'receitas':
      return {
        id:              row.id,
        nome:            row.nome || '',
        descricao:       row.nome || '',
        valor:           row.valor || 0,
        data:            row.data || '',
        categoria:       row.categoria || '',
        tipo:            row.tipo || 'receita',
        status:          row.status || '',
        forma_pagamento: row.forma_pagamento || '',
        formaPagamento:  row.forma_pagamento || '',
        contaId:         row.conta_id || '',
        criadoEm:        row.created_at || ''
      };
    case 'despesas':
      return {
        id:            row.id,
        descricao:     row.descricao || '',
        nome:          row.descricao || '',
        valor:         row.valor || 0,
        data:          row.data || '',
        categoria:     row.categoria || '',
        tipo:          row.tipo || 'despesa',
        status:        row.status || '',
        contaId:       row.conta_id || '',
        faturaMesAno:  row.fatura_mes_ano || null,
        loteId:        row.lote_id || null,
        parcelaAtual:  row.parcela_atual || null,
        parcelasTotal: row.parcelas_total || null,
        recorrencia:   row.recorrencia || '',
        criadoEm:      row.created_at || ''
      };
    case 'despesas_fixas':
      return {
        id:           row.id,
        nome:         row.nome || row.descricao || '',
        descricao:    row.descricao || row.nome || '',
        categoria:    row.categoria || '',
        valor:        Number(row.valor) || 0,
        tipo:         'despesa',
        recorrencia:  'fixa',
        diaDoMes:     row.dia_do_mes || null,
        inicio:       row.inicio || null,
        fim:          row.fim || null,
        /* [] do servidor = "nenhum mês pulado" → null, pra o merge defensivo
           preservar o mesesPulados local (senão um sync que chega antes do
           upsert do molde commitar zera o "pulo" e a projeção volta a duplicar). */
        mesesPulados: (Array.isArray(row.meses_pulados) && row.meses_pulados.length > 0) ? row.meses_pulados : null,
        contaId:      row.conta_id || '',
        /* {} do servidor = "sem pagamento" → null, pra o merge defensivo
           preservar o pagoPorMes local em vez de zerar o recebido. */
        pagoPorMes:   (row.pago_por_mes && typeof row.pago_por_mes === 'object' && Object.keys(row.pago_por_mes).length > 0) ? row.pago_por_mes : null,
        /* {} do servidor = "sem override" → null, mesma blindagem do pagoPorMes:
           preserva o valorPorMes local (override de valor por mês). */
        valorPorMes:  (row.valor_por_mes && typeof row.valor_por_mes === 'object' && Object.keys(row.valor_por_mes).length > 0) ? row.valor_por_mes : null,
        criadoEm:     row.created_at || ''
      };
    case 'receitas_fixas':
      return {
        id:           row.id,
        nome:         row.nome || row.descricao || '',
        descricao:    row.descricao || row.nome || '',
        categoria:    row.categoria || '',
        valor:        Number(row.valor) || 0,
        tipo:         'receita',
        recorrencia:  'fixa',
        diaDoMes:     row.dia_do_mes || null,
        inicio:       row.inicio || null,
        fim:          row.fim || null,
        /* [] do servidor = "nenhum mês pulado" → null, pra o merge defensivo
           preservar o mesesPulados local (senão um sync que chega antes do
           upsert do molde commitar zera o "pulo" e a projeção volta a duplicar). */
        mesesPulados: (Array.isArray(row.meses_pulados) && row.meses_pulados.length > 0) ? row.meses_pulados : null,
        contaId:      row.conta_id || '',
        /* {} do servidor = "sem pagamento" → null, pra o merge defensivo
           preservar o pagoPorMes local em vez de zerar o recebido. */
        pagoPorMes:   (row.pago_por_mes && typeof row.pago_por_mes === 'object' && Object.keys(row.pago_por_mes).length > 0) ? row.pago_por_mes : null,
        /* {} do servidor = "sem override" → null, mesma blindagem do pagoPorMes:
           preserva o valorPorMes local (override de valor por mês). */
        valorPorMes:  (row.valor_por_mes && typeof row.valor_por_mes === 'object' && Object.keys(row.valor_por_mes).length > 0) ? row.valor_por_mes : null,
        criadoEm:     row.created_at || ''
      };
    case 'compromissos':
      return {
        id:        row.id,
        nome:      row.nome || '',
        descricao: row.descricao || row.nome || '',
        data:      row.data || '',
        hora:      row.hora || '',
        tipo:      row.tipo || 'atendimento',
        duracao:   row.duracao || 60,
        valor:     row.valor || null,
        status:    row.status || 'agendado',
        realizado: row.realizado || false
      };
    case 'tarefas':
      return {
        id:         row.id,
        titulo:     row.titulo || '',
        nome:       row.titulo || '',
        area:       row.area || null,
        prioridade: row.prioridade || 'normal',
        prazo:      row.prazo || null,
        data:       row.prazo || null,
        status:     row.status || 'aberta',
        concluida:  row.status === 'concluida',
        criadoEm:   row.criado_em || ''
      };
    case 'notas_cerebro':
      return {
        id:              row.id,
        titulo:          row.titulo || '',
        conteudo:        row.conteudo || '',
        categoria:       row.categoria || 'outros',
        paciente:        row.paciente || '',
        tags:            Array.isArray(row.tags) ? row.tags : [],
        data:            row.created_at || '',
        criadoEm:        row.created_at || '',
        dataModificacao: row.updated_at || ''
      };
    case 'contas':
      return {
        id:                 row.id,
        nome:               row.nome || '',
        tipo:               row.tipo || 'banco',
        icone:              row.icone || '',
        cor:                row.cor || '',
        saldoInicial:       Number(row.saldo_inicial) || 0,
        diaFechamento:      row.dia_fechamento || null,
        diaVencimento:      row.dia_vencimento || null,
        saldo:              Number(row.saldo) || 0,
        faturasPagas:       Array.isArray(row.faturas_pagas) ? row.faturas_pagas : [],
        faturasPagasDetalhe: (row.faturas_pagas_detalhe && typeof row.faturas_pagas_detalhe === 'object') ? row.faturas_pagas_detalhe : {},
        mesesFechados:      Array.isArray(row.meses_fechados) ? row.meses_fechados : [],
        criadoEm:           row.created_at || ''
      };
    default:
      return row;
  }
}

/* Campos que o servidor Supabase atualmente NÃO tem coluna, mas que o app
   precisa preservar no localStorage. Sem isso, supaSync sobrescreve o local
   e perde contaId/faturaMesAno em cada reload — quebrando a vinculação de
   lançamentos a cartões. Patch defensivo até as colunas serem adicionadas
   no schema do Supabase (próxima sessão). */
var SUPA_CAMPOS_LOCAIS = {
  receitas:       ['contaId', 'status'],
  despesas:       ['contaId', 'faturaMesAno', 'loteId', 'parcelaAtual', 'parcelasTotal', 'recorrencia', 'status'],
  despesas_fixas: ['nome', 'diaDoMes', 'inicio', 'fim', 'mesesPulados', 'contaId', 'pagoPorMes', 'valorPorMes'],
  receitas_fixas: ['nome', 'diaDoMes', 'inicio', 'fim', 'mesesPulados', 'contaId', 'pagoPorMes', 'valorPorMes'],
  compromissos:   [],
  tarefas:        [],
  notas_cerebro:  []
};

/* Busca todos os dados do Supabase e popula localStorage do usuário atual.
   Faz merge defensivo: preserva campos local-only listados em SUPA_CAMPOS_LOCAIS
   quando o servidor não devolve o valor. Isso evita perder contaId/faturaMesAno
   em cada reload enquanto o schema do Supabase ainda não cobre essas colunas. */
async function supaSync() {
  if (!window.supa || !window.authUser) return;
  var userId = window.authUser.id;
  var prefix = 'u_' + userId + '_';
  var localKeys = Object.keys(SUPA_TABLES);
  try {
    await Promise.all(localKeys.map(async function(localKey) {
      var tabela = SUPA_TABLES[localKey];
      try {
        var result = await window.supa.from(tabela).select('*').eq('user_id', userId);
        if (result.error) {
          console.warn('[supaSync] Erro na tabela', tabela, result.error.message);
          return;
        }
        var rows = result.data || [];
        var itensServer = rows.map(function(row) {
          var it = _supaMapFromRow(localKey, row);
          it._synced = true; // veio do servidor → já passou pela sincronização
          return it;
        });
        var lsKey = _supaLocalKey(localKey); // fixas vivem em camelCase no localStorage
        var itensLocal = [];
        try { itensLocal = JSON.parse(localStorage.getItem(prefix + lsKey) || '[]'); } catch(e) {}
        var camposLocais = SUPA_CAMPOS_LOCAIS[localKey] || [];
        /* Indexa local por id pra merge rápido */
        var idxLocal = {};
        itensLocal.forEach(function(l){ if (l && l.id) idxLocal[l.id] = l; });
        /* Merge: pra cada item do server, preserva campos locais que o server
           não devolveu (ou veio vazio) — mas só os campos listados em
           SUPA_CAMPOS_LOCAIS. Campos cobertos pelo mapper são autoritativos. */
        var merged = itensServer.map(function(srv){
          var loc = idxLocal[srv.id];
          if (!loc) return srv;
          camposLocais.forEach(function(k){
            if ((srv[k] === undefined || srv[k] === null || srv[k] === '') && loc[k] !== undefined) {
              srv[k] = loc[k];
            }
          });
          return srv;
        });
        /* Preserva itens que estão SÓ no local (ainda não sincronizaram com o
           server — supaUpsert pode ter falhado por RLS ou rede). Sem isso, o
           sync apagaria fixas/lançamentos recém-criados no offline ou após
           erro silencioso. */
        var idsServer = {};
        itensServer.forEach(function(s){ if (s && s.id) idsServer[s.id] = true; });
        itensLocal.forEach(function(l){
          if (!l || !l.id || idsServer[l.id]) return;
          // Item que está só no aparelho. Se ele JÁ tinha sido sincronizado
          // antes (_synced) e agora sumiu do servidor, foi apagado de propósito
          // em outro aparelho → NÃO ressuscitar. Se nunca subiu (_synced falsy),
          // é criação local ainda pendente de upload → preservar.
          if (!l._synced) merged.push(l);
        });
        localStorage.setItem(prefix + lsKey, JSON.stringify(merged));
        console.log('[supaSync]', tabela, '→', merged.length, 'itens (' + itensServer.length + ' do server + ' + (merged.length - itensServer.length) + ' só locais)');
      } catch(e) {
        console.warn('[supaSync] Exceção na tabela', tabela, e);
      }
    }));
    console.log('[supaSync] Sync completo para userId:', userId);
  } catch(e) {
    console.error('[supaSync] Erro geral:', e);
  }
}

/* Insere/atualiza um item no Supabase (upsert por id) */
async function supaUpsert(localKey, item) {
  if (!window.supa) {
    console.warn('[supaUpsert] window.supa nulo — abortado');
    if (typeof oneToast === 'function') oneToast('⚠ Supabase não inicializado');
    return;
  }
  if (!window.authUser) {
    console.warn('[supaUpsert] window.authUser nulo — abortado');
    if (typeof oneToast === 'function') oneToast('⚠ Usuário não autenticado');
    return;
  }
  /* Normaliza alias (despesasFixas → despesas_fixas, etc.) antes de buscar tabela */
  localKey = _supaNormalizeKey(localKey);
  var tabela = SUPA_TABLES[localKey];
  if (!tabela) {
    /* Sem alvo no schema: aceitamos silenciosamente pra não estridentar a UX
       (caso típico: receitas_fixas ainda não tem tabela no Supa). */
    console.warn('[supaUpsert] sem tabela alvo para localKey:', localKey, '— salvo só local');
    return;
  }
  try {
    var row = _supaMapToRow(localKey, item, window.authUser.id);
    console.log('[supaUpsert] enviando →', tabela, row);
    var result = await window.supa.from(tabela).upsert(row, { onConflict: 'id' });
    if (result.error) {
      console.error('[supaUpsert] ERRO na tabela', tabela, ':', result.error);
      if (typeof oneToast === 'function') oneToast('⚠ Erro sync: ' + (result.error.message || result.error.code || 'desconhecido'));
    } else {
      console.log('[supaUpsert] OK —', tabela, row.id);
    }
  } catch(e) {
    console.error('[supaUpsert] Exceção:', e);
    if (_pinahIsNetworkError(e)) {
      if (typeof window.pinahMarkConnectionFail === 'function') {
        window.pinahMarkConnectionFail(navigator.onLine ? 'dns-fail' : 'offline', e);
      }
      if (typeof oneToast === 'function') oneToast('⚠ Sem acesso ao servidor — alteração só local');
    } else {
      if (typeof oneToast === 'function') oneToast('⚠ Exceção sync: ' + e.message);
    }
  }
}
window.supaUpsert = supaUpsert;

/* Migração 1x das contas locais órfãs pro Supabase.
   A tabela `contas` só passou a existir no servidor em 20/05/2026. Antes disso,
   `supaUpsert('contas')` caía no branch silencioso "sem tabela alvo" — contas
   ficavam só no localStorage da máquina onde foram cadastradas, sem cross-device.
   Esta função roda 1x por user (gravada flag no localStorage). Lê todas as
   contas locais e faz upsert no servidor. Itens duplicados (mesma id) são
   normalizados via upsert onConflict='id'. */
async function _oneFinMigrarContasParaSupa() {
  if (!window.supa || !window.authUser) return;
  var uid = window.authUser.id;
  var flagKey = 'u_' + uid + '_contas_migrated_v1';
  if (localStorage.getItem(flagKey) === '1') return; /* já rodou */
  var contas = [];
  try { contas = JSON.parse(localStorage.getItem('u_' + uid + '_contas') || '[]'); } catch(e) {}
  if (!contas.length) {
    localStorage.setItem(flagKey, '1'); /* sem contas locais, nada a migrar — marca como feito */
    return;
  }
  console.log('[migracao-contas] Subindo', contas.length, 'contas locais pro Supabase…');
  var ok = 0, falhas = 0;
  for (var i = 0; i < contas.length; i++) {
    try {
      await supaUpsert('contas', contas[i]);
      ok++;
    } catch (e) {
      console.error('[migracao-contas] Falha em', contas[i].nome, e);
      falhas++;
    }
  }
  console.log('[migracao-contas] OK:', ok, '· Falhas:', falhas);
  if (falhas === 0) {
    localStorage.setItem(flagKey, '1');
    if (typeof oneToast === 'function') oneToast('✓ ' + ok + ' conta(s) sincronizada(s) no servidor');
  } else {
    if (typeof oneToast === 'function') oneToast('⚠ Migração de contas: ' + ok + ' OK, ' + falhas + ' falharam');
  }
}
window._oneFinMigrarContasParaSupa = _oneFinMigrarContasParaSupa;

/* Backfill 1x dos vínculos: reenvia receitas/despesas/fixas locais COMPLETAS
   pro servidor. Necessário porque, até esta versão, _supaMapToRow recortava
   contaId/faturaMesAno/status/parcelas das despesas e mandava as fixas
   incompletas (receitasFixas nem tinha tabela). Com as colunas novas no schema,
   este re-push leva o dado bom do aparelho-fonte (tipicamente o desktop, onde
   os lançamentos foram criados) pro servidor; os outros aparelhos passam a
   puxar tudo via supaSync. Roda 1x por usuário (flag no localStorage).
   IMPORTANTE: idealmente o primeiro login pós-deploy é no aparelho mais
   completo — upsert é onConflict=id, então o último a escrever vence.
   Auto-recupera: se as colunas ainda não existirem (SQL não aplicado), os
   upserts falham, a flag não é gravada e tenta de novo no próximo load. */
async function _oneFinBackfillVinculosParaSupa() {
  if (!window.supa || !window.authUser) return;
  var uid = window.authUser.id;
  var flagKey = 'u_' + uid + '_vinculos_backfill_v1';
  if (localStorage.getItem(flagKey) === '1') return; /* já rodou */
  /* Chaves de localStorage reais do app (camelCase). supaUpsert normaliza
     despesasFixas→despesas_fixas / receitasFixas→receitas_fixas via SUPA_ALIAS. */
  var chaves = ['receitas', 'despesas', 'despesasFixas', 'receitasFixas'];
  var grupos = chaves.map(function(k){
    var arr = [];
    try { arr = JSON.parse(localStorage.getItem('u_' + uid + '_' + k) || '[]') || []; } catch(e) { arr = []; }
    return { key: k, arr: arr };
  });
  var total = grupos.reduce(function(s,g){ return s + g.arr.length; }, 0);
  if (!total) { localStorage.setItem(flagKey, '1'); return; } /* nada local a subir */
  console.log('[backfill-vinculos] reenviando', total, 'itens (receitas/despesas/fixas)…');
  var ok = 0, falhas = 0;
  for (var i = 0; i < grupos.length; i++) {
    var g = grupos[i];
    for (var j = 0; j < g.arr.length; j++) {
      var item = g.arr[j];
      if (!item || !item.id) continue;
      if (String(item.id).indexOf('_fix_') === 0) continue; /* instância virtual, não persiste */
      try { await supaUpsert(g.key, item); ok++; }
      catch (e) { console.error('[backfill-vinculos] falha', g.key, item.id, e); falhas++; }
    }
  }
  console.log('[backfill-vinculos] OK:', ok, '· Falhas:', falhas);
  if (falhas === 0) {
    localStorage.setItem(flagKey, '1');
    if (typeof oneToast === 'function') oneToast('✓ Lançamentos sincronizados no servidor');
  } else {
    if (typeof oneToast === 'function') oneToast('⚠ Backfill: ' + ok + ' OK, ' + falhas + ' falharam (tenta de novo no próximo load)');
  }
}
window._oneFinBackfillVinculosParaSupa = _oneFinBackfillVinculosParaSupa;

/* Helper: detecta erro de rede (DNS, offline, fetch falhou) vs erro de servidor.
   Usado por supaUpsert/supaDelete pra disparar banner persistente quando a falha
   é de conectividade (DNS bloqueado, Wi-Fi caído), não erro de aplicação. */
function _pinahIsNetworkError(e) {
  if (!e) return false;
  if (e instanceof TypeError) return true; // "Failed to fetch" é TypeError no browser
  var msg = String(e.message || e || '').toLowerCase();
  return msg.indexOf('failed to fetch') >= 0
      || msg.indexOf('networkerror') >= 0
      || msg.indexOf('network request failed') >= 0
      || msg.indexOf('load failed') >= 0; // Safari
}

async function supaResync() {
  if (typeof supaSync !== 'function') return;
  if (typeof oneToast === 'function') oneToast('Sincronizando…');
  try {
    await supaSync();
    if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
    if (typeof renderOneFinanceiro === 'function') renderOneFinanceiro();
    if (typeof renderOneAgendaPainel === 'function') renderOneAgendaPainel();
    if (typeof renderOneTarefasPainel === 'function') renderOneTarefasPainel();
    if (typeof oneToast === 'function') oneToast('✓ Sincronizado');
  } catch(e) {
    if (typeof oneToast === 'function') oneToast('⚠ Erro ao sincronizar');
  }
}
window.supaResync = supaResync;

/* Remove um item do Supabase pelo id.
   Usa .select() pra trazer as linhas afetadas — assim conseguimos detectar
   o caso silencioso "operação passou mas RLS bloqueou e zero linhas foram
   apagadas". Sem isso, o Supabase responde error=null mesmo quando nada foi
   removido, e o reload trazia tudo de volta via supaSync. */
async function supaDelete(localKey, id) {
  if (!window.supa || !window.authUser) {
    console.warn('[supaDelete] supa ou authUser nulo — abortado');
    if (typeof oneToast === 'function') oneToast('⚠ Não autenticado — exclusão só local');
    return { ok: false, motivo: 'no-auth' };
  }
  /* Normaliza alias (despesasFixas → despesas_fixas, etc.) */
  localKey = _supaNormalizeKey(localKey);
  var tabela = SUPA_TABLES[localKey];
  if (!tabela) {
    console.warn('[supaDelete] sem tabela alvo para localKey:', localKey, '— exclusão só local');
    return { ok: false, motivo: 'tabela-desconhecida' };
  }
  try {
    var result = await window.supa.from(tabela).delete()
      .eq('id', id).eq('user_id', window.authUser.id)
      .select();
    if (result.error) {
      console.error('[supaDelete] ERRO', tabela, id, result.error);
      if (typeof oneToast === 'function') {
        oneToast('⚠ Erro ao apagar no servidor: ' + (result.error.message || result.error.code || 'desconhecido'));
      }
      return { ok: false, motivo: 'erro', error: result.error };
    }
    var afetadas = (result.data && result.data.length) || 0;
    if (afetadas === 0) {
      console.warn('[supaDelete] ZERO LINHAS afetadas', tabela, id,
        '— provável RLS bloqueando DELETE ou id inexistente no servidor');
      if (typeof oneToast === 'function') {
        oneToast('⚠ Servidor não apagou (RLS?). Item pode voltar no próximo reload.');
      }
      return { ok: false, motivo: 'zero-linhas' };
    }
    console.log('[supaDelete] OK', tabela, id, '— linhas apagadas:', afetadas);
    return { ok: true, afetadas: afetadas };
  } catch(e) {
    console.error('[supaDelete] Exceção:', e);
    if (typeof _pinahIsNetworkError === 'function' && _pinahIsNetworkError(e)) {
      if (typeof window.pinahMarkConnectionFail === 'function') {
        window.pinahMarkConnectionFail(navigator.onLine ? 'dns-fail' : 'offline', e);
      }
      if (typeof oneToast === 'function') oneToast('⚠ Sem acesso ao servidor — exclusão só local');
    } else {
      if (typeof oneToast === 'function') oneToast('⚠ Exceção ao apagar: ' + e.message);
    }
    return { ok: false, motivo: 'excecao', error: e };
  }
}
window.supaDelete = supaDelete;

function pinahCriarCompromisso(input) {
  var store = _pinahGetSet('compromissos');
  var lista = store.get();
  var novo = {
    id:        (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
    nome:      input.nome      || '',
    descricao: input.nome      || '',
    data:      input.data      || new Date().toISOString().slice(0, 10),
    hora:      input.hora      || '09:00',
    tipo:      input.tipo      || 'atendimento',
    duracao:   input.duracao   || 60,
    valor:     input.valor     || null,
    status:    'agendado',
    realizado: false,
    criadoEm:  new Date().toISOString()
  };
  lista.push(novo);
  store.set(lista);
  supaUpsert('compromissos', novo);
  // Re-render imediato dos painéis de agenda
  if (window._pinahRerender) window._pinahRerender.agenda();
}

function pinahCriarTarefa(input) {
  if (!input) return;
  // Áreas existentes — toda tarefa precisa cair em uma delas (princípio
  // do Mentor: tarefa só existe dentro de uma área, sem orfã).
  var areasExistentes = [];
  try {
    if (typeof oneTarGetAreas === 'function') areasExistentes = oneTarGetAreas();
  } catch (e) {}
  var area = input.area;
  // Se a Pinah não mandou área OU mandou área que não existe na lista,
  // tenta encaixar pela primeira área existente. Sem nenhuma cadastrada,
  // descarta com aviso visível (Mentor define o comportamento depois).
  if (!area || areasExistentes.indexOf(area) === -1) {
    if (areasExistentes.length) {
      console.warn('[pinahCriarTarefa] área inválida ou ausente — usando fallback:', area, '→', areasExistentes[0]);
      area = areasExistentes[0];
    } else {
      console.warn('[pinahCriarTarefa] sem áreas cadastradas — tarefa não criada:', input);
      if (typeof window.toast === 'function') window.toast('Crie uma área antes — a Pinah não pode criar tarefa sem área.', 'error');
      return;
    }
  }
  var store = _pinahGetSet('tarefas');
  var lista = store.get();
  var novo = {
    id:         (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
    titulo:     input.titulo     || '',
    nome:       input.titulo     || '',
    area:       area,
    prioridade: input.prioridade || 'normal',
    prazo:      input.prazo      || null,
    status:     'aberta',
    concluida:  false,
    criadoEm:   new Date().toISOString()
  };
  lista.push(novo);
  store.set(lista);
  supaUpsert('tarefas', novo);
  // Re-render imediato do kanban de tarefas
  if (typeof renderOneTarefasPainel === 'function') renderOneTarefasPainel();
  if (window._pinahRerender) window._pinahRerender.tarefas();
}

function pinahRegistrarTransacao(input) {
  var chave = input.tipo === 'receita' ? 'receitas' : 'despesas';
  var store  = _pinahGetSet(chave);
  var lista  = store.get();
  var novo = {
    id:        (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
    valor:     Number(input.valor) || 0,
    descricao: input.descricao || '',
    nome:      input.descricao || '',
    data:      input.data      || new Date().toISOString().slice(0, 10),
    categoria: input.categoria || (input.tipo === 'receita' ? 'atendimento' : 'outro'),
    tipo:      input.tipo      || 'despesa',
    status:    input.tipo === 'receita' ? 'pendente' : 'pago',
    criadoEm:  new Date().toISOString()
  };
  lista.push(novo);
  store.set(lista);
  supaUpsert(chave, novo);
  // Re-render imediato do painel financeiro
  if (window._pinahRerender) window._pinahRerender.financeiro();
}

/* Cria/remove a bolha de "digitando" dentro do #pinah-msgs (não elemento externo) */
function pinahTypingShow() {
  var msgs = document.getElementById('pinah-msgs');
  if (!msgs) return;
  var el = document.createElement('div');
  el.id = 'pinah-typing-bubble';
  el.className = 'pinah-bubble-wrap';
  el.innerHTML =
    '<img src="assets/icons/pinah-avatar.png" class="pinah-bubble-avatar" alt="Pinah">' +
    '<div class="pinah-bubble pinah-bubble-pinah pinah-typing-inline">' +
    '<div class="one-chat-typing-dots"><span></span><span></span><span></span></div>' +
    '</div>';
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}
function pinahTypingHide() {
  var el = document.getElementById('pinah-typing-bubble');
  if (el) el.remove();
}

async function pinahEnviar(texto, arquivo) {
  texto = (texto || '').trim();
  if (!texto && !arquivo) return;

  // Texto de exibição (bolha + histórico)
  var displayText = texto;
  if (arquivo) displayText = (texto ? texto + '\n' : '') + '📎 ' + arquivo.nome;

  // Content para a API (pode ter bloco de arquivo)
  var apiContent;
  if (arquivo) {
    if (arquivo.tipo === 'texto') {
      // DOCX extraído como texto
      apiContent = (texto || 'Analise este documento e salve como nota no Biblioteca da Pinah.') +
        '\n\n[Arquivo: ' + arquivo.nome + ']\n\n' + arquivo.textoExtraido;
    } else {
      var fileBlock = arquivo.tipo === 'pdf'
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: arquivo.base64 } }
        : { type: 'image',    source: { type: 'base64', media_type: arquivo.mimeType,   data: arquivo.base64 } };
      apiContent = [
        fileBlock,
        { type: 'text', text: texto || 'Analise este arquivo e salve o conteúdo como nota no Biblioteca da Pinah.' }
      ];
    }
  } else {
    apiContent = texto;
  }

  // Histórico guarda versão texto (sem base64 gigante)
  pinahHistory.push({ role: 'user', content: displayText });

  // Para a chamada API, substitui última mensagem pelo conteúdo completo
  var apiMessages = pinahHistory.slice(0, -1).concat([{ role: 'user', content: apiContent }]);

  // Detecta se o painel de chat está visível
  var chatPanel = document.querySelector('.one-desktop-main > [data-panel="chat"]:not([hidden])');
  var emChat    = !!chatPanel;

  /* Mobile: tela one-chat-msgs-mob */
  var isMobile = window.innerWidth < 900;
  var msgsMob  = isMobile ? document.getElementById('one-chat-msgs-mob') : null;

  var msgs = document.getElementById('pinah-msgs');

  if (emChat) {
    var welcome  = document.getElementById('pinah-welcome');
    var clearRow = document.getElementById('pinah-clear-row');
    if (welcome)  welcome.hidden  = true;
    if (msgs)     msgs.hidden     = false;
    if (clearRow) clearRow.hidden = false;
    pinahAddBubble('user', displayText);
    pinahTypingShow();
  }

  /* Mobile chat: mostra mensagens na área móvel */
  if (isMobile && msgsMob) {
    var welcomeMob = document.getElementById('one-chat-welcome-mob');
    if (welcomeMob) welcomeMob.style.display = 'none';
    msgsMob.classList.add('ativo');
    /* Bolha do usuário */
    var uBub = document.createElement('div');
    uBub.className = 'chat-bubble user-bubble';
    uBub.textContent = displayText;
    msgsMob.appendChild(uBub);
    /* Bolha de typing */
    var typBub = document.createElement('div');
    typBub.className = 'chat-bubble pinah-bubble chat-typing';
    typBub.id = 'mob-typing-bub';
    typBub.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
    msgsMob.appendChild(typBub);
    msgsMob.scrollTop = msgsMob.scrollHeight;
  }

  try {
    /* (P028) Loop multi-turn: até 3 iterações pra suportar tool use de
       leitura (buscar_nota / ler_nota) — Pinah dispara tool, frontend
       executa e devolve resultado numa segunda chamada, Pinah responde
       de verdade. Iterações 2 e 3 só rolam se a anterior teve tool de
       leitura; senão sai no primeiro turno. */
    var currentMessages = apiMessages;
    var consolidatedText = '';      // texto da bolha atual em construção
    var textoTodosOsTurnos = '';    // soma de tudo que a Pinah disse no turno multi-step (vai pro pinahHistory no fim)
    var bubble   = emChat ? pinahAddBubble('pinah', '') : null;
    var mobBubble = null;
    /* Pra suportar a Pinah operando dentro de funcionalidades:
       contextoTela é enviado pro backend pra filtrar tools, e
       algumaToolExecutada decide entre balão fugaz e fallback pro chat. */
    var contextoTela = pinahDetectarContexto();
    var algumaToolExecutada = false;

    /* Mobile: substitui bolha de typing pela bolha de resposta */
    if (isMobile && msgsMob) {
      var tb = document.getElementById('mob-typing-bub');
      /* Tira o id ao virar bolha de resposta: senão a próxima mensagem cria
         outra #mob-typing-bub e o getElementById pega a bolha velha, fazendo
         a resposta nova sobrescrever uma antiga (diálogo embaralhado). */
      if (tb) { tb.className = 'chat-bubble pinah-bubble'; tb.innerHTML = ''; tb.removeAttribute('id'); }
      mobBubble = tb;
    }
    if (emChat) pinahTypingHide();

    for (var turno = 0; turno < 3; turno++) {
      const resp = await fetch('/api/pinah-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages,
          context: pinahGetContext(),
          contextoTela: contextoTela,
          profile: window.authProfile ? {
            nome:      window.authProfile.nome      || null,
            bio_pinah: window.authProfile.bio_pinah || null
          } : null
        })
      });

      if (!resp.ok) throw new Error('HTTP ' + resp.status);

      var fullText = '';
      var toolsLeitura = []; // { id, name, input, result }
      var toolsAssistantBlocks = []; // pra reconstituir o assistant message na próxima chamada

      const reader  = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.tool) {
              var ehLeitura = (ev.tool === 'buscar_nota' || ev.tool === 'ler_nota');
              if (ehLeitura) {
                /* Executa leitura local, guarda resultado pra segunda chamada */
                var resultado = pinahExecutarToolLeitura(ev.tool, ev.input || {});
                toolsLeitura.push({
                  id:     ev.id,
                  name:   ev.tool,
                  input:  ev.input || {},
                  result: resultado
                });
                toolsAssistantBlocks.push({
                  type:  'tool_use',
                  id:    ev.id,
                  name:  ev.tool,
                  input: ev.input || {}
                });
                /* Feedback discreto "🔍 Procurando..." */
                pinahFeedbackTool(ev.tool, ev.input || {}, {
                  emChat:   emChat,
                  isMobile: isMobile,
                  msgsMob:  msgsMob
                });
              } else {
                /* Tool de criação: comportamento normal */
                pinahExecutarTool(ev.tool, ev.input || {});
                pinahFeedbackTool(ev.tool, ev.input || {}, {
                  emChat:   emChat,
                  isMobile: isMobile,
                  msgsMob:  msgsMob
                });
                algumaToolExecutada = true;
              }
            }
            if (ev.text) {
              fullText += ev.text;
              if (emChat && bubble) {
                bubble.innerHTML = pinahRenderText(consolidatedText + fullText);
                if (msgs) msgs.scrollTop = msgs.scrollHeight;
              }
              if (mobBubble) {
                mobBubble.innerHTML = pinahRenderText(consolidatedText + fullText);
                if (msgsMob) msgsMob.scrollTop = msgsMob.scrollHeight;
              }
            }
            if (ev.error) {
              if (emChat && bubble) bubble.innerHTML = '⚠️ ' + pinahRenderText(ev.error);
              else if (window.toast) window.toast('⚠️ ' + ev.error, 'error');
            }
            /* ev.done é tratado depois do loop, pra saber se há multi-turn */
          } catch (e) {
            /* linha mal formada de SSE — antes era engolida em silêncio. Agora loga.
               Se for erro de rede (stream cortou no meio), marca estado de conexão. */
            console.warn('[pinah-sse] linha mal formada ou erro de parse', { snippet: line.slice(0, 120), error: e && e.message });
            if (typeof _pinahIsNetworkError === 'function' && _pinahIsNetworkError(e)) {
              if (typeof window.pinahMarkConnectionFail === 'function') {
                window.pinahMarkConnectionFail(navigator.onLine ? 'dns-fail' : 'offline', e);
              }
            }
          }
        }
      }

      /* Consolida texto deste turno (pra render da bolha atual + soma total) */
      consolidatedText += fullText;
      if (fullText) {
        textoTodosOsTurnos += (textoTodosOsTurnos ? '\n\n' : '') + fullText;
      }

      /* Se houve tool de leitura, monta próxima rodada e continua o loop */
      if (toolsLeitura.length > 0) {
        /* Bloco assistant: [text opcional, tool_use(s)] */
        var assistantContent = [];
        if (fullText.trim()) assistantContent.push({ type: 'text', text: fullText });
        toolsAssistantBlocks.forEach(function(b) { assistantContent.push(b); });

        /* Bloco user: tool_result(s) com payload JSON do resultado */
        var userContent = toolsLeitura.map(function(t) {
          return {
            type: 'tool_result',
            tool_use_id: t.id,
            content: JSON.stringify(t.result)
          };
        });

        currentMessages = currentMessages.concat([
          { role: 'assistant', content: assistantContent },
          { role: 'user',      content: userContent }
        ]);

        /* Cria bolha nova pro próximo turno (a anterior já tem o texto desse turno) */
        if (emChat) bubble = pinahAddBubble('pinah', '');
        if (isMobile && msgsMob) {
          var nb = document.createElement('div');
          nb.className = 'chat-bubble pinah-bubble';
          msgsMob.appendChild(nb);
          mobBubble = nb;
        }
        consolidatedText = ''; // próxima bolha começa zerada
        continue;
      }

      /* Sem tool de leitura: turno final. Empilha resposta consolidada (todos os subturnos) no histórico. */
      var textoFinal = textoTodosOsTurnos || fullText;
      pinahHistory.push({ role: 'assistant', content: textoFinal });
      if (!emChat && textoFinal.trim()) {
        if (algumaToolExecutada) {
          /* Tool já gerou balão. Não duplicar com toast extra. */
        } else if (contextoTela) {
          /* Dentro de uma funcionalidade e Pinah respondeu só texto (não
             entendeu como ação, ou foi conversa pura): leva a conversa pro chat. */
          if (isMobile) {
            /* Mobile: as bolhas (usuário + resposta) já foram escritas na área
               de chat mobile (#one-chat-msgs-mob) durante o streaming. Só falta
               deslizar o carrossel pro slide do chat. swapToCenter é desktop-only
               e não mexe no carrossel — por isso usamos oneMobScrollToChat(). */
            if (typeof oneMobScrollToChat === 'function') oneMobScrollToChat();
          } else {
            /* Desktop: abre o painel de chat e replica a conversa lá. */
            var textoOriginal = displayText;
            var textoResposta = textoFinal;
            if (typeof swapToCenter === 'function') swapToCenter('chat');
            setTimeout(function() {
              var welcomeBack = document.getElementById('pinah-welcome');
              var msgsBack    = document.getElementById('pinah-msgs');
              var clearRowBack = document.getElementById('pinah-clear-row');
              if (welcomeBack) welcomeBack.hidden = true;
              if (msgsBack) msgsBack.hidden = false;
              if (clearRowBack) clearRowBack.hidden = false;
              pinahAddBubble('user', textoOriginal);
              pinahAddBubble('pinah', textoResposta);
            }, 60);
          }
        } else {
          /* Fora de qualquer painel reconhecido: toast tradicional. */
          var resumo = textoFinal.trim().replace(/\n/g, ' ');
          if (resumo.length > 120) resumo = resumo.slice(0, 117) + '…';
          if (window.toast) window.toast('Pinah: ' + resumo, null, { duration: 6000 });
        }
      }
      break;
    }

  } catch (err) {
    if (emChat) {
      pinahTypingHide();
      pinahAddBubble('pinah', '⚠️ Não consegui conectar com a Pinah. Verifique a conexão e tente de novo.');
    } else {
      if (window.toast) window.toast('⚠️ Erro ao conectar com a Pinah.', 'error');
    }
    console.error('[pinahEnviar]', err);
    /* Erro de rede vira sinal global — banner aparece pro usuário entender que é conectividade. */
    if (typeof _pinahIsNetworkError === 'function' && _pinahIsNetworkError(err)) {
      if (typeof window.pinahMarkConnectionFail === 'function') {
        window.pinahMarkConnectionFail(navigator.onLine ? 'dns-fail' : 'offline', err);
      }
    }
  }
}

/* ── Mobile — ir ao slide de chat ───────────────────────────── */
function oneMobScrollToChat() {
  var wrap = document.getElementById('one-screens-wrap');
  if (wrap) wrap.scrollTo({ left: 0, behavior: 'smooth' });
}

/* Focar input no mobile.
   Antes: sempre arrastava pro slide chat.
   Agora: respeita o contexto. Se o usuário está num slide de funcionalidade
   (Agenda/Tarefas/Financeiro/Biblioteca), mantém o slide pra Pinah Agente
   executar a ação direto na tela. Se está em outro slide (chat ou desconhecido),
   arrasta pro chat como antes. */
function oneMobInputFocus() {
  if (typeof pinahDetectarContexto === 'function' && pinahDetectarContexto()) {
    return;
  }
  oneMobScrollToChat();
}

/* Popup de sugestões mobile (abre/fecha ao clicar no avatar Pinah) */
function oneMobPopupToggle(ev) {
  if (ev) ev.stopPropagation();
  var popup = document.getElementById('one-mob-popup');
  if (!popup) return;
  var hidden = popup.hasAttribute('hidden');
  if (hidden) {
    popup.removeAttribute('hidden');
    /* Fecha ao clicar fora */
    setTimeout(function() {
      var handler = function(e) {
        if (!popup.contains(e.target) && !e.target.closest('.one-btn-pinah-avatar')) {
          popup.setAttribute('hidden', '');
          document.removeEventListener('click', handler);
        }
      };
      document.addEventListener('click', handler);
    }, 50);
  } else {
    popup.setAttribute('hidden', '');
  }
}

/* Sugestão clicada no popup: fecha popup, preenche input, vai ao chat */
function oneMobSuggest(texto) {
  var popup = document.getElementById('one-mob-popup');
  if (popup) popup.setAttribute('hidden', '');
  var input = document.getElementById('one-input');
  if (input) {
    input.value = texto;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 96) + 'px';
  }
  oneMobScrollToChat();
  setTimeout(function() { if (input) input.focus(); }, 320);
}

async function oneEnviar() {
  var inputDesk = document.getElementById('one-input-desk');
  var inputMob  = document.getElementById('one-input');
  var input = (inputDesk && inputDesk.value.trim()) ? inputDesk : inputMob;

  var texto    = input ? input.value.trim() : '';
  var arquivos = (_chatArquivosAtuais && _chatArquivosAtuais.length) ? _chatArquivosAtuais.slice() : [];

  // Precisa de texto OU pelo menos 1 arquivo para enviar
  if (!texto && arquivos.length === 0) return;

  if (input) { input.value = ''; input.style.height = 'auto'; }
  _chatLimparArquivo();

  /* Sem arquivos: chamada única (texto puro) */
  if (arquivos.length === 0) {
    pinahEnviar(texto, null);
    return;
  }

  /* 1 arquivo: chamada única (comportamento clássico) */
  if (arquivos.length === 1) {
    pinahEnviar(texto, arquivos[0]);
    return;
  }

  /* Múltiplos arquivos: dispara em sequência, um por vez.
     Cada um vira uma nota separada. O texto do usuário acompanha
     todos (mesma instrução). Aguarda o anterior terminar antes de
     mandar o próximo, pra não atropelar o stream. */
  for (var i = 0; i < arquivos.length; i++) {
    var prefixoLote = '[Arquivo ' + (i + 1) + ' de ' + arquivos.length + '] ';
    var textoArquivo = texto
      ? (prefixoLote + texto)
      : (prefixoLote + 'Salva este documento no Biblioteca da Pinah.');
    await pinahEnviar(textoArquivo, arquivos[i]);
  }
}

// ── Anexar arquivo no chat (suporta múltiplos arquivos) ──────────
var _chatArquivosAtuais = [];

function oneAnexar() {
  var input = document.getElementById('chat-file-input');
  if (input) input.click();
}
window.oneAnexar = oneAnexar;

function _chatOnFileSelect(input) {
  var files = (input && input.files) ? Array.from(input.files) : [];
  if (files.length === 0) return;
  input.value = ''; // permite re-selecionar os mesmos arquivos

  var extOk = ['pdf','docx','txt','md','jpg','jpeg','png','webp'];

  /* Valida cada arquivo antes de começar a processar */
  var validos = [];
  files.forEach(function(file) {
    var ext = (file.name || '').split('.').pop().toLowerCase();
    if (!extOk.includes(ext)) {
      toast('Ignorado (formato): ' + file.name, 'error', { duration: 4000 });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast('Ignorado (>20MB): ' + file.name, 'error', { duration: 4000 });
      return;
    }
    validos.push({ file: file, ext: ext });
  });

  if (validos.length === 0) return;

  /* Mostra chip resumido enquanto processa */
  _chatAtualizarChip(true);

  /* Processa cada arquivo em paralelo. Cada um chama _chatRegistrarArquivo() quando pronto. */
  validos.forEach(function(item) {
    if (item.ext === 'docx') {
      if (!window.mammoth) {
        var s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
        s.onload  = function() { _chatLerDOCX(item.file); };
        s.onerror = function() { toast('Falha ao carregar leitor de DOCX para ' + item.file.name, 'error'); };
        document.head.appendChild(s);
      } else {
        _chatLerDOCX(item.file);
      }
    } else if (item.ext === 'txt' || item.ext === 'md') {
      /* Texto puro — lê direto como string UTF-8 e registra como 'texto'. */
      var rTxt = new FileReader();
      rTxt.onload = function(e) {
        _chatRegistrarArquivo({
          nome: item.file.name,
          tipo: 'texto',
          textoExtraido: String(e.target.result || '')
        });
      };
      rTxt.onerror = function() { toast('Erro ao ler ' + item.file.name, 'error'); };
      rTxt.readAsText(item.file, 'utf-8');
    } else {
      /* PDF ou imagem — lê como base64 */
      var reader = new FileReader();
      reader.onload = function(e) {
        var dataUrl = e.target.result;
        var base64  = dataUrl.split(',')[1];
        _chatRegistrarArquivo({
          nome:     item.file.name,
          tipo:     item.ext === 'pdf' ? 'pdf' : 'imagem',
          base64:   base64,
          mimeType: item.ext === 'pdf' ? 'application/pdf' : item.file.type
        });
      };
      reader.onerror = function() { toast('Erro ao ler ' + item.file.name, 'error'); };
      reader.readAsDataURL(item.file);
    }
  });
}
window._chatOnFileSelect = _chatOnFileSelect;

function _chatRegistrarArquivo(arquivo) {
  _chatArquivosAtuais.push(arquivo);
  _chatAtualizarChip(false);
}

function _chatLerDOCX(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    window.mammoth.extractRawText({ arrayBuffer: e.target.result })
      .then(function(result) {
        _chatRegistrarArquivo({ nome: file.name, tipo: 'texto', textoExtraido: result.value || '' });
      })
      .catch(function() { toast('Erro ao ler DOCX: ' + file.name, 'error'); });
  };
  reader.readAsArrayBuffer(file);
}

/* Mostra chip único quando há 1 arquivo, ou contagem quando há vários */
function _chatAtualizarChip(loading) {
  var n = _chatArquivosAtuais.length;
  var label;
  if (n === 0 && loading)      label = '📎 Carregando…';
  else if (n === 1)            label = '📎 ' + _chatArquivosAtuais[0].nome;
  else if (n > 1 && !loading)  label = '📎 ' + n + ' arquivos prontos';
  else if (n > 1 && loading)   label = '📎 ' + n + ' arquivos (carregando mais…)';
  else                         label = '📎 Carregando…';

  ['mob','desk'].forEach(function(v) {
    var chip = document.getElementById('chat-file-chip-' + v);
    var span = document.getElementById('chat-file-chip-' + v + '-nome');
    if (!chip) return;
    chip.style.display = 'flex';
    chip.classList.toggle('loading', !!loading && n === 0);
    if (span) span.textContent = label;
  });
}

/* Mantida pra compatibilidade — alguns callers ainda usam */
function _chatMostrarChip(nome, loading) {
  _chatAtualizarChip(loading);
}

function _chatLimparArquivo() {
  _chatArquivosAtuais = [];
  ['mob','desk'].forEach(function(v) {
    var chip = document.getElementById('chat-file-chip-' + v);
    if (chip) chip.style.display = 'none';
  });
}
window._chatLimparArquivo = _chatLimparArquivo;

function oneVoz() {
  // Detecta qual input preencher
  var inputDesk = document.getElementById('one-input-desk');
  var inputMob  = document.getElementById('one-input');
  var input = inputDesk || inputMob;
  if (!input) return;

  // Toggle: se já está ouvindo, para
  if (__pinahMicControle) {
    __pinahMicControle.stop();
    __pinahMicControle = null;
    return;
  }

  __pinahMicControle = iniciarReconhecimentoVoz({
    continuous: true, // grava até o user tocar para parar — sem auto-stop na pausa
    onStateChange: function (estado) {
      // Acende/apaga o botão de mic
      var btns = document.querySelectorAll('.one-prompt-btn[onclick="oneVoz()"]');
      btns.forEach(function (btn) {
        if (estado === 'listening') {
          btn.style.background = 'rgba(220,60,60,0.18)';
          btn.title = 'Tocque para parar e enviar';
        } else {
          btn.style.background = '';
          btn.title = 'Falar';
        }
      });
      if (estado === 'result' || estado === 'error') {
        __pinahMicControle = null;
      }
    },
    onPartial: function (texto) {
      input.value = texto; // mostra transcrição parcial no input enquanto fala
    },
    onResult: function (texto) {
      // textoFinal pode estar vazio se o último trecho era interim — usa o campo como fallback
      var toSend = texto.trim() || input.value.trim();
      input.value = '';
      input.style.height = 'auto';
      if (toSend) pinahEnviar(toSend);
    },
    onError: function (msg) {
      console.warn('[oneVoz]', msg);
      __pinahMicControle = null;
    }
  });
}

/* ── SWAP de painéis (Chat ↔ Agenda ↔ ...) ──────────────── */
var oneAgWeekOffset = 0; // semana atual = 0, -1 = anterior, +1 = próxima

function swapToCenter(target) {
  // 1. Identifica painel central atualmente ativo
  var ativos = document.querySelectorAll('.one-desktop-main > [data-panel]:not([hidden])');
  var atual = ativos[0];
  if (!atual || atual.dataset.panel === target) return;
  var atualPanel = atual.dataset.panel;

  // 2. Esconde painel central atual, mostra novo
  var panels = document.querySelectorAll('.one-desktop-main > [data-panel]');
  panels.forEach(function(p) {
    if (p.dataset.panel === target) p.removeAttribute('hidden');
    else p.setAttribute('hidden', '');
  });

  // 3. Cards laterais: esconde o do target (vai pro centro), mostra o do antigo
  var cards = document.querySelectorAll('.one-desktop-sidebar > [data-panel]');
  cards.forEach(function(c) {
    if (c.dataset.panel === target) c.setAttribute('hidden', '');
    if (c.dataset.panel === atualPanel) c.removeAttribute('hidden');
  });

  // 4. Dispara render do novo painel — com re-sync Supabase em background
  var renderers = {
    agenda: function() {
      // Garante que a view ativa seja aplicada (tabs + vistas + render)
      var view = window.oneAgViewAtiva || 'semana';
      if (typeof oneAgSetView === 'function') oneAgSetView(view);
      if (typeof oneAgRenderTopCards === 'function') oneAgRenderTopCards();
    },
    tarefas:    function() { if (typeof renderOneTarefasPainel   === 'function') renderOneTarefasPainel(); },
    financeiro: function() { if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel(); },
    biblioteca: function() { if (typeof renderCerebro === 'function') renderCerebro(); },
    fiscal:     function() { if (typeof renderHistorico === 'function') renderHistorico(); }
  };

  var renderFn = renderers[target];
  if (renderFn) {
    renderFn(); // mostra dados locais imediatamente
    // Re-sync em background e re-renderiza quando chegar
    if (typeof supaSync === 'function' && window.supa && window.authUser) {
      supaSync().then(function() { renderFn(); }).catch(function(){});
    }
  }
}

function oneNovaTarefa() {
  swapToCenter('tarefas');
  setTimeout(function(){ var el = document.getElementById('one-tar-nome'); if(el) el.focus(); }, 200);
}

/* Helper do menu lateral novo: entra na tela do app unificado (screen-one) e
   já posiciona o painel central no alvo (agenda/tarefas/financeiro). Usado
   pelos itens "Agenda", "Tarefas" e "Financeiro" do menu reestruturado. */
function goOnePanel(target) {
  if (typeof go === 'function') go('one');
  setTimeout(function() {
    if (typeof swapToCenter === 'function') swapToCenter(target);
  }, 50);
}
window.goOnePanel = goOnePanel;

/* Hint do prompt global — clica numa sugestão e preenche o input */
function oneHintClick(el) {
  if (!el) return;
  var texto = (el.textContent || '').replace(/^[\s”'””]+|[\s”'””]+$/g, '');
  // Fecha o popup
  var popup = document.getElementById('one-hints-popup');
  if (popup) popup.setAttribute('hidden', '');
  // Envia direto para a Pinah, sem passar pelo input
  pinahEnviar(texto);
}

/* Toggle do popup de sugestões (clica no avatar da Pinah) */
function oneHintsPopupToggle(ev) {
  if (ev) ev.stopPropagation();
  var popup = document.getElementById('one-hints-popup');
  if (!popup) return;
  if (popup.hasAttribute('hidden')) {
    popup.removeAttribute('hidden');
    // Fecha ao clicar fora
    setTimeout(function(){
      var handler = function(e) {
        if (!popup.contains(e.target) && !e.target.closest('.one-prompt-avatar-btn')) {
          popup.setAttribute('hidden','');
          document.removeEventListener('click', handler);
        }
      };
      document.addEventListener('click', handler);
    }, 50);
  } else {
    popup.setAttribute('hidden', '');
  }
}

/* ── Estado dos filtros de Tarefas ── */
var oneTarFilterStatus = 'todos';
var oneTarFilterPrio   = 'qualquer';

function oneTarSetFilter(btn) {
  oneTarFilterStatus = btn.dataset.f;
  document.querySelectorAll('#one-tar-filters .one-tar-filter:not(.prio)').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  renderOneTarefasPainel();
}
function oneTarSetPrio(btn) {
  oneTarFilterPrio = btn.dataset.p;
  document.querySelectorAll('#one-tar-filters .one-tar-filter.prio').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  renderOneTarefasPainel();
}
function oneTarGetAreas() {
  try {
    var stored = JSON.parse(localStorage.getItem(oneU('tarefas_areas')) || 'null');
    if (stored && Array.isArray(stored)) {
      // Limpa "Geral" retroativamente: ela deixou de ser área do sistema.
      var limpa = stored.filter(function(a){ return a !== 'Geral'; });
      if (limpa.length !== stored.length) oneTarSaveAreas(limpa);
      return limpa;
    }
  } catch(e) {}
  // Sem áreas persistidas — retorna vazio. App não cria nada automaticamente.
  return [];
}
function oneTarSaveAreas(a) { localStorage.setItem(oneU('tarefas_areas'), JSON.stringify(a)); }

function oneTarNovaArea() {
  var nome = prompt('Nome da nova área:');
  if (!nome || !nome.trim()) return;
  var areas = oneTarGetAreas();
  nome = nome.trim();
  if (areas.indexOf(nome) === -1) { areas.push(nome); oneTarSaveAreas(areas); }
  renderOneTarefasPainel();
}
function oneTarFocarPrimeira() {
  var first = document.querySelector('.one-tar-col-add');
  if (first) first.click();
}
function oneTarShowInline(btn) {
  var wrap = btn.closest('.one-tar-inline-wrap');
  btn.style.display = 'none';
  wrap.querySelector('.one-tar-inline-form').style.display = 'flex';
  wrap.querySelector('.one-tar-inline-input').focus();
}
function oneTarHideInline(el) {
  var wrap = el.closest('.one-tar-inline-wrap');
  wrap.querySelector('.one-tar-inline-form').style.display = 'none';
  wrap.querySelector('.one-tar-col-add').style.display = '';
  wrap.querySelector('.one-tar-inline-input').value = '';
}
function oneTarInlineKey(e, input) {
  if (e.key === 'Enter') { e.preventDefault(); oneTarInlineSave(input); }
  if (e.key === 'Escape') { oneTarHideInline(input); }
}
function oneTarInlineSave(el) {
  var wrap = el.closest ? el.closest('.one-tar-inline-wrap') : el.parentElement.parentElement;
  var input = wrap.querySelector('.one-tar-inline-input');
  var col = wrap.closest('.one-tar-col');
  var area = col ? col.dataset.area : '';
  var nome = input ? input.value.trim() : '';
  if (!nome) { oneTarHideInline(el); return; }
  if (!area) {
    if (typeof oneToast==='function') oneToast('Tarefa precisa de uma área. Crie uma área primeiro.','error');
    oneTarHideInline(el);
    return;
  }
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU('tarefas'))||'[]'); } catch(e){}
  lista.push({ id: crypto.randomUUID(), nome: nome, area: area, prioridade: 'Normal', concluida: false, criado: new Date().toISOString() });
  localStorage.setItem(oneU('tarefas'), JSON.stringify(lista));
  if (typeof oneToast === 'function') oneToast('✓ Tarefa adicionada!');
  renderOneTarefasPainel();
  if (typeof renderDesktopSidebar === 'function') renderDesktopSidebar();
}

/* ── Gerenciamento de áreas (colunas do kanban) ─────────── */
var oneTarCollapsed = {}; // { nomeDaArea: true/false }

function oneTarAreaEditar(area, btn) {
  // Acha o span do nome dentro do header deste botão
  var header = btn.closest('.one-tar-col-header');
  if (!header) return;
  var nomeSpan = header.querySelector('.one-tar-col-nome');
  if (!nomeSpan) return;

  var input = document.createElement('input');
  input.type = 'text';
  input.value = area;
  input.className = 'one-tar-area-input';
  nomeSpan.replaceWith(input);
  input.focus();
  input.select();

  function salvar() {
    var novo = input.value.trim();
    if (!novo || novo === area) { renderOneTarefasPainel(); return; }
    // Atualiza tarefas que usam essa área
    var tarefas = [];
    try { tarefas = JSON.parse(localStorage.getItem(oneU('tarefas'))||'[]'); } catch(e){}
    tarefas.forEach(function(t){ if (t.area === area) t.area = novo; });
    localStorage.setItem(oneU('tarefas'), JSON.stringify(tarefas));
    // Atualiza lista de áreas
    var areas = oneTarGetAreas();
    var idx = areas.indexOf(area);
    if (idx !== -1) areas[idx] = novo;
    oneTarSaveAreas(areas);
    renderOneTarefasPainel();
  }
  input.addEventListener('blur', salvar);
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { renderOneTarefasPainel(); }
  });
}

function oneTarAreaDeletar(area) {
  var tarefas = [];
  try { tarefas = JSON.parse(localStorage.getItem(oneU('tarefas'))||'[]'); } catch(e){}
  var dessaArea = tarefas.filter(function(t){ return t.area === area; });
  if (dessaArea.length > 0) {
    if (!confirm('A área "' + area + '" tem ' + dessaArea.length + ' tarefa(s). Deletar a área apaga essas tarefas junto. Confirmar?')) return;
    // Remove as tarefas dessa área do localStorage e do cloud.
    dessaArea.forEach(function(t){ if (typeof supaDelete === 'function') supaDelete('tarefas', t.id); });
    tarefas = tarefas.filter(function(t){ return t.area !== area; });
    localStorage.setItem(oneU('tarefas'), JSON.stringify(tarefas));
  } else {
    if (!confirm('Excluir a área "' + area + '"?')) return;
  }
  var areas = oneTarGetAreas().filter(function(a){ return a !== area; });
  oneTarSaveAreas(areas);
  renderOneTarefasPainel();
  if (typeof renderOneTarefasMobile === 'function') renderOneTarefasMobile();
}

function oneTarAreaToggle(area, btn) {
  oneTarCollapsed[area] = !oneTarCollapsed[area];
  renderOneTarefasPainel();
}

function renderOneTarefasPainel() {
  var el = document.getElementById('one-tarefas-list');
  var count = document.getElementById('one-tarefas-count');
  if (!el) return;
  // Mini-mês do header (compartilhado com Agenda)
  if (typeof oneAgMiniMesRender === 'function') oneAgMiniMesRender();
  var todasTarefas = []; try { todasTarefas = JSON.parse(localStorage.getItem(oneU('tarefas'))||'[]'); } catch(e){}
  var pendentes = todasTarefas.filter(function(t){ return !t.concluida; });
  if (count) count.textContent = pendentes.length + ' pendente' + (pendentes.length === 1 ? '' : 's');

  // Contadores do header TaskAreas
  var elTotal = document.getElementById('one-tar-total');
  var elEm    = document.getElementById('one-tar-em-and');
  var elConc  = document.getElementById('one-tar-concluidas');
  var totalQ  = todasTarefas.length;
  var emAndQ  = todasTarefas.filter(function(t){ return t.status === 'em-andamento' && !t.concluida; }).length;
  var concQ   = todasTarefas.filter(function(t){ return !!t.concluida; }).length;
  if (elTotal) elTotal.textContent = totalQ + ' tarefa' + (totalQ === 1 ? '' : 's');
  if (elEm)    elEm.textContent    = emAndQ + ' em andamento';
  if (elConc)  elConc.textContent  = concQ + ' concluída' + (concQ === 1 ? '' : 's');

  function emojiArea(a) {
    var s = (a||'').toLowerCase();
    if (/pinah|app|produto|one|tech/.test(s)) return '🐾';
    if (/enrosco|problema|pendência|pendencia/.test(s)) return '🍅';
    if (/ideia|ideias\s*pa|projeto|criativ/.test(s)) return '💡';
    if (/casa|famil|lar/.test(s)) return '🏠';
    if (/baú|bau|milhão|milhao|dinheiro|financ|conta/.test(s)) return '💰';
    if (/clin|saúde|saude|médic|medic|fonoaud|terapeut/.test(s)) return '🩺';
    if (/trabalho|cap|escrit|negócio|negocio/.test(s)) return '💼';
    if (/estudo|curso|aprend|escola/.test(s)) return '📚';
    if (/compra|mercado/.test(s)) return '🛒';
    return '📋';
  }
  function corArea(a) {
    var paleta = ['#5C8870','#E87A7A','#5EB585','#F0A830','#5BA8D8','#C97DD4','#7EC8B8','#E0835C'];
    var h = 0;
    for (var i = 0; i < a.length; i++) h = a.charCodeAt(i) + ((h << 5) - h);
    return paleta[Math.abs(h) % paleta.length];
  }
  function corPrio(prio) {
    var p = (prio||'normal').toLowerCase();
    return p === 'alta'  ? {cor:'#C0392B', bg:'#FDECEA'} :
           p === 'baixa' ? {cor:'#27856A', bg:'#E3F5F0'} :
                           {cor:'#5A6A8A', bg:'#EEF1F7'};
  }

  // Áreas persistidas. Reconcilia com áreas presentes nas tarefas (vindas
  // do cloud, do seed ou de outro device) — sem isso, sync cloud sumia
  // tarefas. "Geral" fica de fora de propósito: não é mais área do sistema.
  var areaNames = oneTarGetAreas();
  var areasDirty = false;
  todasTarefas.forEach(function(t){
    var a = t.area;
    if (!a || a === 'Geral') return;
    if (areaNames.indexOf(a) === -1) { areaNames.push(a); areasDirty = true; }
  });
  if (areasDirty) oneTarSaveAreas(areaNames);

  // Filtrar tarefas
  var tarefas = todasTarefas.filter(function(t){
    if (oneTarFilterStatus === 'pendente'  && !!t.concluida) return false;
    if (oneTarFilterStatus === 'concluida' && !t.concluida)  return false;
    if (oneTarFilterPrio !== 'qualquer' && (t.prioridade||'Normal') !== oneTarFilterPrio) return false;
    return true;
  });

  var html = '<div class="one-tar-kanban">';
  areaNames.forEach(function(area) {
    var tasks = tarefas.filter(function(t){ return t.area === area; });
    var total = todasTarefas.filter(function(t){ return t.area === area; });
    var conclN = total.filter(function(t){ return !!t.concluida; }).length;
    var cor = corArea(area);
    var emoji = emojiArea(area);

    var cards = tasks.map(function(t) {
      var conc = !!t.concluida;
      var cp = corPrio(t.prioridade);
      return '<div class="one-tar-card' + (conc ? ' concluida' : '') + '" data-tid="' + t.id + '" onclick="oneTarModalEditar(this.dataset.tid)" style="cursor:pointer;border-left-color:' + (conc ? '#4CAF50' : cor) + '">' +
        '<div class="one-tar-check" data-tid="' + t.id + '" onclick="event.stopPropagation();oneTarToggle(this.dataset.tid)" style="background:' + (conc?'#4CAF50':'transparent') + ';border-color:' + (conc?'#4CAF50':'#C0BAD0') + '">' + (conc?'✓':'') + '</div>' +
        '<div class="one-tar-card-body">' +
          '<div class="one-tar-card-nome">' + ((t.nome||t.titulo||'Sem nome')+'').replace(/</g,'&lt;') + '</div>' +
          '<span class="one-tar-prio-badge" style="background:' + cp.bg + ';color:' + cp.cor + '">' + (t.prioridade||'Normal') + '</span>' +
          (t.data ? '<div class="one-tar-card-data">' + t.data.split('-').reverse().join('/') + '</div>' : '') +
        '</div>' +
      '</div>';
    }).join('');

    var emptyMsg = tasks.length === 0 ? '<div style="color:#C0BAD0;font-size:11px;font-style:italic;padding:8px 4px;text-align:center">Nenhuma tarefa</div>' : '';

    var areaEnc  = area.replace(/'/g,"\\'").replace(/"/g,'&quot;');
    var collapsed = oneTarCollapsed[area] ? ' one-tar-col-collapsed' : '';
    html += '<div class="one-tar-col' + collapsed + '" data-area="' + area.replace(/"/g,'&quot;') + '">' +
      '<div class="one-tar-col-header" style="border-top:3px solid ' + cor + '">' +
        '<div class="one-tar-col-drag" style="display:flex;align-items:center;gap:6px;min-width:0;flex:1;cursor:grab">' +
          '<span style="font-size:15px;flex-shrink:0">' + emoji + '</span>' +
          '<span class="one-tar-col-nome">' + area.replace(/</g,'&lt;') + '</span>' +
          '<span class="one-tar-col-count">' + conclN + '/' + total.length + '</span>' +
        '</div>' +
        '<div class="one-tar-col-actions">' +
          '<button class="one-tar-area-btn" onclick="oneTarAreaEditar(\'' + areaEnc + '\',this)" title="Renomear área">✏️</button>' +
          '<button class="one-tar-area-btn del" onclick="oneTarAreaDeletar(\'' + areaEnc + '\')" title="Excluir área">🗑️</button>' +
          '<button class="one-tar-area-btn chev" onclick="oneTarAreaToggle(\'' + areaEnc + '\',this)" title="Colapsar">' + (oneTarCollapsed[area] ? '▸' : '▾') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="one-tar-col-body">' + emptyMsg + cards + '</div>' +
      '<div class="one-tar-inline-wrap">' +
        '<button class="one-tar-col-add" onclick="oneTarModalAbrir(\'' + areaEnc + '\')">+ Nova tarefa</button>' +
      '</div>' +
    '</div>';
  });
  html += '</div>';
  el.innerHTML = html;

  // P023 — Drag horizontal das colunas de área (SortableJS)
  var kanbanEl = el.querySelector('.one-tar-kanban');
  if (kanbanEl && typeof Sortable !== 'undefined') {
    if (window._oneTarSortable) { try { window._oneTarSortable.destroy(); } catch(e){} }
    window._oneTarSortable = Sortable.create(kanbanEl, {
      handle: '.one-tar-col-drag',
      direction: 'horizontal',
      animation: 150,
      ghostClass: 'one-tar-col-ghost',
      onEnd: function() {
        var novaOrdem = Array.prototype.map.call(
          kanbanEl.querySelectorAll('.one-tar-col'),
          function(col) { return col.dataset.area; }
        );
        oneTarSaveAreas(novaOrdem);
        if (typeof oneToast === 'function') oneToast('✓ Ordem das áreas atualizada');
      }
    });
  }

  // Arrastar CARD de tarefa entre áreas (inbox → organizar). Um Sortable por
  // corpo de coluna, todos no mesmo grupo, pra o card poder pular de área.
  // Clique sem arrastar continua abrindo a edição (o Sortable só age no arrasto).
  if (kanbanEl && typeof Sortable !== 'undefined') {
    if (window._oneTarCardSortables) {
      window._oneTarCardSortables.forEach(function(s){ try { s.destroy(); } catch(e){} });
    }
    window._oneTarCardSortables = [];
    Array.prototype.forEach.call(kanbanEl.querySelectorAll('.one-tar-col-body'), function(body){
      var s = Sortable.create(body, {
        group: 'one-tar-cards',
        draggable: '.one-tar-card',
        animation: 150,
        ghostClass: 'one-tar-card-ghost',
        onEnd: function(evt){
          var card = evt.item;
          var tid = (card && card.dataset) ? card.dataset.tid : null;
          var destCol = evt.to.closest ? evt.to.closest('.one-tar-col') : null;
          var novaArea = destCol ? destCol.dataset.area : null;
          oneTarMoverCard(tid, novaArea);
        }
      });
      window._oneTarCardSortables.push(s);
    });
  }
  // Atualiza o card-resumo da sidebar direita após qualquer render do painel de tarefas
  if (typeof window.renderResumoTarefasCard === 'function') window.renderResumoTarefasCard();
}

/* ── Financeiro inline ──────────────────────────────── */
var oneFinTipoAtivo = 'receita';

function oneFinSetTipo(tipo) {
  oneFinTipoAtivo = tipo;
  var rec  = document.getElementById('one-fin-tab-rec');
  var desp = document.getElementById('one-fin-tab-desp');
  if (rec)  { rec.classList.toggle('active', tipo === 'receita'); rec.classList.remove('desp'); }
  if (desp) { desp.classList.toggle('active', tipo === 'despesa'); if (tipo==='despesa') desp.classList.add('desp'); else desp.classList.remove('desp'); }
}

function oneFinLimpar() {
  ['one-fin-nome','one-fin-valor','one-fin-cat'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.value = '';
  });
  var d = document.getElementById('one-fin-data');
  if (d) d.value = typeof hojeISO === 'function' ? hojeISO() : new Date().toISOString().slice(0,10);
  oneFinSetTipo('receita');
}

function oneFinSalvar() {
  var nome  = (document.getElementById('one-fin-nome')||{}).value || '';
  var valor = parseFloat((document.getElementById('one-fin-valor')||{}).value) || 0;
  var data  = (document.getElementById('one-fin-data')||{}).value || (typeof hojeISO==='function' ? hojeISO() : new Date().toISOString().slice(0,10));
  var cat   = (document.getElementById('one-fin-cat')||{}).value || '';
  if (!nome || !valor) { if (typeof oneToast==='function') oneToast('Preencha descrição e valor.','error'); return; }
  var key = oneFinTipoAtivo === 'receita' ? 'receitas' : 'despesas';
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU(key))||'[]'); } catch(e){}
  var novoFin = { id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(),
    nome: nome, valor: valor, data: data, categoria: cat,
    tipo: oneFinTipoAtivo,
    status: oneFinTipoAtivo==='receita' ? 'pendente' : 'pago', criado: new Date().toISOString() };
  lista.push(novoFin);
  localStorage.setItem(oneU(key), JSON.stringify(lista));
  supaUpsert(key, novoFin);
  oneFinLimpar();
  if (typeof oneToast==='function') oneToast('✓ ' + (oneFinTipoAtivo==='receita'?'Receita':'Despesa') + ' salva!');
  if (typeof renderOneFinanceiroPainel==='function') renderOneFinanceiroPainel();
  if (typeof renderDesktopSidebar==='function') renderDesktopSidebar();
}

function oneFinPromptPinah() {
  var input = document.getElementById('one-fin-prompt-input');
  if (!input || !input.value.trim()) return;
  if (typeof oneToast==='function') oneToast('Pinah em breve! Use o form por enquanto 💜');
  input.value = '';
}

/* ── Tarefas inline ──────────────────────────────────── */
function oneTarLimpar() {
  ['one-tar-nome','one-tar-area'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.value = '';
  });
  var p = document.getElementById('one-tar-prio'); if (p) p.value = 'Normal';
  var d = document.getElementById('one-tar-data'); if (d) d.value = '';
}

function oneTarSalvar() {
  var nome = (document.getElementById('one-tar-nome')||{}).value || '';
  if (!nome) { if (typeof oneToast==='function') oneToast('Nome da tarefa é obrigatório.','error'); return; }
  var area = (document.getElementById('one-tar-area')||{}).value || '';
  if (!area) { if (typeof oneToast==='function') oneToast('Selecione uma área pra tarefa.','error'); return; }
  var prio = (document.getElementById('one-tar-prio')||{}).value || 'Normal';
  var data = (document.getElementById('one-tar-data')||{}).value || '';
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU('tarefas'))||'[]'); } catch(e){}
  var novaTar = { id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(),
    titulo: nome, nome: nome, area: area, prioridade: prio, prazo: data || null, data: data,
    concluida: false, status: 'aberta', criado: new Date().toISOString() };
  lista.push(novaTar);
  localStorage.setItem(oneU('tarefas'), JSON.stringify(lista));
  supaUpsert('tarefas', novaTar);
  oneTarLimpar();
  if (typeof oneToast==='function') oneToast('✓ Tarefa salva!');
  if (typeof renderOneTarefasPainel==='function') renderOneTarefasPainel();
}

function oneTarToggle(id) {
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU('tarefas'))||'[]'); } catch(e){}
  var idx = lista.findIndex(function(t){ return t.id === id; });
  if (idx !== -1) {
    lista[idx].concluida = !lista[idx].concluida;
    lista[idx].status = lista[idx].concluida ? 'concluida' : 'aberta';
    localStorage.setItem(oneU('tarefas'), JSON.stringify(lista));
    supaUpsert('tarefas', lista[idx]);
  }
  if (typeof renderOneTarefasPainel==='function') renderOneTarefasPainel();
  if (typeof renderOneTarefasMobile==='function') renderOneTarefasMobile();
}


function oneTarMoverCard(tid, novaArea) {
  if (!tid || !novaArea) { renderOneTarefasPainel(); return; }
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU('tarefas'))||'[]'); } catch(e){}
  var idx = lista.findIndex(function(t){ return t.id === tid; });
  if (idx === -1) { renderOneTarefasPainel(); return; }
  if (lista[idx].area === novaArea) { renderOneTarefasPainel(); return; } // mesma área, nada muda
  lista[idx].area = novaArea;
  localStorage.setItem(oneU('tarefas'), JSON.stringify(lista));
  if (typeof supaUpsert === 'function') supaUpsert('tarefas', lista[idx]);
  if (typeof oneToast === 'function') oneToast('✓ Tarefa movida para ' + novaArea);
  renderOneTarefasPainel();
  if (typeof renderOneTarefasMobile === 'function') renderOneTarefasMobile();
}

function oneTarExcluir(id) {
  if (!confirm('Excluir esta tarefa?')) return;
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU('tarefas'))||'[]'); } catch(e){}
  lista = lista.filter(function(t){ return t.id !== id; });
  localStorage.setItem(oneU('tarefas'), JSON.stringify(lista));
  supaDelete('tarefas', id);
  if (typeof oneToast==='function') oneToast('Tarefa excluída.');
  renderOneTarefasPainel();
  if (typeof renderOneTarefasMobile==='function') renderOneTarefasMobile();
}

function oneTarModalAbrir(area) {
  var areas = oneTarGetAreas();
  if (!areas.length) {
    if (typeof oneToast==='function') oneToast('Crie uma área primeiro pra abrigar a tarefa.','error');
    if (typeof oneTarNovaArea === 'function') oneTarNovaArea();
    return;
  }
  var modal = document.getElementById('one-tar-modal');
  if (!modal) return;
  document.getElementById('one-tar-modal-title').textContent = 'Nova tarefa';
  document.getElementById('one-tar-modal-id').value = '';
  document.getElementById('one-tar-modal-nome').value = '';
  document.getElementById('one-tar-modal-desc').value = '';
  document.getElementById('one-tar-modal-prio').value = 'Normal';
  document.getElementById('one-tar-modal-status').value = 'pendente';
  document.getElementById('one-tar-modal-data').value = '';
  // Preencher áreas no select. Default = área passada (se válida) ou primeira existente.
  var sel = document.getElementById('one-tar-modal-area');
  var areaDefault = (area && areas.indexOf(area) !== -1) ? area : areas[0];
  sel.innerHTML = areas.map(function(a){ return '<option value="' + a.replace(/"/g,'&quot;') + '"' + (a===areaDefault?' selected':'') + '>' + a + '</option>'; }).join('');
  var del = document.getElementById('one-tar-modal-del');
  if (del) del.style.display = 'none';
  modal.classList.add('open');
  setTimeout(function(){ document.getElementById('one-tar-modal-nome').focus(); }, 100);
}

function oneTarModalEditar(id) {
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU('tarefas'))||'[]'); } catch(e){}
  var t = lista.find(function(x){ return x.id === id; });
  if (!t) return;
  var modal = document.getElementById('one-tar-modal');
  if (!modal) return;
  document.getElementById('one-tar-modal-title').textContent = 'Editar tarefa';
  document.getElementById('one-tar-modal-id').value = t.id;
  document.getElementById('one-tar-modal-nome').value = t.nome || '';
  document.getElementById('one-tar-modal-desc').value = t.descricao || '';
  document.getElementById('one-tar-modal-prio').value = t.prioridade || 'Normal';
  document.getElementById('one-tar-modal-status').value = t.concluida ? 'concluida' : 'pendente';
  document.getElementById('one-tar-modal-data').value = t.data || '';
  var sel = document.getElementById('one-tar-modal-area');
  var areas = oneTarGetAreas();
  sel.innerHTML = areas.map(function(a){ return '<option value="' + a.replace(/"/g,'&quot;') + '"' + (a===t.area?' selected':'') + '>' + a + '</option>'; }).join('');
  var del = document.getElementById('one-tar-modal-del');
  if (del) del.style.display = '';
  modal.classList.add('open');
  setTimeout(function(){ document.getElementById('one-tar-modal-nome').focus(); }, 100);
}

function oneTarModalExcluir() {
  var id = document.getElementById('one-tar-modal-id').value;
  if (!id) return;
  if (!confirm('Excluir esta tarefa?')) return;
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU('tarefas'))||'[]'); } catch(e){}
  lista = lista.filter(function(t){ return t.id !== id; });
  localStorage.setItem(oneU('tarefas'), JSON.stringify(lista));
  supaDelete('tarefas', id);
  if (typeof oneToast==='function') oneToast('Tarefa excluída.');
  oneTarModalFechar();
  if (typeof renderOneTarefasPainel==='function') renderOneTarefasPainel();
  if (typeof renderOneTarefasMobile==='function') renderOneTarefasMobile();
}

function oneTarModalFechar() {
  var modal = document.getElementById('one-tar-modal');
  if (modal) modal.classList.remove('open');
}

function oneTarModalSalvar() {
  var nome = (document.getElementById('one-tar-modal-nome').value || '').trim();
  if (!nome) { if (typeof oneToast==='function') oneToast('Título é obrigatório.','error'); return; }
  var id     = document.getElementById('one-tar-modal-id').value;
  var desc   = document.getElementById('one-tar-modal-desc').value || '';
  var area   = document.getElementById('one-tar-modal-area').value || '';
  if (!area) { if (typeof oneToast==='function') oneToast('Selecione uma área pra tarefa.','error'); return; }
  var prio   = document.getElementById('one-tar-modal-prio').value || 'Normal';
  var status = document.getElementById('one-tar-modal-status').value;
  var data   = document.getElementById('one-tar-modal-data').value || '';
  var lista  = []; try { lista = JSON.parse(localStorage.getItem(oneU('tarefas'))||'[]'); } catch(e){}
  if (id) {
    var idx = lista.findIndex(function(t){ return t.id === id; });
    if (idx !== -1) {
      lista[idx] = Object.assign(lista[idx], {
        titulo: nome, nome: nome, descricao: desc, area: area, prioridade: prio,
        concluida: status==='concluida', status: status, prazo: data || null, data: data
      });
      supaUpsert('tarefas', lista[idx]);
    }
    if (typeof oneToast==='function') oneToast('✓ Tarefa atualizada!');
  } else {
    var novaTarModal = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(),
      titulo: nome, nome: nome, descricao: desc, area: area, prioridade: prio,
      concluida: status==='concluida', status: status || 'aberta',
      prazo: data || null, data: data, criado: new Date().toISOString()
    };
    lista.push(novaTarModal);
    supaUpsert('tarefas', novaTarModal);
    if (typeof oneToast==='function') oneToast('✓ Tarefa criada!');
  }
  localStorage.setItem(oneU('tarefas'), JSON.stringify(lista));
  oneTarModalFechar();
  renderOneTarefasPainel();
}

function oneTarPromptPinah() {
  var input = document.getElementById('one-tar-prompt-input');
  if (!input || !input.value.trim()) return;
  if (typeof oneToast==='function') oneToast('Pinah em breve! Use o form por enquanto 💜');
  input.value = '';
}

/* Filtro de período da lista de lançamentos do painel financeiro */
window.oneFinFiltroPeriodo = window.oneFinFiltroPeriodo || 'mes';

function oneFinSetPeriodo(p) {
  window.oneFinFiltroPeriodo = p;
  // Atualiza visual dos tabs
  document.querySelectorAll('.one-fin-period-tab').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-periodo') === p);
  });
  if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
}
window.oneFinSetPeriodo = oneFinSetPeriodo;

/* Ícone + cor de fundo baseados na categoria do lançamento */
function oneFinCatIcon(cat) {
  var c = String(cat || '').toLowerCase();
  if (/atend|paciente|sess[aã]o|terapia/.test(c)) return { emoji: '🩺', cor: '#27856A', bg: '#EAF6F1' };
  if (/aval|exame/.test(c))                        return { emoji: '📋', cor: '#5B7CFA', bg: '#EEF2FE' };
  if (/consult/.test(c))                           return { emoji: '👩‍⚕️', cor: '#9B72B0', bg: '#F0E8F4' };
  if (/material|insumo/.test(c))                   return { emoji: '📦', cor: '#D4A655', bg: '#FCF6E8' };
  if (/aluguel|loca[cç][aã]o/.test(c))             return { emoji: '🏠', cor: '#8B6914', bg: '#FAF1DE' };
  if (/curso|capac|workshop|estudo/.test(c))       return { emoji: '🎓', cor: '#7B5CF0', bg: '#EFEAFB' };
  if (/comida|alimen|mercado|jantar/.test(c))      return { emoji: '🛒', cor: '#5C8870', bg: '#E5EFE3' };
  if (/transp|uber|comb|gasolina/.test(c))         return { emoji: '🚗', cor: '#FF8B5A', bg: '#FCEFE5' };
  if (/internet|telef|telecom/.test(c))            return { emoji: '📡', cor: '#27856A', bg: '#EAF6F1' };
  if (/sa[uú]de|farm|medica/.test(c))              return { emoji: '💊', cor: '#4CAF50', bg: '#EAF6EB' };
  if (/imposto|fisc|contad/.test(c))               return { emoji: '📊', cor: '#888880', bg: '#F0F0EE' };
  if (/secretari|equipe|funcion/.test(c))          return { emoji: '👥', cor: '#5B7CFA', bg: '#EEF2FE' };
  if (/tecno|software|app/.test(c))                return { emoji: '💻', cor: '#6E4F87', bg: '#EFEAFB' };
  if (/lazer|cinema|viagem|passeio/.test(c))       return { emoji: '🌅', cor: '#FF8B5A', bg: '#FCEFE5' };
  if (/fam[ií]lia|filho|m[aã]e|pai/.test(c))       return { emoji: '👨‍👩‍👧', cor: '#E67BB0', bg: '#FBEDF4' };
  return { emoji: '💸', cor: '#6B7F6F', bg: '#F2F6F1' };
}
window.oneFinCatIcon = oneFinCatIcon;

/* Formata "DD/MM" e "Hoje" / "Ontem" pra cabeçalhos do extrato agrupado */
function _oneFinDataLabel(dataStr, hoje) {
  if (!dataStr) return '';
  var d = new Date(dataStr + 'T00:00:00');
  var diffMs = hoje.getTime() - d.getTime();
  var diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDias === 0) return 'Hoje · ' + dataStr.split('-').reverse().join('/');
  if (diffDias === 1) return 'Ontem · ' + dataStr.split('-').reverse().join('/');
  // Dia da semana
  var dias = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  return dias[d.getDay()] + ' · ' + dataStr.split('-').reverse().join('/');
}

function renderOneFinanceiroPainel() {
  // Atualiza o bloco Pendências e Alertas a cada render do painel
  if (typeof renderOnePendenciasAlertas === 'function') renderOnePendenciasAlertas();

  // Se a vista ativa não for Extrato, renderiza ela em vez da lista de lançamentos
  var vistaAtual = window.oneFinVistaAtiva || 'geral';
  if (vistaAtual === 'geral' && typeof oneFinRenderGeral === 'function') {
    // Garante visibilidade da view geral, esconde outras — ESCOPO no painel financeiro
    document.querySelectorAll('.one-desktop-financeiro .one-fin-vista').forEach(function(v){ v.hidden = v.getAttribute('data-vista') !== 'geral'; });
    setTimeout(oneFinRenderGeral, 0);
  } else if (vistaAtual === 'resumo' && typeof oneFinRenderResumo === 'function') {
    document.querySelectorAll('.one-desktop-financeiro .one-fin-vista').forEach(function(v){ v.hidden = v.getAttribute('data-vista') !== 'resumo'; });
    setTimeout(oneFinRenderResumo, 0);
  } else if (vistaAtual === 'dashboard' && typeof oneFinRenderCategorias === 'function') {
    document.querySelectorAll('.one-desktop-financeiro .one-fin-vista').forEach(function(v){ v.hidden = v.getAttribute('data-vista') !== 'dashboard'; });
    setTimeout(oneFinRenderCategorias, 0);
  }

  var receitas = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]');
  var despesas = JSON.parse(localStorage.getItem(oneU('despesas')) || '[]');
  var hoje = new Date(); hoje.setHours(0,0,0,0);
  /* Mês ativo: começa em hoje, navega via setas. Vive em window pra sobreviver entre renders. */
  if (typeof window.oneFinMesAtivo !== 'number') window.oneFinMesAtivo = hoje.getMonth();
  if (typeof window.oneFinAnoAtivo !== 'number') window.oneFinAnoAtivo = hoje.getFullYear();
  var mes = window.oneFinMesAtivo;
  var ano = window.oneFinAnoAtivo;
  var meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  function noMes(d) {
    var date = new Date(d + 'T00:00:00');
    return date.getMonth() === mes && date.getFullYear() === ano;
  }
  /* Instâncias virtuais das fixas pra esse mês — pendentes, contam como lançamentos do mês */
  var _instMes = (typeof oneFinInstanciasDoMes === 'function') ? oneFinInstanciasDoMes(mes, ano) : { receitas: [], despesas: [] };
  var rMes = receitas.filter(function(r){ return noMes(r.data); }).concat(_instMes.receitas);
  var dMes = despesas.filter(function(d){ return noMes(d.data); }).concat(_instMes.despesas);

  /* Card grande do desktop — agora reflete a REALIDADE em conta, não
     o movimento previsto do mês. Valor central = saldo somado das contas
     bancárias (mesma fonte do mobile e do bloco Caixa do Resumo). Os 3
     mini-stats embaixo mostram o movimento previsto pra contextualizar. */
  var totalReceitasPagas = rMes.filter(function(r){ return r.status !== 'pendente'; }).reduce(function(s,r){ return s + (Number(r.valor)||0); }, 0);
  var totalPendente      = rMes.filter(function(r){ return r.status === 'pendente'; }).reduce(function(s,r){ return s + (Number(r.valor)||0); }, 0);
  /* Saídas = a pagar do mês (fixas + faturas com aPagar > 0), mesmo cálculo
     do bloco Acompanhamento. Antes somava TODAS as despesas como já pagas. */
  var totalAPagarMes = 0;
  if (typeof _oneFinResumoColetarObrigacoes === 'function') {
    var _obrigBig = _oneFinResumoColetarObrigacoes(mes, ano);
    totalAPagarMes = _obrigBig.despesas.reduce(function(s,i){ return s + (i.aPagar||0); }, 0) +
                     _obrigBig.faturas.reduce(function(s,i){ return s + (i.aPagar||0); }, 0);
  }
  /* Valor central = saldo em contas (banco), igual ao bloco Caixa do Resumo. */
  var saldoEmContas = (typeof _oneFinResumoSaldoEmContas === 'function') ? _oneFinResumoSaldoEmContas() : 0;
  /* Total acumulado em investimentos — alimenta o 4º card da linha. */
  var totalInvest   = (typeof _oneFinResumoTotalInvestimentos === 'function') ? _oneFinResumoTotalInvestimentos() : 0;

  function brl(v) { return 'R$ ' + (v||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}); }
  var setText = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };

  setText('one-fin-periodo', meses[mes].slice(0,3) + '/' + ano);
  setText('one-fin-saldo-big',         brl(saldoEmContas));
  setText('one-fin-entradas-big',      brl(totalReceitasPagas));
  setText('one-fin-saidas-big',        brl(totalAPagarMes));
  setText('one-fin-pendente-big',      brl(totalPendente));
  setText('one-fin-card-invest-val',   brl(totalInvest));

  /* Extrato em 2 colunas — Receitas | Despesas, cada uma com seu scroll
     interno e SOMA fixa embaixo. Filtros: Hoje, 7/15/30d, Mês.
     Faturas de cartão entram condensadas como 1 linha por mês no modo Mês. */
  var elRecBody = document.getElementById('one-fin-extrato-rec-body');
  var elDespBody = document.getElementById('one-fin-extrato-desp-body');
  if (!elRecBody && !elDespBody) return;

  var periodo = window.oneFinFiltroPeriodo || 'mes';
  var rFil = receitas, dFil = despesas;
  if (periodo === 'mes') {
    rFil = rMes; dFil = dMes;
  } else if (periodo === 'hoje') {
    var hojeStrH = hoje.toISOString().slice(0,10);
    var _instH = (typeof oneFinInstanciasNoIntervalo === 'function')
                   ? oneFinInstanciasNoIntervalo(hojeStrH, hojeStrH)
                   : { receitas: [], despesas: [] };
    rFil = receitas.filter(function(r){ return (r.data||'') === hojeStrH; }).concat(_instH.receitas);
    dFil = despesas.filter(function(d){ return (d.data||'') === hojeStrH; }).concat(_instH.despesas);
  } else {
    var dias = parseInt(periodo, 10) || 30;
    var inicio = new Date(hoje); inicio.setDate(inicio.getDate() - dias);
    var inicioStr = inicio.toISOString().slice(0,10);
    var hojeStr = hoje.toISOString().slice(0,10);
    var _instInt = (typeof oneFinInstanciasNoIntervalo === 'function')
                     ? oneFinInstanciasNoIntervalo(inicioStr, hojeStr)
                     : { receitas: [], despesas: [] };
    rFil = receitas.filter(function(r){ var dd = r.data||''; return dd >= inicioStr && dd <= hojeStr; }).concat(_instInt.receitas);
    dFil = despesas.filter(function(d){ var dd = d.data||''; return dd >= inicioStr && dd <= hojeStr; }).concat(_instInt.despesas);
  }

  /* Filtro vindo dos cards Pendentes/Vencendo foi removido — os cards agora
     são atalhos puros pro Extrato e mostram as 2 colunas completas. Nada
     escreve em window.oneFinFiltroAtivo nesse fluxo, e o branch antigo que
     zerava a coluna oposta ficou aqui só como nota histórica. */

  /* Receitas: reais + fixas instanciadas. key/id pra suportar editar/excluir. */
  var itensRec = rFil.map(function(r){
    var ehFixa = !!r._fixa;
    return {
      tipo: 'in',
      key:  ehFixa ? 'receitasFixas' : 'receitas',
      id:   ehFixa ? (r._fixaId || r.id) : r.id,
      nome: r.nome || r.descricao || 'Receita',
      categoria: r.categoria || r.tipo || '',
      valor: Number(r.valor) || 0,
      data: r.data,
      status: r.status || '',
      _fixa: ehFixa,
      _fatura: false
    };
  }).sort(function(a,b){ return (b.data||'').localeCompare(a.data||''); });

  /* Despesas: reais + fixas SEM cartão (cartão entra condensado como fatura). */
  var itensDesp = dFil
    .filter(function(d){
      var contaId = d.contaId;
      if (contaId) {
        var conta = (typeof oneFinGetConta === 'function') ? oneFinGetConta(contaId) : null;
        if (conta && conta.tipo === 'cartao') return false;
      }
      if (d.faturaMesAno) return false;
      return true;
    })
    .map(function(d){
      var ehFixa = !!d._fixa;
      return {
        tipo: 'out',
        key:  ehFixa ? 'despesasFixas' : 'despesas',
        id:   ehFixa ? (d._fixaId || d.id) : d.id,
        nome: d.descricao || d.nome || 'Despesa',
        categoria: d.categoria || '',
        valor: Number(d.valor) || 0,
        data: d.data,
        status: d.status || '',
        _fixa: ehFixa,
        _fatura: false
      };
    });

  /* Faturas condensadas — só no modo "Mês". */
  if (periodo === 'mes') {
    var mesAnoExt = ano + '-' + String(mes + 1).padStart(2, '0');
    var contasExt = (typeof oneFinGetContas === 'function') ? oneFinGetContas() : [];
    contasExt.forEach(function(c){
      if (c.tipo !== 'cartao') return;
      var totalFat = (typeof oneFinFaturaDoMes === 'function') ? oneFinFaturaDoMes(c.id, mesAnoExt) : 0;
      if (totalFat <= 0) return;
      var pagaFat = !!(Array.isArray(c.faturasPagas) && c.faturasPagas.indexOf(mesAnoExt) >= 0);
      var diaVenc = c.diaVencimento || 10;
      var dataFatura = ano + '-' + String(mes + 1).padStart(2, '0') + '-' + String(diaVenc).padStart(2, '0');
      itensDesp.push({
        tipo: 'out',
        nome: c.nome + ' (Fatura ' + mesAnoExt + ')',
        categoria: 'Cartão',
        icone: c.icone || '💳',
        cor: c.cor || '#9B72B0',
        valor: totalFat,
        data: dataFatura,
        status: pagaFat ? 'pago' : 'pendente',
        _fixa: false,
        _fatura: true
      });
    });
  }

  itensDesp.sort(function(a,b){ return (b.data||'').localeCompare(a.data||''); });

  /* Render — função de linha do extrato */
  function _renderLinhaExt(it) {
    var ico, bg, cor;
    if (it._fatura) {
      ico = it.icone || '💳';
      bg  = (it.cor || '#9B72B0') + '22';
      cor = it.cor || '#9B72B0';
    } else {
      var cat = (typeof oneFinCatIcon === 'function') ? oneFinCatIcon(it.categoria) : { emoji:'💸', cor:'#6B7F6F', bg:'#F2F6F1' };
      ico = cat.emoji;
      bg  = cat.bg;
      cor = cat.cor;
    }
    var dia = it.data ? parseInt(it.data.split('-')[2], 10) : '—';
    var pagoCls = (String(it.status||'').toLowerCase() === 'pago') ? ' pago' : '';
    var badge = '';
    if (it._fatura) badge = '<span class="badge-fatura">fatura</span>';
    else if (it._fixa) badge = '<span class="badge-fixa">↻ fixa</span>';
    var nomeSafe = (it.nome||'').replace(/</g,'&lt;');
    var sinal = it.tipo === 'in' ? '+' : '−';
    /* Botões editar/excluir — só pra itens não-fatura com key+id reais.
       Fatura é vista agregada (clique abre modal de pagamento via Resumo). */
    var actions = '';
    if (!it._fatura && it.key && it.id != null && it.id !== '') {
      var safeId   = String(it.id||'').replace(/'/g,"\\'");
      var safeKey  = String(it.key||'');
      var safeData = String(it.data||'').replace(/'/g,"\\'");
      actions = '<div class="one-fin-extrato-item-actions" onclick="event.stopPropagation()">' +
                  '<button class="one-fin-item-btn" onclick="oneFinEditar(\'' + safeKey + '\',\'' + safeId + '\',\'' + safeData + '\')" title="Editar">✏️</button>' +
                  '<button class="one-fin-item-btn del" onclick="oneFinExcluir(\'' + safeKey + '\',\'' + safeId + '\',\'' + safeData + '\')" title="Excluir">🗑️</button>' +
                '</div>';
    }
    return '<div class="one-fin-extrato-item' + pagoCls + '">' +
             '<div class="one-fin-extrato-item-ico" style="background:' + bg + ';color:' + cor + '">' + ico + '</div>' +
             '<div class="one-fin-extrato-item-dia">' + dia + '</div>' +
             '<div class="one-fin-extrato-item-nome">' + nomeSafe + badge + '</div>' +
             '<div class="one-fin-extrato-item-val">' + sinal + brl(it.valor).replace('R$ ','R$') + '</div>' +
             actions +
           '</div>';
  }

  /* Popula coluna Receitas */
  var setText2 = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };
  if (elRecBody) {
    elRecBody.innerHTML = itensRec.length
      ? itensRec.map(_renderLinhaExt).join('')
      : '<div class="one-fin-extrato-vazio">Nenhuma receita no período</div>';
  }
  var somaRec = itensRec.reduce(function(s,i){ return s + i.valor; }, 0);
  setText2('one-fin-extrato-rec-cnt', itensRec.length + (itensRec.length === 1 ? ' lançamento' : ' lançamentos'));
  setText2('one-fin-extrato-rec-soma', brl(somaRec));

  /* Popula coluna Despesas */
  if (elDespBody) {
    elDespBody.innerHTML = itensDesp.length
      ? itensDesp.map(_renderLinhaExt).join('')
      : '<div class="one-fin-extrato-vazio">Nenhuma despesa no período</div>';
  }
  var somaDesp = itensDesp.reduce(function(s,i){ return s + i.valor; }, 0);
  setText2('one-fin-extrato-desp-cnt', itensDesp.length + (itensDesp.length === 1 ? ' lançamento' : ' lançamentos'));
  setText2('one-fin-extrato-desp-soma', brl(somaDesp));

  /* ── Espelha o Extrato pro slide mobile (pill Extrato, colunas empilhadas) ── */
  var _mRec = document.getElementById('one-fin-mob-extrato-rec-body');
  if (_mRec && elRecBody) _mRec.innerHTML = elRecBody.innerHTML;
  var _mDesp = document.getElementById('one-fin-mob-extrato-desp-body');
  if (_mDesp && elDespBody) _mDesp.innerHTML = elDespBody.innerHTML;
  setText2('one-fin-mob-extrato-rec-cnt',  itensRec.length + (itensRec.length === 1 ? ' lançamento' : ' lançamentos'));
  setText2('one-fin-mob-extrato-rec-soma', brl(somaRec));
  setText2('one-fin-mob-extrato-desp-cnt', itensDesp.length + (itensDesp.length === 1 ? ' lançamento' : ' lançamentos'));
  setText2('one-fin-mob-extrato-desp-soma', brl(somaDesp));
}

function zerarFinanceiro() {
  if (!confirm('Zerar TODAS as receitas e despesas do seu financeiro?\n\nEsta ação não pode ser desfeita.')) return;
  localStorage.setItem(oneU('receitas'), JSON.stringify([]));
  localStorage.setItem(oneU('despesas'), JSON.stringify([]));
  if (typeof oneToast==='function') oneToast('✓ Financeiro zerado.');
  if (typeof renderOneFinanceiroPainel==='function') renderOneFinanceiroPainel();
  if (typeof renderCardFinanceiro==='function') renderCardFinanceiro();
  if (typeof renderDesktopSidebar==='function') renderDesktopSidebar();
}

/* ── Navegação de mês na Visão Geral (remendo Sessão C) ── */
function oneFinMesPrev() {
  if (typeof window.oneFinMesAtivo !== 'number') {
    var h = new Date();
    window.oneFinMesAtivo = h.getMonth();
    window.oneFinAnoAtivo = h.getFullYear();
  }
  window.oneFinMesAtivo--;
  if (window.oneFinMesAtivo < 0) { window.oneFinMesAtivo = 11; window.oneFinAnoAtivo--; }
  if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
  if (typeof oneFinMobRefresh === 'function') oneFinMobRefresh();
}
window.oneFinMesPrev = oneFinMesPrev;

function oneFinMesProx() {
  if (typeof window.oneFinMesAtivo !== 'number') {
    var h = new Date();
    window.oneFinMesAtivo = h.getMonth();
    window.oneFinAnoAtivo = h.getFullYear();
  }
  window.oneFinMesAtivo++;
  if (window.oneFinMesAtivo > 11) { window.oneFinMesAtivo = 0; window.oneFinAnoAtivo++; }
  if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
  if (typeof oneFinMobRefresh === 'function') oneFinMobRefresh();
}
window.oneFinMesProx = oneFinMesProx;

/* ── Blocos colapsáveis na Visão Geral (Sessão C frente 4) ── */
function oneFinSetAgrupamento(modo) {
  window.oneFinAgrupamento = (modo === 'conta') ? 'conta' : 'categoria';
  window.oneFinGruposAbertos = {}; /* reset ao trocar modo */
  if (typeof oneFinRenderGeral === 'function') oneFinRenderGeral();
}
window.oneFinSetAgrupamento = oneFinSetAgrupamento;

function oneFinToggleGrupo(chave) {
  if (!window.oneFinGruposAbertos) window.oneFinGruposAbertos = {};
  window.oneFinGruposAbertos[chave] = !window.oneFinGruposAbertos[chave];
  if (typeof oneFinRenderGeral === 'function') oneFinRenderGeral();
}
window.oneFinToggleGrupo = oneFinToggleGrupo;
window.zerarFinanceiro = zerarFinanceiro;

/* ════════════════════════════════════════════════════════════════
   DIÁLOGO DE ESCOPO (Fase 3) — 3 opções pra editar/excluir
   Aparece quando o user clica ✏️/🗑️ em instância virtual de fixa
   OU em parcela de lote. Opções: só esta · esta e as próximas · todas.
   Renderiza inline no body (sem alterar index.html). callback(escopo)
   recebe 'esta' | 'proximas' | 'todas' | null (cancelar).
   ════════════════════════════════════════════════════════════════ */
function oneFinDialogoEscopo(opts, callback) {
  opts = opts || {};
  var acao    = opts.acao    || 'editar';     // 'editar' | 'excluir'
  var contexto = opts.contexto || 'fixa';     // 'fixa' | 'lote'
  var dataLbl  = opts.dataLbl  || '';
  var nomeLbl  = opts.nomeLbl  || '';

  var verbo = (acao === 'excluir') ? 'Excluir' : 'Editar';
  var ehLote = (contexto === 'lote');
  var tituloRef = ehLote ? 'parcela' : 'lançamento';
  var sub = nomeLbl ? ('<div class="one-fin-dlg-sub">' + nomeLbl.replace(/</g,'&lt;') + (dataLbl ? (' · ' + dataLbl) : '') + '</div>') : '';

  /* Remove diálogo anterior se ainda estiver no DOM */
  var prev = document.getElementById('one-fin-dlg-escopo');
  if (prev && prev.parentNode) prev.parentNode.removeChild(prev);

  var dlg = document.createElement('div');
  dlg.id = 'one-fin-dlg-escopo';
  dlg.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(20,20,30,0.45);';

  var labelEsta     = ehLote ? 'Só esta parcela' : 'Só este mês';
  var subEsta       = ehLote ? 'Mexe apenas nesta parcela' : 'Vira lançamento avulso só no mês escolhido';
  var labelProximas = ehLote ? 'Esta e as próximas' : 'Este e os próximos meses';
  var subProximas   = ehLote ? 'Aplica a partir desta parcela em diante' : 'A fixa segue vivendo, mas com os novos dados a partir daqui';
  var labelTodas    = ehLote ? 'Todas as parcelas' : 'Todos os meses (template)';
  var subTodas      = ehLote ? 'Aplica a todas as parcelas do lote' : 'Altera a fixa inteira, vale pra todos os meses';

  /* ocultarEsta: esconde "Só este mês". Usado no EDITAR fixa — o valor efetivo
     do mês agora se lança no Resumo (lápis), não mais aqui. No excluir, "Só
     este mês" continua (pular o mês). */
  var btnEsta = opts.ocultarEsta ? '' : (
      '<button data-escopo="esta"     class="one-fin-dlg-btn" style="display:block;width:100%;text-align:left;background:#FFF;border:1px solid rgba(155,114,176,0.25);border-radius:12px;padding:12px 14px;margin-bottom:8px;cursor:pointer">' +
        '<div style="font-weight:600;color:#2C2A26">' + labelEsta + '</div>' +
        '<div style="color:#6B6660;font-size:12px;margin-top:2px">' + subEsta + '</div>' +
      '</button>');

  dlg.innerHTML =
    '<div class="one-fin-dlg-card" style="background:#F4F1EA;border-radius:18px;padding:22px 22px 18px;max-width:440px;width:92%;box-shadow:0 20px 60px rgba(0,0,0,0.25);font-family:Inter,system-ui,sans-serif">' +
      '<div class="one-fin-dlg-title" style="font-weight:700;color:#2C2A26;font-size:17px;margin-bottom:4px">' + verbo + ' ' + tituloRef + '</div>' +
      sub +
      '<div class="one-fin-dlg-question" style="color:#6B6660;font-size:14px;margin:10px 0 14px">Em qual escopo?</div>' +
      btnEsta +
      '<button data-escopo="proximas" class="one-fin-dlg-btn" style="display:block;width:100%;text-align:left;background:#FFF;border:1px solid rgba(155,114,176,0.25);border-radius:12px;padding:12px 14px;margin-bottom:8px;cursor:pointer">' +
        '<div style="font-weight:600;color:#2C2A26">' + labelProximas + '</div>' +
        '<div style="color:#6B6660;font-size:12px;margin-top:2px">' + subProximas + '</div>' +
      '</button>' +
      '<button data-escopo="todas"    class="one-fin-dlg-btn" style="display:block;width:100%;text-align:left;background:#FFF;border:1px solid rgba(155,114,176,0.25);border-radius:12px;padding:12px 14px;margin-bottom:8px;cursor:pointer">' +
        '<div style="font-weight:600;color:#2C2A26">' + labelTodas + '</div>' +
        '<div style="color:#6B6660;font-size:12px;margin-top:2px">' + subTodas + '</div>' +
      '</button>' +
      '<button data-escopo="cancel"   style="display:block;width:100%;text-align:center;background:transparent;border:none;color:#6B6660;font-size:13px;padding:10px 0;cursor:pointer;margin-top:4px">Cancelar</button>' +
    '</div>';

  function fechar(escolha){
    if (dlg.parentNode) dlg.parentNode.removeChild(dlg);
    if (typeof callback === 'function') callback(escolha);
  }
  dlg.addEventListener('click', function(ev){
    var t = ev.target;
    while (t && t !== dlg && !t.dataset.escopo) t = t.parentNode;
    if (t === dlg) { fechar(null); return; }   /* clicou fora do card */
    if (t && t.dataset.escopo) {
      var e = t.dataset.escopo;
      fechar(e === 'cancel' ? null : e);
    }
  });

  document.body.appendChild(dlg);
}
window.oneFinDialogoEscopo = oneFinDialogoEscopo;

/* ── Helpers de instância virtual de fixa ───────────────────────── */
function _oneFinExtrairMesAno(dataStr) {
  /* '2026-06-05' → '2026-06'. Retorna '' se inválido. */
  if (!dataStr || typeof dataStr !== 'string') return '';
  var m = dataStr.match(/^(\d{4})-(\d{2})/);
  return m ? (m[1] + '-' + m[2]) : '';
}

function _oneFinMesAnoAnterior(mesAno) {
  /* '2026-06' → '2026-05'. */
  var p = String(mesAno).split('-');
  var a = parseInt(p[0], 10), m = parseInt(p[1], 10);
  if (!a || !m) return '';
  m -= 1; if (m < 1) { m = 12; a -= 1; }
  return a + '-' + String(m).padStart(2,'0');
}

/* Marca um mês como pulado no template da fixa. Idempotente. */
function oneFinFixaPularMes(key, fixaId, mesAno) {
  if (!key || !fixaId || !mesAno) return false;
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU(key)) || '[]'); } catch(e){}
  var idx = lista.findIndex(function(x){ return String(x.id) === String(fixaId); });
  if (idx < 0) return false;
  var fix = lista[idx];
  var pulados = Array.isArray(fix.mesesPulados) ? fix.mesesPulados.slice() : [];
  if (pulados.indexOf(mesAno) < 0) pulados.push(mesAno);
  fix.mesesPulados = pulados;
  lista[idx] = fix;
  localStorage.setItem(oneU(key), JSON.stringify(lista));
  if (typeof supaUpsert === 'function') supaUpsert(key, fix);
  return true;
}
window.oneFinFixaPularMes = oneFinFixaPularMes;

/* Define o fim do template (último mês ativo). Usado pra "esta e as próximas"
   no excluir (encerra a fixa a partir do mês escolhido — inclusive). */
function oneFinFixaEncerrarEm(key, fixaId, ultimoMesAnoAtivo) {
  if (!key || !fixaId || !ultimoMesAnoAtivo) return false;
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU(key)) || '[]'); } catch(e){}
  var idx = lista.findIndex(function(x){ return String(x.id) === String(fixaId); });
  if (idx < 0) return false;
  lista[idx].fim = ultimoMesAnoAtivo;
  localStorage.setItem(oneU(key), JSON.stringify(lista));
  if (typeof supaUpsert === 'function') supaUpsert(key, lista[idx]);
  return true;
}
window.oneFinFixaEncerrarEm = oneFinFixaEncerrarEm;

/* Materializa UMA instância: cria despesa/receita real com os dados do template
   (mais data específica do mês escolhido) e marca o mês como pulado no template.
   Retorna o id da despesa/receita criada (pra modal abrir nela). */
function oneFinFixaMaterializarMes(keyFixa, fixaId, dataInstancia) {
  if (!keyFixa || !fixaId || !dataInstancia) return null;
  var listaFix = []; try { listaFix = JSON.parse(localStorage.getItem(oneU(keyFixa)) || '[]'); } catch(e){}
  var fix = listaFix.find(function(x){ return String(x.id) === String(fixaId); });
  if (!fix) return null;
  var ehReceita = (keyFixa === 'receitasFixas');
  var keyReal = ehReceita ? 'receitas' : 'despesas';
  var mesAno = _oneFinExtrairMesAno(dataInstancia);

  var uid = function() { return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).slice(2,8); };

  /* Calcula faturaMesAno se a conta for cartão (mesma lógica do modal salvar) */
  var conta = (fix.contaId && typeof oneFinGetConta === 'function') ? oneFinGetConta(fix.contaId) : null;
  var faturaTag = null;
  if (conta && conta.tipo === 'cartao' && typeof oneFinCalcularFatura === 'function') {
    faturaTag = oneFinCalcularFatura(dataInstancia, conta.diaFechamento);
  }

  var novo = {
    id: uid(),
    nome: fix.nome || fix.descricao || (ehReceita ? 'Receita' : 'Despesa'),
    descricao: fix.descricao || fix.nome || (ehReceita ? 'Receita' : 'Despesa'),
    valor: Number(fix.valor) || 0,
    data: dataInstancia,
    categoria: fix.categoria || '',
    tipo: ehReceita ? 'receita' : 'despesa',
    recorrencia: 'esporadica',
    status: 'pendente',
    contaId: fix.contaId || '',
    faturaMesAno: faturaTag,
    origemFixaId: fix.id,           /* rastreabilidade — opcional, ajuda em debug */
    criado: new Date().toISOString()
  };
  var listaReal = []; try { listaReal = JSON.parse(localStorage.getItem(oneU(keyReal)) || '[]'); } catch(e){}
  listaReal.push(novo);
  localStorage.setItem(oneU(keyReal), JSON.stringify(listaReal));
  if (typeof supaUpsert === 'function') supaUpsert(keyReal, novo);

  /* Marca mês como pulado no template */
  oneFinFixaPularMes(keyFixa, fixaId, mesAno);

  return { key: keyReal, id: novo.id };
}
window.oneFinFixaMaterializarMes = oneFinFixaMaterializarMes;

/* ── Helpers de lote (parcelas vinculadas por loteId) ────────────── */
function _oneFinLoteItens(key, loteId) {
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU(key)) || '[]'); } catch(e){}
  return lista.filter(function(x){ return x.loteId && String(x.loteId) === String(loteId); });
}

function oneFinLoteExcluirTodos(key, loteId) {
  if (!key || !loteId) return 0;
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU(key)) || '[]'); } catch(e){}
  var alvo = lista.filter(function(x){ return String(x.loteId) === String(loteId); });
  var restante = lista.filter(function(x){ return String(x.loteId) !== String(loteId); });
  localStorage.setItem(oneU(key), JSON.stringify(restante));
  alvo.forEach(function(it){ if (typeof supaDelete === 'function') supaDelete(key, it.id); });
  return alvo.length;
}
window.oneFinLoteExcluirTodos = oneFinLoteExcluirTodos;

function oneFinLoteExcluirApartir(key, parcelaId) {
  if (!key || !parcelaId) return 0;
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU(key)) || '[]'); } catch(e){}
  var ref = lista.find(function(x){ return String(x.id) === String(parcelaId); });
  if (!ref || !ref.loteId) return 0;
  var alvo = lista.filter(function(x){
    return String(x.loteId) === String(ref.loteId) && (x.data || '') >= (ref.data || '');
  });
  var ids = {};
  alvo.forEach(function(a){ ids[a.id] = true; });
  var restante = lista.filter(function(x){ return !ids[x.id]; });
  localStorage.setItem(oneU(key), JSON.stringify(restante));
  alvo.forEach(function(a){ if (typeof supaDelete === 'function') supaDelete(key, a.id); });
  return alvo.length;
}
window.oneFinLoteExcluirApartir = oneFinLoteExcluirApartir;

function oneFinExcluir(key, id, dataInstancia) {
  /* Despacha: instância virtual de fixa → diálogo de escopo;
              parcela de lote → diálogo de escopo;
              demais casos → confirm simples + exclusão direta. */
  var ehFixaKey = (key === 'despesasFixas' || key === 'receitasFixas');
  if (ehFixaKey && dataInstancia) {
    /* É instância virtual de fixa */
    var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU(key)) || '[]'); } catch(e){}
    var fix = lista.find(function(x){ return String(x.id) === String(id); });
    if (!fix) {
      if (typeof oneToast === 'function') oneToast('Fixa não encontrada.', 'error');
      return;
    }
    var mesAno = _oneFinExtrairMesAno(dataInstancia);
    oneFinDialogoEscopo({
      acao: 'excluir', contexto: 'fixa',
      nomeLbl: fix.nome || fix.descricao || 'Fixa',
      dataLbl: mesAno
    }, function(escopo){
      if (!escopo) return;
      if (escopo === 'esta') {
        oneFinFixaPularMes(key, id, mesAno);
        if (typeof oneToast === 'function') oneToast('✓ Mês de ' + mesAno + ' pulado.');
      } else if (escopo === 'proximas') {
        var anterior = _oneFinMesAnoAnterior(mesAno);
        oneFinFixaEncerrarEm(key, id, anterior);
        if (typeof oneToast === 'function') oneToast('✓ Fixa encerrada (último mês: ' + anterior + ').');
      } else if (escopo === 'todas') {
        var listaB = []; try { listaB = JSON.parse(localStorage.getItem(oneU(key))||'[]'); } catch(e){}
        listaB = listaB.filter(function(i){ return String(i.id) !== String(id); });
        localStorage.setItem(oneU(key), JSON.stringify(listaB));
        if (typeof supaDelete === 'function') supaDelete(key, id);
        if (typeof oneToast === 'function') oneToast('✓ Fixa excluída por completo.');
      }
      if (typeof renderOneFinanceiroPainel==='function') renderOneFinanceiroPainel();
      if (typeof oneFinRenderFixas==='function') oneFinRenderFixas();
      if (typeof renderDesktopSidebar==='function') renderDesktopSidebar();
    });
    return;
  }

  /* Parcela de lote? */
  var keyEsporadica = (key === 'receitas' || key === 'despesas');
  if (keyEsporadica && dataInstancia) {
    var lst = []; try { lst = JSON.parse(localStorage.getItem(oneU(key)) || '[]'); } catch(e){}
    var it  = lst.find(function(x){ return String(x.id) === String(id); });
    if (it && it.loteId) {
      var labelData = (it.data || '').split('-').reverse().slice(0,2).join('/');
      oneFinDialogoEscopo({
        acao: 'excluir', contexto: 'lote',
        nomeLbl: it.nome || it.descricao || 'Parcela',
        dataLbl: labelData
      }, function(escopo){
        if (!escopo) return;
        if (escopo === 'esta') {
          var lst2 = []; try { lst2 = JSON.parse(localStorage.getItem(oneU(key))||'[]'); } catch(e){}
          lst2 = lst2.filter(function(i){ return String(i.id) !== String(id); });
          localStorage.setItem(oneU(key), JSON.stringify(lst2));
          if (typeof supaDelete === 'function') supaDelete(key, id);
          if (typeof oneToast === 'function') oneToast('✓ Parcela excluída.');
        } else if (escopo === 'proximas') {
          var n = oneFinLoteExcluirApartir(key, id);
          if (typeof oneToast === 'function') oneToast('✓ ' + n + ' parcelas excluídas (esta + próximas).');
        } else if (escopo === 'todas') {
          var n2 = oneFinLoteExcluirTodos(key, it.loteId);
          if (typeof oneToast === 'function') oneToast('✓ ' + n2 + ' parcelas excluídas (lote inteiro).');
        }
        if (typeof renderOneFinanceiroPainel==='function') renderOneFinanceiroPainel();
        if (typeof renderDesktopSidebar==='function') renderDesktopSidebar();
      });
      return;
    }
  }

  /* Caso padrão: confirm simples + delete direto */
  if (!confirm('Excluir este lançamento?')) return;
  var lista0 = []; try { lista0 = JSON.parse(localStorage.getItem(oneU(key))||'[]'); } catch(e){}
  lista0 = lista0.filter(function(i){ return i.id !== id; });
  localStorage.setItem(oneU(key), JSON.stringify(lista0));
  supaDelete(key, id);
  if (typeof oneToast==='function') oneToast('✓ Lançamento excluído.');
  if (typeof renderOneFinanceiroPainel==='function') renderOneFinanceiroPainel();
  if (typeof renderDesktopSidebar==='function') renderDesktopSidebar();
}

/* Agora abre o modal de lançamento (em vez do form inline removido).
   3º parâmetro opcional dataInstancia (YYYY-MM-DD): quando vier preenchido
   e o item for instância virtual de fixa OU parcela de lote, abrimos o
   diálogo de escopo antes do modal. */
function oneFinEditar(key, id, dataInstancia) {
  var ehFixaKey = (key === 'despesasFixas' || key === 'receitasFixas');
  if (ehFixaKey && dataInstancia) {
    var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU(key)) || '[]'); } catch(e){}
    var fix = lista.find(function(x){ return String(x.id) === String(id); });
    if (!fix) {
      if (typeof oneToast === 'function') oneToast('Fixa não encontrada.', 'error');
      return;
    }
    var mesAno = _oneFinExtrairMesAno(dataInstancia);
    oneFinDialogoEscopo({
      acao: 'editar', contexto: 'fixa',
      nomeLbl: fix.nome || fix.descricao || 'Fixa',
      dataLbl: mesAno,
      /* Editar fixa mexe SÓ na previsão. O valor efetivo de um mês se lança
         no Resumo (lápis na linha), não mais aqui — por isso some o "Só este mês". */
      ocultarEsta: true
    }, function(escopo){
      if (!escopo) return;
      if (escopo === 'proximas') {
        /* Encerra o template no mês anterior e abre modal NOVO já como fixa,
           pré-preenchido com os dados atuais, pra Mentor ajustar a partir do
           mês escolhido. Se ele salvar sem mudar nada, gera fixa idêntica. */
        var anterior = _oneFinMesAnoAnterior(mesAno);
        oneFinFixaEncerrarEm(key, id, anterior);
        if (typeof oneToast === 'function') oneToast('✓ Fixa antiga encerrada em ' + anterior + '. Crie a nova versão.');
        if (typeof oneFinModalAbrir === 'function') {
          var tipoLanc = (key === 'receitasFixas') ? 'receita' : 'despesa';
          oneFinModalAbrir(tipoLanc);
          /* Pré-preenche modal com dados da fixa, marcando recorrência fixa
             e início = mês escolhido. Pequeno delay pra modal abrir antes. */
          setTimeout(function(){
            try {
              document.getElementById('one-fin-modal-title').textContent = 'Nova fixa (a partir de ' + mesAno + ')';
              document.getElementById('one-fin-modal-nome').value  = fix.nome || fix.descricao || '';
              document.getElementById('one-fin-modal-valor').value = fix.valor || '';
              document.getElementById('one-fin-modal-dia').value   = String(fix.diaDoMes || 5);
              document.getElementById('one-fin-modal-inicio').value = mesAno;
              if (typeof oneFinModalSetRecorrencia === 'function') oneFinModalSetRecorrencia('fixa');
              var contaSel = document.getElementById('one-fin-modal-conta');
              if (contaSel && fix.contaId) {
                Array.prototype.some.call(contaSel.options, function(op){
                  if (op.value === String(fix.contaId)) { contaSel.value = op.value; return true; }
                  return false;
                });
              }
              var catSel = document.getElementById('one-fin-modal-cat');
              if (catSel && fix.categoria) {
                if (!catSel.querySelector('option[value="' + fix.categoria.replace(/"/g,'\\"') + '"]') && typeof oneFinAddCategoria==='function') {
                  oneFinAddCategoria(tipoLanc, fix.categoria);
                  if (typeof oneFinModalRefreshCategorias==='function') oneFinModalRefreshCategorias();
                }
                catSel.value = fix.categoria;
              }
            } catch(e) { console.warn('[oneFinEditar próximas] preenchimento parcial:', e); }
          }, 120);
        }
      } else if (escopo === 'todas') {
        if (typeof oneFinModalEditar === 'function') oneFinModalEditar(key, id);
      }
    });
    return;
  }

  /* Parcela de lote? */
  var keyEsporadica = (key === 'receitas' || key === 'despesas');
  if (keyEsporadica && dataInstancia) {
    var lst = []; try { lst = JSON.parse(localStorage.getItem(oneU(key)) || '[]'); } catch(e){}
    var it  = lst.find(function(x){ return String(x.id) === String(id); });
    if (it && it.loteId) {
      var labelData = (it.data || '').split('-').reverse().slice(0,2).join('/');
      oneFinDialogoEscopo({
        acao: 'editar', contexto: 'lote',
        nomeLbl: it.nome || it.descricao || 'Parcela',
        dataLbl: labelData
      }, function(escopo){
        if (!escopo) return;
        /* Pra lote, "esta" abre modal só da parcela; "proximas"/"todas" também
           abrem o modal (Mentor edita os campos), e na hora de salvar a gente
           aplica o delta às outras parcelas via gancho temporário. */
        window.__oneFinLoteEscopo = (escopo === 'esta') ? null : { escopo: escopo, loteId: it.loteId, dataRef: it.data, key: key };
        if (typeof oneFinModalEditar === 'function') oneFinModalEditar(key, id);
      });
      return;
    }
  }

  /* Caso padrão: modal direto */
  if (typeof oneFinModalEditar === 'function') {
    oneFinModalEditar(key, id);
  } else if (typeof oneToast === 'function') {
    oneToast('Modal não carregado ainda. Tente em alguns segundos.', 'error');
  }
}

/* ── Estado das visões da Agenda ───────────────────────────────── */
var oneAgView         = 'semana';  // 'semana' | 'dia' | 'mes'
var oneAgSelectedDate = new Date().toISOString().slice(0,10); // data selecionada p/ visão Dia
var oneAgMonthOffset  = 0;         // deslocamento de mês na visão Mês

function oneAgSetView(view) {
  oneAgView = view;
  document.querySelectorAll('.one-ag-view-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.view === view);
  });
  var kanban = document.getElementById('one-ag-kanban');
  var mes    = document.getElementById('one-ag-mes');
  if (kanban) kanban.hidden = view !== 'semana';
  if (mes)    mes.hidden    = view !== 'mes';
  renderOneAgendaPainel();
}

/* Clicar numa semana no Mês → vai pra semana correspondente */
function oneAgGoToSemana(weekOffset) {
  oneAgWeekOffset = weekOffset;
  oneAgSetView('semana');
}

function oneAgNavegar(delta) {
  var curView = (window.oneAgViewAtiva || oneAgView || 'semana');
  if (curView === 'semana') {
    oneAgWeekOffset += delta;
  } else if (curView === 'mes') {
    oneAgMonthOffset += delta;
  } else if (curView === 'hoje') {
    var d = new Date(((window.oneAgHojeSelecionado || new Date().toISOString().slice(0,10))) + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    window.oneAgHojeSelecionado = d.toISOString().slice(0,10);
  }
  renderOneAgendaPainel();
}

/* Paleta de categorias da Agenda — cor (borda + hora + dot) e bg (card)
   Detecta via regex no texto digitado/escolhido, com fallback lilás Pinah. */
function oneAgCorCategoria(tipo) {
  var t = (tipo || '').toLowerCase();
  if (/atend|paciente|consulta|sess[aã]o|terapia/.test(t))   return { cor: '#27856A', bg: '#EAF6F1' }; // verde-teal
  if (/reuni|meeting|call|encontro/.test(t))                 return { cor: '#5B7CFA', bg: '#EEF2FE' }; // azul
  if (/admin|burocra|cart[oó]rio|banco|imposto|fisc/.test(t))return { cor: '#D4A655', bg: '#FCF6E8' }; // dourado
  if (/sa[uú]de|m[eé]dico|exame|dentista|cl[ií]nic/.test(t)) return { cor: '#4CAF50', bg: '#EAF6EB' }; // verde
  if (/fam[ií]lia|filho|pai|m[aã]e|filha|av[oó]/.test(t))    return { cor: '#E67BB0', bg: '#FBEDF4' }; // rosa
  if (/financ|pagam|cobran|recebim|caixa/.test(t))           return { cor: '#B8860B', bg: '#FAF1DE' }; // ocre
  if (/lazer|cinema|jantar|passeio|viagem|hobby/.test(t))    return { cor: '#FF8B5A', bg: '#FCEFE5' }; // laranja
  if (/curso|estudo|aula|treino|workshop/.test(t))           return { cor: '#5C8870', bg: '#EFEAFB' }; // roxo
  if (/pessoal/.test(t))                                     return { cor: '#7FA88E', bg: '#F0E8F4' }; // lilás Pinah
  return { cor: '#7FA88E', bg: '#F4ECF7' }; // default lilás
}

function renderOneAgendaPainel() {
  // Mini-mês do header roda em qualquer vista (semana / hoje / mês)
  oneAgMiniMesRender();
  if (oneAgView === 'dia') { renderOneAgDia(); return; }
  if (oneAgView === 'mes') { renderOneAgMes(); return; }

  var kanban = document.getElementById('one-ag-kanban');
  // Label do periodo: usa o novo ID padrao TaskAreas (fallback pro antigo)
  var label  = document.getElementById('one-ag-periodo-label') || document.getElementById('one-ag-mes-label');
  if (!kanban) return;

  var compromissos = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]');
  var hoje = new Date(); hoje.setHours(0,0,0,0);
  var hojeStr = hoje.toISOString().slice(0,10);

  // Segunda da semana + offset
  var dow = hoje.getDay();
  var diffSeg = (dow === 0 ? -6 : 1 - dow);
  var seg = new Date(hoje);
  seg.setDate(hoje.getDate() + diffSeg + (oneAgWeekOffset * 7));

  var meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  var domDaSemana = new Date(seg); domDaSemana.setDate(seg.getDate() + 6);
  if (label) {
    // Formato compacto pra caber inline: "11–17 mai 2026"
    var dIni = seg.getDate();
    var dFim = domDaSemana.getDate();
    var mIni = meses[seg.getMonth()].slice(0,3);
    var mFim = meses[domDaSemana.getMonth()].slice(0,3);
    var ano = domDaSemana.getFullYear();
    if (seg.getMonth() === domDaSemana.getMonth()) {
      label.textContent = dIni + '–' + dFim + ' ' + mIni + ' ' + ano;
    } else {
      label.textContent = dIni + ' ' + mIni + ' – ' + dFim + ' ' + mFim + ' ' + ano;
    }
  }

  var NOMES = ['SEG','TER','QUA','QUI','SEX','SÁB','DOM'];
  var PALETTE = ['#C97B6A','#D89B5A','#D4B855','#A8B470','#7FA88E','#9DB1A8','#8DA39A'];

  var H_START = 0, H_END = 24, PX = 50;
  var BODY_H = (H_END - H_START) * PX; // 1200px (00:00–24:00)

  // Grid lines (reutilizadas em cada coluna)
  var gridLines = '';
  for (var gh = 0; gh <= H_END - H_START; gh++) {
    gridLines += '<div class="one-ag-tl-grid-line" style="top:' + (gh * PX) + 'px"></div>';
  }

  // Régua única à esquerda — SEM cap (o cap fica na .one-ag-week-top).
  // Labels ficam dentro de .one-ag-tl-ruler-content que é deslocado via
  // transform pelo JS pra acompanhar a coluna ativa (scroll independente).
  var rulerHtml = '<div class="one-ag-tl-ruler one-ag-week-ruler"><div class="one-ag-tl-ruler-content">';
  for (var rh = H_START; rh <= H_END; rh++) {
    var rt = (rh - H_START) * PX;
    rulerHtml += '<div class="one-ag-tl-hour" style="top:' + rt + 'px">' + (rh < 10 ? '0' : '') + rh + ':00</div>';
  }
  rulerHtml += '</div></div>';

  // Acumula headers (linha sticky) e bodies (colunas) separadamente
  var headerColsHtml = '';
  var colsHtml = '';

  for (var i = 0; i < 7; i++) {
    var d = new Date(seg); d.setDate(seg.getDate() + i);
    var ds = d.toISOString().slice(0,10);
    var isHoje = ds === hojeStr;
    var dowReal = d.getDay();

    var doDia = compromissos
      .filter(function(c){ return c.data === ds; })
      .sort(function(a,b){ return (a.hora||'').localeCompare(b.hora||''); });

    var numDia = d.getDate();
    var numHtml = isHoje
      ? '<span class="one-ag-kday-num today-circle">' + numDia + '</span>'
      : '<span class="one-ag-kday-num">' + numDia + '</span>';

    var cards = (function(list, hStart, px) {
      return list.map(function(c) {
        var realizado = !!c.status && c.status.toLowerCase() === 'realizado';
        var hora = c.hora || '08:00';
        var nome = (c.nome || c.descricao || 'Compromisso').replace(/</g,'&lt;');
        var tipo = (c.tipo || '').replace(/</g,'&lt;');
        var cat  = oneAgCorCategoria(tipo);
        var checkBg  = realizado ? '#4CAF50' : 'transparent';
        var checkBdr = realizado ? '#4CAF50' : '#C0BAD0';
        var checkTxt = realizado ? '✓' : '';
        var parts = String(hora).split(':');
        var hh = parseInt(parts[0]) || 0;
        var mm = parseInt(parts[1]) || 0;
        var top = ((hh - hStart) + mm / 60) * px;
        if (top < 0) top = 0;
        var dur = parseInt(c.duracao) || 60;
        var hPx = Math.max(22, Math.round(dur * (px / 60)));
        var valor = c.valor ? ' · R$' + Number(c.valor).toFixed(0) : '';
        return '<div class="one-ag-kcard one-ag-tl-card' + (realizado ? ' realizado' : '') + '" draggable="true" data-event-id="' + c.id + '" data-cid="' + c.id + '" onclick="oneAgModalEditar(this.dataset.cid)" style="top:' + top + 'px;height:' + hPx + 'px;border-left-color:' + cat.cor + ';background:' + cat.bg + '">' +
          '<div class="one-ag-kcard-check" data-cid="' + c.id + '" onclick="event.stopPropagation();oneAgToggleRealizado(this.dataset.cid)" style="background:' + checkBg + ';border-color:' + checkBdr + '">' + checkTxt + '</div>' +
          '<div class="one-ag-kcard-body">' +
            '<div class="one-ag-kcard-hora" style="color:' + cat.cor + '">' + hora + (valor ? '<span style="margin-left:5px;opacity:.7;font-size:10px">' + valor + '</span>' : '') + '</div>' +
            '<div class="one-ag-kcard-nome">' + nome + '</div>' +
            (tipo ? '<div class="one-ag-kcard-tipo"><span class="one-ag-kcard-dot" style="background:' + cat.cor + '"></span>' + tipo + '</div>' : '') +
          '</div>' +
        '</div>';
      }).join('');
    }(doDia, H_START, PX));

    // Header desta coluna — vai para a linha sticky (.one-ag-week-top)
    // Inclui botão "+ Novo" fixo junto com o dia (não rola com o timeline)
    headerColsHtml +=
      '<div class="one-ag-kday-header' + (isHoje ? ' today' : '') + '" data-date="' + ds + '" style="border-top:3px solid ' + PALETTE[i] + '">' +
        '<div class="one-ag-kday-name-wrap">' +
          '<span class="one-ag-kday-name">' + NOMES[i] + '</span>' +
          numHtml +
        '</div>' +
        '<div class="one-ag-kday-header-right">' +
          '<span class="one-ag-kday-count">' + doDia.length + '</span>' +
          '<button class="one-ag-kday-add-hdr" onclick="event.stopPropagation();oneAgModalAbrir(\'' + ds + '\')" title="Novo agendamento">+</button>' +
        '</div>' +
      '</div>';

    // Body desta coluna — SEM header e SEM botão add (botão foi para o header sticky)
    colsHtml +=
      '<div class="one-ag-kday-col' + (isHoje ? ' today' : '') + '" data-date="' + ds + '" data-dow="' + dowReal + '">' +
        '<div class="one-ag-kday-body" data-date="' + ds + '" data-hour-offset="' + H_START + '" style="height:' + BODY_H + 'px" onclick="oneAgClickSlotWeek(event,this)">' +
          gridLines + cards +
        '</div>' +
      '</div>';
  }

  // Linha sticky de headers + body scrollável separados
  kanban.innerHTML =
    '<div class="one-ag-week-top">' +
      '<div class="one-ag-ruler-cap" style="width:44px;flex-shrink:0"></div>' +
      '<div class="one-ag-week-header-cols">' + headerColsHtml + '</div>' +
    '</div>' +
    '<div class="one-ag-week-main">' +
      rulerHtml +
      '<div class="one-ag-tl-cols one-ag-week-cols">' + colsHtml + '</div>' +
    '</div>';

  // Garante que a vista semana está visível (proteção contra chamadas concorrentes)
  document.querySelectorAll('.one-desktop-agenda .one-fin-vista').forEach(function(v) {
    v.hidden = v.getAttribute('data-view') !== 'semana';
  });

  oneInitAgendaSortable();
  oneAgSyncScrollSetup(kanban);
}

/* Mini-calendário do mês no header da Agenda — referência do Google
   Calendar. Navega independente da vista principal (setas próprias).
   Clicar num dia move a vista principal pra centralizar nesse dia. */
var oneAgMiniMesData = null; // Date apontando pro primeiro dia do mês visível

function oneAgMiniMesRender() {
  var instancias = document.querySelectorAll('.one-ag-mini-mes');
  if (!instancias.length) return;
  if (!oneAgMiniMesData) {
    oneAgMiniMesData = new Date();
    oneAgMiniMesData.setDate(1);
    oneAgMiniMesData.setHours(0,0,0,0);
  }
  var meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  var ano = oneAgMiniMesData.getFullYear();
  var mes = oneAgMiniMesData.getMonth();
  var tituloTexto = meses[mes] + ' ' + ano;

  var hoje = new Date(); hoje.setHours(0,0,0,0);
  var hojeStr = hoje.getFullYear() + '-' + String(hoje.getMonth()+1).padStart(2,'0') + '-' + String(hoje.getDate()).padStart(2,'0');

  // Começa a grade no domingo da primeira semana que contém dia 1
  var primeiro = new Date(ano, mes, 1);
  var dowPrim = primeiro.getDay();
  var ini = new Date(primeiro);
  ini.setDate(1 - dowPrim);

  var html = '';
  for (var i = 0; i < 42; i++) {
    var d = new Date(ini);
    d.setDate(ini.getDate() + i);
    var iso = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    var isHoje = iso === hojeStr;
    var isOutroMes = d.getMonth() !== mes;
    var cls = 'one-ag-mini-mes-dia';
    if (isOutroMes) cls += ' outro-mes';
    if (isHoje) cls += ' hoje';
    html += '<button class="' + cls + '" data-iso="' + iso + '" onclick="oneAgMiniMesClickDia(this.dataset.iso)">' + d.getDate() + '</button>';
  }

  // Renderiza em todas as instâncias (Agenda + Tarefas + outras no futuro)
  instancias.forEach(function(inst) {
    var grid = inst.querySelector('.one-ag-mini-mes-grid');
    if (grid) grid.innerHTML = html;
  });
  // Título pode estar dentro do card (Agenda) OU fora dele (Tarefas, junto às setas)
  // — atualizamos todos os elementos com a classe pra manter sincronizados.
  document.querySelectorAll('.one-ag-mini-mes-titulo').forEach(function(t) {
    t.textContent = tituloTexto;
  });
}

function oneAgMiniMesNav(delta) {
  if (!oneAgMiniMesData) {
    oneAgMiniMesData = new Date();
    oneAgMiniMesData.setDate(1);
    oneAgMiniMesData.setHours(0,0,0,0);
  }
  oneAgMiniMesData.setMonth(oneAgMiniMesData.getMonth() + delta);
  oneAgMiniMesRender();
}

function oneAgMiniMesClickDia(iso) {
  var d = new Date(iso + 'T00:00:00');
  var hoje = new Date(); hoje.setHours(0,0,0,0);
  // Segunda da semana de hoje
  var dowHoje = hoje.getDay();
  var diffSegHoje = (dowHoje === 0 ? -6 : 1 - dowHoje);
  var segHoje = new Date(hoje);
  segHoje.setDate(hoje.getDate() + diffSegHoje);
  // Segunda da semana clicada
  var dowClick = d.getDay();
  var diffSegClick = (dowClick === 0 ? -6 : 1 - dowClick);
  var segClick = new Date(d);
  segClick.setDate(d.getDate() + diffSegClick);
  // Diferença em semanas (round pra absorver fuso/DST)
  var diffMs = segClick.getTime() - segHoje.getTime();
  var diffSemanas = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
  oneAgWeekOffset = diffSemanas;
  // Vista Hoje: aponta pro dia clicado
  window.oneAgHojeSelecionado = iso;
  // Vista Mês: offset em meses
  oneAgMonthOffset = (d.getFullYear() - hoje.getFullYear()) * 12 + (d.getMonth() - hoje.getMonth());
  renderOneAgendaPainel();
}

/* Scroll sincronizado: cada .one-ag-kday-col tem scroll Y interno
   (pra preservar o contorno fechado da coluna no viewport), mas quando
   uma rola TODAS rolam juntas — assim como a régua à esquerda. Flag
   de "sincronizando" evita loop infinito de eventos. */
/* Estado do scroll Y da Agenda — preservado entre re-renders do painel.
   Valor inicial 400 (= 8h * 50px) abre a Agenda já em 08:00, que é o
   horário de trabalho. Usuário rola pra cima pra ver antes. */
var oneAgScrollY = 400;

function oneAgSyncScrollSetup(kanban) {
  if (!kanban) return;
  var rulerContent = kanban.querySelector('.one-ag-tl-ruler-content');
  var cols = kanban.querySelectorAll('.one-ag-kday-col');
  if (!cols.length) return;
  var sincronizando = false;
  function syncAll(source) {
    if (sincronizando) return;
    sincronizando = true;
    var top = source.scrollTop;
    oneAgScrollY = top; // memoriza pra próximo render
    cols.forEach(function(col) {
      if (col !== source && col.scrollTop !== top) col.scrollTop = top;
    });
    if (rulerContent) rulerContent.style.transform = 'translateY(' + (-top) + 'px)';
    requestAnimationFrame(function(){ sincronizando = false; });
  }
  cols.forEach(function(col) {
    col.addEventListener('scroll', function(){ syncAll(col); }, { passive: true });
  });
  // Aplica scroll inicial (ou o último valor memorizado pelo usuário).
  // requestAnimationFrame garante que o layout já está pronto.
  requestAnimationFrame(function() {
    cols[0].scrollTop = oneAgScrollY;
    // Propaga manualmente — em alguns browsers o setter de scrollTop
    // não dispara o event 'scroll' quando o valor não muda da última vez.
    cols.forEach(function(col) {
      if (col !== cols[0]) col.scrollTop = oneAgScrollY;
    });
    if (rulerContent) rulerContent.style.transform = 'translateY(' + (-oneAgScrollY) + 'px)';
  });
}

/* Linha horizontal de "agora" — atravessa todas as colunas */
function oneAgRenderAgoraLinha(kanban) {
  var antigo = kanban.querySelector('.one-ag-tl-agora');
  if (antigo) antigo.remove();
  var d = new Date();
  var top = d.getHours() * 50 + d.getMinutes() * (50/60);
  var ln = document.createElement('div');
  ln.className = 'one-ag-tl-agora';
  ln.style.top = top + 'px';
  ln.innerHTML = '<span class="one-ag-tl-agora-dot"></span>';
  kanban.querySelector('.one-ag-tl-cols').appendChild(ln);
}

/* ── Visão DIA ─────────────────────────────────────────────────── */
function renderOneAgDia() {
  var el    = document.getElementById('one-ag-dia');
  var label = document.getElementById('one-ag-mes-label');
  if (!el) return;

  var compromissos = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]');
  var hojeStr = new Date().toISOString().slice(0,10);
  var ds = oneAgSelectedDate;
  var d  = new Date(ds + 'T12:00:00');

  var DIAS  = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  var MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  if (label) label.textContent = DIAS[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()];

  var doDia = compromissos
    .filter(function(c){ return c.data === ds; })
    .sort(function(a,b){ return (a.hora||'').localeCompare(b.hora||''); });

  var rulerHtml = '<div class="one-ag-tl-ruler">';
  for (var h = 0; h < 24; h++)
    rulerHtml += '<div class="one-ag-tl-hour" style="top:' + (h*50) + 'px">' + (h<10?'0':'') + h + ':00</div>';
  rulerHtml += '</div>';

  var gridLines = '';
  for (var gh = 0; gh < 24; gh++)
    gridLines += '<div class="one-ag-tl-grid-line" style="top:' + (gh*50) + 'px"></div>';

  var cards = doDia.map(function(c) {
    var realizado = c.status === 'realizado';
    var hora = c.hora || '08:00';
    var nome = (c.nome || c.descricao || 'Compromisso').replace(/</g,'&lt;');
    var tipo = (c.tipo || '').replace(/</g,'&lt;');
    var cat  = oneAgCorCategoria(tipo);
    var top  = oneHoraParaTop(hora);
    var dur  = parseInt(c.duracao) || 50;
    var hPx  = Math.max(56, Math.round(dur * (50/60)));
    var valor = c.valor ? ' · R$' + Number(c.valor).toFixed(0) : '';
    return '<div class="one-ag-kcard one-ag-dia-card' + (realizado?' realizado':'') + '" draggable="true" data-event-id="' + c.id + '" data-cid="' + c.id + '" onclick="oneAgModalEditar(this.dataset.cid)" style="top:' + top + 'px;height:' + hPx + 'px;left:0;right:12px;border-left-color:' + cat.cor + ';background:' + cat.bg + '">' +
      '<div class="one-ag-kcard-body">' +
        '<div class="one-ag-kcard-hora" style="color:' + cat.cor + '">' + hora + (valor?'<span style="margin-left:6px;opacity:.7;font-size:11px">'+valor+'</span>':'') + '</div>' +
        '<div class="one-ag-kcard-nome" style="font-size:14px">' + nome + '</div>' +
        (tipo?'<div class="one-ag-kcard-tipo"><span class="one-ag-kcard-dot" style="background:'+cat.cor+'"></span>'+tipo+'</div>':'') +
      '</div>' +
    '</div>';
  }).join('');

  el.innerHTML = rulerHtml +
    '<div class="one-ag-tl-cols one-ag-dia-cols">' +
      '<div class="one-ag-kday-col' + (ds===hojeStr?' today':'') + '" data-date="' + ds + '" style="flex:1;min-width:0">' +
        '<div class="one-ag-kday-body" data-date="' + ds + '" onclick="oneAgClickSlot(event,this)">' +
          gridLines + cards +
        '</div>' +
      '</div>' +
    '</div>';

  setTimeout(function(){ if (el.scrollTop < 10) el.scrollTop = 8*50-8; }, 50);
  if (ds === hojeStr) oneAgRenderAgoraLinha(el);
  oneInitDragDrop('one-ag-dia');
}

/* ── Visão MÊS: panorâmica de mini-semanas ──────────────────────── */
function renderOneAgMes() {
  var el    = document.getElementById('one-ag-mes');
  // Label do período: prefere o novo ID padrão TaskAreas, com fallback pro antigo
  var label = document.getElementById('one-ag-periodo-label') || document.getElementById('one-ag-mes-label');
  if (!el) return;

  var compromissos = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]');
  var hojeStr = new Date().toISOString().slice(0,10);

  var hoje = new Date(); hoje.setHours(0,0,0,0);
  var ref  = new Date(hoje.getFullYear(), hoje.getMonth() + oneAgMonthOffset, 1);
  var ano  = ref.getFullYear();
  var mes  = ref.getMonth();

  var MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  if (label) label.textContent = MESES[mes].slice(0,3) + '/' + ano;

  // Segunda da semana que contém o primeiro dia do mês
  var primeiroDia = new Date(ano, mes, 1);
  var ultimoDia   = new Date(ano, mes + 1, 0);
  var dow = primeiroDia.getDay();
  var startDate = new Date(primeiroDia);
  startDate.setDate(1 + (dow === 0 ? -6 : 1 - dow));

  // Segunda da semana atual (para calcular weekOffset)
  var dowHoje = hoje.getDay();
  var segHoje = new Date(hoje);
  segHoje.setDate(hoje.getDate() + (dowHoje === 0 ? -6 : 1 - dowHoje));

  var NOMES = ['SEG','TER','QUA','QUI','SEX','SÁB','DOM'];

  // Cabeçalho fixo dos dias
  var headerHtml = '<div class="one-ag-mes-header">' +
    NOMES.map(function(n){ return '<div class="one-ag-mes-colhead">' + n + '</div>'; }).join('') +
  '</div>';

  // Semanas
  var semanasHtml = '';
  var cur = new Date(startDate);
  var semIdx = 0;

  while (cur <= ultimoDia || semIdx === 0) {
    var segDaSemana = new Date(cur); // segunda desta semana
    // Calcula o weekOffset desta semana em relação à semana atual
    var diffMs = segDaSemana.getTime() - segHoje.getTime();
    var weekOffset = Math.round(diffMs / (7 * 24 * 3600 * 1000));

    // Células dos 7 dias
    var celulas = '';
    for (var i = 0; i < 7; i++) {
      var d   = new Date(cur);
      var ds  = d.toISOString().slice(0,10);
      var doMes  = d.getMonth() === mes;
      var isHoje = ds === hojeStr;
      var evs = compromissos.filter(function(c){ return c.data === ds; });

      var numHtml = isHoje
        ? '<div class="one-ag-mes-mini-num hoje">' + d.getDate() + '</div>'
        : '<div class="one-ag-mes-mini-num' + (!doMes ? ' outro-mes' : '') + '">' + d.getDate() + '</div>';

      var evHtml = evs.slice(0,3).map(function(ev){
        var cat = oneAgCorCategoria(ev.tipo || '');
        var nome = (ev.nome || ev.descricao || '').replace(/</g,'&lt;');
        return '<div class="one-ag-mes-mini-ev" style="background:' + cat.bg + ';border-left:2px solid ' + cat.cor + '" title="' + (ev.hora||'') + ' ' + nome + '">' +
          (ev.hora ? '<span style="color:' + cat.cor + ';font-weight:600">' + ev.hora + '</span> ' : '') +
          '<span class="one-ag-mes-mini-ev-nome">' + nome + '</span>' +
        '</div>';
      }).join('');

      if (evs.length > 3) evHtml += '<div class="one-ag-mes-mini-mais">+' + (evs.length-3) + ' mais</div>';

      celulas += '<div class="one-ag-mes-mini-day' + (!doMes ? ' outro-mes' : '') + '">' + numHtml + evHtml + '</div>';
      cur.setDate(cur.getDate() + 1);
    }

    semanasHtml += '<div class="one-ag-mes-semana" onclick="oneAgGoToSemana(' + weekOffset + ')" title="Ver esta semana">' +
      celulas +
    '</div>';

    semIdx++;
    if (semIdx > 5) break; // máximo 6 semanas
    if (cur > ultimoDia) break;
  }

  el.innerHTML = headerHtml + '<div class="one-ag-mes-semanas">' + semanasHtml + '</div>';
}

/* ── Drag & Drop ────────────────────────────────────────────────── */
function oneInitDragDrop(containerId) {
  var wrap = document.getElementById(containerId || 'one-ag-kanban');
  if (!wrap) return;

  var dragId   = null;
  var dragDate = null;

  wrap.querySelectorAll('.one-ag-kcard[draggable]').forEach(function(card) {
    card.addEventListener('dragstart', function(e) {
      dragId   = this.dataset.eventId;
      dragDate = (this.closest('[data-date]') || {}).dataset && this.closest('[data-date]').dataset.date;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragId);
      this.style.opacity = '0.45';
    });
    card.addEventListener('dragend', function() {
      this.style.opacity = '';
      wrap.querySelectorAll('.one-ag-kday-body').forEach(function(b){ b.classList.remove('drag-over'); });
    });
  });

  wrap.querySelectorAll('.one-ag-kday-body').forEach(function(body) {
    body.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      this.classList.add('drag-over');
    });
    body.addEventListener('dragleave', function(e) {
      if (!this.contains(e.relatedTarget)) this.classList.remove('drag-over');
    });
    body.addEventListener('drop', function(e) {
      e.preventDefault();
      this.classList.remove('drag-over');
      var id = e.dataTransfer.getData('text/plain') || dragId;
      if (!id) return;
      var novaData = this.dataset.date;
      var rect = this.getBoundingClientRect();
      var y = e.clientY - rect.top;
      var novaHora = oneAgTopParaHora(y);
      oneAgMoverEvento(id, novaData, novaHora);
    });
  });
}

function oneAgMoverEvento(eventId, novaData, novaHora) {
  var lista = [];
  try { lista = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]'); } catch(e){}
  var idx = -1;
  for (var i = 0; i < lista.length; i++) { if (lista[i].id === eventId) { idx = i; break; } }
  if (idx < 0) return;
  lista[idx].data = novaData;
  lista[idx].hora = novaHora;
  localStorage.setItem(oneU('compromissos'), JSON.stringify(lista));
  renderOneAgendaPainel();
  if (window._pinahRerender) window._pinahRerender.agenda();
}

/* Click num slot vazio do dia abre o modal com data+hora pré-preenchidas */
function oneAgClickSlot(ev, bodyEl) {
  if (ev.target !== bodyEl && !ev.target.classList.contains('one-ag-tl-grid-line')) return;
  var rect = bodyEl.getBoundingClientRect();
  var y = ev.clientY - rect.top;
  var totalMin = Math.max(0, Math.round(y / 50 * 60));
  // Snap a 15min
  totalMin = Math.round(totalMin / 15) * 15;
  if (totalMin > 23*60+45) totalMin = 23*60+45;
  var hh = Math.floor(totalMin / 60);
  var mm = totalMin % 60;
  var horaStr = (hh<10?'0':'')+hh+':'+(mm<10?'0':'')+mm;
  var ds = bodyEl.getAttribute('data-date');
  oneAgModalAbrir(ds);
  setTimeout(function(){
    var hi = document.getElementById('one-ag-modal-hora');
    if (hi) hi.value = horaStr;
  }, 50);
}

/* Click em slot vazio na view semanal — calcula hora com offset de H_START e snap parametrizável (default 15min) */
function oneAgClickSlotWeek(ev, bodyEl) {
  if (ev.target !== bodyEl && !ev.target.classList.contains('one-ag-tl-grid-line')) return;
  var snapMin = parseInt(bodyEl.getAttribute('data-snap-min')) || 15;
  var rect = bodyEl.getBoundingClientRect();
  var y = ev.clientY - rect.top;
  var hourOffset = parseInt(bodyEl.getAttribute('data-hour-offset') || '0');
  var totalMin = hourOffset * 60 + Math.max(0, Math.round(y / 50 * 60));
  totalMin = Math.round(totalMin / snapMin) * snapMin;
  var maxMin = 23*60 + (60 - snapMin);
  if (totalMin > maxMin) totalMin = maxMin;
  var hh = Math.floor(totalMin / 60);
  var mm = totalMin % 60;
  var horaStr = (hh<10?'0':'')+hh+':'+(mm<10?'0':'')+mm;
  var ds = bodyEl.getAttribute('data-date');
  oneAgModalAbrir(ds);
  setTimeout(function(){
    var hi = document.getElementById('one-ag-modal-hora');
    if (hi) hi.value = horaStr;
  }, 50);
}

function oneHoraParaTop(hora) {
  if (!hora) return 0;
  var parts = String(hora).split(':');
  var h = parseInt(parts[0]) || 0;
  var m = parseInt(parts[1]) || 0;
  var px = h * 50 + m * (50 / 60);
  if (px < 0) px = 0;
  if (px > 1200 - 28) px = 1200 - 28;
  return Math.round(px); // 50px/h, range 00h-23h, altura total 1200px
}

/* Converte posição Y (em px dentro do body da coluna) em string "HH:MM" com snap parametrizável (default 15min) */
function oneAgTopParaHora(yPx, snapMin) {
  snapMin = snapMin || 15;
  if (yPx < 0) yPx = 0;
  if (yPx > 1200) yPx = 1200;
  var totalMin = Math.round(yPx / 50 * 60);
  totalMin = Math.round(totalMin / snapMin) * snapMin;
  var maxMin = 23*60 + (60 - snapMin);
  if (totalMin > maxMin) totalMin = maxMin;
  var hh = Math.floor(totalMin / 60);
  var mm = totalMin % 60;
  return (hh<10?'0':'')+hh+':'+(mm<10?'0':'')+mm;
}

/* ── Timeline drag-and-drop nativo (livre por posição Y, muda dia E hora) ── */
function oneInitAgendaSortable() {
  // Anexa listeners de drop nas colunas do dia (cards já têm draggable=true via render)
  var cols = document.querySelectorAll('#one-ag-kanban .one-ag-kday-body');
  cols.forEach(function(col){
    if (col._dndReady) return;
    col._dndReady = true;
    col.addEventListener('dragover', function(ev){
      ev.preventDefault();
      ev.dataTransfer.dropEffect = 'move';
      col.classList.add('one-ag-drop-target');
    });
    col.addEventListener('dragleave', function(){ col.classList.remove('one-ag-drop-target'); });
    col.addEventListener('drop', function(ev){
      ev.preventDefault();
      col.classList.remove('one-ag-drop-target');
      var id = ev.dataTransfer.getData('text/plain');
      if (!id) return;
      var rect = col.getBoundingClientRect();
      var yOffset = parseFloat(ev.dataTransfer.getData('text/offset-y')) || 0;
      var y = ev.clientY - rect.top - yOffset;
      var hourOffset = parseInt(col.getAttribute('data-hour-offset') || '0');
      var novaHora = oneAgTopParaHora(y + hourOffset * 50);
      var novaData = col.getAttribute('data-date');
      var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]'); } catch(e){}
      var idx = lista.findIndex(function(x){ return x.id === id; });
      if (idx === -1) return;
      lista[idx].data = novaData;
      lista[idx].hora = novaHora;
      localStorage.setItem(oneU('compromissos'), JSON.stringify(lista));
      // Atualiza receita vinculada se existir
      var rec = []; try { rec = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]'); } catch(e){}
      var rIdx = rec.findIndex(function(r){ return r.compromissoId === id; });
      if (rIdx !== -1) { rec[rIdx].data = novaData; localStorage.setItem(oneU('receitas'), JSON.stringify(rec)); }
      if (typeof oneToast === 'function') oneToast('✓ ' + novaData.split('-').reverse().join('/') + ' às ' + novaHora);
      renderOneAgendaPainel();
      if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
    });
  });

  // Anexa dragstart nos cards
  var cards = document.querySelectorAll('#one-ag-kanban .one-ag-kcard');
  cards.forEach(function(card){
    card.setAttribute('draggable', 'true');
    if (card._dndReady) return;
    card._dndReady = true;
    card.addEventListener('dragstart', function(ev){
      var id = card.getAttribute('data-event-id') || card.getAttribute('data-cid');
      if (!id) return;
      var rect = card.getBoundingClientRect();
      var offsetY = ev.clientY - rect.top;
      ev.dataTransfer.effectAllowed = 'move';
      ev.dataTransfer.setData('text/plain', id);
      ev.dataTransfer.setData('text/offset-y', String(offsetY));
      card.classList.add('one-ag-event-dragging');
    });
    card.addEventListener('dragend', function(){ card.classList.remove('one-ag-event-dragging'); });
  });
}

/* ── Agenda (screen-one mobile) ──────────────────────────────────
   Mantida por compatibilidade — agora delega pro render mobile v4
   (Fase 2: porta da estrutura desktop TaskAreas + timeline 00–24h).
   Markup antigo #one-ag-week foi substituído por #one-ag-kanban-mob
   no index.html. As ~8 chamadas existentes desta função continuam
   válidas, agora apontando pra função nova. */
function renderOneAgenda() {
  if (typeof renderOneAgendaPainelMob === 'function') {
    renderOneAgendaPainelMob();
  }
  if (typeof oneAgRenderTopCardsMob === 'function') {
    oneAgRenderTopCardsMob();
  }
}

/* ── Financeiro (screen-one) ─────────────────────────────── */
/* ── Financeiro mobile — Fase 3: 3 cards + 2 abas ─────────────── */
/* Estado da tela mobile (independente do desktop) */
var oneFinMobVista       = 'lancamentos';   // 'lancamentos' | 'categorias'
var oneFinMobPeriodo     = 'mes';            // 'mes' | '30' | '15' | '7'
var oneFinMobCatTipo     = 'despesas';       // 'despesas' | 'receitas'
var oneFinMobFiltroAtivo = null;             // null | 'pendentes' | 'vencendo'
var oneFinMobDonutChart  = null;

function _oneFinFmt(v) {
  return 'R$ ' + Math.abs(v||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
}

/* Financeiro mobile — D063: feed vertical da pill Início.
   Usa o MÊS ATIVO do app (oneFinMesAtivo/AnoAtivo), igual ao desktop, pra que
   as setas do header naveguem os dois lados juntos. Reaproveita os cálculos
   de saldo/obrigações/investimentos do desktop e a render de contas. */
function renderOneFinanceiro() {
  var hoje = new Date();
  if (typeof window.oneFinMesAtivo !== 'number') window.oneFinMesAtivo = hoje.getMonth();
  if (typeof window.oneFinAnoAtivo !== 'number') window.oneFinAnoAtivo = hoje.getFullYear();
  var mes = window.oneFinMesAtivo, ano = window.oneFinAnoAtivo;
  var mesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var prefix = ano + '-' + String(mes+1).padStart(2,'0');

  var receitas = [];
  try { receitas = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]'); } catch(e){}

  /* Receitas recebidas do mês (status diferente de pendente) + instâncias de fixas. */
  var recMes = receitas.filter(function(r){ return r.data && r.data.startsWith(prefix); });
  var totalRec = recMes.filter(function(r){ return r.status !== 'pendente'; }).reduce(function(s,r){ return s+(Number(r.valor)||0); },0);

  /* Despesas = a pagar do mês (fixas + faturas), mesmo cálculo do desktop. */
  var totalDesp = 0;
  if (typeof _oneFinResumoColetarObrigacoes === 'function') {
    var obrig = _oneFinResumoColetarObrigacoes(mes, ano);
    totalDesp = obrig.despesas.reduce(function(s,i){ return s + (i.aPagar||0); }, 0) +
                obrig.faturas.reduce(function(s,i){ return s + (i.aPagar||0); }, 0);
  }

  var saldoContas = (typeof _oneFinResumoSaldoEmContas === 'function') ? _oneFinResumoSaldoEmContas() : 0;
  var totalInvest = (typeof _oneFinResumoTotalInvestimentos === 'function') ? _oneFinResumoTotalInvestimentos() : 0;

  oneFinMobAtualizaMesLabel();

  function _set(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
  _set('one-fin-mob-hero-saldo', (saldoContas < 0 ? '−' : '') + _oneFinFmt(saldoContas));
  _set('one-fin-mob-hero-rec',   _oneFinFmt(totalRec));
  _set('one-fin-mob-hero-desp',  _oneFinFmt(totalDesp));
  _set('one-fin-mob-hero-inv',   _oneFinFmt(totalInvest));

  /* Card-resumo de contas no Início (a lista mora na aba Contas). */
  _set('one-fin-mob-contas-resumo-val', (saldoContas < 0 ? '−' : '') + _oneFinFmt(saldoContas));
  var _nContas = (typeof oneFinGetContas === 'function') ? oneFinGetContas().length : 0;
  _set('one-fin-mob-contas-resumo-sub', _nContas === 1 ? '1 conta · ver todas' : _nContas + ' contas · ver todas');

  /* Contas + Cartões + Investimentos (a função já popula o container mobile). */
  if (typeof oneFinRenderContas === 'function') oneFinRenderContas();
  /* Pizza por categoria + balanço de 6 meses. */
  if (typeof oneFinMobRenderCategorias === 'function') oneFinMobRenderCategorias();
  if (typeof oneFinMobRenderBalanco === 'function') oneFinMobRenderBalanco();
}

/* Atualiza só o rótulo de mês do header mobile — independe da pill ativa,
   por isso roda em toda navegação de mês (antes só atualizava na Início). */
function oneFinMobAtualizaMesLabel() {
  var hoje = new Date();
  var mes = (typeof window.oneFinMesAtivo === 'number') ? window.oneFinMesAtivo : hoje.getMonth();
  var ano = (typeof window.oneFinAnoAtivo === 'number') ? window.oneFinAnoAtivo : hoje.getFullYear();
  var mesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var el = document.getElementById('one-fin-mob-mes');
  if (el) el.textContent = mesNomes[mes].slice(0,3).toUpperCase() + ' / ' + ano;
}
window.oneFinMobAtualizaMesLabel = oneFinMobAtualizaMesLabel;

/* Pill ativa no Financeiro mobile. */
function oneFinMobPillAtiva() {
  var a = document.querySelector('#one-fin-mob-pills .one-fin-mob-pill.active');
  return a ? a.getAttribute('data-pill') : 'inicio';
}

/* Renderiza o conteúdo de uma pill. Reaproveita os renders do desktop:
   Início e Resumo chamam funções com alvo próprio; Extrato, Fixas e Visão
   geral usam os renders do desktop, que espelham o resultado pros containers
   mobile (ver final de renderOneFinanceiroPainel / oneFinRenderFixas /
   oneFinRenderGeral). */
function oneFinMobRenderPane(pill) {
  if (pill === 'resumo') {
    if (typeof oneFinRenderResumo === 'function') {
      oneFinRenderResumo({ caixaId: 'one-fin-mob-resumo-caixa', obrigId: 'one-fin-mob-resumo-obrig', investId: 'one-fin-mob-resumo-invest' });
    }
  } else if (pill === 'extrato') {
    if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
  } else if (pill === 'geral') {
    if (typeof oneFinRenderGeral === 'function') oneFinRenderGeral();
  } else if (pill === 'fixas') {
    if (typeof oneFinRenderFixas === 'function') oneFinRenderFixas();
  } else if (pill === 'contas') {
    /* Ao entrar na aba Contas, sempre começa no modo lista (não fica preso
       num detalhe aberto antes). Toca só os containers mobile. */
    var _ml = document.getElementById('one-fin-mob-contas-modo-lista');
    var _md = document.getElementById('one-fin-mob-contas-modo-detalhe');
    if (_ml) _ml.hidden = false;
    if (_md) _md.hidden = true;
    window.oneFinContaAberta = null;
    if (typeof oneFinRenderContas === 'function') oneFinRenderContas();
  } else {
    if (typeof renderOneFinanceiro === 'function') renderOneFinanceiro();
  }
}

/* Re-renderiza a pill ativa — usado pela navegação de mês. Atualiza o rótulo
   do mês sempre, mesmo quando a pill ativa não é a Início. */
function oneFinMobRefresh() {
  oneFinMobAtualizaMesLabel();
  oneFinMobRenderPane(oneFinMobPillAtiva());
}
window.oneFinMobRefresh = oneFinMobRefresh;

/* Troca de pill no Financeiro mobile. */
function oneFinMobSetPill(pill) {
  document.querySelectorAll('#one-fin-mob-pills .one-fin-mob-pill').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-pill') === pill);
  });
  document.querySelectorAll('#one-fin-mob-feed .one-fin-mob-pane').forEach(function(p){
    p.hidden = p.getAttribute('data-pane') !== pill;
  });
  /* Rola o feed pro topo ao trocar de pill. */
  var feed = document.getElementById('one-fin-mob-feed');
  if (feed) feed.scrollTop = 0;
  oneFinMobAtualizaMesLabel();
  oneFinMobRenderPane(pill);
}
window.oneFinMobSetPill = oneFinMobSetPill;

/* Aba Categorias: toggle + donut + lista */
function oneFinMobSetCatTipo(tipo) {
  oneFinMobCatTipo = tipo;
  document.querySelectorAll('.one-fin-mob-cat-btn').forEach(function(b){
    b.classList.toggle('active', b.dataset.tipo === tipo);
  });
  oneFinMobRenderCategorias();
}

function oneFinMobRenderCategorias() {
  var dados;
  try {
    dados = (oneFinMobCatTipo === 'receitas')
      ? JSON.parse(localStorage.getItem(oneU('receitas')) || '[]')
      : JSON.parse(localStorage.getItem(oneU('despesas')) || '[]');
  } catch(e) { dados = []; }

  /* Mês ativo do app (mesma fonte do desktop), não o de hoje. */
  var mes = (typeof window.oneFinMesAtivo === 'number') ? window.oneFinMesAtivo : new Date().getMonth();
  var ano = (typeof window.oneFinAnoAtivo === 'number') ? window.oneFinAnoAtivo : new Date().getFullYear();
  var doMes = dados.filter(function(it){
    if (!it.data) return false;
    var d = new Date(it.data + 'T00:00:00');
    return d.getMonth() === mes && d.getFullYear() === ano;
  });

  /* Inclui instâncias virtuais de fixas no mês ativo, igual ao desktop. */
  if (typeof oneFinInstanciasDoMes === 'function') {
    var inst = oneFinInstanciasDoMes(mes, ano);
    var fixasDoMes = (oneFinMobCatTipo === 'receitas') ? (inst.receitas || []) : (inst.despesas || []);
    fixasDoMes.forEach(function(f){
      doMes.push({ valor: Number(f.valor) || 0, categoria: f.categoria || '', tipo: f.tipo || oneFinMobCatTipo });
    });
  }

  var grupos = {};
  doMes.forEach(function(it){
    var cat = it.categoria || it.tipo || 'Outros';
    grupos[cat] = (grupos[cat] || 0) + (Number(it.valor) || 0);
  });
  var entries = Object.entries(grupos)
    .map(function(e){ return { categoria: e[0], total: e[1] }; })
    .sort(function(a,b){ return b.total - a.total; });
  var totalGeral = entries.reduce(function(s,e){ return s + e.total; }, 0);

  var totalEl = document.getElementById('one-fin-mob-donut-total');
  if (totalEl) totalEl.textContent = _oneFinFmt(totalGeral);

  var palette = ['#7FA88E','#D4A655','#9B72B0','#5B7CFA','#FF8B5A','#27856A','#E67BB0','#7B5CF0','#C0392B','#B8860B'];

  var listEl = document.getElementById('one-fin-mob-cat-list');
  if (listEl) {
    if (!entries.length) {
      listEl.innerHTML = '<div class="one-fin-mob-empty">Sem ' + oneFinMobCatTipo + ' neste mês</div>';
    } else {
      listEl.innerHTML = entries.map(function(e, i){
        var cat = (typeof oneFinCatIcon === 'function')
          ? oneFinCatIcon(e.categoria)
          : { emoji:(oneFinMobCatTipo==='receitas'?'💚':'🔴'), cor:'#6B7F6F', bg:'#F2F6F1' };
        var pct = totalGeral > 0 ? Math.round((e.total / totalGeral) * 100) : 0;
        return '<div class="one-fin-mob-cat-row">' +
                 '<div class="one-fin-mob-cat-dot" style="background:' + cat.bg + ';color:' + cat.cor + '">' + cat.emoji + '</div>' +
                 '<div class="one-fin-mob-cat-nome">' + e.categoria.replace(/</g,'&lt;') + '</div>' +
                 '<div class="one-fin-mob-cat-val">' + _oneFinFmt(e.total) + '</div>' +
                 '<div class="one-fin-mob-cat-pct" style="background:' + palette[i % palette.length] + '">' + pct + '%</div>' +
               '</div>';
      }).join('');
    }
  }

  /* Donut */
  var canvas = document.getElementById('one-fin-mob-donut');
  if (!canvas || typeof Chart === 'undefined') return;
  if (oneFinMobDonutChart) { try { oneFinMobDonutChart.destroy(); } catch(e){} }
  if (!entries.length) { oneFinMobDonutChart = null; return; }
  oneFinMobDonutChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: entries.map(function(e){ return e.categoria; }),
      datasets: [{
        data: entries.map(function(e){ return e.total; }),
        backgroundColor: entries.map(function(_, i){ return palette[i % palette.length]; }),
        borderColor: '#fff', borderWidth: 3, hoverOffset: 5
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: function(ctx){ return ctx.label + ': ' + _oneFinFmt(ctx.parsed); } } }
      },
      animation: { duration: 350 }
    }
  });
}
window.oneFinMobRenderCategorias = oneFinMobRenderCategorias;

/* Balanço mobile — barras de receitas x despesas dos últimos 6 meses
   (mesmo desenho do desktop, canvas próprio pra não brigar com IDs). */
window.oneFinMobBarsChart = window.oneFinMobBarsChart || null;
function oneFinMobRenderBalanco() {
  var canvas = document.getElementById('one-fin-mob-bars');
  if (!canvas || typeof Chart === 'undefined') return;

  var receitas = [], despesas = [];
  try { receitas = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]'); } catch(e){}
  try { despesas = JSON.parse(localStorage.getItem(oneU('despesas')) || '[]'); } catch(e){}

  /* Ancorado no mês ativo do app: 6 meses terminando nele. */
  var mesBase = (typeof window.oneFinMesAtivo === 'number') ? window.oneFinMesAtivo : new Date().getMonth();
  var anoBase = (typeof window.oneFinAnoAtivo === 'number') ? window.oneFinAnoAtivo : new Date().getFullYear();
  var meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  var labels = [], rData = [], dData = [];
  for (var i = 5; i >= 0; i--) {
    var m = mesBase - i, a = anoBase;
    while (m < 0) { m += 12; a--; }
    labels.push(meses[m] + '/' + String(a).slice(2));
    var rTot = receitas
      .filter(function(r){ if (!r.data) return false; var d = new Date(r.data+'T00:00:00'); return d.getMonth()===m && d.getFullYear()===a && r.status !== 'pendente'; })
      .reduce(function(s,r){ return s + (Number(r.valor)||0); }, 0);
    var dTot = despesas
      .filter(function(d){ if (!d.data) return false; var dt = new Date(d.data+'T00:00:00'); return dt.getMonth()===m && dt.getFullYear()===a; })
      .reduce(function(s,d){ return s + (Number(d.valor)||0); }, 0);
    rData.push(rTot);
    dData.push(dTot);
  }

  if (window.oneFinMobBarsChart) { try { window.oneFinMobBarsChart.destroy(); } catch(e){} }
  window.oneFinMobBarsChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Receitas', data: rData, backgroundColor: '#7FA88E', borderRadius: 6 },
        { label: 'Despesas', data: dData, backgroundColor: '#E07A6B', borderRadius: 6 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, color: '#6B7F6F', usePointStyle: true } },
        tooltip: { callbacks: { label: function(ctx){ return ctx.dataset.label + ': R$ ' + ctx.parsed.y.toLocaleString('pt-BR', {minimumFractionDigits:2}); } } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { font: { size: 10 }, color: '#6B7F6F', callback: function(v){ return 'R$ ' + (v/1000).toFixed(0) + 'k'; } }, grid: { color: 'rgba(127,168,142,0.10)' } },
        x: { ticks: { font: { size: 11 }, color: '#6B7F6F' }, grid: { display: false } }
      },
      animation: { duration: 500 }
    }
  });
}
window.oneFinMobRenderBalanco = oneFinMobRenderBalanco;

/* ── Tarefas mobile — Fase 4: kanban portado ─────────────────── */
/* Filtros mobile (independentes do desktop pra não brigar com a sidebar) */
var oneTarMobFilterStatus = 'todos';
var oneTarMobFilterPrio   = 'qualquer';

function renderOneTarefasMobile() {
  var el = document.getElementById('one-tar-kanban-mob');
  if (!el) return;
  var todasTarefas = [];
  try { todasTarefas = JSON.parse(localStorage.getItem(oneU('tarefas')) || '[]'); } catch(e) {}

  /* Contadores do header */
  var elTotal = document.getElementById('one-tar-mob-total');
  var elEm    = document.getElementById('one-tar-mob-em-and');
  var totalQ  = todasTarefas.length;
  var emAndQ  = todasTarefas.filter(function(t){ return t.status === 'em-andamento' && !t.concluida; }).length;
  if (elTotal) elTotal.textContent = totalQ + ' tarefa' + (totalQ === 1 ? '' : 's');
  if (elEm)    elEm.textContent    = emAndQ + ' em and.';

  function emojiArea(a) {
    var s = (a||'').toLowerCase();
    if (/pinah|app|produto|one|tech/.test(s)) return '🐾';
    if (/enrosco|problema|pendência|pendencia/.test(s)) return '🍅';
    if (/ideia|ideias\s*pa|projeto|criativ/.test(s)) return '💡';
    if (/casa|famil|lar/.test(s)) return '🏠';
    if (/baú|bau|milhão|milhao|dinheiro|financ|conta/.test(s)) return '💰';
    if (/clin|saúde|saude|médic|medic|fonoaud|terapeut/.test(s)) return '🩺';
    if (/trabalho|cap|escrit|negócio|negocio/.test(s)) return '💼';
    if (/estudo|curso|aprend|escola/.test(s)) return '📚';
    if (/compra|mercado/.test(s)) return '🛒';
    return '📋';
  }
  function corArea(a) {
    var paleta = ['#5C8870','#E87A7A','#5EB585','#F0A830','#5BA8D8','#C97DD4','#7EC8B8','#E0835C'];
    var h = 0;
    for (var i = 0; i < a.length; i++) h = a.charCodeAt(i) + ((h << 5) - h);
    return paleta[Math.abs(h) % paleta.length];
  }
  var prioBadge = { 'Alta':'alta', 'Normal':'normal', 'Baixa':'baixa' };

  /* Áreas persistidas (mesma fonte do desktop). Reconcilia com áreas
     presentes nas tarefas, ignorando "Geral". */
  var areaNames = oneTarGetAreas();
  var areasDirtyMob = false;
  todasTarefas.forEach(function(t){
    var a = t.area;
    if (!a || a === 'Geral') return;
    if (areaNames.indexOf(a) === -1) { areaNames.push(a); areasDirtyMob = true; }
  });
  if (areasDirtyMob) oneTarSaveAreas(areaNames);

  /* Aplicar filtros mobile */
  var tarefasFiltradas = todasTarefas.filter(function(t){
    if (oneTarMobFilterStatus === 'pendente'  && !!t.concluida) return false;
    if (oneTarMobFilterStatus === 'concluida' && !t.concluida)  return false;
    if (oneTarMobFilterPrio !== 'qualquer' && (t.prioridade||'Normal') !== oneTarMobFilterPrio) return false;
    return true;
  });

  /* Render colunas */
  var html = '';
  areaNames.forEach(function(area) {
    var tasks = tarefasFiltradas.filter(function(t){ return t.area === area; });
    var total = todasTarefas.filter(function(t){ return t.area === area; });
    var conclN = total.filter(function(t){ return !!t.concluida; }).length;
    var cor   = corArea(area);
    var emoji = emojiArea(area);
    var areaEnc = area.replace(/'/g,"\\'").replace(/"/g,'&quot;');

    var cards = tasks.map(function(t) {
      var conc = !!t.concluida;
      var cls  = prioBadge[t.prioridade || 'Normal'] || 'normal';
      return '<div class="one-tar-card-mob' + (conc ? ' concluida' : '') + '"' +
              ' data-tid="' + t.id + '"' +
              ' style="border-left-color:' + (conc ? '#4CAF50' : cor) + '">' +
        '<div class="one-tar-card-mob-check' + (conc?' done':'') + '" data-tid="' + t.id + '">' +
          (conc ? '✓' : '') +
        '</div>' +
        '<div class="one-tar-card-mob-info">' +
          '<div class="one-tar-card-mob-nome' + (conc?' done':'') + '">' + ((t.nome||t.titulo||'Sem nome')+'').replace(/</g,'&lt;') + '</div>' +
        '</div>' +
        '<span class="one-tar-card-mob-prio ' + cls + '">' + (t.prioridade||'Normal') + '</span>' +
      '</div>';
    }).join('');
    var emptyMsg = tasks.length === 0 ? '<div class="one-tar-col-mob-empty">Nenhuma tarefa</div>' : '';

    html += '<div class="one-tar-col-mob" data-area="' + area.replace(/"/g,'&quot;') + '">' +
      '<div class="one-tar-col-mob-header" style="border-top:3px solid ' + cor + '">' +
        '<div class="one-tar-col-mob-drag">' +
          '<span class="one-tar-col-mob-emoji">' + emoji + '</span>' +
          '<span class="one-tar-col-mob-nome">' + area.replace(/</g,'&lt;') + '</span>' +
          '<span class="one-tar-col-mob-count">' + conclN + '/' + total.length + '</span>' +
        '</div>' +
        '<span class="one-tar-col-mob-handle" aria-hidden="true">⋮⋮</span>' +
      '</div>' +
      '<div class="one-tar-col-mob-body">' + emptyMsg + cards + '</div>' +
      '<button class="one-tar-col-mob-add" onclick="oneTarModalAbrir(\'' + areaEnc + '\')">+ Nova tarefa</button>' +
    '</div>';
  });
  el.innerHTML = html;

  /* Bind interações: check, long-press, sortable */
  oneTarMobBindCards(el);
  oneInitTarefasSortableMob(el);
}

/* Liga eventos nos cards mobile: tocar no card abre a edição (igual à agenda);
   tocar no círculo marca/desmarca como concluída. */
function oneTarMobBindCards(root) {
  var checks = root.querySelectorAll('.one-tar-card-mob-check');
  checks.forEach(function(ck) {
    ck.addEventListener('click', function(ev) {
      ev.stopPropagation();
      var tid = ck.dataset.tid;
      if (typeof oneTarToggle === 'function') oneTarToggle(tid);
    });
  });
  var cards = root.querySelectorAll('.one-tar-card-mob');
  cards.forEach(function(card) {
    card.addEventListener('click', function(ev) {
      if (ev.target.closest('.one-tar-card-mob-check')) return; // o check tem ação própria
      var tid = card.dataset.tid;
      if (typeof oneTarModalEditar === 'function') oneTarModalEditar(tid);
    });
  });
}

/* Long-press num card → menu rápido de ações (edit / del) */
function oneTarMobAcoesCard(tid) {
  /* Versão V1: confirm nativo. Pode virar sheet visual numa fase 4.1. */
  var acao = window.prompt('Tarefa — digite "e" pra editar ou "x" pra excluir:', 'e');
  if (!acao) return;
  acao = acao.trim().toLowerCase();
  if (acao === 'e' && typeof oneTarModalEditar === 'function') {
    oneTarModalEditar(tid);
  } else if (acao === 'x' && typeof oneTarExcluir === 'function') {
    if (confirm('Excluir esta tarefa?')) oneTarExcluir(tid);
  }
}

/* P023 portado — SortableJS com forceFallback pra touch no mobile */
function oneInitTarefasSortableMob(el) {
  if (typeof Sortable === 'undefined') return;
  if (window._oneTarSortableMob) { try { window._oneTarSortableMob.destroy(); } catch(e){} }
  window._oneTarSortableMob = Sortable.create(el, {
    handle: '.one-tar-col-mob-drag',
    direction: 'horizontal',
    animation: 160,
    forceFallback: true,
    fallbackTolerance: 5,
    delay: 250,
    delayOnTouchOnly: true,
    touchStartThreshold: 4,
    ghostClass: 'one-tar-col-ghost',
    onEnd: function() {
      var novaOrdem = Array.prototype.map.call(
        el.querySelectorAll('.one-tar-col-mob'),
        function(col) { return col.dataset.area; }
      );
      oneTarSaveAreas(novaOrdem);
      if (typeof oneToast === 'function') oneToast('✓ Ordem das áreas atualizada');
      /* Mantém desktop sincronizado se estiver aberto */
      if (typeof renderOneTarefasPainel === 'function') renderOneTarefasPainel();
    }
  });
}

/* Sheet de filtros mobile (abre/fecha) */
function oneTarMobAbrirFiltros() {
  var sheet = document.getElementById('one-tar-mob-sheet');
  if (!sheet) return;
  /* Sincroniza o estado dos chips com as vars atuais */
  document.querySelectorAll('#one-tar-mob-status .one-tar-mob-chip').forEach(function(b){
    b.classList.toggle('active', b.dataset.f === oneTarMobFilterStatus);
  });
  document.querySelectorAll('#one-tar-mob-prio .one-tar-mob-chip').forEach(function(b){
    b.classList.toggle('active', b.dataset.p === oneTarMobFilterPrio);
  });
  sheet.hidden = false;
}
function oneTarMobFecharFiltros() {
  var sheet = document.getElementById('one-tar-mob-sheet');
  if (sheet) sheet.hidden = true;
}
function oneTarMobSetFilter(btn) {
  oneTarMobFilterStatus = btn.dataset.f;
  document.querySelectorAll('#one-tar-mob-status .one-tar-mob-chip').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  renderOneTarefasMobile();
}
function oneTarMobSetPrio(btn) {
  oneTarMobFilterPrio = btn.dataset.p;
  document.querySelectorAll('#one-tar-mob-prio .one-tar-mob-chip').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  renderOneTarefasMobile();
}

/* Nova área no mobile — campo inline (sem prompt()) */
function oneTarMobNovaArea() {
  var wrap  = document.getElementById('one-tar-mob-area-wrap');
  var input = document.getElementById('one-tar-mob-area-input');
  if (!wrap) return;
  wrap.style.display = 'flex';
  if (input) { input.value = ''; input.focus(); }
}

function oneTarMobAreaSalvar() {
  var wrap  = document.getElementById('one-tar-mob-area-wrap');
  var input = document.getElementById('one-tar-mob-area-input');
  var nome  = input ? input.value.trim() : '';
  if (nome) {
    var areas = oneTarGetAreas();
    if (areas.indexOf(nome) === -1) { areas.push(nome); oneTarSaveAreas(areas); }
    renderOneTarefasMobile();
    if (typeof renderOneTarefasPainel === 'function') renderOneTarefasPainel();
  }
  if (wrap) wrap.style.display = 'none';
}

/* Mantida por compat — agora rerenderiza o kanban */
function oneTarMobToggle(id, btn) {
  var tarefas = [];
  try { tarefas = JSON.parse(localStorage.getItem(oneU('tarefas')) || '[]'); } catch(e) {}
  var idx = tarefas.findIndex(function(t){ return t.id === id; });
  if (idx === -1) return;
  tarefas[idx].concluida = !tarefas[idx].concluida;
  tarefas[idx].status = tarefas[idx].concluida ? 'concluida' : 'pendente';
  localStorage.setItem(oneU('tarefas'), JSON.stringify(tarefas));
  if (typeof supaUpsert === 'function') supaUpsert('tarefas', tarefas[idx]);
  if (btn && btn.classList) btn.classList.toggle('done', tarefas[idx].concluida);
  setTimeout(function() { renderOneTarefasMobile(); }, 250);
}

/* Dots — atualiza ao rolar entre telas e dispara render do slide ativo */
(function() {
  function setup() {
    var wrap = document.getElementById('one-screens-wrap');
    var dots = document.querySelectorAll('#one-dots .one-dot');
    if (!wrap || !dots.length) { setTimeout(setup, 200); return; }
    wrap.addEventListener('scroll', function() {
      var idx = Math.round(wrap.scrollLeft / wrap.offsetWidth);
      dots.forEach(function(d, i) { d.classList.toggle('active', i === idx); });
      /* Render lazy + sync por painel */
      if (idx === 2) {
        /* Financeiro mobile: sync + render */
        renderOneFinanceiro();
        if (typeof supaSync === 'function' && window.supa && window.authUser) {
          supaSync().then(function() { renderOneFinanceiro(); }).catch(function(){});
        }
      }
      if (idx === 3) renderOneTarefasMobile();
      if (idx === 4) { if (typeof renderCerebro === 'function') renderCerebro(); }
    }, { passive: true });
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', setup) : setup();
})();

/* Auto-resize textarea */
(function() {
  function setup() {
    var ta = document.getElementById('one-input');
    if (!ta) { setTimeout(setup, 300); return; }
    ta.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 96) + 'px';
    });
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', setup) : setup();
})();

/* ── Renderizações do Desktop ─────────────────────────────────── */
function renderOneDeskGreeting() {
  var el = document.getElementById('one-desk-greeting');
  if (!el) return;
  var now = new Date();
  var h = now.getHours();
  var saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  var nome = (window.authProfile && window.authProfile.nome) ? ', ' + window.authProfile.nome.split(' ')[0] : '';
  var dias = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  var meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  el.textContent = saud + nome + ' · ' + dias[now.getDay()] + ', ' + now.getDate() + ' de ' + meses[now.getMonth()];
}

function renderOneDeskAgenda() {
  var wrap = document.getElementById('one-desk-ag-week');
  if (!wrap) return;
  var lista = [];
  try { lista = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]'); } catch(e){}

  var today = new Date(); today.setHours(0,0,0,0);
  var todayYMD = today.toISOString().slice(0,10);

  // Encontra a segunda-feira da semana corrente
  var dow = today.getDay();
  var diffSeg = (dow === 0 ? -6 : 1 - dow);
  var seg = new Date(today); seg.setDate(today.getDate() + diffSeg);
  var sex = new Date(seg); sex.setDate(seg.getDate() + 4);
  var segYMD = seg.toISOString().slice(0,10);
  var sexYMD = sex.toISOString().slice(0,10);

  // Filtra compromissos da semana (Seg-Sex) e pega os 4 próximos a partir de hoje
  var daSemana = lista.filter(function(c){
    return c.data && c.data >= segYMD && c.data <= sexYMD;
  });
  var proximos4 = lista
    .filter(function(c){ return c.data && c.data >= todayYMD && c.data <= sexYMD; })
    .sort(function(a,b){
      var d = (a.data||'').localeCompare(b.data||'');
      if (d !== 0) return d;
      return (a.hora||'').localeCompare(b.hora||'');
    })
    .slice(0, 4);
  var idsProximos = new Set(proximos4.map(function(c){ return c.id; }));

  var nomesDias = ['SEG','TER','QUA','QUI','SEX'];
  var colsHtml = '';
  for (var i = 0; i < 5; i++) {
    var d = new Date(seg); d.setDate(seg.getDate() + i);
    var ymd = d.toISOString().slice(0,10);
    var isHoje = ymd === todayYMD;
    // Mostra só os compromissos do dia que ESTÃO entre os 4 próximos visíveis
    var doDia = proximos4.filter(function(c){ return c.data === ymd; });
    var cardsHtml = doDia.map(function(c){
      var cls = c.realizado ? 'realizado' : ((c.status||'').toLowerCase() === 'confirmado' ? 'confirmado' : 'pendente');
      var nome = (c.nome || c.descricao || '—').replace(/</g,'&lt;');
      // Tronca o nome pra caber
      if (nome.length > 8) nome = nome.slice(0, 7) + '…';
      var hora = c.hora ? '<div class="one-agenda-card-mini-time">' + c.hora + '</div>' : '';
      return '<div class="one-agenda-card-mini ' + cls + '">' +
               '<div class="one-agenda-card-mini-name">' + nome + '</div>' + hora +
             '</div>';
    }).join('');
    colsHtml += '<div class="one-agenda-col">' +
                  '<div class="one-agenda-day-header">' +
                    '<div class="one-agenda-day-name">' + nomesDias[i] + '</div>' +
                    '<div class="one-agenda-day-num' + (isHoje ? ' today' : '') + '">' + d.getDate() + '</div>' +
                  '</div>' +
                  '<div class="one-agenda-day-cards">' +
                    (cardsHtml || '<div class="one-agenda-empty-col"></div>') +
                  '</div>' +
                '</div>';
  }

  // Calcula resumos (semana corrente)
  var receber = 0, qtdR = 0, pagar = 0, qtdP = 0;
  daSemana.forEach(function(c){
    var v = Number(c.valor) || 0;
    var t = String(c.tipo || '').toLowerCase();
    if (v > 0) {
      if (/desp|pag|aluguel|imposto|conta/.test(t)) { pagar += v; qtdP++; }
      else { receber += v; qtdR++; }
    }
  });
  function _brl(v) { return 'R$ ' + (v||0).toLocaleString('pt-BR', {minimumFractionDigits:0, maximumFractionDigits:0}); }

  var resumoHtml =
    '<div class="one-desk-mini-resumos">' +
      '<div class="one-desk-mini-resumo mini-receber">' +
        '<div class="one-desk-mini-resumo-val">' + _brl(receber) + '</div>' +
        '<div class="one-desk-mini-resumo-lbl">A receber</div>' +
      '</div>' +
      '<div class="one-desk-mini-resumo mini-pagar">' +
        '<div class="one-desk-mini-resumo-val">' + _brl(pagar) + '</div>' +
        '<div class="one-desk-mini-resumo-lbl">A pagar</div>' +
      '</div>' +
      '<div class="one-desk-mini-resumo mini-compromissos">' +
        '<div class="one-desk-mini-resumo-val">' + daSemana.length + '</div>' +
        '<div class="one-desk-mini-resumo-lbl">Semana</div>' +
      '</div>' +
    '</div>';

  wrap.innerHTML = '<div class="one-agenda-week-grid">' + colsHtml + '</div>' + resumoHtml;
}

function renderOneDeskFinanceiro() {
  var saldoEl = document.getElementById('one-desk-fin-saldo');
  if (!saldoEl) return;
  var entEl  = document.getElementById('one-desk-fin-entradas');
  var saiEl  = document.getElementById('one-desk-fin-saidas');
  var pendEl = document.getElementById('one-desk-fin-pendente');
  var listEl = document.getElementById('one-desk-fin-list');
  var now    = new Date();
  var mesStr = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  var receitas=[]; var despesas=[];
  try { receitas = JSON.parse(localStorage.getItem(oneU('receitas'))||'[]'); } catch(e){}
  try { despesas = JSON.parse(localStorage.getItem(oneU('despesas'))||'[]'); } catch(e){}
  var fmt = function(v){ return 'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); };
  var recMes   = receitas.filter(function(r){return (r.data||'').startsWith(mesStr);});
  var despMes  = despesas.filter(function(d){return (d.data||'').startsWith(mesStr);});
  var totalRec = recMes.reduce(function(a,r){return a+(r.valor||0);},0);
  var totalDesp= despMes.reduce(function(a,d){return a+(d.valor||0);},0);
  var pendente = recMes.filter(function(r){return r.status==='Pendente';}).reduce(function(a,r){return a+(r.valor||0);},0)
               + despMes.filter(function(d){return d.status!=='Pago';}).reduce(function(a,d){return a+(d.valor||0);},0);
  saldoEl.textContent = fmt(totalRec - totalDesp);
  if (entEl)  entEl.textContent  = fmt(totalRec);
  if (saiEl)  saiEl.textContent  = fmt(totalDesp);
  if (pendEl) pendEl.textContent = fmt(pendente);
  if (listEl) {
    var todos = receitas.concat(despesas).map(function(item) {
      return { item: item, isRec: receitas.indexOf(item) >= 0 };
    }).sort(function(a,b){return (b.item.data||'').localeCompare(a.item.data||'');}).slice(0,5);
    var html = '';
    todos.forEach(function(obj) {
      var i = obj.item; var isRec = obj.isRec;
      var cor = isRec ? '#2BA574' : '#D95757';
      var bg  = isRec ? 'rgba(43,165,116,.10)' : 'rgba(217,87,87,.10)';
      var seta= isRec ? '↑' : '↓';
      html += '<div class="one-fin-item">';
      html += '<div class="one-fin-item-icon" style="background:'+bg+';color:'+cor+'">'+seta+'</div>';
      html += '<div class="one-fin-item-info"><div class="one-fin-item-name">'+(i.nome||i.descricao||'—')+'</div>';
      html += '<div class="one-fin-item-date">'+(i.data||'')+'</div></div>';
      html += '<div class="one-fin-item-value '+(isRec?'rec':'desp')+'">'+fmt(i.valor||0)+'</div></div>';
    });
    listEl.innerHTML = html || '<p style="font-size:12px;color:#B0A8BC;text-align:center;padding:12px 0">Nenhum lançamento</p>';
  }
}

function renderOneDeskTarefas() {
  var el = document.getElementById('one-desk-tarefas-list');
  if (!el) return;
  var tarefas = [];
  try { tarefas = JSON.parse(localStorage.getItem(oneU('tarefas'))||'[]'); } catch(e){}

  // Classifica em 3 buckets
  var aFazer = [], emAnd = [], concl = [];
  tarefas.forEach(function(t){
    if (t.concluida || String(t.status||'').toLowerCase() === 'concluida') concl.push(t);
    else if (/em-?andamento|andamento/.test(String(t.status||'').toLowerCase())) emAnd.push(t);
    else aFazer.push(t);
  });

  // Calcula resumos
  var pendentes = aFazer.length + emAnd.length;
  var urgentes = tarefas.filter(function(t){
    return !t.concluida && (String(t.prioridade||'').toLowerCase() === 'alta' || String(t.prioridade||'').toLowerCase() === 'urgente');
  }).length;
  // Concluídas no mês atual
  var hojeM = new Date();
  var mesStr = hojeM.getFullYear() + '-' + String(hojeM.getMonth()+1).padStart(2,'0');
  var conclMes = concl.filter(function(t){
    var d = t.concluido_em || t.criadoEm || t.criado || t.data || '';
    return d && d.indexOf(mesStr) === 0;
  }).length;

  // Mostra MAX 3 TAREFAS NO TOTAL — distribuídas pelas 3 colunas (preserva representação)
  // Pega 1 de cada coluna se houver. Se sobrar slots, prefere "A fazer" → "Em and.".
  var visiveis = { aFazer: [], emAnd: [], concl: [] };
  var slots = 3;
  // Volta 1, 1, 1 inicialmente
  if (aFazer.length && slots) { visiveis.aFazer.push(aFazer[0]); slots--; }
  if (emAnd.length && slots)  { visiveis.emAnd.push(emAnd[0]); slots--; }
  if (concl.length && slots)  { visiveis.concl.push(concl[0]); slots--; }
  // Sobraram slots? Distribui priorizando A fazer
  var idxA = 1, idxE = 1, idxC = 1;
  while (slots > 0) {
    var added = false;
    if (idxA < aFazer.length) { visiveis.aFazer.push(aFazer[idxA++]); slots--; added = true; if (!slots) break; }
    if (idxE < emAnd.length) { visiveis.emAnd.push(emAnd[idxE++]); slots--; added = true; if (!slots) break; }
    if (idxC < concl.length) { visiveis.concl.push(concl[idxC++]); slots--; added = true; if (!slots) break; }
    if (!added) break;
  }

  // Render colunas
  function colHtml(label, cor, bgCor, lista, visivelLista) {
    var itemsHtml = visivelLista.map(function(t){
      var nome = (t.nome || t.titulo || t.descricao || 'Tarefa').replace(/</g,'&lt;');
      return '<div class="one-desk-tar-mini-card">' + nome + '</div>';
    }).join('');
    if (!visivelLista.length) {
      itemsHtml = '<div class="one-desk-tar-mini-empty">—</div>';
    }
    return '<div class="one-desk-tar-mini-col">' +
             '<div class="one-desk-tar-mini-col-head" style="background:' + bgCor + ';color:' + cor + '">' +
               '<span class="one-desk-tar-mini-col-label">' + label + '</span>' +
               '<span class="one-desk-tar-mini-col-count">' + lista.length + '</span>' +
             '</div>' +
             '<div class="one-desk-tar-mini-col-body">' + itemsHtml + '</div>' +
           '</div>';
  }

  var kanbanHtml = '<div class="one-desk-tar-kanban-grid">' +
    colHtml('A fazer',     '#6E4F87', 'rgba(155,114,176,0.20)', aFazer, visiveis.aFazer) +
    colHtml('Em and.',     '#8B6914', 'rgba(212,166,85,0.20)',  emAnd,  visiveis.emAnd) +
    colHtml('Concl.',      '#1F6B52', 'rgba(39,133,106,0.20)',  concl,  visiveis.concl) +
    '</div>';

  var resumoHtml =
    '<div class="one-desk-mini-resumos">' +
      '<div class="one-desk-mini-resumo mini-pendentes">' +
        '<div class="one-desk-mini-resumo-val">' + pendentes + '</div>' +
        '<div class="one-desk-mini-resumo-lbl">Pendentes</div>' +
      '</div>' +
      '<div class="one-desk-mini-resumo mini-urgentes">' +
        '<div class="one-desk-mini-resumo-val">' + urgentes + '</div>' +
        '<div class="one-desk-mini-resumo-lbl">Urgentes</div>' +
      '</div>' +
      '<div class="one-desk-mini-resumo mini-concluidas">' +
        '<div class="one-desk-mini-resumo-val">' + conclMes + '</div>' +
        '<div class="one-desk-mini-resumo-lbl">No mês</div>' +
      '</div>' +
    '</div>';

  el.innerHTML = kanbanHtml + resumoHtml;
}

function renderOneDesktop() {
  renderOneDeskGreeting();
  renderOneDeskAgenda();
  renderOneDeskTarefas();
  renderOneDeskFinanceiro();
}

/* ── Frases rotativas do header desktop ─────────────────────────── */
(function() {
  var frases = [
    'Sua mente livre para o que importa.',
    'Dê um Google no seu cérebro.',
    'Tudo organizado, nada esquecido.',
    'Foco no que realmente importa.',
    'Sua agenda na palma da mão.',
    'Aproveite cada momento do seu dia.',
    'Menos ruído, mais clareza.',
    'O assistente que conhece sua rotina.',
  ];
  var idx = 0;
  function trocarFrase() {
    var el = document.getElementById('one-desk-phrase');
    if (!el) return;
    el.style.opacity = '0';
    setTimeout(function() {
      idx = (idx + 1) % frases.length;
      el.textContent = frases[idx];
      el.style.opacity = '1';
    }, 400);
  }
  setInterval(trocarFrase, 5000);
})();

/* ── Auto-grow dos textareas do prompt ──────────────────────────── */
(function() {
  function setupAutoGrow(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 180) + 'px';
    });
  }
  function setupEnterEnvia(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('keydown', function(e) {
      // Enter sem Shift envia; Shift+Enter insere quebra de linha
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        oneEnviar();
      }
    });
  }
  document.addEventListener('DOMContentLoaded', function() {
    setupAutoGrow(document.getElementById('one-input'));
    setupAutoGrow(document.getElementById('one-input-desk'));
    setupEnterEnvia('one-input');
    setupEnterEnvia('one-input-desk');
  });
})();

/* Atualiza greeting ao entrar na tela */
(function() {
  var orig = window.go;
  window.go = function(tela) {
    var screenOne = document.getElementById('screen-one');
    /* 'one' e 'home' → screen-one é o home do app */
    if (tela === 'one' || tela === 'home') {
      document.querySelectorAll('.screen.active').forEach(function(s){ s.classList.remove('active'); });
      if (screenOne) screenOne.classList.add('active');
      renderOneGreeting();
      renderOneAgenda();
      renderOneFinanceiro();
      if (typeof renderOneTarefasMobile === 'function') renderOneTarefasMobile();
      renderOneDesktop();
      return;
    }
    /* Saindo para tela funcional — desativa screen-one */
    if (screenOne) screenOne.classList.remove('active');
    if (typeof orig === 'function') orig(tela);
  };
  /* Inicializa greeting imediatamente e a cada minuto */
  renderOneGreeting();
  renderOneDesktop();
  setInterval(function(){ renderOneGreeting(); renderOneDeskGreeting(); }, 60000);
})();

/* ── Modais internos ─────────────────────────────────────────── */
var _lancTipo = 'receita';

function oneAbrirLancamento() {
  _lancTipo = 'receita';
  var today = new Date();
  document.getElementById('lanc-data').value = today.getFullYear() + '-'
    + String(today.getMonth()+1).padStart(2,'0') + '-'
    + String(today.getDate()).padStart(2,'0');
  document.getElementById('lanc-nome').value = '';
  document.getElementById('lanc-valor').value = '';
  document.getElementById('lanc-cat').value = '';
  document.getElementById('tab-rec').classList.add('active');
  document.getElementById('tab-desp').classList.remove('active');
  document.getElementById('one-modal-lancamento').classList.add('open');
}

function oneMudarTipoLanc(tipo) {
  _lancTipo = tipo;
  document.getElementById('tab-rec').classList.toggle('active', tipo === 'receita');
  document.getElementById('tab-desp').classList.toggle('active', tipo === 'despesa');
}

function oneFecharModal(id) {
  var el = document.getElementById('one-modal-' + id);
  if (el) el.classList.remove('open');
}

function oneSalvarLancamento() {
  var nome  = (document.getElementById('lanc-nome').value  || '').trim();
  var valor = parseFloat(document.getElementById('lanc-valor').value) || 0;
  var data  = document.getElementById('lanc-data').value;
  var cat   = (document.getElementById('lanc-cat').value   || '').trim() || 'Geral';
  if (!nome || !valor || !data) { oneToast('Preencha descrição, valor e data.'); return; }
  var chave = _lancTipo === 'receita' ? 'receitas' : 'despesas';
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU(chave)) || '[]'); } catch(e){}
  var item = { id: crypto.randomUUID(), data: data, valor: valor, status: 'Pago', categoria: cat };
  if (_lancTipo === 'receita') { item.nome = nome; item.tipo = cat; item.formaPagamento = getFormaPagamentoDefault(); }
  else { item.descricao = nome; }
  lista.push(item);
  localStorage.setItem(oneU(chave), JSON.stringify(lista));
  /* diagnóstico temporário — remove após confirmar sync */
  oneToast('supa:' + !!window.supa + ' user:' + !!window.authUser + ' fn:' + (typeof supaUpsert));
  if (typeof supaUpsert === 'function') supaUpsert(chave, item);
  oneFecharModal('lancamento');
  renderOneFinanceiro();
  oneToast(_lancTipo === 'receita' ? '✓ Receita salva!' : '✓ Despesa salva!');
}

var oneEditandoCompromissoId = null;

function oneAbrirCompromisso(id) {
  // Garante que estamos no painel Agenda no centro
  if (typeof swapToCenter === 'function') swapToCenter('agenda');

  oneEditandoCompromissoId = id || null;
  var title = document.getElementById('one-ag-form-title');
  var del   = document.getElementById('comp-del-btn');
  var obsEl = document.getElementById('comp-obs');

  if (id) {
    var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]'); } catch(e){}
    var c = lista.find(function(x){ return x.id === id; });
    if (!c) { if (typeof oneToast === 'function') oneToast('Compromisso não encontrado.'); return; }
    if (title) title.textContent = 'Editar Compromisso';
    if (del) del.removeAttribute('hidden');
    document.getElementById('comp-data').value  = c.data || '';
    document.getElementById('comp-hora').value  = c.hora || '';
    document.getElementById('comp-nome').value  = c.nome || '';
    document.getElementById('comp-tipo').value  = c.tipo || '';
    document.getElementById('comp-valor').value = c.valor || '';
    if (obsEl) obsEl.value = c.observacoes || '';
    // Foca no campo nome pra facilitar edição
    setTimeout(function(){ document.getElementById('comp-nome').focus(); }, 50);
  } else {
    oneResetFormCompromisso();
  }
}

function oneResetFormCompromisso() {
  oneEditandoCompromissoId = null;
  var today = new Date();
  var title = document.getElementById('one-ag-form-title');
  var del   = document.getElementById('comp-del-btn');
  var obsEl = document.getElementById('comp-obs');
  if (title) title.textContent = 'Novo Compromisso';
  if (del) del.setAttribute('hidden', '');
  var dataEl = document.getElementById('comp-data');
  if (dataEl) dataEl.value = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
  var horaEl = document.getElementById('comp-hora'); if (horaEl) horaEl.value = '';
  var nomeEl = document.getElementById('comp-nome'); if (nomeEl) nomeEl.value = '';
  var tipoEl = document.getElementById('comp-tipo'); if (tipoEl) tipoEl.value = '';
  var valEl  = document.getElementById('comp-valor'); if (valEl) valEl.value = '';
  if (obsEl) obsEl.value = '';
}

/* ── Prompt da Pinah — parser simples (sem IA ainda) ─────── */
function onePromptPinah() {
  var input = document.getElementById('one-ag-prompt-input');
  if (!input) return;
  var txt = (input.value || '').trim();
  if (!txt) return;

  var nome = txt, hora = '', valor = '', tipo = '';
  var data = new Date();

  // Captura valor (R$ X ou só número grande precedido de "R$" ou "valor")
  var mVal = txt.match(/r\$\s*([\d.,]+)|(\d+(?:[.,]\d{1,2})?)\s*(?:reais|r\$|RS)/i);
  if (mVal) {
    valor = (mVal[1] || mVal[2]).replace(/\./g,'').replace(',','.');
    txt = txt.replace(mVal[0], '').trim();
  }
  // Captura hora "14h", "14:30", "14h30"
  var mHora = txt.match(/(\d{1,2})\s*(?:h|:)\s*(\d{2})?/i);
  if (mHora) {
    var hh = mHora[1].padStart(2,'0');
    var mm = (mHora[2] || '00').padStart(2,'0');
    hora = hh + ':' + mm;
    txt = txt.replace(mHora[0], '').trim();
  }
  // Captura data relativa
  if (/\bamanhã\b/i.test(txt)) {
    data.setDate(data.getDate() + 1);
    txt = txt.replace(/\bamanhã\b/i, '').trim();
  } else if (/\bhoje\b/i.test(txt)) {
    txt = txt.replace(/\bhoje\b/i, '').trim();
  } else if (/\bdepois\s+de\s+amanhã\b/i.test(txt)) {
    data.setDate(data.getDate() + 2);
    txt = txt.replace(/\bdepois\s+de\s+amanhã\b/i, '').trim();
  } else {
    // Captura data DD/MM
    var mData = txt.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (mData) {
      var ano = mData[3] ? (mData[3].length === 2 ? '20'+mData[3] : mData[3]) : data.getFullYear();
      data = new Date(parseInt(ano), parseInt(mData[2])-1, parseInt(mData[1]));
      txt = txt.replace(mData[0], '').trim();
    }
  }
  // Limpa palavras de cola
  txt = txt.replace(/^(às|as|com|para|pra)\s+/i, '').replace(/\s+(às|as|com|para|pra)\s+/gi, ' ').trim();
  nome = txt || nome;

  // Abre modal pré-preenchido
  var ds = data.getFullYear() + '-' + String(data.getMonth()+1).padStart(2,'0') + '-' + String(data.getDate()).padStart(2,'0');
  oneAgModalAbrir(ds);
  setTimeout(function() {
    document.getElementById('one-ag-modal-nome').value  = nome;
    document.getElementById('one-ag-modal-hora').value  = hora;
    document.getElementById('one-ag-modal-tipo').value  = tipo;
    document.getElementById('one-ag-modal-valor').value = valor;
    document.getElementById('one-ag-modal-nome').focus();
  }, 120);
  input.value = '';
  if (typeof oneToast === 'function') oneToast('Pinah entendeu — confira e salve!');
}

function oneSalvarCompromisso() {
  var nome  = (document.getElementById('comp-nome').value || '').trim();
  var data  = document.getElementById('comp-data').value;
  var hora  = document.getElementById('comp-hora').value;
  var tipo  = (document.getElementById('comp-tipo').value || '').trim() || 'Compromisso';
  var valor = parseFloat(document.getElementById('comp-valor').value) || 0;
  var obs   = (document.getElementById('comp-obs') || {}).value || '';
  if (!nome || !data) { oneToast('Preencha nome e data.'); return; }

  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]'); } catch(e){}

  if (oneEditandoCompromissoId) {
    var idx = lista.findIndex(function(x){ return x.id === oneEditandoCompromissoId; });
    if (idx !== -1) {
      lista[idx] = Object.assign({}, lista[idx], { data:data, hora:hora, nome:nome, tipo:tipo, valor:valor, observacoes:obs });
      supaUpsert('compromissos', lista[idx]);
    }
    // Atualiza receita vinculada se existir
    var rec = []; try { rec = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]'); } catch(e){}
    var rIdx = rec.findIndex(function(r){ return r.compromissoId === oneEditandoCompromissoId; });
    if (valor > 0) {
      if (rIdx !== -1) {
        rec[rIdx] = Object.assign({}, rec[rIdx], { data:data, nome:nome, tipo:tipo, valor:valor });
        supaUpsert('receitas', rec[rIdx]);
      } else {
        var novaRecUpd = { id: crypto.randomUUID(), compromissoId:oneEditandoCompromissoId, data:data, nome:nome, tipo:tipo, valor:valor, status:'pendente', categoria:tipo };
        rec.push(novaRecUpd);
        supaUpsert('receitas', novaRecUpd);
      }
    } else if (rIdx !== -1) {
      rec.splice(rIdx, 1); // remove receita se valor virou zero
    }
    localStorage.setItem(oneU('receitas'), JSON.stringify(rec));
    oneToast('✓ Compromisso atualizado!');
  } else {
    var novoId = crypto.randomUUID();
    var novoCompOne = { id:novoId, data:data, hora:hora, nome:nome, descricao:nome, tipo:tipo, valor:valor, observacoes:obs, status:'agendado', realizado:false, duracao:45 };
    lista.push(novoCompOne);
    supaUpsert('compromissos', novoCompOne);
    // Cria receita futura pendente se valor > 0
    if (valor > 0) {
      var rec = []; try { rec = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]'); } catch(e){}
      var novaRecOne = { id: crypto.randomUUID(), compromissoId:novoId, data:data, nome:nome, tipo:tipo, valor:valor, status:'pendente', categoria:tipo };
      rec.push(novaRecOne);
      supaUpsert('receitas', novaRecOne);
      localStorage.setItem(oneU('receitas'), JSON.stringify(rec));
    }
    oneToast('✓ Compromisso salvo!');
  }

  localStorage.setItem(oneU('compromissos'), JSON.stringify(lista));
  oneResetFormCompromisso();
  if (typeof renderOneAgendaPainel === 'function') renderOneAgendaPainel();
  if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
  if (typeof renderOneAgenda === 'function') renderOneAgenda();
}

async function oneExcluirCompromisso() {
  if (!oneEditandoCompromissoId) return;
  if (!confirm('Excluir este compromisso? A receita vinculada (se houver) também será removida.')) return;

  var idParaExcluir = oneEditandoCompromissoId;

  // Espera o servidor confirmar ANTES de mexer no aparelho. Sem isso, o
  // compromisso sumia da tela mas voltava no reload quando o servidor recusava
  // a exclusão silenciosamente (ex: política de permissão da tabela).
  var resp = await supaDelete('compromissos', idParaExcluir);
  if (resp && resp.ok === false && resp.motivo !== 'tabela-desconhecida') {
    var detalhe = resp.motivo === 'zero-linhas'
      ? 'O servidor não apagou esta linha (provável trava de permissão na tabela de compromissos no Supabase).'
      : (resp.error && (resp.error.message || resp.error.code)) || resp.motivo || 'motivo desconhecido';
    alert('Não consegui excluir no servidor, então deixei o compromisso onde está pra não enganar.\n\nMotivo: ' + detalhe);
    return;
  }

  // Servidor confirmou (ou tabela não existe no schema): apaga do aparelho.
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]'); } catch(e){}
  lista = lista.filter(function(x){ return x.id !== idParaExcluir; });
  localStorage.setItem(oneU('compromissos'), JSON.stringify(lista));

  // Remove receita vinculada se existir
  var rec = []; try { rec = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]'); } catch(e){}
  var recVinculada = rec.find(function(r){ return r.compromissoId === idParaExcluir; });
  if (recVinculada) await supaDelete('receitas', recVinculada.id);
  rec = rec.filter(function(r){ return r.compromissoId !== idParaExcluir; });
  localStorage.setItem(oneU('receitas'), JSON.stringify(rec));

  oneResetFormCompromisso();
  if (typeof oneToast === 'function') oneToast('✓ Compromisso excluído.');
  if (typeof renderOneAgendaPainel === 'function') renderOneAgendaPainel();
  if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
  if (typeof renderOneAgenda === 'function') renderOneAgenda();
}


/* ── Agenda Kanban: modal + toggle + excluir ── */
function oneAgToggleRealizado(id) {
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU('compromissos'))||'[]'); } catch(e){}
  var idx = lista.findIndex(function(c){ return c.id === id; });
  if (idx !== -1) {
    lista[idx].status = (lista[idx].status === 'Realizado') ? 'Pendente' : 'Realizado';
    localStorage.setItem(oneU('compromissos'), JSON.stringify(lista));
  }
  renderOneAgendaPainel();
  if (typeof renderOneAgenda === 'function') renderOneAgenda();
}

async function oneAgExcluir(id) {
  if (!confirm('Excluir este compromisso? A receita vinculada (se houver) também será removida.')) return;

  // Espera o servidor confirmar ANTES de apagar do aparelho. Sem isso o
  // compromisso sumia da tela mas voltava no reload — porque a exclusão nunca
  // chegava ao servidor e a sincronização puxava ele de volta.
  var resp = (typeof supaDelete === 'function')
    ? await supaDelete('compromissos', id)
    : { ok: true };
  if (resp && resp.ok === false && resp.motivo !== 'tabela-desconhecida') {
    var detalhe = resp.motivo === 'zero-linhas'
      ? 'O servidor não apagou esta linha (provável trava de permissão na tabela de compromissos no Supabase).'
      : (resp.error && (resp.error.message || resp.error.code)) || resp.motivo || 'motivo desconhecido';
    alert('Não consegui excluir no servidor, então deixei o compromisso onde está pra não enganar.\n\nMotivo: ' + detalhe);
    return;
  }

  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU('compromissos'))||'[]'); } catch(e){}
  lista = lista.filter(function(c){ return c.id !== id; });
  localStorage.setItem(oneU('compromissos'), JSON.stringify(lista));

  // Receita(s) vinculada(s): apaga no servidor pelo id de cada uma, depois local.
  var rec = []; try { rec = JSON.parse(localStorage.getItem(oneU('receitas'))||'[]'); } catch(e){}
  var vinculadas = rec.filter(function(r){ return r.compromissoId === id; });
  for (var i = 0; i < vinculadas.length; i++) {
    if (typeof supaDelete === 'function') await supaDelete('receitas', vinculadas[i].id);
  }
  rec = rec.filter(function(r){ return r.compromissoId !== id; });
  localStorage.setItem(oneU('receitas'), JSON.stringify(rec));

  if (typeof oneToast === 'function') oneToast('✓ Compromisso excluído.');
  renderOneAgendaPainel();
  if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
  if (typeof renderOneAgenda === 'function') renderOneAgenda();
}

function oneAgModalAbrir(date) {
  var modal = document.getElementById('one-ag-modal');
  if (!modal) return;
  var hoje = new Date();
  var ds = date || (hoje.toISOString().slice(0,10));
  document.getElementById('one-ag-modal-title').textContent = 'Novo compromisso';
  document.getElementById('one-ag-modal-id').value   = '';
  document.getElementById('one-ag-modal-nome').value = '';
  document.getElementById('one-ag-modal-data').value = ds;
  document.getElementById('one-ag-modal-hora').value = '';
  document.getElementById('one-ag-modal-tipo').value = '';
  document.getElementById('one-ag-modal-valor').value = '';
  document.getElementById('one-ag-modal-obs').value  = '';
  var delNovo = document.getElementById('one-ag-modal-del');
  if (delNovo) delNovo.style.display = 'none';
  modal.classList.add('open');
  setTimeout(function(){ document.getElementById('one-ag-modal-nome').focus(); }, 100);
}

function oneAgModalEditar(id) {
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU('compromissos'))||'[]'); } catch(e){}
  var c = lista.find(function(x){ return x.id === id; });
  if (!c) return;
  var modal = document.getElementById('one-ag-modal');
  if (!modal) return;
  document.getElementById('one-ag-modal-title').textContent = 'Editar compromisso';
  document.getElementById('one-ag-modal-id').value    = c.id;
  document.getElementById('one-ag-modal-nome').value  = c.nome || c.descricao || '';
  document.getElementById('one-ag-modal-data').value  = c.data || '';
  document.getElementById('one-ag-modal-hora').value  = c.hora || '';
  document.getElementById('one-ag-modal-tipo').value  = c.tipo || '';
  document.getElementById('one-ag-modal-valor').value = c.valor || '';
  document.getElementById('one-ag-modal-obs').value   = c.observacoes || '';
  var delEd = document.getElementById('one-ag-modal-del');
  if (delEd) delEd.style.display = '';
  modal.classList.add('open');
  setTimeout(function(){ document.getElementById('one-ag-modal-nome').focus(); }, 100);
}

function oneAgModalFechar() {
  var modal = document.getElementById('one-ag-modal');
  if (modal) modal.classList.remove('open');
}

async function oneAgModalExcluir() {
  var id = document.getElementById('one-ag-modal-id').value;
  if (!id) return;
  await oneAgExcluir(id); // confirma + apaga no servidor + re-render
  oneAgModalFechar();
}

function oneAgModalSalvar() {
  var nome  = (document.getElementById('one-ag-modal-nome').value || '').trim();
  var data  = document.getElementById('one-ag-modal-data').value;
  if (!nome || !data) { if (typeof oneToast==='function') oneToast('Nome e data são obrigatórios.','error'); return; }
  var id    = document.getElementById('one-ag-modal-id').value;
  var hora  = document.getElementById('one-ag-modal-hora').value || '';
  var tipo  = (document.getElementById('one-ag-modal-tipo').value || '').trim() || 'Compromisso';
  var valor = parseFloat(document.getElementById('one-ag-modal-valor').value) || 0;
  var obs   = document.getElementById('one-ag-modal-obs').value || '';

  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU('compromissos'))||'[]'); } catch(e){}
  var rec   = []; try { rec   = JSON.parse(localStorage.getItem(oneU('receitas'))   ||'[]'); } catch(e){}

  if (id) {
    var idx = lista.findIndex(function(x){ return x.id === id; });
    if (idx !== -1) {
      lista[idx] = Object.assign(lista[idx], { data:data, hora:hora, nome:nome, tipo:tipo, valor:valor, observacoes:obs });
      supaUpsert('compromissos', lista[idx]);
    }
    var rIdx = rec.findIndex(function(r){ return r.compromissoId === id; });
    if (valor > 0) {
      if (rIdx !== -1) {
        rec[rIdx] = Object.assign(rec[rIdx], { data:data, nome:nome, tipo:tipo, valor:valor });
        supaUpsert('receitas', rec[rIdx]);
      } else {
        var novaRecEdit = { id: crypto.randomUUID(), compromissoId:id, data:data, nome:nome, tipo:tipo, valor:valor, status:'pendente', categoria:tipo };
        rec.push(novaRecEdit);
        supaUpsert('receitas', novaRecEdit);
      }
    } else if (rIdx !== -1) { rec.splice(rIdx, 1); }
    if (typeof oneToast==='function') oneToast('✓ Compromisso atualizado!');
  } else {
    var novoId = crypto.randomUUID();
    var novoComp = { id:novoId, data:data, hora:hora, nome:nome, descricao:nome, tipo:tipo, valor:valor, observacoes:obs, status:'agendado', realizado:false, duracao:45 };
    lista.push(novoComp);
    supaUpsert('compromissos', novoComp);
    if (valor > 0) {
      var novaRec = { id: crypto.randomUUID(), compromissoId:novoId, data:data, nome:nome, tipo:tipo, valor:valor, status:'pendente', categoria:tipo };
      rec.push(novaRec);
      supaUpsert('receitas', novaRec);
    }
    if (typeof oneToast==='function') oneToast('✓ Compromisso salvo!');
  }

  localStorage.setItem(oneU('compromissos'), JSON.stringify(lista));
  localStorage.setItem(oneU('receitas'), JSON.stringify(rec));
  oneAgModalFechar();
  renderOneAgendaPainel();
  if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
  if (typeof renderOneAgenda === 'function') renderOneAgenda();
}

function oneToast(msg) {
  var old = document.querySelector('.one-toast');
  if (old) old.remove();
  var t = document.createElement('div');
  t.className = 'one-toast';
  t.textContent = msg;
  document.getElementById('screen-one').appendChild(t);
  setTimeout(function(){ t.remove(); }, 2200);
}

/* ── Dados demo + ativação automática ────────────────────────── */
(function() {
  function oneInitDemo() {
    // Multi-tenant: só semeia demo se o user real estiver logado
    if (!window.authUser || !window.authUser.id) return;
    if (localStorage.getItem(oneU('one_init'))) return;
    // Seed financeiro do One zerado em 17/05/2026: app em fase de uso real.
    // Receitas e despesas demo (Maria S., Leonardo B., etc.) removidas pra que
    // o usuário comece limpo. Compromissos demo mantidos só pra usuários
    // novos sentirem a agenda viva na primeira abertura.
    var now = new Date();
    var ano = now.getFullYear();
    var mes = String(now.getMonth()+1).padStart(2,'0');
    var h = now.getDate();
    var d = function(dia) { return ano+'-'+mes+'-'+String(Math.max(1,Math.min(28,dia))).padStart(2,'0'); };
    if (!localStorage.getItem(oneU('receitas'))) {
      localStorage.setItem(oneU('receitas'), JSON.stringify([]));
    }
    if (!localStorage.getItem(oneU('despesas'))) {
      localStorage.setItem(oneU('despesas'), JSON.stringify([]));
    }
    if (!localStorage.getItem(oneU('compromissos'))) {
      localStorage.setItem(oneU('compromissos'), JSON.stringify([
        {id:'c1',data:d(h-2),hora:'09:00',nome:'Maria S.',tipo:'Atendimento',valor:280,status:'Confirmado',realizado:true},
        {id:'c2',data:d(h-1),hora:'14:00',nome:'Ana K.',tipo:'Atendimento',valor:280,status:'Confirmado',realizado:true},
        {id:'c3',data:d(h),hora:'10:00',nome:'Beatriz N.',tipo:'Atendimento',valor:280,status:'Confirmado'},
        {id:'c4',data:d(h),hora:'15:30',nome:'Leonardo B.',tipo:'Avaliação',valor:350,status:'Pendente'},
        {id:'c5',data:d(h+2),hora:'09:00',nome:'Maria S.',tipo:'Atendimento',valor:280,status:'Pendente'},
        {id:'c6',data:d(h+4),hora:'11:00',nome:'Reunião parceria',tipo:'Profissional',valor:0,status:'Pendente'}
      ]));
    }
    localStorage.setItem(oneU('one_init'), '1');
  }

  /* Exporta TODO o armazenamento local deste aparelho num .json (read-only).
     Serve pra diagnosticar o descompasso mobile x desktop sem apagar nem
     alterar nada. Inclui um resumo por entidade pra leitura rápida. */
  function oneExportarDadosLocais() {
    try {
      var dump = {};
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        dump[k] = localStorage.getItem(k);
      }
      var uid = (window.authUser && window.authUser.id) ? window.authUser.id : 'anon';
      var resumo = {};
      ['receitas','despesas','despesasFixas','receitasFixas','compromissos','tarefas','tarefas_areas','notas_cerebro','contas','despesas_fixas','receitas_fixas'].forEach(function(ent){
        var raw = localStorage.getItem('u_' + uid + '_' + ent);
        if (raw == null) { resumo[ent] = '(chave ausente)'; return; }
        try { var arr = JSON.parse(raw); resumo[ent] = Array.isArray(arr) ? (arr.length + ' itens') : (typeof arr); }
        catch(e) { resumo[ent] = '(nao-json)'; }
      });
      var payload = {
        _meta: {
          exportadoEm: new Date().toISOString(),
          userId: uid,
          userEmail: (window.authUser && window.authUser.email) ? window.authUser.email : '',
          userAgent: navigator.userAgent,
          url: window.location.href,
          totalChaves: Object.keys(dump).length,
          resumoEntidades: resumo
        },
        localStorage: dump
      };
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
      var a = document.createElement('a');
      a.href = url; a.download = 'conta-comigo-backup-' + stamp + '.json';
      document.body.appendChild(a); a.click();
      setTimeout(function(){ try { document.body.removeChild(a); } catch(e){} URL.revokeObjectURL(url); }, 1500);
      if (typeof oneToast === 'function') oneToast('✓ Backup gerado (' + Object.keys(dump).length + ' chaves)');
      else if (typeof toast === 'function') toast('Backup gerado.', 'success');
    } catch(e) {
      console.error('[oneExportarDadosLocais] erro', e);
      if (typeof oneToast === 'function') oneToast('⚠ Erro ao exportar backup', 'error');
    }
  }
  window.oneExportarDadosLocais = oneExportarDadosLocais;

  /* Importa um backup .json (gerado pelo Exportar) PARA este aparelho.
     Substitui os dados locais por uma cópia fiel do arquivo — serve pra
     o celular adotar o retrato limpo do desktop, recuperando os vínculos
     de conta (contaId/faturaMesAno) que o servidor não guarda.
     Preserva a sessão de login DESTE aparelho (não importa o token). */
  function oneImportarDadosLocais(inputEl) {
    try {
      var file = inputEl && inputEl.files && inputEl.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        var payload;
        try { payload = JSON.parse(ev.target.result); }
        catch(e) {
          alert('Arquivo inválido — não é um backup .json legível.');
          inputEl.value = '';
          return;
        }
        var dump = payload && payload.localStorage;
        if (!dump || typeof dump !== 'object') {
          alert('Arquivo inválido — não encontrei os dados (localStorage) dentro do backup.');
          inputEl.value = '';
          return;
        }
        // Confere se o backup é do mesmo usuário deste aparelho.
        var uidAtual = (window.authUser && window.authUser.id) ? window.authUser.id : null;
        var uidBackup = payload._meta && payload._meta.userId;
        if (uidAtual && uidBackup && uidAtual !== uidBackup) {
          if (!confirm('ATENÇÃO: este backup é de OUTRO usuário (' + (payload._meta.userEmail || uidBackup) + ').\n\nImportar mesmo assim? Isso vai sobrescrever os dados deste aparelho.')) {
            inputEl.value = '';
            return;
          }
        }
        var qtd = Object.keys(dump).length;
        var quando = (payload._meta && payload._meta.exportadoEm) ? new Date(payload._meta.exportadoEm).toLocaleString('pt-BR') : 'data desconhecida';
        if (!confirm('Isto vai SUBSTITUIR todos os dados deste aparelho pelos do backup.\n\nBackup: ' + quando + ' · ' + qtd + ' chaves.\n\nA sua sessão de login continua. Confirmar?')) {
          inputEl.value = '';
          return;
        }
        // Preserva o token de login DESTE aparelho.
        var tokensPreservados = {};
        for (var i = 0; i < localStorage.length; i++) {
          var kk = localStorage.key(i);
          if (kk && kk.indexOf('-auth-token') !== -1) tokensPreservados[kk] = localStorage.getItem(kk);
        }
        // Limpa tudo e escreve o conteúdo do backup (menos os tokens do backup).
        localStorage.clear();
        Object.keys(dump).forEach(function(k){
          if (k.indexOf('-auth-token') !== -1) return; // não importa sessão de outro aparelho
          try { localStorage.setItem(k, dump[k]); } catch(e) { console.warn('[import] falhou em', k, e); }
        });
        // Restaura o token deste aparelho.
        Object.keys(tokensPreservados).forEach(function(k){ localStorage.setItem(k, tokensPreservados[k]); });
        inputEl.value = '';
        if (typeof oneToast === 'function') oneToast('✓ Backup importado — recarregando…');
        setTimeout(function(){ window.location.reload(); }, 800);
      };
      reader.onerror = function() {
        alert('Não consegui ler o arquivo.');
        inputEl.value = '';
      };
      reader.readAsText(file);
    } catch(e) {
      console.error('[oneImportarDadosLocais] erro', e);
      alert('Erro ao importar backup. Veja o console.');
    }
  }
  window.oneImportarDadosLocais = oneImportarDadosLocais;

  /* ── IMPORTAR — Biblioteca da Pinah ─────────────────────────────── */

  var _impTabAtiva = 'url';
  var _impCSVTransacoes = [];
  var _impCSVTitulo = '';

  function importarAbrir() {
    var m = document.getElementById('modal-importar');
    if (!m) return;
    _impTabAtiva = 'url';
    _impCSVTransacoes = [];
    _impCSVTitulo = '';
    _impSetStep(1);
    _impMostrarLoading(false);
    var urlIn = document.getElementById('imp-url-input');
    if (urlIn) urlIn.value = '';
    importarSetTab('url');
    m.classList.add('open');
  }
  window.importarAbrir = importarAbrir;

  function importarFechar() {
    var m = document.getElementById('modal-importar');
    if (m) m.classList.remove('open');
  }
  window.importarFechar = importarFechar;

  function importarSetTab(tab) {
    _impTabAtiva = tab;
    ['url','arquivo','imagem','csv'].forEach(function(t) {
      var btn = document.getElementById('imp-tab-' + t);
      var pane = document.getElementById('imp-pane-' + t);
      if (btn) btn.classList.toggle('active', t === tab);
      if (pane) pane.style.display = (t === tab) ? '' : 'none';
    });
    _impSetStep(1);
    _impMostrarLoading(false);
  }
  window.importarSetTab = importarSetTab;

  function _impSetStep(n) {
    var s1 = document.getElementById('imp-step1');
    var s2 = document.getElementById('imp-step2');
    var s2csv = document.getElementById('imp-step2-csv');
    if (s1) s1.style.display = n === 1 ? '' : 'none';
    if (s2) s2.style.display = (n === 2 && _impTabAtiva !== 'csv') ? '' : 'none';
    if (s2csv) s2csv.style.display = (n === 2 && _impTabAtiva === 'csv') ? '' : 'none';
  }

  function _impMostrarLoading(show) {
    var el = document.getElementById('imp-loading');
    if (el) el.style.display = show ? '' : 'none';
    var s1 = document.getElementById('imp-step1');
    if (s1 && !show) s1.style.display = '';
    if (s1 && show) s1.style.display = 'none';
  }

  function _impMostrarPreview(titulo, conteudo) {
    _impMostrarLoading(false);
    var tEl = document.getElementById('imp-preview-titulo');
    var cEl = document.getElementById('imp-preview-conteudo');
    if (tEl) tEl.value = titulo || '';
    if (cEl) cEl.value = conteudo || '';
    _impSetStep(2);
  }

  function importarVoltarStep1() {
    _impSetStep(1);
    _impMostrarLoading(false);
  }
  window.importarVoltarStep1 = importarVoltarStep1;

  function importarUsarConteudo() {
    var titulo = (document.getElementById('imp-preview-titulo') || {}).value || '';
    var conteudo = (document.getElementById('imp-preview-conteudo') || {}).value || '';
    importarFechar();
    abrirModalNota();
    setTimeout(function() {
      var tIn = document.getElementById('nota-input-titulo');
      var cIn = document.getElementById('nota-input-conteudo');
      if (tIn && titulo) tIn.value = titulo;
      if (cIn && conteudo) cIn.value = conteudo;
    }, 120);
  }
  window.importarUsarConteudo = importarUsarConteudo;

  // ── Drag & Drop ───────────────────────────────────────────────

  function impDragOver(event, id) {
    event.preventDefault();
    var el = document.getElementById(id);
    if (el) el.classList.add('drag-over');
  }
  window.impDragOver = impDragOver;

  function impDragLeave(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('drag-over');
  }
  window.impDragLeave = impDragLeave;

  function impDropArquivo(event) {
    event.preventDefault();
    impDragLeave('imp-drop-arquivo');
    var files = event.dataTransfer && event.dataTransfer.files;
    if (!files || !files.length) return;
    _impProcessarArquivoFile(files[0]);
  }
  window.impDropArquivo = impDropArquivo;

  function impDropImagem(event) {
    event.preventDefault();
    impDragLeave('imp-drop-imagem');
    var files = event.dataTransfer && event.dataTransfer.files;
    if (!files || !files.length) return;
    _impProcessarImagemFile(files[0]);
  }
  window.impDropImagem = impDropImagem;

  function impDropCSV(event) {
    event.preventDefault();
    impDragLeave('imp-drop-csv');
    var files = event.dataTransfer && event.dataTransfer.files;
    if (!files || !files.length) return;
    _impProcessarCSVFile(files[0]);
  }
  window.impDropCSV = impDropCSV;

  // ── URL ───────────────────────────────────────────────────────

  function importarProcessarURL() {
    var urlInput = document.getElementById('imp-url-input');
    var url = urlInput ? urlInput.value.trim() : '';
    if (!url || !url.startsWith('http')) {
      toast('Digite uma URL válida (começando com http).', 'error'); return;
    }
    _impMostrarLoading(true);
    fetch('/api/extrair-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.error) { _impMostrarLoading(false); toast('Erro: ' + data.error, 'error'); return; }
      _impMostrarPreview(data.titulo || 'Artigo importado', data.conteudo || '');
    })
    .catch(function() {
      _impMostrarLoading(false);
      toast('Falha ao conectar ao servidor.', 'error');
    });
  }
  window.importarProcessarURL = importarProcessarURL;

  // ── Arquivo (PDF / DOCX / TXT / MD) ──────────────────────────

  function importarProcessarArquivo(input) {
    var file = input && input.files && input.files[0];
    if (!file) return;
    _impProcessarArquivoFile(file);
  }
  window.importarProcessarArquivo = importarProcessarArquivo;

  function _impProcessarArquivoFile(file) {
    var ext = (file.name || '').split('.').pop().toLowerCase();
    if (ext === 'pdf') {
      _impExtrairPDF(file);
    } else if (ext === 'docx') {
      _impExtrairDOCX(file);
    } else if (ext === 'txt' || ext === 'md') {
      _impExtrairTexto(file);
    } else {
      toast('Formato não suportado. Use PDF, DOCX, TXT ou MD.', 'error');
    }
  }

  function _impExtrairTexto(file) {
    _impMostrarLoading(true);
    var reader = new FileReader();
    reader.onload = function(e) {
      var texto = e.target.result || '';
      var titulo = file.name.replace(/\.[^.]+$/, '');
      _impMostrarPreview(titulo, texto);
    };
    reader.onerror = function() {
      _impMostrarLoading(false);
      toast('Erro ao ler o arquivo.', 'error');
    };
    reader.readAsText(file, 'UTF-8');
  }

  function _impExtrairPDF(file) {
    _impMostrarLoading(true);
    if (window.pdfjsLib) { _impPDFExtrairTexto(file); return; }
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = function() {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      _impPDFExtrairTexto(file);
    };
    script.onerror = function() {
      _impMostrarLoading(false);
      toast('Falha ao carregar leitor de PDF.', 'error');
    };
    document.head.appendChild(script);
  }

  function _impPDFExtrairTexto(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      window.pdfjsLib.getDocument({ data: e.target.result }).promise
        .then(function(pdf) {
          var promises = [];
          for (var i = 1; i <= pdf.numPages; i++) {
            promises.push(pdf.getPage(i).then(function(page) {
              return page.getTextContent().then(function(tc) {
                return tc.items.map(function(it) { return it.str; }).join(' ');
              });
            }));
          }
          return Promise.all(promises);
        })
        .then(function(textos) {
          _impMostrarPreview(file.name.replace(/\.pdf$/i,''), textos.join('\n\n'));
        })
        .catch(function() {
          _impMostrarLoading(false);
          toast('Não foi possível ler o PDF. Tente exportar como TXT.', 'error');
        });
    };
    reader.readAsArrayBuffer(file);
  }

  function _impExtrairDOCX(file) {
    _impMostrarLoading(true);
    if (window.mammoth) { _impDOCXExtrair(file); return; }
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
    script.onload = function() { _impDOCXExtrair(file); };
    script.onerror = function() {
      _impMostrarLoading(false);
      toast('Falha ao carregar leitor de DOCX.', 'error');
    };
    document.head.appendChild(script);
  }

  function _impDOCXExtrair(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      window.mammoth.extractRawText({ arrayBuffer: e.target.result })
        .then(function(result) {
          _impMostrarPreview(file.name.replace(/\.docx$/i,''), result.value || '');
        })
        .catch(function() {
          _impMostrarLoading(false);
          toast('Erro ao extrair texto do DOCX.', 'error');
        });
    };
    reader.readAsArrayBuffer(file);
  }

  // ── Imagem (OCR via Sonnet) ───────────────────────────────────

  function importarProcessarImagem(input) {
    var file = input && input.files && input.files[0];
    if (!file) return;
    _impProcessarImagemFile(file);
  }
  window.importarProcessarImagem = importarProcessarImagem;

  function _impProcessarImagemFile(file) {
    var tiposOk = ['image/jpeg','image/jpg','image/png','image/gif','image/webp'];
    if (!tiposOk.includes(file.type.toLowerCase())) {
      toast('Use JPG, PNG ou WebP.', 'error'); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Imagem muito grande (máx 5MB).', 'error'); return;
    }
    _impMostrarLoading(true);
    var reader = new FileReader();
    reader.onload = function(e) {
      var dataUrl = e.target.result;
      var base64 = dataUrl.split(',')[1];
      fetch('/api/extrair-imagem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: base64, mimeType: file.type })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.error) { _impMostrarLoading(false); toast('Erro: ' + data.error, 'error'); return; }
        _impMostrarPreview(data.titulo || 'Imagem importada', data.conteudo || '');
      })
      .catch(function() {
        _impMostrarLoading(false);
        toast('Falha ao conectar ao servidor.', 'error');
      });
    };
    reader.onerror = function() { _impMostrarLoading(false); toast('Erro ao ler a imagem.', 'error'); };
    reader.readAsDataURL(file);
  }

  // ── CSV ───────────────────────────────────────────────────────

  function importarProcessarCSV(input) {
    var file = input && input.files && input.files[0];
    if (!file) return;
    _impProcessarCSVFile(file);
  }
  window.importarProcessarCSV = importarProcessarCSV;

  function _impProcessarCSVFile(file) {
    _impMostrarLoading(true);
    var reader = new FileReader();
    reader.onload = function(e) {
      _impMostrarLoading(false);
      _impTabAtiva = 'csv';
      _impMostrarCSVPreview(e.target.result || '', file.name);
    };
    reader.onerror = function() { _impMostrarLoading(false); toast('Erro ao ler o CSV.', 'error'); };
    reader.readAsText(file, 'UTF-8');
  }

  function _impDetectarColuna(headers, candidatos) {
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i].toLowerCase().trim();
      for (var j = 0; j < candidatos.length; j++) {
        if (h.indexOf(candidatos[j].toLowerCase()) !== -1) return i;
      }
    }
    return -1;
  }

  function _impNormalizarData(str) {
    if (!str) return new Date().toISOString().slice(0,10);
    var m1 = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m1) return m1[3] + '-' + m1[2] + '-' + m1[1];
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0,10);
    var m2 = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (m2) return m2[3] + '-' + m2[2] + '-' + m2[1];
    return new Date().toISOString().slice(0,10);
  }

  function _impMostrarCSVPreview(csvText, nomeArquivo) {
    var sep = csvText.indexOf(';') !== -1 ? ';' : ',';
    var linhas = csvText.split(/\r?\n/).filter(function(l) { return l.trim(); });
    if (linhas.length < 2) { toast('CSV vazio ou sem dados.', 'error'); return; }
    var headers = linhas[0].split(sep).map(function(h) { return h.replace(/^"|"$/g,'').trim(); });

    var iData  = _impDetectarColuna(headers, ['data','date','dt']);
    var iDesc  = _impDetectarColuna(headers, ['descricao','descrição','desc','historico','histórico','memo','lançamento','lancamento','nome','name']);
    var iValor = _impDetectarColuna(headers, ['valor','value','amount','quantia','montante','debito','débito','credito','crédito']);
    var iTipo  = _impDetectarColuna(headers, ['tipo','type','natureza','categoria','category']);
    if (iValor === -1) iValor = headers.length - 1;
    if (iDesc === -1) iDesc = iValor > 0 ? 1 : 0;
    if (iData === -1) iData = 0;

    var transacoes = [];
    for (var i = 1; i < Math.min(linhas.length, 201); i++) {
      var cols = linhas[i].split(sep).map(function(c) { return c.replace(/^"|"$/g,'').trim(); });
      if (cols.length < 2) continue;
      var vBruto = (cols[iValor] || '0').replace(/[R$\s.]/g,'').replace(',','.');
      var valor = parseFloat(vBruto) || 0;
      if (valor === 0) continue;
      var tipo = 'despesa';
      if (iTipo !== -1) {
        var t = (cols[iTipo] || '').toLowerCase();
        if (t.indexOf('cred') !== -1 || t.indexOf('receit') !== -1 || t.indexOf('entrad') !== -1) tipo = 'receita';
      } else if (valor > 0) {
        tipo = 'receita';
      }
      transacoes.push({
        data: _impNormalizarData(cols[iData] || ''),
        descricao: cols[iDesc] || 'Transação',
        valor: Math.abs(valor),
        tipo: tipo
      });
    }

    _impCSVTransacoes = transacoes;
    _impCSVTitulo = (nomeArquivo || 'CSV').replace(/\.csv$/i,'');

    var tbody = '';
    transacoes.slice(0, 50).forEach(function(t) {
      var cor = t.tipo === 'receita' ? '#2DA96C' : '#E87A7A';
      tbody += '<tr>' +
        '<td>' + t.data + '</td>' +
        '<td>' + (t.descricao.length > 40 ? t.descricao.slice(0,40) + '…' : t.descricao) + '</td>' +
        '<td style="text-align:right;color:' + cor + '">R$ ' + t.valor.toFixed(2).replace('.',',') + '</td>' +
        '<td style="color:' + cor + '">' + t.tipo + '</td>' +
        '</tr>';
    });

    var countEl = document.getElementById('imp-csv-count');
    if (countEl) countEl.textContent = transacoes.length + ' transações detectadas' + (transacoes.length > 50 ? ' (mostrando 50)' : '');
    var tbodyEl = document.getElementById('imp-csv-tbody');
    if (tbodyEl) tbodyEl.innerHTML = tbody;

    _impSetStep(2);
  }

  function importarConfirmarCSV() {
    if (!_impCSVTransacoes || !_impCSVTransacoes.length) {
      toast('Nenhuma transação para importar.', 'error'); return;
    }
    var receitas = [];
    var despesas = [];
    try { receitas = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]'); } catch(e) {}
    try { despesas = JSON.parse(localStorage.getItem(oneU('despesas')) || '[]'); } catch(e) {}

    _impCSVTransacoes.forEach(function(t) {
      var item = {
        id: Date.now().toString() + Math.random().toString(36).slice(2,6),
        descricao: t.descricao,
        valor: t.valor,
        data: t.data,
        categoria: 'csv',
        fonte: _impCSVTitulo
      };
      if (t.tipo === 'receita') receitas.push(item);
      else despesas.push(item);
    });

    localStorage.setItem(oneU('receitas'), JSON.stringify(receitas));
    localStorage.setItem(oneU('despesas'), JSON.stringify(despesas));

    toast('✓ ' + _impCSVTransacoes.length + ' transações importadas!');
    importarFechar();
    if (typeof renderOneFinanceiro === 'function') renderOneFinanceiro();
    if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
  }
  window.importarConfirmarCSV = importarConfirmarCSV;

  // Fechar ao clicar fora do box
  document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'modal-importar') importarFechar();
  });

  /* ── Fim IMPORTAR ─────────────────────────────────────────── */

  function activateOne() {
    oneInitDemo();
    var so = document.getElementById('screen-one');
    if (!so) return;
    /* Ativa sempre — screen-one é o app principal */
    document.querySelectorAll('.screen.active').forEach(function(s){ s.classList.remove('active'); });
    so.classList.add('active');
    renderOneGreeting();
    renderOneAgenda();
    renderOneFinanceiro();
    if (typeof renderOneTarefasMobile === 'function') renderOneTarefasMobile();
    renderOneDesktop();
  }
  // Multi-tenant: exposto pra ser re-chamado após login (esconderTelaAuth)
  window.activateOne = activateOne;

  /* Fechar modal clicando no overlay */
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('one-modal-overlay')) {
      e.target.classList.remove('open');
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', activateOne);
  } else {
    activateOne();
  }
})();


/* ════════════════════════════════════════════════════════════════
   ONBOARDING — Primeira vez do usuário (Pinah se apresenta)
   ════════════════════════════════════════════════════════════════ */
(function() {
  var onbState = null;

  var PERGUNTAS = [
    {
      campo: 'nome_chamada',
      texto: 'Pra começar — como você gostaria que eu te chamasse? (pode ser primeiro nome, apelido, do jeito que você preferir)'
    },
    {
      campo: 'profissao',
      texto: 'Beleza! E qual sua profissão ou área principal de trabalho?'
    },
    {
      campo: 'contexto',
      texto: 'Me conta um pouco mais sobre seu dia a dia — tipos de cliente/paciente que você atende, áreas que você trabalha, projetos importantes. Quanto mais detalhes, melhor eu te ajudo.'
    },
    {
      campo: 'tom',
      texto: 'Última: você prefere que eu fale com você de um jeito mais formal ou mais informal?'
    }
  ];

  function oneOnboardingStart() {
    onbState = { fase: 'welcome', perguntaIdx: 0, respostas: {} };
    var ov = document.getElementById('pinah-onb-overlay');
    if (ov) ov.hidden = false;
    // Garante que só a welcome fica visível
    document.querySelectorAll('.pinah-onb-fase').forEach(function(el){
      el.hidden = el.getAttribute('data-fase') !== 'welcome';
    });
  }

  function oneOnboardingProximaFase(fase) {
    if (!onbState) return;
    onbState.fase = fase;
    document.querySelectorAll('.pinah-onb-fase').forEach(function(el){
      el.hidden = el.getAttribute('data-fase') !== fase;
    });
    if (fase === 'chat') {
      var msgs = document.getElementById('pinah-onb-msgs');
      if (msgs) msgs.innerHTML = '';
      onbState.perguntaIdx = 0;
      // Pinah cumprimenta + primeira pergunta
      setTimeout(function(){
        oneOnboardingAddBubble('pinah', 'Antes de te liberar o app, queria te conhecer um pouco. Vai ser rapidinho — 4 perguntas.');
        setTimeout(function(){
          oneOnboardingAddBubble('pinah', PERGUNTAS[0].texto);
          var inp = document.getElementById('pinah-onb-input');
          if (inp) inp.focus();
        }, 700);
      }, 350);
    }
  }

  function oneOnboardingAddBubble(tipo, texto) {
    var msgs = document.getElementById('pinah-onb-msgs');
    if (!msgs) return;
    var b = document.createElement('div');
    b.className = 'pinah-onb-bubble ' + tipo;
    b.textContent = texto;
    msgs.appendChild(b);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function oneOnboardingResponder() {
    var inp = document.getElementById('pinah-onb-input');
    if (!inp || !onbState) return;
    var texto = (inp.value || '').trim();
    if (!texto) return;
    var idx = onbState.perguntaIdx;
    var pergunta = PERGUNTAS[idx];
    if (!pergunta) return;
    // Mostra resposta do user
    oneOnboardingAddBubble('user', texto);
    inp.value = '';
    // Salva
    onbState.respostas[pergunta.campo] = texto;
    onbState.perguntaIdx++;
    // Próxima pergunta ou fim
    var proxIdx = onbState.perguntaIdx;
    if (proxIdx < PERGUNTAS.length) {
      setTimeout(function(){
        oneOnboardingAddBubble('pinah', PERGUNTAS[proxIdx].texto);
        inp.focus();
      }, 600);
    } else {
      // Acabaram as perguntas — Pinah agradece e leva pro tour
      setTimeout(function(){
        var primeiroNome = String(onbState.respostas.nome_chamada || 'você').split(' ')[0];
        oneOnboardingAddBubble('pinah', 'Prazer em te conhecer, ' + primeiroNome + '! Agora vou te mostrar como o app funciona em 4 cards rápidos.');
        setTimeout(function(){ oneOnboardingProximaFase('tour'); }, 1400);
      }, 600);
    }
  }

  async function oneOnboardingFinalizar() {
    if (!onbState) return;
    // Monta a bio_pinah a partir das respostas
    var r = onbState.respostas;
    var bio =
      'Nome preferido: ' + (r.nome_chamada || '(não informado)') + '\n' +
      'Profissão: ' + (r.profissao || '(não informado)') + '\n' +
      'Dia a dia / contexto: ' + (r.contexto || '(não informado)') + '\n' +
      'Tom preferido: ' + (r.tom || '(não informado)');

    // Preserva bio_pinah pré-injetada manualmente no Supabase (ex: Lê em 16/05/2026).
    // Se a row do usuário já tem bio com conteúdo, o onboarding NÃO sobrescreve —
    // ele só marca onboarded:true pra não disparar de novo na próxima sessão.
    // As respostas do usuário ficam só na experiência da tela (não persistem).
    var bioJaExiste = !!(window.authProfile
      && window.authProfile.bio_pinah
      && String(window.authProfile.bio_pinah).trim().length > 0);

    // Tenta salvar no Supabase
    if (window.supa && window.authUser && window.authUser.id) {
      try {
        var payload = bioJaExiste
          ? { onboarded: true }
          : { onboarded: true, bio_pinah: bio };
        var res = await window.supa
          .from('profiles')
          .update(payload)
          .eq('id', window.authUser.id);
        if (res.error) {
          console.error('[onboarding] erro ao salvar profile:', res.error);
          if (typeof toast === 'function') {
            toast('Erro ao salvar suas respostas. Tente recarregar.', 'error');
          }
          return;
        }
        // Atualiza o perfil local
        if (window.authProfile) {
          window.authProfile.onboarded = true;
          if (!bioJaExiste) window.authProfile.bio_pinah = bio;
        }
        if (bioJaExiste) {
          console.log('[onboarding] bio_pinah preexistente detectada — respostas do onboarding NÃO foram salvas, bio rica preservada.');
        }
      } catch (e) {
        console.error('[onboarding] exceção ao salvar:', e);
      }
    }
    // Fecha overlay e libera o app
    var ov = document.getElementById('pinah-onb-overlay');
    if (ov) ov.hidden = true;
    onbState = null;
    // Dispara o boot pós-auth (mesmo fluxo do esconderTelaAuth normal)
    if (typeof window.activateOne === 'function') window.activateOne();
    if (typeof renderOneAgendaPainel === 'function') renderOneAgendaPainel();
    if (typeof renderOneTarefasPainel === 'function') renderOneTarefasPainel();
    if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
    if (typeof go === 'function') go('one');
  }

  // Expõe globalmente pra HTML chamar via onclick + pra esconderTelaAuth disparar
  window.oneOnboardingStart        = oneOnboardingStart;
  window.oneOnboardingProximaFase  = oneOnboardingProximaFase;
  window.oneOnboardingResponder    = oneOnboardingResponder;
  window.oneOnboardingFinalizar    = oneOnboardingFinalizar;
})();

/* ════════════════════════════════════════════════════════════════
   SYNC UNIVERSAL — botão flutuante (período de testes)
   ════════════════════════════════════════════════════════════════
   Wrapper de supaResync que adiciona feedback visual (ícone girando)
   no botão #btn-sync-global durante a operação.
*/
async function syncGlobal() {
  var btn = document.getElementById('btn-sync-global');
  if (btn) btn.classList.add('syncing');
  try {
    if (typeof supaResync === 'function') {
      await supaResync();
    } else if (typeof supaSync === 'function') {
      await supaSync();
    }
  } catch (e) {
    console.warn('[syncGlobal] erro:', e);
  } finally {
    if (btn) btn.classList.remove('syncing');
  }
}
window.syncGlobal = syncGlobal;

/* ════════════════════════════════════════════════════════════════
   PENDÊNCIAS E ALERTAS — 3 cards no topo do painel Financeiro
   ════════════════════════════════════════════════════════════════ */
window.oneFinFiltroAtivo = window.oneFinFiltroAtivo || null; // null | 'pendentes' | 'vencendo'

function _brlFin(v) { return 'R$ ' + (v||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}); }

function renderOnePendenciasAlertas() {
  /* Usa o mesmo cálculo do Acompanhamento do mês (Resumo) — receitas com
     aPagar>0 (futuras) e despesas+faturas com aPagar>0 (pendentes). Assim
     os cards batem com o hero ↓ Despesas e com o que aparece no Resumo. */
  var hojeD = new Date();
  var mes = (typeof window.oneFinMesAtivo === 'number') ? window.oneFinMesAtivo : hojeD.getMonth();
  var ano = (typeof window.oneFinAnoAtivo === 'number') ? window.oneFinAnoAtivo : hojeD.getFullYear();

  var recCnt = 0, recVal = 0, despCnt = 0, despVal = 0;
  if (typeof _oneFinResumoColetarObrigacoes === 'function') {
    var obrig = _oneFinResumoColetarObrigacoes(mes, ano);
    /* Receitas futuras: tudo com aPagar > 0 (esperado - recebido) */
    obrig.receitasFixas.forEach(function(it){
      if ((it.aPagar||0) > 0) { recCnt++; recVal += (it.aPagar||0); }
    });
    /* Despesas pendentes: despesas reais + fixas (sem cartão) + faturas abertas */
    obrig.despesas.forEach(function(it){
      if ((it.aPagar||0) > 0) { despCnt++; despVal += (it.aPagar||0); }
    });
    obrig.faturas.forEach(function(it){
      if ((it.aPagar||0) > 0) { despCnt++; despVal += (it.aPagar||0); }
    });
  }

  var setText = function(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
  setText('one-pn-num-receitas', recCnt);
  setText('one-pn-val-receitas', _brlFin(recVal));
  setText('one-pn-num-despesas', despCnt);
  setText('one-pn-val-despesas', _brlFin(despVal));
}
window.renderOnePendenciasAlertas = renderOnePendenciasAlertas;

/* Cards Pendentes/Vencendo viram atalhos diretos pro Extrato (sem filtro
   por coluna). Antes zeravam a coluna oposta, o que passava info errada
   (parecia que não havia despesas no mês). Agora pulam pra Extrato e mostram
   as 2 colunas completas, igual ao pill Extrato. */
function oneFinFiltrarPendentes() {
  window.oneFinFiltroAtivo = null;
  oneFinSetVista('extrato');
  oneFinAtualizarChipFiltro(null);
  if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
}
function oneFinFiltrarVencendo() {
  window.oneFinFiltroAtivo = null;
  oneFinSetVista('extrato');
  oneFinAtualizarChipFiltro(null);
  if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
}
function oneFinLimparFiltro() {
  window.oneFinFiltroAtivo = null;
  oneFinAtualizarChipFiltro(null);
  if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
}
function oneFinAtualizarChipFiltro(label) {
  var wrap = document.getElementById('one-fin-filtros-ativos');
  var chip = document.getElementById('one-fin-filtro-chip');
  if (!wrap) return;
  if (label) {
    wrap.hidden = false;
    if (chip) chip.textContent = '🔍 ' + label;
  } else {
    wrap.hidden = true;
  }
}
window.oneFinFiltrarPendentes = oneFinFiltrarPendentes;
window.oneFinFiltrarVencendo = oneFinFiltrarVencendo;
window.oneFinLimparFiltro = oneFinLimparFiltro;
window.oneFinAtualizarChipFiltro = oneFinAtualizarChipFiltro;

/* ════════════════════════════════════════════════════════════════
   RELATÓRIOS — modal full-screen com gráfico donut + balanço
   ════════════════════════════════════════════════════════════════ */
window.oneRelState = window.oneRelState || {
  mes: new Date().getMonth(),
  ano: new Date().getFullYear(),
  aba: 'categorias',
  tipo: 'despesas',
  charts: { donut: null, bars: null }
};

function oneRelAbrir() {
  var m = document.getElementById('one-rel-modal');
  if (m) m.hidden = false;
  // Reseta pra mês atual ao abrir
  var hoje = new Date();
  window.oneRelState.mes = hoje.getMonth();
  window.oneRelState.ano = hoje.getFullYear();
  window.oneRelState.aba = 'categorias';
  window.oneRelState.tipo = 'despesas';
  // Reset visual de tabs
  document.querySelectorAll('.one-rel-tab').forEach(function(t){
    t.classList.toggle('active', t.getAttribute('data-aba') === 'categorias');
  });
  document.querySelectorAll('.one-rel-aba').forEach(function(a){
    a.hidden = a.getAttribute('data-aba') !== 'categorias';
  });
  document.querySelectorAll('.one-rel-toggle-btn').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-tipo') === 'despesas');
  });
  oneRelAtualizarLabelMes();
  // Esperar Chart.js carregar (defer no script)
  if (typeof Chart === 'undefined') {
    setTimeout(oneRelRender, 200);
  } else {
    oneRelRender();
  }
}
window.oneRelAbrir = oneRelAbrir;

function oneRelFechar() {
  var m = document.getElementById('one-rel-modal');
  if (m) m.hidden = true;
  // Destrói charts pra liberar canvas
  if (window.oneRelState.charts.donut) {
    window.oneRelState.charts.donut.destroy();
    window.oneRelState.charts.donut = null;
  }
  if (window.oneRelState.charts.bars) {
    window.oneRelState.charts.bars.destroy();
    window.oneRelState.charts.bars = null;
  }
}
window.oneRelFechar = oneRelFechar;

function oneRelMudaMes(delta) {
  var s = window.oneRelState;
  s.mes += delta;
  if (s.mes < 0) { s.mes = 11; s.ano--; }
  if (s.mes > 11) { s.mes = 0; s.ano++; }
  oneRelAtualizarLabelMes();
  oneRelRender();
}
window.oneRelMudaMes = oneRelMudaMes;

function oneRelAtualizarLabelMes() {
  var meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var s = window.oneRelState;
  var lbl = document.getElementById('one-rel-month-label');
  if (lbl) lbl.textContent = meses[s.mes] + ' ' + s.ano;
}

function oneRelSetAba(aba) {
  window.oneRelState.aba = aba;
  document.querySelectorAll('.one-rel-tab').forEach(function(t){
    t.classList.toggle('active', t.getAttribute('data-aba') === aba);
  });
  document.querySelectorAll('.one-rel-aba').forEach(function(a){
    a.hidden = a.getAttribute('data-aba') !== aba;
  });
  oneRelRender();
}
window.oneRelSetAba = oneRelSetAba;

function oneRelSetTipo(tipo) {
  window.oneRelState.tipo = tipo;
  document.querySelectorAll('.one-rel-toggle-btn').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-tipo') === tipo);
  });
  // Atualiza título do card
  var titEl = document.querySelector('.one-rel-aba[data-aba="categorias"] .one-rel-card-title');
  if (titEl) titEl.textContent = (tipo === 'receitas' ? 'Receitas' : 'Despesas') + ' por categoria';
  oneRelRender();
}
window.oneRelSetTipo = oneRelSetTipo;

/* Render principal — decide qual aba renderizar */
function oneRelRender() {
  var s = window.oneRelState;
  if (s.aba === 'categorias') oneRelRenderCategorias();
  if (s.aba === 'balanco')    oneRelRenderBalanco();
}

/* Helper — paleta de cores do donut (10 cores) */
var ONE_REL_PALETA = ['#7FA88E','#D4A655','#9B72B0','#5B7CFA','#FF8B5A','#27856A','#E67BB0','#7B5CF0','#C0392B','#B8860B'];

function _brl(v) { return 'R$ ' + (v||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}); }

/* ── Aba Categorias — donut + lista ── */
function oneRelRenderCategorias() {
  var s = window.oneRelState;
  var dados = (s.tipo === 'receitas')
    ? (JSON.parse(localStorage.getItem(oneU('receitas')) || '[]'))
    : (JSON.parse(localStorage.getItem(oneU('despesas')) || '[]'));

  // Filtra por mês/ano do state
  var doMes = dados.filter(function(it){
    if (!it.data) return false;
    var d = new Date(it.data + 'T00:00:00');
    return d.getMonth() === s.mes && d.getFullYear() === s.ano;
  });

  // Agrupa por categoria
  var grupos = {};
  doMes.forEach(function(it){
    var cat = it.categoria || it.tipo || 'Outros';
    if (!grupos[cat]) grupos[cat] = { total: 0, itens: 0 };
    grupos[cat].total += Number(it.valor) || 0;
    grupos[cat].itens++;
  });
  var entries = Object.entries(grupos)
    .map(function(e){ return { categoria: e[0], total: e[1].total, itens: e[1].itens }; })
    .sort(function(a,b){ return b.total - a.total; });
  var totalGeral = entries.reduce(function(s,e){ return s + e.total; }, 0);

  // Atualiza total no centro do donut
  var elTotal = document.getElementById('one-rel-chart-total');
  if (elTotal) elTotal.textContent = _brl(totalGeral);

  // Lista de categorias
  var listEl = document.getElementById('one-rel-cat-list');
  if (listEl) {
    if (!entries.length) {
      listEl.innerHTML = '<p style="text-align:center;color:#9CAB9C;font-size:13px;padding:20px 0;font-style:italic;font-family:Playfair Display,Georgia,serif">Sem lançamentos neste mês</p>';
    } else {
      listEl.innerHTML = entries.map(function(e, i){
        var cat = oneFinCatIcon(e.categoria);
        var pct = totalGeral > 0 ? Math.round((e.total / totalGeral) * 100) : 0;
        return '<div class="one-rel-cat-row">' +
                 '<div class="one-rel-cat-dot" style="background:' + cat.bg + ';color:' + cat.cor + '">' + cat.emoji + '</div>' +
                 '<div class="one-rel-cat-nome">' + e.categoria.replace(/</g,'&lt;') + '</div>' +
                 '<div class="one-rel-cat-val">' + _brl(e.total) + '</div>' +
                 '<div class="one-rel-cat-pct" style="background:' + ONE_REL_PALETA[i % ONE_REL_PALETA.length] + '">' + pct + '%</div>' +
               '</div>';
      }).join('');
    }
  }

  // Donut chart
  var canvas = document.getElementById('one-rel-donut');
  if (!canvas || typeof Chart === 'undefined') return;
  if (window.oneRelState.charts.donut) window.oneRelState.charts.donut.destroy();
  if (!entries.length) {
    window.oneRelState.charts.donut = null;
    return;
  }
  window.oneRelState.charts.donut = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: entries.map(function(e){ return e.categoria; }),
      datasets: [{
        data: entries.map(function(e){ return e.total; }),
        backgroundColor: entries.map(function(_, i){ return ONE_REL_PALETA[i % ONE_REL_PALETA.length]; }),
        borderColor: '#fff',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx) { return ctx.label + ': ' + _brl(ctx.parsed); }
          }
        }
      },
      animation: { duration: 600 }
    }
  });
}
window.oneRelRenderCategorias = oneRelRenderCategorias;

/* ── Aba Balanço — barras receitas vs despesas dos últimos 6 meses ── */
function oneRelRenderBalanco() {
  var canvas = document.getElementById('one-rel-bars');
  if (!canvas || typeof Chart === 'undefined') return;

  var s = window.oneRelState;
  var receitas = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]');
  var despesas = JSON.parse(localStorage.getItem(oneU('despesas')) || '[]');

  // Últimos 6 meses a partir do mês selecionado
  var meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  var labels = [], rData = [], dData = [];
  for (var i = 5; i >= 0; i--) {
    var m = s.mes - i, a = s.ano;
    while (m < 0) { m += 12; a--; }
    labels.push(meses[m] + '/' + String(a).slice(2));
    var rTot = receitas
      .filter(function(r){ if (!r.data) return false; var d = new Date(r.data+'T00:00:00'); return d.getMonth()===m && d.getFullYear()===a && r.status !== 'pendente'; })
      .reduce(function(s,r){ return s + (Number(r.valor)||0); }, 0);
    var dTot = despesas
      .filter(function(d){ if (!d.data) return false; var dt = new Date(d.data+'T00:00:00'); return dt.getMonth()===m && dt.getFullYear()===a; })
      .reduce(function(s,d){ return s + (Number(d.valor)||0); }, 0);
    rData.push(rTot);
    dData.push(dTot);
  }

  if (window.oneRelState.charts.bars) window.oneRelState.charts.bars.destroy();
  window.oneRelState.charts.bars = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Receitas', data: rData, backgroundColor: '#7FA88E', borderRadius: 6 },
        { label: 'Despesas', data: dData, backgroundColor: '#E07A6B', borderRadius: 6 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, color: '#6B7F6F', usePointStyle: true } },
        tooltip: { callbacks: { label: function(ctx){ return ctx.dataset.label + ': ' + _brl(ctx.parsed.y); } } }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { font: { size: 10 }, color: '#6B7F6F', callback: function(v){ return 'R$ ' + (v/1000).toFixed(0) + 'k'; } },
          grid: { color: 'rgba(127,168,142,0.10)' }
        },
        x: {
          ticks: { font: { size: 11 }, color: '#6B7F6F' },
          grid: { display: false }
        }
      },
      animation: { duration: 600 }
    }
  });
}
window.oneRelRenderBalanco = oneRelRenderBalanco;

/* ════════════════════════════════════════════════════════════════
   MODAL NOVO/EDITAR LANÇAMENTO — substitui o form inline do painel financeiro
   ════════════════════════════════════════════════════════════════ */
window.oneFinModalTipo        = window.oneFinModalTipo        || 'receita';
window.oneFinModalRecorrencia = window.oneFinModalRecorrencia || 'esporadica';

var ONE_FIN_CATEGORIAS_DEFAULT = {
  receita: ['Atendimento', 'Consulta', 'Avaliação', 'Salário', 'Recebimento', 'Outros'],
  despesa: ['Aluguel', 'Material', 'Transporte', 'Alimentação', 'Impostos', 'Eletrônicos', 'Serviços', 'Outros']
};

function oneFinGetCategorias(tipo) {
  var chave = 'categorias_' + tipo;
  var raw = localStorage.getItem(oneU(chave));
  if (!raw) {
    var def = (ONE_FIN_CATEGORIAS_DEFAULT[tipo] || []).slice();
    localStorage.setItem(oneU(chave), JSON.stringify(def));
    return def;
  }
  try { return JSON.parse(raw) || []; } catch(e) { return []; }
}
window.oneFinGetCategorias = oneFinGetCategorias;

function oneFinAddCategoria(tipo, nome) {
  nome = String(nome || '').trim();
  if (!nome) return false;
  var lista = oneFinGetCategorias(tipo);
  if (lista.indexOf(nome) !== -1) return false;
  lista.push(nome);
  localStorage.setItem(oneU('categorias_' + tipo), JSON.stringify(lista));
  return true;
}
window.oneFinAddCategoria = oneFinAddCategoria;

/* ════════════════════════════════════════════════════════════════
   CONTAS — banco e cartão de crédito (Sessão A reforma financeiro)
   ════════════════════════════════════════════════════════════════ */

var ONE_FIN_CONTA_ICONES = [
  '🏦','💳','💰','🪙','💵','📊','🐷','🏛️','📈','🎯','⭐','🛡️',
  '🟢','🔵','🟠','🟣','🟡','🔴','⚪','⚫'
];
var ONE_FIN_CONTA_CORES = [
  '#7FA88E', '#5B7CFA', '#E07A6B', '#D4A655',
  '#9B72B0', '#27856A', '#C0392B', '#E67BB0',
  '#7B5CF0', '#FF8B5A', '#B8860B', '#6B7F6F'
];

function oneFinGetContas() {
  var raw = localStorage.getItem(oneU('contas'));
  if (!raw) return [];
  try { return JSON.parse(raw) || []; } catch(e) { return []; }
}
window.oneFinGetContas = oneFinGetContas;

function oneFinGetConta(id) {
  return oneFinGetContas().find(function(c){ return String(c.id) === String(id); }) || null;
}
window.oneFinGetConta = oneFinGetConta;

function _oneFinSaveContas(lista) {
  localStorage.setItem(oneU('contas'), JSON.stringify(lista));
}

function _oneFinNormalizaTipoConta(t) {
  if (t === 'cartao' || t === 'investimento') return t;
  return 'banco';
}
/* Garante que dia (fechamento ou vencimento de cartão) caia em 1-31 */
function _oneFinClampDia(v, fallback) {
  var n = parseInt(v, 10);
  if (!n || isNaN(n)) return fallback || 1;
  if (n < 1) return 1;
  if (n > 31) return 31;
  return n;
}
function _oneFinIconeDefaultPorTipo(t) {
  if (t === 'cartao') return '💳';
  if (t === 'investimento') return '📈';
  return '🏦';
}

function oneFinAddConta(obj) {
  var lista = oneFinGetContas();
  var uid = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : Date.now().toString() + Math.random().toString(36).slice(2,8);
  var tipo = _oneFinNormalizaTipoConta(obj.tipo);
  var conta = {
    id: uid,
    nome: String(obj.nome || '').trim(),
    tipo: tipo,
    icone: obj.icone || _oneFinIconeDefaultPorTipo(tipo),
    cor: obj.cor || ONE_FIN_CONTA_CORES[0],
    diaFechamento: (tipo === 'cartao') ? _oneFinClampDia(obj.diaFechamento, 1)  : null,
    diaVencimento: (tipo === 'cartao') ? _oneFinClampDia(obj.diaVencimento, 10) : null,
    saldoInicial: (tipo === 'banco') ? (Number(obj.saldoInicial) || 0) : null,
    saldo:        (tipo === 'investimento') ? (Number(obj.saldo) || 0) : null,
    criado: new Date().toISOString()
  };
  lista.push(conta);
  _oneFinSaveContas(lista);
  if (typeof supaUpsert === 'function') supaUpsert('contas', conta);
  return conta;
}
window.oneFinAddConta = oneFinAddConta;

function oneFinUpdateConta(id, obj) {
  var lista = oneFinGetContas();
  var idx = lista.findIndex(function(c){ return String(c.id) === String(id); });
  if (idx < 0) return null;
  var atual = lista[idx];
  if (obj.nome != null)  atual.nome  = String(obj.nome).trim();
  if (obj.tipo)          atual.tipo  = _oneFinNormalizaTipoConta(obj.tipo);
  if (obj.icone)         atual.icone = obj.icone;
  if (obj.cor)           atual.cor   = obj.cor;
  if (atual.tipo === 'cartao') {
    if (obj.diaFechamento != null) atual.diaFechamento = _oneFinClampDia(obj.diaFechamento, atual.diaFechamento || 1);
    if (obj.diaVencimento != null) atual.diaVencimento = _oneFinClampDia(obj.diaVencimento, atual.diaVencimento || 10);
    /* Migração defensiva: se algum dia gravado for inválido, corrige na hora */
    atual.diaFechamento = _oneFinClampDia(atual.diaFechamento, 1);
    atual.diaVencimento = _oneFinClampDia(atual.diaVencimento, 10);
    atual.saldoInicial = null;
    atual.saldo = null;
  } else if (atual.tipo === 'investimento') {
    atual.diaFechamento = null;
    atual.diaVencimento = null;
    atual.saldoInicial = null;
    if (obj.saldo != null) atual.saldo = Number(obj.saldo) || 0;
  } else {
    /* banco */
    atual.diaFechamento = null;
    atual.diaVencimento = null;
    atual.saldo = null;
    if (obj.saldoInicial != null) atual.saldoInicial = Number(obj.saldoInicial) || 0;
  }
  _oneFinSaveContas(lista);
  if (typeof supaUpsert === 'function') supaUpsert('contas', atual);
  return atual;
}
window.oneFinUpdateConta = oneFinUpdateConta;

function oneFinDeleteConta(id) {
  var lista = oneFinGetContas();
  var idx = lista.findIndex(function(c){ return String(c.id) === String(id); });
  if (idx < 0) return false;
  lista.splice(idx, 1);
  _oneFinSaveContas(lista);
  if (typeof supaDelete === 'function') supaDelete('contas', id);
  return true;
}
window.oneFinDeleteConta = oneFinDeleteConta;

/* Dada uma data de lançamento e o dia de fechamento da conta-cartão,
   retorna 'YYYY-MM' da fatura que vai receber esse lançamento.
   Regra: se o dia do lançamento é <= dia de fechamento, cai na fatura do MESMO mês.
   Se é > dia de fechamento, cai na fatura do MÊS SEGUINTE. */
function oneFinCalcularFatura(dataLancamento, diaFechamento) {
  if (!dataLancamento || !diaFechamento) return null;
  var d = (dataLancamento instanceof Date) ? dataLancamento : new Date(dataLancamento + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  var ano = d.getFullYear();
  var mes = d.getMonth();
  var dia = d.getDate();
  if (dia > diaFechamento) {
    mes++;
    if (mes > 11) { mes = 0; ano++; }
  }
  var mm = String(mes + 1).padStart(2, '0');
  return ano + '-' + mm;
}
window.oneFinCalcularFatura = oneFinCalcularFatura;

/* Saldo do banco — saldoInicial + entradas confirmadas - saídas confirmadas.
   "Confirmado":
   - Lançamento real (receita/despesa) com status='pago'
   - Fixa com pagoPorMes[mesAno] > 0: abate/soma o valor pago daquele mês
   Despesas que vão pra fatura de cartão NÃO entram aqui (faturas são abatidas
   quando o user paga a fatura inteira). */
function oneFinSaldoBanco(contaId) {
  var conta = (typeof oneFinGetConta === 'function') ? oneFinGetConta(contaId) : null;
  if (!conta || conta.tipo !== 'banco') return 0;
  var saldo = Number(conta.saldoInicial) || 0;

  /* Entradas — receitas reais. Se tem valorPago, usa ele (suporta parcial).
     Senão, soma o valor cheio quando status=pago. */
  var receitas = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]');
  receitas.forEach(function(r){
    if (String(r.contaId) !== String(contaId)) return;
    if (typeof r.valorPago === 'number' && r.valorPago > 0) {
      saldo += r.valorPago;
    } else if (r.status === 'pago') {
      saldo += Number(r.valor) || 0;
    }
  });

  /* Entradas — receitas fixas com pagoPorMes */
  var receitasFixas = JSON.parse(localStorage.getItem(oneU('receitasFixas')) || '[]');
  receitasFixas.forEach(function(rf){
    if (String(rf.contaId) !== String(contaId)) return;
    var p = rf.pagoPorMes;
    if (p && typeof p === 'object') {
      Object.keys(p).forEach(function(m){ saldo += Number(p[m]) || 0; });
    }
  });

  /* Saídas — despesas reais (sem fatura). Mesma lógica: valorPago tem prioridade. */
  var despesas = JSON.parse(localStorage.getItem(oneU('despesas')) || '[]');
  despesas.forEach(function(d){
    if (String(d.contaId) !== String(contaId)) return;
    if (d.faturaMesAno) return;
    if (typeof d.valorPago === 'number' && d.valorPago > 0) {
      saldo -= d.valorPago;
    } else if (d.status === 'pago') {
      saldo -= Number(d.valor) || 0;
    }
  });

  /* Saídas — despesas fixas com pagoPorMes */
  var despesasFixas = JSON.parse(localStorage.getItem(oneU('despesasFixas')) || '[]');
  despesasFixas.forEach(function(df){
    if (String(df.contaId) !== String(contaId)) return;
    var p = df.pagoPorMes;
    if (p && typeof p === 'object') {
      Object.keys(p).forEach(function(m){ saldo -= Number(p[m]) || 0; });
    }
  });

  /* Saídas — pagamentos de fatura de cartão que apontaram para este banco.
     Quando Mentor paga fatura via modal, registra em
     conta.faturasPagasDetalhe[mesAno] = { contaId, valor, data }.
     Aqui descontamos do banco que pagou. */
  var todasContas = JSON.parse(localStorage.getItem(oneU('contas')) || '[]');
  todasContas.forEach(function(cc){
    if (cc.tipo !== 'cartao') return;
    var det = cc.faturasPagasDetalhe;
    if (!det || typeof det !== 'object') return;
    Object.keys(det).forEach(function(mesAno){
      var d = det[mesAno];
      if (d && String(d.contaId) === String(contaId)) {
        saldo -= Number(d.valor) || 0;
      }
    });
  });

  return saldo;
}
window.oneFinSaldoBanco = oneFinSaldoBanco;

/* Fatura aberta do cartão: total dos lançamentos cuja faturaMesAno é a próxima a fechar */
/* Total da fatura de um mês específico — usado pelo Resumo quando o usuário
   navega entre meses (≠ oneFinFaturaAberta, que sempre olha a próxima a fechar
   a partir de hoje e por isso vazava faturas futuras pra o mês anterior). */
function oneFinFaturaDoMes(contaId, mesAno) {
  var conta = oneFinGetConta(contaId);
  if (!conta || conta.tipo !== 'cartao' || !mesAno) return 0;
  var despesas = JSON.parse(localStorage.getItem(oneU('despesas')) || '[]');
  var totalReais = despesas.filter(function(d){
    return String(d.contaId) === String(contaId) && d.faturaMesAno === mesAno;
  }).reduce(function(s,d){ return s + (Number(d.valor)||0); }, 0);
  var totalFixas = 0;
  if (typeof oneFinInstanciasVizinhas === 'function') {
    var partes = mesAno.split('-');
    var anoF = parseInt(partes[0], 10);
    var mesF = parseInt(partes[1], 10) - 1;
    var inst = oneFinInstanciasVizinhas(mesF, anoF);
    totalFixas = inst.despesas.filter(function(d){
      return String(d.contaId) === String(contaId) && d.faturaMesAno === mesAno;
    }).reduce(function(s,d){ return s + (Number(d.valor)||0); }, 0);
  }
  return totalReais + totalFixas;
}
window.oneFinFaturaDoMes = oneFinFaturaDoMes;

function oneFinFaturaAberta(contaId) {
  var conta = oneFinGetConta(contaId);
  if (!conta || conta.tipo !== 'cartao') return 0;
  var hoje = new Date();
  var faturaAtual = oneFinCalcularFatura(hoje.toISOString().slice(0,10), conta.diaFechamento);
  var despesas = JSON.parse(localStorage.getItem(oneU('despesas')) || '[]');
  var totalReais = despesas.filter(function(d){
    return String(d.contaId) === String(contaId) && d.faturaMesAno === faturaAtual;
  }).reduce(function(s,d){ return s + (Number(d.valor)||0); }, 0);
  /* Soma instâncias virtuais de despesas fixas que caem nesta fatura.
     Olhar mês anterior + atual + próximo: uma fixa do mês X com cartão de
     fechamento antes do dia da fixa cai na fatura de X+1. */
  var totalFixas = 0;
  if (typeof oneFinInstanciasVizinhas === 'function' && faturaAtual) {
    var partes = faturaAtual.split('-');
    var anoF = parseInt(partes[0], 10);
    var mesF = parseInt(partes[1], 10) - 1;
    var inst = oneFinInstanciasVizinhas(mesF, anoF);
    totalFixas = inst.despesas.filter(function(d){
      return String(d.contaId) === String(contaId) && d.faturaMesAno === faturaAtual;
    }).reduce(function(s,d){ return s + (Number(d.valor)||0); }, 0);
  }
  return totalReais + totalFixas;
}
window.oneFinFaturaAberta = oneFinFaturaAberta;

/* ════════════════════════════════════════════════════════════════
   TELA INDIVIDUAL DA CONTA (Sessão C frente 2)
   ════════════════════════════════════════════════════════════════ */
window.oneFinContaAberta = null;
window.oneFinFaturaOffset = 0;

function oneFinAbrirConta(id) {
  window.oneFinContaAberta = id;
  window.oneFinFaturaOffset = 0;
  ['one-fin-contas-modo-lista', 'one-fin-mob-contas-modo-lista'].forEach(function(el){
    var e = document.getElementById(el); if (e) e.hidden = true;
  });
  ['one-fin-contas-modo-detalhe', 'one-fin-mob-contas-modo-detalhe'].forEach(function(el){
    var e = document.getElementById(el); if (e) e.hidden = false;
  });
  oneFinRenderContaDetalhe();
}
window.oneFinAbrirConta = oneFinAbrirConta;

function oneFinVoltarContas() {
  window.oneFinContaAberta = null;
  ['one-fin-contas-modo-lista', 'one-fin-mob-contas-modo-lista'].forEach(function(el){
    var e = document.getElementById(el); if (e) e.hidden = false;
  });
  ['one-fin-contas-modo-detalhe', 'one-fin-mob-contas-modo-detalhe'].forEach(function(el){
    var e = document.getElementById(el); if (e) e.hidden = true;
  });
  oneFinRenderContas();
}
window.oneFinVoltarContas = oneFinVoltarContas;

function oneFinEditarContaAberta() {
  if (window.oneFinContaAberta) oneFinContaModalEditar(window.oneFinContaAberta);
}
window.oneFinEditarContaAberta = oneFinEditarContaAberta;

function oneFinFaturaPrev() { window.oneFinFaturaOffset--; oneFinRenderContaDetalhe(); }
function oneFinFaturaProx() { window.oneFinFaturaOffset++; oneFinRenderContaDetalhe(); }
function oneFinFaturaHoje() { window.oneFinFaturaOffset = 0; oneFinRenderContaDetalhe(); }
window.oneFinFaturaPrev = oneFinFaturaPrev;
window.oneFinFaturaProx = oneFinFaturaProx;
window.oneFinFaturaHoje = oneFinFaturaHoje;

function _oneFinBrlDet(v) {
  return 'R$ ' + (Number(v)||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
}

/* Lança em lista todos os lançamentos (reais + instâncias virtuais de fixas)
   atrelados à conta. Pra fixas, gera instâncias dos próximos 6 meses + atual. */
function _oneFinLancamentosDaConta(contaId) {
  /* Filtra pelo mês ativo do header (mesma navegação das outras vistas).
     Saldo atual da conta continua sendo histórico — só a lista é mensal. */
  var mesAtivo = (typeof window.oneFinMesAtivo === 'number') ? window.oneFinMesAtivo : new Date().getMonth();
  var anoAtivo = (typeof window.oneFinAnoAtivo === 'number') ? window.oneFinAnoAtivo : new Date().getFullYear();
  var prefix = anoAtivo + '-' + String(mesAtivo + 1).padStart(2, '0');
  var noMes = function(dataStr) { return dataStr && dataStr.indexOf(prefix) === 0; };

  var receitas = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]');
  var despesas = JSON.parse(localStorage.getItem(oneU('despesas')) || '[]');
  var lista = [];
  receitas.forEach(function(r){
    if (String(r.contaId) !== String(contaId)) return;
    if (!noMes(r.data)) return;
    lista.push({ tipo:'in', key:'receitas', id:r.id, nome:r.nome||r.descricao||'Receita',
                 categoria:r.categoria||'', valor:Number(r.valor)||0, data:r.data,
                 status:r.status||'pendente', _fixa:false });
  });
  despesas.forEach(function(d){
    if (String(d.contaId) !== String(contaId)) return;
    if (!noMes(d.data)) return;
    lista.push({ tipo:'out', key:'despesas', id:d.id, nome:d.descricao||d.nome||'Despesa',
                 categoria:d.categoria||'', valor:Number(d.valor)||0, data:d.data,
                 faturaMesAno:d.faturaMesAno, status:d.status||'pago', _fixa:false });
  });
  /* Instâncias de fixas — só do mês ativo (não mais 12 meses à frente). */
  var inst = oneFinInstanciasDoMes(mesAtivo, anoAtivo);
  inst.receitas.forEach(function(r){
    if (String(r.contaId) !== String(contaId)) return;
    lista.push({ tipo:'in', key:'receitasFixas', id:r._fixaId, nome:r.nome,
                 categoria:r.categoria||'', valor:r.valor, data:r.data,
                 status:r.status || 'pendente', _fixa:true });
  });
  inst.despesas.forEach(function(d){
    if (String(d.contaId) !== String(contaId)) return;
    lista.push({ tipo:'out', key:'despesasFixas', id:d._fixaId, nome:d.nome,
                 categoria:d.categoria||'', valor:d.valor, data:d.data,
                 faturaMesAno:d.faturaMesAno, status:d.status || 'pendente', _fixa:true });
  });
  lista.sort(function(a,b){ return (b.data||'').localeCompare(a.data||''); });
  return lista;
}

function _oneFinItemDetHtml(l) {
  var cat = (typeof oneFinCatIcon === 'function') ? oneFinCatIcon(l.categoria) : { emoji:'💸', cor:'#6B7F6F', bg:'#F2F6F1' };
  var sinal = l.tipo === 'in' ? '+' : '-';
  var dataF = l.data ? l.data.split('-').reverse().slice(0,2).join('/') : '';
  var nome = (l.nome||'').replace(/</g,'&lt;');
  var catLabel = l.categoria ? l.categoria.replace(/</g,'&lt;') : (l.tipo==='in' ? 'Receita' : 'Despesa');
  var badgeFixa = l._fixa ? ' <span style="font-size:9px;color:#9B72B0;background:rgba(155,114,176,0.12);padding:1px 5px;border-radius:6px;font-weight:600">↻ fixa</span>' : '';
  /* Botões editar/excluir — l.key e l.id já vêm corretos das funções que
     montam o item (fixa: key='despesasFixas'/'receitasFixas' + id=_fixaId;
     real: key='despesas'/'receitas' + id da própria linha). Mesmo padrão
     do Extrato (renderOneFinanceiroPainel). */
  var safeId = String(l.id||'').replace(/'/g,"\\'");
  var safeKey = String(l.key||'');
  var safeData = String(l.data||'').replace(/'/g,"\\'");
  var actions = (safeKey && safeId)
    ? '<div class="one-fin-conta-det-item-actions">' +
        '<button class="one-fin-item-btn" onclick="oneFinEditar(\'' + safeKey + '\',\'' + safeId + '\',\'' + safeData + '\')" title="Editar">✏️</button>' +
        '<button class="one-fin-item-btn del" onclick="oneFinExcluir(\'' + safeKey + '\',\'' + safeId + '\',\'' + safeData + '\')" title="Excluir">🗑️</button>' +
      '</div>'
    : '';
  return '<div class="one-fin-conta-det-item">' +
           '<div class="one-fin-conta-det-item-ico" style="background:' + cat.bg + ';color:' + cat.cor + '">' + cat.emoji + '</div>' +
           '<div class="one-fin-conta-det-item-body">' +
             '<div class="one-fin-conta-det-item-nome">' + nome + badgeFixa + '</div>' +
             '<div class="one-fin-conta-det-item-meta">' + dataF + ' · ' + catLabel + '</div>' +
           '</div>' +
           '<div class="one-fin-conta-det-item-val ' + (l.tipo==='in'?'in':'out') + '">' + sinal + _oneFinBrlDet(l.valor) + '</div>' +
           actions +
         '</div>';
}

function _oneFinRenderBancoDet(conta) {
  var saldo = oneFinSaldoBanco(conta.id);
  var corSaldo = saldo >= 0 ? '#27856A' : '#C0392B';
  var lista = _oneFinLancamentosDaConta(conta.id);
  var corpoLista = lista.length
    ? lista.map(_oneFinItemDetHtml).join('')
    : '<div class="one-fin-conta-det-vazio">Nenhum lançamento nesta conta ainda.</div>';
  return '<div class="one-fin-conta-det-saldo">' +
           '<div class="one-fin-conta-det-saldo-lbl">Saldo atual</div>' +
           '<div class="one-fin-conta-det-saldo-val" style="color:' + corSaldo + '">' + _oneFinBrlDet(saldo) + '</div>' +
         '</div>' +
         '<div class="one-fin-conta-det-lista">' + corpoLista + '</div>';
}

function _oneFinRenderCartaoDet(conta) {
  /* Carrossel de faturas. Offset 0 = fatura do mês ativo do app. */
  var mesBase = (typeof window.oneFinMesAtivo === 'number') ? window.oneFinMesAtivo : new Date().getMonth();
  var anoBase = (typeof window.oneFinAnoAtivo === 'number') ? window.oneFinAnoAtivo : new Date().getFullYear();
  var off = window.oneFinFaturaOffset || 0;
  var m = mesBase + off, a = anoBase;
  while (m < 0)  { m += 12; a--; }
  while (m > 11) { m -= 12; a++; }
  var faturaTag = a + '-' + String(m + 1).padStart(2, '0');
  var meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  /* Despesas reais nessa fatura + instâncias de fixas com mesma faturaMesAno */
  var despesasReais = JSON.parse(localStorage.getItem(oneU('despesas')) || '[]');
  var doMes = [];
  despesasReais.forEach(function(d){
    if (String(d.contaId) === String(conta.id) && d.faturaMesAno === faturaTag) {
      doMes.push({ tipo:'out', key:'despesas', id:d.id, nome:d.descricao||d.nome||'Despesa',
                   categoria:d.categoria||'', valor:Number(d.valor)||0, data:d.data,
                   status:d.status||'pendente', _fixa:false });
    }
  });
  /* Instâncias de fixas: olhar mês anterior + atual + próximo. Uma fixa
     instanciada no mês X com diaFechamento do cartão menor que o dia da fixa
     cai na fatura de X+1 — então pra montar a "Fatura de Junho" precisamos
     pegar instâncias de Maio também. Os 3 meses cobrem todos os casos. */
  var inst = (typeof oneFinInstanciasVizinhas === 'function')
               ? oneFinInstanciasVizinhas(m, a)
               : oneFinInstanciasDoMes(m, a);
  inst.despesas.forEach(function(d){
    if (String(d.contaId) === String(conta.id) && d.faturaMesAno === faturaTag) {
      doMes.push({ tipo:'out', key:'despesasFixas', id:d._fixaId, nome:d.nome,
                   categoria:d.categoria||'', valor:d.valor, data:d.data,
                   status:'pendente', _fixa:true });
    }
  });
  doMes.sort(function(a,b){ return (b.data||'').localeCompare(a.data||''); });

  var totalFatura = doMes.reduce(function(s,d){ return s + (Number(d.valor)||0); }, 0);
  var corpoLista = doMes.length
    ? doMes.map(_oneFinItemDetHtml).join('')
    : '<div class="one-fin-conta-det-vazio">Sem despesas nesta fatura.</div>';

  /* Botão "voltar pra fatura do mês ativo" removido daqui — fica só o reload
     global do header (Mentor pediu pra eliminar duplicação visual). Pra voltar
     pro mês atual, usar o reload geral do header do Financeiro. */
  return '<div class="one-fin-conta-det-fatura-nav">' +
           '<button class="one-fin-mes-btn" onclick="oneFinFaturaPrev()" title="Fatura anterior">‹</button>' +
           '<span class="one-fin-conta-det-fatura-lbl">Fatura de ' + meses[m] + '/' + a + '</span>' +
           '<button class="one-fin-mes-btn" onclick="oneFinFaturaProx()" title="Próxima fatura">›</button>' +
         '</div>' +
         '<div class="one-fin-conta-det-saldo">' +
           '<div class="one-fin-conta-det-saldo-lbl">Total da fatura</div>' +
           '<div class="one-fin-conta-det-saldo-val" style="color:#C0392B">' + _oneFinBrlDet(totalFatura) + '</div>' +
           '<div class="one-fin-conta-det-saldo-sub">Fecha dia ' + conta.diaFechamento + ' · Vence dia ' + conta.diaVencimento + '</div>' +
         '</div>' +
         '<div class="one-fin-conta-det-lista">' + corpoLista + '</div>';
}

function oneFinRenderContaDetalhe() {
  var conta = oneFinGetConta(window.oneFinContaAberta);
  if (!conta) { oneFinVoltarContas(); return; }
  var titHtml = '<span style="display:inline-flex;align-items:center;gap:8px">' +
                  '<span style="width:30px;height:30px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;background:' + conta.cor + '22;color:' + conta.cor + ';font-size:17px">' + conta.icone + '</span>' +
                  '<span>' + (conta.nome||'').replace(/</g,'&lt;') + '</span>' +
                '</span>';
  ['one-fin-conta-det-titulo','one-fin-mob-conta-det-titulo'].forEach(function(id){
    var e = document.getElementById(id); if (e) e.innerHTML = titHtml;
  });
  var html = (conta.tipo === 'banco') ? _oneFinRenderBancoDet(conta) : _oneFinRenderCartaoDet(conta);
  ['one-fin-conta-det-body','one-fin-mob-conta-det-body'].forEach(function(id){
    var e = document.getElementById(id); if (e) e.innerHTML = html;
  });
}
window.oneFinRenderContaDetalhe = oneFinRenderContaDetalhe;

/* ════════════════════════════════════════════════════════════════
   INSTANCIAMENTO DE FIXAS (Sessão C)
   Fixas vivem só como template. Em cada mês ativo, viram instâncias virtuais
   com data calculada (diaDoMes), categoria/contaId herdados.
   Instâncias virtuais têm flag _fixa=true e _fixaId=id-do-template.
   ════════════════════════════════════════════════════════════════ */
function oneFinFixaAtivaNoMes(fixa, mes, ano) {
  /* Checa início (template ativo só a partir de inicio), fim (encerrada após fim)
     e mesesPulados (lista de YYYY-MM que NÃO geram instância — usado pelo
     diálogo de escopo "só esta" quando user edita/exclui um mês específico). */
  var mesAnoAlvo = ano + '-' + String(mes + 1).padStart(2, '0');
  if (Array.isArray(fixa.mesesPulados) && fixa.mesesPulados.indexOf(mesAnoAlvo) >= 0) return false;
  if (fixa.fim) {
    var pf = String(fixa.fim).split('-');
    var fAno = parseInt(pf[0], 10);
    var fMes = parseInt(pf[1], 10);
    if (fAno && fMes) {
      /* fim é inclusivo: gera instância no mês de fim, não gera depois. */
      if (ano > fAno || (ano === fAno && mes > (fMes - 1))) return false;
    }
  }
  if (!fixa.inicio) return true;
  var partes = String(fixa.inicio).split('-');
  var iAno = parseInt(partes[0], 10);
  var iMes = parseInt(partes[1], 10);
  if (!iAno || !iMes) return true;
  return (ano > iAno) || (ano === iAno && mes >= (iMes - 1));
}
window.oneFinFixaAtivaNoMes = oneFinFixaAtivaNoMes;

function oneFinDataFixaNoMes(fixa, mes, ano) {
  var dia = parseInt(fixa.diaDoMes, 10) || 1;
  if (dia < 1) dia = 1;
  if (dia > 28) dia = 28;
  return ano + '-' + String(mes + 1).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
}
window.oneFinDataFixaNoMes = oneFinDataFixaNoMes;

/* Devolve as instâncias virtuais das fixas pro mês+ano,
   normalizadas como objetos parecidos com despesas/receitas reais. */
/* Coleta instâncias virtuais de fixas em UM INTERVALO de datas (YYYY-MM-DD).
   Itera mês a mês entre as duas datas (inclusivo) chamando oneFinInstanciasDoMes
   e filtra cada instância pela data. Resolve o bug de Extrato 7/15/30d, onde
   antes só o mês ativo era considerado e fixas em outros meses sumiam. */
function oneFinInstanciasNoIntervalo(inicioStr, fimStr) {
  if (!inicioStr || !fimStr) return { receitas: [], despesas: [] };
  var dIni = new Date(inicioStr + 'T00:00:00');
  var dFim = new Date(fimStr + 'T00:00:00');
  if (isNaN(dIni.getTime()) || isNaN(dFim.getTime())) return { receitas: [], despesas: [] };
  var receitas = [], despesas = [];
  var m = dIni.getMonth(), a = dIni.getFullYear();
  var mFim = dFim.getMonth(), aFim = dFim.getFullYear();
  /* guard de sanidade: no máximo 24 meses (evita loop em datas malucas) */
  for (var i = 0; i < 24; i++) {
    var inst = oneFinInstanciasDoMes(m, a);
    inst.receitas.forEach(function(r){
      if (r.data >= inicioStr && r.data <= fimStr) receitas.push(r);
    });
    inst.despesas.forEach(function(d){
      if (d.data >= inicioStr && d.data <= fimStr) despesas.push(d);
    });
    if (a === aFim && m === mFim) break;
    m++;
    if (m > 11) { m = 0; a++; }
  }
  return { receitas: receitas, despesas: despesas };
}
window.oneFinInstanciasNoIntervalo = oneFinInstanciasNoIntervalo;

/* Coleta instâncias virtuais de fixas dos MESES VIZINHOS ao mês alvo (anterior,
   atual, próximo). Usado pra montar a fatura de cartão: uma fixa do mês X pode
   cair na fatura de X+1 (caso comum) ou raramente em X-1. Cobrir os 3 vizinhos
   evita perder qualquer instância sem ter que iterar muitos meses. */
function oneFinInstanciasVizinhas(mes, ano) {
  var meses = [
    { m: mes - 1, a: ano },
    { m: mes,     a: ano },
    { m: mes + 1, a: ano }
  ];
  var receitas = [], despesas = [];
  meses.forEach(function(p){
    var mm = p.m, aa = p.a;
    if (mm < 0)  { mm = 11; aa--; }
    if (mm > 11) { mm = 0;  aa++; }
    var inst = oneFinInstanciasDoMes(mm, aa);
    receitas = receitas.concat(inst.receitas);
    despesas = despesas.concat(inst.despesas);
  });
  return { receitas: receitas, despesas: despesas };
}
window.oneFinInstanciasVizinhas = oneFinInstanciasVizinhas;

function oneFinInstanciasDoMes(mes, ano) {
  var receitasFixas = JSON.parse(localStorage.getItem(oneU('receitasFixas')) || '[]');
  var despesasFixas = JSON.parse(localStorage.getItem(oneU('despesasFixas')) || '[]');
  var receitas = [], despesas = [];
  var mesAnoStr = ano + '-' + String(mes + 1).padStart(2, '0');

  receitasFixas.forEach(function(rf){
    if (!oneFinFixaAtivaNoMes(rf, mes, ano)) return;
    /* Lê pagoPorMes do template — se o valor pago cobre o esperado, a
       instância vai como 'pago' (a bolinha do Resumo reflete em Extrato/Geral).
       Valor esperado respeita override do mês (valorPorMes) se houver. */
    var espRF = (typeof oneFinFixaValorNoMes === 'function') ? oneFinFixaValorNoMes(rf, mesAnoStr) : (Number(rf.valor) || 0);
    var pagoRF = (typeof oneFinFixaPagoNoMes === 'function') ? oneFinFixaPagoNoMes(rf, mesAnoStr) : 0;
    receitas.push({
      id: '_fix_r_' + rf.id + '_' + ano + '_' + mes,
      _fixa: true, _fixaId: rf.id, _fixaKey: 'receitasFixas',
      nome: rf.nome || rf.descricao || 'Receita fixa',
      descricao: rf.descricao || rf.nome || 'Receita fixa',
      valor: espRF,
      data: oneFinDataFixaNoMes(rf, mes, ano),
      categoria: rf.categoria || '',
      contaId: rf.contaId || '',
      tipo: 'receita',
      recorrencia: 'fixa',
      status: (pagoRF >= espRF && espRF > 0) ? 'pago' : 'pendente'
    });
  });

  despesasFixas.forEach(function(df){
    if (!oneFinFixaAtivaNoMes(df, mes, ano)) return;
    var conta = df.contaId ? oneFinGetConta(df.contaId) : null;
    var dataF = oneFinDataFixaNoMes(df, mes, ano);
    var espDF = (typeof oneFinFixaValorNoMes === 'function') ? oneFinFixaValorNoMes(df, mesAnoStr) : (Number(df.valor) || 0);
    var pagoDF = (typeof oneFinFixaPagoNoMes === 'function') ? oneFinFixaPagoNoMes(df, mesAnoStr) : 0;
    despesas.push({
      id: '_fix_d_' + df.id + '_' + ano + '_' + mes,
      _fixa: true, _fixaId: df.id, _fixaKey: 'despesasFixas',
      nome: df.nome || df.descricao || 'Despesa fixa',
      descricao: df.descricao || df.nome || 'Despesa fixa',
      valor: espDF,
      data: dataF,
      categoria: df.categoria || '',
      contaId: df.contaId || '',
      tipo: 'despesa',
      recorrencia: 'fixa',
      status: (pagoDF >= espDF && espDF > 0) ? 'pago' : 'pendente',
      faturaMesAno: (conta && conta.tipo === 'cartao')
        ? oneFinCalcularFatura(dataF, conta.diaFechamento)
        : null
    });
  });

  return { receitas: receitas, despesas: despesas };
}
window.oneFinInstanciasDoMes = oneFinInstanciasDoMes;

/* ── Render da aba Contas (desktop + mobile, mesmo HTML) ── */
function _brlContas(v) {
  return 'R$ ' + (Number(v)||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
}

function oneFinRenderContas() {
  var lista = oneFinGetContas();
  var bancos        = lista.filter(function(c){ return c.tipo === 'banco';  });
  var cartoes       = lista.filter(function(c){ return c.tipo === 'cartao'; });
  var investimentos = lista.filter(function(c){ return c.tipo === 'investimento'; });

  var renderItem = function(conta) {
    var saldo;
    if (conta.tipo === 'cartao')         saldo = oneFinFaturaAberta(conta.id);
    else if (conta.tipo === 'investimento') saldo = Number(conta.saldo) || 0;
    else                                  saldo = oneFinSaldoBanco(conta.id);
    var sufixo = (conta.tipo === 'cartao') ? 'Fatura aberta' : 'Saldo';
    var corValor = (conta.tipo === 'cartao')
      ? '#C0392B'
      : (saldo >= 0 ? '#27856A' : '#C0392B');
    var dataDetalhe = (conta.tipo === 'cartao')
      ? ('Fecha dia ' + conta.diaFechamento + ' · Vence dia ' + conta.diaVencimento)
      : '';
    return '<div class="one-fin-conta-item" onclick="oneFinAbrirConta(\'' + conta.id + '\')">' +
             '<div class="one-fin-conta-ico" style="background:' + conta.cor + '22;color:' + conta.cor + '">' + conta.icone + '</div>' +
             '<div class="one-fin-conta-body">' +
               '<div class="one-fin-conta-nome">' + (conta.nome || '').replace(/</g,'&lt;') + '</div>' +
               (dataDetalhe ? '<div class="one-fin-conta-sub">' + dataDetalhe + '</div>' : '') +
             '</div>' +
             '<div class="one-fin-conta-val" style="color:' + corValor + '">' +
               '<div class="one-fin-conta-val-lbl">' + sufixo + '</div>' +
               '<div class="one-fin-conta-val-num">' + _brlContas(saldo) + '</div>' +
             '</div>' +
             '<button class="one-fin-conta-edit-btn" onclick="event.stopPropagation(); oneFinContaModalEditar(\'' + conta.id + '\')" title="Editar conta">⚙️</button>' +
           '</div>';
  };

  var renderSecao = function(titulo, icone, arr, vazioMsg) {
    var h = '<div class="one-fin-conta-secao">' +
              '<div class="one-fin-conta-secao-head">' +
                '<span class="one-fin-conta-secao-tit">' + icone + ' ' + titulo + '</span>' +
                '<span class="one-fin-conta-secao-cnt">' + arr.length + '</span>' +
              '</div>' +
              '<div class="one-fin-conta-secao-items">';
    if (arr.length === 0) {
      h += '<div class="one-fin-conta-vazio">' + vazioMsg + '</div>';
    } else {
      h += arr.map(renderItem).join('');
    }
    h += '</div></div>';
    return h;
  };

  var html = renderSecao('Bancos', '🏦', bancos, 'Nenhum banco cadastrado ainda.') +
             renderSecao('Cartões de crédito', '💳', cartoes, 'Nenhum cartão cadastrado ainda.') +
             renderSecao('Investimentos', '📈', investimentos, 'Nenhum investimento cadastrado ainda.');

  var alvoDesk = document.getElementById('one-fin-contas-lista');
  if (alvoDesk) alvoDesk.innerHTML = html;

  var alvoMob = document.getElementById('one-fin-mob-contas-lista');
  if (alvoMob) alvoMob.innerHTML = html;
}
window.oneFinRenderContas = oneFinRenderContas;

/* ── Modal Nova/Editar Conta ── */
function _oneFinContaModalPreencherIcones() {
  var grade = document.getElementById('one-fin-conta-modal-icones');
  if (!grade || grade.children.length > 0) return;
  ONE_FIN_CONTA_ICONES.forEach(function(ico){
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'one-fin-conta-modal-icone';
    b.textContent = ico;
    b.setAttribute('data-icone', ico);
    b.onclick = function(){ _oneFinContaModalSelIcone(ico); };
    grade.appendChild(b);
  });
}

function _oneFinContaModalPreencherCores() {
  var grade = document.getElementById('one-fin-conta-modal-cores');
  if (!grade || grade.children.length > 0) return;
  ONE_FIN_CONTA_CORES.forEach(function(cor){
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'one-fin-conta-modal-cor';
    b.style.background = cor;
    b.setAttribute('data-cor', cor);
    b.onclick = function(){ _oneFinContaModalSelCor(cor); };
    grade.appendChild(b);
  });
}

function _oneFinContaModalPreencherDias(selectId) {
  var sel = document.getElementById(selectId);
  if (!sel || sel.options.length > 0) return;
  for (var i = 1; i <= 31; i++) {
    var opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = 'Dia ' + i;
    sel.appendChild(opt);
  }
}

function _oneFinContaModalSelIcone(ico) {
  window.oneFinContaModalIcone = ico;
  document.querySelectorAll('.one-fin-conta-modal-icone').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-icone') === ico);
  });
}

function _oneFinContaModalSelCor(cor) {
  window.oneFinContaModalCor = cor;
  document.querySelectorAll('.one-fin-conta-modal-cor').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-cor') === cor);
  });
}

function oneFinContaModalAbrir() {
  var modal = document.getElementById('one-fin-conta-modal');
  if (!modal) return;
  _oneFinContaModalPreencherIcones();
  _oneFinContaModalPreencherCores();
  _oneFinContaModalPreencherDias('one-fin-conta-modal-fechamento');
  _oneFinContaModalPreencherDias('one-fin-conta-modal-vencimento');

  document.getElementById('one-fin-conta-modal-title').textContent = 'Nova conta';
  document.getElementById('one-fin-conta-modal-id').value = '';
  document.getElementById('one-fin-conta-modal-nome').value = '';
  document.getElementById('one-fin-conta-modal-fechamento').value = '1';
  document.getElementById('one-fin-conta-modal-vencimento').value = '10';
  var saldoInp = document.getElementById('one-fin-conta-modal-saldo');
  if (saldoInp) saldoInp.value = '';
  var saldoIniInp = document.getElementById('one-fin-conta-modal-saldo-inicial');
  if (saldoIniInp) saldoIniInp.value = '';
  document.getElementById('one-fin-conta-modal-btn-excluir').style.display = 'none';

  window.oneFinContaModalIcone = null;
  window.oneFinContaModalCor   = null;

  oneFinContaModalSetTipo('banco');
  modal.classList.add('open');
  setTimeout(function(){ document.getElementById('one-fin-conta-modal-nome').focus(); }, 100);
}
window.oneFinContaModalAbrir = oneFinContaModalAbrir;

function oneFinContaModalEditar(id) {
  var conta = oneFinGetConta(id);
  if (!conta) return;
  var modal = document.getElementById('one-fin-conta-modal');
  if (!modal) return;
  _oneFinContaModalPreencherIcones();
  _oneFinContaModalPreencherCores();
  _oneFinContaModalPreencherDias('one-fin-conta-modal-fechamento');
  _oneFinContaModalPreencherDias('one-fin-conta-modal-vencimento');

  document.getElementById('one-fin-conta-modal-title').textContent = 'Editar conta';
  document.getElementById('one-fin-conta-modal-id').value = conta.id;
  document.getElementById('one-fin-conta-modal-nome').value = conta.nome || '';
  document.getElementById('one-fin-conta-modal-fechamento').value = String(conta.diaFechamento || 1);
  document.getElementById('one-fin-conta-modal-vencimento').value = String(conta.diaVencimento || 10);
  var saldoInp = document.getElementById('one-fin-conta-modal-saldo');
  if (saldoInp) saldoInp.value = (conta.tipo === 'investimento' && conta.saldo != null) ? String(conta.saldo) : '';
  var saldoIniInp = document.getElementById('one-fin-conta-modal-saldo-inicial');
  if (saldoIniInp) saldoIniInp.value = (conta.tipo === 'banco' && conta.saldoInicial != null) ? String(conta.saldoInicial) : '';
  document.getElementById('one-fin-conta-modal-btn-excluir').style.display = '';

  oneFinContaModalSetTipo(conta.tipo || 'banco');
  var icoDefault = (conta.tipo === 'cartao') ? '💳' : (conta.tipo === 'investimento' ? '📈' : '🏦');
  _oneFinContaModalSelIcone(conta.icone || icoDefault);
  _oneFinContaModalSelCor(conta.cor || ONE_FIN_CONTA_CORES[0]);
  modal.classList.add('open');
}
window.oneFinContaModalEditar = oneFinContaModalEditar;

function oneFinContaModalFechar() {
  var modal = document.getElementById('one-fin-conta-modal');
  if (modal) modal.classList.remove('open');
}
window.oneFinContaModalFechar = oneFinContaModalFechar;

function oneFinContaModalSetTipo(tipo) {
  if (tipo !== 'cartao' && tipo !== 'investimento') tipo = 'banco';
  window.oneFinContaModalTipo = tipo;
  var tabBanco        = document.getElementById('one-fin-conta-modal-tab-banco');
  var tabCartao       = document.getElementById('one-fin-conta-modal-tab-cartao');
  var tabInvestimento = document.getElementById('one-fin-conta-modal-tab-investimento');
  if (tabBanco)        tabBanco.classList.toggle('active',        tipo === 'banco');
  if (tabCartao)       tabCartao.classList.toggle('active',       tipo === 'cartao');
  if (tabInvestimento) tabInvestimento.classList.toggle('active', tipo === 'investimento');
  var blocoBanco         = document.getElementById('one-fin-conta-modal-bloco-banco');
  var blocoCartao        = document.getElementById('one-fin-conta-modal-bloco-cartao');
  var blocoInvestimento  = document.getElementById('one-fin-conta-modal-bloco-investimento');
  if (blocoBanco)        blocoBanco.style.display        = (tipo === 'banco') ? '' : 'none';
  if (blocoCartao)       blocoCartao.style.display       = (tipo === 'cartao') ? '' : 'none';
  if (blocoInvestimento) blocoInvestimento.style.display = (tipo === 'investimento') ? '' : 'none';
  if (!window.oneFinContaModalIcone) {
    var defaultIco = (tipo === 'cartao') ? '💳' : (tipo === 'investimento' ? '📈' : '🏦');
    _oneFinContaModalSelIcone(defaultIco);
  }
  if (!window.oneFinContaModalCor) {
    _oneFinContaModalSelCor(ONE_FIN_CONTA_CORES[0]);
  }
}
window.oneFinContaModalSetTipo = oneFinContaModalSetTipo;

function oneFinContaModalSalvar() {
  var id    = document.getElementById('one-fin-conta-modal-id').value;
  var nome  = (document.getElementById('one-fin-conta-modal-nome').value || '').trim();
  var tipo  = window.oneFinContaModalTipo || 'banco';
  var icoDefault = (tipo === 'cartao') ? '💳' : (tipo === 'investimento' ? '📈' : '🏦');
  var icone = window.oneFinContaModalIcone || icoDefault;
  var cor   = window.oneFinContaModalCor || ONE_FIN_CONTA_CORES[0];
  var dFech = parseInt(document.getElementById('one-fin-conta-modal-fechamento').value, 10);
  var dVenc = parseInt(document.getElementById('one-fin-conta-modal-vencimento').value, 10);
  var saldoInp = document.getElementById('one-fin-conta-modal-saldo');
  var rawSaldoInv = saldoInp ? String(saldoInp.value).trim() : '';
  var saldoInv = parseFloat(rawSaldoInv.replace(',', '.'));
  if (isNaN(saldoInv)) saldoInv = 0;

  if (!nome) {
    if (typeof oneToast === 'function') oneToast('Dá um nome pra conta.', 'error');
    return;
  }
  if (tipo === 'cartao') {
    if (!dFech || dFech < 1 || dFech > 31) {
      if (typeof oneToast === 'function') oneToast('Dia de fechamento inválido.', 'error');
      return;
    }
    if (!dVenc || dVenc < 1 || dVenc > 31) {
      if (typeof oneToast === 'function') oneToast('Dia de vencimento inválido.', 'error');
      return;
    }
  }

  var obj = { nome: nome, tipo: tipo, icone: icone, cor: cor };
  if (tipo === 'banco') {
    var saldoIniInp = document.getElementById('one-fin-conta-modal-saldo-inicial');
    var rawSaldoIni = saldoIniInp ? String(saldoIniInp.value).trim() : '';
    if (rawSaldoIni === '' && id) {
      /* Preserva valor anterior se o campo foi deixado vazio na edição */
      var contaAtual = (typeof oneFinGetConta === 'function') ? oneFinGetConta(id) : null;
      obj.saldoInicial = (contaAtual && contaAtual.saldoInicial != null) ? Number(contaAtual.saldoInicial) : 0;
    } else {
      /* Aceita vírgula como separador decimal (PT-BR) */
      var saldoIni = parseFloat(rawSaldoIni.replace(',', '.'));
      obj.saldoInicial = isNaN(saldoIni) ? 0 : saldoIni;
    }
  }
  if (tipo === 'cartao') {
    obj.diaFechamento = dFech;
    obj.diaVencimento = dVenc;
  }
  if (tipo === 'investimento') {
    obj.saldo = saldoInv;
  }

  if (id) {
    oneFinUpdateConta(id, obj);
    if (typeof oneToast === 'function') oneToast('✓ Conta atualizada.');
  } else {
    oneFinAddConta(obj);
    if (typeof oneToast === 'function') oneToast('✓ Conta criada.');
  }

  window.oneFinContaModalIcone = null;
  window.oneFinContaModalCor   = null;

  oneFinContaModalFechar();
  oneFinRenderContas();
  /* Garante que outras vistas que dependem do saldo (Resumo, Visão Geral) recarreguem */
  if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
}
window.oneFinContaModalSalvar = oneFinContaModalSalvar;

function oneFinContaModalExcluir() {
  var id = document.getElementById('one-fin-conta-modal-id').value;
  if (!id) return;
  var conta = oneFinGetConta(id);
  if (!conta) return;
  var receitas      = JSON.parse(localStorage.getItem(oneU('receitas'))      || '[]');
  var despesas      = JSON.parse(localStorage.getItem(oneU('despesas'))      || '[]');
  var receitasFixas = JSON.parse(localStorage.getItem(oneU('receitasFixas')) || '[]');
  var despesasFixas = JSON.parse(localStorage.getItem(oneU('despesasFixas')) || '[]');
  var todos = receitas.concat(despesas).concat(receitasFixas).concat(despesasFixas);
  var atrelados = todos.filter(function(l){ return String(l.contaId) === String(id); }).length;
  var msg = atrelados > 0
    ? 'Excluir "' + conta.nome + '"? Tem ' + atrelados + ' lançamento(s) atrelado(s) que vão ficar sem conta. Continuar?'
    : 'Excluir conta "' + conta.nome + '"?';
  if (!confirm(msg)) return;
  oneFinDeleteConta(id);
  oneFinContaModalFechar();
  oneFinRenderContas();
  if (typeof oneToast === 'function') oneToast('Conta excluída.');
}
window.oneFinContaModalExcluir = oneFinContaModalExcluir;

/* ════════════════════════════════════════════════════════════════ */

function oneFinModalPreencherDias() {
  var sel = document.getElementById('one-fin-modal-dia');
  if (!sel || sel.options.length > 0) return;
  for (var i = 1; i <= 31; i++) {
    var opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = 'Dia ' + i;
    sel.appendChild(opt);
  }
}

function oneFinModalRefreshCategorias() {
  var tipo = window.oneFinModalTipo || 'receita';
  var sel = document.getElementById('one-fin-modal-cat');
  if (!sel) return;
  var atual = sel.value;
  var lista = oneFinGetCategorias(tipo);
  sel.innerHTML = '';
  lista.forEach(function(c) {
    var o = document.createElement('option');
    var ico = (typeof oneFinCatIcon === 'function') ? oneFinCatIcon(c).emoji : '';
    o.value = c;
    o.textContent = (ico ? ico + ' ' : '') + c;
    sel.appendChild(o);
  });
  if (atual && lista.indexOf(atual) !== -1) sel.value = atual;
}
window.oneFinModalRefreshCategorias = oneFinModalRefreshCategorias;

/* Lista as contas no select do modal de lançamento.
   Receita: só contas tipo banco.
   Despesa: banco + cartão, agrupados por <optgroup>. */
function oneFinModalRefreshContas() {
  var tipo = window.oneFinModalTipo || 'receita';
  var sel = document.getElementById('one-fin-modal-conta');
  if (!sel) return;
  var atual = sel.value;
  var contas  = oneFinGetContas();
  var bancos  = contas.filter(function(c){ return c.tipo === 'banco';  });
  var cartoes = contas.filter(function(c){ return c.tipo === 'cartao'; });

  sel.innerHTML = '';

  if (tipo === 'receita') {
    if (bancos.length === 0) {
      var oVazio = document.createElement('option');
      oVazio.value = '';
      oVazio.textContent = '— cadastre um banco —';
      sel.appendChild(oVazio);
      sel.disabled = true;
    } else {
      sel.disabled = false;
      bancos.forEach(function(c){
        var o = document.createElement('option');
        o.value = c.id;
        o.textContent = (c.icone || '🏦') + ' ' + c.nome;
        sel.appendChild(o);
      });
    }
  } else {
    if (bancos.length === 0 && cartoes.length === 0) {
      var oVazio2 = document.createElement('option');
      oVazio2.value = '';
      oVazio2.textContent = '— cadastre uma conta —';
      sel.appendChild(oVazio2);
      sel.disabled = true;
    } else {
      sel.disabled = false;
      if (bancos.length > 0) {
        var gB = document.createElement('optgroup');
        gB.label = 'Bancos';
        bancos.forEach(function(c){
          var o = document.createElement('option');
          o.value = c.id;
          o.textContent = (c.icone || '🏦') + ' ' + c.nome;
          gB.appendChild(o);
        });
        sel.appendChild(gB);
      }
      if (cartoes.length > 0) {
        var gC = document.createElement('optgroup');
        gC.label = 'Cartões de crédito';
        cartoes.forEach(function(c){
          var o = document.createElement('option');
          o.value = c.id;
          o.textContent = (c.icone || '💳') + ' ' + c.nome;
          gC.appendChild(o);
        });
        sel.appendChild(gC);
      }
    }
  }

  if (atual) {
    var existe = Array.prototype.some.call(sel.options, function(op){ return op.value === atual; });
    if (existe) sel.value = atual;
  }
  oneFinModalAtualizarPreviewFatura();
}
window.oneFinModalRefreshContas = oneFinModalRefreshContas;

/* Atalho: abre o modal de Nova Conta a partir do modal de lançamento.
   Fecha o de lançamento; ao salvar a conta, o usuário reabre o lançamento. */
function oneFinModalNovaConta() {
  oneFinModalFechar();
  if (typeof oneFinContaModalAbrir === 'function') oneFinContaModalAbrir();
}
window.oneFinModalNovaConta = oneFinModalNovaConta;

/* Quando despesa + cartão, mostra "Cai na fatura de MM/YYYY" embaixo do select.
   Caso contrário, esconde o preview. */
function oneFinModalAtualizarPreviewFatura() {
  var prev = document.getElementById('one-fin-modal-fatura-preview');
  if (!prev) return;
  var tipo  = window.oneFinModalTipo || 'receita';
  var rec   = window.oneFinModalRecorrencia || 'esporadica';
  var selC  = document.getElementById('one-fin-modal-conta');
  var contaId = selC ? selC.value : '';
  if (tipo !== 'despesa' || !contaId) { prev.style.display = 'none'; return; }
  var conta = oneFinGetConta(contaId);
  if (!conta || conta.tipo !== 'cartao') { prev.style.display = 'none'; return; }
  if (rec === 'fixa') {
    prev.textContent = 'Despesa fixa no cartão: cada mês cai na fatura correspondente.';
    prev.style.display = '';
    return;
  }
  var dataInp = document.getElementById('one-fin-modal-data');
  var dataVal = dataInp ? dataInp.value : '';
  if (!dataVal) { prev.style.display = 'none'; return; }
  var fatura = oneFinCalcularFatura(dataVal, conta.diaFechamento);
  if (!fatura) { prev.style.display = 'none'; return; }
  var partes = fatura.split('-');
  prev.textContent = 'Cai na fatura de ' + partes[1] + '/' + partes[0] + '.';
  prev.style.display = '';
}
window.oneFinModalAtualizarPreviewFatura = oneFinModalAtualizarPreviewFatura;

function oneFinModalNovaCategoria() {
  var tipo = window.oneFinModalTipo || 'receita';
  var nome = prompt('Nome da nova categoria de ' + tipo + ':');
  if (!nome) return;
  if (oneFinAddCategoria(tipo, nome.trim())) {
    oneFinModalRefreshCategorias();
    document.getElementById('one-fin-modal-cat').value = nome.trim();
    if (typeof oneToast === 'function') oneToast('Categoria criada.');
  } else {
    if (typeof oneToast === 'function') oneToast('Categoria já existe ou inválida.', 'error');
  }
}
window.oneFinModalNovaCategoria = oneFinModalNovaCategoria;

function oneFinModalToggleParcelas() {
  var check = document.getElementById('one-fin-modal-parcelar');
  var bloco = document.getElementById('one-fin-modal-parc-bloco');
  if (bloco) bloco.style.display = (check && check.checked) ? '' : 'none';
  if (check && check.checked) {
    /* Quando liga o parcelamento, garante o cálculo inicial baseado no que já tem digitado */
    oneFinModalParcRecalcular('numero');
    /* E vincula listener no campo "Valor da compra" se ainda não estiver vinculado */
    var valorInp = document.getElementById('one-fin-modal-valor');
    if (valorInp && !valorInp.dataset.parcBind) {
      valorInp.addEventListener('input', function(){ oneFinModalParcRecalcular('total'); });
      valorInp.dataset.parcBind = '1';
    }
  }
}
window.oneFinModalToggleParcelas = oneFinModalToggleParcelas;

/* Calculadora simples no campo Valor: avalia expressões aritméticas como
   "100+50+20", "1500-200", "80*3", "(40+60)*2". Aceita vírgula como decimal.
   Bloqueia qualquer caractere que não seja número, operador básico ou parênteses
   (não chega a executar JS arbitrário). */
function oneFinModalValorAvaliar(inp) {
  if (!inp) return;
  var raw = String(inp.value || '').trim();
  if (!raw) return;
  raw = raw.replace(/\s/g, '').replace(/,/g, '.');
  /* Permite apenas dígitos, ponto, +, -, *, /, parênteses */
  if (!/^[0-9.+\-*/()]+$/.test(raw)) return;
  /* Se é só um número, formata e sai */
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    inp.value = parseFloat(raw).toFixed(2);
    if (typeof oneFinModalParcRecalcular === 'function') oneFinModalParcRecalcular('total');
    return;
  }
  try {
    var v = Function('"use strict";return (' + raw + ')')();
    if (typeof v === 'number' && isFinite(v)) {
      inp.value = v.toFixed(2);
      if (typeof oneFinModalParcRecalcular === 'function') oneFinModalParcRecalcular('total');
    }
  } catch (e) { /* deixa como está se der erro */ }
}
window.oneFinModalValorAvaliar = oneFinModalValorAvaliar;

/* Parcelamento — 3 campos vinculados: nº × valor parcela = valor compra.
   fonte = 'numero' | 'total' | 'parcela' indica qual campo o user mexeu.
   Os outros dois recalculam se possível. */
function oneFinModalParcRecalcular(fonte) {
  var check = document.getElementById('one-fin-modal-parcelar');
  if (!check || !check.checked) return;
  var nInp = document.getElementById('one-fin-modal-parc-total');
  var pInp = document.getElementById('one-fin-modal-parc-valor');
  var tInp = document.getElementById('one-fin-modal-valor');
  if (!nInp || !pInp || !tInp) return;
  var n  = parseInt(nInp.value, 10);
  var pv = parseFloat(String(pInp.value).replace(',', '.'));
  var tv = parseFloat(String(tInp.value).replace(',', '.'));
  if (fonte === 'parcela' && n > 0 && !isNaN(pv) && pv > 0) {
    /* Veio valor da parcela → recalcula valor da compra */
    tInp.value = (n * pv).toFixed(2);
  } else if ((fonte === 'numero' || fonte === 'total') && n > 0 && !isNaN(tv) && tv > 0) {
    /* Veio nº ou total → recalcula valor da parcela */
    pInp.value = (tv / n).toFixed(2);
  }
}
window.oneFinModalParcRecalcular = oneFinModalParcRecalcular;

function oneFinModalSetRecorrencia(rec) {
  window.oneFinModalRecorrencia = rec;
  var tabEsp = document.getElementById('one-fin-modal-tab-esp');
  var tabFix = document.getElementById('one-fin-modal-tab-fix');
  if (tabEsp) tabEsp.classList.toggle('active', rec === 'esporadica');
  if (tabFix) tabFix.classList.toggle('active', rec === 'fixa');

  var ehFixa = (rec === 'fixa');
  var setDisplay = function(id, show) {
    var el = document.getElementById(id);
    if (el) el.style.display = show ? '' : 'none';
  };
  setDisplay('one-fin-modal-data-wrap',   !ehFixa);
  setDisplay('one-fin-modal-dia-wrap',     ehFixa);
  setDisplay('one-fin-modal-inicio-wrap',  ehFixa);
  setDisplay('one-fin-modal-parc-wrap',   !ehFixa);
  if (typeof oneFinModalAtualizarPreviewFatura === 'function') oneFinModalAtualizarPreviewFatura();
}
window.oneFinModalSetRecorrencia = oneFinModalSetRecorrencia;

function oneFinModalAbrir(tipoInicial) {
  var modal = document.getElementById('one-fin-modal');
  if (!modal) return;
  oneFinModalPreencherDias();

  document.getElementById('one-fin-modal-title').textContent = 'Novo lançamento';
  document.getElementById('one-fin-modal-id').value         = '';
  document.getElementById('one-fin-modal-lote-id').value    = '';
  document.getElementById('one-fin-modal-nome').value       = '';
  document.getElementById('one-fin-modal-valor').value      = '';
  document.getElementById('one-fin-modal-data').value       = new Date().toISOString().slice(0,10);
  document.getElementById('one-fin-modal-inicio').value     = new Date().toISOString().slice(0,7);
  document.getElementById('one-fin-modal-dia').value        = '5';
  document.getElementById('one-fin-modal-status').value     = 'pendente';
  document.getElementById('one-fin-modal-parcelar').checked = false;
  document.getElementById('one-fin-modal-parc-total').value = '2';
  var parcVal = document.getElementById('one-fin-modal-parc-valor');
  if (parcVal) parcVal.value = '';
  document.getElementById('one-fin-modal-parc-intervalo').value = 'mensal';

  oneFinModalSetTipo(tipoInicial || 'receita');
  oneFinModalSetRecorrencia('esporadica');
  oneFinModalToggleParcelas();

  /* Botão excluir: escondido em novo lançamento */
  var btnDel = document.getElementById('one-fin-modal-btn-excluir');
  if (btnDel) btnDel.style.display = 'none';

  /* Listener da data atualiza preview da fatura (idempotente) */
  var dataInp = document.getElementById('one-fin-modal-data');
  if (dataInp && !dataInp.dataset.bindFatura) {
    dataInp.addEventListener('change', oneFinModalAtualizarPreviewFatura);
    dataInp.dataset.bindFatura = '1';
  }

  modal.classList.add('open');
  setTimeout(function(){ document.getElementById('one-fin-modal-nome').focus(); }, 100);
}
window.oneFinModalAbrir = oneFinModalAbrir;

function oneFinModalEditar(key, id) {
  /* Zera gancho de "só este mês" ao abrir qualquer edição normal. O fluxo de
     override (oneFinEditar escopo 'esta') re-seta o gancho DEPOIS desta chamada. */
  window.__oneFinFixaValorMes = null;
  var lista = JSON.parse(localStorage.getItem(oneU(key)) || '[]');
  var it = lista.find(function(x){ return String(x.id) === String(id); });
  if (!it) return;
  var modal = document.getElementById('one-fin-modal');
  if (!modal) return;
  oneFinModalPreencherDias();

  var ehFixa   = (key === 'despesasFixas' || key === 'receitasFixas');
  var tipoLanc = (key === 'receitas' || key === 'receitasFixas') ? 'receita' : 'despesa';

  document.getElementById('one-fin-modal-title').textContent = 'Editar lançamento';
  document.getElementById('one-fin-modal-id').value      = it.id;
  document.getElementById('one-fin-modal-lote-id').value = it.loteId || '';
  document.getElementById('one-fin-modal-nome').value    = it.nome || it.descricao || '';
  document.getElementById('one-fin-modal-valor').value   = it.valor || '';
  document.getElementById('one-fin-modal-data').value    = it.data || new Date().toISOString().slice(0,10);
  document.getElementById('one-fin-modal-inicio').value  = it.inicio || new Date().toISOString().slice(0,7);
  document.getElementById('one-fin-modal-dia').value     = String(it.diaDoMes || 5);
  document.getElementById('one-fin-modal-status').value  = it.status || (tipoLanc === 'receita' ? 'pendente' : 'pago');
  document.getElementById('one-fin-modal-parcelar').checked = false;

  oneFinModalSetTipo(tipoLanc);
  var catVal = it.categoria || '';
  if (catVal) {
    var catSel = document.getElementById('one-fin-modal-cat');
    if (catSel && !catSel.querySelector('option[value="' + catVal.replace(/"/g, '\\"') + '"]')) {
      oneFinAddCategoria(tipoLanc, catVal);
      oneFinModalRefreshCategorias();
    }
    if (catSel) catSel.value = catVal;
  }
  /* Carrega contaId no select (se a conta ainda existir) */
  var contaSel = document.getElementById('one-fin-modal-conta');
  if (contaSel && it.contaId) {
    var existe = Array.prototype.some.call(contaSel.options, function(op){ return op.value === String(it.contaId); });
    if (existe) contaSel.value = String(it.contaId);
  }
  oneFinModalSetRecorrencia(ehFixa ? 'fixa' : 'esporadica');
  oneFinModalToggleParcelas();

  var dataInp = document.getElementById('one-fin-modal-data');
  if (dataInp && !dataInp.dataset.bindFatura) {
    dataInp.addEventListener('change', oneFinModalAtualizarPreviewFatura);
    dataInp.dataset.bindFatura = '1';
  }
  oneFinModalAtualizarPreviewFatura();

  /* Botão excluir disponível em edição */
  var btnDel = document.getElementById('one-fin-modal-btn-excluir');
  if (btnDel) btnDel.style.display = '';

  modal.classList.add('open');
  setTimeout(function(){ document.getElementById('one-fin-modal-nome').focus(); }, 100);
}
window.oneFinModalEditar = oneFinModalEditar;

function oneFinModalFechar() {
  var modal = document.getElementById('one-fin-modal');
  if (modal) modal.classList.remove('open');
  /* Limpa ganchos temporários pra não vazar pro próximo lançamento editado
     (ex.: fechar/cancelar o modal de "só este mês" sem salvar). */
  window.__oneFinFixaValorMes = null;
}
window.oneFinModalFechar = oneFinModalFechar;

/* Excluir lançamento direto do modal de edição.
   Identifica chave pela recorrência e tipo atuais do modal. */
function oneFinModalExcluir() {
  var id = document.getElementById('one-fin-modal-id').value;
  if (!id) return;
  var tipo = window.oneFinModalTipo || 'receita';
  var rec  = window.oneFinModalRecorrencia || 'esporadica';
  var key;
  if (rec === 'fixa') {
    key = (tipo === 'receita') ? 'receitasFixas' : 'despesasFixas';
  } else {
    key = (tipo === 'receita') ? 'receitas' : 'despesas';
  }
  oneFinModalFechar();
  if (typeof oneFinExcluir === 'function') oneFinExcluir(key, id);
}
window.oneFinModalExcluir = oneFinModalExcluir;

function oneFinModalSetTipo(tipo) {
  window.oneFinModalTipo = tipo;
  var tabRec  = document.getElementById('one-fin-modal-tab-rec');
  var tabDesp = document.getElementById('one-fin-modal-tab-desp');
  if (tabRec)  tabRec.classList.toggle('active',  tipo === 'receita');
  if (tabDesp) tabDesp.classList.toggle('active', tipo === 'despesa');

  var sel = document.getElementById('one-fin-modal-status');
  if (sel) {
    sel.innerHTML = (tipo === 'receita')
      ? '<option value="pendente">Pendente</option><option value="pago">Recebido</option>'
      : '<option value="pendente">Pendente</option><option value="pago">Pago</option>';
  }
  oneFinModalRefreshCategorias();
  oneFinModalRefreshContas();
}
window.oneFinModalSetTipo = oneFinModalSetTipo;

function oneFinModalSalvar() {
  var id      = document.getElementById('one-fin-modal-id').value;
  var nome    = (document.getElementById('one-fin-modal-nome').value || '').trim();
  var rawValor = String(document.getElementById('one-fin-modal-valor').value || '').replace(',', '.');
  var valor   = parseFloat(rawValor) || 0;
  var cat     = (document.getElementById('one-fin-modal-cat').value || '').trim();
  var status  = document.getElementById('one-fin-modal-status').value;
  var tipo    = window.oneFinModalTipo || 'receita';
  var rec     = window.oneFinModalRecorrencia || 'esporadica';
  var contaId = (document.getElementById('one-fin-modal-conta').value || '').trim();

  if (!nome || !valor) {
    if (typeof oneToast === 'function') oneToast('Preencha descrição e valor.', 'error');
    return;
  }

  /* ─── Override de valor "só este mês" ───
     Gancho setado por oneFinEditar (escopo 'esta'): grava o valor SÓ no
     mês escolhido (valorPorMes do molde), sem criar avulso nem alterar o
     valor-base da fixa. Curto-circuita o fluxo normal de salvar. */
  var ovrMes = window.__oneFinFixaValorMes;
  if (ovrMes && ovrMes.key && ovrMes.fixaId && ovrMes.mesAno) {
    window.__oneFinFixaValorMes = null;
    if (typeof oneFinFixaSetValorNoMes === 'function') {
      oneFinFixaSetValorNoMes(ovrMes.key, ovrMes.fixaId, ovrMes.mesAno, valor);
    }
    oneFinModalFechar();
    if (typeof oneToast === 'function') oneToast('✓ Valor de ' + ovrMes.mesAno + ' ajustado (só este mês).');
    if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
    if (typeof renderDesktopSidebar === 'function') renderDesktopSidebar();
    if (typeof oneFinRenderContas === 'function') oneFinRenderContas();
    if (typeof oneFinRenderFixas === 'function') oneFinRenderFixas();
    return;
  }

  if (!contaId) {
    if (typeof oneToast === 'function') oneToast('Escolha uma conta. Se ainda não tem, clica em + Nova.', 'error');
    return;
  }
  var contaSel = oneFinGetConta(contaId);
  if (!contaSel) {
    if (typeof oneToast === 'function') oneToast('Conta inválida.', 'error');
    return;
  }
  if (tipo === 'receita' && contaSel.tipo !== 'banco') {
    if (typeof oneToast === 'function') oneToast('Receita só entra em conta tipo banco.', 'error');
    return;
  }
  var ehCartao = (contaSel.tipo === 'cartao');

  var uid = function() { return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).slice(2,8); };

  if (rec === 'fixa') {
    /* ─── Fixa: vai pra receitasFixas ou despesasFixas ─── */
    var keyF = (tipo === 'receita') ? 'receitasFixas' : 'despesasFixas';
    var diaDoMes = parseInt(document.getElementById('one-fin-modal-dia').value, 10) || 5;
    var inicio   = document.getElementById('one-fin-modal-inicio').value || new Date().toISOString().slice(0,7);
    var listaF = JSON.parse(localStorage.getItem(oneU(keyF)) || '[]');
    var objF;
    if (id) {
      var idxF = listaF.findIndex(function(x){ return String(x.id) === String(id); });
      if (idxF >= 0) {
        objF = Object.assign(listaF[idxF], {
          nome: nome, descricao: nome, valor: valor, categoria: cat,
          tipo: tipo, recorrencia: 'fixa', diaDoMes: diaDoMes, inicio: inicio,
          contaId: contaId
        });
      }
    } else {
      objF = {
        id: uid(), nome: nome, descricao: nome, valor: valor, categoria: cat,
        tipo: tipo, recorrencia: 'fixa', diaDoMes: diaDoMes, inicio: inicio,
        contaId: contaId,
        criado: new Date().toISOString()
      };
      listaF.push(objF);
    }
    localStorage.setItem(oneU(keyF), JSON.stringify(listaF));
    if (typeof supaUpsert === 'function' && objF) supaUpsert(keyF, objF);

  } else {
    /* ─── Esporádica: vai pra receitas ou despesas ─── */
    var keyE   = (tipo === 'receita') ? 'receitas' : 'despesas';
    var data   = document.getElementById('one-fin-modal-data').value || new Date().toISOString().slice(0,10);
    var listaE = JSON.parse(localStorage.getItem(oneU(keyE)) || '[]');

    var parcelar   = document.getElementById('one-fin-modal-parcelar').checked;
    var parcTotal  = parseInt(document.getElementById('one-fin-modal-parc-total').value, 10) || 1;
    var parcInterv = document.getElementById('one-fin-modal-parc-intervalo').value;

    var faturaPara = function(dataStr) {
      return ehCartao ? oneFinCalcularFatura(dataStr, contaSel.diaFechamento) : null;
    };

    if (id) {
      /* Edição: trata como lançamento único (não recriamos parcelas) */
      var idxE = listaE.findIndex(function(x){ return String(x.id) === String(id); });
      if (idxE >= 0) {
        var objE = Object.assign(listaE[idxE], {
          nome: nome, descricao: nome, valor: valor, data: data, categoria: cat,
          tipo: tipo, recorrencia: 'esporadica',
          status: (tipo === 'receita') ? status : (status || 'pago'),
          contaId: contaId,
          faturaMesAno: faturaPara(data)
        });
        localStorage.setItem(oneU(keyE), JSON.stringify(listaE));
        if (typeof supaUpsert === 'function') supaUpsert(keyE, objE);

        /* Propagação de lote (escopo "proximas" ou "todas") — set pelo
           oneFinEditar antes de abrir o modal. Aplica os mesmos campos
           nas outras parcelas. Pra data, calcula o delta em dias entre
           a data original (dataRef, guardada no escopo) e a data nova
           (data salva agora), e aplica esse mesmo delta nas outras —
           preservando o espaçamento original entre parcelas. */
        var escopoLote = window.__oneFinLoteEscopo;
        window.__oneFinLoteEscopo = null;
        if (escopoLote && escopoLote.loteId && (escopoLote.escopo === 'proximas' || escopoLote.escopo === 'todas')) {
          var nomeBase = String(nome).replace(/\s+\d+\s*\/\s*\d+\s*$/, '');
          var dataRef = escopoLote.dataRef || '';
          /* Calcula deltaDias entre dataRef (original) e data (nova salva).
             Se data não mudou, delta=0 → não mexe nas datas das outras. */
          var deltaDias = 0;
          if (dataRef && data && dataRef !== data) {
            var dOrig = new Date(dataRef + 'T00:00:00');
            var dNova = new Date(data + 'T00:00:00');
            if (!isNaN(dOrig.getTime()) && !isNaN(dNova.getTime())) {
              deltaDias = Math.round((dNova.getTime() - dOrig.getTime()) / 86400000);
            }
          }
          var n = 0;
          listaE.forEach(function(it, idx){
            if (!it || String(it.loteId) !== String(escopoLote.loteId)) return;
            if (String(it.id) === String(id)) return;            /* o item editado já foi */
            if (escopoLote.escopo === 'proximas' && (it.data || '') < dataRef) return;
            /* Reconstroi nome com sufixo N/M se a parcela tem essa info */
            var nomeNovo = (it.parcelaAtual && it.parcelasTotal)
              ? (nomeBase + ' ' + it.parcelaAtual + '/' + it.parcelasTotal)
              : nomeBase;
            /* Calcula data nova da parcela aplicando deltaDias (se houver) */
            var dataParcelaNova = it.data;
            if (deltaDias !== 0 && it.data) {
              var dIt = new Date(it.data + 'T00:00:00');
              if (!isNaN(dIt.getTime())) {
                dIt.setDate(dIt.getDate() + deltaDias);
                dataParcelaNova = dIt.toISOString().slice(0,10);
              }
            }
            var atualizado = Object.assign(it, {
              nome: nomeNovo, descricao: nomeNovo,
              valor: valor, categoria: cat,
              tipo: tipo,
              data: dataParcelaNova,
              status: it.status,                                  /* status fica individual */
              contaId: contaId,
              faturaMesAno: faturaPara(dataParcelaNova)
            });
            listaE[idx] = atualizado;
            if (typeof supaUpsert === 'function') supaUpsert(keyE, atualizado);
            n++;
          });
          if (n > 0) {
            localStorage.setItem(oneU(keyE), JSON.stringify(listaE));
            if (typeof oneToast === 'function') {
              var msgShift = (deltaDias !== 0) ? (' (datas deslocadas ' + (deltaDias > 0 ? '+' : '') + deltaDias + ' dias)') : '';
              oneToast('✓ ' + (n+1) + ' parcelas atualizadas' + msgShift + '.');
            }
          }
        }
      }
    } else if (parcelar && parcTotal >= 2) {
      /* Gera N parcelas vinculadas por loteId */
      var loteNovoId = uid();
      var valorParc  = Math.round((valor / parcTotal) * 100) / 100;
      var dataBase   = new Date(data + 'T00:00:00');
      for (var i = 1; i <= parcTotal; i++) {
        var d = new Date(dataBase);
        if (parcInterv === 'mensal')    d.setMonth(d.getMonth() + (i - 1));
        if (parcInterv === 'semanal')   d.setDate(d.getDate() + (i - 1) * 7);
        if (parcInterv === 'quinzenal') d.setDate(d.getDate() + (i - 1) * 15);
        var pData = d.toISOString().slice(0,10);
        var objP = {
          id: uid(),
          nome: nome + ' ' + i + '/' + parcTotal,
          descricao: nome + ' ' + i + '/' + parcTotal,
          valor: valorParc, data: pData, categoria: cat,
          tipo: tipo, recorrencia: 'esporadica',
          loteId: loteNovoId, parcelaAtual: i, parcelasTotal: parcTotal,
          status: 'pendente',
          contaId: contaId,
          faturaMesAno: faturaPara(pData),
          criado: new Date().toISOString()
        };
        listaE.push(objP);
        if (typeof supaUpsert === 'function') supaUpsert(keyE, objP);
      }
      localStorage.setItem(oneU(keyE), JSON.stringify(listaE));
    } else {
      /* Lançamento único esporádico (comportamento clássico) */
      var objU = {
        id: uid(), nome: nome, descricao: nome, valor: valor, data: data, categoria: cat,
        tipo: tipo, recorrencia: 'esporadica',
        status: (tipo === 'receita') ? status : (status || 'pago'),
        contaId: contaId,
        faturaMesAno: faturaPara(data),
        criado: new Date().toISOString()
      };
      listaE.push(objU);
      localStorage.setItem(oneU(keyE), JSON.stringify(listaE));
      if (typeof supaUpsert === 'function') supaUpsert(keyE, objU);
    }
  }

  oneFinModalFechar();
  if (typeof oneToast === 'function') oneToast('✓ Lançamento salvo!');
  if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
  if (typeof renderDesktopSidebar === 'function') renderDesktopSidebar();
  if (typeof oneFinRenderContas === 'function') oneFinRenderContas();
}
window.oneFinModalSalvar = oneFinModalSalvar;

/* ════════════════════════════════════════════════════════════════
   VISTAS INLINE NO PAINEL FINANCEIRO — Extrato | Categorias | Balanço
   ════════════════════════════════════════════════════════════════ */
window.oneFinVistaAtiva = window.oneFinVistaAtiva || 'geral';
window.oneFinInlineTipo = window.oneFinInlineTipo || 'despesas';
window.oneFinInlineCharts = window.oneFinInlineCharts || { donut: null, bars: null };

function oneFinSetVista(vista) {
  window.oneFinVistaAtiva = vista;
  document.querySelectorAll('.one-fin-vista-tab').forEach(function(t){
    t.classList.toggle('active', t.getAttribute('data-vista') === vista);
  });
  document.querySelectorAll('.one-desktop-financeiro .one-fin-vista').forEach(function(v){
    v.hidden = v.getAttribute('data-vista') !== vista;
  });
  // Render apropriado pra cada vista
  if (vista === 'geral') {
    oneFinRenderGeral();
  } else if (vista === 'resumo') {
    if (typeof oneFinRenderResumo === 'function') oneFinRenderResumo();
  } else if (vista === 'dashboard') {
    if (typeof Chart === 'undefined') setTimeout(oneFinRenderCategorias, 200);
    else oneFinRenderCategorias();
  } else if (vista === 'extrato') {
    if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
  } else if (vista === 'contas') {
    if (typeof oneFinRenderContas === 'function') oneFinRenderContas();
  } else if (vista === 'fixas') {
    if (typeof oneFinRenderFixas === 'function') oneFinRenderFixas();
  }
}
window.oneFinSetVista = oneFinSetVista;

/* ════════════════════════════════════════════════════════════════
   ABA FIXAS — visão por mês de receitas e despesas fixas
   Navegação com setas (offset relativo ao mês ativo do app),
   sumário (entradas / saídas / saldo fixo), despesas em cima,
   receitas embaixo. Cada linha tem ✏️ 🗑️ + click no corpo abre
   ficha individual (fase 2).
   ════════════════════════════════════════════════════════════════ */
/* Fixas usa o mesmo mês ativo do header estático (oneFinMesAtivo/oneFinAnoAtivo).
   A navegação interna foi removida — quando o usuário troca o mês no header,
   o render das Fixas reflete automaticamente. */
function oneFinFixasMesAtivo() {
  var m = (typeof window.oneFinMesAtivo === 'number') ? window.oneFinMesAtivo : new Date().getMonth();
  var a = (typeof window.oneFinAnoAtivo === 'number') ? window.oneFinAnoAtivo : new Date().getFullYear();
  return { mes: m, ano: a, offset: 0 };
}

function _oneFinFixaLinhaHtml(item) {
  /* item: { tipo:'in'|'out', key, id, nome, valor, dia, contaId, categoria, status, dataInstancia } */
  var cat = (typeof oneFinCatIcon === 'function') ? oneFinCatIcon(item.categoria) : { emoji:'💸', cor:'#6B7F6F', bg:'#F2F6F1' };
  var sinal = item.tipo === 'in' ? '+' : '-';
  var nome = (item.nome||'').replace(/</g,'&lt;');
  var conta = (typeof oneFinGetConta === 'function' && item.contaId) ? oneFinGetConta(item.contaId) : null;
  var contaLabel = conta ? conta.nome : 'Sem conta';
  var diaTxt = item.dia ? ('Dia ' + item.dia) : '';
  var sub = [diaTxt, contaLabel].filter(Boolean).join(' · ');
  var statusBadge = '';
  if (item.status === 'pago') {
    statusBadge = '<span class="one-fin-fixa-badge ok">pago</span>';
  } else if (item.status === 'atrasado') {
    statusBadge = '<span class="one-fin-fixa-badge late">atrasado</span>';
  } else {
    statusBadge = '<span class="one-fin-fixa-badge pend">pendente</span>';
  }
  var safeId = String(item.id||'').replace(/'/g,"\\'");
  var safeKey = String(item.key||'');
  var safeData = String(item.dataInstancia || '').replace(/'/g,"\\'");
  return '<div class="one-fin-fixa-item" onclick="oneFinFixaAbrir(\'' + safeKey + '\',\'' + safeId + '\')">' +
           '<div class="one-fin-fixa-ico" style="background:' + cat.bg + ';color:' + cat.cor + '">' + cat.emoji + '</div>' +
           '<div class="one-fin-fixa-body">' +
             '<div class="one-fin-fixa-nome">' + nome + '</div>' +
             '<div class="one-fin-fixa-meta">' + sub + '</div>' +
           '</div>' +
           '<div class="one-fin-fixa-val ' + (item.tipo==='in'?'in':'out') + '">' + sinal + _oneFinBrlDet(item.valor) + '</div>' +
           statusBadge +
           '<div class="one-fin-fixa-actions" onclick="event.stopPropagation()">' +
             '<button class="one-fin-item-btn" onclick="oneFinEditar(\'' + safeKey + '\',\'' + safeId + '\',\'' + safeData + '\')" title="Editar">✏️</button>' +
             '<button class="one-fin-item-btn del" onclick="oneFinExcluir(\'' + safeKey + '\',\'' + safeId + '\',\'' + safeData + '\')" title="Excluir">🗑️</button>' +
           '</div>' +
         '</div>';
}

function oneFinFixaAbrir(key, id) {
  /* Ficha individual da fixa — modal com timeline mês a mês.
     Implementação na Fase 2. Por enquanto cai no modal de edição padrão. */
  if (typeof oneFinModalEditar === 'function') oneFinModalEditar(key, id);
}
window.oneFinFixaAbrir = oneFinFixaAbrir;

function oneFinRenderFixas() {
  var ctx = oneFinFixasMesAtivo();

  /* Instâncias do mês: usa o pipeline já existente (oneFinInstanciasDoMes) */
  var inst = (typeof oneFinInstanciasDoMes === 'function')
                ? oneFinInstanciasDoMes(ctx.mes, ctx.ano)
                : { receitas: [], despesas: [] };

  var despesas = (inst.despesas || []).map(function(d){
    return { tipo:'out', key:'despesasFixas', id:d._fixaId, nome:d.nome,
             valor:Number(d.valor)||0, dia:d.diaDoMes || (d.data ? parseInt(d.data.split('-')[2],10) : null),
             contaId:d.contaId, categoria:d.categoria||'',
             status:d.status || 'pendente', dataInstancia: d.data || '' };
  });
  var receitas = (inst.receitas || []).map(function(r){
    return { tipo:'in', key:'receitasFixas', id:r._fixaId, nome:r.nome,
             valor:Number(r.valor)||0, dia:r.diaDoMes || (r.data ? parseInt(r.data.split('-')[2],10) : null),
             contaId:r.contaId, categoria:r.categoria||'',
             status:r.status || 'pendente', dataInstancia: r.data || '' };
  });

  var totalEnt = receitas.reduce(function(s,i){ return s+i.valor; }, 0);
  var totalSai = despesas.reduce(function(s,i){ return s+i.valor; }, 0);
  var saldoFixo = totalEnt - totalSai;

  /* Resumo do topo */
  var resumo = document.getElementById('one-fin-fixas-resumo');
  if (resumo) {
    resumo.innerHTML =
      '<div class="one-fin-fixas-card"><span class="one-fin-fixas-card-lbl">Entradas fixas</span><span class="one-fin-fixas-card-val in">+' + _oneFinBrlDet(totalEnt) + '</span></div>' +
      '<div class="one-fin-fixas-card"><span class="one-fin-fixas-card-lbl">Saídas fixas</span><span class="one-fin-fixas-card-val out">-' + _oneFinBrlDet(totalSai) + '</span></div>' +
      '<div class="one-fin-fixas-card"><span class="one-fin-fixas-card-lbl">Saldo fixo</span><span class="one-fin-fixas-card-val ' + (saldoFixo>=0?'in':'out') + '">' + (saldoFixo>=0?'+':'') + _oneFinBrlDet(saldoFixo) + '</span></div>';
  }

  /* Corpo: 2 colunas (Receitas | Despesas), mesmo padrão visual do Extrato.
     Cada item segue editável via clique (modal de edição) e botões ✏️ 🗑️. */
  var setText3 = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };

  var elRec  = document.getElementById('one-fin-fixas-rec-body');
  if (elRec) {
    elRec.innerHTML = receitas.length
      ? receitas.map(_oneFinFixaLinhaHtml).join('')
      : '<div class="one-fin-extrato-vazio">Nenhuma receita fixa cadastrada</div>';
  }
  setText3('one-fin-fixas-rec-cnt',  receitas.length + (receitas.length === 1 ? ' fixa' : ' fixas'));
  setText3('one-fin-fixas-rec-soma', _oneFinBrlDet(totalEnt));

  var elDesp = document.getElementById('one-fin-fixas-desp-body');
  if (elDesp) {
    elDesp.innerHTML = despesas.length
      ? despesas.map(_oneFinFixaLinhaHtml).join('')
      : '<div class="one-fin-extrato-vazio">Nenhuma despesa fixa cadastrada</div>';
  }
  setText3('one-fin-fixas-desp-cnt',  despesas.length + (despesas.length === 1 ? ' fixa' : ' fixas'));
  setText3('one-fin-fixas-desp-soma', _oneFinBrlDet(totalSai));

  /* ── Espelha as Fixas pro slide mobile (pill Fixas, colunas empilhadas) ── */
  var _fResumo = document.getElementById('one-fin-mob-fixas-resumo');
  if (_fResumo && resumo) _fResumo.innerHTML = resumo.innerHTML;
  var _fRec = document.getElementById('one-fin-mob-fixas-rec-body');
  if (_fRec && elRec) _fRec.innerHTML = elRec.innerHTML;
  var _fDesp = document.getElementById('one-fin-mob-fixas-desp-body');
  if (_fDesp && elDesp) _fDesp.innerHTML = elDesp.innerHTML;
  setText3('one-fin-mob-fixas-rec-cnt',  receitas.length + (receitas.length === 1 ? ' fixa' : ' fixas'));
  setText3('one-fin-mob-fixas-rec-soma', _oneFinBrlDet(totalEnt));
  setText3('one-fin-mob-fixas-desp-cnt', despesas.length + (despesas.length === 1 ? ' fixa' : ' fixas'));
  setText3('one-fin-mob-fixas-desp-soma', _oneFinBrlDet(totalSai));
}
window.oneFinRenderFixas = oneFinRenderFixas;

/* ════════════════════════════════════════════════════════════════
   ABA RESUMO — espelho da planilha mestre do Mentor
   Bloco 1: Caixa do mês (saldo, pagamentos, resultado, investimentos, patrimônio).
   Bloco 2: Obrigações do mês (fixas + faturas) com checkbox "pago".
   Bloco 3: Investimentos (contas tipo "investimento").
   ════════════════════════════════════════════════════════════════ */
function _oneFinResumoBrl(v) {
  return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* Saldo somado de todas as contas tipo banco (no momento atual) */
function _oneFinResumoSaldoEmContas() {
  var contas = (typeof oneFinGetContas === 'function') ? oneFinGetContas() : [];
  var total = 0;
  contas.forEach(function(c){
    if (c.tipo === 'banco' && typeof oneFinSaldoBanco === 'function') {
      total += oneFinSaldoBanco(c.id);
    }
  });
  return total;
}

/* Soma total de investimentos */
function _oneFinResumoTotalInvestimentos() {
  var contas = (typeof oneFinGetContas === 'function') ? oneFinGetContas() : [];
  var total = 0;
  contas.forEach(function(c){
    if (c.tipo === 'investimento') total += Number(c.saldo) || 0;
  });
  return total;
}

/* Marca uma fixa como paga no mês (template.mesesPagos) — usado pra receitas fixas */
function oneFinFixaMarcarPagaNoMes(key, fixaId, mesAno, marcar) {
  if (!key || !fixaId || !mesAno) return false;
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU(key)) || '[]'); } catch(e){}
  var idx = lista.findIndex(function(x){ return String(x.id) === String(fixaId); });
  if (idx < 0) return false;
  var fix = lista[idx];
  var pagos = Array.isArray(fix.mesesPagos) ? fix.mesesPagos.slice() : [];
  if (marcar) {
    if (pagos.indexOf(mesAno) < 0) pagos.push(mesAno);
  } else {
    pagos = pagos.filter(function(m){ return m !== mesAno; });
  }
  fix.mesesPagos = pagos;
  lista[idx] = fix;
  localStorage.setItem(oneU(key), JSON.stringify(lista));
  if (typeof supaUpsert === 'function') supaUpsert(key, fix);
  return true;
}
window.oneFinFixaMarcarPagaNoMes = oneFinFixaMarcarPagaNoMes;

/* Marca uma conta tipo banco como fechada/quitada no mês.
   Todas as despesas e fixas que saem dessa conta no mês ficam consideradas pagas. */
function oneFinBancoFecharMes(contaId, mesAno, marcar) {
  if (!contaId || !mesAno) return false;
  var contas = []; try { contas = JSON.parse(localStorage.getItem(oneU('contas')) || '[]'); } catch(e){}
  var idx = contas.findIndex(function(c){ return String(c.id) === String(contaId); });
  if (idx < 0) return false;
  var c = contas[idx];
  var fechados = Array.isArray(c.mesesFechados) ? c.mesesFechados.slice() : [];
  if (marcar) {
    if (fechados.indexOf(mesAno) < 0) fechados.push(mesAno);
  } else {
    fechados = fechados.filter(function(m){ return m !== mesAno; });
  }
  c.mesesFechados = fechados;
  contas[idx] = c;
  localStorage.setItem(oneU('contas'), JSON.stringify(contas));
  if (typeof supaUpsert === 'function') supaUpsert('contas', c);
  return true;
}
window.oneFinBancoFecharMes = oneFinBancoFecharMes;

/* Marca uma fatura de cartão como paga (conta.faturasPagas) e, opcionalmente,
   registra qual conta-banco pagou e quanto, em faturasPagasDetalhe[mesAno] =
   { contaId, valor, data }. Esse detalhe é usado por oneFinSaldoBanco pra
   descontar do saldo do banco que pagou. */
function oneFinCartaoMarcarFaturaPaga(contaId, mesAno, marcar, contaOrigemId, valorPago) {
  if (!contaId || !mesAno) return false;
  var contas = []; try { contas = JSON.parse(localStorage.getItem(oneU('contas')) || '[]'); } catch(e){}
  var idx = contas.findIndex(function(c){ return String(c.id) === String(contaId); });
  if (idx < 0) return false;
  var c = contas[idx];
  var pagos = Array.isArray(c.faturasPagas) ? c.faturasPagas.slice() : [];
  var detalhe = (c.faturasPagasDetalhe && typeof c.faturasPagasDetalhe === 'object') ? Object.assign({}, c.faturasPagasDetalhe) : {};
  if (marcar) {
    if (pagos.indexOf(mesAno) < 0) pagos.push(mesAno);
    if (contaOrigemId) {
      detalhe[mesAno] = {
        contaId: contaOrigemId,
        valor: Number(valorPago) || 0,
        data: new Date().toISOString().slice(0,10)
      };
    }
  } else {
    pagos = pagos.filter(function(m){ return m !== mesAno; });
    delete detalhe[mesAno];
  }
  c.faturasPagas = pagos;
  c.faturasPagasDetalhe = detalhe;
  contas[idx] = c;
  localStorage.setItem(oneU('contas'), JSON.stringify(contas));
  if (typeof supaUpsert === 'function') supaUpsert('contas', c);

  /* Propaga o status pra TODAS as despesas individuais daquela fatura.
     Marca/desmarca cada despesa como pago + flag _pagoViaFatura pra saber
     que a marcação veio da fatura (e poder reverter sem afetar despesas
     marcadas individualmente). */
  var despesas = []; try { despesas = JSON.parse(localStorage.getItem(oneU('despesas')) || '[]'); } catch(e){}
  var alterada = false;
  despesas.forEach(function(d){
    if (String(d.contaId) !== String(contaId)) return;
    if (d.faturaMesAno !== mesAno) return;
    if (marcar) {
      if ((d.status || '').toLowerCase() !== 'pago') {
        d.status = 'pago';
        d._pagoViaFatura = true;
        alterada = true;
      }
    } else {
      if (d._pagoViaFatura) {
        d.status = 'pendente';
        delete d._pagoViaFatura;
        alterada = true;
      }
    }
  });
  if (alterada) {
    localStorage.setItem(oneU('despesas'), JSON.stringify(despesas));
    if (typeof supaUpsert === 'function') {
      despesas.forEach(function(d){
        if (String(d.contaId) === String(contaId) && d.faturaMesAno === mesAno) {
          supaUpsert('despesas', d);
        }
      });
    }
  }
  return true;
}
window.oneFinCartaoMarcarFaturaPaga = oneFinCartaoMarcarFaturaPaga;

/* ── Modal de pagamento de fatura ───────────────────────────────
   Aberto quando o Mentor clica na bolinha de uma fatura no Resumo.
   Pergunta de qual banco saiu o pagamento e o valor (default = total). */
function oneFinFaturaPagarAbrir(cartaoId, mesAno) {
  var overlay = document.getElementById('one-fin-fatura-pagar-modal');
  if (!overlay) return;
  var cartao = oneFinGetConta(cartaoId);
  if (!cartao) return;
  var totalFatura = (typeof oneFinFaturaAberta === 'function') ? oneFinFaturaAberta(cartaoId) : 0;
  document.getElementById('one-fin-fatura-pagar-cartao-id').value = cartaoId;
  document.getElementById('one-fin-fatura-pagar-mes-ano').value = mesAno;
  document.getElementById('one-fin-fatura-pagar-desc').textContent = (cartao.icone || '💳') + ' ' + cartao.nome + ' — fatura ' + mesAno;
  document.getElementById('one-fin-fatura-pagar-valor').value = totalFatura.toFixed(2);
  /* Popula select com bancos disponíveis (ordenado por saldo desc) */
  var sel = document.getElementById('one-fin-fatura-pagar-conta');
  sel.innerHTML = '';
  var bancos = oneFinGetContas().filter(function(c){ return c.tipo === 'banco'; });
  bancos.sort(function(a,b){
    var sa = (typeof oneFinSaldoBanco === 'function') ? oneFinSaldoBanco(a.id) : 0;
    var sb = (typeof oneFinSaldoBanco === 'function') ? oneFinSaldoBanco(b.id) : 0;
    return sb - sa;
  });
  if (bancos.length === 0) {
    var opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Nenhum banco cadastrado — cadastre em Contas';
    sel.appendChild(opt);
  } else {
    bancos.forEach(function(b){
      var saldo = (typeof oneFinSaldoBanco === 'function') ? oneFinSaldoBanco(b.id) : 0;
      var opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = (b.icone || '🏦') + ' ' + b.nome + '  (saldo: R$ ' + saldo.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ')';
      sel.appendChild(opt);
    });
  }
  overlay.classList.add('open');
}
window.oneFinFaturaPagarAbrir = oneFinFaturaPagarAbrir;

function oneFinFaturaPagarFechar() {
  var overlay = document.getElementById('one-fin-fatura-pagar-modal');
  if (overlay) overlay.classList.remove('open');
}
window.oneFinFaturaPagarFechar = oneFinFaturaPagarFechar;

function oneFinFaturaPagarConfirmar() {
  var cartaoId = document.getElementById('one-fin-fatura-pagar-cartao-id').value;
  var mesAno   = document.getElementById('one-fin-fatura-pagar-mes-ano').value;
  var contaId  = document.getElementById('one-fin-fatura-pagar-conta').value;
  var valor    = parseFloat(document.getElementById('one-fin-fatura-pagar-valor').value) || 0;
  if (!cartaoId || !mesAno) return;
  if (!contaId) {
    if (typeof oneToast === 'function') oneToast('⚠ Cadastre um banco antes de pagar a fatura');
    return;
  }
  oneFinCartaoMarcarFaturaPaga(cartaoId, mesAno, true, contaId, valor);
  oneFinFaturaPagarFechar();
  if (typeof oneFinRenderResumo === 'function') oneFinRenderResumo();
  if (typeof oneToast === 'function') oneToast('✓ Fatura paga — abatido do saldo');
}
window.oneFinFaturaPagarConfirmar = oneFinFaturaPagarConfirmar;

/* Toggle pago via clique na bolinha.
   refs:
     'fixa-d:<fixaId>:<mesAno>'  → fixa despesa: paga 100% ou desfaz (pagoPorMes)
     'fixa-r:<fixaId>:<mesAno>'  → idem pra receita fixa
     'cartao:<contaId>:<mesAno>' → fatura inteira (faturasPagas)
     'desp:<despesaId>:<mesAno>' → despesa esporádica (alterna status pago/pendente)
     'rec:<receitaId>:<mesAno>'  → receita esporádica (idem) */
function oneFinResumoTogglePago(ref) {
  if (!ref) return;
  var p = ref.split(':');
  var kind = p[0], a = p[1], b = p[2];
  if (kind === 'fixa-d' || kind === 'fixa-r') {
    var key = (kind === 'fixa-d') ? 'despesasFixas' : 'receitasFixas';
    var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU(key)) || '[]'); } catch(e){}
    var fix = lista.find(function(x){ return String(x.id) === String(a); });
    if (!fix) return;
    /* Marca pago pelo valor EFETIVO do mês (override se houver), não pela base —
       assim o saldo do banco (que soma pagoPorMes) bate com o que foi pago. */
    var efetivo = (typeof oneFinFixaValorNoMes === 'function') ? oneFinFixaValorNoMes(fix, b) : (Number(fix.valor) || 0);
    var pago = oneFinFixaPagoNoMes(fix, b);
    if (pago >= efetivo && efetivo > 0) {
      oneFinFixaSetPagoNoMes(key, a, b, 0);
    } else {
      oneFinFixaSetPagoNoMes(key, a, b, efetivo);
    }
  } else if (kind === 'cartao') {
    var contas = []; try { contas = JSON.parse(localStorage.getItem(oneU('contas')) || '[]'); } catch(e){}
    var c = contas.find(function(x){ return String(x.id) === String(a); });
    var jaPaga = !!(c && Array.isArray(c.faturasPagas) && c.faturasPagas.indexOf(b) >= 0);
    if (jaPaga) {
      /* Desfaz: remove flag + detalhe → o saldo do banco volta automaticamente */
      oneFinCartaoMarcarFaturaPaga(a, b, false);
    } else {
      /* Abre modal pra perguntar conta de origem + valor antes de marcar */
      if (typeof oneFinFaturaPagarAbrir === 'function') {
        oneFinFaturaPagarAbrir(a, b);
        return; /* Resumo será re-renderizado depois que modal confirmar */
      } else {
        oneFinCartaoMarcarFaturaPaga(a, b, true);
      }
    }
  } else if (kind === 'desp' || kind === 'rec') {
    /* Alterna status de despesa/receita esporádica */
    var keyE = (kind === 'desp') ? 'despesas' : 'receitas';
    var listaE = []; try { listaE = JSON.parse(localStorage.getItem(oneU(keyE)) || '[]'); } catch(e){}
    var idx = listaE.findIndex(function(x){ return String(x.id) === String(a); });
    if (idx < 0) return;
    listaE[idx].status = (listaE[idx].status === 'pago') ? 'pendente' : 'pago';
    localStorage.setItem(oneU(keyE), JSON.stringify(listaE));
    if (typeof supaUpsert === 'function') supaUpsert(keyE, listaE[idx]);
  }
  if (typeof oneFinRenderResumo === 'function') oneFinRenderResumo();
}
window.oneFinResumoTogglePago = oneFinResumoTogglePago;

/* Lápis do Resumo: lança o VALOR EFETIVO de uma fixa naquele mês. Troca a célula
   A Pagar por um input inline; ao confirmar (Enter/blur) grava via
   oneFinResumoSetEfetivo. Esc cancela. Só vale pra fixas (fixa-d/fixa-r). */
function oneFinResumoEditarEfetivo(ref, btn) {
  if (!btn || !ref) return;
  var cell = btn.parentNode;   /* .one-fin-resumo-apagar-cell */
  if (!cell) return;
  var p = String(ref).split(':');
  var kind = p[0], fixaId = p[1], mes = p[2];
  if (kind !== 'fixa-d' && kind !== 'fixa-r') return;
  var key = (kind === 'fixa-r') ? 'receitasFixas' : 'despesasFixas';
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU(key)) || '[]'); } catch(e){}
  var fix = lista.find(function(x){ return String(x.id) === String(fixaId); });
  var atual = (fix && typeof oneFinFixaValorNoMes === 'function') ? oneFinFixaValorNoMes(fix, mes) : (fix ? (Number(fix.valor)||0) : 0);
  cell.innerHTML = '<input class="one-fin-resumo-apagar-input" type="number" step="0.01" min="0" inputmode="decimal" value="' + (Number(atual)||0).toFixed(2) + '" style="width:84px" />';
  var inp = cell.querySelector('input');
  if (!inp) return;
  inp.focus(); inp.select();
  var done = false;
  var salvar = function(){ if (done) return; done = true; oneFinResumoSetEfetivo(ref, inp.value); };
  inp.addEventListener('blur', salvar);
  inp.addEventListener('keydown', function(e){
    if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
    else if (e.key === 'Escape') { done = true; if (typeof oneFinRenderResumo === 'function') oneFinRenderResumo(); }
  });
}
window.oneFinResumoEditarEfetivo = oneFinResumoEditarEfetivo;

/* Grava o valor efetivo do mês no molde (valorPorMes). Vazio ou igual à base
   limpa o override (volta a seguir a previsão). Não cria lançamento avulso. */
function oneFinResumoSetEfetivo(ref, valorEfetivo) {
  if (!ref) return;
  var p = String(ref).split(':');
  var kind = p[0], fixaId = p[1], mes = p[2];
  if (kind !== 'fixa-d' && kind !== 'fixa-r') return;
  var key = (kind === 'fixa-r') ? 'receitasFixas' : 'despesasFixas';
  var raw = String(valorEfetivo == null ? '' : valorEfetivo).trim().replace(',', '.');
  var v = (raw === '') ? 0 : (parseFloat(raw) || 0);
  if (typeof oneFinFixaSetValorNoMes === 'function') oneFinFixaSetValorNoMes(key, fixaId, mes, v);
  if (typeof oneFinRenderResumo === 'function') oneFinRenderResumo();
  if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
  if (typeof renderDesktopSidebar === 'function') renderDesktopSidebar();
}
window.oneFinResumoSetEfetivo = oneFinResumoSetEfetivo;

/* Edita o "A Pagar" de uma linha direto no Resumo (input inline).
   Pra fixa: grava em pagoPorMes do template.
   Pra esporádica: grava valorPago direto na despesa/receita + ajusta status. */
function oneFinResumoSetAPagar(ref, novoAPagar) {
  if (!ref) return;
  var p = ref.split(':');
  var kind = p[0], a = p[1], b = p[2];
  if (kind === 'fixa-d' || kind === 'fixa-r') {
    var key = (kind === 'fixa-d') ? 'despesasFixas' : 'receitasFixas';
    var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU(key)) || '[]'); } catch(e){}
    var fix = lista.find(function(x){ return String(x.id) === String(a); });
    if (!fix) return;
    var esperado = Number(fix.valor) || 0;
    var aPagar = Math.max(Number(novoAPagar) || 0, 0);
    var pago = Math.max(esperado - aPagar, 0);
    oneFinFixaSetPagoNoMes(key, a, b, pago);
  } else if (kind === 'desp' || kind === 'rec') {
    var keyE = (kind === 'desp') ? 'despesas' : 'receitas';
    var listaE = []; try { listaE = JSON.parse(localStorage.getItem(oneU(keyE)) || '[]'); } catch(e){}
    var idx = listaE.findIndex(function(x){ return String(x.id) === String(a); });
    if (idx < 0) return;
    var espE = Number(listaE[idx].valor) || 0;
    var aPagE = Math.max(Number(novoAPagar) || 0, 0);
    var pagoE = Math.max(espE - aPagE, 0);
    listaE[idx].valorPago = pagoE;
    listaE[idx].status = (aPagE === 0 && espE > 0) ? 'pago' : 'pendente';
    localStorage.setItem(oneU(keyE), JSON.stringify(listaE));
    if (typeof supaUpsert === 'function') supaUpsert(keyE, listaE[idx]);
  } else {
    return;
  }
  if (typeof oneFinRenderResumo === 'function') oneFinRenderResumo();
}
window.oneFinResumoSetAPagar = oneFinResumoSetAPagar;

/* Helper: quanto JÁ foi pago de uma fixa num mês específico.
   Retorna 0 se nada foi pago. Usa template.pagoPorMes[mesAno]. */
function oneFinFixaPagoNoMes(template, mesAno) {
  if (!template || !mesAno) return 0;
  var p = template.pagoPorMes;
  if (p && typeof p === 'object' && p[mesAno] != null) return Number(p[mesAno]) || 0;
  return 0;
}
window.oneFinFixaPagoNoMes = oneFinFixaPagoNoMes;

/* Helper: seta quanto foi pago de uma fixa num mês. valorPago>0 grava; valorPago=0 limpa. */
function oneFinFixaSetPagoNoMes(key, fixaId, mesAno, valorPago) {
  if (!key || !fixaId || !mesAno) return false;
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU(key)) || '[]'); } catch(e){}
  var idx = lista.findIndex(function(x){ return String(x.id) === String(fixaId); });
  if (idx < 0) return false;
  var fix = lista[idx];
  if (!fix.pagoPorMes || typeof fix.pagoPorMes !== 'object') fix.pagoPorMes = {};
  if (Number(valorPago) > 0) {
    fix.pagoPorMes[mesAno] = Number(valorPago);
  } else {
    delete fix.pagoPorMes[mesAno];
  }
  lista[idx] = fix;
  localStorage.setItem(oneU(key), JSON.stringify(lista));
  if (typeof supaUpsert === 'function') supaUpsert(key, fix);
  return true;
}
window.oneFinFixaSetPagoNoMes = oneFinFixaSetPagoNoMes;

/* Helper: valor EFETIVO de uma fixa num mês. Se houver override de valor pra
   aquele mês (valorPorMes[mesAno]), usa ele; senão usa o valor-base do molde.
   Espelha o oneFinFixaPagoNoMes — é o coração do "editar só este mês". */
function oneFinFixaValorNoMes(template, mesAno) {
  if (!template) return 0;
  var v = template.valorPorMes;
  if (mesAno && v && typeof v === 'object' && v[mesAno] != null) return Number(v[mesAno]) || 0;
  return Number(template.valor) || 0;
}
window.oneFinFixaValorNoMes = oneFinFixaValorNoMes;

/* Helper: sobrescreve o valor de uma fixa SÓ num mês (override). valor != base
   grava; valor == base (ou nulo) limpa o override (volta a seguir o molde).
   NÃO cria lançamento avulso e NÃO mexe em mesesPulados. */
function oneFinFixaSetValorNoMes(key, fixaId, mesAno, valor) {
  if (!key || !fixaId || !mesAno) return false;
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU(key)) || '[]'); } catch(e){}
  var idx = lista.findIndex(function(x){ return String(x.id) === String(fixaId); });
  if (idx < 0) return false;
  var fix = lista[idx];
  if (!fix.valorPorMes || typeof fix.valorPorMes !== 'object') fix.valorPorMes = {};
  var novo = Number(valor) || 0;
  var base = Number(fix.valor) || 0;
  if (novo > 0 && novo !== base) {
    fix.valorPorMes[mesAno] = novo;
  } else {
    delete fix.valorPorMes[mesAno];   /* igual ao molde → sem override */
  }
  lista[idx] = fix;
  localStorage.setItem(oneU(key), JSON.stringify(lista));
  if (typeof supaUpsert === 'function') supaUpsert(key, fix);
  return true;
}
window.oneFinFixaSetValorNoMes = oneFinFixaSetValorNoMes;

/* ════════════════════════════════════════════════════════════════
   LIMPEZA DOS DUPLICADOS LEGADOS (materialização antiga → override)
   Antes, "editar só este mês" criava um lançamento AVULSO (origemFixaId)
   e pulava o mês no molde. Quando o "pulo" se perdia no sync, sobravam
   PARES: linha projetada do molde + avulso editado. Estas funções:
     • oneFinListarDup()  → READ-ONLY, lista os pares (nada é gravado).
     • oneFinMigrarDup()  → DRY-RUN por padrão; oneFinMigrarDup(true) aplica:
        converte cada avulso em override (valorPorMes[mês] = valor do avulso),
        tira o mês de mesesPulados e APAGA o avulso. Vira UMA linha só.
   Avulsos que mudaram nome/categoria entram como "revisar manual" e NÃO
   são migrados automaticamente.
   ════════════════════════════════════════════════════════════════ */
function _oneFinNormNome(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

function oneFinListarDup() {
  var pares = [['despesas', 'despesasFixas'], ['receitas', 'receitasFixas']];
  var out = [];
  var seen = {};   /* "keyReal:idAvulso" já incluído — dedup entre as 2 passadas */

  function _addCand(keyReal, keyFixa, it, molde, mesAno, motivo) {
    var chave = keyReal + ':' + it.id;
    if (seen[chave]) return;
    var pp = mesAno.split('-'); var aa = parseInt(pp[0],10), mm = parseInt(pp[1],10);
    var temOverride = !!(molde.valorPorMes && typeof molde.valorPorMes === 'object' && molde.valorPorMes[mesAno] != null);
    var projeta = (typeof oneFinFixaAtivaNoMes === 'function') ? oneFinFixaAtivaNoMes(molde, mm - 1, aa) : false;
    /* valor que o molde mostra naquele mês: override se houver, senão a base */
    var valorMoldeMes = temOverride ? (Number(molde.valorPorMes[mesAno]) || 0) : (Number(molde.valor) || 0);
    var nomeMudou = _oneFinNormNome(it.nome || it.descricao) !== _oneFinNormNome(molde.nome || molde.descricao);
    var catMudou  = String(it.categoria || '').trim() !== String(molde.categoria || '').trim();
    seen[chave] = true;
    out.push({
      keyReal: keyReal, keyFixa: keyFixa,
      idAvulso: it.id, fixaId: molde.id,
      nome: it.nome || it.descricao || '(sem nome)', mes: mesAno,
      valorMolde: valorMoldeMes, valorAvulso: Number(it.valor) || 0,
      temOverride: temOverride,
      duplicadoVisivel: !!projeta,
      viaOrigemFixaId: !!it.origemFixaId,
      motivo: motivo,
      revisarManual: !!(nomeMudou || catMudou),
      nomeMudou: !!nomeMudou, catMudou: !!catMudou
    });
  }

  pares.forEach(function(pr) {
    var keyReal = pr[0], keyFixa = pr[1];
    var reais = []; try { reais = JSON.parse(localStorage.getItem(oneU(keyReal)) || '[]'); } catch(e){}
    var fixas = []; try { fixas = JSON.parse(localStorage.getItem(oneU(keyFixa)) || '[]'); } catch(e){}

    function _achaMolde(it) {
      var m = null;
      if (it.origemFixaId) m = fixas.find(function(f){ return String(f.id) === String(it.origemFixaId); });
      if (!m) {
        var nomeN = _oneFinNormNome(it.nome || it.descricao);
        m = fixas.find(function(f){ return _oneFinNormNome(f.nome || f.descricao) === nomeN; });
      }
      return m || null;
    }

    /* PASSADA 1 — avulso → molde (origemFixaId ou nome). Pega o duplicado
       clássico (molde projeta a base + avulso editado) E o caso com override. */
    reais.forEach(function(it) {
      if (!it || it.recorrencia === 'fixa') return;
      var mesAno = _oneFinExtrairMesAno(it.data);
      if (!mesAno) return;
      var molde = _achaMolde(it);
      if (!molde) return;
      var pp = mesAno.split('-'); var aa = parseInt(pp[0],10), mm = parseInt(pp[1],10);
      var temOverride = !!(molde.valorPorMes && molde.valorPorMes[mesAno] != null);
      var projeta = (typeof oneFinFixaAtivaNoMes === 'function') ? oneFinFixaAtivaNoMes(molde, mm - 1, aa) : false;
      /* Match só por nome (sem origemFixaId): exige que o molde cubra o mês —
         projeta OU já tem override — pra não pegar avulsa homônima solta. */
      if (!it.origemFixaId && !projeta && !temOverride) return;
      _addCand(keyReal, keyFixa, it, molde, mesAno,
        it.origemFixaId ? 'origemFixaId' : (temOverride ? 'override+avulso' : 'projeta+avulso'));
    });

    /* PASSADA 2 — molde com override[mes] → avulso órfão no MESMO mês.
       Cobre o caso do Claro Combo: a fixa já tem valorPorMes[mes] (override
       certo), mas sobrou o avulso antigo de mesmo valor. O override cobre o
       mês → o avulso é lixo, e a passada 1 pode não tê-lo casado. */
    fixas.forEach(function(molde) {
      var vpm = molde.valorPorMes;
      if (!vpm || typeof vpm !== 'object') return;
      var nomeMolde = _oneFinNormNome(molde.nome || molde.descricao);
      Object.keys(vpm).forEach(function(mesAno) {
        if (vpm[mesAno] == null) return;
        reais.forEach(function(it) {
          if (!it || it.recorrencia === 'fixa') return;
          if (seen[keyReal + ':' + it.id]) return;
          if (_oneFinExtrairMesAno(it.data) !== mesAno) return;
          var casa = (it.origemFixaId && String(it.origemFixaId) === String(molde.id)) ||
                     (_oneFinNormNome(it.nome || it.descricao) === nomeMolde);
          if (!casa) return;
          _addCand(keyReal, keyFixa, it, molde, mesAno, 'override+avulso');
        });
      });
    });
  });

  try {
    console.table(out.map(function(r){ return {
      conta: r.nome, mes: r.mes,
      molde: r.valorMolde.toFixed(2), avulso: r.valorAvulso.toFixed(2),
      override: r.temOverride, motivo: r.motivo,
      duplicadoVisivel: r.duplicadoVisivel, revisarManual: r.revisarManual
    }; }));
  } catch(e) { console.log(out); }
  console.log('[oneFinListarDup] candidatos:', out.length,
    '| com override:', out.filter(function(r){ return r.temOverride; }).length,
    '| p/ revisão manual:', out.filter(function(r){ return r.revisarManual; }).length);
  window.__oneFinDup = out;
  return out;
}
window.oneFinListarDup = oneFinListarDup;

function oneFinMigrarDup(aplicar) {
  var cands = Array.isArray(window.__oneFinDup) ? window.__oneFinDup : oneFinListarDup();
  var plano   = cands.filter(function(c){ return !c.revisarManual; });
  var revisar = cands.filter(function(c){ return c.revisarManual; });
  console.log('[oneFinMigrarDup]', (aplicar === true ? '⚠ APLICANDO' : 'DRY-RUN (nada gravado)'),
              '— migrar:', plano.length, '| pular p/ revisão:', revisar.length);
  plano.forEach(function(c){
    console.log('  → ' + c.nome + ' ' + c.mes + ': ' +
                (c.temOverride
                  ? ('mantém override=' + c.valorMolde.toFixed(2))
                  : ('cria override=' + c.valorAvulso.toFixed(2))) +
                ' · apaga avulso ' + c.idAvulso +
                (c.duplicadoVisivel ? '' : ' [molde não projetava este mês]'));
  });
  revisar.forEach(function(c){
    console.log('  ⚠ PULADO (revisão manual): ' + c.nome + ' ' + c.mes +
                (c.nomeMudou ? ' [nome mudou]' : '') + (c.catMudou ? ' [categoria mudou]' : ''));
  });
  if (aplicar !== true) {
    console.log('Confira a lista acima. Pra aplicar de verdade: oneFinMigrarDup(true)');
    return { migrar: plano.length, revisar: revisar.length, aplicado: false };
  }
  /* 1) grava overrides nos moldes + remove o mês de mesesPulados */
  [['despesas', 'despesasFixas'], ['receitas', 'receitasFixas']].forEach(function(pr){
    var keyFixa = pr[1];
    var doPlano = plano.filter(function(c){ return c.keyFixa === keyFixa; });
    if (!doPlano.length) return;
    var fixas = []; try { fixas = JSON.parse(localStorage.getItem(oneU(keyFixa)) || '[]'); } catch(e){}
    var tocados = {};
    doPlano.forEach(function(c){
      var idx = fixas.findIndex(function(f){ return String(f.id) === String(c.fixaId); });
      if (idx < 0) return;
      var f = fixas[idx];
      if (!f.valorPorMes || typeof f.valorPorMes !== 'object') f.valorPorMes = {};
      /* Se já existe override pro mês, ele é a fonte da verdade — NÃO sobrescreve.
         Só preenche quando ainda não há, com o valor do avulso (corrigido). */
      if (f.valorPorMes[c.mes] == null) f.valorPorMes[c.mes] = Number(c.valorAvulso) || 0;
      if (Array.isArray(f.mesesPulados)) f.mesesPulados = f.mesesPulados.filter(function(m){ return m !== c.mes; });
      fixas[idx] = f; tocados[f.id] = f;
    });
    localStorage.setItem(oneU(keyFixa), JSON.stringify(fixas));
    Object.keys(tocados).forEach(function(id){ if (typeof supaUpsert === 'function') supaUpsert(keyFixa, tocados[id]); });
  });
  /* 2) apaga os avulsos migrados (local + servidor) */
  ['despesas', 'receitas'].forEach(function(keyReal){
    var ids = {};
    plano.forEach(function(c){ if (c.keyReal === keyReal) ids[c.idAvulso] = true; });
    if (!Object.keys(ids).length) return;
    var lst = []; try { lst = JSON.parse(localStorage.getItem(oneU(keyReal)) || '[]'); } catch(e){}
    lst = lst.filter(function(x){ return !ids[x.id]; });
    localStorage.setItem(oneU(keyReal), JSON.stringify(lst));
    Object.keys(ids).forEach(function(id){ if (typeof supaDelete === 'function') supaDelete(keyReal, id); });
  });
  window.__oneFinDup = null;
  if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
  if (typeof oneFinRenderFixas === 'function') oneFinRenderFixas();
  if (typeof oneFinRenderContas === 'function') oneFinRenderContas();
  console.log('[oneFinMigrarDup] ✓ aplicado:', plano.length, 'migrados. Confira o Extrato/Resumo.');
  return { migrar: plano.length, revisar: revisar.length, aplicado: true };
}
window.oneFinMigrarDup = oneFinMigrarDup;

/* Coleta TODOS os lançamentos programados do mês:
   - Despesas reais (esporádicas) do mês sem fatura (sai direto da conta)
   - Instâncias de despesas fixas do mês sem fatura
   - 1 linha por FATURA de cartão > 0 no mês (agrega despesas reais + fixas em cartão)
   - Receitas reais (esporádicas) do mês
   - Instâncias de receitas fixas do mês
   Esperado = valor previsto. A Pagar = quanto falta (0 se pago). Diferença = pago. */
function _oneFinResumoColetarObrigacoes(mes, ano) {
  var mesAno = ano + '-' + String(mes + 1).padStart(2, '0');
  var out = { despesas: [], receitasFixas: [], faturas: [] };

  var contas = (typeof oneFinGetContas === 'function') ? oneFinGetContas() : [];
  var despesasReais = []; try { despesasReais = JSON.parse(localStorage.getItem(oneU('despesas')) || '[]'); } catch(e){}
  var receitasReais = []; try { receitasReais = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]'); } catch(e){}
  var instDoMes = (typeof oneFinInstanciasDoMes === 'function') ? oneFinInstanciasDoMes(mes, ano) : { despesas: [], receitas: [] };

  var listaDF = []; try { listaDF = JSON.parse(localStorage.getItem(oneU('despesasFixas')) || '[]'); } catch(e){}
  var listaRF = []; try { listaRF = JSON.parse(localStorage.getItem(oneU('receitasFixas')) || '[]'); } catch(e){}

  var noMes = function(d){
    if (!d) return false;
    var p = String(d).split('-');
    return parseInt(p[0],10) === ano && parseInt(p[1],10) === (mes + 1);
  };

  /* Despesas REAIS do mês — esporádicas (incluindo parceladas), sem cartão.
     Filtro de cartão: se a contaId aponta pra um cartão, vai pra fatura agregada
     (independente de faturaMesAno estar preenchido). Cobre o caso de despesas
     órfãs criadas por importador CSV, parcelas antigas ou modal antigo, que
     têm contaId mas não têm faturaMesAno — antes vazavam pra lista individual. */
  despesasReais.forEach(function(d){
    if (!noMes(d.data)) return;
    var conta = d.contaId ? (typeof oneFinGetConta === 'function' && oneFinGetConta(d.contaId)) : null;
    if (conta && conta.tipo === 'cartao') return; /* vai pra fatura do cartão */
    if (d.faturaMesAno) return; /* legado: despesa de cartão sem contaId — vai pra fatura */
    var esperado = Number(d.valor) || 0;
    /* valorPago tem prioridade (suporta parcial). Senão usa status binário */
    var pagoVal;
    if (typeof d.valorPago === 'number') pagoVal = d.valorPago;
    else pagoVal = (d.status === 'pago') ? esperado : 0;
    var aPagar = Math.max(esperado - pagoVal, 0);
    var quitada = pagoVal >= esperado && esperado > 0;
    var diaItem = d.data ? parseInt(String(d.data).split('-')[2], 10) : '—';
    out.despesas.push({
      kind: 'desp',
      dia: diaItem,
      nome: d.descricao || d.nome || 'Despesa',
      contaIcone: conta ? (conta.icone || '🏦') : '',
      esperado: esperado,
      aPagar: aPagar,
      diferenca: pagoVal,
      pago: quitada,
      ref: 'desp:' + d.id + ':' + mesAno
    });
  });

  /* Despesas fixas do mês — instâncias virtuais sem cartão.
     Mesmo filtro de cartão das reais: se o template tem contaId de cartão,
     a instância vai pra fatura, não pra lista individual. */
  (instDoMes.despesas || []).forEach(function(d){
    var fixaId = d._fixaId;
    var template = listaDF.find(function(x){ return String(x.id) === String(fixaId); });
    var conta = template && template.contaId ? (typeof oneFinGetConta === 'function' && oneFinGetConta(template.contaId)) : null;
    if (conta && conta.tipo === 'cartao') return; /* vai pra fatura do cartão */
    if (d.faturaMesAno) return; /* legado: fixa de cartão sem contaId — vai pra fatura */
    /* Esperado = base do molde (previsão). Efetivo = override do mês (se houver),
       que vira A Pagar. Diferença = efetivo − esperado (gastou mais/menos). */
    var esperado = template ? (Number(template.valor) || 0) : (Number(d.valor) || 0);
    var efetivo  = template ? oneFinFixaValorNoMes(template, mesAno) : (Number(d.valor) || 0);
    var pago = oneFinFixaPagoNoMes(template, mesAno);
    var quitada = pago >= efetivo && efetivo > 0;
    out.despesas.push({
      kind: 'fixa-d',
      dia: d.diaDoMes || (d.data ? parseInt(d.data.split('-')[2],10) : 1),
      nome: d.nome || d.descricao || 'Despesa fixa',
      contaIcone: conta ? (conta.icone || '🏦') : '',
      esperado: esperado,
      aPagar: efetivo,
      diferenca: efetivo - esperado,
      pago: quitada,
      ref: 'fixa-d:' + fixaId + ':' + mesAno
    });
  });

  /* Faturas de cartão — 1 linha por cartão, mostrando a fatura DO MÊS de
     navegação (não a "próxima a fechar"). Sem isso, navegar pra um mês
     passado mostrava a fatura futura riscada como "a pagar" e omitia a
     fatura paga daquele mês. Agora cada mês mostra sua própria fatura. */
  contas.forEach(function(c){
    if (c.tipo !== 'cartao') return;
    var totalFatura = (typeof oneFinFaturaDoMes === 'function') ? oneFinFaturaDoMes(c.id, mesAno) : 0;
    if (totalFatura <= 0) return;
    var pagaFat = !!(Array.isArray(c.faturasPagas) && c.faturasPagas.indexOf(mesAno) >= 0);
    out.faturas.push({
      kind: 'fatura',
      dia: c.diaVencimento || '—',
      nome: c.nome + ' (Fatura ' + mesAno + ')',
      icone: c.icone || '💳',
      cor: c.cor || '#9B72B0',
      esperado: totalFatura,
      aPagar: pagaFat ? 0 : totalFatura,
      diferenca: pagaFat ? totalFatura : 0,
      pago: pagaFat,
      ref: 'cartao:' + c.id + ':' + mesAno
    });
  });

  /* Receitas REAIS do mês — esporádicas */
  receitasReais.forEach(function(r){
    if (!noMes(r.data)) return;
    var esperado = Number(r.valor) || 0;
    var pagoR;
    if (typeof r.valorPago === 'number') pagoR = r.valorPago;
    else pagoR = (r.status === 'pago') ? esperado : 0;
    var aReceberR = Math.max(esperado - pagoR, 0);
    var recebida = pagoR >= esperado && esperado > 0;
    var diaItem = r.data ? parseInt(String(r.data).split('-')[2], 10) : '—';
    out.receitasFixas.push({
      kind: 'rec',
      dia: diaItem,
      nome: r.nome || r.descricao || 'Receita',
      esperado: esperado,
      aPagar: aReceberR,
      diferenca: pagoR,
      pago: recebida,
      ref: 'rec:' + r.id + ':' + mesAno
    });
  });

  /* Receitas fixas — instâncias virtuais */
  (instDoMes.receitas || []).forEach(function(r){
    var fixaId = r._fixaId;
    var template = listaRF.find(function(x){ return String(x.id) === String(fixaId); });
    /* Esperado = base do molde. Efetivo = override do mês (se houver) → A Pagar.
       Diferença = efetivo − esperado (recebeu mais/menos que o previsto). */
    var esperado = template ? (Number(template.valor) || 0) : (Number(r.valor) || 0);
    var efetivo  = template ? oneFinFixaValorNoMes(template, mesAno) : (Number(r.valor) || 0);
    var pago = oneFinFixaPagoNoMes(template, mesAno);
    var recebida = pago >= efetivo && efetivo > 0;
    out.receitasFixas.push({
      kind: 'fixa-r',
      dia: r.diaDoMes || (r.data ? parseInt(r.data.split('-')[2],10) : 1),
      nome: r.nome || r.descricao || 'Receita fixa',
      esperado: esperado,
      aPagar: efetivo,
      diferenca: efetivo - esperado,
      pago: recebida,
      ref: 'fixa-r:' + fixaId + ':' + mesAno
    });
  });

  return out;
}

function oneFinRenderResumo(opts) {
  /* opts opcional: { caixaId, obrigId, investId } pra renderizar em outro
     conjunto de elementos (ex: o slide Financeiro mobile só usa obrigId).
     Default = IDs do desktop. */
  opts = opts || {};
  var _caixaId  = opts.caixaId  || 'one-fin-resumo-caixa';
  var _obrigId  = opts.obrigId  || 'one-fin-resumo-obrigacoes';
  var _investId = opts.investId || 'one-fin-resumo-invest';
  var hoje = new Date();
  var mes = (typeof window.oneFinMesAtivo === 'number') ? window.oneFinMesAtivo : hoje.getMonth();
  var ano = (typeof window.oneFinAnoAtivo === 'number') ? window.oneFinAnoAtivo : hoje.getFullYear();

  var obrig = _oneFinResumoColetarObrigacoes(mes, ano);
  var totalAPagarDespesas = obrig.despesas.reduce(function(s,i){ return s + i.aPagar; }, 0) +
                            obrig.faturas.reduce(function(s,i){ return s + i.aPagar; }, 0);
  var totalAReceber       = obrig.receitasFixas.reduce(function(s,i){ return s + i.aPagar; }, 0);
  var saldoContas         = _oneFinResumoSaldoEmContas();
  /* Resultado considera SÓ o que já está efetivado: saldo nas contas (que já
     soma receitas recebidas via pagoPorMes) menos as despesas pendentes do mês.
     Receita pendente NÃO entra — só quando o Mentor marcar como recebida, ela
     cai no saldo e o resultado aumenta automaticamente. */
  var resultadoMes        = saldoContas - totalAPagarDespesas;
  var investimentos       = _oneFinResumoTotalInvestimentos();
  var patrimonio          = resultadoMes + investimentos;

  /* ── Bloco 1: Caixa do mês ── */
  var caixa = document.getElementById(_caixaId);
  if (caixa) {
    var linhas = [
      { lbl: 'Saldo em conta(s)',                 val: saldoContas,         sinal: '(+)', cor: saldoContas >= 0 ? '#27856A' : '#C0392B' },
      { lbl: 'Pagamentos do mês',                 val: totalAPagarDespesas, sinal: '(−)', cor: '#C0392B' },
      { lbl: 'Resultado do mês',                  val: resultadoMes,        sinal: '(=)', cor: resultadoMes >= 0 ? '#27856A' : '#C0392B', destaque: true },
      { lbl: 'A receber este mês (não somado)',   val: totalAReceber,       sinal: '•',   cor: '#9CAB9C', oculto: totalAReceber <= 0 },
      { lbl: 'Investimentos',                     val: investimentos,       sinal: '(+)', cor: '#5B7CFA' },
      { lbl: 'Patrimônio total',                  val: patrimonio,          sinal: '(=)', cor: patrimonio >= 0 ? '#27856A' : '#C0392B', destaque: true }
    ];
    caixa.innerHTML =
      '<div class="one-fin-resumo-titulo">💰 Caixa do mês</div>' +
      linhas.filter(function(l){ return !l.oculto; }).map(function(l){
        return '<div class="one-fin-resumo-caixa-row' + (l.destaque ? ' destaque' : '') + '">' +
                 '<span class="one-fin-resumo-caixa-lbl">' + l.lbl + '</span>' +
                 '<span class="one-fin-resumo-caixa-val" style="color:' + l.cor + '">' + _oneFinResumoBrl(l.val) + '</span>' +
                 '<span class="one-fin-resumo-caixa-sinal">' + l.sinal + '</span>' +
               '</div>';
      }).join('');
  }

  /* ── Bloco 2: Obrigações do mês (1 linha por fixa OU fatura) ──
     Ordem: receitas primeiro (a confirmar, com bolinha pra marcar como recebida),
     depois despesas (incluindo faturas de cartão). Ambos grupos ordenados por dia
     de vencimento DECRESCENTE (dia maior primeiro). */
  var bloco2 = document.getElementById(_obrigId);
  if (bloco2) {
    var ordDesc = function(a,b){
      var da = (a.dia === '—' ? 0 : a.dia);
      var db = (b.dia === '—' ? 0 : b.dia);
      return (db||0) - (da||0);
    };
    /* Lista de despesas: fixas + reais + faturas, decrescente por dia */
    var todasDespesas = obrig.despesas.concat(obrig.faturas).sort(ordDesc);
    /* Lista de receitas: fixas + reais, decrescente por dia */
    var todasReceitas = obrig.receitasFixas.slice().sort(ordDesc);

    /* Linha de fixa de despesa: A Pagar editável; linha de fatura: A Pagar fixo (= total da fatura) */
    /* Célula A Pagar. Em FIXAS, A Pagar = valor efetivo do mês e ganha um ✏️
       pra lançar/ajustar esse efetivo (grava valorPorMes; vazio/igual à base
       limpa o override). Fatura/avulso seguem como antes (vermelho = a pagar). */
    var _apagarCell = function(it){
      var ehFixa = (it.kind === 'fixa-d' || it.kind === 'fixa-r');
      var cor = ehFixa ? (it.aPagar > 0 ? '#2C2A26' : '#9CAB9C') : (it.aPagar > 0 ? '#C0392B' : '#9CAB9C');
      var span = '<span class="one-fin-resumo-obr-apagar" style="color:' + cor + ';font-weight:600">' + _oneFinResumoBrl(it.aPagar) + '</span>';
      if (!ehFixa) return span;
      return '<span class="one-fin-resumo-apagar-cell" style="display:inline-flex;align-items:center;gap:4px;justify-content:flex-end">' +
               span +
               '<button class="one-fin-resumo-efetivo-pencil" title="Lançar valor efetivo deste mês" onclick="oneFinResumoEditarEfetivo(\'' + it.ref + '\', this)" style="background:none;border:none;cursor:pointer;font-size:12px;line-height:1;padding:0 2px;opacity:.55">✏️</button>' +
             '</span>';
    };
    /* Célula Diferença. Fixa: esperado × efetivo, com sinal e cor (despesa acima
       do previsto = vermelho; receita acima = verde; zero = cinza "—"). Demais
       linhas mantêm o comportamento antigo. */
    var _difCell = function(it, ehReceita){
      var ehFixa = (it.kind === 'fixa-d' || it.kind === 'fixa-r');
      if (!ehFixa) return '<span class="one-fin-resumo-obr-dif" style="color:#27856A">' + _oneFinResumoBrl(it.diferenca) + '</span>';
      var dif = Number(it.diferenca) || 0;   /* efetivo - esperado */
      if (!dif) return '<span class="one-fin-resumo-obr-dif" style="color:#9CAB9C">—</span>';
      var acima = dif > 0;                    /* gastou/recebeu mais que o previsto */
      var ruim  = ehReceita ? !acima : acima;
      var cor   = ruim ? '#C0392B' : '#27856A';
      return '<span class="one-fin-resumo-obr-dif" style="color:' + cor + ';font-weight:600">' + (acima ? '+' : '−') + _oneFinResumoBrl(Math.abs(dif)) + '</span>';
    };

    var renderLinhaDespesa = function(it){
      var pagoCls = it.pago ? ' pago' : '';
      var isFatura = (it.kind === 'fatura');
      var icoPrefix = isFatura ? ((it.icone || '💳') + ' ') : (it.contaIcone ? (it.contaIcone + ' ') : '');
      var tipoBadge = isFatura ? '<span style="font-size:10px;color:#9CAB9C;font-weight:500;margin-left:6px">Fatura</span>' : '';
      return '<div class="one-fin-resumo-obr-row' + pagoCls + '">' +
               '<button class="one-fin-resumo-check" onclick="oneFinResumoTogglePago(\'' + it.ref + '\')" title="' + (it.pago ? 'Desmarcar' : 'Marcar como pago') + '">' +
                 (it.pago ? '✓' : '○') +
               '</button>' +
               '<span class="one-fin-resumo-obr-dia">' + (it.dia || '—') + '</span>' +
               '<span class="one-fin-resumo-obr-nome">' + icoPrefix + (it.nome || '').replace(/</g,'&lt;') + tipoBadge + '</span>' +
               '<span class="one-fin-resumo-obr-esperado">' + _oneFinResumoBrl(it.esperado) + '</span>' +
               _apagarCell(it) +
               _difCell(it, false) +
             '</div>';
    };

    var rowsDespesa = todasDespesas.map(renderLinhaDespesa).join('');

    var renderLinhaReceita = function(it){
      var pagoCls = it.pago ? ' pago' : '';
      return '<div class="one-fin-resumo-obr-row' + pagoCls + '">' +
               '<button class="one-fin-resumo-check" onclick="oneFinResumoTogglePago(\'' + it.ref + '\')" title="' + (it.pago ? 'Desmarcar' : 'Marcar como recebido') + '">' +
                 (it.pago ? '✓' : '○') +
               '</button>' +
               '<span class="one-fin-resumo-obr-dia">' + (it.dia || '—') + '</span>' +
               '<span class="one-fin-resumo-obr-nome">' + (it.nome || '').replace(/</g,'&lt;') + '</span>' +
               '<span class="one-fin-resumo-obr-esperado">' + _oneFinResumoBrl(it.esperado) + '</span>' +
               _apagarCell(it) +
               _difCell(it, true) +
             '</div>';
    };

    var rowsReceita = todasReceitas.length
      ? '<div class="one-fin-resumo-subtit">↑ A receber este mês</div>' +
        todasReceitas.map(renderLinhaReceita).join('')
      : '';

    var somaEsperado = todasDespesas.reduce(function(s,i){ return s + i.esperado; }, 0);
    var somaAPagar   = todasDespesas.reduce(function(s,i){ return s + i.aPagar;   }, 0);
    var somaDif      = todasDespesas.reduce(function(s,i){ return s + i.diferenca; }, 0);

    /* Estrutura flex: cabeçalho fixo em cima, corpo scrollável no meio, total fixo embaixo. */
    bloco2.innerHTML =
      (todasDespesas.length === 0 && todasReceitas.length === 0
        ? '<div class="one-fin-resumo-titulo">📋 Acompanhamento do mês</div>' +
          '<div class="one-fin-resumo-vazio">Sem fixas nem faturas de cartão neste mês.</div>'
        : (
          '<div class="one-fin-resumo-obrig-cabecalho">' +
            '<div class="one-fin-resumo-titulo">📋 Acompanhamento do mês</div>' +
            '<div class="one-fin-resumo-obr-head">' +
              '<span></span>' +
              '<span>Dia</span>' +
              '<span>Descritivo</span>' +
              '<span class="num">Esperado</span>' +
              '<span class="num">A Pagar</span>' +
              '<span class="num">Diferença</span>' +
            '</div>' +
          '</div>' +
          '<div class="one-fin-resumo-obrig-corpo">' +
            rowsReceita +
            (todasDespesas.length > 0
              ? '<div class="one-fin-resumo-subtit">↓ A pagar este mês</div>' + rowsDespesa
              : '') +
          '</div>' +
          (todasDespesas.length > 0
            ? '<div class="one-fin-resumo-obrig-rodape">' +
                '<div class="one-fin-resumo-obr-row total">' +
                  '<span></span>' +
                  '<span></span>' +
                  '<span class="one-fin-resumo-obr-nome" style="font-weight:700">SOMA →</span>' +
                  '<span class="one-fin-resumo-obr-esperado" style="font-weight:700">' + _oneFinResumoBrl(somaEsperado) + '</span>' +
                  '<span class="one-fin-resumo-obr-apagar" style="font-weight:700;color:#C0392B">' + _oneFinResumoBrl(somaAPagar) + '</span>' +
                  '<span class="one-fin-resumo-obr-dif" style="font-weight:700;color:#6B6660">' + _oneFinResumoBrl(somaDif) + '</span>' +
                '</div>' +
              '</div>'
            : '')
        )
      );
  }

  /* ── Bloco 3: Investimentos ── */
  var bloco3 = document.getElementById(_investId);
  if (bloco3) {
    var contas = (typeof oneFinGetContas === 'function') ? oneFinGetContas() : [];
    var invs = contas.filter(function(c){ return c.tipo === 'investimento'; });
    var rows = invs.map(function(c){
      return '<div class="one-fin-resumo-inv-row">' +
               '<span class="one-fin-resumo-inv-ico" style="background:' + (c.cor || '#5B7CFA') + '22;color:' + (c.cor || '#5B7CFA') + '">' + (c.icone || '📈') + '</span>' +
               '<span class="one-fin-resumo-inv-nome">' + (c.nome || '').replace(/</g,'&lt;') + '</span>' +
               '<span class="one-fin-resumo-inv-val">' + _oneFinResumoBrl(Number(c.saldo) || 0) + '</span>' +
             '</div>';
    }).join('');
    var totalInv = invs.reduce(function(s,c){ return s + (Number(c.saldo) || 0); }, 0);
    bloco3.innerHTML =
      '<div class="one-fin-resumo-titulo">📈 Investimentos</div>' +
      (invs.length === 0
        ? '<div class="one-fin-resumo-vazio">Nenhuma conta de investimento. Cadastre uma em Contas → + Nova conta → Investimento.</div>'
        : rows +
          '<div class="one-fin-resumo-inv-row total">' +
            '<span></span>' +
            '<span class="one-fin-resumo-inv-nome" style="font-weight:700">Total</span>' +
            '<span class="one-fin-resumo-inv-val" style="font-weight:700;color:#5B7CFA">' + _oneFinResumoBrl(totalInv) + '</span>' +
          '</div>');
  }
}
window.oneFinRenderResumo = oneFinRenderResumo;

/* ── View "Visão geral" — lista resumida + barras balanço 6 meses ── */
function oneFinRenderGeral() {
  // 1) Lançamentos do mês ativo (até 6 mais recentes)
  var receitas = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]');
  var despesas = JSON.parse(localStorage.getItem(oneU('despesas')) || '[]');
  var hojeRG = new Date();
  var mesRG = (typeof window.oneFinMesAtivo === 'number') ? window.oneFinMesAtivo : hojeRG.getMonth();
  var anoRG = (typeof window.oneFinAnoAtivo === 'number') ? window.oneFinAnoAtivo : hojeRG.getFullYear();
  var noMesAtivo = function(dataStr) {
    if (!dataStr) return false;
    var d = new Date(dataStr + 'T00:00:00');
    return d.getMonth() === mesRG && d.getFullYear() === anoRG;
  };
  /* Instâncias virtuais das fixas no mês ativo entram com flag _fixa */
  var _instRG = (typeof oneFinInstanciasDoMes === 'function') ? oneFinInstanciasDoMes(mesRG, anoRG) : { receitas: [], despesas: [] };
  var todos = receitas.filter(function(r){ return noMesAtivo(r.data); }).map(function(r){
    return { tipo:'in', key:'receitas', id:r.id, nome:r.nome || r.descricao || 'Receita',
             categoria: r.categoria || r.tipo || '', valor:Number(r.valor)||0, data:r.data, contaId:r.contaId||'', _fixa:false };
  }).concat(_instRG.receitas.map(function(r){
    return { tipo:'in', key:'receitasFixas', id:r._fixaId, nome:r.nome,
             categoria:r.categoria || '', valor:Number(r.valor)||0, data:r.data, contaId:r.contaId||'', _fixa:true };
  })).concat(despesas.filter(function(d){ return noMesAtivo(d.data); }).map(function(d){
    return { tipo:'out', key:'despesas', id:d.id, nome:d.descricao || d.nome || 'Despesa',
             categoria: d.categoria || '', valor:Number(d.valor)||0, data:d.data, contaId:d.contaId||'', _fixa:false };
  })).concat(_instRG.despesas.map(function(d){
    return { tipo:'out', key:'despesasFixas', id:d._fixaId, nome:d.nome,
             categoria:d.categoria || '', valor:Number(d.valor)||0, data:d.data, contaId:d.contaId||'', _fixa:true };
  })).sort(function(a,b){ return (b.data||'').localeCompare(a.data||''); });

  /* Estado dos blocos colapsáveis (Sessão C frente 4) */
  if (typeof window.oneFinAgrupamento !== 'string') window.oneFinAgrupamento = 'categoria';
  if (!window.oneFinGruposAbertos) window.oneFinGruposAbertos = {};
  var modo = window.oneFinAgrupamento;

  var listEl = document.getElementById('one-fin-geral-recent');
  if (listEl) {
    var togHtml = '<div class="one-fin-geral-toggle">' +
                    '<button type="button" class="one-fin-geral-toggle-btn' + (modo==='categoria'?' active':'') + '" onclick="oneFinSetAgrupamento(\'categoria\')">Por categoria</button>' +
                    '<button type="button" class="one-fin-geral-toggle-btn' + (modo==='conta'?' active':'') + '" onclick="oneFinSetAgrupamento(\'conta\')">Por conta</button>' +
                  '</div>';
    if (!todos.length) {
      listEl.innerHTML = togHtml + '<p style="text-align:center;color:#9CAB9C;font-size:12px;padding:12px 0;font-style:italic;font-family:Playfair Display,Georgia,serif">Nenhum lançamento neste mês</p>';
    } else {
      var grupos = {};
      var ordemGrupos = [];
      todos.forEach(function(l){
        var chave, label, ico;
        if (modo === 'categoria') {
          chave = (l.categoria || 'Sem categoria') + '__' + l.tipo;
          label = l.categoria || 'Sem categoria';
          var icoCat = (typeof oneFinCatIcon === 'function') ? oneFinCatIcon(l.categoria) : { emoji:'💸', cor:'#6B7F6F', bg:'#F2F6F1' };
          ico = icoCat;
        } else {
          var conta = l.contaId ? oneFinGetConta(l.contaId) : null;
          chave = (l.contaId || 'sem-conta') + '__' + l.tipo;
          label = conta ? conta.nome : 'Sem conta';
          ico = conta ? { emoji: conta.icone || '🏦', cor: conta.cor || '#6B7F6F', bg: (conta.cor || '#6B7F6F') + '22' } : { emoji:'❔', cor:'#9CAB9C', bg:'#F2F6F1' };
        }
        if (!grupos[chave]) {
          grupos[chave] = { label: label, ico: ico, tipo: l.tipo, total: 0, itens: [] };
          ordemGrupos.push(chave);
        }
        grupos[chave].total += l.valor;
        grupos[chave].itens.push(l);
      });
      /* Ordena: despesas primeiro (maior total acima), depois receitas */
      ordemGrupos.sort(function(a, b){
        var ga = grupos[a], gb = grupos[b];
        if (ga.tipo !== gb.tipo) return ga.tipo === 'out' ? -1 : 1;
        return gb.total - ga.total;
      });

      listEl.innerHTML = togHtml + ordemGrupos.map(function(chave){
        var g = grupos[chave];
        var aberto = !!window.oneFinGruposAbertos[chave];
        var corVal = g.tipo === 'in' ? '#27856A' : '#C0392B';
        var sinal = g.tipo === 'in' ? '+' : '-';
        var seta = aberto ? '▾' : '▸';
        var labelSafe = (g.label||'').replace(/</g,'&lt;');
        var head = '<div class="one-fin-grupo-head" onclick="oneFinToggleGrupo(\'' + chave.replace(/'/g,"\\'") + '\')">' +
                     '<span class="one-fin-grupo-seta">' + seta + '</span>' +
                     '<div class="one-fin-grupo-ico" style="background:' + g.ico.bg + ';color:' + g.ico.cor + '">' + g.ico.emoji + '</div>' +
                     '<div class="one-fin-grupo-info">' +
                       '<div class="one-fin-grupo-nome">' + labelSafe + '</div>' +
                       '<div class="one-fin-grupo-cnt">' + g.itens.length + ' ' + (g.itens.length === 1 ? 'lançamento' : 'lançamentos') + '</div>' +
                     '</div>' +
                     '<div class="one-fin-grupo-total" style="color:' + corVal + '">' + sinal + _brlFin(g.total).replace('R$ ', 'R$') + '</div>' +
                   '</div>';
        var corpo = '';
        if (aberto) {
          corpo = '<div class="one-fin-grupo-itens">' + g.itens.map(function(l){
            var dataF = l.data ? l.data.split('-').reverse().slice(0,2).join('/') : '';
            var badgeFixa = l._fixa ? ' <span style="font-size:9px;color:#9B72B0;background:rgba(155,114,176,0.12);padding:1px 5px;border-radius:6px;font-weight:600">↻ fixa</span>' : '';
            var nomeS = (l.nome||'').replace(/</g,'&lt;');
            var safeId = String(l.id||'').replace(/'/g,"\\'");
            var safeKey = String(l.key||'');
            var safeData = String(l.data||'').replace(/'/g,"\\'");
            var actions = (safeKey && safeId)
              ? '<div class="one-fin-grupo-item-actions" onclick="event.stopPropagation()">' +
                  '<button class="one-fin-item-btn" onclick="oneFinEditar(\'' + safeKey + '\',\'' + safeId + '\',\'' + safeData + '\')" title="Editar">✏️</button>' +
                  '<button class="one-fin-item-btn del" onclick="oneFinExcluir(\'' + safeKey + '\',\'' + safeId + '\',\'' + safeData + '\')" title="Excluir">🗑️</button>' +
                '</div>'
              : '';
            return '<div class="one-fin-grupo-item">' +
                     '<div class="one-fin-grupo-item-info">' +
                       '<div class="one-fin-grupo-item-nome">' + nomeS + badgeFixa + '</div>' +
                       '<div class="one-fin-grupo-item-meta">' + dataF + '</div>' +
                     '</div>' +
                     '<div class="one-fin-grupo-item-val" style="color:' + corVal + '">' + sinal + _brlFin(l.valor).replace('R$ ','R$') + '</div>' +
                     actions +
                   '</div>';
          }).join('') + '</div>';
        }
        return '<div class="one-fin-grupo">' + head + corpo + '</div>';
      }).join('');
    }
  }

  /* Espelha a lista agrupada pro slide mobile (pill Visão geral, sem balanço). */
  var _geralMob = document.getElementById('one-fin-mob-geral-recent');
  if (_geralMob && listEl) _geralMob.innerHTML = listEl.innerHTML;

  // 2) Gráfico de barras: mês ativo + 5 próximos, considerando reais + fixas instanciadas
  var canvas = document.getElementById('one-fin-bars-geral');
  if (!canvas || typeof Chart === 'undefined') {
    if (canvas) setTimeout(oneFinRenderGeral, 200);
    return;
  }
  if (window.oneFinInlineCharts && window.oneFinInlineCharts.barsGeral) {
    window.oneFinInlineCharts.barsGeral.destroy();
  }
  if (!window.oneFinInlineCharts) window.oneFinInlineCharts = {};

  var meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  var mesBase = (typeof window.oneFinMesAtivo === 'number') ? window.oneFinMesAtivo : (new Date()).getMonth();
  var anoBase = (typeof window.oneFinAnoAtivo === 'number') ? window.oneFinAnoAtivo : (new Date()).getFullYear();
  var labels = [], rData = [], dData = [];
  for (var i = 0; i < 6; i++) {
    var m = mesBase + i, a = anoBase;
    while (m > 11) { m -= 12; a++; }
    var labelMes = meses[m];
    if (a !== anoBase) labelMes += '/' + String(a).slice(-2);
    labels.push(labelMes);
    var rReais = receitas
      .filter(function(r){ if (!r.data) return false; var d = new Date(r.data+'T00:00:00'); return d.getMonth()===m && d.getFullYear()===a; })
      .reduce(function(s,r){ return s + (Number(r.valor)||0); }, 0);
    var dReais = despesas
      .filter(function(d){ if (!d.data) return false; var dt = new Date(d.data+'T00:00:00'); return dt.getMonth()===m && dt.getFullYear()===a; })
      .reduce(function(s,d){ return s + (Number(d.valor)||0); }, 0);
    var instM = (typeof oneFinInstanciasDoMes === 'function') ? oneFinInstanciasDoMes(m, a) : { receitas:[], despesas:[] };
    var rFix = instM.receitas.reduce(function(s,r){ return s + (Number(r.valor)||0); }, 0);
    var dFix = instM.despesas.reduce(function(s,d){ return s + (Number(d.valor)||0); }, 0);
    rData.push(rReais + rFix);
    dData.push(dReais + dFix);
  }

  window.oneFinInlineCharts.barsGeral = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Receitas', data: rData, backgroundColor: '#7FA88E', borderRadius: 5 },
        { label: 'Despesas', data: dData, backgroundColor: '#E07A6B', borderRadius: 5 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 10 }, color: '#6B7F6F', usePointStyle: true, boxWidth: 6 } },
        tooltip: { callbacks: { label: function(ctx){ return ctx.dataset.label + ': ' + _brlFin(ctx.parsed.y); } } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { font: { size: 9 }, color: '#6B7F6F', callback: function(v){ return 'R$ ' + (v/1000).toFixed(0) + 'k'; } }, grid: { color: 'rgba(127,168,142,0.10)' } },
        x: { ticks: { font: { size: 10 }, color: '#6B7F6F' }, grid: { display: false } }
      },
      animation: { duration: 500 }
    }
  });
}
window.oneFinRenderGeral = oneFinRenderGeral;

function oneFinInlineSetTipo(tipo) {
  window.oneFinInlineTipo = tipo;
  document.querySelectorAll('.one-fin-cat-toggle-btn').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-tipo') === tipo);
  });
  oneFinRenderCategorias();
}
window.oneFinInlineSetTipo = oneFinInlineSetTipo;

/* Render donut + lista — usa o MÊS ATIVO do app (oneFinMesAtivo/AnoAtivo) e
   inclui instâncias virtuais de fixas, igual o resto do financeiro. */
function oneFinRenderCategorias() {
  var tipo = window.oneFinInlineTipo || 'despesas';
  var dados = (tipo === 'receitas')
    ? JSON.parse(localStorage.getItem(oneU('receitas')) || '[]')
    : JSON.parse(localStorage.getItem(oneU('despesas')) || '[]');

  /* Mês ativo do app (não o de hoje) */
  var mes = (typeof window.oneFinMesAtivo === 'number') ? window.oneFinMesAtivo : new Date().getMonth();
  var ano = (typeof window.oneFinAnoAtivo === 'number') ? window.oneFinAnoAtivo : new Date().getFullYear();

  var doMes = dados.filter(function(it){
    if (!it.data) return false;
    var d = new Date(it.data + 'T00:00:00');
    return d.getMonth() === mes && d.getFullYear() === ano;
  });

  /* Inclui instâncias virtuais de fixas (despesas ou receitas) no mês ativo */
  if (typeof oneFinInstanciasDoMes === 'function') {
    var inst = oneFinInstanciasDoMes(mes, ano);
    var fixasDoMes = (tipo === 'receitas') ? (inst.receitas || []) : (inst.despesas || []);
    fixasDoMes.forEach(function(f){
      doMes.push({
        valor: Number(f.valor) || 0,
        categoria: f.categoria || '',
        tipo: f.tipo || tipo
      });
    });
  }

  var grupos = {};
  doMes.forEach(function(it){
    var cat = it.categoria || it.tipo || 'Outros';
    if (!grupos[cat]) grupos[cat] = 0;
    grupos[cat] += Number(it.valor) || 0;
  });
  var entries = Object.entries(grupos)
    .map(function(e){ return { categoria: e[0], total: e[1] }; })
    .sort(function(a,b){ return b.total - a.total; });
  var totalGeral = entries.reduce(function(s,e){ return s + e.total; }, 0);

  function _brl(v) { return 'R$ ' + (v||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}); }

  var totalEl = document.getElementById('one-fin-donut-total');
  if (totalEl) totalEl.textContent = _brl(totalGeral);

  var listEl = document.getElementById('one-fin-cat-list-inline');
  if (listEl) {
    if (!entries.length) {
      listEl.innerHTML = '<p style="text-align:center;color:#9CAB9C;font-size:13px;padding:16px 0;font-style:italic;font-family:Playfair Display,Georgia,serif">Sem ' + tipo + ' neste mês</p>';
    } else {
      var palette = ['#7FA88E','#D4A655','#9B72B0','#5B7CFA','#FF8B5A','#27856A','#E67BB0','#7B5CF0','#C0392B','#B8860B'];
      listEl.innerHTML = entries.map(function(e, i){
        var cat = (typeof oneFinCatIcon === 'function') ? oneFinCatIcon(e.categoria) : { emoji:'💸', cor:'#6B7F6F', bg:'#F2F6F1' };
        var pct = totalGeral > 0 ? Math.round((e.total / totalGeral) * 100) : 0;
        return '<div class="one-rel-cat-row">' +
                 '<div class="one-rel-cat-dot" style="background:' + cat.bg + ';color:' + cat.cor + '">' + cat.emoji + '</div>' +
                 '<div class="one-rel-cat-nome">' + e.categoria.replace(/</g,'&lt;') + '</div>' +
                 '<div class="one-rel-cat-val">' + _brl(e.total) + '</div>' +
                 '<div class="one-rel-cat-pct" style="background:' + palette[i % palette.length] + '">' + pct + '%</div>' +
               '</div>';
      }).join('');
    }
  }

  var canvas = document.getElementById('one-fin-donut-inline');
  if (!canvas || typeof Chart === 'undefined') return;
  if (window.oneFinInlineCharts.donut) window.oneFinInlineCharts.donut.destroy();
  if (!entries.length) { window.oneFinInlineCharts.donut = null; return; }
  var palette = ['#7FA88E','#D4A655','#9B72B0','#5B7CFA','#FF8B5A','#27856A','#E67BB0','#7B5CF0','#C0392B','#B8860B'];
  window.oneFinInlineCharts.donut = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: entries.map(function(e){ return e.categoria; }),
      datasets: [{
        data: entries.map(function(e){ return e.total; }),
        backgroundColor: entries.map(function(_, i){ return palette[i % palette.length]; }),
        borderColor: '#fff',
        borderWidth: 3,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: function(ctx) { return ctx.label + ': ' + _brl(ctx.parsed); } }
        }
      },
      animation: { duration: 500 }
    }
  });
}
window.oneFinRenderCategorias = oneFinRenderCategorias;

/* Render balanço inline (barras dos últimos 6 meses) */
function oneFinRenderBalanco() {
  var canvas = document.getElementById('one-fin-bars-inline');
  if (!canvas || typeof Chart === 'undefined') return;

  var receitas = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]');
  var despesas = JSON.parse(localStorage.getItem(oneU('despesas')) || '[]');
  var hoje = new Date();
  var mesAtual = hoje.getMonth(), anoAtual = hoje.getFullYear();

  var meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  var labels = [], rData = [], dData = [];
  for (var i = 5; i >= 0; i--) {
    var m = mesAtual - i, a = anoAtual;
    while (m < 0) { m += 12; a--; }
    labels.push(meses[m] + '/' + String(a).slice(2));
    var rTot = receitas
      .filter(function(r){ if (!r.data) return false; var d = new Date(r.data+'T00:00:00'); return d.getMonth()===m && d.getFullYear()===a && r.status !== 'pendente'; })
      .reduce(function(s,r){ return s + (Number(r.valor)||0); }, 0);
    var dTot = despesas
      .filter(function(d){ if (!d.data) return false; var dt = new Date(d.data+'T00:00:00'); return dt.getMonth()===m && dt.getFullYear()===a; })
      .reduce(function(s,d){ return s + (Number(d.valor)||0); }, 0);
    rData.push(rTot);
    dData.push(dTot);
  }

  if (window.oneFinInlineCharts.bars) window.oneFinInlineCharts.bars.destroy();
  window.oneFinInlineCharts.bars = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Receitas', data: rData, backgroundColor: '#7FA88E', borderRadius: 6 },
        { label: 'Despesas', data: dData, backgroundColor: '#E07A6B', borderRadius: 6 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, color: '#6B7F6F', usePointStyle: true } },
        tooltip: { callbacks: { label: function(ctx){ return ctx.dataset.label + ': R$ ' + ctx.parsed.y.toLocaleString('pt-BR', {minimumFractionDigits:2}); } } }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { font: { size: 10 }, color: '#6B7F6F', callback: function(v){ return 'R$ ' + (v/1000).toFixed(0) + 'k'; } },
          grid: { color: 'rgba(127,168,142,0.10)' }
        },
        x: {
          ticks: { font: { size: 11 }, color: '#6B7F6F' },
          grid: { display: false }
        }
      },
      animation: { duration: 500 }
    }
  });
}
window.oneFinRenderBalanco = oneFinRenderBalanco;

/* ════════════════════════════════════════════════════════════════
   AGENDA v2 — Cards slim, 3 views (Hoje | Semana | Mês), painéis
   ════════════════════════════════════════════════════════════════ */
window.oneAgViewAtiva = window.oneAgViewAtiva || 'semana';
window.oneAgHojeSelecionado = window.oneAgHojeSelecionado || new Date().toISOString().slice(0,10);

function _brlAg(v) { return 'R$ ' + (v||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}); }

/* Sobrescreve o oneAgSetView pra suportar a nova vista "hoje" também */
function oneAgSetView(view) {
  window.oneAgViewAtiva = view;
  // Atualiza tabs (pill buttons padrão TaskAreas)
  document.querySelectorAll('#one-ag-filters .one-tar-filter[data-view]').forEach(function(t){
    t.classList.toggle('active', t.getAttribute('data-view') === view);
  });
  // Mostra/esconde views
  document.querySelectorAll('.one-desktop-agenda .one-fin-vista').forEach(function(v){
    v.hidden = v.getAttribute('data-view') !== view;
  });
  // Atualiza label do período no header
  oneAgAtualizarLabelPeriodo();
  // Render apropriado. Mantém oneAgView em sync pra que renderOneAgendaPainel
  // (chamado tanto aqui quanto por outros pontos) saiba qual vista renderizar.
  oneAgView = view;
  if (view === 'hoje') {
    if (typeof oneAgRenderHoje === 'function') oneAgRenderHoje();
  } else if (view === 'semana') {
    if (typeof renderOneAgendaPainel === 'function') renderOneAgendaPainel();
    if (typeof oneAgRenderResumoSemana === 'function') oneAgRenderResumoSemana();
  } else if (view === 'mes') {
    if (typeof renderOneAgendaPainel === 'function') renderOneAgendaPainel();
  }
  // Sempre atualiza os 3 cards (baseado na view)
  if (typeof oneAgRenderTopCards === 'function') oneAgRenderTopCards();
}
window.oneAgSetView = oneAgSetView;

function oneAgAtualizarLabelPeriodo() {
  var lbl = document.getElementById('one-ag-periodo-label');
  if (!lbl) return;
  var hoje = new Date();
  var view = window.oneAgViewAtiva || 'semana';
  var meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  if (view === 'hoje') {
    var sel = new Date((window.oneAgHojeSelecionado || hoje.toISOString().slice(0,10)) + 'T00:00:00');
    lbl.textContent = sel.getDate() + ' de ' + meses[sel.getMonth()];
  } else if (view === 'mes') {
    lbl.textContent = meses[hoje.getMonth()] + ' ' + hoje.getFullYear();
  } else {
    lbl.textContent = ''; // semana mostra label próprio
  }
}

/* ── 3 pills compactas no header: Hoje | Semana | Mês (contagem de compromissos) ── */
function oneAgRenderTopCards() {
  var hoje = new Date(); hoje.setHours(0,0,0,0);
  var hojeStr = hoje.toISOString().slice(0,10);

  // Janela semana corrente (segunda → domingo)
  var dow = hoje.getDay();
  var diffSeg = (dow === 0 ? -6 : 1 - dow);
  var seg = new Date(hoje); seg.setDate(hoje.getDate() + diffSeg);
  var dom = new Date(seg); dom.setDate(seg.getDate() + 6);
  var segStr = seg.toISOString().slice(0,10);
  var domStr = dom.toISOString().slice(0,10);

  // Janela mês corrente
  var mesIni = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0,10);
  var mesFim = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0).toISOString().slice(0,10);

  var compromissos = [];
  try { compromissos = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]'); } catch(e){}

  var qtdHoje = 0, qtdSemana = 0, qtdMes = 0;
  compromissos.forEach(function(c){
    if (!c.data) return;
    if (c.data === hojeStr)                    qtdHoje++;
    if (c.data >= segStr && c.data <= domStr)  qtdSemana++;
    if (c.data >= mesIni && c.data <= mesFim)  qtdMes++;
  });

  var setText = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };
  setText('one-ag-pill-hoje',   qtdHoje   + ' hoje');
  setText('one-ag-pill-semana', qtdSemana + ' semana');
  setText('one-ag-pill-mes',    qtdMes    + ' mês');
}
window.oneAgRenderTopCards = oneAgRenderTopCards;

/* Stub: + Nova categoria (em breve — abre modal pra criar categoria de compromisso) */
function oneAgNovaCategoria() {
  if (typeof toast === 'function') toast('Categorias de compromisso em breve', 'info');
}
window.oneAgNovaCategoria = oneAgNovaCategoria;

/* ── View Hoje: strip de 7 dias + lista do dia selecionado ── */
function oneAgRenderHoje() {
  var stripEl = document.getElementById('one-ag-week-strip');
  var listEl  = document.getElementById('one-ag-hoje-list');
  if (!stripEl || !listEl) return;

  var hoje = new Date(); hoje.setHours(0,0,0,0);
  var hojeStr = hoje.toISOString().slice(0,10);
  var selecionado = window.oneAgHojeSelecionado || hojeStr;

  // Strip dos 7 dias da semana corrente
  var dow = hoje.getDay();
  var diffSeg = (dow === 0 ? -6 : 1 - dow);
  var seg = new Date(hoje); seg.setDate(hoje.getDate() + diffSeg);
  var nomes = ['SEG','TER','QUA','QUI','SEX','SÁB','DOM'];

  var compromissos = [];
  try { compromissos = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]'); } catch(e){}

  var stripHtml = '';
  for (var i = 0; i < 7; i++) {
    var d = new Date(seg); d.setDate(seg.getDate() + i);
    var ds = d.toISOString().slice(0,10);
    var temEvento = compromissos.some(function(c){ return c.data === ds; });
    var cls = ['one-ag-week-day'];
    if (ds === hojeStr) cls.push('today');
    if (ds === selecionado) cls.push('selected');
    if (temEvento) cls.push('tem-evento');
    stripHtml += '<button type="button" class="' + cls.join(' ') + '" onclick="oneAgSelecionarDia(\'' + ds + '\')">' +
                   '<span class="dia-nome">' + nomes[i] + '</span>' +
                   '<span class="dia-num">' + d.getDate() + '</span>' +
                   '<span class="dia-dot"></span>' +
                 '</button>';
  }
  stripEl.innerHTML = stripHtml;

  // Lista de compromissos do dia selecionado
  var doDia = compromissos
    .filter(function(c){ return c.data === selecionado; })
    .sort(function(a,b){ return (a.hora||'').localeCompare(b.hora||''); });

  if (!doDia.length) {
    listEl.innerHTML = '<p class="one-ag-hoje-empty">Sem compromissos neste dia. Use "+ Novo agendamento" pra criar.</p>';
    return;
  }

  var dataLabel = (function(){
    var d = new Date(selecionado + 'T00:00:00');
    var meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    if (selecionado === hojeStr) return 'Hoje, ' + d.getDate() + ' de ' + meses[d.getMonth()];
    var ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
    if (selecionado === ontem.toISOString().slice(0,10)) return 'Ontem, ' + d.getDate() + ' de ' + meses[d.getMonth()];
    return d.getDate() + ' de ' + meses[d.getMonth()];
  })();

  var html = '<div class="one-ag-hoje-day-label">' + dataLabel + '</div>';
  doDia.forEach(function(c){
    var cat = (typeof oneAgCorCategoria === 'function') ? oneAgCorCategoria(c.tipo) : { cor:'#9B72B0', bg:'#F0E8F4' };
    var nome = (c.nome || c.descricao || 'Compromisso').replace(/</g,'&lt;');
    var hora = c.hora || '';
    var valor = Number(c.valor) || 0;
    var tipo = String(c.tipo || '').toLowerCase();
    // Decide badge
    var badgeClass = 'tarefa', badgeText = 'Tarefa';
    if (valor > 0) {
      if (/desp|pag|aluguel|imposto/.test(tipo)) { badgeClass = 'despesa'; badgeText = 'Despesa'; }
      else { badgeClass = 'receita'; badgeText = 'Receita'; }
    } else if (/reuni|meeting/.test(tipo)) { badgeClass = 'reuniao'; badgeText = 'Reunião'; }
    else if (/atend|consulta|sess/.test(tipo)) { badgeClass = 'receita'; badgeText = 'Atendimento'; }
    var emoji = '📅';
    if (/atend|paciente/.test(tipo)) emoji = '🩺';
    else if (/reuni/.test(tipo)) emoji = '💼';
    else if (/aluguel|conta|pag/.test(tipo)) emoji = '💸';
    else if (/curso|workshop/.test(tipo)) emoji = '🎓';
    var sub = c.descricao && c.descricao !== c.nome ? c.descricao.replace(/</g,'&lt;') : (c.tipo || '');
    html += '<div class="one-ag-hoje-item" onclick="oneAgModalEditar(\'' + (c.id||'') + '\')">' +
              '<div class="one-ag-hoje-item-icon" style="background:' + cat.bg + ';color:' + cat.cor + '">' + emoji + '</div>' +
              '<div class="one-ag-hoje-item-body">' +
                (hora ? '<div class="one-ag-hoje-item-hora">' + hora + '</div>' : '') +
                '<div class="one-ag-hoje-item-nome">' + nome + '</div>' +
                (sub ? '<div class="one-ag-hoje-item-sub">' + sub.replace(/</g,'&lt;') + '</div>' : '') +
              '</div>' +
              '<span class="one-ag-hoje-item-badge ' + badgeClass + '">' + badgeText + '</span>' +
            '</div>';
  });
  listEl.innerHTML = html;
}
window.oneAgRenderHoje = oneAgRenderHoje;

function oneAgSelecionarDia(ds) {
  window.oneAgHojeSelecionado = ds;
  oneAgRenderHoje();
  oneAgRenderTopCards();
  oneAgAtualizarLabelPeriodo();
}
window.oneAgSelecionarDia = oneAgSelecionarDia;

/* ── Resumo da semana (embaixo da view Semana) ── */
function oneAgRenderResumoSemana() {
  var el = document.getElementById('one-ag-resumo-semana');
  if (!el) return;
  var hoje = new Date(); hoje.setHours(0,0,0,0);
  var dow = hoje.getDay();
  var diffSeg = (dow === 0 ? -6 : 1 - dow);
  var seg = new Date(hoje); seg.setDate(hoje.getDate() + diffSeg);
  var dom = new Date(seg); dom.setDate(seg.getDate() + 6);
  var segStr = seg.toISOString().slice(0,10);
  var domStr = dom.toISOString().slice(0,10);

  var compromissos = [];
  try { compromissos = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]'); } catch(e){}
  var doPeriodo = compromissos.filter(function(c){ return c.data >= segStr && c.data <= domStr; });

  var receber = 0, qtdR = 0, pagar = 0, qtdP = 0;
  doPeriodo.forEach(function(c){
    var v = Number(c.valor) || 0;
    var t = String(c.tipo || '').toLowerCase();
    if (v > 0) {
      if (/desp|pag|aluguel|imposto/.test(t)) { pagar += v; qtdP++; }
      else { receber += v; qtdR++; }
    }
  });

  el.innerHTML =
    '<div class="one-ag-resumo-card in">' +
      '<div class="one-ag-resumo-titulo">Recebimentos previstos</div>' +
      '<div class="one-ag-resumo-valor">' + _brlAg(receber) + '</div>' +
      '<div class="one-ag-resumo-sub">' + qtdR + ' compromisso' + (qtdR===1?'':'s') + '</div>' +
    '</div>' +
    '<div class="one-ag-resumo-card out">' +
      '<div class="one-ag-resumo-titulo">Pagamentos previstos</div>' +
      '<div class="one-ag-resumo-valor">' + _brlAg(pagar) + '</div>' +
      '<div class="one-ag-resumo-sub">' + qtdP + ' compromisso' + (qtdP===1?'':'s') + '</div>' +
    '</div>' +
    '<div class="one-ag-resumo-card">' +
      '<div class="one-ag-resumo-titulo">Compromissos</div>' +
      '<div class="one-ag-resumo-valor">' + doPeriodo.length + '</div>' +
      '<div class="one-ag-resumo-sub">esta semana</div>' +
    '</div>';
}
window.oneAgRenderResumoSemana = oneAgRenderResumoSemana;

/* ── View Mês: calendário tradicional com bolinhas + panorama ── */
function oneAgRenderMes() {
  var wrap = document.getElementById('one-ag-mes');
  if (!wrap) return;

  var hoje = new Date(); hoje.setHours(0,0,0,0);
  var hojeStr = hoje.toISOString().slice(0,10);
  var mesAtual = hoje.getMonth(), anoAtual = hoje.getFullYear();

  // Primeiro dia do mês e dia da semana (0=domingo, queremos começar segunda)
  var primDia = new Date(anoAtual, mesAtual, 1);
  var dowPrim = primDia.getDay(); // 0=Dom
  var offset = dowPrim === 0 ? 6 : dowPrim - 1; // quantos dias do mês anterior preencher antes do dia 1
  var inicio = new Date(primDia); inicio.setDate(primDia.getDate() - offset);

  var compromissos = [];
  try { compromissos = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]'); } catch(e){}

  var nomes = ['SEG','TER','QUA','QUI','SEX','SÁB','DOM'];
  var html = '<div class="one-ag-mes-grid">';
  nomes.forEach(function(n){ html += '<div class="one-ag-mes-header-day">' + n + '</div>'; });

  for (var i = 0; i < 42; i++) {
    var d = new Date(inicio); d.setDate(inicio.getDate() + i);
    var ds = d.toISOString().slice(0,10);
    var outroMes = d.getMonth() !== mesAtual;
    var isToday = ds === hojeStr;
    var doDia = compromissos.filter(function(c){ return c.data === ds; });
    var tipos = new Set();
    doDia.forEach(function(c){
      var v = Number(c.valor) || 0;
      var t = String(c.tipo || '').toLowerCase();
      if (v > 0 && /desp|pag|aluguel/.test(t)) tipos.add('despesa');
      else if (v > 0) tipos.add('receita');
      else if (/reuni|meeting/.test(t)) tipos.add('reuniao');
      else tipos.add('tarefa');
    });
    var dots = '';
    ['receita','despesa','reuniao','tarefa'].forEach(function(tp){
      if (tipos.has(tp)) dots += '<span class="one-ag-mes-day-dot ' + tp + '"></span>';
    });
    var cls = ['one-ag-mes-day-cell'];
    if (outroMes) cls.push('outro-mes');
    if (isToday) cls.push('today');
    html += '<div class="' + cls.join(' ') + '" onclick="oneAgClickDiaMes(\'' + ds + '\')">' +
              '<span class="one-ag-mes-day-num">' + d.getDate() + '</span>' +
              (dots ? '<div class="one-ag-mes-day-dots">' + dots + '</div>' : '') +
            '</div>';
  }
  html += '</div>';

  // Legenda
  html += '<div class="one-ag-mes-legenda">' +
            '<span class="one-ag-mes-legenda-item"><span class="one-ag-mes-legenda-dot" style="background:#27856A"></span>Recebimentos</span>' +
            '<span class="one-ag-mes-legenda-item"><span class="one-ag-mes-legenda-dot" style="background:#C0392B"></span>Pagamentos</span>' +
            '<span class="one-ag-mes-legenda-item"><span class="one-ag-mes-legenda-dot" style="background:#5B7CFA"></span>Reuniões</span>' +
            '<span class="one-ag-mes-legenda-item"><span class="one-ag-mes-legenda-dot" style="background:#888880"></span>Tarefas</span>' +
          '</div>';

  wrap.innerHTML = html;

  // Resumo do mês (panorama)
  oneAgRenderResumoMes();
}
window.oneAgRenderMes = oneAgRenderMes;

function oneAgClickDiaMes(ds) {
  // Click num dia do mês → vai pra view Hoje com aquele dia selecionado
  window.oneAgHojeSelecionado = ds;
  oneAgSetView('hoje');
}
window.oneAgClickDiaMes = oneAgClickDiaMes;

function oneAgRenderResumoMes() {
  var el = document.getElementById('one-ag-resumo-mes');
  if (!el) return;
  var hoje = new Date(); hoje.setHours(0,0,0,0);
  var iniMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0,10);
  var fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0,10);

  var compromissos = [];
  try { compromissos = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]'); } catch(e){}
  var doMes = compromissos.filter(function(c){ return c.data >= iniMes && c.data <= fimMes; });

  var receber = 0, pagar = 0;
  doMes.forEach(function(c){
    var v = Number(c.valor) || 0;
    var t = String(c.tipo || '').toLowerCase();
    if (v > 0) {
      if (/desp|pag|aluguel|imposto/.test(t)) pagar += v;
      else receber += v;
    }
  });

  el.innerHTML =
    '<div class="one-ag-resumo-card in">' +
      '<div class="one-ag-resumo-titulo">Recebimentos previstos</div>' +
      '<div class="one-ag-resumo-valor">' + _brlAg(receber) + '</div>' +
    '</div>' +
    '<div class="one-ag-resumo-card out">' +
      '<div class="one-ag-resumo-titulo">Pagamentos previstos</div>' +
      '<div class="one-ag-resumo-valor">' + _brlAg(pagar) + '</div>' +
    '</div>' +
    '<div class="one-ag-resumo-card">' +
      '<div class="one-ag-resumo-titulo">Compromissos</div>' +
      '<div class="one-ag-resumo-valor">' + doMes.length + '</div>' +
      '<div class="one-ag-resumo-sub">no mês</div>' +
    '</div>';
}
window.oneAgRenderResumoMes = oneAgRenderResumoMes;

/* ════════════════════════════════════════════════════════════════
   LAYOUT v3 — atualiza data/hora no card "Conta Comigo" do header
   ════════════════════════════════════════════════════════════════ */
function oneDeskAtualizarMeta() {
  var els = document.querySelectorAll('.one-desk-card-conta-meta');
  if (!els.length) return;
  var agora = new Date();
  var dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  var dia = dias[agora.getDay()];
  var dataF = String(agora.getDate()).padStart(2,'0') + '/' + String(agora.getMonth()+1).padStart(2,'0');
  var hora = String(agora.getHours()).padStart(2,'0') + ':' + String(agora.getMinutes()).padStart(2,'0');
  var txt = dia + ' ' + dataF + ' · ' + hora;
  els.forEach(function(el){ el.textContent = txt; });
}
window.oneDeskAtualizarMeta = oneDeskAtualizarMeta;
// Roda a cada minuto pra manter a hora atualizada
setInterval(function(){ try { oneDeskAtualizarMeta(); } catch(e){} }, 60 * 1000);
// Roda uma vez ao carregar (após DOM ready)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', oneDeskAtualizarMeta);
} else {
  oneDeskAtualizarMeta();
}

/* ════════════════════════════════════════════════════════════════
   AGENDA MOBILE — Fase 2 v4 (porta TaskAreas + timeline 00–24h)

   Decisões fechadas (16/05/2026):
   - A2: markup paralelo com IDs sufix -mob, zero conflito de IDs
   - Só Semana primeiro (Hoje + Mês ficam pra Fase 2.5 — placeholders)
   - 3 colunas visíveis (hoje+offset-1, hoje+offset, hoje+offset+1)
     com setas ‹/› dia-a-dia. Evita conflito com swipe horizontal
     entre módulos (.one-screens-wrap scroll-snap x).
   - DnD via Pointer Events (touch nativo, sem polyfill).
     Snap 30min em vez de 15min do desktop.

   Estado: oneAgMobDayOffset, oneAgViewAtivaMob.
   Render principal: renderOneAgendaPainelMob().
   Helper compartilhado: oneAgCorCategoria (já existe).
   ════════════════════════════════════════════════════════════════ */

window.oneAgMobDayOffset = window.oneAgMobDayOffset || 0;
window.oneAgViewAtivaMob = window.oneAgViewAtivaMob || 'semana';

/* Render principal — 3 colunas centradas em (hoje + oneAgMobDayOffset) */
function renderOneAgendaPainelMob() {
  var kanban = document.getElementById('one-ag-kanban-mob');
  var label  = document.getElementById('one-ag-periodo-label-mob');
  if (!kanban) return;

  // Só renderiza se a view ativa for "semana" (Hoje/Mês ficam pra 2.5)
  if (window.oneAgViewAtivaMob !== 'semana') {
    oneAgAtualizarLabelPeriodoMob();
    return;
  }

  var compromissos = [];
  try { compromissos = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]'); } catch(e){}

  var hoje = new Date(); hoje.setHours(0,0,0,0);
  var hojeStr = hoje.toISOString().slice(0,10);

  // Âncora = hoje + offset; janela = [âncora-1, âncora, âncora+1]
  var anc = new Date(hoje); anc.setDate(hoje.getDate() + (window.oneAgMobDayOffset || 0));

  var NOMES_FULL = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
  var MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

  // Paleta SEG→SEX → reaproveita as cores do desktop (indexa por DOW real)
  var PALETTE_DOW = { 0:'#8DA39A', 1:'#C97B6A', 2:'#D89B5A', 3:'#D4B855', 4:'#A8B470', 5:'#7FA88E', 6:'#9DB1A8' };

  var H_START = 0, H_END = 24, PX = 50, SNAP_MIN = 30;
  var BODY_H = (H_END - H_START) * PX; // 1200px

  // Label do período: 3 dias visíveis
  var d0 = new Date(anc); d0.setDate(anc.getDate() - 1);
  var d2 = new Date(anc); d2.setDate(anc.getDate() + 1);
  if (label) {
    if (d0.getMonth() === d2.getMonth()) {
      label.textContent = d0.getDate() + '–' + d2.getDate() + ' ' + MESES[d0.getMonth()] + ' ' + d2.getFullYear();
    } else {
      label.textContent = d0.getDate() + ' ' + MESES[d0.getMonth()] + ' – ' + d2.getDate() + ' ' + MESES[d2.getMonth()];
    }
  }

  // Régua única à esquerda. Os labels ficam dentro de .one-ag-tl-ruler-content,
  // que o JS desloca via transform pra acompanhar o scroll das colunas (igual desktop).
  var rulerHtml = '<div class="one-ag-tl-ruler one-ag-week-ruler"><div class="one-ag-tl-ruler-content">';
  for (var rh = H_START; rh <= H_END; rh++) {
    rulerHtml += '<div class="one-ag-tl-hour" style="top:' + ((rh - H_START) * PX) + 'px">' + (rh < 10 ? '0' : '') + rh + ':00</div>';
  }
  rulerHtml += '</div></div>';

  // Grid lines (reutilizadas em cada coluna)
  var gridLines = '';
  for (var gh = 0; gh <= H_END - H_START; gh++) {
    gridLines += '<div class="one-ag-tl-grid-line" style="top:' + (gh * PX) + 'px"></div>';
  }

  var headerColsHtml = '';
  var colsHtml = '';

  for (var i = -1; i <= 1; i++) {
    var d = new Date(anc); d.setDate(anc.getDate() + i);
    var ds = d.toISOString().slice(0,10);
    var isHoje = ds === hojeStr;
    var dowReal = d.getDay();
    var cor = PALETTE_DOW[dowReal] || '#7FA88E';

    var doDia = compromissos
      .filter(function(c){ return c.data === ds; })
      .sort(function(a,b){ return (a.hora||'').localeCompare(b.hora||''); });

    var numDia = d.getDate();
    var numHtml = isHoje
      ? '<span class="one-ag-kday-num today-circle">' + numDia + '</span>'
      : '<span class="one-ag-kday-num">' + numDia + '</span>';

    var cards = (function(list, hStart, px) {
      return list.map(function(c) {
        var realizado = !!c.status && c.status.toLowerCase() === 'realizado';
        var hora = c.hora || '08:00';
        var nome = (c.nome || c.descricao || 'Compromisso').replace(/</g,'&lt;');
        var tipo = (c.tipo || '').replace(/</g,'&lt;');
        var cat  = (typeof oneAgCorCategoria === 'function') ? oneAgCorCategoria(tipo) : { cor:'#7FA88E', bg:'#F0E8F4' };
        var checkBg  = realizado ? '#4CAF50' : 'transparent';
        var checkBdr = realizado ? '#4CAF50' : '#C0BAD0';
        var checkTxt = realizado ? '✓' : '';
        var parts = String(hora).split(':');
        var hh = parseInt(parts[0]) || 0;
        var mm = parseInt(parts[1]) || 0;
        var top = ((hh - hStart) + mm / 60) * px;
        if (top < 0) top = 0;
        var dur = parseInt(c.duracao) || 60;
        var hPx = Math.max(28, Math.round(dur * (px / 60))); // touch target mínimo 28px
        var valor = c.valor ? ' · R$' + Number(c.valor).toFixed(0) : '';
        return '<div class="one-ag-kcard one-ag-tl-card one-ag-tl-card-mob' + (realizado ? ' realizado' : '') + '" data-event-id="' + c.id + '" data-cid="' + c.id + '" onclick="oneAgModalEditar(this.dataset.cid)" style="top:' + top + 'px;height:' + hPx + 'px;border-left-color:' + cat.cor + ';background:' + cat.bg + ';touch-action:none">' +
          '<div class="one-ag-kcard-check" data-cid="' + c.id + '" onclick="event.stopPropagation();oneAgToggleRealizado(this.dataset.cid)" style="background:' + checkBg + ';border-color:' + checkBdr + '">' + checkTxt + '</div>' +
          '<div class="one-ag-kcard-body">' +
            '<div class="one-ag-kcard-hora" style="color:' + cat.cor + '">' + hora + (valor ? '<span style="margin-left:5px;opacity:.7;font-size:10px">' + valor + '</span>' : '') + '</div>' +
            '<div class="one-ag-kcard-nome">' + nome + '</div>' +
            (tipo ? '<div class="one-ag-kcard-tipo"><span class="one-ag-kcard-dot" style="background:' + cat.cor + '"></span>' + tipo + '</div>' : '') +
          '</div>' +
        '</div>';
      }).join('');
    }(doDia, H_START, PX));

    // Header da coluna
    headerColsHtml +=
      '<div class="one-ag-kday-header' + (isHoje ? ' today' : '') + '" data-date="' + ds + '" style="border-top:3px solid ' + cor + '">' +
        '<div class="one-ag-kday-name-wrap">' +
          '<span class="one-ag-kday-name">' + NOMES_FULL[dowReal] + '</span>' +
          numHtml +
        '</div>' +
        '<div class="one-ag-kday-header-right">' +
          '<span class="one-ag-kday-count">' + doDia.length + '</span>' +
        '</div>' +
      '</div>';

    // Body da coluna (snap-min 30 via data-attr, lido pelo oneAgClickSlotWeek)
    colsHtml +=
      '<div class="one-ag-kday-col' + (isHoje ? ' today' : '') + '" data-date="' + ds + '" data-dow="' + dowReal + '">' +
        '<div class="one-ag-kday-body" data-date="' + ds + '" data-hour-offset="' + H_START + '" data-snap-min="' + SNAP_MIN + '" style="height:' + BODY_H + 'px" onclick="oneAgClickSlotWeek(event,this)">' +
          gridLines + cards +
        '</div>' +
      '</div>';
  }

  kanban.innerHTML =
    '<div class="one-ag-week-top">' +
      '<div class="one-ag-ruler-cap" style="width:32px;flex-shrink:0"></div>' +
      '<div class="one-ag-week-header-cols">' + headerColsHtml + '</div>' +
    '</div>' +
    '<div class="one-ag-week-main">' +
      rulerHtml +
      '<div class="one-ag-tl-cols one-ag-week-cols">' + colsHtml + '</div>' +
    '</div>';

  // Garante view Semana visível dentro do mobile
  document.querySelectorAll('.one-screen.one-agenda .one-fin-vista-mob').forEach(function(v) {
    v.hidden = v.getAttribute('data-view') !== 'semana';
  });

  // Inicia DnD touch nas colunas/cards mobile
  oneInitAgendaTouchDnDMob('#one-ag-kanban-mob', SNAP_MIN);
  // Scroll Y sincronizado entre colunas + régua (mesma função do desktop):
  // rolar uma coluna rola todas e desliza a régua de horas junto.
  oneAgSyncScrollSetup(kanban);
  oneAgRenderTopCardsMob();
}
window.renderOneAgendaPainelMob = renderOneAgendaPainelMob;

/* Trocar view mobile (Hoje | Semana | Mês) — só Semana renderiza por enquanto */
function oneAgSetViewMob(view) {
  window.oneAgViewAtivaMob = view;
  document.querySelectorAll('#one-ag-filters-mob .one-tar-filter[data-view]').forEach(function(t){
    t.classList.toggle('active', t.getAttribute('data-view') === view);
  });
  document.querySelectorAll('.one-screen.one-agenda .one-fin-vista-mob').forEach(function(v){
    v.hidden = v.getAttribute('data-view') !== view;
  });
  oneAgAtualizarLabelPeriodoMob();
  if (view === 'semana') {
    renderOneAgendaPainelMob();
  } else {
    // Hoje e Mês: placeholders por enquanto
    var alvoHoje = document.getElementById('one-ag-hoje-list-mob');
    var alvoMes  = document.getElementById('one-ag-mes-mob');
    if (view === 'hoje' && alvoHoje && !alvoHoje.innerHTML) {
      alvoHoje.innerHTML = '<p class="one-ag-hoje-empty">View Hoje mobile chega na Fase 2.5.</p>';
    }
    if (view === 'mes' && alvoMes && !alvoMes.innerHTML) {
      alvoMes.innerHTML = '<p class="one-ag-hoje-empty" style="padding:16px;text-align:center">View Mês mobile chega na Fase 2.5.</p>';
    }
  }
  oneAgRenderTopCardsMob();
}
window.oneAgSetViewMob = oneAgSetViewMob;

/* Setas ‹/› — navegam DIA A DIA na janela de 3 colunas */
function oneAgNavegarMob(delta) {
  window.oneAgMobDayOffset = (window.oneAgMobDayOffset || 0) + delta;
  renderOneAgendaPainelMob();
  oneAgAtualizarLabelPeriodoMob();
}
window.oneAgNavegarMob = oneAgNavegarMob;

/* Label do período mobile — depende da view ativa */
function oneAgAtualizarLabelPeriodoMob() {
  var lbl = document.getElementById('one-ag-periodo-label-mob');
  if (!lbl) return;
  var hoje = new Date();
  var view = window.oneAgViewAtivaMob || 'semana';
  var meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  if (view === 'hoje') {
    lbl.textContent = hoje.getDate() + ' ' + meses[hoje.getMonth()];
  } else if (view === 'mes') {
    lbl.textContent = meses[hoje.getMonth()] + ' ' + hoje.getFullYear();
  }
  // Semana: label fica em branco aqui — o render preenche com o intervalo dos 3 dias
}
window.oneAgAtualizarLabelPeriodoMob = oneAgAtualizarLabelPeriodoMob;

/* Pills do header mobile — contagem de Hoje/Semana/Mês */
function oneAgRenderTopCardsMob() {
  var hoje = new Date(); hoje.setHours(0,0,0,0);
  var hojeStr = hoje.toISOString().slice(0,10);
  var dow = hoje.getDay();
  var diffSeg = (dow === 0 ? -6 : 1 - dow);
  var seg = new Date(hoje); seg.setDate(hoje.getDate() + diffSeg);
  var dom = new Date(seg); dom.setDate(seg.getDate() + 6);
  var segStr = seg.toISOString().slice(0,10);
  var domStr = dom.toISOString().slice(0,10);
  var mesIni = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0,10);
  var mesFim = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0).toISOString().slice(0,10);

  var compromissos = [];
  try { compromissos = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]'); } catch(e){}

  var qH = 0, qS = 0, qM = 0;
  compromissos.forEach(function(c){
    if (!c.data) return;
    if (c.data === hojeStr)                    qH++;
    if (c.data >= segStr && c.data <= domStr)  qS++;
    if (c.data >= mesIni && c.data <= mesFim)  qM++;
  });

  var set = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };
  set('one-ag-pill-hoje-mob',   qH + ' hoje');
  set('one-ag-pill-semana-mob', qS + ' sem');
  set('one-ag-pill-mes-mob',    qM + ' mês');
}
window.oneAgRenderTopCardsMob = oneAgRenderTopCardsMob;

/* DnD touch nativo via Pointer Events — snap parametrizável (default 30min mobile) */
function oneInitAgendaTouchDnDMob(rootSel, snapMin) {
  snapMin = snapMin || 30;
  var root = document.querySelector(rootSel);
  if (!root) return;

  var dragState = null; // { id, ghost, startX, startY, originRect }

  function endDrag(commit) {
    if (!dragState) return;
    if (dragState.ghost && dragState.ghost.parentNode) {
      dragState.ghost.parentNode.removeChild(dragState.ghost);
    }
    document.querySelectorAll('.one-ag-drop-target').forEach(function(c){ c.classList.remove('one-ag-drop-target'); });
    var ds = dragState;
    dragState = null;
    if (!commit || !ds.targetCol) return;

    var rect = ds.targetCol.getBoundingClientRect();
    var hourOffset = parseInt(ds.targetCol.getAttribute('data-hour-offset') || '0');
    var y = ds.lastClientY - rect.top - (ds.offsetY || 0);
    var novaHora = oneAgTopParaHora(y + hourOffset * 50, snapMin);
    var novaData = ds.targetCol.parentNode.getAttribute('data-date');

    var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]'); } catch(e){}
    var idx = lista.findIndex(function(x){ return x.id === ds.id; });
    if (idx === -1) return;
    lista[idx].data = novaData;
    lista[idx].hora = novaHora;
    localStorage.setItem(oneU('compromissos'), JSON.stringify(lista));

    var rec = []; try { rec = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]'); } catch(e){}
    var rIdx = rec.findIndex(function(r){ return r.compromissoId === ds.id; });
    if (rIdx !== -1) { rec[rIdx].data = novaData; localStorage.setItem(oneU('receitas'), JSON.stringify(rec)); }

    if (typeof oneToast === 'function') oneToast('✓ ' + novaData.split('-').reverse().join('/') + ' às ' + novaHora);
    renderOneAgendaPainelMob();
    if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
  }

  // Long-press 350ms pra entrar em modo drag (evita ativar em scroll/tap)
  var cards = root.querySelectorAll('.one-ag-kcard');
  cards.forEach(function(card){
    if (card._dndReady) return;
    card._dndReady = true;
    var longPressTimer = null;
    var started = false;

    card.addEventListener('pointerdown', function(ev){
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      var rect = card.getBoundingClientRect();
      var offsetY = ev.clientY - rect.top;
      started = false;
      longPressTimer = setTimeout(function(){
        started = true;
        // Cria fantasma
        var ghost = card.cloneNode(true);
        ghost.style.position = 'fixed';
        ghost.style.left = rect.left + 'px';
        ghost.style.top  = rect.top + 'px';
        ghost.style.width = rect.width + 'px';
        ghost.style.height = rect.height + 'px';
        ghost.style.opacity = '0.85';
        ghost.style.zIndex = '9999';
        ghost.style.pointerEvents = 'none';
        ghost.style.transform = 'scale(1.03)';
        ghost.style.boxShadow = '0 8px 20px rgba(0,0,0,.25)';
        document.body.appendChild(ghost);
        dragState = { id: card.getAttribute('data-event-id') || card.getAttribute('data-cid'), ghost: ghost, offsetY: offsetY, lastClientY: ev.clientY, targetCol: null };
        card.classList.add('one-ag-event-dragging');
        if (navigator.vibrate) try { navigator.vibrate(20); } catch(e){}
      }, 350);
    });

    card.addEventListener('pointermove', function(ev){
      if (!started || !dragState) return;
      ev.preventDefault();
      dragState.lastClientY = ev.clientY;
      // Move fantasma seguindo o dedo
      var top = ev.clientY - dragState.offsetY;
      dragState.ghost.style.top  = top + 'px';
      dragState.ghost.style.left = (ev.clientX - dragState.ghost.offsetWidth/2) + 'px';
      // Detecta coluna alvo
      var below = document.elementFromPoint(ev.clientX, ev.clientY);
      var col = below && below.closest ? below.closest('.one-ag-kday-body') : null;
      document.querySelectorAll('.one-ag-drop-target').forEach(function(c){ c.classList.remove('one-ag-drop-target'); });
      if (col) {
        col.classList.add('one-ag-drop-target');
        dragState.targetCol = col;
      } else {
        dragState.targetCol = null;
      }
    });

    var cancelAndEnd = function(commit){
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      if (started) {
        card.classList.remove('one-ag-event-dragging');
        endDrag(commit);
      }
      started = false;
    };

    card.addEventListener('pointerup',     function(){ cancelAndEnd(true);  });
    card.addEventListener('pointercancel', function(){ cancelAndEnd(false); });
    card.addEventListener('pointerleave',  function(){
      // Se sair do card durante long-press ainda não confirmado, cancela
      if (longPressTimer && !started) { clearTimeout(longPressTimer); longPressTimer = null; }
    });
  });
}
window.oneInitAgendaTouchDnDMob = oneInitAgendaTouchDnDMob;

/* Render inicial mobile no DOM ready (caso o app carregue direto na tela Agenda) */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function(){
    try { renderOneAgendaPainelMob(); } catch(e){}
  });
} else {
  try { renderOneAgendaPainelMob(); } catch(e){}
}
