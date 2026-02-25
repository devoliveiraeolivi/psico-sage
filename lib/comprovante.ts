import { createHmac } from 'crypto'

function getSecret(): string {
  const secret = process.env.COMPROVANTE_HMAC_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error('COMPROVANTE_HMAC_SECRET (ou SUPABASE_SERVICE_ROLE_KEY) é obrigatório para geração de comprovantes')
  }
  return secret
}

/**
 * Gera código de verificação determinístico para um comprovante de sessão.
 * Baseado em HMAC-SHA256 do sessaoId — não precisa armazenar nada no banco.
 */
export function gerarCodigoVerificacao(sessaoId: string): string {
  const hmac = createHmac('sha256', getSecret())
  hmac.update(sessaoId)
  return hmac.digest('hex').slice(0, 8).toUpperCase()
}

/**
 * Verifica se um código de verificação é válido para uma sessão.
 */
export function verificarCodigo(sessaoId: string, codigo: string): boolean {
  return gerarCodigoVerificacao(sessaoId) === codigo.toUpperCase()
}
