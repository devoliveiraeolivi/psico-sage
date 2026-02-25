'use client'

import { useState } from 'react'
import type { SessaoResumo } from '@/lib/types'

interface ProntuarioViewProps {
  dados: SessaoResumo
}

const statusColors: Record<string, string> = {
  concluida: '#059669',
  parcial: '#d97706',
  nao_realizada: '#dc2626',
  em_andamento: '#b45309',
}
const statusLabels: Record<string, string> = {
  concluida: 'Concluída',
  parcial: 'Parcial',
  nao_realizada: 'Não realizada',
  em_andamento: 'Em andamento',
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '.03em',
        padding: '2px 8px',
        borderRadius: 4,
        background: color + '18',
        color,
        border: `1px solid ${color}40`,
        lineHeight: '18px',
      }}
    >
      {children}
    </span>
  )
}


function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <span
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={{ position: 'relative', display: 'inline' }}
    >
      {children}
      {show && (
        <span
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 6,
            background: '#1e293b',
            color: '#f1f5f9',
            fontSize: 12,
            lineHeight: '18px',
            padding: '6px 10px',
            borderRadius: 6,
            whiteSpace: 'normal',
            width: 260,
            maxWidth: '80vw',
            fontFamily: "'DM Sans', sans-serif",
            fontStyle: 'italic',
            fontWeight: 400,
            boxShadow: '0 4px 12px rgba(0,0,0,.15)',
            zIndex: 50,
            pointerEvents: 'none',
            textAlign: 'left',
          }}
        >
          {text}
          <span
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              border: '5px solid transparent',
              borderTopColor: '#1e293b',
            }}
          />
        </span>
      )}
    </span>
  )
}

function MentalTable({ data }: { data: { label: string; value: string | null | undefined; risk?: boolean }[] }) {
  const rows = data.filter(r => r.value)
  if (rows.length === 0) return null
  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      {rows.map((row, i) => (
        <div
          key={row.label}
          style={{
            display: 'flex',
            background: i % 2 === 0 ? '#f8fafc' : '#fff',
            borderBottom: i < rows.length - 1 ? '1px solid #e2e8f0' : 'none',
            borderLeft: row.risk ? '3px solid #f43f5e' : '3px solid transparent',
          }}
        >
          <div
            style={{
              width: 170,
              flexShrink: 0,
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: 500,
              color: '#64748b',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {row.label}
          </div>
          <div
            style={{
              flex: 1,
              padding: '10px 14px',
              fontSize: 14,
              color: row.risk ? '#be123c' : '#1e293b',
              fontWeight: row.risk ? 500 : 400,
            }}
          >
            {row.value}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ProntuarioView({ dados }: ProntuarioViewProps) {
  // Normalize data to handle both old schema (resumo_sessao) and new schema (resumo)
  const raw = dados as any
  const d: SessaoResumo = {
    resumo: raw.resumo?.sintese ? raw.resumo : raw.resumo_sessao || { sintese: '', pontos_principais: [] },
    pontos_atencao: raw.pontos_atencao || raw.alertas || { urgentes: [], monitorar: [], acompanhar_proximas: [] },
    estrategia_plano: raw.estrategia_plano || raw.plano_metas || { tarefas_novas: [], metas_acordadas: null, foco_proxima_sessao: null },
    evolucao_cfp: raw.evolucao_cfp || raw.evolucao_crp || '',
    queixas_sintomas: raw.queixas_sintomas || raw.queixa_sintomatologia || { queixa_sessao: null, sintomas_relatados: [], intensidade: null, frequencia: null, fatores_agravantes: [], fatores_alivio: [] },
    estado_mental: raw.estado_mental || raw.estado_mental_sessao || { humor: null, afeto: null, pensamento_curso: null, pensamento_conteudo: null, insight: null, juizo_critica: null, risco_suicida: 'não avaliado', risco_heteroagressivo: 'não avaliado', outras_observacoes: null },
    mudancas_padroes: raw.mudancas_padroes || { mudancas_positivas: [], padroes_identificados: [], crencas_centrais: [], defesas_predominantes: [], recursos_paciente: [], persistencias: [] },
    progresso_tarefas: raw.progresso_tarefas || raw.plano_metas?.progresso_relatado || [],
    pessoas_centrais: raw.pessoas_centrais || [],
    pessoas_secundarias: raw.pessoas_secundarias || [],
    farmacologia: raw.farmacologia || raw.medicacao_sessao || { medicacoes: null, adesao: null, efeitos_relatados: null, mudancas: null, encaminhamento_psiquiatrico: null },
    intervencoes: raw.intervencoes || { tecnicas_utilizadas: [], temas_trabalhados: [], observacoes_processo: null },
    anamnese: raw.anamnese || { infancia: null, adolescencia: null, vida_adulta: null, familia_origem: null, relacionamentos: null, marcos_vida: null, historico_tratamentos: null },
  }

  // Ensure arrays are always arrays (old data may have missing fields)
  d.resumo.pontos_principais = d.resumo.pontos_principais || []
  d.pontos_atencao.urgentes = d.pontos_atencao.urgentes || []
  d.pontos_atencao.monitorar = d.pontos_atencao.monitorar || (raw.alertas?.atencao) || []
  d.pontos_atencao.acompanhar_proximas = d.pontos_atencao.acompanhar_proximas || (raw.alertas?.acompanhar) || []
  d.estrategia_plano.tarefas_novas = d.estrategia_plano.tarefas_novas || []
  d.queixas_sintomas.sintomas_relatados = d.queixas_sintomas.sintomas_relatados || []
  d.queixas_sintomas.fatores_agravantes = d.queixas_sintomas.fatores_agravantes || (raw.queixa_sintomatologia?.gatilhos) || []
  d.queixas_sintomas.fatores_alivio = d.queixas_sintomas.fatores_alivio || (raw.queixa_sintomatologia?.estrategias_que_ajudaram) || []
  d.mudancas_padroes.mudancas_positivas = d.mudancas_padroes.mudancas_positivas || []
  d.mudancas_padroes.padroes_identificados = d.mudancas_padroes.padroes_identificados || []
  d.mudancas_padroes.crencas_centrais = d.mudancas_padroes.crencas_centrais || []
  d.mudancas_padroes.defesas_predominantes = d.mudancas_padroes.defesas_predominantes || []
  d.mudancas_padroes.recursos_paciente = d.mudancas_padroes.recursos_paciente || []
  d.mudancas_padroes.persistencias = d.mudancas_padroes.persistencias || []
  d.progresso_tarefas = d.progresso_tarefas || []
  d.pessoas_centrais = d.pessoas_centrais || []
  d.pessoas_secundarias = d.pessoas_secundarias || []
  d.intervencoes.tecnicas_utilizadas = d.intervencoes.tecnicas_utilizadas || []
  d.intervencoes.temas_trabalhados = d.intervencoes.temas_trabalhados || []

  // Normalize temas: old format (string[]) → new format ({tema, evidencia}[])
  const temasNormalizados = d.intervencoes.temas_trabalhados.map((t: any) =>
    typeof t === 'string' ? { tema: t, evidencia: '' } : { tema: t.tema || '', evidencia: t.evidencia || '' }
  )

  // Migrate old pessoas_mencionadas to pessoas_centrais if present
  if (d.pessoas_centrais.length === 0 && raw.pessoas_mencionadas?.length > 0) {
    d.pessoas_centrais = raw.pessoas_mencionadas.map((p: any) => ({
      nome_usado: p.nome || p.nome_usado || '',
      categoria: p.categoria || 'outros',
      tipo: p.tipo || 'outro',
      mencao: p.nota || p.mencao || '',
    }))
  }

  return (
    <div
      style={{
        padding: '24px 16px',
        fontFamily: "'Source Serif 4', 'Georgia', serif",
        color: '#2c2825',
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&family=DM+Sans:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* Urgentes */}
      {d.pontos_atencao.urgentes.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #fef2f2, #fff1f2)',
            border: '1px solid #fecaca',
            borderLeft: '4px solid #ef4444',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#991b1b',
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: '.04em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            &#9888; Atenção
          </div>
          {d.pontos_atencao.urgentes.map((u, i) => (
            <div key={i} style={{ fontSize: 13.5, lineHeight: '21px', color: '#7f1d1d' }}>
              {u}
            </div>
          ))}
        </div>
      )}

      {/* Temas trabalhados */}
      {temasNormalizados.length > 0 && (
        <div
          style={{
            fontSize: 13,
            lineHeight: '22px',
            color: '#64748b',
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '.05em', textTransform: 'uppercase', marginRight: 8 }}>
            Temas
          </span>
          {temasNormalizados.map((t, i) => (
            <span key={i}>
              {t.evidencia ? (
                <Tooltip text={t.evidencia}>
                  <span
                    style={{
                      color: '#475569',
                      cursor: 'help',
                      borderBottom: '1px dotted #a5b4fc',
                      paddingBottom: 1,
                    }}
                  >
                    {t.tema}
                  </span>
                </Tooltip>
              ) : (
                <span style={{ color: '#475569' }}>{t.tema}</span>
              )}
              {i < temasNormalizados.length - 1 && (
                <span style={{ color: '#c7d2fe', margin: '0 8px' }}>·</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Pontos principais */}
      {d.resumo.pontos_principais.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #eff6ff, #f0f4ff)',
            border: '1px solid #bfdbfe',
            borderLeft: '4px solid #6366f1',
            borderRadius: 8,
            padding: '14px 16px',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#4338ca',
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: '.04em',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            Pontos principais
          </div>
          {d.resumo.pontos_principais.map((p, i) => (
            <div
              key={i}
              style={{ display: 'flex', gap: 8, fontSize: 13.5, lineHeight: '22px', color: '#1e1b4b', padding: '3px 0' }}
            >
              <span style={{ color: '#818cf8', flexShrink: 0, fontSize: 12, fontWeight: 600, paddingTop: 2 }}>{i + 1}.</span>
              <span>{p}</span>
            </div>
          ))}
        </div>
      )}

      {/* Queixa da sessão */}
      {d.queixas_sintomas.queixa_sessao && (
        <div
          style={{
            background: 'linear-gradient(135deg, #fdf2f8, #fce7f3)',
            border: '1px solid #fbcfe8',
            borderLeft: '4px solid #ec4899',
            borderRadius: 8,
            padding: '14px 16px',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#9d174d',
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: '.04em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Queixas e Sintomas
          </div>
          <div style={{ fontSize: 14, lineHeight: '23px', color: '#831843' }}>
            {d.queixas_sintomas.queixa_sessao}
          </div>
          {d.queixas_sintomas.sintomas_relatados.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {d.queixas_sintomas.sintomas_relatados.map((s, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 12,
                    color: '#9d174d',
                    background: '#fce7f380',
                    border: '1px solid #fbcfe8',
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Avanços & Persistências */}
      {(d.mudancas_padroes.mudancas_positivas.length > 0 || d.mudancas_padroes.persistencias.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: d.mudancas_padroes.mudancas_positivas.length > 0 && d.mudancas_padroes.persistencias.length > 0 ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 12, marginTop: 12 }}>
          {d.mudancas_padroes.mudancas_positivas.length > 0 && (
            <div
              style={{
                background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                border: '1px solid #a7f3d0',
                borderLeft: '4px solid #10b981',
                borderRadius: 8,
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#047857',
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: '.04em',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                Avanços
              </div>
              {d.mudancas_padroes.mudancas_positivas.map((m, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', gap: 8, fontSize: 13.5, lineHeight: '21px', color: '#064e3b', padding: '2px 0' }}
                >
                  <span style={{ color: '#34d399', flexShrink: 0 }}>&#8593;</span>
                  <span>{m}</span>
                </div>
              ))}
            </div>
          )}
          {d.mudancas_padroes.persistencias.length > 0 && (
            <div
              style={{
                background: 'linear-gradient(135deg, #fefce8, #fef9c3)',
                border: '1px solid #fde68a',
                borderLeft: '4px solid #eab308',
                borderRadius: 8,
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#854d0e',
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: '.04em',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                Persistências
              </div>
              {d.mudancas_padroes.persistencias.map((p, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', gap: 8, fontSize: 13.5, lineHeight: '21px', color: '#713f12', padding: '2px 0' }}
                >
                  <span style={{ color: '#fbbf24', flexShrink: 0 }}>&#8594;</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Agravantes & Alívios */}
      {(d.queixas_sintomas.fatores_agravantes.length > 0 || d.queixas_sintomas.fatores_alivio.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: d.queixas_sintomas.fatores_agravantes.length > 0 && d.queixas_sintomas.fatores_alivio.length > 0 ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 12 }}>
          {d.queixas_sintomas.fatores_agravantes.length > 0 && (
            <div
              style={{
                background: 'linear-gradient(135deg, #fff1f2, #ffe4e6)',
                border: '1px solid #fecdd3',
                borderLeft: '4px solid #f43f5e',
                borderRadius: 8,
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#9f1239',
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: '.04em',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                Agravantes
              </div>
              {d.queixas_sintomas.fatores_agravantes.map((f, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', gap: 8, fontSize: 13.5, lineHeight: '21px', color: '#881337', padding: '2px 0' }}
                >
                  <span style={{ color: '#fb7185', flexShrink: 0 }}>&#9660;</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}
          {d.queixas_sintomas.fatores_alivio.length > 0 && (
            <div
              style={{
                background: 'linear-gradient(135deg, #f0fdfa, #ccfbf1)',
                border: '1px solid #99f6e4',
                borderLeft: '4px solid #14b8a6',
                borderRadius: 8,
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#0f766e',
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: '.04em',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                Alívios
              </div>
              {d.queixas_sintomas.fatores_alivio.map((f, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', gap: 8, fontSize: 13.5, lineHeight: '21px', color: '#134e4a', padding: '2px 0' }}
                >
                  <span style={{ color: '#2dd4bf', flexShrink: 0 }}>&#9650;</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Padrões & Recursos */}
      {(d.mudancas_padroes.padroes_identificados.length > 0 || d.mudancas_padroes.crencas_centrais.length > 0 || d.mudancas_padroes.recursos_paciente.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: (d.mudancas_padroes.padroes_identificados.length > 0 || d.mudancas_padroes.crencas_centrais.length > 0) && d.mudancas_padroes.recursos_paciente.length > 0 ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 12 }}>
          {(d.mudancas_padroes.padroes_identificados.length > 0 || d.mudancas_padroes.crencas_centrais.length > 0) && (
            <div
              style={{
                background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
                border: '1px solid #c7d2fe',
                borderLeft: '4px solid #6366f1',
                borderRadius: 8,
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#4338ca',
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: '.04em',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                Padrões
              </div>
              {d.mudancas_padroes.padroes_identificados.map((p, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', gap: 8, fontSize: 13.5, lineHeight: '21px', color: '#312e81', padding: '2px 0' }}
                >
                  <span style={{ color: '#818cf8', flexShrink: 0 }}>&#8635;</span>
                  <span>{p}</span>
                </div>
              ))}
              {d.mudancas_padroes.crencas_centrais.length > 0 && (
                <div style={{ marginTop: d.mudancas_padroes.padroes_identificados.length > 0 ? 10 : 0 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#6366f1',
                      fontFamily: "'DM Sans', sans-serif",
                      letterSpacing: '.03em',
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}
                  >
                    Crenças centrais
                  </div>
                  {d.mudancas_padroes.crencas_centrais.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 13,
                        lineHeight: '20px',
                        color: '#4338ca',
                        padding: '3px 10px',
                        fontStyle: 'italic',
                        borderLeft: '2px solid #a5b4fc',
                        marginBottom: 4,
                        background: '#e0e7ff80',
                        borderRadius: '0 4px 4px 0',
                      }}
                    >
                      &ldquo;{c}&rdquo;
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {d.mudancas_padroes.recursos_paciente.length > 0 && (
            <div
              style={{
                background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                border: '1px solid #a7f3d0',
                borderLeft: '4px solid #059669',
                borderRadius: 8,
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#047857',
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: '.04em',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                Recursos
              </div>
              {d.mudancas_padroes.recursos_paciente.map((r, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', gap: 8, fontSize: 13.5, lineHeight: '21px', color: '#064e3b', padding: '2px 0' }}
                >
                  <span style={{ color: '#34d399', flexShrink: 0 }}>&#9733;</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Plano — dois boxes lado a lado */}
      {(d.estrategia_plano.tarefas_novas.length > 0 || d.pontos_atencao.monitorar.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {/* Tarefas acordadas */}
          {d.estrategia_plano.tarefas_novas.length > 0 && (
            <div
              style={{
                background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
                border: '1px solid #fde68a',
                borderLeft: '4px solid #d97706',
                borderRadius: 8,
                padding: '14px 16px',
                gridColumn: d.pontos_atencao.monitorar.length === 0 ? '1 / -1' : undefined,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#92400e',
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: '.04em',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                Tarefas acordadas
              </div>
              {d.estrategia_plano.tarefas_novas.map((t, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 8,
                    fontSize: 13.5,
                    lineHeight: '21px',
                    color: '#78350f',
                    padding: '2px 0',
                  }}
                >
                  <span style={{ color: '#d97706', flexShrink: 0 }}>&#9675;</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          )}

          {/* Monitorar */}
          {d.pontos_atencao.monitorar.length > 0 && (
            <div
              style={{
                background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
                border: '1px solid #fde68a',
                borderLeft: '4px solid #d97706',
                borderRadius: 8,
                padding: '14px 16px',
                gridColumn: d.estrategia_plano.tarefas_novas.length === 0 ? '1 / -1' : undefined,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#92400e',
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: '.04em',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                Monitorar
              </div>
              {d.pontos_atencao.monitorar.map((m, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', gap: 8, fontSize: 13, lineHeight: '20px', color: '#78350f', padding: '2px 0' }}
                >
                  <span style={{ color: '#d97706', flexShrink: 0 }}>·</span>
                  <span>{m}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Intervenções + Progresso de tarefas */}
      {(d.intervencoes.tecnicas_utilizadas.length > 0 || d.progresso_tarefas.length > 0) && (
        <div
          style={{
            background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
            border: '1px solid #fde68a',
            borderLeft: '4px solid #f59e0b',
            borderRadius: 8,
            padding: '14px 16px',
            marginBottom: 12,
          }}
        >
          {d.intervencoes.tecnicas_utilizadas.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#92400e',
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: '.04em',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                Intervenções
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {d.intervencoes.tecnicas_utilizadas.map((t, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 13,
                      color: '#92400e',
                      background: '#fef9c3',
                      border: '1px solid #fde68a',
                      padding: '4px 10px',
                      borderRadius: 5,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              {d.intervencoes.observacoes_processo && (
                <div style={{ fontSize: 13.5, lineHeight: '21px', color: '#78350f', marginTop: 10 }}>
                  {d.intervencoes.observacoes_processo}
                </div>
              )}
            </>
          )}
          {d.progresso_tarefas.length > 0 && (
            <div style={{ marginTop: d.intervencoes.tecnicas_utilizadas.length > 0 ? 14 : 0, paddingTop: d.intervencoes.tecnicas_utilizadas.length > 0 ? 12 : 0, borderTop: d.intervencoes.tecnicas_utilizadas.length > 0 ? '1px solid #fde68a' : 'none' }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#92400e',
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: '.04em',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                Progresso de tarefas
              </div>
              {d.progresso_tarefas.map((t, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, lineHeight: '21px', padding: '3px 0' }}
                >
                  <Badge color={statusColors[t.status] || '#6b6560'}>{statusLabels[t.status] || t.status}</Badge>
                  <div>
                    <span style={{ fontWeight: 600, color: '#78350f' }}>{t.meta}</span>
                    <span style={{ color: '#92400e' }}> — {t.observacao}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Próxima sessão — destaque */}
      {d.estrategia_plano.foco_proxima_sessao && (
        <div
          style={{
            background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
            border: '1px solid #6ee7b7',
            borderLeft: '4px solid #059669',
            borderRadius: 8,
            padding: '14px 16px',
            marginBottom: 24,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <span
            style={{
              fontSize: 16,
              color: '#059669',
              flexShrink: 0,
              lineHeight: '22px',
            }}
          >
            &#10148;
          </span>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#047857',
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: '.04em',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              Foco da próxima sessão
            </div>
            <div style={{ fontSize: 14, lineHeight: '22px', color: '#064e3b', fontWeight: 500 }}>
              {d.estrategia_plano.foco_proxima_sessao}
            </div>
          </div>
        </div>
      )}

      {/* === Seções abertas === */}

      {/* Pessoas */}
      {(d.pessoas_centrais.length > 0 || d.pessoas_secundarias.length > 0) && (
        <div style={{ borderTop: '1px solid #eae7e3', paddingTop: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#8b5cf6', opacity: 0.7, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#2c2825', letterSpacing: '.01em' }}>Pessoas</span>
            <span style={{ marginLeft: 'auto' }}><Badge color="#7c3aed">{d.pessoas_centrais.length + d.pessoas_secundarias.length}</Badge></span>
          </div>
          <div style={{ paddingLeft: 10, borderLeft: '2px solid #8b5cf630', marginLeft: 3 }}>
            {d.pessoas_centrais.map((p, i) => (
              <div
                key={`c${i}`}
                style={{
                  padding: '8px 0',
                  borderBottom: i < d.pessoas_centrais.length - 1 ? '1px solid #f0eeeb' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#2c2825' }}>{p.nome_usado}</span>
                  <span
                    style={{
                      fontSize: 11,
                      color: '#7c3aed',
                      fontFamily: "'DM Sans', sans-serif",
                      background: '#f5f3ff',
                      padding: '1px 6px',
                      borderRadius: 3,
                    }}
                  >
                    {p.tipo}
                  </span>
                </div>
                <div style={{ fontSize: 14, lineHeight: '21px', color: '#5c5855' }}>{p.mencao}</div>
              </div>
            ))}
            {d.pessoas_secundarias.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e8e5e0' }}>
                <div
                  style={{
                    fontSize: 11,
                    color: '#a8a4a0',
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 500,
                    letterSpacing: '.04em',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  Mencionadas
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {d.pessoas_secundarias.map((p, i) => (
                    <span
                      key={i}
                      title={p.mencao}
                      style={{
                        fontSize: 12.5,
                        color: '#6b6560',
                        background: '#f0eeeb',
                        padding: '4px 10px',
                        borderRadius: 5,
                        cursor: 'default',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {p.nome_usado} <span style={{ color: '#a8a4a0' }}>· {p.tipo}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Estado mental */}
      <div style={{ borderTop: '1px solid #eae7e3', paddingTop: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#0ea5e9', opacity: 0.7, flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#2c2825', letterSpacing: '.01em' }}>Estado mental</span>
        </div>
        <div style={{ paddingLeft: 10, borderLeft: '2px solid #0ea5e930', marginLeft: 3 }}>
          <MentalTable data={[
            { label: 'Humor', value: d.estado_mental.humor },
            { label: 'Afeto', value: d.estado_mental.afeto },
            { label: 'Pensamento (curso)', value: d.estado_mental.pensamento_curso },
            { label: 'Pensamento (conteúdo)', value: d.estado_mental.pensamento_conteudo },
            { label: 'Insight', value: d.estado_mental.insight },
            { label: 'Juízo e crítica', value: d.estado_mental.juizo_critica },
            { label: 'Risco suicida', value: d.estado_mental.risco_suicida, risk: d.estado_mental.risco_suicida !== 'ausente' && d.estado_mental.risco_suicida !== 'não avaliado' },
            { label: 'Risco heteroagressivo', value: d.estado_mental.risco_heteroagressivo, risk: d.estado_mental.risco_heteroagressivo !== 'ausente' && d.estado_mental.risco_heteroagressivo !== 'não avaliado' },
            { label: 'Observações', value: d.estado_mental.outras_observacoes },
          ]} />
        </div>
      </div>

      {/* Evolução CFP */}
      {d.evolucao_cfp && (
        <div style={{ borderTop: '1px solid #eae7e3', paddingTop: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#14b8a6', opacity: 0.7, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#2c2825', letterSpacing: '.01em' }}>Evolução CFP</span>
            <button
              onClick={() => navigator.clipboard?.writeText(d.evolucao_cfp)}
              style={{
                marginLeft: 'auto',
                background: '#f0fdfa',
                border: '1px solid #99f6e4',
                borderRadius: 4,
                padding: '3px 8px',
                fontSize: 11,
                color: '#0f766e',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
              }}
            >
              Copiar
            </button>
          </div>
          <div style={{ paddingLeft: 10, borderLeft: '2px solid #14b8a630', marginLeft: 3 }}>
            {d.evolucao_cfp.split(/(?<=\.)\s+/).filter(Boolean).map((sentence, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 8,
                  padding: '4px 0',
                  fontSize: 13.5,
                  lineHeight: '23px',
                  color: '#2c2825',
                }}
              >
                <span style={{ color: '#5eead4', flexShrink: 0, fontSize: 11, paddingTop: 3, fontFamily: "'DM Sans', sans-serif" }}>
                  {i + 1}.
                </span>
                <span>{sentence.trim()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
