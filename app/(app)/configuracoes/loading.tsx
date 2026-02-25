export default function ConfiguracoesLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-2xl">
      <div className="h-8 bg-gray-200 rounded w-40" />

      {/* Settings sections */}
      {Array.from({ length: 3 }).map((_, section) => (
        <div key={section} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="h-5 bg-gray-200 rounded w-36" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 bg-gray-100 rounded w-28" />
                <div className="h-8 bg-gray-100 rounded w-32" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
