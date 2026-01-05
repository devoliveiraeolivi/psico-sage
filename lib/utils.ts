import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formata data para exibição
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

// Formata data e hora para exibição
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

// Formata apenas hora
export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

// Calcula idade a partir da data de nascimento
export function calcularIdade(dataNascimento: string | Date): number {
  const hoje = new Date()
  const nascimento = new Date(dataNascimento)
  let idade = hoje.getFullYear() - nascimento.getFullYear()
  const mesAtual = hoje.getMonth()
  const mesNascimento = nascimento.getMonth()

  if (mesAtual < mesNascimento || (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())) {
    idade--
  }

  return idade
}

// Labels para status do paciente
export const statusPacienteLabels: Record<string, string> = {
  ativo: 'Ativo',
  pausado: 'Pausado',
  encerrado: 'Encerrado',
}

// Labels para status da sessão
export const statusSessaoLabels: Record<string, string> = {
  agendada: 'Agendada',
  aguardando_aprovacao: 'Aguardando Aprovação',
  realizada: 'Realizada',
  falta: 'Falta',
  cancelada: 'Cancelada',
  remarcada: 'Remarcada',
}

// Cores para status (classes Tailwind)
export const statusPacienteColors: Record<string, string> = {
  ativo: 'bg-green-100 text-green-800',
  pausado: 'bg-yellow-100 text-yellow-800',
  encerrado: 'bg-gray-100 text-gray-800',
}

export const statusSessaoColors: Record<string, string> = {
  agendada: 'bg-blue-100 text-blue-800',
  aguardando_aprovacao: 'bg-yellow-100 text-yellow-800',
  realizada: 'bg-green-100 text-green-800',
  falta: 'bg-red-100 text-red-800',
  cancelada: 'bg-gray-100 text-gray-800',
  remarcada: 'bg-orange-100 text-orange-800',
}
