type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

function serializeContext(context: LogContext | undefined): LogContext {
  if (!context) {
    return {};
  }
  const result: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    result[key] =
      value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value;
  }
  return result;
}

function shouldLog(level: LogLevel): boolean {
  if (process.env.NODE_ENV === 'test') {
    return process.env.LOG_IN_TEST === 'true';
  }
  if (level === 'debug') {
    return process.env.NODE_ENV !== 'production';
  }
  return true;
}

function write(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) {
    return;
  }
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    message,
    ...serializeContext(context),
  });
  // The logger is the single place allowed to touch the console.
  /* eslint-disable no-console */
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.info(line);
  }
  /* eslint-enable no-console */
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    write('debug', message, context);
  },
  info(message: string, context?: LogContext): void {
    write('info', message, context);
  },
  warn(message: string, context?: LogContext): void {
    write('warn', message, context);
  },
  error(message: string, context?: LogContext): void {
    write('error', message, context);
  },
};
