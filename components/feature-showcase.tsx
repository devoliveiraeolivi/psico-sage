'use client'

import { useState } from 'react'
import { FeatureWalkthrough } from './feature-walkthrough'
import type { WalkthroughFeature, FeatureWalkthroughData } from './feature-walkthrough'

interface FeatureShowcaseProps {
  onComplete: () => void
}

interface Feature extends WalkthroughFeature {
  shortDesc: string
}

const features: Feature[] = [
  {
    id: 'recording',
    title: 'Gravação & Transcrição',
    shortDesc: 'Grave sessões e receba transcrição automática',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    ringColor: 'ring-blue-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    ),
    walkthrough: {
      mockupType: 'session-recording',
      steps: [
        {
          highlightId: 'start-session',
          title: 'Escolha o Modo',
          description: 'Ao iniciar a sessão, escolha entre Presencial ou Google Meet. O modo define como o áudio será capturado — cada um funciona de forma diferente.',
        },
        {
          highlightId: 'recording-presencial',
          title: 'Modo Presencial',
          description: 'Usa o microfone do computador para gravar. Você inicia e encerra manualmente — o timer mostra a duração em tempo real.',
        },
        {
          highlightId: 'recording-meet',
          title: 'Modo Google Meet',
          description: 'A gravação inicia automaticamente ao abrir a chamada e encerra ao fechar o Google Meet. O áudio da videochamada é capturado direto do navegador — sem precisar de nenhuma ação manual.',
        },
        {
          highlightId: 'upload-strip',
          title: 'Envio de Áudio Externo',
          description: 'Gravou por fora? Envie o arquivo (MP3, WAV, M4A, WebM) e o processamento é o mesmo. Ideal para sessões gravadas em outro dispositivo.',
        },
        {
          highlightId: 'pipeline-status',
          title: 'Pipeline de Processamento',
          description: 'Independente do modo, o progresso é mostrado em tempo real: Enviando → Transcrevendo → Processando → Concluído. Ao final, o prontuário é gerado automaticamente pela IA.',
        },
      ],
    },
  },
  {
    id: 'ai-prontuario',
    title: 'Prontuário por IA',
    shortDesc: 'A IA gera, você revisa e ajusta com ajuda da IA',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    iconBg: 'bg-violet-100',
    ringColor: 'ring-violet-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    walkthrough: {
      mockupType: 'session-prontuario',
      steps: [
        {
          highlightId: 'pipeline-done',
          title: 'Geração Automática',
          description: 'Após a transcrição, a IA analisa o conteúdo e gera um prontuário clínico estruturado automaticamente. A sessão muda para "Aguardando Aprovação".',
        },
        {
          highlightId: 'prontuario-content',
          title: 'Conteúdo Estruturado',
          description: 'Inclui: síntese da sessão, pontos de atenção, estado mental, evolução CFP e plano terapêutico — tudo no padrão do Conselho Federal de Psicologia.',
        },
        {
          highlightId: 'adjust-section',
          title: 'Ajuste com IA',
          description: 'Errou algo? Descreva a correção em texto livre e a IA reprocessa o prontuário mantendo o restante intacto. Faça quantos ajustes precisar.',
        },
        {
          highlightId: 'approve-button',
          title: 'Revisão e Aprovação',
          description: 'Revise, edite manualmente se quiser e aprove. O perfil clínico do paciente é atualizado automaticamente com os novos dados.',
        },
      ],
    },
  },
  {
    id: 'patient-registration',
    title: 'Cadastro de Pacientes',
    shortDesc: 'Cadastre pacientes individualmente ou em massa',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    iconBg: 'bg-emerald-100',
    ringColor: 'ring-emerald-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
      </svg>
    ),
    walkthrough: {
      mockupType: 'patient-registration',
      steps: [
        {
          highlightId: 'new-patient-btn',
          title: 'Novo Paciente',
          description: 'Acesse Pacientes e clique em "Novo Paciente". Informe nome, e-mail, telefone e dia/horário preferido da sessão.',
        },
        {
          highlightId: 'batch-registration',
          title: 'Cadastro em Massa',
          description: 'Precisa cadastrar vários? Use o "Cadastro em Massa" — preencha a tabela com múltiplos pacientes e salve todos de uma vez.',
        },
        {
          highlightId: 'patient-profile',
          title: 'Perfil do Paciente',
          description: 'Cada paciente tem um perfil completo: dados pessoais, síntese clínica gerada pela IA, histórico evolutivo e configurações de sessão.',
        },
        {
          highlightId: 'video-link',
          title: 'Link de Videochamada',
          description: 'Configure o link de videochamada direto no perfil do paciente. Pode ser gerado automaticamente pelo Google Meet ou inserido manualmente.',
        },
      ],
    },
  },
  {
    id: 'agenda',
    title: 'Agenda & Agendamento',
    shortDesc: 'Calendário visual e agendamento com Google Calendar',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    ringColor: 'ring-amber-400',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    walkthrough: {
      mockupType: 'calendar',
      steps: [
        {
          highlightId: 'nova-sessao-btn',
          title: 'Agendar Sessão',
          description: 'Clique em "Nova Sessão" para agendar. Escolha paciente, data e horário — o link de videochamada é gerado automaticamente se configurado.',
        },
        {
          highlightId: 'calendar-views',
          title: 'Visualização',
          description: 'Visualize suas sessões em visão semanal ou mensal com cores por status. Alterne com um clique para a perspectiva que preferir.',
        },
        {
          highlightId: 'google-sync',
          title: 'Google Calendar',
          description: 'A integração é unidirecional: sessões criadas aqui aparecem no seu Google Calendar, mas eventos externos não são importados — mantendo sua agenda clínica limpa e organizada.',
        },
        {
          highlightId: 'working-hours',
          title: 'Horário de Atendimento',
          description: 'O calendário respeita seu horário de atendimento configurado. Apenas os horários definidos são exibidos na grade.',
        },
      ],
    },
  },
]

export function FeatureShowcase({ onComplete }: FeatureShowcaseProps) {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null)

  const detail = features.find((f) => f.id === selectedFeature)

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-8 pt-8 pb-2">
          <h2 className="text-xl font-bold text-gray-900">Conheça as Ferramentas</h2>
          <p className="text-sm text-gray-500 mt-1">
            Explore os principais recursos do PsicoApp
          </p>
        </div>

        {/* Feature grid */}
        <div className="px-8 py-6 grid grid-cols-2 gap-4">
          {features.map((feature) => (
            <button
              key={feature.id}
              onClick={() => setSelectedFeature(feature.id)}
              className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all hover:shadow-sm ${feature.bgColor} border-transparent hover:border-gray-200`}
            >
              <div className={`w-11 h-11 rounded-xl ${feature.iconBg} flex items-center justify-center shrink-0 ${feature.color}`}>
                {feature.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{feature.shortDesc}</p>
                <span className={`inline-flex items-center gap-1 mt-2 text-xs font-medium ${feature.color}`}>
                  Saiba mais
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex justify-end">
          <button
            onClick={onComplete}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'hsl(221, 83%, 53%)' }}
          >
            Começar a usar
          </button>
        </div>
      </div>

      {/* Interactive Walkthrough */}
      {detail && (
        <FeatureWalkthrough
          feature={detail}
          onClose={() => setSelectedFeature(null)}
        />
      )}
    </div>
  )
}
