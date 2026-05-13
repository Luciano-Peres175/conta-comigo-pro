  /* ════════════════════════════════════════════════════════════════
     AUTENTICAÇÃO — Login / Cadastro via Supabase
     ════════════════════════════════════════════════════════════════
     Cada conta é isolada. Família (Luciano/Catia/Lê) e Amigas (Claudinha/Babi/+1).
  */

  // Sessao do usuario logado (preenchida em authCheck)
  window.authUser = null;
  window.authProfile = null;

  function authTrocarTab(tab) {
    const tabLogin  = document.getElementById('auth-tab-login');
    const tabSignup = document.getElementById('auth-tab-signup');
    const formLogin  = document.getElementById('auth-form-login');
    const formSignup = document.getElementById('auth-form-signup');
    const subtitle   = document.getElementById('auth-subtitle');
    if (tab === 'login') {
      tabLogin.style.cssText  = 'flex:1;padding:10px;background:none;border:none;border-bottom:2px solid #9B72B0;color:#9B72B0;font-weight:600;font-size:14px;cursor:pointer';
      tabSignup.style.cssText = 'flex:1;padding:10px;background:none;border:none;border-bottom:2px solid transparent;color:#888;font-weight:500;font-size:14px;cursor:pointer';
      formLogin.style.display  = '';
      formSignup.style.display = 'none';
      if (subtitle) subtitle.textContent = 'Entre na sua conta';
    } else {
      tabSignup.style.cssText = 'flex:1;padding:10px;background:none;border:none;border-bottom:2px solid #9B72B0;color:#9B72B0;font-weight:600;font-size:14px;cursor:pointer';
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
      fam.style.cssText = 'flex:1;padding:10px;border:2px solid #9B72B0;background:#EDE3F4;border-radius:8px;cursor:pointer;text-align:center;font-size:13px;font-weight:600;color:#9B72B0';
      ami.style.cssText = 'flex:1;padding:10px;border:2px solid #e6e0ed;border-radius:8px;cursor:pointer;text-align:center;font-size:13px;font-weight:500';
    } else {
      ami.style.cssText = 'flex:1;padding:10px;border:2px solid #9B72B0;background:#EDE3F4;border-radius:8px;cursor:pointer;text-align:center;font-size:13px;font-weight:600;color:#9B72B0';
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

  async function authCadastrar() {
    if (!window.supa) { authMostrarMsg('Sistema ainda carregando, aguarde 2 segundos e tente de novo.', 'erro'); return; }
    const nome  = document.getElementById('auth-signup-nome').value.trim();
    const email = document.getElementById('auth-signup-email').value.trim().toLowerCase();
    const senha = document.getElementById('auth-signup-senha').value;
    const grupo = document.querySelector('input[name="auth-grupo"]:checked')?.value || 'familia';
    if (!nome || !email || !senha) { authMostrarMsg('Preencha nome, e-mail e senha.', 'erro'); return; }
    if (senha.length < 6)        { authMostrarMsg('A senha precisa ter pelo menos 6 caracteres.', 'erro'); return; }

    authMostrarMsg('Criando conta...', 'sucesso');

    const { data, error } = await window.supa.auth.signUp({ email, password: senha });
    if (error) { authMostrarMsg('Erro: ' + error.message, 'erro'); return; }
    if (!data.user) { authMostrarMsg('Erro inesperado. Tente novamente.', 'erro'); return; }

    // Cria entrada em profiles
    const { error: errProfile } = await window.supa.from('profiles').insert({
      id: data.user.id, nome, grupo
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
    if (!window.supa) return;
    if (!confirm('Sair da sua conta?')) return;
    await window.supa.auth.signOut();
    window.authUser = null;
    window.authProfile = null;
    location.reload();
  }

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

    // Busca perfil
    const { data: profile } = await window.supa
      .from('profiles')
      .select('id, nome, grupo')
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

  function esconderTelaAuth() {
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
    // Botoes que carregam dados-demo da Le — so Familia ve
    ['btn-carregar-demo', 'btn-resetar-com-demo', 'btn-resetar-demo'].forEach(function(id) {
      const el = document.getElementById(id);
      if (el) el.style.display = ehFamilia ? '' : 'none';
    });
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
    recognition.continuous = false;     // ate o usuario parar de falar
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
      if (texto && opts.onResult) opts.onResult(texto);
      if (opts.onStateChange) opts.onStateChange('result');
    };

    try {
      recognition.start();
    } catch (e) {
      if (opts.onError) opts.onError('Nao foi possivel iniciar o microfone: ' + e.message);
      if (opts.onStateChange) opts.onStateChange('error');
    }

    return {
      stop: () => {
        cancelado = true;
        try { recognition.stop(); } catch (e) {}
      }
    };
  }

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

  function maybeInit() {
    const primeiraVez = !localStorage.getItem('ccp_initialized');
    if (primeiraVez) {
      // Auto-load: dados demo COMPLETOS na primeira vez (notas + financeiro + agenda)
      localStorage.setItem('receitas',      JSON.stringify(getReceitasDemo()));
      localStorage.setItem('despesas',      JSON.stringify(getDespesasDemo()));
      localStorage.setItem('compromissos',  JSON.stringify(getCompromissosDemo()));
      localStorage.setItem('despesasFixas', JSON.stringify(FIXAS_DEFAULT));
      localStorage.setItem('notas_cerebro', JSON.stringify(getNotasDemo()));
      localStorage.setItem('ccp_initialized', '1');
    }
    // Garante array de notas mesmo em app inicializado antes de existir
    if (!localStorage.getItem('notas_cerebro')) {
      localStorage.setItem('notas_cerebro', JSON.stringify([]));
    }
    // Garante fixas mesmo em app já inicializado mas vazio
    const fixas = JSON.parse(localStorage.getItem('despesasFixas') || '[]');
    if (fixas.length === 0) {
      localStorage.setItem('despesasFixas', JSON.stringify(FIXAS_DEFAULT));
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

  function openDrawer() {
    document.getElementById('sidebar').classList.add('drawer-open');
    document.getElementById('drawer-overlay').classList.add('open');
    document.getElementById('hamburger').classList.add('open');
  }

  function closeDrawer() {
    document.getElementById('sidebar').classList.remove('drawer-open');
    document.getElementById('drawer-overlay').classList.remove('open');
    document.getElementById('hamburger').classList.remove('open');
  }

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
    { id: 'casos',      nome: 'Cases Clínicos', icone: 'clipboard-list', cor: '#9B72B0' },
    { id: 'protocolos', nome: 'Protocolos',     icone: 'pin',            cor: '#7B9BC8' },
    { id: 'artigos',    nome: 'Artigos',        icone: 'newspaper',      cor: '#7EC8B8' },
    { id: 'tecnicas',   nome: 'Técnicas',       icone: 'lightbulb',      cor: '#E8C4A0' },
    { id: 'palestras',  nome: 'Palestras',      icone: 'mic',            cor: '#E8B4D4' }
  ];
  let cerebroFiltroCategoria = null; // null = todas
  let cerebroFiltroBusca = '';

  function getNotas() {
    return JSON.parse(localStorage.getItem('notas_cerebro') || '[]');
  }
  function setNotas(arr) {
    localStorage.setItem('notas_cerebro', JSON.stringify(arr));
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
    const r1 = _mesclarDemo('notas_cerebro', getNotasDemo());
    const r2 = _mesclarDemo('receitas',     getReceitasDemo());
    const r3 = _mesclarDemo('despesas',     getDespesasDemo());
    const r4 = _mesclarDemo('compromissos', getCompromissosDemo());
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
    localStorage.setItem('receitas',     JSON.stringify(getReceitasDemo()));
    localStorage.setItem('despesas',     JSON.stringify(getDespesasDemo()));
    localStorage.setItem('compromissos', JSON.stringify(getCompromissosDemo()));
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
    localStorage.setItem('receitas',     JSON.stringify([]));
    localStorage.setItem('despesas',     JSON.stringify([]));
    localStorage.setItem('despesasFixas', JSON.stringify([]));
    localStorage.setItem('compromissos', JSON.stringify([]));
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
    const v = parseFloat(localStorage.getItem('ccp_imposto_pct'));
    return (isFinite(v) && v >= 0 && v <= 100) ? v : 6;
  }
  function getFormaPagamentoDefault() {
    const v = localStorage.getItem('ccp_forma_pagamento');
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
  function fecharConfig() {
    const m = document.getElementById('modal-config');
    if (m) m.style.display = 'none';
  }
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
    localStorage.setItem('ccp_imposto_pct', String(imp));
    localStorage.setItem('ccp_forma_pagamento', forma);
    fecharConfig();
    atualizarHome();
    toast('Configurações salvas. Confirme o imposto sempre com seu contador.', 'success', { duration: 3500 });
  }

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

    const receitas     = JSON.parse(localStorage.getItem('receitas')      || '[]');
    const despesas     = JSON.parse(localStorage.getItem('despesas')      || '[]');
    const compromissos = JSON.parse(localStorage.getItem('compromissos')  || '[]');

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
    const compromissos = JSON.parse(localStorage.getItem('compromissos') || '[]');

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
      'Receita':'#7EC8B8', 'Consulta':'#9B72B0', 'Alimentação':'#E8C4D4',
      'Transporte':'#7AB8D4', 'Saúde':'#E87A7A', 'Fixo':'#C9A8D8', 'Despesa':'#E87A7A'
    };
    if (map[cat]) return map[cat];
    const pal = ['#9B72B0','#7EC8B8','#7AB8D4','#E8C4D4','#C9A8D8','#F0B860'];
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

    const receitas      = JSON.parse(localStorage.getItem('receitas')      || '[]');
    const despesas      = JSON.parse(localStorage.getItem('despesas')      || '[]');
    const despesasFixas = JSON.parse(localStorage.getItem('despesasFixas') || '[]');

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
    if (!tipo) return '#9B72B0';
    const t = tipo.toLowerCase();
    if (t.includes('profissional')) return '#7B9BC8';
    if (t.includes('pessoal'))      return '#999';
    return '#9B72B0'; // Atendimento (padrão)
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
    const compromissos = JSON.parse(localStorage.getItem('compromissos') || '[]');
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
      const bg      = cor === '#9B72B0' ? '#E8D5F5' :
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
    const compromissos = JSON.parse(localStorage.getItem('compromissos') || '[]');
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
    const compromissos = JSON.parse(localStorage.getItem('compromissos') || '[]');
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
        <div style="font-size:22px;font-weight:700;color:#9B72B0;line-height:1">${atend}</div>
        <div style="font-size:9px;color:#9B72B0;font-weight:600;margin-top:4px;line-height:1.2">Atendimentos</div>
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
    const compromissos = JSON.parse(localStorage.getItem('compromissos') || '[]');
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
      const headerBor = isHoje ? '1.5px solid #9B72B0' : '1px solid #eee';
      const numColor  = isHoje ? '#9B72B0' : '#333';
      const nomColor  = isHoje ? '#9B72B0' : '#aaa';

      const miniCards = doDia.map(c => {
        const cor   = corBarraTipo(c.tipo);
        const bg    = cor === '#9B72B0' ? '#F0E8F8' : cor === '#7B9BC8' ? '#E8F0F8' : '#F0F0F0';
        const borda = cor === '#9B72B0' ? '#9B72B0' : cor === '#7B9BC8' ? '#7B9BC8' : '#999999';
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
    const compromissos = JSON.parse(localStorage.getItem('compromissos') || '[]');
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
      try { const u = JSON.parse(localStorage.getItem('usuario') || '{}'); if (u && u.nome) nome = String(u.nome).split(' ')[0]; } catch(_) {}
      elH.textContent = saudacao + ', ' + nome;
    }
  }

  function abrirMenuPinah()   { alert('Menu lateral Pinah — em breve.'); }
  function abrirTelaPinah()   { go('pinah'); renderPinahTopo(); }
  function abrirConfigPinah() { alert('Configurações Pinah — em breve.'); }

  function renderPinahTopo() {
    const el = document.getElementById('psc-topo-text');
    if (!el) return;
    const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const agora = new Date();
    const hh = String(agora.getHours()).padStart(2,'0');
    const mm = String(agora.getMinutes()).padStart(2,'0');
    let nome = 'Luciano';
    try { const u = JSON.parse(localStorage.getItem('usuario')||'{}'); if(u&&u.nome) nome=String(u.nome).split(' ')[0]; } catch(_) {}
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
    const lista = JSON.parse(localStorage.getItem('receitas') || '[]');
    if (editandoReceitaId) {
      const idx = lista.findIndex(r => r.id === editandoReceitaId);
      if (idx >= 0) {
        lista[idx] = { ...lista[idx], data, nome, tipo, valor, formaPagamento: forma, status, categoria: tipo };
      }
      localStorage.setItem('receitas', JSON.stringify(lista));
      cancelarEdicaoReceita();
      renderListaReceitas();
      atualizarHome();
      toast('Receita atualizada!', 'success');
      return;
    }
    lista.push({ id: uid(), data, nome, tipo, valor, formaPagamento: forma, status, categoria: tipo });
    localStorage.setItem('receitas', JSON.stringify(lista));
    document.getElementById('r-nome').value  = '';
    document.getElementById('r-valor').value = '';
    renderListaReceitas();
    atualizarHome();
    toast('Receita salva com sucesso!', 'success');
  }

  function editarReceita(id) {
    const lista = JSON.parse(localStorage.getItem('receitas') || '[]');
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
    localStorage.setItem('receitas', JSON.stringify(
      JSON.parse(localStorage.getItem('receitas') || '[]').filter(r => r.id !== id)
    ));
    if (editandoReceitaId === id) cancelarEdicaoReceita();
    renderListaReceitas();
    atualizarHome();
  }

  function renderListaReceitas() {
    const now = new Date(), ano = now.getFullYear(), mes = now.getMonth();
    const receitas = JSON.parse(localStorage.getItem('receitas') || '[]');
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
    const lista = JSON.parse(localStorage.getItem('despesasFixas') || '[]');
    lista.push({ id: uid(), descricao: desc, categoria: cat, valor: val });
    localStorage.setItem('despesasFixas', JSON.stringify(lista));
    fecharFormNovaFixa();
    renderDespesasFixas();
    atualizarHome();
  }
  function excluirDespesaFixa(id) {
    if (!confirm('Excluir esta despesa fixa?')) return;
    localStorage.setItem('despesasFixas', JSON.stringify(
      JSON.parse(localStorage.getItem('despesasFixas') || '[]').filter(d => d.id !== id)
    ));
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
    const lista = JSON.parse(localStorage.getItem('despesasFixas') || '[]');
    const idx = lista.findIndex(d => d.id === id);
    if (idx < 0) return;
    const desc = document.getElementById('ef-desc-'+id).value.trim();
    const cat  = document.getElementById('ef-cat-'+id).value.trim();
    const val  = parseValor(document.getElementById('ef-val-'+id).value);
    if (!desc || !val) { toast('Preencha os campos.', 'error'); return; }
    lista[idx] = { ...lista[idx], descricao: desc, categoria: cat, valor: val };
    localStorage.setItem('despesasFixas', JSON.stringify(lista));
    renderDespesasFixas();
    atualizarHome();
  }
  function renderDespesasFixas() {
    const lista = JSON.parse(localStorage.getItem('despesasFixas') || '[]');
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
    const lista = JSON.parse(localStorage.getItem('despesas') || '[]');
    if (editandoDespesaId) {
      const idx = lista.findIndex(d => d.id === editandoDespesaId);
      if (idx >= 0) {
        lista[idx] = { ...lista[idx], data, descricao: desc, nome: desc, categoria: cat, valor };
      }
      localStorage.setItem('despesas', JSON.stringify(lista));
      cancelarEdicaoDespesa();
      renderListaDespesas();
      atualizarHome();
      toast('Despesa atualizada!', 'success');
      return;
    }
    lista.push({ id: uid(), data, descricao: desc, nome: desc, categoria: cat, valor });
    localStorage.setItem('despesas', JSON.stringify(lista));
    document.getElementById('d-descricao').value = '';
    document.getElementById('d-valor').value = '';
    renderListaDespesas();
    atualizarHome();
    toast('Despesa salva com sucesso!', 'success');
  }

  function editarDespesa(id) {
    const lista = JSON.parse(localStorage.getItem('despesas') || '[]');
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
    localStorage.setItem('despesas', JSON.stringify(
      JSON.parse(localStorage.getItem('despesas') || '[]').filter(d => d.id !== id)
    ));
    if (editandoDespesaId === id) cancelarEdicaoDespesa();
    renderListaDespesas();
    atualizarHome();
  }
  function renderListaDespesas() {
    const now = new Date(), ano = now.getFullYear(), mes = now.getMonth();
    const despesas = JSON.parse(localStorage.getItem('despesas') || '[]');
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
    const compromissos = JSON.parse(localStorage.getItem('compromissos') || '[]');
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
    const compromissos = JSON.parse(localStorage.getItem('compromissos') || '[]');
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
    const lista = JSON.parse(localStorage.getItem('compromissos') || '[]');
    if (editandoCompromissoId) {
      const idx = lista.findIndex(c => c.id === editandoCompromissoId);
      if (idx >= 0) {
        lista[idx] = { ...lista[idx], data, hora, nome, descricao: nome, tipo, duracao: dur, valor, status };
      }
      localStorage.setItem('compromissos', JSON.stringify(lista));
      editandoCompromissoId = null;
      fecharModalNovoComp();
      renderAgendaSemanal();
      if (typeof renderCalendario === 'function') renderCalendario();
      if (calDiaSel && typeof renderListaDiaAgenda === 'function') renderListaDiaAgenda(calDiaSel);
      atualizarHome();
      toast('Compromisso atualizado!', 'success');
      return;
    }
    lista.push({ id: uid(), data, hora, nome, descricao: nome, tipo, duracao: dur, valor, status, realizado: false });
    localStorage.setItem('compromissos', JSON.stringify(lista));
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
    const lista = JSON.parse(localStorage.getItem('compromissos') || '[]');
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
    localStorage.setItem('compromissos', JSON.stringify(
      JSON.parse(localStorage.getItem('compromissos') || '[]').filter(c => c.id !== id)
    ));
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
    const raw = localStorage.getItem('ccp_ia_uso');
    let obj = {};
    try { obj = raw ? JSON.parse(raw) : {}; } catch (e) { obj = {}; }
    return obj[hojeStr] || 0;
  }
  function incrementarIAUso() {
    const hojeStr = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem('ccp_ia_uso');
    let obj = {};
    try { obj = raw ? JSON.parse(raw) : {}; } catch (e) { obj = {}; }
    obj[hojeStr] = (obj[hojeStr] || 0) + 1;
    // Limpa entradas antigas (>7 dias) para nao poluir localStorage
    const corte = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    Object.keys(obj).forEach(k => { if (k < corte) delete obj[k]; });
    localStorage.setItem('ccp_ia_uso', JSON.stringify(obj));
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
    const id = document.getElementById('nota-id').value || uid();
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
      fecharModalNota();
      renderCerebro();
      toast('Nota atualizada.', 'success');
    } else {
      // Nova
      notas.push({ id, titulo, categoria, paciente, conteudo, tags, data: agora, dataModificacao: agora });
      setNotas(notas);
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
          '<button onclick="limparFiltros()" style="background:none;border:none;color:#9B72B0;font-size:12px;font-weight:700;cursor:pointer;text-decoration:underline;margin-left:6px">Limpar</button>';
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
    const lista = JSON.parse(localStorage.getItem('compromissos') || '[]');
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
      const recs = JSON.parse(localStorage.getItem('receitas') || '[]');
      const novaRec = {
        id: uid(),
        data: comp.data,
        nome: comp.nome,
        tipo: comp.tipo === 'Atendimento' ? 'Consulta' : (comp.tipo || 'Consulta'),
        valor: Number(comp.valor),
        formaPagamento: getFormaPagamentoDefault(),
        status: 'Pago',
        categoria: comp.tipo || 'Atendimento'
      };
      recs.push(novaRec);
      localStorage.setItem('receitas', JSON.stringify(recs));
      snapshot.recCriadaId = novaRec.id;
    }

    // 2) Atualiza compromisso
    lista[idx] = { ...comp, status: 'Confirmado', realizado: true };
    localStorage.setItem('compromissos', JSON.stringify(lista));

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
    const lista = JSON.parse(localStorage.getItem('compromissos') || '[]');
    const idx = lista.findIndex(c => c.id === snapshot.compAntes.id);
    if (idx >= 0) {
      lista[idx] = snapshot.compAntes;
      localStorage.setItem('compromissos', JSON.stringify(lista));
    }
    // Remove receita criada (se houve)
    if (snapshot.recCriadaId) {
      const recs = JSON.parse(localStorage.getItem('receitas') || '[]')
        .filter(r => r.id !== snapshot.recCriadaId);
      localStorage.setItem('receitas', JSON.stringify(recs));
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

    const receitas = JSON.parse(localStorage.getItem('receitas') || '[]')
      .filter(r => {
        const d = new Date(r.data + 'T00:00:00');
        return d.getFullYear() === ano && d.getMonth() === mesIdx;
      })
      .sort((a, b) => (a.data || '').localeCompare(b.data || ''));

    const despesasAvulsas = JSON.parse(localStorage.getItem('despesas') || '[]')
      .filter(d => {
        const dd = new Date(d.data + 'T00:00:00');
        return dd.getFullYear() === ano && dd.getMonth() === mesIdx;
      })
      .sort((a, b) => (a.data || '').localeCompare(b.data || ''));

    // Despesas fixas — aparecem como lançamentos automáticos do dia 1 do mês
    const primeiroDiaStr = ano + '-' + String(mes).padStart(2,'0') + '-01';
    const despesasFixas = JSON.parse(localStorage.getItem('despesasFixas') || '[]')
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
    const receitas      = JSON.parse(localStorage.getItem('receitas')      || '[]');
    const despesas      = JSON.parse(localStorage.getItem('despesas')      || '[]');
    const despesasFixas = JSON.parse(localStorage.getItem('despesasFixas') || '[]');
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
    const compromissos = JSON.parse(localStorage.getItem('compromissos') || '[]');

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
          : (cor === '#9B72B0' ? '#E8D5F5' :
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
    localStorage.clear();
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

function oneEnviar() {
  var input = document.getElementById('one-input');
  if (!input || !input.value.trim()) return;
  /* TODO: integrar com IA */
  input.value = '';
  input.style.height = 'auto';
}
function oneAnexar() { /* TODO */ }
function oneVoz()    { /* TODO */ }

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

  // 4. Dispara render do novo painel se for o caso
  if (target === 'agenda' && typeof renderOneAgendaPainel === 'function') {
    renderOneAgendaPainel();
  }
  if (target === 'tarefas' && typeof renderOneTarefasPainel === 'function') {
    renderOneTarefasPainel();
  }
  if (target === 'financeiro' && typeof renderOneFinanceiroPainel === 'function') {
    renderOneFinanceiroPainel();
  }
}

function oneNovaTarefa() {
  swapToCenter('tarefas');
  setTimeout(function(){ var el = document.getElementById('one-tar-nome'); if(el) el.focus(); }, 200);
}

/* Hint do prompt global — clica numa sugestão e preenche o input */
function oneHintClick(el) {
  if (!el) return;
  var texto = (el.textContent || '').replace(/^[\s"'“”]+|[\s"'“”]+$/g, '');
  var input = document.getElementById('one-input-desk');
  if (input) {
    input.value = texto;
    input.focus();
    try { input.setSelectionRange(texto.length, texto.length); } catch(e){}
  }
  // Fecha o popup depois de escolher
  var popup = document.getElementById('one-hints-popup');
  if (popup) popup.setAttribute('hidden', '');
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
    var stored = JSON.parse(localStorage.getItem('tarefas_areas') || 'null');
    if (stored && Array.isArray(stored) && stored.length) return stored;
  } catch(e) {}
  // Áreas padrão estilo TaskAreas
  var defaults = ['Pinah','Enroscos','Ideias PA','Casa','Baú do Milhão'];
  oneTarSaveAreas(defaults);
  return defaults;
}
function oneTarSaveAreas(a) { localStorage.setItem('tarefas_areas', JSON.stringify(a)); }

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
  var lista = []; try { lista = JSON.parse(localStorage.getItem('tarefas')||'[]'); } catch(e){}
  lista.push({ id: Date.now().toString(), nome: nome, area: area, prioridade: 'Normal', concluida: false, criado: new Date().toISOString() });
  localStorage.setItem('tarefas', JSON.stringify(lista));
  if (typeof oneToast === 'function') oneToast('✓ Tarefa adicionada!');
  renderOneTarefasPainel();
  if (typeof renderDesktopSidebar === 'function') renderDesktopSidebar();
}

function renderOneTarefasPainel() {
  var el = document.getElementById('one-tarefas-list');
  var count = document.getElementById('one-tarefas-count');
  if (!el) return;
  var todasTarefas = []; try { todasTarefas = JSON.parse(localStorage.getItem('tarefas')||'[]'); } catch(e){}
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
    var paleta = ['#7B5CF0','#E87A7A','#5EB585','#F0A830','#5BA8D8','#C97DD4','#7EC8B8','#E0835C'];
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

    html += '<div class="one-tar-col" data-area="' + area.replace(/"/g,'&quot;') + '">' +
      '<div class="one-tar-col-header" style="border-top:3px solid ' + cor + '">' +
        '<div style="display:flex;align-items:center;gap:6px">' +
          '<span style="font-size:15px">' + emoji + '</span>' +
          '<span class="one-tar-col-nome">' + area + '</span>' +
        '</div>' +
        '<span class="one-tar-col-count">' + conclN + '/' + total.length + '</span>' +
      '</div>' +
      '<div class="one-tar-col-body">' + emptyMsg + cards + '</div>' +
      '<div class="one-tar-inline-wrap">' +
        '<button class="one-tar-col-add" onclick="oneTarModalAbrir(\'' + area.replace(/'/g,"\\'") + '\')">+ Nova tarefa</button>' +
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
  var lista = []; try { lista = JSON.parse(localStorage.getItem(key)||'[]'); } catch(e){}
  lista.push({ id: Date.now().toString(), nome: nome, valor: valor, data: data, categoria: cat,
               status: oneFinTipoAtivo==='receita' ? 'pendente' : 'pago', criado: new Date().toISOString() });
  localStorage.setItem(key, JSON.stringify(lista));
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
  var lista = []; try { lista = JSON.parse(localStorage.getItem('tarefas')||'[]'); } catch(e){}
  lista.push({ id: Date.now().toString(), nome: nome, area: area, prioridade: prio, data: data, concluida: false, criado: new Date().toISOString() });
  localStorage.setItem('tarefas', JSON.stringify(lista));
  oneTarLimpar();
  if (typeof oneToast==='function') oneToast('✓ Tarefa salva!');
  if (typeof renderOneTarefasPainel==='function') renderOneTarefasPainel();
}

function oneTarToggle(id) {
  var lista = []; try { lista = JSON.parse(localStorage.getItem('tarefas')||'[]'); } catch(e){}
  var idx = lista.findIndex(function(t){ return t.id === id; });
  if (idx !== -1) { lista[idx].concluida = !lista[idx].concluida; localStorage.setItem('tarefas', JSON.stringify(lista)); }
  if (typeof renderOneTarefasPainel==='function') renderOneTarefasPainel();
}


function oneTarExcluir(id) {
  if (!confirm('Excluir esta tarefa?')) return;
  var lista = []; try { lista = JSON.parse(localStorage.getItem('tarefas')||'[]'); } catch(e){}
  lista = lista.filter(function(t){ return t.id !== id; });
  localStorage.setItem('tarefas', JSON.stringify(lista));
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
  var lista = []; try { lista = JSON.parse(localStorage.getItem('tarefas')||'[]'); } catch(e){}
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
  var lista  = []; try { lista = JSON.parse(localStorage.getItem('tarefas')||'[]'); } catch(e){}
  if (id) {
    var idx = lista.findIndex(function(t){ return t.id === id; });
    if (idx !== -1) {
      lista[idx] = Object.assign(lista[idx], { nome: nome, descricao: desc, area: area, prioridade: prio, concluida: status==='concluida', data: data });
    }
    if (typeof oneToast==='function') oneToast('✓ Tarefa atualizada!');
  } else {
    lista.push({ id: Date.now().toString(), nome: nome, descricao: desc, area: area, prioridade: prio, concluida: status==='concluida', data: data, criado: new Date().toISOString() });
    if (typeof oneToast==='function') oneToast('✓ Tarefa criada!');
  }
  localStorage.setItem('tarefas', JSON.stringify(lista));
  oneTarModalFechar();
  renderOneTarefasPainel();
}

function oneTarPromptPinah() {
  var input = document.getElementById('one-tar-prompt-input');
  if (!input || !input.value.trim()) return;
  if (typeof oneToast==='function') oneToast('Pinah em breve! Use o form por enquanto 💜');
  input.value = '';
}

function renderOneFinanceiroPainel() {
  var receitas = JSON.parse(localStorage.getItem('receitas') || '[]');
  var despesas = JSON.parse(localStorage.getItem('despesas') || '[]');
  var hoje = new Date();
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
  var lancamentos = rMes.map(function(r){ return {tipo:'in', nome:r.nome || r.descricao || 'Receita', valor:Number(r.valor)||0, data:r.data}; })
                       .concat(dMes.map(function(d){ return {tipo:'out', nome:d.nome || d.descricao || 'Despesa', valor:Number(d.valor)||0, data:d.data}; }))
                       .sort(function(a,b){ return (b.data||'').localeCompare(a.data||''); });
  if (!lancamentos.length) { el.innerHTML = ''; return; }
  var html = lancamentos.slice(0, 12).map(function(l){
    var cor = l.tipo === 'in' ? '#4CAF50' : '#E87A7A';
    var sinal = l.tipo === 'in' ? '+' : '-';
    return '<div class="one-fin-item-big">' +
             '<span class="one-tarefa-nome">' + l.nome.replace(/</g,'&lt;') + '</span>' +
             '<span style="font-size:13px;font-weight:600;color:' + cor + '">' + sinal + brl(l.valor).replace('R$ ','R$') + '</span>' +
           '</div>';
  }).join('');
  el.innerHTML = html;
}

function oneAgNavegar(delta) {
  oneAgWeekOffset += delta;
  renderOneAgendaPainel();
}

function renderOneAgendaPainel() {
  var kanban = document.getElementById('one-ag-kanban');
  var label  = document.getElementById('one-ag-mes-label');
  if (!kanban) return;

  var compromissos = JSON.parse(localStorage.getItem('compromissos') || '[]');
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
    if (seg.getMonth() === domDaSemana.getMonth()) {
      label.textContent = meses[seg.getMonth()] + ' ' + seg.getFullYear();
    } else {
      label.textContent = meses[seg.getMonth()] + ' / ' + meses[domDaSemana.getMonth()];
    }
  }

  var NOMES = ['SEG','TER','QUA','QUI','SEX','SÁB','DOM'];
  var html = '';

  for (var i = 0; i < 7; i++) {
    var d = new Date(seg); d.setDate(seg.getDate() + i);
    var ds = d.toISOString().slice(0,10);
    var isHoje = ds === hojeStr;

    var doDia = compromissos
      .filter(function(c){ return c.data === ds; })
      .sort(function(a,b){ return (a.hora||'').localeCompare(b.hora||''); });

    var numDia = d.getDate();
    var numHtml = isHoje
      ? '<div class="one-ag-kday-num" style="background:#9B72B0;color:#fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px">' + numDia + '</div>'
      : '<div class="one-ag-kday-num">' + numDia + '</div>';

    var cards = doDia.length === 0
      ? '<div class="one-ag-kday-empty">Livre</div>'
      : doDia.map(function(c) {
          var realizado = !!c.status && c.status.toLowerCase() === 'realizado';
          var hora = c.hora || '';
          var nome = (c.nome || c.descricao || 'Compromisso').replace(/</g,'&lt;');
          var tipo = (c.tipo || '').replace(/</g,'&lt;');
          var checkBg  = realizado ? '#4CAF50' : 'transparent';
          var checkBdr = realizado ? '#4CAF50' : '#C0BAD0';
          var checkTxt = realizado ? '✓' : '';
          // Cor por tipo
          var borderColor = '#9B72B0';
          if (/atend|paciente|consulta/i.test(tipo)) borderColor = '#7EC8B8';
          else if (/reuni|meeting/i.test(tipo))       borderColor = '#7AB8D4';
          else if (/admin|treino|curso/i.test(tipo))  borderColor = '#E8C4D4';
          return '<div class="one-ag-kcard' + (realizado ? ' realizado' : '') + '" style="border-left-color:' + borderColor + '">' +
            '<div class="one-ag-kcard-check" data-cid="' + c.id + '" onclick="event.stopPropagation();oneAgToggleRealizado(this.dataset.cid)" style="background:' + checkBg + ';border-color:' + checkBdr + '">' + checkTxt + '</div>' +
            '<div class="one-ag-kcard-body">' +
              (hora ? '<div class="one-ag-kcard-hora">' + hora + '</div>' : '') +
              '<div class="one-ag-kcard-nome">' + nome + '</div>' +
              (tipo ? '<div class="one-ag-kcard-tipo">' + tipo + '</div>' : '') +
            '</div>' +
            '<div class="one-ag-kcard-actions">' +
              '<button class="one-tar-card-btn edit" data-cid="' + c.id + '" onclick="event.stopPropagation();oneAgModalEditar(this.dataset.cid)" title="Editar">✏️</button>' +
              '<button class="one-tar-card-btn del"  data-cid="' + c.id + '" onclick="event.stopPropagation();oneAgExcluir(this.dataset.cid)"    title="Excluir">🗑️</button>' +
            '</div>' +
          '</div>';
        }).join('');

    html += '<div class="one-ag-kday-col' + (isHoje ? ' today' : '') + '" data-date="' + ds + '">' +
      '<div class="one-ag-kday-header">' +
        '<div class="one-ag-kday-name">' + NOMES[i] + '</div>' +
        numHtml +
      '</div>' +
      '<div class="one-ag-kday-body">' + cards + '</div>' +
      '<button class="one-ag-kday-add" data-date="' + ds + '" onclick="oneAgModalAbrir(this.dataset.date)">+ Novo</button>' +
    '</div>';
  }

  kanban.innerHTML = html;
}

function oneHoraParaTop(hora) {
  if (!hora) return 0;
  var parts = String(hora).split(':');
  var h = parseInt(parts[0]) || 0;
  var m = parseInt(parts[1]) || 0;
  var px = (h - 8) * 50 + m * (50 / 60);
  if (px < 0) px = 0;
  if (px > (19 - 8) * 50 - 28) px = (19 - 8) * 50 - 28;
  return Math.round(px); // 50px/h, range 08h-19h
}

/* ── Kanban drag-and-drop dos compromissos ──────────────── */
function oneInitAgendaSortable() {
  if (typeof Sortable === 'undefined') return;
  var cols = document.querySelectorAll('#one-ag-week-grid .one-ag-day-events');
  cols.forEach(function(col){
    if (col._sortable) return; // já inicializado
    col._sortable = new Sortable(col, {
      group: 'agenda-events',
      animation: 180,
      ghostClass: 'one-ag-event-ghost',
      chosenClass: 'one-ag-event-chosen',
      dragClass:  'one-ag-event-dragging',
      onAdd: function(evt) {
        var id = evt.item.getAttribute('data-event-id');
        var novaData = evt.to.getAttribute('data-date');
        if (!id || !novaData) return;
        var lista = []; try { lista = JSON.parse(localStorage.getItem('compromissos') || '[]'); } catch(e){}
        var idx = lista.findIndex(function(x){ return x.id === id; });
        if (idx === -1) return;
        var dataAntiga = lista[idx].data;
        lista[idx].data = novaData;
        localStorage.setItem('compromissos', JSON.stringify(lista));

        // Atualiza receita vinculada se existir (mantém vínculo data ↔ data)
        var rec = []; try { rec = JSON.parse(localStorage.getItem('receitas') || '[]'); } catch(e){}
        var rIdx = rec.findIndex(function(r){ return r.compromissoId === id; });
        if (rIdx !== -1) {
          rec[rIdx].data = novaData;
          localStorage.setItem('receitas', JSON.stringify(rec));
        }

        if (typeof oneToast === 'function') oneToast('✓ Compromisso movido pra ' + novaData.split('-').reverse().join('/'));
        renderOneAgendaPainel();
        if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
      }
    });
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
  try { compromissos = JSON.parse(localStorage.getItem('compromissos') || '[]'); } catch(e){}

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
  try { receitas = JSON.parse(localStorage.getItem('receitas') || '[]'); } catch(e){}
  try { despesas = JSON.parse(localStorage.getItem('despesas') || '[]'); } catch(e){}
  try { fixas    = JSON.parse(localStorage.getItem('despesasFixas') || '[]'); } catch(e){}

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

/* Dots — atualiza ao rolar entre telas */
(function() {
  function setup() {
    var wrap = document.getElementById('one-screens-wrap');
    var dots = document.querySelectorAll('#one-dots .one-dot');
    if (!wrap || !dots.length) { setTimeout(setup, 200); return; }
    wrap.addEventListener('scroll', function() {
      var idx = Math.round(wrap.scrollLeft / wrap.offsetWidth);
      dots.forEach(function(d, i) { d.classList.toggle('active', i === idx); });
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
  try { lista = JSON.parse(localStorage.getItem('compromissos') || '[]'); } catch(e){}
  var today = new Date();
  var diasSem = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  var html = '';
  var todayYMD = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
  for (var i = 0; i < 7; i++) {
    var d = new Date(today); d.setDate(today.getDate() + i);
    var ymd = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    var items = lista.filter(function(c){return c.data===ymd;}).sort(function(a,b){return (a.hora||'').localeCompare(b.hora||'');});
    var isHoje = ymd === todayYMD;
    html += '<div class="one-agenda-col">';
    html += '<div class="one-agenda-day-header">';
    html += '<div class="one-agenda-day-name">'+diasSem[d.getDay()]+'</div>';
    html += '<div class="one-agenda-day-num'+(isHoje?' today':'')+'">'+(d.getDate())+'</div>';
    html += '</div><div class="one-agenda-day-cards">';
    if (!items.length) {
      html += '<div class="one-agenda-empty-col"></div>';
    } else {
      items.forEach(function(c) {
        var cls = c.realizado ? 'realizado' : ((c.status||'').toLowerCase() === 'confirmado' ? 'confirmado' : 'pendente');
        html += '<div class="one-agenda-card-mini '+cls+'">';
        html += '<div class="one-agenda-card-mini-name">'+(c.nome||c.descricao||'—')+'</div>';
        if (c.hora) html += '<div class="one-agenda-card-mini-time">'+c.hora+'</div>';
        html += '</div>';
      });
    }
    html += '</div></div>';
  }
  wrap.innerHTML = html;
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
  try { receitas = JSON.parse(localStorage.getItem('receitas')||'[]'); } catch(e){}
  try { despesas = JSON.parse(localStorage.getItem('despesas')||'[]'); } catch(e){}
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
  try { tarefas = JSON.parse(localStorage.getItem('tarefas')||'[]'); } catch(e){}
  var pendentes = tarefas.filter(function(t){ return !t.concluida; }).slice(0,5);
  if (!pendentes.length) {
    el.innerHTML = '<p style="font-size:12px;color:#B0A8BC;text-align:center;padding:12px 0">Nenhuma tarefa pendente 🎉</p>';
    return;
  }
  var html = '';
  pendentes.forEach(function(t) {
    html += '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:0.5px solid rgba(160,32,240,0.08)">';
    html += '<div style="width:14px;height:14px;border-radius:50%;border:1.5px solid rgba(160,32,240,0.55);flex-shrink:0"></div>';
    html += '<span style="font-size:12px;color:#2D2D2D;font-family:system-ui;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">'+(t.nome||t.titulo||t.descricao||'Tarefa')+'</span>';
    if (t.prazo) html += '<span style="font-size:10px;color:#A8A0B8;flex-shrink:0">'+t.prazo+'</span>';
    html += '</div>';
  });
  el.innerHTML = html;
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
  document.addEventListener('DOMContentLoaded', function() {
    setupAutoGrow(document.getElementById('one-input'));
    setupAutoGrow(document.getElementById('one-input-desk'));
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
  var lista = []; try { lista = JSON.parse(localStorage.getItem(chave) || '[]'); } catch(e){}
  var item = { id: 'one-' + Date.now(), data: data, valor: valor, status: 'Pago', categoria: cat };
  if (_lancTipo === 'receita') { item.nome = nome; item.tipo = cat; item.formaPagamento = 'Pix'; }
  else { item.descricao = nome; }
  lista.push(item);
  localStorage.setItem(chave, JSON.stringify(lista));
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
    var lista = []; try { lista = JSON.parse(localStorage.getItem('compromissos') || '[]'); } catch(e){}
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

  var lista = []; try { lista = JSON.parse(localStorage.getItem('compromissos') || '[]'); } catch(e){}

  if (oneEditandoCompromissoId) {
    var idx = lista.findIndex(function(x){ return x.id === oneEditandoCompromissoId; });
    if (idx !== -1) {
      lista[idx] = Object.assign({}, lista[idx], { data:data, hora:hora, nome:nome, tipo:tipo, valor:valor, observacoes:obs });
    }
    // Atualiza receita vinculada se existir
    var rec = []; try { rec = JSON.parse(localStorage.getItem('receitas') || '[]'); } catch(e){}
    var rIdx = rec.findIndex(function(r){ return r.compromissoId === oneEditandoCompromissoId; });
    if (valor > 0) {
      if (rIdx !== -1) {
        rec[rIdx] = Object.assign({}, rec[rIdx], { data:data, nome:nome, tipo:tipo, valor:valor });
      } else {
        rec.push({ id:'r-'+Date.now(), compromissoId:oneEditandoCompromissoId, data:data, nome:nome, tipo:tipo, valor:valor, status:'Pendente', categoria:tipo });
      }
    } else if (rIdx !== -1) {
      rec.splice(rIdx, 1); // remove receita se valor virou zero
    }
    localStorage.setItem('receitas', JSON.stringify(rec));
    oneToast('✓ Compromisso atualizado!');
  } else {
    var novoId = 'one-'+Date.now();
    lista.push({ id:novoId, data:data, hora:hora, nome:nome, tipo:tipo, valor:valor, observacoes:obs, status:'Pendente', duracao:45 });
    // Cria receita futura pendente se valor > 0
    if (valor > 0) {
      var rec = []; try { rec = JSON.parse(localStorage.getItem('receitas') || '[]'); } catch(e){}
      rec.push({ id:'r-'+Date.now(), compromissoId:novoId, data:data, nome:nome, tipo:tipo, valor:valor, status:'Pendente', categoria:tipo });
      localStorage.setItem('receitas', JSON.stringify(rec));
    }
    oneToast('✓ Compromisso salvo!');
  }

  localStorage.setItem('compromissos', JSON.stringify(lista));
  oneResetFormCompromisso();
  if (typeof renderOneAgendaPainel === 'function') renderOneAgendaPainel();
  if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
  if (typeof renderOneAgenda === 'function') renderOneAgenda();
}

function oneExcluirCompromisso() {
  if (!oneEditandoCompromissoId) return;
  if (!confirm('Excluir este compromisso? A receita vinculada (se houver) também será removida.')) return;

  var lista = []; try { lista = JSON.parse(localStorage.getItem('compromissos') || '[]'); } catch(e){}
  lista = lista.filter(function(x){ return x.id !== oneEditandoCompromissoId; });
  localStorage.setItem('compromissos', JSON.stringify(lista));

  // Remove receita vinculada se existir
  var rec = []; try { rec = JSON.parse(localStorage.getItem('receitas') || '[]'); } catch(e){}
  rec = rec.filter(function(r){ return r.compromissoId !== oneEditandoCompromissoId; });
  localStorage.setItem('receitas', JSON.stringify(rec));

  oneResetFormCompromisso();
  if (typeof oneToast === 'function') oneToast('✓ Compromisso excluído.');
  if (typeof renderOneAgendaPainel === 'function') renderOneAgendaPainel();
  if (typeof renderOneFinanceiroPainel === 'function') renderOneFinanceiroPainel();
  if (typeof renderOneAgenda === 'function') renderOneAgenda();
}


/* ── Agenda Kanban: modal + toggle + excluir ── */
function oneAgToggleRealizado(id) {
  var lista = []; try { lista = JSON.parse(localStorage.getItem('compromissos')||'[]'); } catch(e){}
  var idx = lista.findIndex(function(c){ return c.id === id; });
  if (idx !== -1) {
    lista[idx].status = (lista[idx].status === 'Realizado') ? 'Pendente' : 'Realizado';
    localStorage.setItem('compromissos', JSON.stringify(lista));
  }
  renderOneAgendaPainel();
  if (typeof renderOneAgenda === 'function') renderOneAgenda();
}

function oneAgExcluir(id) {
  if (!confirm('Excluir este compromisso? A receita vinculada (se houver) também será removida.')) return;
  var lista = []; try { lista = JSON.parse(localStorage.getItem('compromissos')||'[]'); } catch(e){}
  lista = lista.filter(function(c){ return c.id !== id; });
  localStorage.setItem('compromissos', JSON.stringify(lista));
  var rec = []; try { rec = JSON.parse(localStorage.getItem('receitas')||'[]'); } catch(e){}
  rec = rec.filter(function(r){ return r.compromissoId !== id; });
  localStorage.setItem('receitas', JSON.stringify(rec));
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
  var lista = []; try { lista = JSON.parse(localStorage.getItem('compromissos')||'[]'); } catch(e){}
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

  var lista = []; try { lista = JSON.parse(localStorage.getItem('compromissos')||'[]'); } catch(e){}
  var rec   = []; try { rec   = JSON.parse(localStorage.getItem('receitas')   ||'[]'); } catch(e){}

  if (id) {
    var idx = lista.findIndex(function(x){ return x.id === id; });
    if (idx !== -1) lista[idx] = Object.assign(lista[idx], { data:data, hora:hora, nome:nome, tipo:tipo, valor:valor, observacoes:obs });
    var rIdx = rec.findIndex(function(r){ return r.compromissoId === id; });
    if (valor > 0) {
      if (rIdx !== -1) rec[rIdx] = Object.assign(rec[rIdx], { data:data, nome:nome, tipo:tipo, valor:valor });
      else rec.push({ id:'r-'+Date.now(), compromissoId:id, data:data, nome:nome, tipo:tipo, valor:valor, status:'Pendente', categoria:tipo });
    } else if (rIdx !== -1) { rec.splice(rIdx, 1); }
    if (typeof oneToast==='function') oneToast('✓ Compromisso atualizado!');
  } else {
    var novoId = 'one-'+Date.now();
    lista.push({ id:novoId, data:data, hora:hora, nome:nome, tipo:tipo, valor:valor, observacoes:obs, status:'Pendente', duracao:45 });
    if (valor > 0) rec.push({ id:'r-'+Date.now(), compromissoId:novoId, data:data, nome:nome, tipo:tipo, valor:valor, status:'Pendente', categoria:tipo });
    if (typeof oneToast==='function') oneToast('✓ Compromisso salvo!');
  }

  localStorage.setItem('compromissos', JSON.stringify(lista));
  localStorage.setItem('receitas', JSON.stringify(rec));
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
    if (localStorage.getItem('one_init')) return;
    var now = new Date();
    var ano = now.getFullYear();
    var mes = String(now.getMonth()+1).padStart(2,'0');
    var h = now.getDate();
    var d = function(dia) { return ano+'-'+mes+'-'+String(Math.max(1,Math.min(28,dia))).padStart(2,'0'); };
    if (!localStorage.getItem('receitas')) {
      localStorage.setItem('receitas', JSON.stringify([
        {id:'d1',data:d(h-8),nome:'Maria S.',tipo:'Atendimento',valor:280,formaPagamento:'Pix',status:'Pago',categoria:'Atendimento'},
        {id:'d2',data:d(h-5),nome:'Leonardo B.',tipo:'Avaliação',valor:350,formaPagamento:'Pix',status:'Pago',categoria:'Avaliação'},
        {id:'d3',data:d(h-3),nome:'Ana K.',tipo:'Atendimento',valor:280,formaPagamento:'Pix',status:'Pago',categoria:'Atendimento'},
        {id:'d4',data:d(h),nome:'Beatriz N.',tipo:'Atendimento',valor:280,formaPagamento:'Pix',status:'Pendente',categoria:'Atendimento'}
      ]));
    }
    if (!localStorage.getItem('despesas')) {
      localStorage.setItem('despesas', JSON.stringify([
        {id:'e1',data:d(h-7),descricao:'Material de consultório',categoria:'Material',valor:180,status:'Pago'},
        {id:'e2',data:d(h-2),descricao:'Curso online',categoria:'Capacitação',valor:320,status:'Pago'}
      ]));
    }
    if (!localStorage.getItem('compromissos')) {
      localStorage.setItem('compromissos', JSON.stringify([
        {id:'c1',data:d(h-2),hora:'09:00',nome:'Maria S.',tipo:'Atendimento',valor:280,status:'Confirmado',realizado:true},
        {id:'c2',data:d(h-1),hora:'14:00',nome:'Ana K.',tipo:'Atendimento',valor:280,status:'Confirmado',realizado:true},
        {id:'c3',data:d(h),hora:'10:00',nome:'Beatriz N.',tipo:'Atendimento',valor:280,status:'Confirmado'},
        {id:'c4',data:d(h),hora:'15:30',nome:'Leonardo B.',tipo:'Avaliação',valor:350,status:'Pendente'},
        {id:'c5',data:d(h+2),hora:'09:00',nome:'Maria S.',tipo:'Atendimento',valor:280,status:'Pendente'},
        {id:'c6',data:d(h+4),hora:'11:00',nome:'Reunião parceria',tipo:'Profissional',valor:0,status:'Pendente'}
      ]));
    }
    localStorage.setItem('one_init', '1');
  }

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
    renderOneDesktop();
  }

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

