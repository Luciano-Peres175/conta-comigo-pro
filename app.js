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

    if (grupo === 'familia') {
      // Familia: card fixo Leticia Kurtz / Fonoaudiologa (e o Luciano/Catia/Le sabem que e o app dela)
      avatar.textContent = 'LK';
      nomeEl.textContent = 'Letícia Kurtz';
      tagEl.textContent  = 'Fonoaudióloga';
    } else {
      // Amigas: nome da pessoa + tag "Beta Próxima"
      const iniciais = nome.split(' ').filter(Boolean).slice(0,2).map(s => s[0]).join('').toUpperCase() || '??';
      avatar.textContent = iniciais;
      nomeEl.textContent = nome || 'Beta';
      tagEl.textContent  = 'Beta Próxima';
    }

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
    },
    tarefas:   function() {
      if (typeof renderOneTarefasPainel === 'function') renderOneTarefasPainel();
      if (typeof renderOneDeskTarefas   === 'function') renderOneDeskTarefas();
    },
    financeiro: function() {
      if (typeof renderCardFinanceiro === 'function') renderCardFinanceiro();
      if (typeof renderLancamentos    === 'function') renderLancamentos();
      if (typeof renderListaReceitas  === 'function') renderListaReceitas();
      if (typeof renderDespesas       === 'function') renderDespesas();
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
  function atualizarHome() {
    renderCardFinanceiro();
    renderCardAgenda();
    renderLancamentos();
    renderAgendaHome();
    renderIcons();
  }

  /* ── Inicialização de dados ─────────────────────────────────── */
  const FIXAS_DEFAULT = [
    { id:'f1', descricao:'Aluguel',            categoria:'Infraestrutura',           valor:1200 },
    { id:'f2', descricao:'Secretária',          categoria:'Equipe',                   valor:800  },
    { id:'f3', descricao:'Combustível',         categoria:'Deslocamento Profissional',valor:300  },
    { id:'f4', descricao:'Materiais Clínicos',  categoria:'Materiais Clínicos',       valor:250  },
    { id:'f5', descricao:'Internet / Telefone', categoria:'Comunicação Profissional', valor:150  },
    { id:'f6', descricao:'Contador',            categoria:'Serviços Profissionais',   valor:200  },
    { id:'f7', descricao:'Tecnologia',          categoria:'Tecnologia',               valor:100  },
  ];

  /* Migração one-shot: copia dados legados (sem prefixo) pra chave do user atual.
     Roda só uma vez por user (flag migrated_legacy_v1). Remove a chave legada
     pra não migrar pra outro user que logue depois no mesmo navegador. */
  function migrarDadosLegado() {
    if (!window.authUser || !window.authUser.id) return;
    if (localStorage.getItem(oneU('migrated_legacy_v1'))) return;
    var chaves = ['compromissos','tarefas','tarefas_areas','receitas','despesas','despesasFixas','notas_cerebro','usuario','ccp_imposto_pct','ccp_forma_pagamento','ccp_ia_uso','ccp_initialized','one_init'];
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

      if (grupo === 'admin') {
        // Luciano — fonoaudiologia (dados demo)
        localStorage.setItem(oneU('receitas'),      JSON.stringify(getReceitasDemo()));
        localStorage.setItem(oneU('despesas'),      JSON.stringify(getDespesasDemo()));
        localStorage.setItem(oneU('compromissos'),  JSON.stringify(getCompromissosDemo()));
        localStorage.setItem(oneU('notas_cerebro'), JSON.stringify(getNotasDemo()));
        localStorage.setItem(oneU('tarefas'),       JSON.stringify([]));

      } else if (grupo === 'familia') {
        // Cátia — Conta Comigo Pinah: histórico real do pet + notas do vault Obsidian
        localStorage.setItem(oneU('receitas'),      JSON.stringify([]));
        localStorage.setItem(oneU('despesas'),      JSON.stringify(getDespesasPinah()));
        localStorage.setItem(oneU('compromissos'),  JSON.stringify(getCompromissosPinah()));
        localStorage.setItem(oneU('tarefas'),       JSON.stringify(getTarefasPinah()));
        localStorage.setItem(oneU('notas_cerebro'), JSON.stringify(getNotasPinah()));

      } else if (grupo === 'fono') {
        // Letícia — fonoaudióloga: 9 artigos reais do vault (amamentação, frênulo, desenvolvimento)
        localStorage.setItem(oneU('receitas'),      JSON.stringify(getReceitasFono()));
        localStorage.setItem(oneU('despesas'),      JSON.stringify(getDespesasFono()));
        localStorage.setItem(oneU('compromissos'),  JSON.stringify(getCompromissosFono()));
        localStorage.setItem(oneU('tarefas'),       JSON.stringify(getTarefasFono()));
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
    // Garante fixas mesmo em app já inicializado mas vazio
    const fixas = JSON.parse(localStorage.getItem(oneU('despesasFixas')) || '[]');
    if (fixas.length === 0) {
      localStorage.setItem(oneU('despesasFixas'), JSON.stringify(FIXAS_DEFAULT));
    }
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

  /* ── Segundo Cerebro — categorias e estado ──────────────────── */
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
        conteudo: 'Roteiro para palestra de 30 minutos em conselho regional. Audiência: fonoaudiólogas iniciantes + pediatras parceiras.\n\nESTRUTURA:\n\n1. ABERTURA (3 min)\n   - Quem sou eu, formação, área de atuação\n   - "50 atendimentos depois, o que mudou na minha cabeça"\n\n2. TOP 3 CAUSAS DE DOR NA MAMA — não é o que eu pensava (8 min)\n   - Pega errada: 60% dos casos (esperado)\n   - Frênulo + posicionamento errado: 25% (era subestimado)\n   - Mama ingurgitada por horários rígidos: 15% (subestimado também)\n   - Cases ilustrativos\n\n3. O QUE NINGUÉM ENSINOU NA FACULDADE (10 min)\n   - Mãe vem mais ansiosa que o bebê — atender a mãe primeiro\n   - 80% dos casos resolve em 2-3 sessões\n   - Trabalhar com dentista pediátrica vira diferencial\n   - WhatsApp pós-consulta sustenta o aprendizado\n   - Vídeo da mãe filmando a próxima mamada vale mais que 1h de orientação\n\n4. O QUE EU MUDARIA SE COMEÇASSE HOJE (5 min)\n   - Investir em consultoria à beira do leito\n   - Construir rede com pediatras (não com mães)\n   - Documentar TODOS os casos (Segundo Cérebro)\n\n5. PERGUNTAS (4 min)\n\nDADOS A INCLUIR: estatísticas dos meus 50 cases, gráficos simples, fotos com autorização.',
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

  /* Notas do Segundo Cérebro da Pinah — histórico veterinário real */
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

  /* Notas do Segundo Cérebro da Letícia — artigos reais do vault Obsidian */
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
    if (!confirm('Isso vai APAGAR TODOS os dados atuais e carregar apenas os exemplos demo:\n\n• 10 notas no Segundo Cérebro\n• 10 receitas de exemplo\n• 3 despesas variáveis\n• 6 compromissos (passados, hoje e futuros)\n\nContinuar?')) return;
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
    if (!confirm('Isso vai APAGAR TODOS os dados do app:\n\n• Todas as notas do Segundo Cérebro\n• Todas as receitas\n• Todas as despesas\n• Todas as despesas fixas\n• Todos os compromissos\n\nApenas as configurações (forma de pagamento, % imposto) serão mantidas.\n\nEsta ação NÃO PODE ser desfeita. Continuar?')) return;
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

    const deMes = item => {
      if (!item.data) return true;
      const d = new Date(item.data + 'T00:00:00');
      return d.getFullYear() === ano && d.getMonth() === mes;
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

    despesasFixas.forEach(df => items.push({
      nome: df.descricao || df.nome || 'Despesa Fixa',
      categoria: df.categoria || 'Fixo',
      data: primeiroMes,
      valor: Number(df.valor) || 0,
      tipo: 'despesa',
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
  /* ── Segundo Cerebro — Modal "Perguntar a IA" ────────────────── */
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

  /* ── Segundo Cerebro — Modal Nova/Editar Nota ────────────────── */
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

  /* ── Segundo Cerebro — Render principal ──────────────────────── */
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
    // 1) Categorias (com contagem)
    const grid = document.getElementById('cerebro-categorias-grid');
    if (grid) {
      const notas = getNotas();
      grid.innerHTML = CEREBRO_CATEGORIAS.map(cat => {
        const count = notas.filter(n => n.categoria === cat.id).length;
        const ativa = cerebroFiltroCategoria === cat.id;
        return `<div class="cerebro-cat${ativa ? ' cerebro-cat-ativa' : ''}" onclick="setCategoriaFiltro('${cat.id}')" style="cursor:pointer;${ativa ? 'border:2px solid '+cat.cor+';' : ''}">
          <div class="cerebro-cat-icon" style="color:${cat.cor}"><i data-lucide="${cat.icone}"></i></div>
          <div class="cerebro-cat-nome">${cat.nome}</div>
          <div class="cerebro-cat-count">${count} ${count === 1 ? 'nota' : 'notas'}</div>
        </div>`;
      }).join('');
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
        filtrosEl.style.display = 'flex';
        filtrosEl.innerHTML = chips.join('') +
          '<button onclick="limparFiltros()" style="background:none;border:none;color:#7FA88E;font-size:12px;font-weight:700;cursor:pointer;text-decoration:underline;margin-left:6px">Limpar</button>';
      } else {
        filtrosEl.style.display = 'none';
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

    renderIcons();
  }

  function renderNotaCard(n) {
    const cat = getCategoria(n.categoria);
    const dataStr = (n.dataModificacao || n.data || '').slice(0, 10).split('-').reverse().join('/');
    const snippet = String(n.conteudo || '').replace(/\s+/g, ' ').slice(0, 160);
    const tagsHtml = (Array.isArray(n.tags) && n.tags.length)
      ? '<div class="nota-tags">' + n.tags.map(t => '<span class="nota-tag">#' + escHtml(t) + '</span>').join('') + '</div>'
      : '';
    const pacHtml = n.paciente ? ' · ' + escHtml(n.paciente) : '';
    return `<div class="nota-card" onclick="abrirModalNota('${n.id}')">
      <div class="nota-card-header">
        <div class="nota-card-titulo">${escHtml(n.titulo || '(sem título)')}</div>
        <span class="nota-card-cat" style="background:${cat.cor}22;color:${cat.cor}">${cat.nome}</span>
      </div>
      ${snippet ? '<div class="nota-card-snippet">' + escHtml(snippet) + (n.conteudo && n.conteudo.length > 160 ? '...' : '') + '</div>' : ''}
      <div class="nota-card-footer">
        <span>${dataStr}${pacHtml}</span>
        ${tagsHtml}
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
  return {
    compromissos: get('compromissos'),
    tarefas:      get('tarefas'),
    receitas:     get('receitas'),
    despesas:     get('despesas')
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
    default: console.warn('[Pinah] tool desconhecida:', nome);
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
  // Re-render do Segundo Cérebro se estiver visível
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
  compromissos:   'compromissos',
  tarefas:        'tarefas',
  notas_cerebro:  'notas'
};

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
        forma_pagamento: item.forma_pagamento || item.formaPagamento || ''
      });
    case 'despesas':
      return Object.assign(base, {
        id:        item.id,
        descricao: item.descricao || item.nome || '',
        valor:     item.valor || 0,
        data:      item.data || new Date().toISOString().slice(0,10),
        categoria: item.categoria || ''
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
        area:       item.area || 'Geral',
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
        id:        item.id,
        descricao: item.descricao || '',
        categoria: item.categoria || 'Outros',
        valor:     Number(item.valor) || 0
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
        criadoEm:        row.created_at || ''
      };
    case 'despesas':
      return {
        id:         row.id,
        descricao:  row.descricao || '',
        nome:       row.descricao || '',
        valor:      row.valor || 0,
        data:       row.data || '',
        categoria:  row.categoria || '',
        tipo:       row.tipo || 'despesa',
        status:     row.status || '',
        criadoEm:   row.created_at || ''
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
        area:       row.area || 'Geral',
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
    default:
      return row;
  }
}

/* Busca todos os dados do Supabase e popula localStorage do usuário atual */
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
        var itens = rows.map(function(row) { return _supaMapFromRow(localKey, row); });
        localStorage.setItem(prefix + localKey, JSON.stringify(itens));
        console.log('[supaSync]', tabela, '→', itens.length, 'itens');
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
  var tabela = SUPA_TABLES[localKey];
  if (!tabela) {
    console.warn('[supaUpsert] tabela desconhecida para localKey:', localKey);
    if (typeof oneToast === 'function') oneToast('⚠ Tabela desconhecida: ' + localKey);
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
    if (typeof oneToast === 'function') oneToast('⚠ Exceção sync: ' + e.message);
  }
}
window.supaUpsert = supaUpsert;

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

/* Remove um item do Supabase pelo id */
async function supaDelete(localKey, id) {
  if (!window.supa || !window.authUser) return;
  var tabela = SUPA_TABLES[localKey];
  if (!tabela) return;
  try {
    var result = await window.supa.from(tabela).delete()
      .eq('id', id).eq('user_id', window.authUser.id);
    if (result.error) console.warn('[supaDelete]', tabela, id, result.error.message);
  } catch(e) {
    console.warn('[supaDelete] Exceção:', e);
  }
}

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
  var store = _pinahGetSet('tarefas');
  var lista = store.get();
  var novo = {
    id:         (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
    titulo:     input.titulo     || '',
    nome:       input.titulo     || '',
    area:       input.area       || 'Geral',
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
      apiContent = (texto || 'Analise este documento e salve como nota no Segundo Cérebro.') +
        '\n\n[Arquivo: ' + arquivo.nome + ']\n\n' + arquivo.textoExtraido;
    } else {
      var fileBlock = arquivo.tipo === 'pdf'
        ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: arquivo.base64 } }
        : { type: 'image',    source: { type: 'base64', media_type: arquivo.mimeType,   data: arquivo.base64 } };
      apiContent = [
        fileBlock,
        { type: 'text', text: texto || 'Analise este arquivo e salve o conteúdo como nota no Segundo Cérebro.' }
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
    const resp = await fetch('/api/pinah-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: apiMessages,
        context: pinahGetContext(),
        profile: window.authProfile ? {
          nome:      window.authProfile.nome      || null,
          bio_pinah: window.authProfile.bio_pinah || null
        } : null
      })
    });

    if (!resp.ok) throw new Error('HTTP ' + resp.status);

    var bubble   = emChat ? pinahAddBubble('pinah', '') : null;
    var fullText = '';

    /* Mobile: substitui bolha de typing pela bolha de resposta */
    var mobBubble = null;
    if (isMobile && msgsMob) {
      var tb = document.getElementById('mob-typing-bub');
      if (tb) { tb.className = 'chat-bubble pinah-bubble'; tb.innerHTML = ''; }
      mobBubble = tb;
    }

    if (emChat) pinahTypingHide();

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
            pinahExecutarTool(ev.tool, ev.input || {});
          }
          if (ev.text) {
            fullText += ev.text;
            if (emChat && bubble) {
              bubble.innerHTML = pinahRenderText(fullText);
              if (msgs) msgs.scrollTop = msgs.scrollHeight;
            }
            if (mobBubble) {
              mobBubble.innerHTML = pinahRenderText(fullText);
              if (msgsMob) msgsMob.scrollTop = msgsMob.scrollHeight;
            }
          }
          if (ev.done) {
            pinahHistory.push({ role: 'assistant', content: fullText });
            // Fora do chat: mostra resposta da Pinah como toast
            if (!emChat && fullText.trim()) {
              var resumo = fullText.trim().replace(/\n/g, ' ');
              if (resumo.length > 120) resumo = resumo.slice(0, 117) + '…';
              if (window.toast) window.toast('Pinah: ' + resumo, null, { duration: 6000 });
            }
          }
          if (ev.error) {
            if (emChat && bubble) bubble.innerHTML = '⚠️ ' + pinahRenderText(ev.error);
            else if (window.toast) window.toast('⚠️ ' + ev.error, 'error');
          }
        } catch (e) { /* linha mal formada — ignora */ }
      }
    }

  } catch (err) {
    if (emChat) {
      pinahTypingHide();
      pinahAddBubble('pinah', '⚠️ Não consegui conectar com a Pinah. Verifique a conexão e tente de novo.');
    } else {
      if (window.toast) window.toast('⚠️ Erro ao conectar com a Pinah.', 'error');
    }
    console.error('[pinahEnviar]', err);
  }
}

/* ── Mobile — ir ao slide de chat ───────────────────────────── */
function oneMobScrollToChat() {
  var wrap = document.getElementById('one-screens-wrap');
  if (wrap) wrap.scrollTo({ left: 0, behavior: 'smooth' });
}

/* Focar input de qualquer slide → arrasta para o chat */
function oneMobInputFocus() {
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

function oneEnviar() {
  var inputDesk = document.getElementById('one-input-desk');
  var inputMob  = document.getElementById('one-input');
  var input = (inputDesk && inputDesk.value.trim()) ? inputDesk : inputMob;

  var texto  = input ? input.value.trim() : '';
  var arquivo = _chatArquivoAtual;

  // Precisa de texto OU arquivo para enviar
  if (!texto && !arquivo) return;

  if (input) { input.value = ''; input.style.height = 'auto'; }
  _chatLimparArquivo();

  pinahEnviar(texto, arquivo);
}

// ── Anexar arquivo no chat ────────────────────────────────────────
var _chatArquivoAtual = null;

function oneAnexar() {
  var input = document.getElementById('chat-file-input');
  if (input) input.click();
}
window.oneAnexar = oneAnexar;

function _chatOnFileSelect(input) {
  var file = input && input.files && input.files[0];
  if (!file) return;
  input.value = ''; // permite re-selecionar o mesmo arquivo
  var ext = (file.name || '').split('.').pop().toLowerCase();
  var extOk = ['pdf','docx','jpg','jpeg','png','webp'];
  if (!extOk.includes(ext)) { toast('Use PDF, DOCX, JPG ou PNG.', 'error'); return; }
  if (file.size > 20 * 1024 * 1024) { toast('Arquivo muito grande (máx 20MB).', 'error'); return; }

  _chatMostrarChip(file.name, true); // loading

  if (ext === 'docx') {
    // DOCX: extração client-side com mammoth
    if (!window.mammoth) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
      s.onload = function() { _chatLerDOCX(file); };
      s.onerror = function() { toast('Falha ao carregar leitor de DOCX.', 'error'); _chatLimparArquivo(); };
      document.head.appendChild(s);
    } else {
      _chatLerDOCX(file);
    }
  } else {
    // PDF ou imagem — lê como base64
    var reader = new FileReader();
    reader.onload = function(e) {
      var dataUrl = e.target.result;
      var base64  = dataUrl.split(',')[1];
      _chatArquivoAtual = {
        nome:     file.name,
        tipo:     ext === 'pdf' ? 'pdf' : 'imagem',
        base64:   base64,
        mimeType: ext === 'pdf' ? 'application/pdf' : file.type
      };
      _chatMostrarChip(file.name, false);
    };
    reader.onerror = function() { toast('Erro ao ler arquivo.', 'error'); _chatLimparArquivo(); };
    reader.readAsDataURL(file);
  }
}
window._chatOnFileSelect = _chatOnFileSelect;

function _chatLerDOCX(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    window.mammoth.extractRawText({ arrayBuffer: e.target.result })
      .then(function(result) {
        _chatArquivoAtual = { nome: file.name, tipo: 'texto', textoExtraido: result.value || '' };
        _chatMostrarChip(file.name, false);
      })
      .catch(function() { toast('Erro ao ler DOCX.', 'error'); _chatLimparArquivo(); });
  };
  reader.readAsArrayBuffer(file);
}

function _chatMostrarChip(nome, loading) {
  ['mob','desk'].forEach(function(v) {
    var chip = document.getElementById('chat-file-chip-' + v);
    var span = document.getElementById('chat-file-chip-' + v + '-nome');
    if (!chip) return;
    chip.style.display = 'flex';
    chip.classList.toggle('loading', !!loading);
    if (span) span.textContent = '📎 ' + nome;
  });
}

function _chatLimparArquivo() {
  _chatArquivoAtual = null;
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
    financeiro: function() { if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel(); }
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
    if (stored && Array.isArray(stored) && stored.length) return stored;
  } catch(e) {}
  // Áreas padrão estilo TaskAreas
  var defaults = ['Pinah','Enroscos','Ideias PA','Casa','Baú do Milhão'];
  oneTarSaveAreas(defaults);
  return defaults;
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
  var area = col ? col.dataset.area : 'Geral';
  var nome = input ? input.value.trim() : '';
  if (!nome) { oneTarHideInline(el); return; }
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
    tarefas.forEach(function(t){ if ((t.area||'Geral') === area) t.area = novo; });
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
  var comTarefas = tarefas.filter(function(t){ return (t.area||'Geral') === area; }).length;
  if (comTarefas > 0) {
    if (!confirm('A área "' + area + '" tem ' + comTarefas + ' tarefa(s). Excluir mesmo assim? As tarefas irão para "Geral".')) return;
    tarefas.forEach(function(t){ if ((t.area||'Geral') === area) t.area = 'Geral'; });
    localStorage.setItem(oneU('tarefas'), JSON.stringify(tarefas));
  }
  var areas = oneTarGetAreas().filter(function(a){ return a !== area; });
  if (areas.indexOf('Geral') === -1) areas.unshift('Geral');
  oneTarSaveAreas(areas);
  renderOneTarefasPainel();
}

function oneTarAreaToggle(area, btn) {
  oneTarCollapsed[area] = !oneTarCollapsed[area];
  renderOneTarefasPainel();
}

function renderOneTarefasPainel() {
  var el = document.getElementById('one-tarefas-list');
  var count = document.getElementById('one-tarefas-count');
  if (!el) return;
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

  // Áreas persistidas
  var areaNames = oneTarGetAreas();
  // Garantir que áreas de tarefas existentes também aparecem
  todasTarefas.forEach(function(t){
    var a = t.area || 'Geral';
    if (areaNames.indexOf(a) === -1) { areaNames.push(a); oneTarSaveAreas(areaNames); }
  });

  // Filtrar tarefas
  var tarefas = todasTarefas.filter(function(t){
    if (oneTarFilterStatus === 'pendente'  && !!t.concluida) return false;
    if (oneTarFilterStatus === 'concluida' && !t.concluida)  return false;
    if (oneTarFilterPrio !== 'qualquer' && (t.prioridade||'Normal') !== oneTarFilterPrio) return false;
    return true;
  });

  var html = '<div class="one-tar-kanban">';
  areaNames.forEach(function(area) {
    var tasks = tarefas.filter(function(t){ return (t.area||'Geral') === area; });
    var total = todasTarefas.filter(function(t){ return (t.area||'Geral') === area; });
    var conclN = total.filter(function(t){ return !!t.concluida; }).length;
    var cor = corArea(area);
    var emoji = emojiArea(area);

    var cards = tasks.map(function(t) {
      var conc = !!t.concluida;
      var cp = corPrio(t.prioridade);
      return '<div class="one-tar-card' + (conc ? ' concluida' : '') + '" style="border-left-color:' + (conc ? '#4CAF50' : cor) + '">' +
        '<div class="one-tar-check" data-tid="' + t.id + '" onclick="oneTarToggle(this.dataset.tid)" style="background:' + (conc?'#4CAF50':'transparent') + ';border-color:' + (conc?'#4CAF50':'#C0BAD0') + '">' + (conc?'✓':'') + '</div>' +
        '<div class="one-tar-card-body">' +
          '<div class="one-tar-card-nome">' + (t.nome||'Sem nome').replace(/</g,'&lt;') + '</div>' +
          '<span class="one-tar-prio-badge" style="background:' + cp.bg + ';color:' + cp.cor + '">' + (t.prioridade||'Normal') + '</span>' +
          (t.data ? '<div class="one-tar-card-data">' + t.data.split('-').reverse().join('/') + '</div>' : '') +
        '</div>' +
        '<div class="one-tar-card-actions">' +
          '<button class="one-tar-card-btn edit" data-tid="' + t.id + '" onclick="event.stopPropagation();oneTarModalEditar(this.dataset.tid)" title="Editar">✏️</button>' +
          '<button class="one-tar-card-btn del" data-tid="' + t.id + '" onclick="event.stopPropagation();oneTarExcluir(this.dataset.tid)" title="Excluir">🗑️</button>' +
        '</div>' +
      '</div>';
    }).join('');

    var emptyMsg = tasks.length === 0 ? '<div style="color:#C0BAD0;font-size:11px;font-style:italic;padding:8px 4px;text-align:center">Nenhuma tarefa</div>' : '';

    var areaEnc  = area.replace(/'/g,"\\'").replace(/"/g,'&quot;');
    var collapsed = oneTarCollapsed[area] ? ' one-tar-col-collapsed' : '';
    html += '<div class="one-tar-col' + collapsed + '" data-area="' + area.replace(/"/g,'&quot;') + '">' +
      '<div class="one-tar-col-header" style="border-top:3px solid ' + cor + '">' +
        '<div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1">' +
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
  var area = (document.getElementById('one-tar-area')||{}).value || 'Geral';
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
}


function oneTarExcluir(id) {
  if (!confirm('Excluir esta tarefa?')) return;
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU('tarefas'))||'[]'); } catch(e){}
  lista = lista.filter(function(t){ return t.id !== id; });
  localStorage.setItem(oneU('tarefas'), JSON.stringify(lista));
  supaDelete('tarefas', id);
  if (typeof oneToast==='function') oneToast('Tarefa excluída.');
  renderOneTarefasPainel();
}

function oneTarModalAbrir(area) {
  var modal = document.getElementById('one-tar-modal');
  if (!modal) return;
  document.getElementById('one-tar-modal-title').textContent = 'Nova tarefa';
  document.getElementById('one-tar-modal-id').value = '';
  document.getElementById('one-tar-modal-nome').value = '';
  document.getElementById('one-tar-modal-desc').value = '';
  document.getElementById('one-tar-modal-prio').value = 'Normal';
  document.getElementById('one-tar-modal-status').value = 'pendente';
  document.getElementById('one-tar-modal-data').value = '';
  // Preencher áreas no select
  var sel = document.getElementById('one-tar-modal-area');
  var areas = oneTarGetAreas();
  sel.innerHTML = areas.map(function(a){ return '<option value="' + a.replace(/"/g,'&quot;') + '"' + (a===(area||'Geral')?' selected':'') + '>' + a + '</option>'; }).join('');
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
  modal.classList.add('open');
  setTimeout(function(){ document.getElementById('one-tar-modal-nome').focus(); }, 100);
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
  var area   = document.getElementById('one-tar-modal-area').value || 'Geral';
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
  } else if (vistaAtual === 'dashboard' && typeof oneFinRenderCategorias === 'function') {
    document.querySelectorAll('.one-desktop-financeiro .one-fin-vista').forEach(function(v){ v.hidden = v.getAttribute('data-vista') !== 'dashboard'; });
    setTimeout(oneFinRenderCategorias, 0);
  }

  var receitas = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]');
  var despesas = JSON.parse(localStorage.getItem(oneU('despesas')) || '[]');
  var hoje = new Date(); hoje.setHours(0,0,0,0);
  var mes = hoje.getMonth(), ano = hoje.getFullYear();
  var meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  function noMes(d) {
    var date = new Date(d + 'T00:00:00');
    return date.getMonth() === mes && date.getFullYear() === ano;
  }
  var rMes = receitas.filter(function(r){ return noMes(r.data); });
  var dMes = despesas.filter(function(d){ return noMes(d.data); });

  var totalReceitas  = rMes.filter(function(r){ return r.status !== 'pendente'; }).reduce(function(s,r){ return s + (Number(r.valor)||0); }, 0);
  var totalDespesas  = dMes.reduce(function(s,d){ return s + (Number(d.valor)||0); }, 0);
  var totalPendente  = rMes.filter(function(r){ return r.status === 'pendente'; }).reduce(function(s,r){ return s + (Number(r.valor)||0); }, 0);
  var saldo = totalReceitas - totalDespesas;

  function brl(v) { return 'R$ ' + (v||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}); }
  var setText = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };

  setText('one-fin-periodo', meses[mes] + '/' + ano);
  setText('one-fin-saldo-big', brl(saldo));
  setText('one-fin-entradas-big', brl(totalReceitas));
  setText('one-fin-saidas-big', brl(totalDespesas));
  setText('one-fin-pendente-big', brl(totalPendente));

  var el = document.getElementById('one-fin-list-big');
  if (!el) return;

  // Filtro de período da lista (afeta SÓ a lista, não os totais do mês acima)
  var periodo = window.oneFinFiltroPeriodo || 'mes';
  var rFil = receitas, dFil = despesas;
  if (periodo === 'mes') {
    rFil = rMes; dFil = dMes;
  } else {
    var dias = parseInt(periodo, 10) || 30;
    var inicio = new Date(hoje); inicio.setDate(inicio.getDate() - dias);
    var inicioStr = inicio.toISOString().slice(0,10);
    rFil = receitas.filter(function(r){ return (r.data||'') >= inicioStr; });
    dFil = despesas.filter(function(d){ return (d.data||'') >= inicioStr; });
  }

  // Filtro adicional vindo dos cards de alerta (pendentes / vencendo)
  if (window.oneFinFiltroAtivo === 'pendentes') {
    rFil = rFil.filter(function(r){
      var s = String(r.status || '').toLowerCase();
      return s === 'pendente' || s === 'aberto' || s === 'aguardando';
    });
    dFil = []; // pendentes é só de receitas
  } else if (window.oneFinFiltroAtivo === 'vencendo') {
    var hojeStr2 = hoje.toISOString().slice(0,10);
    var em7Dias2 = new Date(hoje); em7Dias2.setDate(em7Dias2.getDate() + 7);
    var em7Str = em7Dias2.toISOString().slice(0,10);
    var inicioMes2 = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0,10);
    dFil = dFil.filter(function(d){
      var data = d.data || '';
      if (!data) return false;
      var status = String(d.status || '').toLowerCase();
      if (status === 'pago' || status === 'quitado') return false;
      return (data >= hojeStr2 && data <= em7Str) || (data >= inicioMes2 && data < hojeStr2);
    });
    rFil = []; // vencendo é só de despesas
  }

  var lancamentos = rFil.map(function(r){
    return { tipo:'in', key:'receitas', id:r.id, nome:r.nome || r.descricao || 'Receita',
             categoria: r.categoria || r.tipo || '', valor:Number(r.valor)||0, data:r.data,
             status: r.status || '' };
  }).concat(dFil.map(function(d){
    return { tipo:'out', key:'despesas', id:d.id, nome:d.descricao || d.nome || 'Despesa',
             categoria: d.categoria || '', valor:Number(d.valor)||0, data:d.data,
             status: d.status || '' };
  })).sort(function(a,b){ return (b.data||'').localeCompare(a.data||''); });

  if (!lancamentos.length) {
    el.innerHTML = '<p style="color:#9CAB9C;font-size:13px;padding:18px 0;text-align:center;font-style:italic;font-family:Playfair Display,Georgia,serif">Nenhum lançamento no período</p>';
    return;
  }

  // Agrupa por data
  var grupos = {};
  lancamentos.forEach(function(l){
    var key = l.data || 'sem-data';
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(l);
  });
  var datas = Object.keys(grupos).sort(function(a,b){ return b.localeCompare(a); });

  var html = '';
  datas.slice(0, 30).forEach(function(data){
    var label = _oneFinDataLabel(data, hoje);
    html += '<div class="one-fin-day-header">' + label + '</div>';
    grupos[data].forEach(function(l){
      var cat = oneFinCatIcon(l.categoria);
      var sinal = l.tipo === 'in' ? '+' : '-';
      var safeId = (l.id||'').replace(/'/g,"\\'");
      var safeKey = l.key;
      var nome = l.nome.replace(/</g,'&lt;');
      var catLabel = l.categoria ? l.categoria.replace(/</g,'&lt;') : (l.tipo==='in'?'Receita':'Despesa');
      var pendBadge = l.status === 'pendente' ? ' · <span style="color:#D4A655;font-weight:600">pendente</span>' : '';
      html += '<div class="one-fin-item-row">' +
                '<div class="one-fin-item-icon" style="background:' + cat.bg + ';color:' + cat.cor + '">' + cat.emoji + '</div>' +
                '<div class="one-fin-item-body">' +
                  '<div class="one-fin-item-nome">' + nome + '</div>' +
                  '<div class="one-fin-item-meta">' + catLabel + pendBadge + '</div>' +
                '</div>' +
                '<div class="one-fin-item-valor ' + (l.tipo==='in'?'in':'out') + '">' + sinal + brl(l.valor).replace('R$ ','R$') + '</div>' +
                '<div class="one-fin-item-actions">' +
                  '<button class="one-fin-item-btn" onclick="oneFinEditar(\'' + safeKey + '\',\'' + safeId + '\')" title="Editar">✏️</button>' +
                  '<button class="one-fin-item-btn del" onclick="oneFinExcluir(\'' + safeKey + '\',\'' + safeId + '\')" title="Excluir">🗑️</button>' +
                '</div>' +
              '</div>';
    });
  });
  el.innerHTML = html;
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
window.zerarFinanceiro = zerarFinanceiro;

function oneFinExcluir(key, id) {
  if (!confirm('Excluir este lançamento?')) return;
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU(key))||'[]'); } catch(e){}
  lista = lista.filter(function(i){ return i.id !== id; });
  localStorage.setItem(oneU(key), JSON.stringify(lista));
  supaDelete(key, id);
  if (typeof oneToast==='function') oneToast('✓ Lançamento excluído.');
  if (typeof renderOneFinanceiroPainel==='function') renderOneFinanceiroPainel();
  if (typeof renderDesktopSidebar==='function') renderDesktopSidebar();
}

/* Agora abre o modal de lançamento (em vez do form inline removido) */
function oneFinEditar(key, id) {
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
    renderOneAgendaPainel();
  } else if (curView === 'mes') {
    oneAgMonthOffset += delta;
    if (typeof oneAgRenderMes === 'function') oneAgRenderMes();
  } else if (curView === 'hoje') {
    var d = new Date(((window.oneAgHojeSelecionado || new Date().toISOString().slice(0,10))) + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    window.oneAgHojeSelecionado = d.toISOString().slice(0,10);
    if (typeof oneAgRenderHoje === 'function') oneAgRenderHoje();
  }
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

  var H_START = 8, H_END = 18, PX = 50;
  var BODY_H = (H_END - H_START) * PX; // 500px
  var HDR_H  = 38; // altura aprox. do header das colunas (para alinhar régua)

  // Régua única à esquerda (08:00–18:00)
  // O cap sticky cobre a área do header das colunas, mantendo alinhamento ao rolar
  var rulerHtml = '<div class="one-ag-tl-ruler one-ag-week-ruler">' +
    '<div class="one-ag-ruler-cap" style="height:' + HDR_H + 'px"></div>';
  for (var rh = H_START; rh <= H_END; rh++) {
    var rt = HDR_H + (rh - H_START) * PX;
    rulerHtml += '<div class="one-ag-tl-hour" style="top:' + rt + 'px">' + (rh < 10 ? '0' : '') + rh + ':00</div>';
  }
  rulerHtml += '</div>';

  // Grid lines (reutilizadas em cada coluna)
  var gridLines = '';
  for (var gh = 0; gh <= H_END - H_START; gh++) {
    gridLines += '<div class="one-ag-tl-grid-line" style="top:' + (gh * PX) + 'px"></div>';
  }

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
          '<div class="one-ag-kcard-actions"><button class="one-tar-card-btn del" data-cid="' + c.id + '" onclick="event.stopPropagation();oneAgExcluir(this.dataset.cid)" title="Excluir">🗑️</button></div>' +
        '</div>';
      }).join('');
    }(doDia, H_START, PX));

    colsHtml +=
      '<div class="one-ag-kday-col' + (isHoje ? ' today' : '') + '" data-date="' + ds + '" data-dow="' + dowReal + '" style="border-top:3px solid ' + PALETTE[i] + '">' +
        '<div class="one-ag-kday-header">' +
          '<div class="one-ag-kday-name-wrap">' +
            '<span class="one-ag-kday-name">' + NOMES[i] + '</span>' +
            numHtml +
          '</div>' +
          '<span class="one-ag-kday-count">' + doDia.length + '</span>' +
        '</div>' +
        '<div class="one-ag-kday-body" data-date="' + ds + '" data-hour-offset="' + H_START + '" style="height:' + BODY_H + 'px" onclick="oneAgClickSlotWeek(event,this)">' +
          gridLines + cards +
        '</div>' +
        '<div class="one-ag-kday-add-wrap">' +
          '<button class="one-ag-kday-add" onclick="event.stopPropagation();oneAgModalAbrir(\'' + ds + '\')">+ Novo Agendamento</button>' +
        '</div>' +
      '</div>';
  }

  kanban.innerHTML = rulerHtml + '<div class="one-ag-tl-cols one-ag-week-cols">' + colsHtml + '</div>';

  // Garante que a vista semana está visível (proteção contra chamadas concorrentes)
  document.querySelectorAll('.one-desktop-agenda .one-fin-vista').forEach(function(v) {
    v.hidden = v.getAttribute('data-view') !== 'semana';
  });

  oneInitAgendaSortable();
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
      '<div class="one-ag-kcard-actions"><button class="one-tar-card-btn del" data-cid="' + c.id + '" onclick="event.stopPropagation();oneAgExcluir(this.dataset.cid)">🗑️</button></div>' +
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
  var label = document.getElementById('one-ag-mes-label');
  if (!el) return;

  var compromissos = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]');
  var hojeStr = new Date().toISOString().slice(0,10);

  var hoje = new Date(); hoje.setHours(0,0,0,0);
  var ref  = new Date(hoje.getFullYear(), hoje.getMonth() + oneAgMonthOffset, 1);
  var ano  = ref.getFullYear();
  var mes  = ref.getMonth();

  var MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  if (label) label.textContent = MESES[mes] + ' ' + ano;

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

/* Click em slot vazio na view semanal — calcula hora com offset de H_START */
function oneAgClickSlotWeek(ev, bodyEl) {
  if (ev.target !== bodyEl && !ev.target.classList.contains('one-ag-tl-grid-line')) return;
  var rect = bodyEl.getBoundingClientRect();
  var y = ev.clientY - rect.top;
  var hourOffset = parseInt(bodyEl.getAttribute('data-hour-offset') || '0');
  var totalMin = hourOffset * 60 + Math.max(0, Math.round(y / 50 * 60));
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

/* Converte posição Y (em px dentro do body da coluna) em string "HH:MM" snap a 15min */
function oneAgTopParaHora(yPx) {
  if (yPx < 0) yPx = 0;
  if (yPx > 1200) yPx = 1200;
  var totalMin = Math.round(yPx / 50 * 60);
  totalMin = Math.round(totalMin / 15) * 15; // snap 15min
  if (totalMin > 23*60+45) totalMin = 23*60+45;
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

/* ── Agenda (screen-one) ─────────────────────────────────── */
function renderOneAgenda() {
  var wrap = document.getElementById('one-ag-week');
  var periodEl = document.getElementById('one-ag-period');
  if (!wrap) return;

  var today = new Date();
  var dow = today.getDay(); // 0=Dom
  var mondayOffset = dow === 0 ? -6 : 1 - dow;
  var monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  var compromissos = [];
  try { compromissos = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]'); } catch(e){}

  var dias = ['SEG','TER','QUA','QUI','SEX','SÁB','DOM'];
  var meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

  var sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  if (periodEl) {
    if (monday.getMonth() === sunday.getMonth()) {
      periodEl.textContent = monday.getDate() + '–' + sunday.getDate() + ' de ' + meses[monday.getMonth()];
    } else {
      periodEl.textContent = monday.getDate() + ' ' + meses[monday.getMonth()] + ' – ' + sunday.getDate() + ' ' + meses[sunday.getMonth()];
    }
  }

  function toDateStr(d) {
    return d.getFullYear() + '-'
      + String(d.getMonth()+1).padStart(2,'0') + '-'
      + String(d.getDate()).padStart(2,'0');
  }
  var todayStr = toDateStr(today);

  wrap.innerHTML = '';
  for (var i = 0; i < 7; i++) {
    var day = new Date(monday);
    day.setDate(monday.getDate() + i);
    var dayStr = toDateStr(day);
    var isToday = dayStr === todayStr;

    var dayComps = compromissos
      .filter(function(c){ return c.data === dayStr; })
      .sort(function(a,b){ return (a.hora||'00:00').localeCompare(b.hora||'00:00'); });

    var col = document.createElement('div');
    col.className = 'one-agenda-col';

    var header = document.createElement('div');
    header.className = 'one-agenda-day-header';
    header.innerHTML = '<div class="one-agenda-day-name">' + dias[i] + '</div>'
      + '<div class="one-agenda-day-num' + (isToday ? ' today' : '') + '">' + day.getDate() + '</div>';

    var cardsDiv = document.createElement('div');
    cardsDiv.className = 'one-agenda-day-cards';

    if (dayComps.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'one-agenda-empty-col';
      cardsDiv.appendChild(empty);
    } else {
      dayComps.forEach(function(c) {
        var card = document.createElement('div');
        var cls = c.realizado ? 'realizado' : (c.status === 'Confirmado' ? 'confirmado' : 'pendente');
        card.className = 'one-agenda-card-mini ' + cls;
        var firstName = (c.nome || '').split(' ')[0];
        card.innerHTML = '<div class="one-agenda-card-mini-name">' + firstName + '</div>'
          + (c.hora ? '<div class="one-agenda-card-mini-time">' + c.hora + '</div>' : '');
        cardsDiv.appendChild(card);
      });
    }

    col.appendChild(header);
    col.appendChild(cardsDiv);
    wrap.appendChild(col);
  }
}

/* ── Financeiro (screen-one) ─────────────────────────────── */
function renderOneFinanceiro() {
  var now = new Date();
  var mes = now.getMonth();
  var ano = now.getFullYear();
  var mesStr = String(mes+1).padStart(2,'0');
  var mesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var prefix = ano + '-' + mesStr;

  var receitas = []; var despesas = []; var fixas = [];
  try { receitas = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]'); } catch(e){}
  try { despesas = JSON.parse(localStorage.getItem(oneU('despesas')) || '[]'); } catch(e){}
  try { fixas    = JSON.parse(localStorage.getItem(oneU('despesasFixas')) || '[]'); } catch(e){}

  var recMes  = receitas.filter(function(r){ return r.data && r.data.startsWith(prefix); });
  var despMes = despesas.filter(function(d){ return d.data && d.data.startsWith(prefix); });

  var totalRec   = recMes.filter(function(r){ return r.status==='Pago'; })
                         .reduce(function(s,r){ return s+(r.valor||0); },0);
  var totalDesp  = despMes.filter(function(d){ return d.status==='Pago'; })
                          .reduce(function(s,d){ return s+(d.valor||0); },0);
  var totalFixas = fixas.reduce(function(s,f){ return s+(f.valor||0); },0);
  totalDesp += totalFixas;
  var pendente   = recMes.filter(function(r){ return r.status!=='Pago'; })
                         .reduce(function(s,r){ return s+(r.valor||0); },0);
  var saldo = totalRec - totalDesp;

  function fmt(v) {
    return 'R$ ' + Math.abs(v).toFixed(2)
      .replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  }

  var mesEl    = document.getElementById('one-fin-mes');
  var saldoEl  = document.getElementById('one-fin-saldo');
  var entEl    = document.getElementById('one-fin-entradas');
  var saiEl    = document.getElementById('one-fin-saidas');
  var penEl    = document.getElementById('one-fin-pendente-one');
  var listEl   = document.getElementById('one-fin-list');

  if (mesEl)   mesEl.textContent   = mesNomes[mes].toUpperCase();
  if (saldoEl) saldoEl.textContent = (saldo < 0 ? '−' : '') + fmt(saldo);
  if (entEl)   entEl.textContent   = fmt(totalRec);
  if (saiEl)   saiEl.textContent   = fmt(totalDesp);
  if (penEl)   penEl.textContent   = fmt(pendente);

  if (!listEl) return;

  var items = [];
  recMes.forEach(function(r){
    items.push({data:r.data, nome:r.nome||r.tipo||'Receita',
                tipo:'rec', valor:r.valor||0, status:r.status, cat:r.categoria});
  });
  despMes.forEach(function(d){
    items.push({data:d.data, nome:d.descricao||'Despesa',
                tipo:'desp', valor:d.valor||0, status:d.status, cat:d.categoria});
  });
  items.sort(function(a,b){ return b.data.localeCompare(a.data); });
  items = items.slice(0, 10);

  var catIcons = {
    'Atendimento':'🩺','Avaliação':'📋','Capacitação':'📚',
    'Material Estudo':'📖','Equipamentos':'🔧','Alimentação':'🍽️',
    'Transporte':'🚗','Saúde':'💊','default':'💰'
  };

  listEl.innerHTML = '';
  if (items.length === 0) {
    listEl.innerHTML = '<p style="text-align:center;font-size:12px;color:#9A94A4;'
      + 'padding:20px 0;font-family:system-ui;">Nenhum lançamento este mês</p>';
    return;
  }
  items.forEach(function(item){
    var icon  = catIcons[item.cat] || (item.tipo==='rec' ? '💚' : '🔴');
    var bg    = item.tipo==='rec' ? '#EDF7F2' : '#FDF2F2';
    var parts = (item.data||'----').split('-');
    var dateLabel = (parts[2]||'?') + '/' + (parts[1]||'?');
    var el = document.createElement('div');
    el.className = 'one-fin-item';
    el.innerHTML = '<div class="one-fin-item-icon" style="background:' + bg + '">' + icon + '</div>'
      + '<div class="one-fin-item-info">'
      + '<div class="one-fin-item-name">' + item.nome + '</div>'
      + '<div class="one-fin-item-date">' + dateLabel
        + (item.status!=='Pago' ? ' · pendente' : '') + '</div>'
      + '</div>'
      + '<div class="one-fin-item-value ' + item.tipo + '">'
      + (item.tipo==='rec' ? '+' : '−') + fmt(item.valor) + '</div>';
    listEl.appendChild(el);
  });
}

/* ── Tarefas mobile (4º slide) ───────────────────────────────── */
function renderOneTarefasMobile() {
  var el = document.getElementById('one-tar-mob-list');
  if (!el) return;
  var tarefas = [];
  try { tarefas = JSON.parse(localStorage.getItem(oneU('tarefas')) || '[]'); } catch(e) {}
  var pendentes = tarefas.filter(function(t) { return !t.concluida && t.status !== 'concluida'; });
  if (!pendentes.length) {
    el.innerHTML = '<div class="one-tar-mob-empty">Nenhuma tarefa pendente 🎉</div>';
    return;
  }
  var prioBadge = { 'Alta':'alta', 'Normal':'normal', 'Baixa':'baixa' };
  el.innerHTML = pendentes.slice(0, 20).map(function(t) {
    var prio = t.prioridade || 'Normal';
    var cls  = prioBadge[prio] || 'normal';
    return '<div class="one-tar-mob-item">'
      + '<div class="one-tar-mob-check" onclick="oneTarMobToggle(\'' + t.id + '\',this)">'
      + '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="opacity:0" id="ck-' + t.id + '">'
      + '<polyline points="1.5 5 4 7.5 8.5 2" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
      + '</svg></div>'
      + '<div class="one-tar-mob-info">'
      + '<div class="one-tar-mob-nome">' + (t.titulo || t.nome || '—') + '</div>'
      + '<div class="one-tar-mob-area">' + (t.area || '') + '</div>'
      + '</div>'
      + '<span class="one-tar-mob-prio ' + cls + '">' + prio + '</span>'
      + '</div>';
  }).join('');
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
    if (typeof renderOneTarefasPainel === 'function') renderOneTarefasPainel();
  }
  if (wrap) wrap.style.display = 'none';
}

function oneTarMobToggle(id, btn) {
  var tarefas = [];
  try { tarefas = JSON.parse(localStorage.getItem(oneU('tarefas')) || '[]'); } catch(e) {}
  var idx = tarefas.findIndex(function(t){ return t.id === id; });
  if (idx === -1) return;
  tarefas[idx].concluida = true;
  tarefas[idx].status = 'concluida';
  localStorage.setItem(oneU('tarefas'), JSON.stringify(tarefas));
  if (typeof supaUpsert === 'function') supaUpsert('tarefas', tarefas[idx]);
  /* Anima o check e some o item */
  btn.classList.add('done');
  var ck = document.getElementById('ck-' + id);
  if (ck) ck.style.opacity = '1';
  setTimeout(function() { renderOneTarefasMobile(); }, 600);
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

function oneExcluirCompromisso() {
  if (!oneEditandoCompromissoId) return;
  if (!confirm('Excluir este compromisso? A receita vinculada (se houver) também será removida.')) return;

  var idParaExcluir = oneEditandoCompromissoId;

  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU('compromissos')) || '[]'); } catch(e){}
  lista = lista.filter(function(x){ return x.id !== idParaExcluir; });
  localStorage.setItem(oneU('compromissos'), JSON.stringify(lista));
  supaDelete('compromissos', idParaExcluir);

  // Remove receita vinculada se existir
  var rec = []; try { rec = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]'); } catch(e){}
  var recVinculada = rec.find(function(r){ return r.compromissoId === idParaExcluir; });
  if (recVinculada) supaDelete('receitas', recVinculada.id);
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

function oneAgExcluir(id) {
  if (!confirm('Excluir este compromisso? A receita vinculada (se houver) também será removida.')) return;
  var lista = []; try { lista = JSON.parse(localStorage.getItem(oneU('compromissos'))||'[]'); } catch(e){}
  lista = lista.filter(function(c){ return c.id !== id; });
  localStorage.setItem(oneU('compromissos'), JSON.stringify(lista));
  var rec = []; try { rec = JSON.parse(localStorage.getItem(oneU('receitas'))||'[]'); } catch(e){}
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
  modal.classList.add('open');
  setTimeout(function(){ document.getElementById('one-ag-modal-nome').focus(); }, 100);
}

function oneAgModalFechar() {
  var modal = document.getElementById('one-ag-modal');
  if (modal) modal.classList.remove('open');
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
    var now = new Date();
    var ano = now.getFullYear();
    var mes = String(now.getMonth()+1).padStart(2,'0');
    var h = now.getDate();
    var d = function(dia) { return ano+'-'+mes+'-'+String(Math.max(1,Math.min(28,dia))).padStart(2,'0'); };
    if (!localStorage.getItem(oneU('receitas'))) {
      localStorage.setItem(oneU('receitas'), JSON.stringify([
        {id:'d1',data:d(h-8),nome:'Maria S.',tipo:'Atendimento',valor:280,formaPagamento:'Pix',status:'Pago',categoria:'Atendimento'},
        {id:'d2',data:d(h-5),nome:'Leonardo B.',tipo:'Avaliação',valor:350,formaPagamento:'Pix',status:'Pago',categoria:'Avaliação'},
        {id:'d3',data:d(h-3),nome:'Ana K.',tipo:'Atendimento',valor:280,formaPagamento:'Pix',status:'Pago',categoria:'Atendimento'},
        {id:'d4',data:d(h),nome:'Beatriz N.',tipo:'Atendimento',valor:280,formaPagamento:'Pix',status:'Pendente',categoria:'Atendimento'}
      ]));
    }
    if (!localStorage.getItem(oneU('despesas'))) {
      localStorage.setItem(oneU('despesas'), JSON.stringify([
        {id:'e1',data:d(h-7),descricao:'Material de consultório',categoria:'Material',valor:180,status:'Pago'},
        {id:'e2',data:d(h-2),descricao:'Curso online',categoria:'Capacitação',valor:320,status:'Pago'}
      ]));
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

  /* ── IMPORTAR — Segundo Cérebro ─────────────────────────────── */

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

    // Tenta salvar no Supabase
    if (window.supa && window.authUser && window.authUser.id) {
      try {
        var res = await window.supa
          .from('profiles')
          .update({ onboarded: true, bio_pinah: bio })
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
          window.authProfile.bio_pinah = bio;
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
  var hoje = new Date().toISOString().slice(0, 10);
  var hojeDate = new Date(); hojeDate.setHours(0,0,0,0);

  // Receitas pendentes (status === 'pendente')
  var receitas = [];
  try { receitas = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]'); } catch(e){}
  var recPendList = receitas.filter(function(r){
    var s = String(r.status || '').toLowerCase();
    return s === 'pendente' || s === 'aberto' || s === 'aguardando';
  });
  var recPend = recPendList.length;
  var recPendValor = recPendList.reduce(function(s,r){ return s + (Number(r.valor)||0); }, 0);

  // Despesas vencendo — próximos 7 dias OU vencidas no mês sem pago
  var despesas = [];
  try { despesas = JSON.parse(localStorage.getItem(oneU('despesas')) || '[]'); } catch(e){}
  var em7Dias = new Date(hojeDate); em7Dias.setDate(em7Dias.getDate() + 7);
  var em7DiasStr = em7Dias.toISOString().slice(0,10);
  var inicioMes = new Date(hojeDate.getFullYear(), hojeDate.getMonth(), 1).toISOString().slice(0,10);
  var despVencList = despesas.filter(function(d){
    var data = d.data || '';
    if (!data) return false;
    var status = String(d.status || '').toLowerCase();
    if (status === 'pago' || status === 'quitado') return false;
    return (data >= hoje && data <= em7DiasStr) || (data >= inicioMes && data < hoje);
  });
  var despVenc = despVencList.length;
  var despVencValor = despVencList.reduce(function(s,d){ return s + (Number(d.valor)||0); }, 0);

  // Atualiza DOM
  var setText = function(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
  setText('one-pn-num-receitas', recPend);
  setText('one-pn-val-receitas', _brlFin(recPendValor));
  setText('one-pn-num-despesas', despVenc);
  setText('one-pn-val-despesas', _brlFin(despVencValor));
}
window.renderOnePendenciasAlertas = renderOnePendenciasAlertas;

/* Filtros funcionais nos cards de alerta — clicam, filtram a lista no Extrato e chaveiam vista */
function oneFinFiltrarPendentes() {
  window.oneFinFiltroAtivo = 'pendentes';
  oneFinSetVista('extrato');
  oneFinAtualizarChipFiltro('Receitas pendentes');
  if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
}
function oneFinFiltrarVencendo() {
  window.oneFinFiltroAtivo = 'vencendo';
  oneFinSetVista('extrato');
  oneFinAtualizarChipFiltro('Despesas vencendo');
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
window.oneFinModalTipo = window.oneFinModalTipo || 'receita';

function oneFinModalAbrir(tipoInicial) {
  var modal = document.getElementById('one-fin-modal');
  if (!modal) return;
  document.getElementById('one-fin-modal-title').textContent = 'Novo lançamento';
  document.getElementById('one-fin-modal-id').value = '';
  document.getElementById('one-fin-modal-nome').value = '';
  document.getElementById('one-fin-modal-valor').value = '';
  document.getElementById('one-fin-modal-data').value = new Date().toISOString().slice(0,10);
  document.getElementById('one-fin-modal-cat').value = '';
  document.getElementById('one-fin-modal-status').value = 'pendente';
  oneFinModalSetTipo(tipoInicial || 'receita');
  modal.classList.add('open');
  setTimeout(function(){ document.getElementById('one-fin-modal-nome').focus(); }, 100);
}
window.oneFinModalAbrir = oneFinModalAbrir;

function oneFinModalEditar(key, id) {
  var lista = JSON.parse(localStorage.getItem(oneU(key)) || '[]');
  var it = lista.find(function(x){ return String(x.id) === String(id); });
  if (!it) return;
  var modal = document.getElementById('one-fin-modal');
  if (!modal) return;
  document.getElementById('one-fin-modal-title').textContent = 'Editar lançamento';
  document.getElementById('one-fin-modal-id').value = it.id;
  document.getElementById('one-fin-modal-nome').value = it.nome || it.descricao || '';
  document.getElementById('one-fin-modal-valor').value = it.valor || '';
  document.getElementById('one-fin-modal-data').value = it.data || '';
  document.getElementById('one-fin-modal-cat').value = it.categoria || it.tipo || '';
  document.getElementById('one-fin-modal-status').value = it.status || (key === 'receitas' ? 'pendente' : 'pago');
  oneFinModalSetTipo(key === 'receitas' ? 'receita' : 'despesa');
  modal.classList.add('open');
  setTimeout(function(){ document.getElementById('one-fin-modal-nome').focus(); }, 100);
}
window.oneFinModalEditar = oneFinModalEditar;

function oneFinModalFechar() {
  var modal = document.getElementById('one-fin-modal');
  if (modal) modal.classList.remove('open');
}
window.oneFinModalFechar = oneFinModalFechar;

function oneFinModalSetTipo(tipo) {
  window.oneFinModalTipo = tipo;
  var tabRec = document.getElementById('one-fin-modal-tab-rec');
  var tabDesp = document.getElementById('one-fin-modal-tab-desp');
  if (tabRec)  tabRec.classList.toggle('active', tipo === 'receita');
  if (tabDesp) tabDesp.classList.toggle('active', tipo === 'despesa');
  // Status só faz sentido pra receita (pendente/pago). Pra despesa esconde.
  var stWrap = document.getElementById('one-fin-modal-status-wrap');
  if (stWrap) stWrap.style.display = (tipo === 'receita') ? '' : 'none';
}
window.oneFinModalSetTipo = oneFinModalSetTipo;

function oneFinModalSalvar() {
  var id     = document.getElementById('one-fin-modal-id').value;
  var nome   = (document.getElementById('one-fin-modal-nome').value || '').trim();
  var valor  = parseFloat(document.getElementById('one-fin-modal-valor').value) || 0;
  var data   = document.getElementById('one-fin-modal-data').value || new Date().toISOString().slice(0,10);
  var cat    = (document.getElementById('one-fin-modal-cat').value || '').trim();
  var status = document.getElementById('one-fin-modal-status').value;
  var tipo   = window.oneFinModalTipo || 'receita';
  if (!nome || !valor) {
    if (typeof oneToast === 'function') oneToast('Preencha descrição e valor.', 'error');
    return;
  }
  var key = (tipo === 'receita') ? 'receitas' : 'despesas';
  var lista = JSON.parse(localStorage.getItem(oneU(key)) || '[]');
  var novoFin;
  if (id) {
    var idx = lista.findIndex(function(x){ return String(x.id) === String(id); });
    if (idx >= 0) {
      lista[idx] = Object.assign(lista[idx], {
        nome: nome, descricao: nome, valor: valor, data: data, categoria: cat,
        tipo: tipo,
        status: (tipo === 'receita') ? status : 'pago'
      });
      novoFin = lista[idx];
    }
  } else {
    novoFin = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(),
      nome: nome, descricao: nome, valor: valor, data: data, categoria: cat,
      tipo: tipo,
      status: (tipo === 'receita') ? status : 'pago',
      criado: new Date().toISOString()
    };
    lista.push(novoFin);
  }
  localStorage.setItem(oneU(key), JSON.stringify(lista));
  if (typeof supaUpsert === 'function' && novoFin) supaUpsert(key, novoFin);
  oneFinModalFechar();
  if (typeof oneToast === 'function') oneToast('✓ Lançamento salvo!');
  if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
  if (typeof renderDesktopSidebar === 'function') renderDesktopSidebar();
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
  } else if (vista === 'dashboard') {
    if (typeof Chart === 'undefined') setTimeout(oneFinRenderCategorias, 200);
    else oneFinRenderCategorias();
  } else if (vista === 'extrato') {
    if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
  }
}
window.oneFinSetVista = oneFinSetVista;

/* ── View "Visão geral" — lista resumida + barras balanço 6 meses ── */
function oneFinRenderGeral() {
  // 1) Últimos 6 lançamentos
  var receitas = JSON.parse(localStorage.getItem(oneU('receitas')) || '[]');
  var despesas = JSON.parse(localStorage.getItem(oneU('despesas')) || '[]');
  var todos = receitas.map(function(r){
    return { tipo:'in', key:'receitas', id:r.id, nome:r.nome || r.descricao || 'Receita',
             categoria: r.categoria || r.tipo || '', valor:Number(r.valor)||0, data:r.data };
  }).concat(despesas.map(function(d){
    return { tipo:'out', key:'despesas', id:d.id, nome:d.descricao || d.nome || 'Despesa',
             categoria: d.categoria || '', valor:Number(d.valor)||0, data:d.data };
  })).sort(function(a,b){ return (b.data||'').localeCompare(a.data||''); }).slice(0, 6);

  var listEl = document.getElementById('one-fin-geral-recent');
  if (listEl) {
    if (!todos.length) {
      listEl.innerHTML = '<p style="text-align:center;color:#9CAB9C;font-size:12px;padding:12px 0;font-style:italic;font-family:Playfair Display,Georgia,serif">Nenhum lançamento ainda</p>';
    } else {
      listEl.innerHTML = todos.map(function(l){
        var cat = (typeof oneFinCatIcon === 'function') ? oneFinCatIcon(l.categoria) : { emoji:'💸', cor:'#6B7F6F', bg:'#F2F6F1' };
        var sinal = l.tipo === 'in' ? '+' : '-';
        var dataF = l.data ? l.data.split('-').reverse().slice(0,2).join('/') : '';
        return '<div style="display:flex;align-items:center;gap:9px;padding:6px 2px;border-bottom:1px solid rgba(127,168,142,0.10);font-family:system-ui,-apple-system,sans-serif">' +
                 '<div style="width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;background:' + cat.bg + ';color:' + cat.cor + ';flex-shrink:0">' + cat.emoji + '</div>' +
                 '<div style="flex:1;min-width:0">' +
                   '<div style="font-size:12.5px;color:#2D3D2F;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + l.nome.replace(/</g,'&lt;') + '</div>' +
                   '<div style="font-size:10px;color:#6B7F6F">' + dataF + '</div>' +
                 '</div>' +
                 '<div style="font-size:12.5px;font-weight:600;color:' + (l.tipo==='in'?'#27856A':'#C0392B') + ';white-space:nowrap">' + sinal + _brlFin(l.valor).replace('R$ ','R$') + '</div>' +
               '</div>';
      }).join('');
    }
  }

  // 2) Gráfico de barras dos últimos 6 meses
  var canvas = document.getElementById('one-fin-bars-geral');
  if (!canvas || typeof Chart === 'undefined') {
    if (canvas) setTimeout(oneFinRenderGeral, 200);
    return;
  }
  if (window.oneFinInlineCharts && window.oneFinInlineCharts.barsGeral) {
    window.oneFinInlineCharts.barsGeral.destroy();
  }
  if (!window.oneFinInlineCharts) window.oneFinInlineCharts = {};

  var hoje = new Date();
  var mesAtual = hoje.getMonth(), anoAtual = hoje.getFullYear();
  var meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  var labels = [], rData = [], dData = [];
  for (var i = 5; i >= 0; i--) {
    var m = mesAtual - i, a = anoAtual;
    while (m < 0) { m += 12; a--; }
    labels.push(meses[m]);
    var rTot = receitas
      .filter(function(r){ if (!r.data) return false; var d = new Date(r.data+'T00:00:00'); return d.getMonth()===m && d.getFullYear()===a && r.status !== 'pendente'; })
      .reduce(function(s,r){ return s + (Number(r.valor)||0); }, 0);
    var dTot = despesas
      .filter(function(d){ if (!d.data) return false; var dt = new Date(d.data+'T00:00:00'); return dt.getMonth()===m && dt.getFullYear()===a; })
      .reduce(function(s,d){ return s + (Number(d.valor)||0); }, 0);
    rData.push(rTot);
    dData.push(dTot);
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

/* Render donut + lista — versão inline (mês corrente) */
function oneFinRenderCategorias() {
  var tipo = window.oneFinInlineTipo || 'despesas';
  var dados = (tipo === 'receitas')
    ? JSON.parse(localStorage.getItem(oneU('receitas')) || '[]')
    : JSON.parse(localStorage.getItem(oneU('despesas')) || '[]');

  var hoje = new Date();
  var mes = hoje.getMonth(), ano = hoje.getFullYear();
  var doMes = dados.filter(function(it){
    if (!it.data) return false;
    var d = new Date(it.data + 'T00:00:00');
    return d.getMonth() === mes && d.getFullYear() === ano;
  });

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
  // Render apropriado
  if (view === 'hoje') {
    oneAgRenderHoje();
  } else if (view === 'semana') {
    if (typeof renderOneAgendaPainel === 'function') renderOneAgendaPainel();
    oneAgRenderResumoSemana();
  } else if (view === 'mes') {
    oneAgRenderMes();
  }
  // Sempre atualiza os 3 cards (baseado na view)
  oneAgRenderTopCards();
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
  var el = document.getElementById('one-desk-card-conta-meta');
  if (!el) return;
  var agora = new Date();
  var dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  var dia = dias[agora.getDay()];
  var dataF = String(agora.getDate()).padStart(2,'0') + '/' + String(agora.getMonth()+1).padStart(2,'0');
  var hora = String(agora.getHours()).padStart(2,'0') + ':' + String(agora.getMinutes()).padStart(2,'0');
  el.textContent = dia + ' ' + dataF + ' · ' + hora;
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
