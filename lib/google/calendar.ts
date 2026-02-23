import { google } from 'googleapis'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
]

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
  )
}

/** Gera a URL de autorização Google para a psicóloga vincular sua conta */
export function getGoogleAuthUrl(state?: string) {
  const client = getOAuth2Client()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state: state || '',
  })
}

/** Troca o authorization code pelo refresh_token + access_token */
export async function exchangeCodeForTokens(code: string) {
  const client = getOAuth2Client()
  const { tokens } = await client.getToken(code)
  return tokens
}

/** Cria um Meet link usando o refresh_token da psicóloga */
export async function createMeetLink(
  refreshToken: string,
  options: {
    title: string
    startTime: Date
    endTime: Date
    description?: string
  }
) {
  const client = getOAuth2Client()
  client.setCredentials({ refresh_token: refreshToken })

  const calendar = google.calendar({ version: 'v3', auth: client })
  const requestId = `psicosage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const response = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    requestBody: {
      summary: options.title,
      description: options.description || '',
      start: {
        dateTime: options.startTime.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: options.endTime.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    },
  })

  const meetLink = response.data.conferenceData?.entryPoints?.find(
    (ep) => ep.entryPointType === 'video'
  )?.uri

  return {
    meetLink: meetLink || null,
    calendarEventId: response.data.id || null,
  }
}

/** Cria um link permanente do Meet para um paciente (reutilizado em todas as sessões) */
export async function createPermanentMeetLink(
  refreshToken: string,
  options: {
    patientName: string
    description?: string
  }
) {
  const client = getOAuth2Client()
  client.setCredentials({ refresh_token: refreshToken })

  const calendar = google.calendar({ version: 'v3', auth: client })
  const requestId = `psicosage-perm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const startTime = new Date()
  startTime.setHours(8, 0, 0, 0)
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000)

  const response = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    requestBody: {
      summary: `Terapia — ${options.patientName}`,
      description: options.description || 'Link fixo de sessões de terapia via PsicoSage',
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      transparency: 'transparent',
    },
  })

  const meetLink = response.data.conferenceData?.entryPoints?.find(
    (ep) => ep.entryPointType === 'video'
  )?.uri

  return {
    meetLink: meetLink || null,
    calendarEventId: response.data.id || null,
  }
}
