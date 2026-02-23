'use client'

import { useState, useRef, useEffect } from 'react'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'

interface ComprovanteSessaoProps {
  sessaoId: string
  pacienteNome: string
  pacienteEmail: string | null
  sessaoNumero: number | null
  sessaoDataHora: string
  sessaoDuracao: number | null
  profissionalNome: string | null
  profissionalCrp: string | null
  codigoVerificacao: string
  appUrl: string
}

export function ComprovanteSessao({
  sessaoId,
  pacienteNome,
  pacienteEmail,
  sessaoNumero,
  sessaoDataHora,
  sessaoDuracao,
  profissionalNome,
  profissionalCrp,
  codigoVerificacao,
  appUrl,
}: ComprovanteSessaoProps) {
  const [open, setOpen] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [emailTo, setEmailTo] = useState(pacienteEmail || '')
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const verificacaoUrl = `${appUrl}/verificar?s=${sessaoId}&c=${codigoVerificacao}`

  async function gerarPDFBlob(): Promise<Blob> {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 25
    const contentWidth = pageWidth - margin * 2
    let y = 35

    // --- Header line ---
    doc.setDrawColor(59, 130, 246)
    doc.setLineWidth(0.8)
    doc.line(margin, y, pageWidth - margin, y)
    y += 12

    // --- Title ---
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(30, 41, 59)
    doc.text('DECLARAÇÃO DE COMPARECIMENTO', pageWidth / 2, y, { align: 'center' })
    y += 15

    // --- Subtitle ---
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text('Documento emitido para fins de comprovação de atendimento psicológico', pageWidth / 2, y, { align: 'center' })
    y += 18

    // --- Professional info box ---
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(30, 41, 59)
    doc.text('PROFISSIONAL RESPONSÁVEL', margin + 5, y + 7)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(profissionalNome || '[Nome não configurado]', margin + 5, y + 14)
    if (profissionalCrp) {
      doc.setTextColor(100, 116, 139)
      doc.setFontSize(9)
      doc.text(`CRP: ${profissionalCrp}`, margin + 5, y + 19)
    }
    y += 32

    // --- Body text ---
    const dataObj = new Date(sessaoDataHora)
    const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    const horaFormatada = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(30, 41, 59)

    const duracaoTexto = sessaoDuracao ? `${sessaoDuracao} minutos` : 'duração não registrada'
    const sessaoTexto = sessaoNumero ? ` (sessão nº ${sessaoNumero})` : ''

    const corpo =
      `Declaro, para os devidos fins, que ${pacienteNome} compareceu a atendimento ` +
      `psicológico${sessaoTexto} realizado em ${dataFormatada}, com início às ${horaFormatada} ` +
      `e duração de ${duracaoTexto}.`

    const linhas = doc.splitTextToSize(corpo, contentWidth)
    doc.text(linhas, margin, y)
    y += linhas.length * 6 + 10

    // --- Confidentiality note ---
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    const nota =
      'Em respeito ao sigilo profissional previsto no Código de Ética do Psicólogo (Resolução CFP nº 010/2005), ' +
      'esta declaração não contém informações de natureza clínica.'
    const linhasNota = doc.splitTextToSize(nota, contentWidth)
    doc.text(linhasNota, margin, y)
    y += linhasNota.length * 5 + 25

    // --- Signature area ---
    doc.setDrawColor(203, 213, 225)
    doc.setLineWidth(0.3)
    const sigLineWidth = 80
    const sigX = (pageWidth - sigLineWidth) / 2
    doc.line(sigX, y, sigX + sigLineWidth, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(30, 41, 59)
    doc.text(profissionalNome || '[Nome não configurado]', pageWidth / 2, y, { align: 'center' })
    y += 5
    if (profissionalCrp) {
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.text(`CRP: ${profissionalCrp}`, pageWidth / 2, y, { align: 'center' })
      y += 5
    }
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text('Psicólogo(a)', pageWidth / 2, y, { align: 'center' })

    // --- Footer: QR code + verification code + emission date ---
    const rodapeY = doc.internal.pageSize.getHeight() - 38

    // QR Code
    try {
      const qrDataUrl = await QRCode.toDataURL(verificacaoUrl, { width: 200, margin: 1 })
      doc.addImage(qrDataUrl, 'PNG', margin, rodapeY - 2, 22, 22)
    } catch {
      // Se falhar QR, continua sem
    }

    // Verification info next to QR
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text('Verificação de autenticidade', margin + 25, rodapeY + 4)
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(`Código: ${codigoVerificacao}`, margin + 25, rodapeY + 9)
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.text(verificacaoUrl, margin + 25, rodapeY + 14)

    // Emission date on the right
    const emissao = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })

    // Separator line above footer
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(margin, rodapeY - 6, pageWidth - margin, rodapeY - 6)

    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text(`Emitido em ${emissao}`, pageWidth - margin, rodapeY + 4, { align: 'right' })

    return doc.output('blob')
  }

  async function handleDownload() {
    setGerando(true)
    try {
      const blob = await gerarPDFBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `comprovante-${pacienteNome.split(' ')[0].toLowerCase()}-${new Date(sessaoDataHora).toISOString().slice(0, 10)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setOpen(false)
    } finally {
      setGerando(false)
    }
  }

  async function handleEmail() {
    if (!emailTo.trim()) return

    setEnviando(true)
    setEmailError(null)
    try {
      const blob = await gerarPDFBlob()
      const formData = new FormData()
      formData.append('pdf', blob, 'comprovante.pdf')
      formData.append('email', emailTo.trim())
      formData.append('pacienteNome', pacienteNome)

      const res = await fetch(`/api/sessoes/${sessaoId}/comprovante`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao enviar')
      }

      setEmailSent(true)
      setTimeout(() => { setEmailSent(false); setOpen(false) }, 2000)
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Erro ao enviar email')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="text-sm px-4 py-2 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        Comprovante
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={gerando}
            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{gerando ? 'Gerando...' : 'Baixar PDF'}</p>
              <p className="text-xs text-gray-500">Salvar no computador</p>
            </div>
          </button>

          {/* Separator */}
          <div className="border-t border-gray-100" />

          {/* Email */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Enviar por Email</p>
                <p className="text-xs text-gray-500">Envia o PDF em anexo ao paciente</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="email@paciente.com"
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 outline-none"
              />
              <button
                onClick={handleEmail}
                disabled={enviando || !emailTo.trim() || emailSent}
                className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {emailSent ? 'Enviado!' : enviando ? '...' : 'Enviar'}
              </button>
            </div>
            {emailError && (
              <p className="text-xs text-red-500 mt-1.5">{emailError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
