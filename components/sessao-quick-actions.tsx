'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SessaoQuickActionsProps {
  sessaoId: string
  status: string
  dataHora: string
  duracaoPrevista: number
  pacienteId: string
  pacienteNome: string
  variant: 'inline' | 'header'
}

export function SessaoQuickActions({
  sessaoId,
  status,
  dataHora,
  duracaoPrevista,
  pacienteId,
  pacienteNome,
  variant,
}: SessaoQuickActionsProps) {
  const router = useRouter()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [loading, setLoading] = useState(false)

  // Edit form state
  const [editDataHora, setEditDataHora] = useState(formatForInput(new Date(dataHora)))
  const [editDuracao, setEditDuracao] = useState(duracaoPrevista)

  // Só mostra para sessões agendadas
  if (status !== 'agendada') return null

  async function handleEdit() {
    setLoading(true)
    try {
      const res = await fetch(`/api/sessoes/${sessaoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_hora: new Date(editDataHora).toISOString(),
          duracao_prevista: editDuracao,
        }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar')
      setShowEditModal(false)
      window.location.reload()
    } catch {
      alert('Erro ao atualizar sessão')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    setLoading(true)
    try {
      const res = await fetch(`/api/sessoes/${sessaoId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao cancelar')
      setShowCancelConfirm(false)
      window.location.reload()
    } catch {
      alert('Erro ao cancelar sessão')
    } finally {
      setLoading(false)
    }
  }

  async function handleReschedule() {
    setLoading(true)
    try {
      // Marcar sessão atual como remarcada
      await fetch(`/api/sessoes/${sessaoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'remarcada' }),
      })
      // Redirecionar para criar nova sessão com mesmo paciente
      router.push(`/agenda/nova?paciente=${pacienteId}`)
    } catch {
      alert('Erro ao remarcar sessão')
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'inline') {
    return (
      <>
        <div className="relative">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
            title="Ações"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg border border-gray-200 shadow-lg py-1 w-40">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowMenu(false)
                    setShowEditModal(true)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                  </svg>
                  Editar
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowMenu(false)
                    handleReschedule()
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-purple-700 hover:bg-purple-50 flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                  </svg>
                  Remarcar
                </button>
                <hr className="my-1 border-gray-100" />
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowMenu(false)
                    setShowCancelConfirm(true)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>

        {/* Modals */}
        {showEditModal && <EditModal />}
        {showCancelConfirm && <CancelModal />}
      </>
    )
  }

  // variant === 'header'
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowEditModal(true)}
          className="text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
          </svg>
          Editar
        </button>
        <button
          onClick={handleReschedule}
          disabled={loading}
          className="text-sm px-3 py-2 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          Remarcar
        </button>
        <button
          onClick={() => setShowCancelConfirm(true)}
          className="text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
          Cancelar
        </button>
      </div>

      {showEditModal && <EditModal />}
      {showCancelConfirm && <CancelModal />}
    </>
  )

  function EditModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowEditModal(false)}>
        <div className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Editar Sessão</h3>
          <p className="text-sm text-gray-500 mb-4">{pacienteNome}</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data e Hora</label>
              <input
                type="datetime-local"
                value={editDataHora}
                onChange={(e) => setEditDataHora(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duração (minutos)</label>
              <input
                type="number"
                min={15}
                max={180}
                step={5}
                value={editDuracao}
                onChange={(e) => setEditDuracao(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleEdit}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  function CancelModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCancelConfirm(false)}>
        <div className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Cancelar Sessão</h3>
          <p className="text-sm text-gray-500 mb-4">
            Tem certeza que deseja cancelar a sessão de <strong>{pacienteNome}</strong>?
            A sessão ficará com status &quot;Cancelada&quot;.
          </p>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCancelConfirm(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Voltar
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Cancelando...' : 'Sim, Cancelar'}
            </button>
          </div>
        </div>
      </div>
    )
  }
}

function formatForInput(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}
