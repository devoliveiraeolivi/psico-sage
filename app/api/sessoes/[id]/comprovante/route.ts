import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** POST /api/sessoes/[id]/comprovante — Envia comprovante por email */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Email não configurado. Adicione RESEND_API_KEY nas variáveis de ambiente.' },
        { status: 503 }
      )
    }

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const db = await createClient() as any
    const { data: { user } } = await db.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const pdfFile = formData.get('pdf') as File | null
    const destinatario = formData.get('email') as string | null
    const pacienteNome = formData.get('pacienteNome') as string | null

    if (!pdfFile || !destinatario) {
      return NextResponse.json({ error: 'PDF e email são obrigatórios' }, { status: 400 })
    }

    // Buscar nome do profissional para o remetente
    const { data: usuario } = await db
      .from('usuarios')
      .select('nome, crp')
      .eq('id', user.id)
      .single()

    const nomeProf = usuario?.nome || 'Psicólogo(a)'
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer())

    const { error } = await resend.emails.send({
      from: `${nomeProf} <comprovante@${process.env.RESEND_DOMAIN || 'resend.dev'}>`,
      to: destinatario,
      subject: `Declaração de Comparecimento — ${pacienteNome || 'Atendimento Psicológico'}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1e293b; font-size: 18px; margin-bottom: 8px;">Declaração de Comparecimento</h2>
          <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
            Olá${pacienteNome ? ` ${pacienteNome.split(' ')[0]}` : ''},
          </p>
          <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
            Segue em anexo a declaração de comparecimento referente ao atendimento psicológico realizado.
          </p>
          <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
            Atenciosamente,<br/>
            <strong style="color: #1e293b;">${nomeProf}</strong>
            ${usuario?.crp ? `<br/><span style="color: #94a3b8; font-size: 12px;">CRP ${usuario.crp}</span>` : ''}
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 11px;">
            Enviado via PsicoSage
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `comprovante-${id.slice(0, 8)}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: 'Falha ao enviar email' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao enviar comprovante:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
