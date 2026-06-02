type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

export type AppLogEntry = {
  id: number;
  at: string;
  level: LogLevel;
  scope: string;
  message: string;
  context?: LogContext;
};

const maxEntries = 300;
const entries: AppLogEntry[] = [];
let nextId = 1;

function normalizeContext(context?: LogContext) {
  if (!context) return undefined;
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => {
      if (value instanceof Error) return [key, serializeError(value)];
      return [key, value];
    })
  );
}

export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }
  return {
    name: 'UnknownError',
    message: String(error)
  };
}

function write(level: LogLevel, scope: string, message: string, context?: LogContext) {
  const entry: AppLogEntry = {
    id: nextId++,
    at: new Date().toISOString(),
    level,
    scope,
    message,
    context: normalizeContext(context)
  };

  entries.push(entry);
  if (entries.length > maxEntries) entries.splice(0, entries.length - maxEntries);

  const line = `[MacroTrack] ${entry.at} ${level.toUpperCase()} ${scope}: ${message}`;
  const payload = entry.context ? JSON.stringify(entry.context) : undefined;

  if (level === 'error') console.error(line, payload);
  else if (level === 'warn') console.warn(line, payload);
  else console.log(line, payload);

  return entry;
}

export function createLogger(scope: string) {
  return {
    debug: (message: string, context?: LogContext) => write('debug', scope, message, context),
    info: (message: string, context?: LogContext) => write('info', scope, message, context),
    warn: (message: string, context?: LogContext) => write('warn', scope, message, context),
    error: (message: string, error?: unknown, context?: LogContext) =>
      write('error', scope, message, { ...context, error: serializeError(error) })
  };
}

export function getLogEntries() {
  return [...entries];
}

export function getLogSummary(limit = 20) {
  return entries
    .slice(-limit)
    .map((entry) => `${entry.at} ${entry.level.toUpperCase()} ${entry.scope}: ${entry.message}`)
    .join('\n');
}

export async function logDuration<T>(scope: string, message: string, work: () => Promise<T>, context?: LogContext) {
  const logger = createLogger(scope);
  const startedAt = Date.now();
  logger.info(`${message} started`, context);
  try {
    const result = await work();
    logger.info(`${message} completed`, { ...context, duration_ms: Date.now() - startedAt });
    return result;
  } catch (error) {
    logger.error(`${message} failed`, error, { ...context, duration_ms: Date.now() - startedAt });
    throw error;
  }
}
