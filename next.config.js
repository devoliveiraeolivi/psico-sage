/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build standalone: o Dockerfile copia .next/standalone. Sem isso o build
  // Docker falha em "COPY /app/.next/standalone: not found".
  output: 'standalone',
  // Inclui os binários ffmpeg/ffprobe (referenciados por caminho em runtime)
  // no bundle das funções serverless do Vercel, que não têm ffmpeg instalado.
  // Só o binário linux/x64 — o runtime do Vercel é linux x64. ffprobe-static
  // traz darwin+win32+linux (335M); incluir bin/** estourava o limite de 250M.
  experimental: {
    outputFileTracingIncludes: {
      '/api/sessoes/[id]/transcribe': [
        './node_modules/ffmpeg-static/ffmpeg',
        './node_modules/ffprobe-static/bin/linux/x64/ffprobe',
      ],
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://*.sentry.io https://*.ingest.sentry.io",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
