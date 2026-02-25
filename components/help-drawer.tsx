'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { contextualTips, helpCategories, pageTourSteps } from '@/lib/help/content'
import { HelpIcon } from '@/lib/help/icons'

interface HelpDrawerProps {
  onReplayTour: (tourId?: string) => void
}

// Map pathname to page tour id
const pathToTourId: Record<string, string> = {
  '/pacientes': 'paciente-detail',
  '/agenda': 'agenda',
  '/sessoes': 'sessoes',
}

// Page tour labels
const tourLabels: Record<string, string> = {
  'paciente-detail': 'Tour do Paciente',
  agenda: 'Tour da Agenda',
  sessoes: 'Tour das Sessões',
}

export function HelpDrawer({ onReplayTour }: HelpDrawerProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  // Determine contextual tips based on pathname
  const pagePath =
    Object.keys(contextualTips).find((p) => pathname.startsWith(p)) || '/dashboard'
  const tips = contextualTips[pagePath] || []

  // Resolve related articles
  const allArticles = helpCategories.flatMap((c) => c.articles)
  const relatedArticleIds = Array.from(new Set(tips.flatMap((t) => t.relatedArticles)))
  const relatedArticles = relatedArticleIds
    .map((id) => allArticles.find((a) => a.id === id))
    .filter(Boolean)

  // Determine current page tour
  const currentPageTourId = Object.entries(pathToTourId).find(([path]) =>
    pathname.startsWith(path)
  )?.[1]
  const hasPageTour = currentPageTourId && pageTourSteps[currentPageTourId]

  const handleReplayDashboardTour = () => {
    setOpen(false)
    if (pathname !== '/dashboard') {
      router.push('/dashboard')
      setTimeout(() => onReplayTour('dashboard'), 500)
    } else {
      onReplayTour('dashboard')
    }
  }

  const handleReplayPageTour = () => {
    if (!currentPageTourId) return
    setOpen(false)
    onReplayTour(currentPageTourId)
  }

  return (
    <>
      {/* Floating "?" button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full shadow-lg transition-all hover:scale-105 flex items-center justify-center"
        style={{ background: 'hsl(221, 83%, 53%)' }}
        title="Ajuda"
      >
        <svg
          className="w-5 h-5 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
          />
        </svg>
      </button>

      {/* Overlay + Drawer */}
      {open && (
        <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute right-0 top-0 bottom-0 w-96 max-w-[90vw] bg-white shadow-xl flex flex-col animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Ajuda</h2>
                <p className="text-xs text-gray-500 mt-0.5">Dicas e guias rápidos</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <HelpIcon name="x" className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Tour replay buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleReplayDashboardTour}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <HelpIcon name="play" className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <span className="block">Tour do Início</span>
                    <span className="text-xs text-blue-500 font-normal">
                      Rever o tour guiado principal
                    </span>
                  </div>
                </button>

                {hasPageTour && (
                  <button
                    onClick={handleReplayPageTour}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-violet-50 border border-violet-200 text-sm font-medium text-violet-700 hover:bg-violet-100 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                      <HelpIcon name="play" className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="text-left">
                      <span className="block">{tourLabels[currentPageTourId!] || 'Tour desta Página'}</span>
                      <span className="text-xs text-violet-500 font-normal">
                        Rever o tour desta página
                      </span>
                    </div>
                  </button>
                )}
              </div>

              {/* Contextual tips */}
              {tips.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Dicas desta página
                  </h3>
                  <div className="space-y-2">
                    {tips.map((tip, i) => (
                      <div
                        key={i}
                        className="bg-gray-50 rounded-xl p-4 border border-gray-100"
                      >
                        <h4 className="text-sm font-medium text-gray-900">
                          {tip.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          {tip.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related articles */}
              {relatedArticles.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Guias Relacionados
                  </h3>
                  <div className="space-y-1">
                    {relatedArticles.map((article) => (
                      <Link
                        key={article!.id}
                        href={`/ajuda?article=${article!.id}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-gray-200 transition-colors">
                          <HelpIcon
                            name={article!.icon}
                            className="w-3.5 h-3.5 text-gray-500"
                          />
                        </div>
                        <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                          {article!.title}
                        </span>
                        <HelpIcon
                          name="arrow-right"
                          className="w-3 h-3 text-gray-300 ml-auto group-hover:text-gray-500 transition-colors"
                        />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick links to categories */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Categorias
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {helpCategories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/ajuda#${cat.id}`}
                      onClick={() => setOpen(false)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 hover:border-gray-200 transition-all text-center"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${cat.color}-50`}
                      >
                        <HelpIcon
                          name={cat.icon}
                          className={`w-4 h-4 text-${cat.color}-600`}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700">
                        {cat.title}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 shrink-0">
              <Link
                href="/ajuda"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ color: 'hsl(221, 83%, 53%)' }}
              >
                Ver Central de Ajuda Completa
                <HelpIcon name="arrow-right" className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
