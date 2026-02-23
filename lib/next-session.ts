/**
 * Calcula a data/hora da próxima sessão com base na configuração de recorrência.
 *
 * @param sessaoAtualDataHora - ISO string da sessão que acabou de ser encerrada
 * @param frequencia - 'semanal' | 'quinzenal' | 'mensal'
 * @param diaSemana - 0=domingo, 1=segunda, ..., 6=sábado
 * @param hora - formato 'HH:mm', ex: '10:00'
 * @returns ISO string da próxima sessão
 */
export function calcularProximaSessao(
  sessaoAtualDataHora: string,
  frequencia: string,
  diaSemana: number,
  hora: string
): string {
  const [hh, mm] = hora.split(':').map(Number)
  const base = new Date(sessaoAtualDataHora)

  // Começar do dia seguinte à sessão atual
  const next = new Date(base)
  next.setDate(next.getDate() + 1)
  next.setHours(hh, mm, 0, 0)

  // Avançar até o dia da semana preferido
  while (next.getDay() !== diaSemana) {
    next.setDate(next.getDate() + 1)
  }

  // Se frequência é quinzenal, garantir pelo menos 10 dias de distância
  if (frequencia === 'quinzenal') {
    const diffDays = (next.getTime() - base.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays < 10) {
      next.setDate(next.getDate() + 7)
    }
  }

  // Se frequência é mensal, garantir pelo menos 25 dias de distância
  if (frequencia === 'mensal') {
    const diffDays = (next.getTime() - base.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays < 25) {
      next.setDate(next.getDate() + 7)
      // Continuar avançando semana a semana até ter ~30 dias
      while ((next.getTime() - base.getTime()) / (1000 * 60 * 60 * 24) < 25) {
        next.setDate(next.getDate() + 7)
      }
    }
  }

  return next.toISOString()
}
