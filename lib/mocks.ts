// Dados mockados para desenvolvimento/preview
import type { Paciente, Sessao, SessaoHoje } from '@/lib/types'

export const mockPacientes: Paciente[] = [
  {
    id: '1',
    user_id: 'user-1',
    nome: 'Maria Silva',
    email: 'maria@email.com',
    telefone: '(11) 99999-1111',
    data_nascimento: '1990-05-15',
    data_inicio_terapia: '2024-03-01',
    data_fim_terapia: null,
    status: 'ativo',
    resumo: {
      sintese: 'Paciente com TAG, 8 meses de tratamento. Boa evolução com técnicas de respiração.',
      humor: 'estável, episódios de ansiedade situacional',
      momento: 'fase de consolidação',
      diagnosticos: 'TAG (F41.1), traços depressivos em remissão',
      conflitos: 'autocobrança no trabalho, relação com mãe',
      traumas: 'bullying - resolvido; luto avó - em processo',
      padroes: 'evitação, catastrofização em redução',
      gatilhos: 'cobranças no trabalho, conflitos familiares',
      recursos: 'corrida, journaling, esposo como suporte',
      alertas: 'nenhum no momento',
      tarefas: 'manter diário de pensamentos, técnica de respiração 4-7-8',
    },
    historico: {
      humor: [
        { data: '2024-10-22', sessao_id: 's1', valor: 'estável' },
        { data: '2024-10-15', sessao_id: 's2', valor: 'ansioso' },
      ],
      insights: [
        { data: '2024-10-22', sessao_id: 's1', valor: 'percebeu padrão de evitação em reuniões' },
      ],
      marcos: [
        { data: '2024-10-15', sessao_id: 's2', valor: 'primeiro limite estabelecido com chefe' },
      ],
    },
    notas: null,
    deleted_at: null,
    created_at: '2024-03-01T10:00:00Z',
    updated_at: '2024-10-22T15:00:00Z',
  },
  {
    id: '2',
    user_id: 'user-1',
    nome: 'João Santos',
    email: 'joao@email.com',
    telefone: '(11) 99999-2222',
    data_nascimento: '1985-08-20',
    data_inicio_terapia: '2024-06-15',
    data_fim_terapia: null,
    status: 'ativo',
    resumo: {
      sintese: 'Paciente em processo de luto pela perda do pai há 6 meses.',
      humor: 'oscilante, melhorando gradualmente',
      momento: 'elaboração do luto',
      diagnosticos: 'Luto não complicado',
      conflitos: 'dificuldade de expressar emoções, pressão familiar',
      recursos: 'música, amigos próximos',
      tarefas: 'escrever carta para o pai',
    },
    historico: {},
    notas: null,
    deleted_at: null,
    created_at: '2024-06-15T10:00:00Z',
    updated_at: '2024-10-20T15:00:00Z',
  },
  {
    id: '3',
    user_id: 'user-1',
    nome: 'Ana Oliveira',
    email: 'ana@email.com',
    telefone: '(11) 99999-3333',
    data_nascimento: '1995-12-10',
    data_inicio_terapia: '2024-01-10',
    data_fim_terapia: null,
    status: 'pausado',
    resumo: {
      sintese: 'Pausou tratamento por viagem de trabalho. Retorno previsto em janeiro.',
      humor: 'estável',
      momento: 'pausa programada',
    },
    historico: {},
    notas: 'Viagem de 3 meses para SP. Retorna em janeiro/2025.',
    deleted_at: null,
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-09-01T15:00:00Z',
  },
]

// Gera data de hoje para as sessões
const hoje = new Date()
const hojeStr = hoje.toISOString().split('T')[0]

export const mockSessoesHoje: SessaoHoje[] = [
  {
    id: 's-hoje-1',
    paciente_id: '1',
    paciente_nome: 'Maria Silva',
    paciente_resumo: mockPacientes[0].resumo,
    user_id: 'user-1',
    data_hora: `${hojeStr}T09:00:00Z`,
    status: 'agendada',
    preparacao: {
      contexto: 'Últimas sessões focaram em técnicas de manejo de ansiedade no trabalho.',
      pontos_retomar: ['Exercício de respiração antes de reuniões', 'Conflito com colega de equipe'],
      tarefas_pendentes: ['Diário de pensamentos automáticos'],
      sugestoes: ['Validar progresso antes de confrontar novas questões', 'Explorar gatilhos específicos das reuniões'],
      perguntas_sugeridas: ['Como foi usar a técnica de respiração na reunião de segunda?', 'Conseguiu manter o diário esta semana?'],
      alertas: [],
    },
  },
  {
    id: 's-hoje-2',
    paciente_id: '2',
    paciente_nome: 'João Santos',
    paciente_resumo: mockPacientes[1].resumo,
    user_id: 'user-1',
    data_hora: `${hojeStr}T10:00:00Z`,
    status: 'agendada',
    preparacao: {
      contexto: 'Paciente em processo de luto. Última sessão trabalhou memórias do pai.',
      pontos_retomar: ['Carta para o pai - conseguiu escrever?', 'Aniversário do pai próximo (dia 15)'],
      tarefas_pendentes: ['Carta para o pai'],
      sugestoes: ['Preparar para data do aniversário', 'Explorar rituais de memória'],
      perguntas_sugeridas: ['Como está se sentindo com a proximidade do aniversário do seu pai?'],
      alertas: ['Aniversário do pai em 5 dias - atenção redobrada'],
    },
  },
  {
    id: 's-hoje-3',
    paciente_id: '1',
    paciente_nome: 'Maria Silva',
    paciente_resumo: mockPacientes[0].resumo,
    user_id: 'user-1',
    data_hora: `${hojeStr}T14:00:00Z`,
    status: 'agendada',
    preparacao: null,
  },
]

export const mockSessoes: Sessao[] = [
  {
    id: 's1',
    paciente_id: '1',
    numero_sessao: 32,
    data_hora: '2024-10-22T09:00:00Z',
    duracao_prevista: 50,
    duracao_real: 55,
    status: 'realizada',
    calendar_event_id: 'cal-123',
    fathom_call_id: 'fathom-456',
    preparacao: {
      contexto: 'Paciente relatou melhora na ansiedade. Foco em manutenção.',
      pontos_retomar: ['Técnica de respiração', 'Limite com chefe'],
      tarefas_pendentes: ['Diário de pensamentos'],
      sugestoes: ['Reforçar ganhos', 'Preparar para possíveis recaídas'],
      perguntas_sugeridas: ['Como foi a semana?'],
      alertas: [],
    },
    resumo: {
      sintese: 'Sessão produtiva focada em consolidar ganhos terapêuticos. Paciente relatou conseguir usar técnica de respiração antes de reunião importante.',
      humor: 'estável',
      temas: ['trabalho', 'técnicas de manejo', 'autoeficácia'],
      insights: ['Percebeu que consegue controlar ansiedade quando se prepara'],
      pontos_importantes: ['Reunião com chefe foi bem', 'Manteve diário por 5 dias'],
      tarefas: ['Continuar diário', 'Praticar respiração diariamente'],
      alertas: [],
    },
    integra: `[Transcrição da sessão de 22/10/2024]

Terapeuta: Bom dia, Maria. Como você está hoje?

Maria: Bom dia! Estou bem, na verdade. Tive uma semana diferente.

Terapeuta: Diferente como?

Maria: Consegui usar aquela técnica de respiração que você me ensinou. Antes da reunião com meu chefe, fiz o 4-7-8 e... funcionou. Não entrei em pânico.

Terapeuta: Que ótimo ouvir isso. Como foi a reunião?

Maria: Foi bem! Consegui apresentar minhas ideias sem travar. Ele até elogiou minha apresentação.

[... transcrição continua ...]`,
    deleted_at: null,
    created_at: '2024-10-22T08:00:00Z',
    updated_at: '2024-10-22T10:00:00Z',
  },
]
