export default function SessoesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 bg-gray-200 rounded w-32" />
        <div className="h-10 bg-gray-200 rounded w-40" />
      </div>

      {/* Kanban columns */}
      <div className="grid md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, col) => (
          <div key={col} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-28" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
