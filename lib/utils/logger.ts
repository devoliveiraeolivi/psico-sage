type LogLevel = 'info' | 'warn' | 'error'

interface LogMeta {
  [key: string]: string | number | boolean | null | undefined
}

/**
 * Structured JSON logger for pipeline observability.
 * Outputs JSON lines that are parseable by any log aggregator.
 */
export function log(level: LogLevel, message: string, meta?: LogMeta) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  }
  console[level](JSON.stringify(entry))
}

export const logger = {
  info: (message: string, meta?: LogMeta) => log('info', message, meta),
  warn: (message: string, meta?: LogMeta) => log('warn', message, meta),
  error: (message: string, meta?: LogMeta) => log('error', message, meta),
}
