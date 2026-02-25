'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { helpCategories } from '@/lib/help/content'
import { HelpIcon } from '@/lib/help/icons'
import { useAppHelp } from '@/components/app-providers'

const colorMap: Record<string, { bg: string; iconBg: string; iconText: string; badge: string; border: string; stepBg: string; stepText: string }> = {
  blue: {
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
    border: 'border-blue-200',
    stepBg: 'bg-blue-50',
    stepText: 'text-blue-700',
  },
  violet: {
    bg: 'bg-violet-50',
    iconBg: 'bg-violet-100',
    iconText: 'text-violet-600',
    badge: 'bg-violet-100 text-violet-700',
    border: 'border-violet-200',
    stepBg: 'bg-violet-50',
    stepText: 'text-violet-700',
  },
  emerald: {
    bg: 'bg-emerald-50',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700',
    border: 'border-emerald-200',
    stepBg: 'bg-emerald-50',
    stepText: 'text-emerald-700',
  },
  amber: {
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-700',
    border: 'border-amber-200',
    stepBg: 'bg-amber-50',
    stepText: 'text-amber-700',
  },
}

export default function AjudaPage() {
  return (
    <Suspense fallback={<AjudaLoading />}>
      <AjudaContent />
    </Suspense>
  )
}

function AjudaLoading() {
  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Central de Ajuda</h1>
        <p className="text-muted-foreground mt-1">Carregando...</p>
      </div>
    </div>
  )
}

function AjudaContent() {
  const [search, setSearch] = useState('')
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const { replayTour } = useAppHelp()

  // Auto-expand article from URL param
  useEffect(() => {
    const articleId = searchParams.get('article')
    if (articleId) {
      setExpandedArticle(articleId)
      setTimeout(() => {
        const el = document.getElementById(`article-${articleId}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [searchParams])

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return helpCategories
    const q = search.toLowerCase()
    return helpCategories
      .map((cat) => ({
        ...cat,
        articles: cat.articles.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.summary.toLowerCase().includes(q) ||
            a.steps.some((s) => s.toLowerCase().includes(q))
        ),
      }))
      .filter((cat) => cat.articles.length > 0)
  }, [search])

  const totalArticles = helpCategories.reduce(
    (acc, cat) => acc + cat.articles.length,
    0
  )

  const handleReplayTour = () => {
    router.push('/dashboard')
    setTimeout(() => replayTour(), 500)
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Central de Ajuda</h1>
          <p className="text-muted-foreground mt-1">
            Guias, tutoriais e dicas para aproveitar o PsicoApp ao máximo
          </p>
        </div>
        <button
          onClick={handleReplayTour}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'hsl(221, 83%, 53%)' }}
        >
          <HelpIcon name="play" className="w-4 h-4" />
          Rever Tour
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <HelpIcon name="search" className="w-4 h-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder={`Pesquisar em ${totalArticles} artigos...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
          >
            <HelpIcon name="x" className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category quick nav */}
      <div className="flex gap-2 flex-wrap">
        {helpCategories.map((cat) => {
          const colors = colorMap[cat.color] || colorMap.blue
          return (
            <a
              key={cat.id}
              href={`#${cat.id}`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${colors.badge} hover:opacity-80`}
            >
              <HelpIcon name={cat.icon} className="w-3.5 h-3.5" />
              {cat.title}
              <span className="opacity-60">({cat.articles.length})</span>
            </a>
          )
        })}
      </div>

      {/* No results */}
      {filteredCategories.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <HelpIcon name="search" className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">
            Nenhum resultado encontrado
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Tente buscar por outros termos
          </p>
        </div>
      )}

      {/* Categories */}
      {filteredCategories.map((cat) => {
        const colors = colorMap[cat.color] || colorMap.blue
        return (
          <section key={cat.id} id={cat.id} className="scroll-mt-8">
            {/* Category header */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-xl ${colors.iconBg} flex items-center justify-center`}
              >
                <HelpIcon name={cat.icon} className={`w-5 h-5 ${colors.iconText}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{cat.title}</h2>
                <p className="text-sm text-gray-500">{cat.description}</p>
              </div>
            </div>

            {/* Articles grid */}
            <div className="space-y-3">
              {cat.articles.map((article) => {
                const isExpanded = expandedArticle === article.id
                return (
                  <div
                    key={article.id}
                    id={`article-${article.id}`}
                    className={`bg-white rounded-xl border transition-all ${
                      isExpanded
                        ? `${colors.border} shadow-sm`
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <button
                      onClick={() =>
                        setExpandedArticle(isExpanded ? null : article.id)
                      }
                      className="w-full p-5 flex items-start gap-4 text-left"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl ${
                          isExpanded ? colors.iconBg : 'bg-gray-100'
                        } flex items-center justify-center shrink-0 transition-colors`}
                      >
                        <HelpIcon
                          name={article.icon}
                          className={`w-5 h-5 ${
                            isExpanded ? colors.iconText : 'text-gray-500'
                          } transition-colors`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {article.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                          {article.summary}
                        </p>
                      </div>
                      <div
                        className={`shrink-0 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      >
                        <HelpIcon
                          name="chevron-down"
                          className="w-4 h-4 text-gray-400"
                        />
                      </div>
                    </button>

                    {/* Expanded steps */}
                    {isExpanded && (
                      <div className="px-5 pb-5 animate-fade-in">
                        <div className={`rounded-xl ${colors.bg} p-4`}>
                          <h4
                            className={`text-xs font-semibold uppercase tracking-wider ${colors.iconText} mb-3`}
                          >
                            Passo a passo
                          </h4>
                          <div className="space-y-3">
                            {article.steps.map((step, i) => (
                              <div key={i} className="flex gap-3">
                                <div
                                  className={`w-6 h-6 rounded-full ${colors.iconBg} flex items-center justify-center shrink-0 mt-0.5`}
                                >
                                  <span
                                    className={`text-xs font-bold ${colors.iconText}`}
                                  >
                                    {i + 1}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                  {step}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {/* Footer hint */}
      <div className="text-center pb-8 pt-4">
        <p className="text-sm text-gray-400">
          Não encontrou o que precisa? Entre em contato pelo suporte.
        </p>
      </div>
    </div>
  )
}
