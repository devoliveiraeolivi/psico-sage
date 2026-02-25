// ============================================
// Central de conteúdo de ajuda do PsicoApp
// Single source of truth para tour, artigos e dicas
// ============================================

// ============================================
// TOUR STEPS (Dashboard onboarding)
// ============================================

export interface TourStep {
  element: string
  title: string
  description: string
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export const dashboardTourSteps: TourStep[] = [
  {
    element: '#sidebar-nav',
    title: 'Menu de Navegação',
    description:
      'Use o menu lateral para acessar Início, Pacientes, Agenda, Sessões, Configurações e Ajuda. Você pode recolher o menu clicando no ícone de seta.',
    side: 'right',
  },
  {
    element: '#dashboard-metrics',
    title: 'Métricas do Dia',
    description:
      'Aqui você vê rapidamente quantas sessões tem hoje, o total de pacientes ativos e o horário da próxima sessão.',
    side: 'bottom',
  },
  {
    element: '#dashboard-calendar',
    title: 'Seu Calendário',
    description:
      'Visualize suas sessões no calendário. Alterne entre visão diária e semanal. Clique em uma sessão para ver os detalhes.',
    side: 'top',
  },
  {
    element: '#dashboard-quick-actions',
    title: 'Ações Rápidas',
    description:
      'Atalhos para as tarefas mais comuns: cadastrar paciente, agendar sessão ou ver sua lista de pacientes.',
    side: 'left',
  },
  {
    element: '#dashboard-validacoes',
    title: 'Validar Prontuários',
    description:
      'Após cada sessão gravada, a IA gera um prontuário clínico automaticamente. Os prontuários aparecem aqui para sua revisão e aprovação.',
    side: 'left',
  },
]

// ============================================
// HELP ARTICLES
// ============================================

export interface HelpArticle {
  id: string
  title: string
  summary: string
  steps: string[]
  icon: string
}

export interface HelpCategory {
  id: string
  title: string
  description: string
  icon: string
  color: string // Tailwind color prefix (blue, emerald, violet, amber)
  articles: HelpArticle[]
}

export const helpCategories: HelpCategory[] = [
  {
    id: 'primeiros-passos',
    title: 'Primeiros Passos',
    description: 'Comece a usar o PsicoApp em poucos minutos',
    icon: 'rocket',
    color: 'blue',
    articles: [
      {
        id: 'cadastrar-paciente',
        title: 'Cadastrar um Paciente',
        summary: 'Aprenda a registrar um novo paciente na plataforma.',
        steps: [
          'Acesse "Pacientes" no menu lateral.',
          'Clique em "Novo Paciente" no canto superior direito.',
          'Preencha o nome do paciente (obrigatório) e demais informações como email, telefone e data de nascimento.',
          'Defina a frequência de sessões e dia/horário preferido — isso ajuda na organização da agenda.',
          'Clique em "Salvar" para concluir o cadastro.',
          'Pronto! O paciente aparecerá na sua lista e você já pode agendar sessões.',
        ],
        icon: 'user-plus',
      },
      {
        id: 'agendar-sessao',
        title: 'Agendar uma Sessão',
        summary: 'Passo a passo para criar uma nova sessão de terapia.',
        steps: [
          'Acesse "Agenda" no menu lateral e clique em "Nova Sessão".',
          'Selecione o paciente na lista (use a busca para encontrar rapidamente).',
          'Escolha a data e horário da sessão.',
          'Defina a duração prevista (padrão: 50 minutos).',
          'Se você tiver Google Meet configurado, um link de videochamada será gerado automaticamente.',
          'Clique em "Agendar" para confirmar.',
        ],
        icon: 'calendar-plus',
      },
      {
        id: 'configurar-videochamada',
        title: 'Configurar Videochamada',
        summary: 'Conecte Google Meet ou configure um link externo para sessões online.',
        steps: [
          'Acesse "Configurações" no menu lateral.',
          'Na seção "Videochamada", escolha a plataforma desejada.',
          'Para Google Meet: clique em "Conectar Google" e autorize o acesso à sua conta.',
          'Para link externo (Zoom, Teams, etc.): selecione "Plataforma externa" e informe a URL.',
          'Escolha o modo de link: "Por paciente" (cada paciente tem seu link) ou "Link fixo" (mesmo link para todos).',
          'As configurações são salvas automaticamente.',
        ],
        icon: 'video',
      },
    ],
  },
  {
    id: 'funcionalidades',
    title: 'Funcionalidades',
    description: 'Explore tudo que o PsicoApp oferece',
    icon: 'sparkles',
    color: 'violet',
    articles: [
      {
        id: 'gravacao-sessao',
        title: 'Gravação de Sessão',
        summary: 'Como gravar áudio durante ou após a sessão.',
        steps: [
          'Abra a sessão desejada clicando nela no calendário ou na lista de sessões.',
          'Clique em "Iniciar Sessão" e escolha o modo: Presencial ou Videochamada.',
          'No modo Presencial, o PsicoApp solicita permissão de microfone e inicia a gravação automaticamente.',
          'No modo Videochamada (Google Meet), é possível capturar o áudio da chamada diretamente.',
          'O timer no topo mostra a duração. Clique em "Encerrar Sessão" quando terminar.',
          'O áudio é enviado automaticamente para transcrição e processamento pela IA.',
          'Você também pode enviar um áudio gravado externamente clicando em "Enviar Áudio".',
        ],
        icon: 'mic',
      },
      {
        id: 'transcricao-automatica',
        title: 'Transcrição Automática',
        summary: 'O áudio é transcrito em texto automaticamente.',
        steps: [
          'Após enviar ou gravar um áudio, a transcrição começa automaticamente.',
          'O progresso é mostrado em tempo real: Enviando → Transcrevendo → Processando → Concluído.',
          'A transcrição completa (íntegra) fica disponível na página da sessão.',
          'A IA utiliza a transcrição para gerar o prontuário clínico automaticamente.',
          'Formatos aceitos: MP3, WAV, M4A, WebM, OGG e MP4.',
        ],
        icon: 'file-text',
      },
      {
        id: 'resumo-ia',
        title: 'Prontuário por IA',
        summary: 'A IA gera um prontuário clínico completo após cada sessão.',
        steps: [
          'Após a transcrição, a IA analisa o conteúdo da sessão automaticamente.',
          'É gerado um prontuário completo com: síntese, pontos de atenção, estado mental, evolução e plano.',
          'O prontuário segue as normas do CFP para registros clínicos.',
          'Você pode revisar e editar qualquer campo antes de aprovar.',
          'Após aprovação, o prontuário atualiza automaticamente o perfil clínico do paciente.',
          'O histórico longitudinal do paciente é enriquecido com dados de cada sessão.',
        ],
        icon: 'brain',
      },
      {
        id: 'ajuste-prontuario-ia',
        title: 'Ajuste de Prontuário com IA',
        summary: 'Peça à IA para corrigir erros ou imprecisões no prontuário gerado.',
        steps: [
          'Abra uma sessão que já tenha prontuário gerado pela IA.',
          'Ao revisar o prontuário, caso encontre erros ou imprecisões, clique em "Ajustar com IA".',
          'Descreva em texto livre o que precisa ser corrigido — por exemplo: "O nome do cônjuge está errado, é Maria e não Ana".',
          'A IA reprocessa o prontuário aplicando suas correções, mantendo o restante intacto.',
          'Revise o resultado e aprove quando estiver satisfeito.',
          'Você pode fazer quantos ajustes precisar antes da aprovação final.',
          'Isso é útil quando a transcrição capturou algo incorretamente ou a IA interpretou mal algum contexto.',
        ],
        icon: 'brain',
      },
      {
        id: 'calendario-agenda',
        title: 'Calendário e Agenda',
        summary: 'Organize suas sessões com visualizações flexíveis.',
        steps: [
          'A página "Agenda" oferece visualização em dia, semana ou mês.',
          'As sessões são coloridas por status: azul (agendada), laranja (em andamento), verde (realizada).',
          'Clique em qualquer sessão para ver detalhes ou iniciar.',
          'O horário de atendimento exibido respeita sua configuração pessoal.',
          'Use o botão "Nova Sessão" para agendar diretamente do calendário.',
          'O Dashboard também mostra o calendário do dia atual para referência rápida.',
        ],
        icon: 'calendar',
      },
      {
        id: 'kanban-sessoes',
        title: 'Visão Kanban de Sessões',
        summary: 'Gerencie sessões em colunas organizadas por status.',
        steps: [
          'Acesse "Sessões" no menu lateral para ver a visão em Kanban.',
          'As sessões são organizadas em 3 colunas: Futuras, Aguardando Aprovação e Finalizadas.',
          'Cada card mostra paciente, número da sessão, data e um trecho do resumo.',
          'Clique em um card para acessar os detalhes completos da sessão.',
          'Sessões "Aguardando Aprovação" precisam da sua revisão do prontuário gerado pela IA.',
        ],
        icon: 'columns',
      },
    ],
  },
  {
    id: 'integracoes',
    title: 'Integrações',
    description: 'Conecte com Google Calendar e Meet',
    icon: 'plug',
    color: 'emerald',
    articles: [
      {
        id: 'google-calendar',
        title: 'Google Calendar',
        summary: 'Sincronize sua agenda com o Google Calendar.',
        steps: [
          'Vá em Configurações e selecione "Google Meet" como plataforma de videochamada.',
          'Clique em "Conectar Google" e autorize o acesso à sua conta Google.',
          'Ao agendar uma sessão, um evento é criado automaticamente no seu Google Calendar.',
          'O paciente pode receber o convite do calendário com o link da videochamada.',
          'Cancelamentos e remarcações são sincronizados automaticamente.',
        ],
        icon: 'calendar',
      },
      {
        id: 'google-meet',
        title: 'Google Meet',
        summary: 'Links de reunião automáticos para sessões online.',
        steps: [
          'Conecte sua conta Google (veja o guia de Google Calendar acima).',
          'Ao agendar uma sessão, um link do Google Meet é gerado automaticamente.',
          'Você pode escolher entre link fixo (mesmo para todas as sessões) ou por paciente.',
          'Na hora da sessão, clique em "Google Meet" para iniciar a videochamada e gravar.',
          'A gravação do áudio pode ser feita diretamente via compartilhamento de tela.',
        ],
        icon: 'video',
      },
    ],
  },
  {
    id: 'faq',
    title: 'Perguntas Frequentes',
    description: 'Dúvidas comuns sobre o PsicoApp',
    icon: 'help-circle',
    color: 'amber',
    articles: [
      {
        id: 'formatos-audio',
        title: 'Quais formatos de áudio são aceitos?',
        summary: 'MP3, WAV, M4A, WebM, OGG e MP4.',
        steps: [
          'O PsicoApp aceita os seguintes formatos: MP3, WAV, M4A, WebM, OGG e MP4.',
          'O tamanho máximo recomendado é 500MB por arquivo.',
          'Para melhor qualidade de transcrição, prefira gravações com pouco ruído de fundo.',
          'Áudios muito curtos (menos de 10 segundos) podem não gerar transcrição adequada.',
        ],
        icon: 'file-audio',
      },
      {
        id: 'sigilo-dados',
        title: 'Como meus dados são protegidos?',
        summary: 'Seus dados clínicos são criptografados e protegidos.',
        steps: [
          'Todos os dados clínicos sensíveis (prontuários, resumos) são criptografados no banco de dados.',
          'O acesso é protegido por Row-Level Security — somente você vê seus dados.',
          'As transcrições e áudios são armazenados de forma segura no Supabase Storage.',
          'A comunicação com a IA é feita via API segura sem armazenar dados no provedor.',
          'Você é o único com acesso às informações dos seus pacientes.',
        ],
        icon: 'shield',
      },
      {
        id: 'como-funciona-ia',
        title: 'Como a IA gera o prontuário?',
        summary: 'Entenda o processo de extração e geração de prontuários.',
        steps: [
          'Após a transcrição do áudio, o texto é enviado para processamento pela IA.',
          'A IA analisa o conteúdo identificando: queixas, estado mental, padrões, pessoas mencionadas e mais.',
          'É gerado um prontuário estruturado seguindo normas do Conselho Federal de Psicologia.',
          'O prontuário inclui: síntese da sessão, pontos de atenção, evolução CFP, estratégias e plano.',
          'Você sempre revisa e aprova antes que qualquer informação atualize o perfil do paciente.',
          'A IA nunca substitui seu julgamento clínico — é uma ferramenta de apoio e organização.',
        ],
        icon: 'brain',
      },
      {
        id: 'importar-pacientes',
        title: 'Como importar pacientes em massa?',
        summary: 'Importe vários pacientes de uma vez.',
        steps: [
          'Acesse "Pacientes" no menu lateral.',
          'Clique em "Importar" no canto superior direito.',
          'Você pode colar dados diretamente de uma planilha.',
          'O formato aceito é: Nome, Email, Telefone (um paciente por linha).',
          'Revise a lista antes de confirmar a importação.',
          'Os pacientes importados são criados com status "ativo" por padrão.',
        ],
        icon: 'upload',
      },
    ],
  },
]

// ============================================
// PAGE TOUR STEPS (mini-tours por página)
// ============================================

export const pageTourSteps: Record<string, TourStep[]> = {
  'paciente-detail': [
    {
      element: '#patient-header',
      title: 'Cabeçalho do Paciente',
      description: 'Aqui você vê o nome, status (ativo/pausado/encerrado), idade e tempo em terapia.',
      side: 'bottom',
    },
    {
      element: '#clinical-synthesis',
      title: 'Síntese Clínica',
      description: 'Resumo gerado pela IA com a visão geral do paciente, atualizado após cada sessão aprovada.',
      side: 'bottom',
    },
    {
      element: '#patient-tabs',
      title: 'Abas de Informação',
      description: 'Navegue entre Estado Atual (dados clínicos), Histórico Evolutivo (linha do tempo) e Resumos das Sessões.',
      side: 'top',
    },
    {
      element: '#patient-sidebar',
      title: 'Configurações do Paciente',
      description: 'Defina frequência de sessões, dia preferido, link de videochamada individual e veja sessões recentes.',
      side: 'left',
    },
    {
      element: '#schedule-session-btn',
      title: 'Agendar Sessão',
      description: 'Clique aqui para agendar uma sessão diretamente para este paciente.',
      side: 'top',
    },
  ],
  agenda: [
    {
      element: '#agenda-header',
      title: 'Sua Agenda',
      description: 'Cabeçalho da agenda com botão para criar nova sessão rapidamente.',
      side: 'bottom',
    },
    {
      element: '#calendar-views',
      title: 'Visões do Calendário',
      description: 'Alterne entre visão semanal e mensal para ter diferentes perspectivas da sua agenda.',
      side: 'bottom',
    },
    {
      element: '#calendar-grid',
      title: 'Grade do Calendário',
      description: 'Suas sessões aparecem aqui com cores por status. Clique em uma sessão para ver detalhes ou iniciar.',
      side: 'top',
    },
  ],
  sessoes: [
    {
      element: '#sessoes-header',
      title: 'Painel de Sessões',
      description: 'Visão geral com contagem de sessões finalizadas, agendadas e aguardando aprovação.',
      side: 'bottom',
    },
    {
      element: '#finalizadas-column',
      title: 'Finalizadas',
      description: 'Sessões concluídas, faltas e canceladas. Clique em uma para ver o prontuário completo.',
      side: 'right',
    },
    {
      element: '#futuras-column',
      title: 'Futuras',
      description: 'Sessões agendadas e remarcadas, ordenadas por data. Clique para ver detalhes ou iniciar.',
      side: 'left',
    },
    {
      element: '#aprovacao-column',
      title: 'Aguardando Aprovação',
      description: 'Prontuários gerados pela IA que precisam da sua revisão. Aprove ou ajuste antes de finalizar.',
      side: 'left',
    },
  ],
}

// ============================================
// CONTEXTUAL TIPS (dicas por rota)
// ============================================

export interface ContextualTip {
  title: string
  description: string
  relatedArticles: string[]
}

export const contextualTips: Record<string, ContextualTip[]> = {
  '/dashboard': [
    {
      title: 'Seu painel de controle',
      description:
        'O Dashboard mostra uma visão geral do seu dia: métricas, calendário e prontuários para aprovar.',
      relatedArticles: ['cadastrar-paciente', 'agendar-sessao'],
    },
    {
      title: 'Prontuários pendentes',
      description:
        'Sessões processadas pela IA aparecem na coluna lateral para sua revisão rápida.',
      relatedArticles: ['resumo-ia'],
    },
  ],
  '/pacientes': [
    {
      title: 'Gerenciar Pacientes',
      description:
        'Aqui você vê todos os seus pacientes. Use a busca para encontrar rapidamente.',
      relatedArticles: ['cadastrar-paciente', 'importar-pacientes'],
    },
    {
      title: 'Perfil Clínico',
      description:
        'Clique em um paciente para ver seu perfil completo com histórico e evolução.',
      relatedArticles: ['resumo-ia'],
    },
  ],
  '/sessoes': [
    {
      title: 'Visão Kanban',
      description:
        'Sessões organizadas por status: futuras, aguardando aprovação e finalizadas.',
      relatedArticles: ['kanban-sessoes', 'agendar-sessao'],
    },
    {
      title: 'Aprovar Prontuários',
      description:
        'Sessões na coluna "Aguardando Aprovação" têm prontuários gerados pela IA prontos para sua revisão.',
      relatedArticles: ['resumo-ia', 'gravacao-sessao'],
    },
  ],
  '/agenda': [
    {
      title: 'Sua Agenda',
      description:
        'Visualize e gerencie sua agenda em diferentes formatos: dia, semana ou mês.',
      relatedArticles: ['agendar-sessao', 'calendario-agenda'],
    },
    {
      title: 'Agendar Sessão',
      description:
        'Clique em "Nova Sessão" para agendar diretamente do calendário.',
      relatedArticles: ['agendar-sessao', 'configurar-videochamada'],
    },
  ],
  '/configuracoes': [
    {
      title: 'Configurações',
      description:
        'Configure videochamada, horários de atendimento e integrações com Google.',
      relatedArticles: ['configurar-videochamada', 'google-calendar', 'google-meet'],
    },
  ],
}
