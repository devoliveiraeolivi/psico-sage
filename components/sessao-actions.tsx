'use client'

import { useState } from 'react'
import type { SessaoResumo } from '@/lib/types'

interface SessaoActionsProps {
  sessaoId: string
  status: string
  resumo: SessaoResumo | null
  onApprove?: () => void
  onEdit?: (resumo: SessaoResumo) => void
}

export function SessaoActionsBar({
  sessaoId,
  status,
  resumo,
  onApprove,
  onEdit,
}: SessaoActionsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [editedResumo, setEditedResumo] = useState<SessaoResumo>(resumo || {})

  if (status !== 'aguardando_aprovacao') {
    return null
  }

  const handleApprove = async () => {
    setIsApproving(true)
    // TODO: Chamar API para aprovar
    // await fetch(`/api/sessoes/${sessaoId}/approve`, { method: 'POST' })
    console.log('Aprovando sessão:', sessaoId)
    setTimeout(() => {
      setIsApproving(false)
      onApprove?.()
    }, 1000)
  }

  const handleSaveEdit = async () => {
    // TODO: Chamar API para salvar edição
    console.log('Salvando edição:', editedResumo)
    onEdit?.(editedResumo)
    setIsEditing(false)
  }

  return (
    <>
      {/* Action Bar */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800">Resumo gerado pela IA</p>
            <p className="text-xs text-amber-600">Revise e aprove ou edite antes de salvar</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
              Editar
            </span>
          </button>
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              {isApproving ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {isApproving ? 'Aprovando...' : 'Aprovar'}
            </span>
          </button>
        </div>
      </div>

      {/* Modal de Edição */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Editar Resumo da Sessão</h2>
              <button
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Síntese */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Síntese
                </label>
                <textarea
                  value={editedResumo.sintese || ''}
                  onChange={(e) => setEditedResumo({ ...editedResumo, sintese: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  placeholder="Síntese da sessão..."
                />
              </div>

              {/* Humor */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Humor
                </label>
                <input
                  type="text"
                  value={editedResumo.humor || ''}
                  onChange={(e) => setEditedResumo({ ...editedResumo, humor: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Ex: ansioso, estável, melhorando..."
                />
              </div>

              {/* Temas */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Temas Abordados
                </label>
                <input
                  type="text"
                  value={editedResumo.temas?.join(', ') || ''}
                  onChange={(e) => setEditedResumo({ ...editedResumo, temas: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="trabalho, família, ansiedade (separados por vírgula)"
                />
              </div>

              {/* Insights */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Insights
                </label>
                <textarea
                  value={editedResumo.insights?.join('\n') || ''}
                  onChange={(e) => setEditedResumo({ ...editedResumo, insights: e.target.value.split('\n').filter(Boolean) })}
                  rows={3}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  placeholder="Um insight por linha..."
                />
              </div>

              {/* Pontos Importantes */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Pontos Importantes
                </label>
                <textarea
                  value={editedResumo.pontos_importantes?.join('\n') || ''}
                  onChange={(e) => setEditedResumo({ ...editedResumo, pontos_importantes: e.target.value.split('\n').filter(Boolean) })}
                  rows={3}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  placeholder="Um ponto por linha..."
                />
              </div>

              {/* Tarefas */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Tarefas para Próxima Sessão
                </label>
                <textarea
                  value={editedResumo.tarefas?.join('\n') || ''}
                  onChange={(e) => setEditedResumo({ ...editedResumo, tarefas: e.target.value.split('\n').filter(Boolean) })}
                  rows={2}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  placeholder="Uma tarefa por linha..."
                />
              </div>

              {/* Alertas */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Alertas
                </label>
                <textarea
                  value={editedResumo.alertas?.join('\n') || ''}
                  onChange={(e) => setEditedResumo({ ...editedResumo, alertas: e.target.value.split('\n').filter(Boolean) })}
                  rows={2}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  placeholder="Um alerta por linha (opcional)..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
